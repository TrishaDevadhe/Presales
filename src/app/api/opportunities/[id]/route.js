import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET a single opportunity
export async function GET(request, { params }) {
  const id = params.id;
  try {
    const result = await query(
      `SELECT o.*,
              ot.option_name AS opportunity_type_name,
              src.option_name AS source_name,
              ds.option_name AS deal_stage_name,
              p.option_name AS priority_name,
              cx.option_name AS complexity_name
       FROM opportunities o
       JOIN dropdown_options ot ON o.opportunity_type_id = ot.id
       LEFT JOIN dropdown_options src ON o.source_id = src.id
       LEFT JOIN dropdown_options ds ON o.deal_stage_id = ds.id
       LEFT JOIN dropdown_options p ON o.priority_id = p.id
       LEFT JOIN dropdown_options cx ON o.complexity_id = cx.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT (update) an opportunity
export async function PUT(request, { params }) {
  const id = params.id;
  try {
    const body = await request.json();
    const {
      opportunity_name,
      company,
      opportunity_type_id,
      primary_sales_owner,
      secondary_sales_owners,
      source_id,
      deal_stage_id,
      priority_id,
      estimated_deal_value,
      contract_tenure,
      win_probability,
      complexity_id,
      received_date,
      target_submission_date,
      internal_review_date,
      presales_owner,
      supporting_presales_members,
      summary,
      risks,
      special_instructions
    } = body;

    // Validation
    if (!opportunity_name || !company || !opportunity_type_id || !primary_sales_owner || !presales_owner || !received_date || !target_submission_date) {
      return NextResponse.json({ error: 'Opportunity Name, Company, Type, Sales Owner, Presales Owner, Received Date, and Target Date are required' }, { status: 400 });
    }

    // Target Date check
    if (new Date(target_submission_date) < new Date(received_date)) {
      return NextResponse.json({ error: 'Target Submission Date must be on or after Received Date' }, { status: 400 });
    }

    // Unique per company validation excluding current opportunity
    const uniqueCheck = await query(
      'SELECT id FROM opportunities WHERE company = $1 AND opportunity_name = $2 AND id != $3',
      [company, opportunity_name, id]
    );
    if (uniqueCheck.rows.length > 0) {
      return NextResponse.json({ error: 'An opportunity with this name already exists for this company' }, { status: 400 });
    }

    const result = await query(
      `UPDATE opportunities
       SET opportunity_name = $1,
           company = $2,
           opportunity_type_id = $3,
           primary_sales_owner = $4,
           secondary_sales_owners = $5,
           source_id = $6,
           deal_stage_id = $7,
           priority_id = $8,
           estimated_deal_value = $9,
           contract_tenure = $10,
           win_probability = $11,
           complexity_id = $12,
           received_date = $13,
           target_submission_date = $14,
           internal_review_date = $15,
           presales_owner = $16,
           supporting_presales_members = $17,
           summary = $18,
           risks = $19,
           special_instructions = $20
       WHERE id = $21
       RETURNING *`,
      [
        opportunity_name,
        company,
        opportunity_type_id,
        primary_sales_owner,
        secondary_sales_owners || '',
        source_id || null,
        deal_stage_id || null,
        priority_id || null,
        parseFloat(estimated_deal_value) || 0.0,
        parseInt(contract_tenure, 10) || 0,
        parseInt(win_probability, 10) || 0,
        complexity_id || null,
        received_date,
        target_submission_date,
        internal_review_date || null,
        presales_owner,
        supporting_presales_members || '',
        summary || '',
        risks || '',
        special_instructions || '',
        id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an opportunity
export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const result = await query('DELETE FROM opportunities WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
