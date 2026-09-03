import { query } from '@/lib/db';
import { initDb } from '@/lib/initDb';
import { logActivity, logAccess } from '@/lib/auditLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    try {
      await initDb();
    } catch (e) {
      console.warn('initDb warning in /api/auditlogs:', e.message);
    }
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'activity';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userFilter = searchParams.get('user');
    const entityType = searchParams.get('entity_type');
    const actionType = searchParams.get('action_type');
    const eventType = searchParams.get('event_type');
    const entityId = searchParams.get('entity_id');

    // Security Gating Checks (Part A)
    const reqUserRole = req.headers.get('x-user-role') || searchParams.get('role') || 'Admin';
    const reqRealUser = req.headers.get('x-real-user') || searchParams.get('currentUser') || '';

    // Allow embedded history for specific record to non-admins
    const isRecordHistoryRequest = Boolean(entityType && entityId);
    
    // Allow user to see their own sign-in logs
    const isSelfAccessLogRequest = Boolean(tab === 'access' && userFilter && userFilter.toLowerCase() === reqRealUser.toLowerCase());

    const isAdmin = reqUserRole.toLowerCase() === 'admin';


    if (tab === 'access') {
      let sql = `SELECT * FROM access_logs WHERE 1=1`;
      const params = [];

      if (startDate) {
        params.push(startDate);
        sql += ` AND timestamp >= $${params.length}`;
      }
      if (endDate) {
        params.push(`${endDate} 23:59:59`);
        sql += ` AND timestamp <= $${params.length}`;
      }
      if (userFilter) {
        params.push(userFilter);
        sql += ` AND LOWER(username) = LOWER($${params.length})`;
      }
      if (eventType) {
        params.push(eventType);
        sql += ` AND event_type = $${params.length}`;
      }

      sql += ` ORDER BY timestamp DESC LIMIT 500`;

      const result = await query(sql, params);
      return NextResponse.json(result.rows || []);
    } else {
      // Activity Log
      let sql = `SELECT * FROM activity_logs WHERE 1=1`;
      const params = [];

      if (startDate) {
        params.push(startDate);
        sql += ` AND timestamp >= $${params.length}`;
      }
      if (endDate) {
        params.push(`${endDate} 23:59:59`);
        sql += ` AND timestamp <= $${params.length}`;
      }
      if (userFilter) {
        params.push(userFilter);
        sql += ` AND (LOWER(real_user_id) = LOWER($${params.length}) OR LOWER(acting_as_user_id) = LOWER($${params.length}))`;
      }
      if (entityType) {
        params.push(entityType);
        sql += ` AND entity_type = $${params.length}`;
      }
      if (entityId) {
        params.push(String(entityId));
        sql += ` AND entity_id = $${params.length}`;
      }
      if (actionType) {
        params.push(actionType);
        sql += ` AND action_type = $${params.length}`;
      }

      sql += ` ORDER BY timestamp DESC LIMIT 500`;

      const result = await query(sql, params);
      return NextResponse.json(result.rows || []);
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, ...payload } = body;

    if (type === 'access') {
      await logAccess(payload);
    } else {
      await logActivity(payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording audit log via API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
