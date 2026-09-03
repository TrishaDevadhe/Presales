import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET a single opportunity
export async function GET(request, { params }) {
  const id = params.id;
  try {
    const result = await query(
      `SELECT o.*,
              ot.option_name AS opportunity_type_name,
              dt.option_name AS deliverable_type_name,
              src.option_name AS source_name,
              ds.option_name AS deal_stage_name,
              p.option_name AS priority_name,
              cx.option_name AS complexity_name
       FROM opportunities o
       JOIN dropdown_options ot ON o.opportunity_type_id = ot.id
       LEFT JOIN dropdown_options dt ON o.deliverable_type_id = dt.id
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
      deliverable_type_id,
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

    const existingRes = await query(
      `SELECT o.*, ds.option_name as stage_name FROM opportunities o LEFT JOIN dropdown_options ds ON o.deal_stage_id = ds.id WHERE o.id = $1`,
      [id]
    );
    const existing = existingRes.rows[0];

    const result = await query(
      `UPDATE opportunities
       SET opportunity_name = $1,
           company = $2,
           opportunity_type_id = $3,
           deliverable_type_id = $4,
           primary_sales_owner = $5,
           secondary_sales_owners = $6,
           source_id = $7,
           deal_stage_id = $8,
           priority_id = $9,
           estimated_deal_value = $10,
           contract_tenure = $11,
           win_probability = $12,
           complexity_id = $13,
           received_date = $14,
           target_submission_date = $15,
           internal_review_date = $16,
           presales_owner = $17,
           supporting_presales_members = $18,
           summary = $19,
           risks = $20,
           special_instructions = $21
       WHERE id = $22
       RETURNING *`,
      [
        opportunity_name,
        company,
        opportunity_type_id,
        deliverable_type_id || null,
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

    const updatedOpp = result.rows[0];

    try {
      const { logActivity } = await import('@/lib/auditLogger');
      const realUser = request.headers.get('x-real-user') || body.real_user_id || presales_owner || 'admin';
      const actingAsUser = request.headers.get('x-acting-as-user') || body.acting_as_user_id || null;

      let actionType = 'Updated';
      let fieldChanged = null;
      let valueBefore = null;
      let valueAfter = null;
      let summaryText = `Updated Opportunity: ${updatedOpp.company} - ${updatedOpp.opportunity_name}`;

      if (existing && existing.deal_stage_id !== updatedOpp.deal_stage_id) {
        const newStageRes = await query('SELECT option_name FROM dropdown_options WHERE id = $1', [updatedOpp.deal_stage_id]);
        actionType = 'Status Changed';
        fieldChanged = 'Deal Stage';
        valueBefore = existing.stage_name || 'Intake';
        valueAfter = newStageRes.rows[0]?.option_name || 'N/A';
        summaryText = `Deal Stage: ${valueBefore} → ${valueAfter}`;
      } else if (existing && existing.presales_owner !== updatedOpp.presales_owner) {
        actionType = 'Assigned';
        fieldChanged = 'Presales Owner';
        valueBefore = `@${existing.presales_owner}`;
        valueAfter = `@${updatedOpp.presales_owner}`;
        summaryText = `Presales Owner reassigned: ${valueBefore} → ${valueAfter}`;
      } else if (existing && parseFloat(existing.estimated_deal_value) !== parseFloat(updatedOpp.estimated_deal_value)) {
        actionType = 'Updated';
        fieldChanged = 'Estimated Deal Value';
        valueBefore = `$${parseFloat(existing.estimated_deal_value).toLocaleString()}`;
        valueAfter = `$${parseFloat(updatedOpp.estimated_deal_value).toLocaleString()}`;
        summaryText = `Estimated Deal Value: ${valueBefore} → ${valueAfter}`;
      }

      await logActivity({
        real_user_id: realUser,
        acting_as_user_id: actingAsUser,
        entity_type: 'Opportunity',
        entity_id: updatedOpp.id,
        entity_title: `${updatedOpp.company} - ${updatedOpp.opportunity_name}`,
        action_type: actionType,
        field_changed: fieldChanged,
        value_before: valueBefore,
        value_after: valueAfter,
        summary_text: summaryText
      });
    } catch (e) {
      console.error('Audit logging failed for opportunity update:', e);
    }

    return NextResponse.json(updatedOpp);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an opportunity
export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    const existingRes = await query('SELECT * FROM opportunities WHERE id = $1', [id]);
    const existing = existingRes.rows[0];

    const result = await query('DELETE FROM opportunities WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    if (existing) {
      try {
        const { logActivity } = await import('@/lib/auditLogger');
        const realUser = request.headers.get('x-real-user') || 'admin';
        const actingAsUser = request.headers.get('x-acting-as-user') || null;

        await logActivity({
          real_user_id: realUser,
          acting_as_user_id: actingAsUser,
          entity_type: 'Opportunity',
          entity_id: id,
          entity_title: `${existing.company} - ${existing.opportunity_name}`,
          action_type: 'Deleted',
          summary_text: `Opportunity deleted: ${existing.company} - ${existing.opportunity_name}`
        });
      } catch (e) {
        console.error('Audit logging failed for opportunity deletion:', e);
      }
    }

    return NextResponse.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
