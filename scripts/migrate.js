const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  console.log('Starting data migration to Supabase...');

  // 1. Get database URL from .env.local
  let envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '../.env.local');
  }

  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found. Please create it or configure DATABASE_URL.');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  let databaseUrl = '';
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      databaseUrl = trimmed.split('DATABASE_URL=')[1].trim();
    }
  }

  if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
    console.error('❌ Error: Please replace [YOUR-PASSWORD] in your .env.local file with your actual Supabase database password first!');
    process.exit(1);
  }

  // 2. Connect to local and Supabase databases
  const localClient = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/presales_db'
  });

  const supabaseClient = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await localClient.connect();
    console.log('✅ Connected to local PostgreSQL database.');
  } catch (err) {
    console.error('❌ Failed to connect to local database:', err.message);
    process.exit(1);
  }

  try {
    await supabaseClient.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');
  } catch (err) {
    console.error('❌ Failed to connect to Supabase database:', err.message);
    localClient.end();
    process.exit(1);
  }

  // Drop existing tables on Supabase to ensure clean migration
  console.log('Cleaning up existing tables on Supabase to ensure fresh migration...');
  const dropTables = [
    'feedbacks',
    'versions',
    'effort_logs',
    'work_items',
    'task_templates',
    'opportunities',
    'automation_settings',
    'resource_profiles',
    'dropdown_options',
    'client_feedbacks',
    'proposal_versions'
  ];
  for (const t of dropTables) {
    try {
      await supabaseClient.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    } catch (e) {
      console.log(`Failed to drop table ${t}:`, e.message);
    }
  }

  // 3. Initialize schema on Supabase matching initDb.js exactly
  console.log('Creating tables on Supabase if not present...');
  await supabaseClient.query(`
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
      opportunity_type_id INTEGER NOT NULL REFERENCES dropdown_options(id) ON DELETE CASCADE,
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
      reminder_frequency VARCHAR(50) DEFAULT 'Weekly'
    );
  `);
  console.log('✅ Schema verified/created on Supabase.');

  // 4. Tables list in dependency order
  const tables = [
    {
      name: 'dropdown_options',
      columns: ['id', 'category', 'option_name', 'active', 'sort_order', 'color']
    },
    {
      name: 'resource_profiles',
      columns: ['id', 'username', 'role_id', 'seniority_id', 'skills', 'department_id', 'weekly_capacity_hours', 'standard_focus']
    },
    {
      name: 'automation_settings',
      columns: ['id', 'enable_missing_effort_reminder', 'effort_variance_threshold', 'revision_threshold', 'overload_threshold', 'reminder_frequency']
    },
    {
      name: 'opportunities',
      columns: [
        'id', 'opportunity_name', 'company', 'opportunity_type_id', 'primary_sales_owner', 'secondary_sales_owners',
        'source_id', 'deal_stage_id', 'priority_id', 'estimated_deal_value', 'contract_tenure', 'win_probability',
        'complexity_id', 'received_date', 'target_submission_date', 'internal_review_date', 'presales_owner',
        'supporting_presales_members', 'summary', 'risks', 'special_instructions', 'revision_counter', 'commercial_revision_counter'
      ]
    },
    {
      name: 'task_templates',
      columns: ['id', 'deliverable_type_id', 'task_name', 'default_estimated_hours', 'default_role_id', 'sequence']
    },
    {
      name: 'work_items',
      columns: [
        'id', 'opportunity_id', 'work_category_id', 'title', 'description', 'deliverable_type_id', 'assigned_to',
        'reviewer', 'collaborators', 'priority_id', 'start_date', 'due_date', 'estimated_hours',
        'estimation_confidence_id', 'is_revision_work', 'revision_number', 'trigger_id', 'status_id',
        'blocker_reason', 'deliverable_link', 'notes'
      ]
    },
    {
      name: 'effort_logs',
      columns: ['id', 'work_item_id', 'person', 'date', 'hours_logged', 'effort_type_id', 'activity_type_id', 'notes']
    },
    {
      name: 'versions',
      columns: [
        'id', 'opportunity_id', 'version_number', 'version_type_id', 'trigger_source_id', 'reason_category_id',
        'change_summary', 'commercial_changed', 'scope_changed', 'timeline_changed', 'estimated_rework_hours',
        'deadline_impact_id', 'reviewed_by', 'approved_by', 'proposal_link', 'pricing_link'
      ]
    },
    {
      name: 'feedbacks',
      columns: [
        'id', 'opportunity_id', 'version_id', 'feedback_from_id', 'feedback_type_id', 'severity_id', 'feedback_text',
        'action_required', 'owner', 'due_date', 'status_id', 'created_work_item_id'
      ]
    }
  ];

  // 5. Migrate table by table
  for (const table of tables) {
    console.log(`Migrating table ${table.name}...`);

    try {
      await supabaseClient.query(`TRUNCATE TABLE ${table.name} CASCADE`);
    } catch (e) {
      await supabaseClient.query(`DELETE FROM ${table.name}`);
    }

    // Fetch from local
    const localRes = await localClient.query(`SELECT * FROM ${table.name}`);
    const rows = localRes.rows;

    console.log(`Found ${rows.length} rows to migrate for ${table.name}.`);

    if (rows.length === 0) continue;

    // Insert into Supabase
    for (const row of rows) {
      const colNames = table.columns.join(', ');
      const valPlaceholders = table.columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = table.columns.map(col => row[col]);

      await supabaseClient.query(
        `INSERT INTO ${table.name} (${colNames}) VALUES (${valPlaceholders})`,
        values
      );
    }

    // Update ID sequence
    try {
      await supabaseClient.query(`SELECT setval('${table.name}_id_seq', COALESCE((SELECT MAX(id)+1 FROM ${table.name}), 1), false)`);
    } catch (e) {
      // Ignore if sequence doesn't exist
    }

    console.log(`Refreshed ID sequence for ${table.name}.`);
  }

  console.log('\n🎉 ALL DATA MIGRATED SUCCESSFULLY TO SUPABASE!');
  localClient.end();
  supabaseClient.end();
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
