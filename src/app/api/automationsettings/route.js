import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT * FROM automation_settings LIMIT 1');
    if (result.rows.length === 0) {
      // Return default values if somehow missing
      return NextResponse.json({
        enable_missing_effort_reminder: true,
        effort_variance_threshold: 20.0,
        revision_threshold: 3,
        overload_threshold: 100.0,
        reminder_frequency: 'Weekly'
      });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      enable_missing_effort_reminder,
      effort_variance_threshold,
      revision_threshold,
      overload_threshold,
      reminder_frequency
    } = body;

    const check = await query('SELECT id FROM automation_settings LIMIT 1');
    let result;

    if (check.rows.length === 0) {
      result = await query(
        `INSERT INTO automation_settings 
         (enable_missing_effort_reminder, effort_variance_threshold, revision_threshold, overload_threshold, reminder_frequency)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          enable_missing_effort_reminder !== false,
          parseFloat(effort_variance_threshold) || 20.0,
          parseInt(revision_threshold, 10) || 3,
          parseFloat(overload_threshold) || 100.0,
          reminder_frequency || 'Weekly'
        ]
      );
    } else {
      const id = check.rows[0].id;
      result = await query(
        `UPDATE automation_settings
         SET enable_missing_effort_reminder = $1,
             effort_variance_threshold = $2,
             revision_threshold = $3,
             overload_threshold = $4,
             reminder_frequency = $5
         WHERE id = $6
         RETURNING *`,
        [
          enable_missing_effort_reminder !== false,
          parseFloat(effort_variance_threshold) || 20.0,
          parseInt(revision_threshold, 10) || 3,
          parseFloat(overload_threshold) || 100.0,
          reminder_frequency || 'Weekly',
          id
        ]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
