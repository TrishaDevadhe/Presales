import { query } from './db.js';

/**
 * Log an Activity Log event (data change, status change, creation, deletion, config edit)
 */
export async function logActivity({
  real_user_id,
  acting_as_user_id = null,
  entity_type,
  entity_id = null,
  entity_title = '',
  action_type,
  field_changed = null,
  value_before = null,
  value_after = null,
  summary_text = ''
}) {
  try {
    const actor = real_user_id || 'admin';
    const actingAs = (acting_as_user_id && acting_as_user_id.toLowerCase() !== actor.toLowerCase()) ? acting_as_user_id : null;

    await query(
      `INSERT INTO activity_logs (
        real_user_id, acting_as_user_id, entity_type, entity_id, entity_title,
        action_type, field_changed, value_before, value_after, summary_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        actor,
        actingAs,
        entity_type,
        entity_id ? String(entity_id) : null,
        entity_title || '',
        action_type,
        field_changed || null,
        value_before !== null && value_before !== undefined ? String(value_before) : null,
        value_after !== null && value_after !== undefined ? String(value_after) : null,
        summary_text || ''
      ]
    );
  } catch (err) {
    console.error('Failed to write activity_log entry:', err);
  }
}

/**
 * Log an Access Log event (Login Success, Login Failure, Logout, Session Expired)
 */
export async function logAccess({
  username,
  event_type,
  ip_address = null,
  user_agent = null,
  failure_reason = null
}) {
  try {
    await query(
      `INSERT INTO access_logs (
        username, event_type, ip_address, user_agent, failure_reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        username || 'Unknown',
        event_type,
        ip_address || '127.0.0.1',
        user_agent || 'Client Application',
        failure_reason || null
      ]
    );
  } catch (err) {
    console.error('Failed to write access_log entry:', err);
  }
}
