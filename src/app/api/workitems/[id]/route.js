import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET a single work item
export async function GET(request, { params }) {
  const id = params.id;
  try {
    const result = await query(
      `SELECT w.*,
              o.opportunity_name, o.company,
              wc.option_name AS work_category_name,
              dt.option_name AS deliverable_type_name,
              p.option_name AS priority_name,
              ec.option_name AS estimation_confidence_name,
              tr.option_name AS trigger_name,
              st.option_name AS status_name
       FROM work_items w
       LEFT JOIN opportunities o ON w.opportunity_id = o.id
       JOIN dropdown_options wc ON w.work_category_id = wc.id
       LEFT JOIN dropdown_options dt ON w.deliverable_type_id = dt.id
       LEFT JOIN dropdown_options p ON w.priority_id = p.id
       LEFT JOIN dropdown_options ec ON w.estimation_confidence_id = ec.id
       LEFT JOIN dropdown_options tr ON w.trigger_id = tr.id
       JOIN dropdown_options st ON w.status_id = st.id
       WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Work Item not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to run capacity check
async function runCapacityCheck(username, additionalHours = 0, excludeTaskId = null) {
  try {
    const profileRes = await query('SELECT weekly_capacity_hours FROM resource_profiles WHERE username = $1', [username]);
    if (profileRes.rows.length === 0) return null;
    const capacity = parseFloat(profileRes.rows[0].weekly_capacity_hours);

    const completedRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Completed'");
    const completedId = completedRes.rows[0]?.id;

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

// PUT (update) a work item
export async function PUT(request, { params }) {
  const id = params.id;
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

    // Capacity Check (excluding current task id from assignee's current workload sum)
    const capCheck = await runCapacityCheck(assigned_to, hours, id);

    let finalStatusId = status_id;
    if (statusName === 'Not Started') {
      const effortCheck = await query('SELECT SUM(hours_logged) AS total FROM effort_logs WHERE work_item_id = $1', [id]);
      const totalLogged = parseFloat(effortCheck.rows[0]?.total || 0);
      if (totalLogged > 0) {
        const inProgressRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'In Progress'");
        if (inProgressRes.rows.length > 0) {
          finalStatusId = inProgressRes.rows[0].id;
        }
      }
    }

    const existingRes = await query(
      `SELECT w.*, st.option_name as status_name FROM work_items w LEFT JOIN dropdown_options st ON w.status_id = st.id WHERE w.id = $1`,
      [id]
    );
    const existing = existingRes.rows[0];

    // Update
    const result = await query(
      `UPDATE work_items
       SET opportunity_id = $1,
           work_category_id = $2,
           title = $3,
           description = $4,
           deliverable_type_id = $5,
           assigned_to = $6,
           reviewer = $7,
           collaborators = $8,
           priority_id = $9,
           start_date = $10,
           due_date = $11,
           estimated_hours = $12,
           estimation_confidence_id = $13,
           is_revision_work = $14,
           revision_number = $15,
           trigger_id = $16,
           status_id = $17,
           blocker_reason = $18,
           deliverable_link = $19,
           notes = $20
       WHERE id = $21
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
        finalStatusId,
        blocker_reason || '',
        deliverable_link || '',
        notes || '',
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Work Item not found' }, { status: 404 });
    }

    const task = result.rows[0];

    try {
      const { logActivity } = await import('@/lib/auditLogger');
      const realUser = request.headers.get('x-real-user') || body.real_user_id || assigned_to || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || body.acting_as_user_id || null;

      const newStatusRes = await query('SELECT option_name FROM dropdown_options WHERE id = $1', [task.status_id]);
      const newStatusName = newStatusRes.rows[0]?.option_name || 'N/A';

      let actionType = 'Updated';
      let fieldChanged = null;
      let valueBefore = null;
      let valueAfter = null;
      let summaryText = `Updated Work Item: ${task.title}`;

      if (existing && existing.status_id !== task.status_id) {
        actionType = 'Status Changed';
        fieldChanged = 'Status';
        valueBefore = existing.status_name || 'Not Started';
        valueAfter = newStatusName;
        summaryText = `Status Changed: ${valueBefore} → ${valueAfter}`;
        if (newStatusName === 'Blocked' && blocker_reason) {
          summaryText += ` (Blocker Note: ${blocker_reason})`;
        }
      } else if (existing && existing.assigned_to !== task.assigned_to) {
        actionType = 'Assigned';
        fieldChanged = 'Assigned To';
        valueBefore = `@${existing.assigned_to}`;
        valueAfter = `@${task.assigned_to}`;
        summaryText = `Reassigned Work Item: ${valueBefore} → ${valueAfter}`;
      } else if (existing && existing.due_date !== task.due_date) {
        actionType = 'Updated';
        fieldChanged = 'Due Date';
        valueBefore = existing.due_date;
        valueAfter = task.due_date;
        summaryText = `Due Date changed: ${valueBefore} → ${valueAfter}`;
      }

      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Work Item',
        entity_id: task.id,
        entity_title: task.title,
        action_type: actionType,
        field_changed: fieldChanged,
        value_before: valueBefore,
        value_after: valueAfter,
        summary_text: summaryText
      });
    } catch (e) {
      console.error('Audit logging failed for work item update:', e);
    }

    // Return the updated task, and attach capacity check results if overloaded
    const responseData = { ...task };
    if (capCheck && capCheck.overloaded) {
      responseData.warning = capCheck.warning;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a work item
export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const existingRes = await query('SELECT * FROM work_items WHERE id = $1', [id]);
    const existing = existingRes.rows[0];

    const result = await query('DELETE FROM work_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Work Item not found' }, { status: 404 });
    }

    if (existing) {
      try {
        const { logActivity } = await import('@/lib/auditLogger');
        const realUser = request.headers.get('x-real-user') || 'admin';
        const actingAsUser = request.headers.get('x-acting-as-user') || null;

        await logActivity({
          real_user_id: realUser,
          acting_as_user_id: actingAsUser,
          entity_type: 'Work Item',
          entity_id: id,
          entity_title: existing.title,
          action_type: 'Deleted',
          summary_text: `Work Item deleted: ${existing.title}`
        });
      } catch (e) {
        console.error('Audit logging failed for work item deletion:', e);
      }
    }

    return NextResponse.json({ message: 'Work Item deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
