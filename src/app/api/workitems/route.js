import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all work items
export async function GET(request) {
  try {
    // Auto-update any work item with logged effort (> 0 hours) from 'Not Started' to 'In Progress'
    await query(`
      UPDATE work_items
      SET status_id = (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'In Progress' LIMIT 1)
      WHERE status_id IN (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started')
        AND id IN (
          SELECT work_item_id
          FROM effort_logs
          GROUP BY work_item_id
          HAVING SUM(hours_logged) > 0
        )
    `);

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunity_id');
    const assignedTo = searchParams.get('assigned_to');

    let sql = `
      SELECT w.*,
             o.opportunity_name, o.company,
             wc.option_name AS work_category_name, wc.color AS work_category_color,
             dt.option_name AS deliverable_type_name,
             p.option_name AS priority_name, p.color AS priority_color,
             ec.option_name AS estimation_confidence_name,
             tr.option_name AS trigger_name,
             st.option_name AS status_name, st.color AS status_color
      FROM work_items w
      LEFT JOIN opportunities o ON w.opportunity_id = o.id
      JOIN dropdown_options wc ON w.work_category_id = wc.id
      LEFT JOIN dropdown_options dt ON w.deliverable_type_id = dt.id
      LEFT JOIN dropdown_options p ON w.priority_id = p.id
      LEFT JOIN dropdown_options ec ON w.estimation_confidence_id = ec.id
      LEFT JOIN dropdown_options tr ON w.trigger_id = tr.id
      JOIN dropdown_options st ON w.status_id = st.id
    `;
    const params = [];
    const conditions = [];

    if (opportunityId) {
      conditions.push('w.opportunity_id = $' + (params.length + 1));
      params.push(opportunityId);
    }
    if (assignedTo) {
      conditions.push('w.assigned_to = $' + (params.length + 1));
      params.push(assignedTo);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY w.due_date ASC, w.id DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to run capacity check
async function runCapacityCheck(username, additionalHours = 0, excludeTaskId = null) {
  try {
    // 1. Fetch capacity
    const profileRes = await query('SELECT weekly_capacity_hours FROM resource_profiles WHERE username = $1', [username]);
    if (profileRes.rows.length === 0) return null; // No profile, no capacity check
    const capacity = parseFloat(profileRes.rows[0].weekly_capacity_hours);

    // 2. Fetch completed status ID to exclude completed tasks
    const completedRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Completed'");
    const completedId = completedRes.rows[0]?.id;

    // 3. Sum active hours
    let activeHoursSql = 'SELECT SUM(estimated_hours) AS active_hours FROM work_items WHERE assigned_to = $1';
    const params = [username];
    if (completedId) {
      activeHoursSql += ' AND status_id != $2';
      params.push(completedId);
    }
    if (excludeTaskId) {
      activeHoursSql += ` AND id != $${params.length + 1}`;
      params.push(excludeTaskId);
    }

    const hoursRes = await query(activeHoursSql, params);
    const activeHours = parseFloat(hoursRes.rows[0]?.active_hours || 0);

    const totalProposed = activeHours + additionalHours;
    if (totalProposed > capacity) {
      return {
        overloaded: true,
        capacity,
        activeHours,
        totalProposed,
        warning: `Warning: ${username} is overloaded! This allocation brings their workload to ${totalProposed} hours, which exceeds their weekly capacity of ${capacity} hours.`
      };
    }
    return { overloaded: false, capacity, activeHours, totalProposed };
  } catch (error) {
    console.error('Capacity check failed:', error);
    return null;
  }
}

// POST create a work item
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      work_category_id,
      title,
      description,
      deliverable_type_id,
      assigned_to,
      reviewer,
      collaborators,
      priority_id,
      start_date,
      due_date,
      estimated_hours,
      estimation_confidence_id,
      is_revision_work,
      revision_number,
      trigger_id,
      status_id,
      blocker_reason,
      deliverable_link,
      notes
    } = body;

    // Validation
    if (!work_category_id || !title || !assigned_to || !start_date || !due_date || !status_id) {
      return NextResponse.json({ error: 'Work Category, Title, Assigned To, Start Date, Due Date, and Status are required' }, { status: 400 });
    }

    const hours = parseFloat(estimated_hours) || 0;

    // Retrieve Status and Category names for rule checks
    const statusRes = await query('SELECT option_name FROM dropdown_options WHERE id = $1', [status_id]);
    const statusName = statusRes.rows[0]?.option_name || '';

    // Business Rule 1: A task cannot move to "In Progress" without Estimated Hours set
    if (statusName === 'In Progress' && hours <= 0) {
      return NextResponse.json({ error: 'Estimated Hours must be set and greater than 0 to set status to In Progress' }, { status: 400 });
    }

    // Business Rule 2: If Status = Blocked, Blocker Reason becomes mandatory
    if (statusName === 'Blocked' && (!blocker_reason || !blocker_reason.trim())) {
      return NextResponse.json({ error: 'Blocker Reason is required when Status is set to Blocked' }, { status: 400 });
    }

    // Capacity Check
    const capCheck = await runCapacityCheck(assigned_to, hours);

    // Insert
    const result = await query(
      `INSERT INTO work_items (
        opportunity_id, work_category_id, title, description, deliverable_type_id,
        assigned_to, reviewer, collaborators, priority_id, start_date, due_date,
        estimated_hours, estimation_confidence_id, is_revision_work, revision_number,
        trigger_id, status_id, blocker_reason, deliverable_link, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        opportunity_id || null,
        work_category_id,
        title,
        description || '',
        deliverable_type_id || null,
        assigned_to,
        reviewer || '',
        collaborators || '',
        priority_id || null,
        start_date,
        due_date,
        hours,
        estimation_confidence_id || null,
        is_revision_work === true,
        parseInt(revision_number, 10) || null,
        trigger_id || null,
        status_id,
        blocker_reason || '',
        deliverable_link || '',
        notes || ''
      ]
    );

    const task = result.rows[0];

    try {
      const { logActivity } = await import('@/lib/auditLogger');
      const realUser = request.headers.get('x-real-user') || body.real_user_id || assigned_to || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || body.acting_as_user_id || null;

      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Work Item',
        entity_id: task.id,
        entity_title: task.title,
        action_type: 'Created',
        summary_text: `Work Item created: ${task.title} (Assigned to: @${assigned_to})`
      });
    } catch (e) {
      console.error('Audit logging failed for work item creation:', e);
    }

    // Return the created task, and attach capacity check results if overloaded
    const responseData = { ...task };
    if (capCheck && capCheck.overloaded) {
      responseData.warning = capCheck.warning;
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
