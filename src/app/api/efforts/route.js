import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all effort logs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workItemId = searchParams.get('work_item_id');
    const person = searchParams.get('person');

    let sql = `
      SELECT el.*,
             wi.title AS work_item_title, wi.estimated_hours AS work_item_estimated_hours,
             wi.opportunity_id, wi.deliverable_type_id,
             opp.opportunity_name, opp.company,
             dt.option_name AS deliverable_type_name,
             et.option_name AS effort_type_name,
             act.option_name AS activity_type_name
      FROM effort_logs el
      JOIN work_items wi ON el.work_item_id = wi.id
      LEFT JOIN opportunities opp ON wi.opportunity_id = opp.id
      LEFT JOIN dropdown_options dt ON wi.deliverable_type_id = dt.id
      LEFT JOIN dropdown_options et ON el.effort_type_id = et.id
      LEFT JOIN dropdown_options act ON el.activity_type_id = act.id
    `;
    const params = [];
    const conditions = [];

    if (workItemId) {
      conditions.push('el.work_item_id = $' + (params.length + 1));
      params.push(workItemId);
    }
    if (person) {
      conditions.push('el.person = $' + (params.length + 1));
      params.push(person);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY el.date DESC, el.id DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create effort log
export async function POST(request) {
  try {
    const body = await request.json();
    const { work_item_id, person, date, hours_logged, effort_type_id, activity_type_id, notes } = body;

    // Validation
    if (!work_item_id || !person || !date || !hours_logged) {
      return NextResponse.json({ error: 'Work Item, Person, Date, and Hours Logged are required' }, { status: 400 });
    }

    const hours = parseFloat(hours_logged);
    if (hours <= 0 || hours > 24) {
      return NextResponse.json({ error: 'Hours Logged must be greater than 0 and less than or equal to 24' }, { status: 400 });
    }

    // 1. Fetch work item details
    const wiRes = await query(
      `SELECT wi.estimated_hours, wi.title, opt.option_name AS status_name
       FROM work_items wi
       LEFT JOIN dropdown_options opt ON wi.status_id = opt.id
       WHERE wi.id = $1`,
      [work_item_id]
    );
    if (wiRes.rows.length === 0) {
      return NextResponse.json({ error: 'Work Item not found' }, { status: 404 });
    }

    if (wiRes.rows[0].status_name?.toLowerCase() === 'completed') {
      return NextResponse.json({ error: 'Cannot log effort on a completed work item' }, { status: 400 });
    }

    const estHours = parseFloat(wiRes.rows[0].estimated_hours || 0);

    // 2. Fetch cumulative hours logged for this work item (including new log)
    const cumRes = await query('SELECT SUM(hours_logged) AS total FROM effort_logs WHERE work_item_id = $1', [work_item_id]);
    const prevLogged = parseFloat(cumRes.rows[0]?.total || 0);
    const newCumulative = prevLogged + hours;

    // 3. Fetch automation settings for variance threshold
    const settingsRes = await query('SELECT effort_variance_threshold FROM automation_settings LIMIT 1');
    const thresholdPct = parseFloat(settingsRes.rows[0]?.effort_variance_threshold || 20.0);

    const varianceLimit = estHours > 0 ? estHours * (1 + thresholdPct / 100) : Infinity;
    const isVarianceExceeded = estHours > 0 && newCumulative > varianceLimit;

    // Insert Effort Log
    const result = await query(
      `INSERT INTO effort_logs (work_item_id, person, date, hours_logged, effort_type_id, activity_type_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [work_item_id, person, date, hours, effort_type_id || null, activity_type_id || null, notes || '']
    );

    const effortLog = result.rows[0];

    // Automatically update work item status:
    // If user explicitly checked mark_completed -> set status to 'Completed'
    // Otherwise -> set status to 'In Progress' if currently 'Not Started'
    if (body.mark_completed === true) {
      const completedRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Completed'");
      if (completedRes.rows.length > 0) {
        await query('UPDATE work_items SET status_id = $1 WHERE id = $2', [completedRes.rows[0].id, work_item_id]);
      }
    } else {
      const inProgressRes = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'In Progress'");
      if (inProgressRes.rows.length > 0) {
        await query(
          "UPDATE work_items SET status_id = $1 WHERE id = $2 AND status_id IN (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started')",
          [inProgressRes.rows[0].id, work_item_id]
        );
      }
    }

    // Return created log with variance metadata
    const responseData = {
      ...effortLog,
      variance_metadata: {
        estimated_hours: estHours,
        cumulative_hours: newCumulative,
        variance_threshold_pct: thresholdPct,
        variance_exceeded: isVarianceExceeded,
        warning: isVarianceExceeded
          ? `Warning: Cumulative effort (${newCumulative} hrs) exceeds the task's estimate of ${estHours} hrs by more than the ${thresholdPct}% variance threshold!`
          : null
      }
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
