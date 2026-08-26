import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliverableTypeId = searchParams.get('deliverable_type_id');

    let sql = `
      SELECT t.*, 
             d.option_name AS deliverable_type_name, 
             r.option_name AS default_role_name 
      FROM task_templates t
      JOIN dropdown_options d ON t.deliverable_type_id = d.id
      LEFT JOIN dropdown_options r ON t.default_role_id = r.id
    `;
    const params = [];

    if (deliverableTypeId) {
      sql += ' WHERE t.deliverable_type_id = $1';
      params.push(deliverableTypeId);
    }

    sql += ' ORDER BY d.option_name ASC, t.sequence ASC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { deliverable_type_id, task_name, default_estimated_hours, default_role_id, sequence, sequence_order } = body;

    const finalSequence = sequence || sequence_order;

    if (!deliverable_type_id || !task_name) {
      return NextResponse.json({ error: 'Deliverable Type and Task Name are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO task_templates (deliverable_type_id, task_name, default_estimated_hours, default_role_id, sequence)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        deliverable_type_id,
        task_name,
        parseFloat(default_estimated_hours) || 0.0,
        default_role_id || null,
        parseInt(finalSequence, 10) || 0
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
