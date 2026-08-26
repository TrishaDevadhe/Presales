import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all feedbacks
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunity_id');

    let sql = `
      SELECT f.*,
             o.opportunity_name, o.company,
             v.version_number,
             ff.option_name AS feedback_from_name,
             ft.option_name AS feedback_type_name,
             sv.option_name AS severity_name,
             st.option_name AS status_name,
             wi.title AS linked_task_title, wi.status_id AS linked_task_status_id
      FROM feedbacks f
      JOIN opportunities o ON f.opportunity_id = o.id
      LEFT JOIN versions v ON f.version_id = v.id
      JOIN dropdown_options ff ON f.feedback_from_id = ff.id
      JOIN dropdown_options ft ON f.feedback_type_id = ft.id
      LEFT JOIN dropdown_options sv ON f.severity_id = sv.id
      JOIN dropdown_options st ON f.status_id = st.id
      LEFT JOIN work_items wi ON f.created_work_item_id = wi.id
    `;
    const params = [];

    if (opportunityId) {
      sql += ' WHERE f.opportunity_id = $1';
      params.push(opportunityId);
    }

    sql += ' ORDER BY f.id DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create feedback (with action required task creation)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      version_id,
      feedback_from_id,
      feedback_type_id,
      severity_id,
      feedback_text,
      action_required,
      owner,
      due_date,
      status_id
    } = body;

    // Validation
    if (!opportunity_id || !feedback_from_id || !feedback_type_id || !feedback_text || !status_id) {
      return NextResponse.json({ error: 'Opportunity, Feedback From, Feedback Type, Feedback Text, and Status are required' }, { status: 400 });
    }

    // Business Rule: If Action Required = true, Owner and Due Date become mandatory
    if (action_required === true) {
      if (!owner || !owner.trim()) {
        return NextResponse.json({ error: 'Owner is required when Action Required is toggled on' }, { status: 400 });
      }
      if (!due_date) {
        return NextResponse.json({ error: 'Due Date is required when Action Required is toggled on' }, { status: 400 });
      }
    }

    let createdWorkItemId = null;

    // If Action Required = true, auto-create a linked Work Item
    if (action_required === true) {
      // 1. Fetch 'Review & QA' (or default) category ID
      const catRes = await query("SELECT id FROM dropdown_options WHERE category = 'work_category' AND option_name = 'Review & QA'");
      let categoryId = catRes.rows[0]?.id;
      if (!categoryId) {
        // Fallback: get any active work category
        const fallbackCat = await query("SELECT id FROM dropdown_options WHERE category = 'work_category' AND active = true LIMIT 1");
        categoryId = fallbackCat.rows[0]?.id;
      }

      // 2. Fetch 'Not Started' status ID
      const nsRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started'");
      const notStartedId = nsRes.rows[0]?.id;

      // 3. Fetch default 'Medium' priority ID
      const prioRes = await query("SELECT id FROM dropdown_options WHERE category = 'priority' AND option_name = 'Medium'");
      const mediumPriorityId = prioRes.rows[0]?.id;

      // 4. Clean feedback text for title (first 40 chars)
      const cleanText = feedback_text.replace(/<[^>]*>/g, ''); // strip HTML
      const snippet = cleanText.length > 40 ? cleanText.substring(0, 40) + '...' : cleanText;
      const taskTitle = `Feedback Action: ${snippet}`;

      // Insert work item
      const wiResult = await query(
        `INSERT INTO work_items (
          opportunity_id, work_category_id, title, description, assigned_to,
          priority_id, start_date, due_date, estimated_hours, status_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          opportunity_id,
          categoryId,
          taskTitle,
          `Auto-created from client feedback:\n"${cleanText}"`,
          owner,
          mediumPriorityId || null,
          new Date().toISOString().split('T')[0], // Start date is today
          due_date,
          2.0, // Default estimated hours for feedback tasks (minimum estimate)
          notStartedId || null,
          'Auto-created'
        ]
      );
      createdWorkItemId = wiResult.rows[0].id;
    }

    // Insert Feedback
    const fbResult = await query(
      `INSERT INTO feedbacks (
        opportunity_id, version_id, feedback_from_id, feedback_type_id, severity_id,
        feedback_text, action_required, owner, due_date, status_id, created_work_item_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        opportunity_id,
        version_id || null,
        feedback_from_id,
        feedback_type_id,
        severity_id || null,
        feedback_text,
        action_required === true,
        action_required === true ? owner : '',
        action_required === true ? due_date : null,
        status_id,
        createdWorkItemId
      ]
    );

    return NextResponse.json(fbResult.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
