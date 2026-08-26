import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityTypeId = searchParams.get('opportunity_type_id');

    let sql = `
      SELECT t.*, 
             o.option_name AS opportunity_type_name, 
             r.option_name AS default_role_name 
      FROM task_templates t
      JOIN dropdown_options o ON t.opportunity_type_id = o.id
      LEFT JOIN dropdown_options r ON t.default_role_id = r.id
    `;
    const params = [];

    if (opportunityTypeId) {
      sql += ' WHERE t.opportunity_type_id = $1';
      params.push(opportunityTypeId);
    }

    sql += ' ORDER BY o.option_name ASC, t.sequence ASC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { opportunity_type_id, task_name, default_estimated_hours, default_role_id, sequence } = body;

    if (!opportunity_type_id || !task_name) {
      return NextResponse.json({ error: 'Opportunity Type and Task Name are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO task_templates (opportunity_type_id, task_name, default_estimated_hours, default_role_id, sequence)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        opportunity_type_id,
        task_name,
        parseFloat(default_estimated_hours) || 0.0,
        default_role_id || null,
        parseInt(sequence, 10) || 0
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    await query('DELETE FROM task_templates WHERE id = $1', [id]);
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
