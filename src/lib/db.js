import { Pool, types } from 'pg';
import { initDb } from './initDb.js';
import {
  FALLBACK_DROPDOWN_OPTIONS,
  FALLBACK_RESOURCE_PROFILES,
  FALLBACK_OPPORTUNITIES,
  FALLBACK_WORK_ITEMS,
  FALLBACK_EFFORTS,
  FALLBACK_VERSIONS,
  FALLBACK_FEEDBACKS,
  FALLBACK_TASK_TEMPLATES,
  FALLBACK_AUTOMATION_SETTINGS
} from './fallbackData.js';

// Override PostgreSQL DATE type parser (OID 1082) to return raw string 'YYYY-MM-DD'
types.setTypeParser(1082, (val) => val);

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.PGHOST) {
    const user = encodeURIComponent(process.env.PGUSER || 'postgres');
    const password = encodeURIComponent(process.env.PGPASSWORD || '');
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || 5432;
    const database = process.env.PGDATABASE || 'postgres';
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }
  return 'postgres://postgres:postgres@127.0.0.1:5432/presales_db';
}

function getPool() {
  const connectionString = getConnectionString();
  const isLocalhost = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');
  
  if (!global._postgresPool || global._postgresPoolConnStr !== connectionString) {
    if (global._postgresPool) {
      try { global._postgresPool.end().catch(() => {}); } catch (e) {}
    }
    global._postgresPoolConnStr = connectionString;
    global._dbInitialized = false;
    global._useDbFallback = false;
    global._postgresPool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000
    });
  }
  return global._postgresPool;
}

const pool = new Proxy({}, {
  get(target, prop) {
    const activePool = getPool();
    const value = activePool[prop];
    return typeof value === 'function' ? value.bind(activePool) : value;
  }
});

let initPromise = null;
let isInitializing = false;

function initInMemoryStore() {
  if (global._inMemoryStore) return global._inMemoryStore;
  global._inMemoryStore = {
    dropdown_options: JSON.parse(JSON.stringify(FALLBACK_DROPDOWN_OPTIONS)),
    resource_profiles: JSON.parse(JSON.stringify(FALLBACK_RESOURCE_PROFILES)),
    opportunities: JSON.parse(JSON.stringify(FALLBACK_OPPORTUNITIES)),
    work_items: JSON.parse(JSON.stringify(FALLBACK_WORK_ITEMS)),
    efforts: JSON.parse(JSON.stringify(FALLBACK_EFFORTS)),
    versions: JSON.parse(JSON.stringify(FALLBACK_VERSIONS)),
    feedbacks: JSON.parse(JSON.stringify(FALLBACK_FEEDBACKS)),
    task_templates: JSON.parse(JSON.stringify(FALLBACK_TASK_TEMPLATES)),
    automation_settings: JSON.parse(JSON.stringify(FALLBACK_AUTOMATION_SETTINGS)),
    audit_logs: []
  };
  return global._inMemoryStore;
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENETUNREACH' ||
    msg.includes('enotfound') ||
    msg.includes('connect econnrefused') ||
    msg.includes('connection timeout') ||
    msg.includes('getaddrinfo')
  );
}

function runInMemoryQuery(text, params = []) {
  const store = initInMemoryStore();
  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // Information schema probe
  if (lowerSql.includes('information_schema.tables')) {
    return { rows: [{ '?column?': 1 }], rowCount: 1 };
  }

  // Schema alterations / setup
  if (
    lowerSql.startsWith('alter') ||
    lowerSql.includes('update resource_profiles') ||
    lowerSql.includes('insert into dropdown_options') ||
    lowerSql.includes('insert into resource_profiles')
  ) {
    return { rows: [], rowCount: 0 };
  }

  // INSERT INTO opportunities
  if (lowerSql.includes('insert into opportunities')) {
    const nextId = store.opportunities.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1;
    const newOpp = {
      id: nextId,
      opportunity_name: params[0] || 'New Opportunity',
      company: params[1] || 'Company',
      opportunity_type_id: params[2] || 1,
      deliverable_type_id: params[3] || 1,
      primary_sales_owner: params[4] || 'john_smith',
      secondary_sales_owners: params[5] || '',
      delivery_team: params[6] || null,
      project_type: params[7] || null,
      source_id: params[8] || 1,
      deal_stage_id: params[9] || 1,
      priority_id: params[10] || 1,
      estimated_deal_value: params[11] || 0,
      contract_tenure: params[12] || 12,
      win_probability: params[13] || 100,
      complexity_id: params[14] || 1,
      received_date: params[15] || new Date().toISOString().split('T')[0],
      target_submission_date: params[16] || new Date().toISOString().split('T')[0],
      internal_review_date: params[17] || null,
      presales_owner: params[18] || 'jane_doe',
      supporting_presales_members: params[19] || '',
      summary: params[20] || '',
      risks: params[21] || '',
      special_instructions: params[22] || '',
      tcv_amount: params[23] || params[11] || 0,
      tcv_currency: params[24] || 'USD',
      finance_status: params[25] || 'Pending'
    };
    store.opportunities.push(newOpp);
    return { rows: [newOpp], rowCount: 1 };
  }

  // INSERT INTO work_items
  if (lowerSql.includes('insert into work_items')) {
    const nextId = store.work_items.reduce((max, w) => Math.max(max, w.id || 0), 0) + 1;
    const newItem = {
      id: nextId,
      opportunity_id: params[0],
      work_category_id: params[1],
      deliverable_type_id: params[2],
      title: params[3] || 'Task',
      description: params[4] || '',
      assigned_to: params[5] || 'admin',
      priority_id: params[6] || 1,
      start_date: params[7] || new Date().toISOString().split('T')[0],
      due_date: params[8] || new Date().toISOString().split('T')[0],
      estimated_hours: params[9] || 4.0,
      status_id: params[10] || 35
    };
    store.work_items.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }

  // INSERT INTO audit_logs
  if (lowerSql.includes('insert into audit_logs')) {
    const logItem = { id: Date.now(), timestamp: new Date().toISOString() };
    store.audit_logs.push(logItem);
    return { rows: [logItem], rowCount: 1 };
  }

  // SELECT LOWER(TRIM(company)) as company, LOWER(TRIM(opportunity_name)) as opp_name FROM opportunities
  if (lowerSql.includes('lower(trim(company))')) {
    return {
      rows: store.opportunities.map(o => ({
        company: String(o.company || '').toLowerCase().trim(),
        opp_name: String(o.opportunity_name || '').toLowerCase().trim()
      }))
    };
  }

  // SELECT ... FROM dropdown_options
  if (lowerSql.includes('from dropdown_options')) {
    let list = store.dropdown_options;
    if (lowerSql.includes('active = true')) {
      list = list.filter(d => d.active !== false);
    }
    return { rows: list };
  }

  // SELECT ... FROM resource_profiles
  if (lowerSql.includes('from resource_profiles')) {
    return { rows: store.resource_profiles };
  }

  // SELECT ... FROM task_templates
  if (lowerSql.includes('from task_templates')) {
    return { rows: store.task_templates };
  }

  // SELECT ... FROM opportunities
  if (lowerSql.includes('from opportunities')) {
    return { rows: store.opportunities };
  }

  // SELECT ... FROM work_items
  if (lowerSql.includes('from work_items')) {
    return { rows: store.work_items };
  }

  // Default fallback
  return { rows: [], rowCount: 0 };
}

async function ensureDbInitialized() {
  if (global._dbInitialized) {
    return;
  }
  if (global._useDbFallback) {
    global._dbInitialized = true;
    return;
  }
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    isInitializing = true;
    try {
      // Fast probe
      const check = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'dropdown_options' LIMIT 1;");
      if (check.rows.length > 0) {
        try {
          await pool.query(`
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255);
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            ALTER TABLE resource_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            UPDATE resource_profiles SET is_active = true WHERE is_active IS NULL;
          `);
        } catch (alterErr) {
          console.error('Error running migrations in ensureDbInitialized:', alterErr);
        }
        global._dbInitialized = true;
        return;
      }
      await initDb();
      global._dbInitialized = true;
    } catch (err) {
      if (isConnectionError(err)) {
        console.warn('PostgreSQL database unreachable. Switching to in-memory fallback store:', err.message);
        global._useDbFallback = true;
        global._dbInitialized = true;
        return;
      }
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
  if (global._useDbFallback) {
    return runInMemoryQuery(text, params);
  }

  if (!isInitializing && !global._dbInitialized) {
    try {
      await ensureDbInitialized();
    } catch (e) {
      if (isConnectionError(e)) {
        global._useDbFallback = true;
        return runInMemoryQuery(text, params);
      }
    }
  }

  if (global._useDbFallback) {
    return runInMemoryQuery(text, params);
  }

  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn('PostgreSQL database connection lost. Falling back to in-memory store:', err.message);
      global._useDbFallback = true;
      return runInMemoryQuery(text, params);
    }
    console.error('Database query error:', err, { text, params });
    throw err;
  }
}
