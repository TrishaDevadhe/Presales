import { Pool, types } from 'pg';
import { initDb } from './initDb.js';

// Override PostgreSQL DATE type parser (OID 1082) to return raw string 'YYYY-MM-DD'
// Prevents UTC midnight JavaScript Date object conversion that shifts dates to previous day in client timezones
types.setTypeParser(1082, (val) => val);

let pool;
let initPromise = null;
let isInitializing = false;

if (!global._postgresPool) {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/presales_db';
  const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.net');
  
  global._postgresPool = new Pool({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    max: 20, // Support concurrent parallel queries
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
}
pool = global._postgresPool;

async function ensureDbInitialized() {
  // If process already verified database setup, return immediately
  if (global._dbInitialized) {
    return;
  }
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    isInitializing = true;
    try {
      // Fast 1ms probe: check if primary table exists
      const check = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'dropdown_options' LIMIT 1;");
      if (check.rows.length > 0) {
        // ALWAYS make sure password column exists and is populated for existing tables
        try {
          await pool.query(`
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255);
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            UPDATE resource_profiles SET is_active = true WHERE is_active IS NULL;

            -- Update Admin credentials
            UPDATE resource_profiles 
            SET name = 'Adhesh(admin)', password = 'admin123' 
            WHERE username = 'admin';

            -- Rename bob_jones -> vartika_jadon if bob_jones exists
            UPDATE resource_profiles 
            SET username = 'vartika_jadon', name = 'Vartika Jadon', password = 'vartika123' 
            WHERE username = 'bob_jones';

            -- Ensure jane_doe exists
            INSERT INTO resource_profiles (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
            SELECT 'jane_doe', 'Jane Doe', 
                   (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Presales Owner' LIMIT 1), 
                   (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = 'Senior Consultant' LIMIT 1), 
                   'RFPs, Cloud Architecture', 
                   (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = 'Presales Solutions' LIMIT 1), 
                   45.0, 'RFPs, Cloud Architecture', 'jane123'
            WHERE NOT EXISTS (SELECT 1 FROM resource_profiles WHERE username = 'jane_doe');

            -- Explicitly set passwords and names for existing/updated profiles
            UPDATE resource_profiles SET name = 'Adhesh(admin)', password = 'admin123' WHERE username = 'admin';
            UPDATE resource_profiles SET name = 'Vartika Jadon', password = 'vartika123' WHERE username = 'vartika_jadon';
            UPDATE resource_profiles SET name = 'Jane Doe', password = 'jane123' WHERE username = 'jane_doe';
            UPDATE resource_profiles SET name = 'Alice Williams', password = 'alice123' WHERE username = 'alice_williams';

            -- Insert vikrant_dhuriya if not exists
            INSERT INTO resource_profiles (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
            SELECT 'vikrant_dhuriya', 'Vikrant Dhuriya', 
                   (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Team Member' LIMIT 1), 
                   (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = 'Consultant' LIMIT 1), 
                   'Solution Architecture & Integration', 
                   (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = 'Delivery / Consulting' LIMIT 1), 
                   40.0, 'Solution Architecture & Integration', 'vikrant123'
            WHERE NOT EXISTS (SELECT 1 FROM resource_profiles WHERE username = 'vikrant_dhuriya');

            -- Insert divyam_malliwal if not exists
            INSERT INTO resource_profiles (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
            SELECT 'divyam_malliwal', 'Divyam Malliwal', 
                   (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Team Member' LIMIT 1), 
                   (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = 'Consultant' LIMIT 1), 
                   'Technical Consulting & Delivery', 
                   (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = 'Delivery / Consulting' LIMIT 1), 
                   40.0, 'Technical Consulting & Delivery', 'divyam123'
            WHERE NOT EXISTS (SELECT 1 FROM resource_profiles WHERE username = 'divyam_malliwal');

            -- Migrate references in relational tables
            UPDATE work_items SET assigned_to = 'vartika_jadon' WHERE assigned_to = 'bob_jones';
            UPDATE work_items SET assigned_to = 'jane_doe' WHERE assigned_to = 'trisha_devadhe';
            UPDATE work_items SET reviewer = 'vartika_jadon' WHERE reviewer = 'bob_jones';
            UPDATE work_items SET reviewer = 'jane_doe' WHERE reviewer = 'trisha_devadhe';

            UPDATE effort_logs SET person = 'vartika_jadon' WHERE person = 'bob_jones';
            UPDATE effort_logs SET person = 'jane_doe' WHERE person = 'trisha_devadhe';

            UPDATE opportunities SET presales_owner = 'jane_doe' WHERE presales_owner = 'trisha_devadhe';
            UPDATE opportunities SET presales_owner = 'vartika_jadon' WHERE presales_owner = 'bob_jones';
            UPDATE opportunities SET primary_sales_owner = 'jane_doe' WHERE primary_sales_owner = 'trisha_devadhe';
            UPDATE opportunities SET primary_sales_owner = 'vartika_jadon' WHERE primary_sales_owner = 'bob_jones';

            UPDATE feedbacks SET owner = 'vartika_jadon' WHERE owner = 'bob_jones';
            UPDATE feedbacks SET owner = 'jane_doe' WHERE owner = 'trisha_devadhe';

            UPDATE versions SET reviewed_by = 'vartika_jadon' WHERE reviewed_by = 'bob_jones';
            UPDATE versions SET reviewed_by = 'jane_doe' WHERE reviewed_by = 'trisha_devadhe';
            UPDATE versions SET approved_by = 'vartika_jadon' WHERE approved_by = 'bob_jones';
            UPDATE versions SET approved_by = 'jane_doe' WHERE approved_by = 'trisha_devadhe';

            -- Ensure trisha_devadhe exists as a Team Member
            INSERT INTO resource_profiles (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
            SELECT 'trisha_devadhe', 'Trisha Devadhe', 
                   (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Team Member' LIMIT 1), 
                   (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = 'Senior Consultant' LIMIT 1), 
                   'RFPs, Cloud Architecture', 
                   (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = 'Presales Solutions' LIMIT 1), 
                   40.0, 'RFPs, Cloud Architecture', 'trisha123'
            WHERE NOT EXISTS (SELECT 1 FROM resource_profiles WHERE username = 'trisha_devadhe');

            -- Explicitly set passwords and names for existing/updated profiles
            UPDATE resource_profiles SET name = 'Adhesh(admin)', password = 'admin123' WHERE username = 'admin';
            UPDATE resource_profiles SET name = 'Vartika Jadon', password = 'vartika123' WHERE username = 'vartika_jadon';
            UPDATE resource_profiles SET name = 'Jane Doe', password = 'jane123' WHERE username = 'jane_doe';
            UPDATE resource_profiles SET name = 'Trisha Devadhe', password = 'trisha123', role_id = (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Team Member' LIMIT 1) WHERE username = 'trisha_devadhe';
            UPDATE resource_profiles SET name = 'Alice Williams', password = 'alice123' WHERE username = 'alice_williams';
            UPDATE resource_profiles SET name = 'Vikrant Dhuriya', password = 'vikrant123' WHERE username = 'vikrant_dhuriya';
            UPDATE resource_profiles SET name = 'Divyam Malliwal', password = 'divyam123' WHERE username = 'divyam_malliwal';

            -- Ensure Finance Team role and profile exist
            INSERT INTO dropdown_options (category, option_name, sort_order, color)
            VALUES ('role', 'Finance Team', 5, '#f59e0b')
            ON CONFLICT (category, option_name) DO NOTHING;

            INSERT INTO resource_profiles (username, name, role_id, seniority_id, skills, department_id, weekly_capacity_hours, standard_focus, password)
            SELECT 'finance_team', 'Finance Team', 
                   (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Finance Team' LIMIT 1), 
                   (SELECT id FROM dropdown_options WHERE category = 'seniority' AND option_name = 'Senior Consultant' LIMIT 1), 
                   'Financial & Commercial Review, Deal Approvals', 
                   (SELECT id FROM dropdown_options WHERE category = 'department' AND option_name = 'Presales Solutions' LIMIT 1), 
                   40.0, 'Financial & Commercial Review, Deal Approvals', 'finance123'
            WHERE NOT EXISTS (SELECT 1 FROM resource_profiles WHERE username = 'finance_team');

            UPDATE resource_profiles 
            SET name = 'Finance Team', password = 'finance123', role_id = (SELECT id FROM dropdown_options WHERE category = 'role' AND option_name = 'Finance Team' LIMIT 1) 
            WHERE username = 'finance_team';

            -- Ensure every existing opportunity has a Finance Review work item assigned to finance_team
            INSERT INTO work_items (
              opportunity_id, work_category_id, deliverable_type_id, title, description, assigned_to,
              priority_id, start_date, due_date, estimated_hours, status_id
            )
            SELECT 
              o.id,
              COALESCE(o.deliverable_type_id, (SELECT id FROM dropdown_options WHERE category = 'work_category' AND option_name = 'Pricing' LIMIT 1)),
              o.deliverable_type_id,
              'Finance Review & Commercial Approval',
              '=== OPPORTUNITY REVIEW DETAILS FOR FINANCE TEAM ===' || CHR(10) ||
              'Company: ' || COALESCE(o.company, 'N/A') || CHR(10) ||
              'Opportunity Name: ' || COALESCE(o.opportunity_name, 'N/A') || CHR(10) ||
              'Estimated Deal Value: $' || COALESCE(o.estimated_deal_value::text, '0.00') || CHR(10) ||
              'TCV Amount: ' || COALESCE(o.tcv_currency, 'USD') || ' $' || COALESCE(o.tcv_amount::text, '0.00') || CHR(10) ||
              'Contract Tenure: ' || COALESCE(o.contract_tenure::text, '0') || ' Months' || CHR(10) ||
              'Win Probability: ' || COALESCE(o.win_probability::text, '0') || '%' || CHR(10) ||
              'Received Date: ' || COALESCE(o.received_date::text, 'N/A') || CHR(10) ||
              'Target Submission Date: ' || COALESCE(o.target_submission_date::text, 'N/A') || CHR(10) ||
              'Primary Sales Owner: ' || COALESCE(o.primary_sales_owner, 'N/A') || CHR(10) ||
              'Presales Owner: ' || COALESCE(o.presales_owner, 'N/A') || CHR(10) ||
              'Summary: ' || COALESCE(o.summary, 'N/A') || CHR(10) ||
              'Risks: ' || COALESCE(o.risks, 'N/A'),
              'finance_team',
              o.priority_id,
              o.received_date,
              o.target_submission_date,
              4.0,
              (SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started' LIMIT 1)
            FROM opportunities o
            WHERE NOT EXISTS (
              SELECT 1 FROM work_items w 
              WHERE w.opportunity_id = o.id AND (w.assigned_to = 'finance_team' OR LOWER(w.title) LIKE '%finance%')
            );


            UPDATE resource_profiles 
            SET password = SPLIT_PART(username, '_', 1) || '123' 
            WHERE password IS NULL;

            ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS delivery_team VARCHAR(255);
            ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS project_type VARCHAR(255);
            ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS finance_status VARCHAR(50) DEFAULT 'Pending';
            UPDATE opportunities SET finance_status = 'Pending' WHERE finance_status IS NULL;

            UPDATE dropdown_options
            SET option_name = 'RFP Response'
            WHERE category = 'deliverable_type' AND option_name = 'RFP';

            INSERT INTO dropdown_options (category, option_name, sort_order, color)
            VALUES ('opportunity_type', 'Change Request', 3, '#8b5cf6')
            ON CONFLICT (category, option_name) DO NOTHING;

            INSERT INTO dropdown_options (category, option_name, sort_order, color)
            VALUES ('deal_stage', 'POC(Proof Of Concept)', 3, '#8b5cf6')
            ON CONFLICT (category, option_name) DO NOTHING;

            INSERT INTO dropdown_options (category, option_name, sort_order, color)
            VALUES ('deliverable_type', 'Non RFP Response', 2, '#3b82f6')
            ON CONFLICT (category, option_name) DO NOTHING;
          `);
        } catch (alterErr) {
          console.error('Error running migrations in ensureDbInitialized:', alterErr);
        }
        global._dbInitialized = true;
        return;
      }
      // If table doesn't exist, run full database schema initialization
      await initDb();
      global._dbInitialized = true;
    } catch (err) {
      console.error('Failed to initialize database:', err);
      initPromise = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

export default pool;

export async function query(text, params) {
  if (!isInitializing && !global._dbInitialized) {
    await ensureDbInitialized();
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err, { text, params });
    throw err;
  }
}
