const test = require('node:test');
const assert = require('node:assert');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/presales_db'
});

const API_BASE = 'http://localhost:3000/api';

test('Closed-loop Opportunity Validations', async (t) => {
  // 1. Get Dropdown Options
  const dsRes = await pool.query("SELECT id, option_name FROM dropdown_options WHERE category = 'deal_stage'");
  const droppedId = dsRes.rows.find(r => r.option_name.trim() === 'Dropped' || r.option_name === 'Lost')?.id;
  const activeId = dsRes.rows.find(r => r.option_name === 'Discovery')?.id;
  
  const wtRes = await pool.query("SELECT id FROM dropdown_options WHERE category = 'work_category' LIMIT 1");
  const workCatId = wtRes.rows[0].id;
  
  const stRes = await pool.query("SELECT id FROM dropdown_options WHERE category = 'task_status' AND option_name = 'Not Started'");
  const statusId = stRes.rows[0].id;

  assert.ok(droppedId, 'Dropped deal stage should exist');
  assert.ok(activeId, 'Active deal stage should exist');

  // 2. Create a test opportunity (Active)
  const oppRes = await pool.query(`
    INSERT INTO opportunities (opportunity_name, company, deal_stage_id, primary_sales_owner, presales_owner, received_date, target_submission_date)
    VALUES ('Test Opp', 'Test Company', $1, 'admin', 'admin', '2023-01-01', '2023-01-01')
    RETURNING id
  `, [activeId]);
  const oppId = oppRes.rows[0].id;

  // 3. Create a work item for the active opportunity via API
  const workItemRes = await fetch(`${API_BASE}/workitems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      opportunity_id: oppId,
      work_category_id: workCatId,
      title: 'Test Task',
      assigned_to: 'testuser',
      start_date: '2023-10-01',
      due_date: '2023-10-05',
      status_id: statusId
    })
  });
  
  assert.strictEqual(workItemRes.status, 201, 'Should create work item for active opportunity');
  const workItem = await workItemRes.json();
  const workItemId = workItem.id;

  // 4. Create an effort log for the active opportunity via API
  const effortRes = await fetch(`${API_BASE}/efforts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      work_item_id: workItemId,
      person: 'testuser',
      date: '2023-10-02',
      hours_logged: 2
    })
  });
  assert.strictEqual(effortRes.status, 201, 'Should create effort log for active opportunity');
  const effortLog = await effortRes.json();
  const effortLogId = effortLog.id;

  // 5. Change opportunity status to Dropped
  await pool.query('UPDATE opportunities SET deal_stage_id = $1 WHERE id = $2', [droppedId, oppId]);

  // 6. Try creating a work item for dropped opportunity
  const blockedWorkItemRes = await fetch(`${API_BASE}/workitems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      opportunity_id: oppId,
      work_category_id: workCatId,
      title: 'Blocked Task',
      assigned_to: 'testuser',
      start_date: '2023-10-01',
      due_date: '2023-10-05',
      status_id: statusId
    })
  });
  assert.strictEqual(blockedWorkItemRes.status, 403, 'Should NOT create work item for dropped opportunity');
  const blockedData = await blockedWorkItemRes.json();
  assert.ok(blockedData.error.includes('Dropped/Lost'), 'Error message should mention Dropped/Lost');

  // 7. Try updating existing work item
  const blockedUpdateRes = await fetch(`${API_BASE}/workitems/${workItemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...workItem,
      title: 'Updated Title'
    })
  });
  assert.strictEqual(blockedUpdateRes.status, 403, 'Should NOT update work item for dropped opportunity');

  // 8. Try logging effort on dropped opportunity
  const blockedEffortRes = await fetch(`${API_BASE}/efforts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      work_item_id: workItemId,
      person: 'testuser',
      date: '2023-10-03',
      hours_logged: 1
    })
  });
  assert.strictEqual(blockedEffortRes.status, 403, 'Should NOT log effort for dropped opportunity');

  // 9. Try deleting effort log on dropped opportunity
  const blockedEffortDelRes = await fetch(`${API_BASE}/efforts/${effortLogId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(blockedEffortDelRes.status, 403, 'Should NOT delete effort for dropped opportunity');

  // 10. Reopen opportunity
  await pool.query('UPDATE opportunities SET deal_stage_id = $1 WHERE id = $2', [activeId, oppId]);

  // 11. Try updating work item after reopening
  const reopenedUpdateRes = await fetch(`${API_BASE}/workitems/${workItemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...workItem,
      title: 'Reopened Title'
    })
  });
  assert.strictEqual(reopenedUpdateRes.status, 200, 'Should update work item after opportunity reopened');

  // Clean up
  await pool.query('DELETE FROM effort_logs WHERE work_item_id = $1', [workItemId]);
  await pool.query('DELETE FROM work_items WHERE opportunity_id = $1', [oppId]);
  await pool.query('DELETE FROM opportunities WHERE id = $1', [oppId]);
  
  await pool.end();
});
