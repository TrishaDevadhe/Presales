import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const existingRes = await query(`
      SELECT el.*, wi.title AS work_item_title 
      FROM effort_logs el 
      LEFT JOIN work_items wi ON el.work_item_id = wi.id 
      WHERE el.id = $1`, [id]);
    const existing = existingRes.rows[0];

    const result = await query('DELETE FROM effort_logs WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Effort Log not found' }, { status: 404 });
    }

    if (existing) {
      try {
        const { logActivity } = await import('@/lib/auditLogger');
        const realUser = request.headers.get('x-real-user') || existing.person || 'admin';
        const actingAsUser = request.headers.get('x-acting-as-user') || null;

        await logActivity({
          real_user_id: realUser,
          acting_as_user_id: actingAsUser,
          entity_type: 'Effort Log',
          entity_id: parseInt(id, 10),
          entity_title: `${existing.hours_logged}h on ${existing.work_item_title || 'Task'}`,
          action_type: 'Deleted',
          field_changed: 'Effort Log Entry',
          value_before: `${existing.hours_logged} hrs logged by @${existing.person}`,
          value_after: 'Deleted',
          summary_text: `Deleted effort log entry of ${existing.hours_logged} hrs on task: ${existing.work_item_title || 'Task'}`
        });
      } catch (e) {
        console.error('Audit logging failed for effort log deletion:', e);
      }
    }

    return NextResponse.json({ message: 'Effort Log deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
