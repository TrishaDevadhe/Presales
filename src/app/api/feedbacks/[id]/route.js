import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET a single feedback
export async function GET(request, { params }) {
  const id = params.id;
  try {
    const result = await query('SELECT * FROM feedbacks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT (update) feedback
export async function PUT(request, { params }) {
  const id = params.id;
  try {
    const body = await request.json();
    const { status_id, action_required, owner, due_date, feedback_text } = body;

    // Validation for Action Required fields on update
    if (action_required === true) {
      if (!owner || !owner.trim()) {
        return NextResponse.json({ error: 'Owner is required when Action Required is toggled on' }, { status: 400 });
      }
      if (!due_date) {
        return NextResponse.json({ error: 'Due Date is required when Action Required is toggled on' }, { status: 400 });
      }
    }

    const result = await query(
      `UPDATE feedbacks
       SET status_id = $1,
           action_required = $2,
           owner = $3,
           due_date = $4,
           feedback_text = COALESCE($5, feedback_text)
       WHERE id = $6
       RETURNING *`,
      [
        status_id,
        action_required === true,
        action_required === true ? owner : '',
        action_required === true ? due_date : null,
        feedback_text || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE feedback
export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const result = await query('DELETE FROM feedbacks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
