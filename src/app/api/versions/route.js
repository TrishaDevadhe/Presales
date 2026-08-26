import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all versions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunity_id');

    let sql = `
      SELECT v.*,
             o.opportunity_name, o.company,
             vt.option_name AS version_type_name,
             ts.option_name AS trigger_source_name,
             rc.option_name AS reason_category_name,
             di.option_name AS deadline_impact_name
      FROM versions v
      JOIN opportunities o ON v.opportunity_id = o.id
      JOIN dropdown_options vt ON v.version_type_id = vt.id
      JOIN dropdown_options ts ON v.trigger_source_id = ts.id
      LEFT JOIN dropdown_options rc ON v.reason_category_id = rc.id
      LEFT JOIN dropdown_options di ON v.deadline_impact_id = di.id
    `;
    const params = [];

    if (opportunityId) {
      sql += ' WHERE v.opportunity_id = $1';
      params.push(opportunityId);
    }

    sql += ' ORDER BY v.opportunity_id DESC, v.version_number DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create version (with auto-increment rules)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      version_type_id,
      trigger_source_id,
      reason_category_id,
      change_summary,
      commercial_changed,
      scope_changed,
      timeline_changed,
      estimated_rework_hours,
      deadline_impact_id,
      reviewed_by,
      approved_by,
      proposal_link,
      pricing_link
    } = body;

    // Validation
    if (!opportunity_id || !version_type_id || !trigger_source_id || !change_summary) {
      return NextResponse.json({ error: 'Opportunity, Version Type, Trigger Source, and Change Summary are required' }, { status: 400 });
    }

    // 1. Get next sequential version number for this opportunity
    const verRes = await query('SELECT COALESCE(MAX(version_number), 0) AS max_ver FROM versions WHERE opportunity_id = $1', [opportunity_id]);
    const nextVer = parseInt(verRes.rows[0].max_ver, 10) + 1;

    // 2. Insert Version
    const result = await query(
      `INSERT INTO versions (
        opportunity_id, version_number, version_type_id, trigger_source_id, reason_category_id,
        change_summary, commercial_changed, scope_changed, timeline_changed,
        estimated_rework_hours, deadline_impact_id, reviewed_by, approved_by, proposal_link, pricing_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        opportunity_id,
        nextVer,
        version_type_id,
        trigger_source_id,
        reason_category_id || null,
        change_summary,
        commercial_changed === true,
        scope_changed === true,
        timeline_changed === true,
        parseFloat(estimated_rework_hours) || 0.0,
        deadline_impact_id || null,
        reviewed_by || '',
        approved_by || '',
        proposal_link || '',
        pricing_link || ''
      ]
    );

    const version = result.rows[0];

    // 3. Update Opportunity counters
    let updateSql = 'UPDATE opportunities SET revision_counter = revision_counter + 1';
    const updateParams = [opportunity_id];
    if (commercial_changed === true) {
      updateSql += ', commercial_revision_counter = commercial_revision_counter + 1';
    }
    updateSql += ' WHERE id = $1';
    await query(updateSql, updateParams);

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
