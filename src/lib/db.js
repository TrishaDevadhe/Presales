import { Pool } from 'pg';
import { initDb } from './initDb.js';

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
            UPDATE resource_profiles 
            SET password = SPLIT_PART(username, '_', 1) || '123' 
            WHERE password IS NULL;
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
