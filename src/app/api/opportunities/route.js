import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET list of opportunities
export async function GET() {
  try {
    const result = await query(`
      SELECT o.*,
             ot.option_name AS opportunity_type_name, ot.color AS opportunity_type_color,
             dt.option_name AS deliverable_type_name, dt.color AS deliverable_type_color,
             src.option_name AS source_name, src.color AS source_color,
             ds.option_name AS deal_stage_name, ds.color AS deal_stage_color,
             p.option_name AS priority_name, p.color AS priority_color,
             cx.option_name AS complexity_name, cx.color AS complexity_color
      FROM opportunities o
      JOIN dropdown_options ot ON o.opportunity_type_id = ot.id
      LEFT JOIN dropdown_options dt ON o.deliverable_type_id = dt.id
      LEFT JOIN dropdown_options src ON o.source_id = src.id
      LEFT JOIN dropdown_options ds ON o.deal_stage_id = ds.id
      LEFT JOIN dropdown_options p ON o.priority_id = p.id
      LEFT JOIN dropdown_options cx ON o.complexity_id = cx.id
      ORDER BY o.target_submission_date ASC, o.id DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST a new opportunity (with automation for template task generation)
export async function POST(request) {
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

    // Unique per company validation
    const uniqueCheck = await query(
      'SELECT id FROM opportunities WHERE company = $1 AND opportunity_name = $2',
      [company, opportunity_name]
    );
    if (uniqueCheck.rows.length > 0) {
      return NextResponse.json({ error: 'An opportunity with this name already exists for this company' }, { status: 400 });
    }

    // Insert Opportunity
    const oppResult = await query(
      `INSERT INTO opportunities (
        opportunity_name, company, opportunity_type_id, deliverable_type_id, primary_sales_owner, secondary_sales_owners,
        source_id, deal_stage_id, priority_id, estimated_deal_value, contract_tenure,
        win_probability, complexity_id, received_date, target_submission_date, internal_review_date,
        presales_owner, supporting_presales_members, summary, risks, special_instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        special_instructions || ''
      ]
    );

    const opportunity = oppResult.rows[0];

    // AUTOMATION: Generate tasks from template
    // If deliverable_type_id is specified, prioritize templates for that deliverable_type
    let templateQuery = 'SELECT * FROM task_templates';
    let templateParams = [];
    if (deliverable_type_id) {
      templateQuery += ' WHERE deliverable_type_id = $1';
      templateParams.push(deliverable_type_id);
    }
    templateQuery += ' ORDER BY sequence ASC';

    let templates = await query(templateQuery, templateParams);
    
    // Fallback if no specific templates found for deliverable_type_id
    if (templates.rows.length === 0 && deliverable_type_id) {
      templates = await query('SELECT * FROM task_templates ORDER BY sequence ASC');
    }

    if (templates.rows.length > 0) {
      // 1. Get Complexity multiplier
      let multiplier = 1.0;
      if (complexity_id) {
        const compRes = await query('SELECT option_name FROM dropdown_options WHERE id = $1', [complexity_id]);
        if (compRes.rows.length > 0) {
          const compName = compRes.rows[0].option_name.toLowerCase();
          if (compName.includes('low')) multiplier = 0.5;
          else if (compName.includes('medium')) multiplier = 1.0;
          else if (compName.includes('high')) multiplier = 1.5;
          else if (compName.includes('complex')) multiplier = 2.0;
        }
      }

      // 2. Fetch default 'Not Started' task status and 'Proposal Writing' (or standard) category
      const notStartedStatus = await query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started'");
      const notStartedId = notStartedStatus.rows[0]?.id;

      const propCategory = await query("SELECT id FROM dropdown_options WHERE category = 'work_category' AND option_name = 'Proposal Writing'");
      const workCategoryId = propCategory.rows[0]?.id;

      // Calculate time spread
      const recDateObj = new Date(received_date);
      const tarDateObj = new Date(target_submission_date);
      const totalDays = Math.max(1, Math.ceil((tarDateObj - recDateObj) / (1000 * 60 * 60 * 24)));
      const maxSeq = Math.max(...templates.rows.map(t => t.sequence || 1));

      for (const t of templates.rows) {
        const calculatedHours = (t.default_estimated_hours || 0) * multiplier;

        // Spread dates
        const seqRatio = maxSeq > 0 ? (t.sequence || 1) / maxSeq : 1.0;
        const taskDueDays = Math.round(totalDays * seqRatio);
        const taskDueDate = new Date(recDateObj);
        taskDueDate.setDate(recDateObj.getDate() + taskDueDays);

        // Date check: due date cannot exceed target date
        if (taskDueDate > tarDateObj) {
          taskDueDate.setTime(tarDateObj.getTime());
        }

        // Try to assign based on role or fallback to presales_owner
        let assignedUser = presales_owner;
        if (t.default_role_id) {
          // Find first user profile matching this role
          const userRes = await query(
            'SELECT username FROM resource_profiles WHERE role_id = $1 LIMIT 1',
            [t.default_role_id]
          );
          if (userRes.rows.length > 0) {
            assignedUser = userRes.rows[0].username;
          }
        }

        await query(
          `INSERT INTO work_items (
            opportunity_id, work_category_id, deliverable_type_id, title, description, assigned_to,
            priority_id, start_date, due_date, estimated_hours, status_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            opportunity.id,
            t.work_category_id || workCategoryId || null,
            t.deliverable_type_id || deliverable_type_id || null,
            t.task_name,
            `Auto-generated task from deliverable template for complexity: ${multiplier}x`,
            assignedUser,
            priority_id || null,
            received_date,
            taskDueDate.toISOString().split('T')[0],
            calculatedHours,
            notStartedId || null
          ]
        );
      }
    }

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
