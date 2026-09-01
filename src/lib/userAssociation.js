/**
 * Utility functions to determine user association for role-based data filtering.
 * Admin users see all records; non-admin users only see items they are associated with.
 */

export function isUserAssociatedWithOpp(opp, username) {
  if (!opp || !username) return false;
  const user = username.toLowerCase().trim();

  const primarySales = (opp.primary_sales_owner || '').toLowerCase().trim();
  const secondarySales = (opp.secondary_sales_owners || '').toLowerCase().trim();
  const presalesOwner = (opp.presales_owner || '').toLowerCase().trim();
  const supporting = (opp.supporting_presales_members || '').toLowerCase().trim();

  return (
    primarySales === user ||
    secondarySales.includes(user) ||
    presalesOwner === user ||
    supporting.includes(user)
  );
}

export function isUserAssociatedWithTask(task, username, opportunitiesList = []) {
  if (!task || !username) return false;
  const user = username.toLowerCase().trim();

  const assigned = (task.assigned_to || '').toLowerCase().trim();
  const reviewer = (task.reviewer || '').toLowerCase().trim();
  const collaborators = (task.collaborators || '').toLowerCase().trim();

  if (assigned === user || reviewer === user || collaborators.includes(user)) {
    return true;
  }

  if (task.opportunity_id && Array.isArray(opportunitiesList) && opportunitiesList.length > 0) {
    const opp = opportunitiesList.find(o => String(o.id) === String(task.opportunity_id));
    if (opp && isUserAssociatedWithOpp(opp, username)) {
      return true;
    }
  }

  return false;
}

export function isUserAssociatedWithEffort(log, username, tasksList = [], opportunitiesList = []) {
  if (!log || !username) return false;
  const user = username.toLowerCase().trim();

  const person = (log.person || '').toLowerCase().trim();
  if (person === user) return true;

  if (log.work_item_id && Array.isArray(tasksList) && tasksList.length > 0) {
    const task = tasksList.find(t => String(t.id) === String(log.work_item_id));
    if (task && isUserAssociatedWithTask(task, username, opportunitiesList)) {
      return true;
    }
  }

  return false;
}
