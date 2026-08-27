import { query } from './db.js';

export async function initDb() {
  console.log('Initializing database schema and indexes...');

  // 1. Bulk Table Creation & Performance Indexes in a single DDL execution
  const schemaSql = `
    BEGIN;

    CREATE TABLE IF NOT EXISTS dropdown_options (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      option_name VARCHAR(100) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      color VARCHAR(7),
      UNIQUE (category, option_name)
    );

    CREATE TABLE IF NOT EXISTS resource_profiles (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      role_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      seniority_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      skills TEXT,
      department_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      weekly_capacity_hours NUMERIC(5,2) DEFAULT 40.0,
      standard_focus TEXT
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id SERIAL PRIMARY KEY,
      opportunity_name VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      opportunity_type_id INTEGER REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      primary_sales_owner VARCHAR(100) NOT NULL,
      secondary_sales_owners TEXT,
      source_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      deal_stage_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      priority_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      estimated_deal_value NUMERIC(15,2) DEFAULT 0.0,
      contract_tenure INTEGER DEFAULT 0,
      win_probability INTEGER DEFAULT 0,
      complexity_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      received_date DATE NOT NULL,
      target_submission_date DATE NOT NULL,
      internal_review_date DATE,
      presales_owner VARCHAR(100) NOT NULL,
      supporting_presales_members TEXT,
      summary TEXT,
      risks TEXT,
      special_instructions TEXT,
      revision_counter INTEGER DEFAULT 0,
      commercial_revision_counter INTEGER DEFAULT 0,
      UNIQUE (company, opportunity_name)
    );

    CREATE TABLE IF NOT EXISTS versions (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      version_type_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      trigger_source_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      reason_category_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      change_summary TEXT NOT NULL,
      commercial_changed BOOLEAN DEFAULT FALSE,
      scope_changed BOOLEAN DEFAULT FALSE,
      timeline_changed BOOLEAN DEFAULT FALSE,
      estimated_rework_hours NUMERIC(6,2) DEFAULT 0.0,
      deadline_impact_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      reviewed_by VARCHAR(100),
      approved_by VARCHAR(100),
      proposal_link TEXT,
      pricing_link TEXT
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
      work_category_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      deliverable_type_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      assigned_to VARCHAR(100) NOT NULL,
      reviewer VARCHAR(100),
      collaborators TEXT,
      priority_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      start_date DATE NOT NULL,
      due_date DATE NOT NULL,
      estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 0.0,
      estimation_confidence_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      is_revision_work BOOLEAN DEFAULT FALSE,
      revision_number INTEGER,
      trigger_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      status_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      blocker_reason TEXT,
      deliverable_link TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS effort_logs (
      id SERIAL PRIMARY KEY,
      work_item_id INTEGER NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
      person VARCHAR(100) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      hours_logged NUMERIC(4,2) NOT NULL,
      effort_type_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      activity_type_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      version_id INTEGER REFERENCES versions(id) ON DELETE SET NULL,
      feedback_from_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      feedback_type_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      severity_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      feedback_text TEXT NOT NULL,
      action_required BOOLEAN DEFAULT FALSE,
      owner VARCHAR(100),
      due_date DATE,
      status_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE RESTRICT,
      created_work_item_id INTEGER REFERENCES work_items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_templates (
      id SERIAL PRIMARY KEY,
      deliverable_type_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE CASCADE,
      task_name VARCHAR(255) NOT NULL,
      default_estimated_hours NUMERIC(6,2),
      default_role_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      sequence INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS automation_settings (
      id SERIAL PRIMARY KEY,
      enable_missing_effort_reminder BOOLEAN DEFAULT TRUE,
      effort_variance_threshold NUMERIC(5,2) DEFAULT 20.0,
      revision_threshold INTEGER DEFAULT 3,
      overload_threshold NUMERIC(5,2) DEFAULT 100.0,
      reminder_frequency VARCHAR(20) DEFAULT 'Weekly'
    );

    -- High-Performance Indexes for Foreign Keys & Filter Columns
    CREATE INDEX IF NOT EXISTS idx_dropdown_category ON dropdown_options(category, active);
    CREATE INDEX IF NOT EXISTS idx_opp_deal_stage ON opportunities(deal_stage_id);
    CREATE INDEX IF NOT EXISTS idx_opp_target_date ON opportunities(target_submission_date);
    CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_assigned ON work_items(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_work_items_opp ON work_items(opportunity_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_due ON work_items(due_date);
    CREATE INDEX IF NOT EXISTS idx_effort_work_item ON effort_logs(work_item_id);
    CREATE INDEX IF NOT EXISTS idx_versions_opp ON versions(opportunity_id);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_opp ON feedbacks(opportunity_id);

    COMMIT;
  `;

  await query(schemaSql);

  // 2. Insert standard dropdown options in a SINGLE bulk INSERT
  const defaultOptions = [
    ['opportunity_type', 'Renewal', 1, '#3b82f6'],
    ['opportunity_type', 'New Business', 2, '#10b981'],
    ['source', 'Inbound Inquiry', 1, '#10b981'],
    ['source', 'Sales Outreach', 2, '#3b82f6'],
    ['source', 'Partner Channel', 3, '#8b5cf6'],
    ['source', 'Existing Account Expansion', 4, '#6366f1'],
    ['source', 'Referral', 5, '#f59e0b'],
    ['deal_stage', 'Proposal', 1, '#f59e0b'],
    ['deal_stage', 'Qualification', 2, '#6b7280'],
    ['deal_stage', 'Discovery', 3, '#3b82f6'],
    ['deal_stage', 'Internal Review', 4, '#8b5cf6'],
    ['deal_stage', 'Submitted to Client', 5, '#06b6d4'],
    ['deal_stage', 'Won', 6, '#10b981'],
    ['deal_stage', 'Lost', 7, '#ef4444'],
    ['priority', 'Low', 1, '#22c55e'],
    ['priority', 'Medium', 2, '#eab308'],
    ['priority', 'High', 3, '#f97316'],
    ['priority', 'Critical', 4, '#ef4444'],
    ['complexity', 'Low', 1, '#22c55e'],
    ['complexity', 'Medium', 2, '#eab308'],
    ['complexity', 'High', 3, '#f97316'],
    ['complexity', 'Complex', 4, '#ef4444'],
    ['work_category', 'Proposal Writing', 1, '#3b82f6'],
    ['work_category', 'Architecture Design', 2, '#8b5cf6'],
    ['work_category', 'Pricing & Estimation', 3, '#06b6d4'],
    ['work_category', 'Demo Preparation', 4, '#ec4899'],
    ['work_category', 'Client Meeting', 5, '#10b981'],
    ['work_category', 'Review & QA', 6, '#f59e0b'],
    ['deliverable_type', 'RFP', 1, '#ef4444'],
    ['deliverable_type', 'Proposal', 2, '#f97316'],
    ['deliverable_type', 'presentation deck', 3, '#22c55e'],
    ['deliverable_type', 'brochure', 4, '#2563eb'],
    ['estimation_confidence', 'High', 1, '#22c55e'],
    ['estimation_confidence', 'Medium', 2, '#eab308'],
    ['estimation_confidence', 'Low', 3, '#ef4444'],
    ['task_status', 'Not Started', 1, '#6b7280'],
    ['task_status', 'In Progress', 2, '#3b82f6'],
    ['task_status', 'Review', 3, '#a855f7'],
    ['task_status', 'Blocked', 4, '#ef4444'],
    ['task_status', 'Completed', 5, '#10b981'],
    ['trigger_source', 'Client Feedback', 1, '#3b82f6'],
    ['trigger_source', 'Scope Expansion', 2, '#10b981'],
    ['trigger_source', 'Internal QA Review', 3, '#f59e0b'],
    ['trigger_source', 'Competitor Pressure', 4, '#ec4899'],
    ['trigger_source', 'Executive Mandate', 5, '#8b5cf6'],
    ['reason_category', 'Commercial Negotiation', 1, '#059669'],
    ['reason_category', 'Technical Clarification', 2, '#2563eb'],
    ['reason_category', 'Timeline Compression', 3, '#d97706'],
    ['reason_category', 'Scope Refinement', 4, '#7c3aed'],
    ['version_type', 'Internal Draft', 1, '#6b7280'],
    ['version_type', 'Client Submission', 2, '#2563eb'],
    ['version_type', 'Final Contract Version', 3, '#16a34a'],
    ['deadline_impact', 'No Impact', 1, '#16a34a'],
    ['deadline_impact', 'Minor Delay (< 3 Days)', 2, '#d97706'],
    ['deadline_impact', 'Major Delay (> 3 Days)', 3, '#ea580c'],
    ['deadline_impact', 'Critical Block / Reschedule', 4, '#dc2626'],
    ['feedback_from', 'Client Decision Maker', 1, '#2563eb'],
    ['feedback_from', 'Sales Account Manager', 2, '#4f46e5'],
    ['feedback_from', 'External Consultant', 3, '#0d9488'],
    ['feedback_from', 'Technical Review Panel', 4, '#7c3aed'],
    ['feedback_type', 'Clarification Request', 1, '#3b82f6'],
    ['feedback_type', 'Commercial Adjustment', 2, '#10b981'],
    ['feedback_type', 'Scope Revision', 3, '#f59e0b'],
    ['feedback_type', 'Defect / Error Correction', 4, '#ef4444'],
    ['severity', 'Low', 1, '#22c55e'],
    ['severity', 'Medium', 2, '#eab308'],
    ['severity', 'High', 3, '#f97316'],
    ['severity', 'Critical', 4, '#ef4444'],
    ['feedback_status', 'Open', 1, '#3b82f6'],
    ['feedback_status', 'In Progress', 2, '#f59e0b'],
    ['feedback_status', 'Resolved', 3, '#10b981'],
    ['role', 'Admin', 1, '#ef4444'],
    ['role', 'Presales Owner', 2, '#8b5cf6'],
    ['role', 'Sales Owner', 3, '#3b82f6'],
    ['role', 'Team Member', 4, '#10b981'],
    ['seniority', 'Associate', 1, '#6b7280'],
    ['seniority', 'Consultant', 2, '#3b82f6'],
    ['seniority', 'Senior Consultant', 3, '#8b5cf6'],
    ['seniority', 'Principal Consultant', 4, '#ec4899'],
    ['department', 'Presales Solutions', 1, '#8b5cf6'],
    ['department', 'Enterprise Sales', 2, '#3b82f6'],
    ['department', 'Delivery / Consulting', 3, '#10b981'],
    ['department', 'Product Management', 4, '#ec4899']
  ];

  const valuesPlaceholders = defaultOptions.map((_, i) => 
    `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
  ).join(', ');
  const flatParams = defaultOptions.flat();

  await query(
    `INSERT INTO dropdown_options (category, option_name, sort_order, color)
     VALUES ${valuesPlaceholders}
     ON CONFLICT (category, option_name) DO UPDATE SET color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;`,
    flatParams
  );

  // 3. Insert default automation settings
  await query(`
    INSERT INTO automation_settings (enable_missing_effort_reminder, effort_variance_threshold, revision_threshold, overload_threshold, reminder_frequency)
    SELECT true, 20.0, 3, 100.0, 'Weekly'
    WHERE NOT EXISTS (SELECT 1 FROM automation_settings);
  `);

  // 4. Insert default user profiles
  const userRoles = [
    { username: 'admin', role: 'Admin', seniority: 'Principal Consultant', dept: 'Presales Solutions', cap: 40.0, focus: 'Management, Solution Architecture' },
    { username: 'jane_doe', role: 'Presales Owner', seniority: 'Senior Consultant', dept: 'Presales Solutions', cap: 45.0, focus: 'RFPs, Cloud Architecture' },
    { username: 'john_smith', role: 'Sales Owner', seniority: 'Principal Consultant', dept: 'Enterprise Sales', cap: 40.0, focus: 'Sales, Relationship Management' },
    { username: 'bob_jones', role: 'Team Member', seniority: 'Consultant', dept: 'Delivery / Consulting', cap: 35.0, focus: 'Demo Prep, Frontend' },
    { username: 'alice_williams', role: 'Team Member', seniority: 'Associate', dept: 'Delivery / Consulting', cap: 40.0, focus: 'Pricing, Excel Modeling' }
  ];

  for (const u of userRoles) {
    await query(
      `INSERT INTO resource_profiles (username, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus)
       VALUES (
         $1, 
         (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = $2 LIMIT 1),
         (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = $3 LIMIT 1),
         $4,
         (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = $5 LIMIT 1),
         $6,
         $7
       )
       ON CONFLICT (username) DO NOTHING;`,
      [u.username, u.role, u.seniority, u.focus, u.dept, u.cap, u.focus]
    );
  }

  // 5. Seed default task templates
  await query(`
    INSERT INTO task_templates (deliverable_type_id, task_name, default_estimated_hours, default_role_id, sequence)
    SELECT d.id, t.task_name, t.hours, r.id, t.seq
    FROM (VALUES 
      ('RFP', 'RFP Scope & Compliance Matrix Review', 6.0, 'Presales Owner', 1),
      ('RFP', 'Technical Scoping & Architecture Design', 16.0, 'Team Member', 2),
      ('RFP', 'RFP Response Drafting & Content Assembly', 12.0, 'Team Member', 3),
      ('Proposal', 'Requirements Scoping & Executive Summary', 8.0, 'Presales Owner', 1),
      ('Proposal', 'Commercial & Pricing Model Development', 10.0, 'Team Member', 2),
      ('Proposal', 'Proposal Document Review & Final Polish', 6.0, 'Presales Owner', 3),
      ('presentation deck', 'Presentation Structure & Storyboarding', 4.0, 'Presales Owner', 1),
      ('presentation deck', 'Slide Deck Content & Visual Design', 8.0, 'Team Member', 2),
      ('presentation deck', 'Dry Run & Client Pitch Preparation', 4.0, 'Presales Owner', 3),
      ('brochure', 'Value Proposition & Content Outline', 4.0, 'Presales Owner', 1),
      ('brochure', 'Graphic Design & Layout Assembly', 6.0, 'Team Member', 2),
      ('brochure', 'Collateral Review & Export', 2.0, 'Presales Owner', 3)
    ) AS t(deliv_name, task_name, hours, role_name, seq)
    JOIN dropdown_options d ON d.category = 'deliverable_type' AND LOWER(d.option_name) = LOWER(t.deliv_name)
    LEFT JOIN dropdown_options r ON r.category = 'role' AND r.option_name = t.role_name
    WHERE NOT EXISTS (SELECT 1 FROM task_templates);
  `);

  console.log('Database schema and seed data initialized successfully!');
}
