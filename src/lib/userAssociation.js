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
  const deliveryTeam = (opp.delivery_team || '').toLowerCase().trim();

  return (
    primarySales === user ||
    secondarySales.includes(user) ||
    presalesOwner === user ||
    supporting.includes(user) ||
    deliveryTeam === user ||
    deliveryTeam.includes(user)
  );
}

export function getUserRoleInOpp(opp, username) {
  if (!opp || !username) return 'Team Member';
  const user = username.toLowerCase().trim();

  const presalesOwner = (opp.presales_owner || '').toLowerCase().trim();
  if (presalesOwner === user) return 'Presales Lead';

  const primarySales = (opp.primary_sales_owner || '').toLowerCase().trim();
  if (primarySales === user) return 'Primary Sales Owner';

  const deliveryTeam = (opp.delivery_team || '').toLowerCase().trim();
  if (deliveryTeam === user || deliveryTeam.includes(user)) return 'Delivery Team';

  const secondarySales = (opp.secondary_sales_owners || '').toLowerCase().trim();
  if (secondarySales.includes(user)) return 'Sales Owner';

  const supporting = (opp.supporting_presales_members || '').toLowerCase().trim();
  if (supporting.includes(user)) return 'Supporting Presales';

  return 'Associated Member';
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

export function isFinanceUser(username, userRole, resourceProfiles = []) {
  if (!username) return false;
  const user = username.toLowerCase().trim();
  if (userRole === 'Finance Team' || user === 'finance_team') return true;
  if (Array.isArray(resourceProfiles) && resourceProfiles.length > 0) {
    const prof = resourceProfiles.find(p => p.username && p.username.toLowerCase().trim() === user);
    if (prof && prof.department_name && prof.department_name.toLowerCase().includes('finance')) {
      return true;
    }
  }
  return false;
}

