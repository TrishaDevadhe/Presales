import { Pool } from 'pg';
import { initDb } from './initDb';

let pool;
let initPromise = null;
let isInitializing = false;

if (!global._postgresPool) {
  global._postgresPool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'presales_db',
  });
}
pool = global._postgresPool;

async function ensureDbInitialized() {
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    isInitializing = true;
    try {
      await initDb();
    } catch (err) {
      console.error('Failed to initialize database:', err);
      initPromise = null; // Let next query try again
      throw err;
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

export default pool;

export async function query(text, params) {
  // If we are currently running the database initialization script,
  // bypass ensureDbInitialized() to prevent recursive deadlocks.
  if (!isInitializing) {
    await ensureDbInitialized();
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err) {
    console.error('Database query error:', err, { text, params });
    throw err;
  }
}
