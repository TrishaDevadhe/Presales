import { query } from './db';

export async function initDb() {
  console.log('Initializing database schema...');

  // 1. Create tables
  await query(`
    CREATE TABLE IF NOT EXISTS dropdown_options (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      option_name VARCHAR(100) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      color VARCHAR(7),
      UNIQUE (category, option_name)
    );
  `);

  await query(`
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
  `);

  await query(`
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
  `);

  await query(`
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
  `);

  await query(`
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
  `);

  await query(`
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
  `);

  await query(`
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
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS task_templates (
      id SERIAL PRIMARY KEY,
      opportunity_type_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE CASCADE,
      task_name VARCHAR(255) NOT NULL,
      default_estimated_hours NUMERIC(6,2),
      default_role_id INTEGER REFERENCES dropdown_options(id) ON DELETE SET NULL,
      sequence INTEGER DEFAULT 0
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS automation_settings (
      id SERIAL PRIMARY KEY,
      enable_missing_effort_reminder BOOLEAN DEFAULT TRUE,
      effort_variance_threshold NUMERIC(5,2) DEFAULT 20.0,
      revision_threshold INTEGER DEFAULT 3,
      overload_threshold NUMERIC(5,2) DEFAULT 100.0,
      reminder_frequency VARCHAR(20) DEFAULT 'Weekly'
    );
  `);

  console.log('Tables created. Populating default options...');

  // 2. Insert standard dropdown options
  const defaultOptions = [
    // opportunity_type
    { category: 'opportunity_type', name: 'RFP Response', order: 1, color: '#3b82f6' },
    { category: 'opportunity_type', name: 'Proactive Proposal', order: 2, color: '#10b981' },
    { category: 'opportunity_type', name: 'Client Presentation', order: 3, color: '#f59e0b' },
    { category: 'opportunity_type', name: 'POC / Demo', order: 4, color: '#8b5cf6' },
    { category: 'opportunity_type', name: 'QBR / Strategy', order: 5, color: '#ec4899' },

    // source
    { category: 'source', name: 'Inbound Inquiry', order: 1, color: '#10b981' },
    { category: 'source', name: 'Sales Outreach', order: 2, color: '#3b82f6' },
    { category: 'source', name: 'Partner Channel', order: 3, color: '#8b5cf6' },
    { category: 'source', name: 'Existing Account Expansion', order: 4, color: '#6366f1' },
    { category: 'source', name: 'Referral', order: 5, color: '#f59e0b' },

    // deal_stage
    { category: 'deal_stage', name: 'Qualification', order: 1, color: '#6b7280' },
    { category: 'deal_stage', name: 'Discovery', order: 2, color: '#3b82f6' },
    { category: 'deal_stage', name: 'Proposal Preparation', order: 3, color: '#f59e0b' },
    { category: 'deal_stage', name: 'Internal Review', order: 4, color: '#8b5cf6' },
    { category: 'deal_stage', name: 'Submitted to Client', order: 5, color: '#06b6d4' },
    { category: 'deal_stage', name: 'Won', order: 6, color: '#10b981' },
    { category: 'deal_stage', name: 'Lost', order: 7, color: '#ef4444' },

    // priority
    { category: 'priority', name: 'Low', order: 1, color: '#22c55e' },
    { category: 'priority', name: 'Medium', order: 2, color: '#eab308' },
    { category: 'priority', name: 'High', order: 3, color: '#f97316' },
    { category: 'priority', name: 'Critical', order: 4, color: '#ef4444' },

    // complexity
    { category: 'complexity', name: 'Low', order: 1, color: '#22c55e' },
    { category: 'complexity', name: 'Medium', order: 2, color: '#eab308' },
    { category: 'complexity', name: 'High', order: 3, color: '#f97316' },
    { category: 'complexity', name: 'Complex', order: 4, color: '#ef4444' },

    // work_category
    { category: 'work_category', name: 'Proposal Writing', order: 1, color: '#3b82f6' },
    { category: 'work_category', name: 'Architecture Design', order: 2, color: '#8b5cf6' },
    { category: 'work_category', name: 'Pricing & Estimation', order: 3, color: '#06b6d4' },
    { category: 'work_category', name: 'Demo Preparation', order: 4, color: '#ec4899' },
    { category: 'work_category', name: 'Client Meeting', order: 5, color: '#10b981' },
    { category: 'work_category', name: 'Review & QA', order: 6, color: '#f59e0b' },

    // deliverable_type
    { category: 'deliverable_type', name: 'PDF Proposal Document', order: 1, color: '#ef4444' },
    { category: 'deliverable_type', name: 'PowerPoint Pitch Deck', order: 2, color: '#f97316' },
    { category: 'deliverable_type', name: 'Excel Pricing Model', order: 3, color: '#22c55e' },
    { category: 'deliverable_type', name: 'Word RFP Response', order: 4, color: '#2563eb' },
    { category: 'deliverable_type', name: 'Interactive Demo Link', order: 5, color: '#8b5cf6' },
    { category: 'deliverable_type', name: 'Technical Architecture Diagram', order: 6, color: '#0d9488' },

    // estimation_confidence
    { category: 'estimation_confidence', name: 'High', order: 1, color: '#22c55e' },
    { category: 'estimation_confidence', name: 'Medium', order: 2, color: '#eab308' },
    { category: 'estimation_confidence', name: 'Low', order: 3, color: '#ef4444' },

    // task_status
    { category: 'task_status', name: 'Not Started', order: 1, color: '#6b7280' },
    { category: 'task_status', name: 'In Progress', order: 2, color: '#3b82f6' },
    { category: 'task_status', name: 'Review', order: 3, color: '#a855f7' },
    { category: 'task_status', name: 'Blocked', order: 4, color: '#ef4444' },
    { category: 'task_status', name: 'Completed', order: 5, color: '#10b981' },

    // trigger_source
    { category: 'trigger_source', name: 'Client Feedback', order: 1, color: '#3b82f6' },
    { category: 'trigger_source', name: 'Scope Expansion', order: 2, color: '#10b981' },
    { category: 'trigger_source', name: 'Internal QA Review', order: 3, color: '#f59e0b' },
    { category: 'trigger_source', name: 'Competitor Pressure', order: 4, color: '#ec4899' },
    { category: 'trigger_source', name: 'Executive Mandate', order: 5, color: '#8b5cf6' },

    // reason_category
    { category: 'reason_category', name: 'Commercial Negotiation', order: 1, color: '#059669' },
    { category: 'reason_category', name: 'Technical Clarification', order: 2, color: '#2563eb' },
    { category: 'reason_category', name: 'Timeline Compression', order: 3, color: '#d97706' },
    { category: 'reason_category', name: 'Scope Refinement', order: 4, color: '#7c3aed' },

    // version_type
    { category: 'version_type', name: 'Internal Draft', order: 1, color: '#6b7280' },
    { category: 'version_type', name: 'Client Submission', order: 2, color: '#2563eb' },
    { category: 'version_type', name: 'Final Contract Version', order: 3, color: '#16a34a' },

    // deadline_impact
    { category: 'deadline_impact', name: 'No Impact', order: 1, color: '#16a34a' },
    { category: 'deadline_impact', name: 'Minor Delay (< 3 Days)', order: 2, color: '#d97706' },
    { category: 'deadline_impact', name: 'Major Delay (> 3 Days)', order: 3, color: '#ea580c' },
    { category: 'deadline_impact', name: 'Critical Block / Reschedule', order: 4, color: '#dc2626' },

    // feedback_from
    { category: 'feedback_from', name: 'Client Decision Maker', order: 1, color: '#2563eb' },
    { category: 'feedback_from', name: 'Sales Account Manager', order: 2, color: '#4f46e5' },
    { category: 'feedback_from', name: 'External Consultant', order: 3, color: '#0d9488' },
    { category: 'feedback_from', name: 'Technical Review Panel', order: 4, color: '#7c3aed' },

    // feedback_type
    { category: 'feedback_type', name: 'Clarification Request', order: 1, color: '#3b82f6' },
    { category: 'feedback_type', name: 'Commercial Adjustment', order: 2, color: '#10b981' },
    { category: 'feedback_type', name: 'Scope Revision', order: 3, color: '#f59e0b' },
    { category: 'feedback_type', name: 'Defect / Error Correction', order: 4, color: '#ef4444' },

    // severity
    { category: 'severity', name: 'Low', order: 1, color: '#22c55e' },
    { category: 'severity', name: 'Medium', order: 2, color: '#eab308' },
    { category: 'severity', name: 'High', order: 3, color: '#f97316' },
    { category: 'severity', name: 'Critical', order: 4, color: '#ef4444' },

    // feedback_status
    { category: 'feedback_status', name: 'Open', order: 1, color: '#3b82f6' },
    { category: 'feedback_status', name: 'In Progress', order: 2, color: '#f59e0b' },
    { category: 'feedback_status', name: 'Resolved', order: 3, color: '#10b981' },

    // role
    { category: 'role', name: 'Admin', order: 1, color: '#ef4444' },
    { category: 'role', name: 'Presales Owner', order: 2, color: '#8b5cf6' },
    { category: 'role', name: 'Sales Owner', order: 3, color: '#3b82f6' },
    { category: 'role', name: 'Team Member', order: 4, color: '#10b981' },

    // seniority
    { category: 'seniority', name: 'Associate', order: 1, color: '#6b7280' },
    { category: 'seniority', name: 'Consultant', order: 2, color: '#3b82f6' },
    { category: 'seniority', name: 'Senior Consultant', order: 3, color: '#8b5cf6' },
    { category: 'seniority', name: 'Principal Consultant', order: 4, color: '#ec4899' },

    // department
    { category: 'department', name: 'Presales Solutions', order: 1, color: '#8b5cf6' },
    { category: 'department', name: 'Enterprise Sales', order: 2, color: '#3b82f6' },
    { category: 'department', name: 'Delivery / Consulting', order: 3, color: '#10b981' },
    { category: 'department', name: 'Product Management', order: 4, color: '#ec4899' }
  ];

  for (const opt of defaultOptions) {
    await query(
      `INSERT INTO dropdown_options (category, option_name, sort_order, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category, option_name) DO UPDATE SET color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;`,
      [opt.category, opt.name, opt.order, opt.color]
    );
  }

  // 3. Insert default automation settings if empty
  const settingsCount = await query('SELECT COUNT(*) FROM automation_settings');
  if (parseInt(settingsCount.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO automation_settings (enable_missing_effort_reminder, effort_variance_threshold, revision_threshold, overload_threshold, reminder_frequency)
      VALUES (true, 20.0, 3, 100.0, 'Weekly');
    `);
  }

  // 4. Insert default user profiles mapped to dropdown options
  const userRoles = [
    { username: 'admin', role: 'Admin', seniority: 'Principal Consultant', dept: 'Presales Solutions', cap: 40.0, focus: 'Management, Solution Architecture' },
    { username: 'jane_doe', role: 'Presales Owner', seniority: 'Senior Consultant', dept: 'Presales Solutions', cap: 45.0, focus: 'RFPs, Cloud Architecture' },
    { username: 'john_smith', role: 'Sales Owner', seniority: 'Principal Consultant', dept: 'Enterprise Sales', cap: 40.0, focus: 'Sales, Relationship Management' },
    { username: 'bob_jones', role: 'Team Member', seniority: 'Consultant', dept: 'Delivery / Consulting', cap: 35.0, focus: 'Demo Prep, Frontend' },
    { username: 'alice_williams', role: 'Team Member', seniority: 'Associate', dept: 'Delivery / Consulting', cap: 40.0, focus: 'Pricing, Excel Modeling' }
  ];

  for (const u of userRoles) {
    const roleRes = await query("SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = $1", [u.role]);
    const roleId = roleRes.rows[0]?.id || null;

    const senRes = await query("SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = $1", [u.seniority]);
    const senId = senRes.rows[0]?.id || null;

    const deptRes = await query("SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = $1", [u.dept]);
    const deptId = deptRes.rows[0]?.id || null;

    await query(
      `INSERT INTO resource_profiles (username, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO NOTHING;`,
      [u.username, roleId, senId, u.focus, deptId, u.cap, u.focus]
    );
  }

  // 5. Insert default task templates if empty
  const templateCount = await query('SELECT COUNT(*) FROM task_templates');
  if (parseInt(templateCount.rows[0].count, 10) === 0) {
    // RFP Response templates
    const rfpType = await query("SELECT id FROM dropdown_options WHERE category = 'opportunity_type' AND option_name = 'RFP Response'");
    const rfpId = rfpType.rows[0]?.id;

    // Proactive Proposal templates
    const proactiveType = await query("SELECT id FROM dropdown_options WHERE category = 'opportunity_type' AND option_name = 'Proactive Proposal'");
    const proactiveId = proactiveType.rows[0]?.id;

    const pmRole = await query("SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Presales Owner'");
    const pmRoleId = pmRole.rows[0]?.id;

    const tmRole = await query("SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Team Member'");
    const tmRoleId = tmRole.rows[0]?.id;

    if (rfpId) {
      await query(`
        INSERT INTO task_templates (opportunity_type_id, task_name, default_estimated_hours, default_role_id, sequence) VALUES
        (${rfpId}, 'Requirement Scoping & Alignment', 8, ${pmRoleId}, 1),
        (${rfpId}, 'Architecture & Design Specification', 24, ${tmRoleId}, 2),
        (${rfpId}, 'Pricing & Effort Estimation Excel', 12, ${tmRoleId}, 3),
        (${rfpId}, 'First Draft Proposal Review', 6, ${pmRoleId}, 4),
        (${rfpId}, 'Executive Presentation Preparation', 10, ${pmRoleId}, 5);
      `);
    }

    if (proactiveId) {
      await query(`
        INSERT INTO task_templates (opportunity_type_id, task_name, default_estimated_hours, default_role_id, sequence) VALUES
        (${proactiveId}, 'Client Value Proposition Definition', 4, ${pmRoleId}, 1),
        (${proactiveId}, 'Demo / Solution Mockup Creation', 16, ${tmRoleId}, 2),
        (${proactiveId}, 'Commercial Structure & Proposal Drafting', 8, ${pmRoleId}, 3),
        (${proactiveId}, 'Final Pitch Review', 4, ${pmRoleId}, 4);
      `);
    }
  }

  console.log('Database initialization completed successfully!');
}
