import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all dropdown options
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let sql = 'SELECT * FROM dropdown_options';
    const params = [];

    const conditions = [];
    if (category) {
      conditions.push('category = $1');
      params.push(category);
    }
    if (activeOnly) {
      conditions.push('active = true');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY category ASC, sort_order ASC, option_name ASC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST a new dropdown option
export async function POST(request) {
  try {
    const body = await request.json();
    const { category, option_name, active, sort_order, color } = body;

    if (!category || !option_name) {
      return NextResponse.json({ error: 'Category and Option Name are required' }, { status: 400 });
    }

    const check = await query(
      'SELECT id FROM dropdown_options WHERE category = $1 AND option_name = $2',
      [category, option_name]
    );

    if (check.rows.length > 0) {
      return NextResponse.json({ error: 'Option already exists in this category' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO dropdown_options (category, option_name, active, sort_order, color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category, option_name, active !== false, parseInt(sort_order, 10) || 0, color || null]
    );

    const newOpt = result.rows[0];

    try {
      const { logActivity } = await import('@/lib/auditLogger');
      const realUser = request.headers.get('x-real-user') || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || null;

      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Admin Config',
        entity_id: newOpt.id,
        entity_title: `Picklist Option (${category}): ${option_name}`,
        action_type: 'Created',
        summary_text: `Added new picklist option in category '${category}': ${option_name}`
      });
    } catch (e) {
      console.error('Audit logging failed for dropdown option creation:', e);
    }

    return NextResponse.json(newOpt, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT (update) an existing dropdown option
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, option_name, active, sort_order, color } = body;

    if (!id || !option_name) {
      return NextResponse.json({ error: 'ID and Option Name are required' }, { status: 400 });
    }

    const existingRes = await query('SELECT * FROM dropdown_options WHERE id = $1', [id]);
    const existing = existingRes.rows[0];

    const result = await query(
      `UPDATE dropdown_options
       SET option_name = $1, active = $2, sort_order = $3, color = $4
       WHERE id = $5
       RETURNING *`,
      [option_name, active !== false, parseInt(sort_order, 10) || 0, color || null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    const updatedOpt = result.rows[0];

    try {
      const { logActivity } = await import('@/lib/auditLogger');
      const realUser = request.headers.get('x-real-user') || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || null;

      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Admin Config',
        entity_id: updatedOpt.id,
        entity_title: `Picklist Option (${updatedOpt.category}): ${updatedOpt.option_name}`,
        action_type: 'Updated',
        field_changed: existing && existing.option_name !== updatedOpt.option_name ? 'Option Name' : 'Option Configuration',
        value_before: existing ? `${existing.option_name} (Active: ${existing.active})` : null,
        value_after: `${updatedOpt.option_name} (Active: ${updatedOpt.active})`,
        summary_text: `Updated picklist option in category '${updatedOpt.category}': ${updatedOpt.option_name}`
      });
    } catch (e) {
      console.error('Audit logging failed for dropdown option update:', e);
    }

    return NextResponse.json(updatedOpt);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
