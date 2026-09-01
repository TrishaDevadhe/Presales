import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query(`
      SELECT r.*, 
             r.standard_focus AS standard_focus_area,
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

function generateRandomPassword() {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ret = "";
  for (let i = 0; i < length; ++i) {
    ret += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return ret;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, role_id, seniority_id, skills, department_id, weekly_capacity_hours, original_username, name } = body;
    const standard_focus = body.standard_focus || body.standard_focus_area || '';
    const passwordInput = body.password;
    const nameInput = name || username;

    if (!username) {
      return NextResponse.json({ error: 'Username/ID is required' }, { status: 400 });
    }

    const targetUser = (original_username || username).toLowerCase().trim();
    const check = await query('SELECT id, password, name FROM resource_profiles WHERE username = $1', [targetUser]);

    let result;
    if (check.rows.length === 0) {
      const generatedPassword = passwordInput || generateRandomPassword();
      result = await query(
        `INSERT INTO resource_profiles 
         (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          username.toLowerCase().trim(),
          nameInput,
          role_id || null,
          seniority_id || null,
          skills || '',
          department_id || null,
          parseFloat(weekly_capacity_hours) || 40.0,
          standard_focus,
          generatedPassword
        ]
      );
    } else {
      const existingPassword = check.rows[0].password || generateRandomPassword();
      const finalPassword = passwordInput !== undefined && passwordInput !== '' ? passwordInput : existingPassword;
      const newUsername = username.toLowerCase().trim();
      const oldUsername = targetUser;

      result = await query(
        `UPDATE resource_profiles
         SET username = $1,
             name = $2,
             role_id = COALESCE($3, role_id),
             seniority_id = COALESCE($4, seniority_id),
             skills = COALESCE($5, skills),
             department_id = COALESCE($6, department_id),
             weekly_capacity_hours = COALESCE($7, weekly_capacity_hours),
             standard_focus = COALESCE($8, standard_focus),
             password = $9
         WHERE id = $10
         RETURNING *`,
        [
          newUsername,
          nameInput,
          role_id || null,
          seniority_id || null,
          skills !== undefined ? skills : null,
          department_id || null,
          weekly_capacity_hours ? parseFloat(weekly_capacity_hours) : null,
          standard_focus || null,
          finalPassword,
          check.rows[0].id
        ]
      );

      // If username changed, update dependent references across tables
      if (newUsername !== oldUsername) {
        await query('UPDATE work_items SET assigned_to = $1 WHERE assigned_to = $2', [newUsername, oldUsername]);
        await query('UPDATE work_items SET reviewer = $1 WHERE reviewer = $2', [newUsername, oldUsername]);
        await query('UPDATE opportunities SET presales_owner = $1 WHERE presales_owner = $2', [newUsername, oldUsername]);
        await query('UPDATE opportunities SET primary_sales_owner = $1 WHERE primary_sales_owner = $2', [newUsername, oldUsername]);
        await query('UPDATE effort_logs SET person = $1 WHERE person = $2', [newUsername, oldUsername]);
      }
    }

    const returnedRow = {
      ...result.rows[0],
      standard_focus_area: result.rows[0].standard_focus
    };

    return NextResponse.json(returnedRow);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  return POST(request);
}
