import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Opportunities by Stage
    const oppsByStage = await query(`
      SELECT ds.option_name AS stage_name, 
             ds.color AS stage_color,
             COUNT(o.id) AS count, 
             COALESCE(SUM(o.estimated_deal_value), 0) AS total_value
      FROM opportunities o
      JOIN dropdown_options ds ON o.deal_stage_id = ds.id
      GROUP BY ds.option_name, ds.color, ds.sort_order
      ORDER BY ds.sort_order
    `);

    // 2. Tasks by Status
    const tasksByStatus = await query(`
      SELECT st.option_name AS status_name, 
             st.color AS status_color,
             COUNT(w.id) AS count
      FROM work_items w
      JOIN dropdown_options st ON w.status_id = st.id
      GROUP BY st.option_name, st.color, st.sort_order
      ORDER BY st.sort_order
    `);

    // 3. Overdue Tasks
    const overdueTasks = await query(`
      SELECT w.id, w.title, w.due_date, w.assigned_to, w.estimated_hours,
             o.opportunity_name, o.company,
             st.option_name AS status_name, st.color AS status_color
      FROM work_items w
      LEFT JOIN opportunities o ON w.opportunity_id = o.id
      JOIN dropdown_options st ON w.status_id = st.id
      WHERE w.due_date < CURRENT_DATE
        AND st.option_name != 'Completed'
      ORDER BY w.due_date ASC
    `);

    // 4. Capacity & Overload warning list
    const teamWorkload = await query(`
      SELECT r.username, 
             r.weekly_capacity_hours,
             ro.option_name AS role_name,
             COALESCE(SUM(wi.estimated_hours), 0) AS active_hours
      FROM resource_profiles r
      LEFT JOIN dropdown_options ro ON r.role_id = ro.id
      LEFT JOIN work_items wi ON r.username = wi.assigned_to 
        AND wi.status_id != (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Completed')
      GROUP BY r.username, r.weekly_capacity_hours, ro.option_name
      ORDER BY r.username
    `);

    const processedWorkload = teamWorkload.rows.map(w => {
      const active = parseFloat(w.active_hours);
      const cap = parseFloat(w.weekly_capacity_hours);
      return {
        ...w,
        active_hours: active,
        weekly_capacity_hours: cap,
        utilization_pct: cap > 0 ? Math.round((active / cap) * 100) : 0,
        is_overloaded: active > cap
      };
    });

    // 5. Timeline Alerts: Target Date within 7 days, stage not completed/won/lost
    const timelineAlerts = await query(`
      SELECT o.id, o.opportunity_name, o.company, o.target_submission_date, o.presales_owner,
             (o.target_submission_date - CURRENT_DATE) AS days_left,
             ds.option_name AS stage_name, ds.color AS stage_color
      FROM opportunities o
      JOIN dropdown_options ds ON o.deal_stage_id = ds.id
      WHERE o.target_submission_date >= CURRENT_DATE 
        AND o.target_submission_date <= CURRENT_DATE + INTERVAL '7 days'
        AND o.deal_stage_id NOT IN (
          SELECT id FROM dropdown_options 
          WHERE category = 'deal_stage' 
            AND (option_name = 'Won' OR option_name = 'Lost' OR option_name = 'Submitted to Client')
        )
      ORDER BY o.target_submission_date ASC
    `);

    // 6. Rework Risk / Revision Threshold Hotspots
    const revisionThresholdRes = await query('SELECT revision_threshold FROM automation_settings LIMIT 1');
    const revThreshold = parseInt(revisionThresholdRes.rows[0]?.revision_threshold || 3, 10);

    const reworkHotspots = await query(`
      SELECT o.id, o.opportunity_name, o.company, o.revision_counter, o.commercial_revision_counter, o.presales_owner
      FROM opportunities o
      WHERE o.revision_counter >= $1
      ORDER BY o.revision_counter DESC, o.commercial_revision_counter DESC
    `, [revThreshold]);

    // 7. General Stats
    const totalOppsCount = await query('SELECT COUNT(*) FROM opportunities');
    const activeTasksCount = await query(`
      SELECT COUNT(*) FROM work_items 
      WHERE status_id != (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Completed')
    `);
    const totalPipelineValue = await query(`
      SELECT COALESCE(SUM(estimated_deal_value), 0) AS total 
      FROM opportunities
      WHERE deal_stage_id NOT IN (
        SELECT id FROM dropdown_options WHERE category = 'deal_stage' AND (option_name = 'Lost')
      )
    `);

    return NextResponse.json({
      summary: {
        total_opportunities: parseInt(totalOppsCount.rows[0].count, 10),
        active_tasks: parseInt(activeTasksCount.rows[0].count, 10),
        pipeline_value: parseFloat(totalPipelineValue.rows[0].total)
      },
      opps_by_stage: oppsByStage.rows,
      tasks_by_status: tasksByStatus.rows,
      overdue_tasks: overdueTasks.rows,
      workload: processedWorkload,
      timeline_alerts: timelineAlerts.rows,
      rework_hotspots: reworkHotspots.rows,
      revision_threshold: revThreshold
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
