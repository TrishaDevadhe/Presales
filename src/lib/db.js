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

  // INSERT INTO effort_logs
  if (lowerSql.includes('insert into effort_logs')) {
    const nextId = store.efforts.reduce((max, e) => Math.max(max, e.id || 0), 0) + 1;
    const newLog = {
      id: nextId,
      work_item_id: parseInt(params[0], 10),
      person: params[1],
      date: params[2],
      hours_logged: parseFloat(params[3]),
      effort_type_id: params[4] ? parseInt(params[4], 10) : null,
      activity_type_id: params[5] ? parseInt(params[5], 10) : null,
      notes: params[6] || ''
    };
    store.efforts.push(newLog);
    return { rows: [newLog], rowCount: 1 };
  }

  // SELECT SUM(hours_logged) FROM effort_logs
  if (lowerSql.includes('select sum(hours_logged)') && lowerSql.includes('effort_logs')) {
    const wid = parseInt(params[0], 10);
    const total = store.efforts
      .filter(e => parseInt(e.work_item_id, 10) === wid)
      .reduce((sum, e) => sum + (parseFloat(e.hours_logged) || 0), 0);
    return { rows: [{ total }], rowCount: 1 };
  }

  // SELECT ... FROM effort_logs
  if (lowerSql.includes('from effort_logs')) {
    let list = store.efforts.map(el => {
      const wi = store.work_items.find(w => w.id === parseInt(el.work_item_id, 10));
      const opp = wi ? store.opportunities.find(o => o.id === parseInt(wi.opportunity_id, 10)) : null;
      const dt = wi ? store.dropdown_options.find(d => d.id === parseInt(wi.deliverable_type_id, 10)) : null;
      const et = el.effort_type_id ? store.dropdown_options.find(d => d.id === parseInt(el.effort_type_id, 10)) : null;
      const act = el.activity_type_id ? store.dropdown_options.find(d => d.id === parseInt(el.activity_type_id, 10)) : null;
      return {
        ...el,
        work_item_title: wi ? wi.title : '',
        work_item_estimated_hours: wi ? wi.estimated_hours : 0,
        opportunity_id: wi ? wi.opportunity_id : null,
        deliverable_type_id: wi ? wi.deliverable_type_id : null,
        opportunity_name: opp ? opp.opportunity_name : '',
        company: opp ? opp.company : '',
        deliverable_type_name: dt ? dt.option_name : '',
        effort_type_name: et ? et.option_name : '',
        activity_type_name: act ? act.option_name : ''
      };
    });

    if (lowerSql.includes('el.work_item_id = $') || lowerSql.includes('work_item_id = $')) {
      const wid = parseInt(params[0], 10);
      list = list.filter(e => parseInt(e.work_item_id, 10) === wid);
    }
    if (lowerSql.includes('el.person = $') || lowerSql.includes('person = $')) {
      const p = params[params.length - 1];
      list = list.filter(e => (e.person || '').toLowerCase() === (p || '').toLowerCase());
    }
    return { rows: list, rowCount: list.length };
  }

  // UPDATE opportunities
  if (lowerSql.startsWith('update opportunities') || lowerSql.includes('update opportunities')) {
    if (lowerSql.includes('set finance_status = $1 where id = $2')) {
      const finance_status = params[0];
      const id = parseInt(params[1], 10);
      const opp = store.opportunities.find(o => o.id === id);
      if (opp) {
        opp.finance_status = finance_status;
        return { rows: [opp], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    const id = parseInt(params[params.length - 1], 10);
    const opp = store.opportunities.find(o => o.id === id);
    if (opp) {
      opp.opportunity_name = params[0] || opp.opportunity_name;
      opp.company = params[1] || opp.company;
      opp.opportunity_type_id = params[2] !== undefined ? params[2] : opp.opportunity_type_id;
      opp.deliverable_type_id = params[3] !== undefined ? params[3] : opp.deliverable_type_id;
      opp.primary_sales_owner = params[4] || opp.primary_sales_owner;
      opp.secondary_sales_owners = params[5] !== undefined ? params[5] : opp.secondary_sales_owners;
      opp.delivery_team = params[6] !== undefined ? params[6] : opp.delivery_team;
      opp.project_type = params[7] !== undefined ? params[7] : opp.project_type;
      opp.source_id = params[8] !== undefined ? params[8] : opp.source_id;
      opp.deal_stage_id = params[9] !== undefined ? params[9] : opp.deal_stage_id;
      opp.priority_id = params[10] !== undefined ? params[10] : opp.priority_id;
      opp.estimated_deal_value = params[11] !== undefined ? params[11] : opp.estimated_deal_value;
      opp.contract_tenure = params[12] !== undefined ? params[12] : opp.contract_tenure;
      opp.win_probability = params[13] !== undefined ? params[13] : opp.win_probability;
      opp.complexity_id = params[14] !== undefined ? params[14] : opp.complexity_id;
      opp.received_date = params[15] || opp.received_date;
      opp.target_submission_date = params[16] || opp.target_submission_date;
      opp.internal_review_date = params[17] !== undefined ? params[17] : opp.internal_review_date;
      opp.presales_owner = params[18] || opp.presales_owner;
      opp.supporting_presales_members = params[19] !== undefined ? params[19] : opp.supporting_presales_members;
      opp.summary = params[20] !== undefined ? params[20] : opp.summary;
      opp.risks = params[21] !== undefined ? params[21] : opp.risks;
      opp.special_instructions = params[22] !== undefined ? params[22] : opp.special_instructions;
      opp.tcv_amount = params[23] !== undefined ? params[23] : opp.tcv_amount;
      opp.tcv_currency = params[24] || opp.tcv_currency || 'USD';
      if (params[25] !== null && params[25] !== undefined) {
        opp.finance_status = params[25];
      }
      if (params[26] !== null && params[26] !== undefined) {
        opp.attachments = params[26];
      }

      const oppType = store.dropdown_options.find(d => d.id === opp.opportunity_type_id);
      if (oppType) {
        opp.opportunity_type_name = oppType.option_name;
        opp.opportunity_type_color = oppType.color;
      }
      const delType = store.dropdown_options.find(d => d.id === opp.deliverable_type_id);
      if (delType) {
        opp.deliverable_type_name = delType.option_name;
        opp.deliverable_type_color = delType.color;
      }
      const stage = store.dropdown_options.find(d => d.id === opp.deal_stage_id);
      if (stage) {
        opp.deal_stage_name = stage.option_name;
        opp.deal_stage_color = stage.color;
      }
      const prio = store.dropdown_options.find(d => d.id === opp.priority_id);
      if (prio) {
        opp.priority_name = prio.option_name;
        opp.priority_color = prio.color;
      }
      const comp = store.dropdown_options.find(d => d.id === opp.complexity_id);
      if (comp) {
        opp.complexity_name = comp.option_name;
        opp.complexity_color = comp.color;
      }
      return { rows: [opp], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // UPDATE work_items
  if (lowerSql.startsWith('update work_items') || lowerSql.includes('update work_items')) {
    if (lowerSql.includes('having sum(hours_logged) > 0')) {
      const inProg = store.dropdown_options.find(d => d.category === 'task_status' && d.option_name === 'In Progress');
      if (inProg) {
        const loggedWorkItemIds = new Set(
          store.efforts
            .filter(e => parseFloat(e.hours_logged) > 0)
            .map(e => parseInt(e.work_item_id, 10))
        );
        store.work_items.forEach(w => {
          if (loggedWorkItemIds.has(w.id) && w.status_name === 'Not Started') {
            w.status_id = inProg.id;
            w.status_name = inProg.option_name;
            w.status_color = inProg.color;
          }
        });
      }
      return { rows: [], rowCount: 0 };
    }
    if (params.length >= 2) {
      const statusId = parseInt(params[0], 10);
      const itemId = parseInt(params[1], 10);
      const item = store.work_items.find(w => w.id === itemId);
      if (item) {
        item.status_id = statusId;
        const opt = store.dropdown_options.find(d => d.id === statusId);
        if (opt) {
          item.status_name = opt.option_name;
          item.status_color = opt.color;
        }
        return { rows: [item], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // SELECT ... FROM dropdown_options
  if (lowerSql.includes('from dropdown_options')) {
    let list = store.dropdown_options;
    if (lowerSql.includes('where id = $1')) {
      const id = parseInt(params[0], 10);
      list = list.filter(d => d.id === id);
      return { rows: list, rowCount: list.length };
    }
    if (lowerSql.includes("category = 'task_status' and option_name = 'in progress'")) {
      list = list.filter(d => d.category === 'task_status' && d.option_name.toLowerCase() === 'in progress');
      return { rows: list, rowCount: list.length };
    }
    if (lowerSql.includes("category = 'task_status' and option_name = 'completed'")) {
      list = list.filter(d => d.category === 'task_status' && d.option_name.toLowerCase() === 'completed');
      return { rows: list, rowCount: list.length };
    }
    if (lowerSql.includes("category = 'task_status' and option_name = 'not started'")) {
      list = list.filter(d => d.category === 'task_status' && d.option_name.toLowerCase() === 'not started');
      return { rows: list, rowCount: list.length };
    }
    if (lowerSql.includes('active = true')) {
      list = list.filter(d => d.active !== false);
    }
    return { rows: list, rowCount: list.length };
  }

  // SELECT ... FROM resource_profiles
  if (lowerSql.includes('from resource_profiles')) {
    return { rows: store.resource_profiles, rowCount: store.resource_profiles.length };
  }

  // SELECT ... FROM task_templates
  if (lowerSql.includes('from task_templates')) {
    return { rows: store.task_templates, rowCount: store.task_templates.length };
  }

  // SELECT id FROM opportunities WHERE company = $1 AND opportunity_name = $2 AND id != $3
  if (lowerSql.includes('where company = $1 and opportunity_name = $2 and id != $3')) {
    const comp = (params[0] || '').toLowerCase().trim();
    const name = (params[1] || '').toLowerCase().trim();
    const excludeId = parseInt(params[2], 10);
    const matches = store.opportunities.filter(o =>
      (o.company || '').toLowerCase().trim() === comp &&
      (o.opportunity_name || '').toLowerCase().trim() === name &&
      o.id !== excludeId
    );
    return { rows: matches, rowCount: matches.length };
  }

  // SELECT id FROM opportunities WHERE company = $1 AND opportunity_name = $2
  if (lowerSql.includes('where company = $1 and opportunity_name = $2')) {
    const comp = (params[0] || '').toLowerCase().trim();
    const name = (params[1] || '').toLowerCase().trim();
    const matches = store.opportunities.filter(o =>
      (o.company || '').toLowerCase().trim() === comp &&
      (o.opportunity_name || '').toLowerCase().trim() === name
    );
    return { rows: matches, rowCount: matches.length };
  }

  // SELECT ... FROM opportunities WHERE o.id = $1 or WHERE id = $1
  if (lowerSql.includes('from opportunities') && (lowerSql.includes('where o.id = $1') || lowerSql.includes('where id = $1') || lowerSql.includes('where o.id = '))) {
    const id = parseInt(params[0], 10);
    const opp = store.opportunities.find(o => o.id === id);
    if (!opp) return { rows: [], rowCount: 0 };
    const ds = opp.deal_stage_id ? store.dropdown_options.find(d => d.id === opp.deal_stage_id) : null;
    return {
      rows: [{
        ...opp,
        stage_name: ds ? ds.option_name : opp.deal_stage_name || '',
        deal_stage_name: ds ? ds.option_name : opp.deal_stage_name || ''
      }],
      rowCount: 1
    };
  }

  // SELECT ... FROM opportunities
  if (lowerSql.includes('from opportunities')) {
    return { rows: store.opportunities, rowCount: store.opportunities.length };
  }

  // SELECT ... FROM work_items WHERE wi.id = $1 or WHERE w.id = $1 or WHERE id = $1
  if (lowerSql.includes('from work_items') && (lowerSql.includes('where wi.id = $1') || lowerSql.includes('where w.id = $1') || lowerSql.includes('where id = $1'))) {
    const id = parseInt(params[0], 10);
    const item = store.work_items.find(w => w.id === id);
    if (!item) return { rows: [], rowCount: 0 };
    const opt = store.dropdown_options.find(d => d.id === item.status_id);
    const opp = store.opportunities.find(o => o.id === item.opportunity_id);
    const ds = opp ? store.dropdown_options.find(d => d.id === opp.deal_stage_id) : null;
    return {
      rows: [{
        ...item,
        status_name: opt ? opt.option_name : item.status_name || 'Not Started',
        deal_stage_name: ds ? ds.option_name : ''
      }],
      rowCount: 1
    };
  }

  // SELECT ... FROM work_items
  if (lowerSql.includes('from work_items')) {
    return { rows: store.work_items, rowCount: store.work_items.length };
  }

  // SELECT ... FROM automation_settings
  if (lowerSql.includes('from automation_settings')) {
    return { rows: [store.automation_settings], rowCount: 1 };
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
