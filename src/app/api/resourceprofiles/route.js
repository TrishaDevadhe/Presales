import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT r.*, 
             ro.option_name AS role_name, 
             ro.color AS role_color,
             se.option_name AS seniority_name, 
             de.option_name AS department_name
      FROM resource_profiles r
      LEFT JOIN dropdown_options ro ON r.role_id = ro.id
      LEFT JOIN dropdown_options se ON r.seniority_id = se.id
      LEFT JOIN dropdown_options de ON r.department_id = de.id
      ORDER BY r.username ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const check = await query('SELECT id FROM resource_profiles WHERE username = $1', [username]);

    let result;
    if (check.rows.length === 0) {
      result = await query(
        `INSERT INTO resource_profiles 
         (username, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          username.toLowerCase().trim(),
          role_id || null,
          seniority_id || null,
          skills || '',
          department_id || null,
          parseFloat(weekly_capacity_hours) || 40.0,
          standard_focus || ''
        ]
      );
    } else {
      result = await query(
        `UPDATE resource_profiles
         SET role_id = $1,
             seniority_id = $2,
             skills = $3,
             department_id = $4,
             weekly_capacity_hours = $5,
             standard_focus = $6
         WHERE username = $7
         RETURNING *`,
        [
          role_id || null,
          seniority_id || null,
          skills || '',
          department_id || null,
          parseFloat(weekly_capacity_hours) || 40.0,
          standard_focus || '',
          username.toLowerCase().trim()
        ]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
