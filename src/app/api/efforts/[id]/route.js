import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const result = await query('DELETE FROM effort_logs WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Effort Log not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Effort Log deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
