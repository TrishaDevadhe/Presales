import { isUserAssociatedWithOpp, getUserRoleInOpp } from './userAssociation.js';

/**
 * Checks if an opportunity has reached an end stage.
 * End stages: 'Won', 'Lost', 'Dropped' (case-insensitive).
 */
export function isOpportunityInEndStage(opp) {
  if (!opp) return false;
  const stage = String(opp.deal_stage_name || opp.deal_stage || opp.stage || opp.status || '').trim().toLowerCase();
  return (
    stage === 'won' ||
    stage === 'lost' ||
    stage.startsWith('drop') ||
    stage.startsWith('submit') ||
    stage.includes('submitted') ||
    stage === 'completed' ||
    stage === 'closed'
  );
}

/**
 * Computes deadline alert info for an opportunity.
 * Returns null if opportunity is in an end stage, has no target date, or is more than 3 days from due date.
 */
export function getOpportunityDeadlineInfo(opp, refDate = new Date()) {
  if (!opp || !opp.target_submission_date) return null;
  if (isOpportunityInEndStage(opp)) return null;

  try {
    const rawTarget = String(opp.target_submission_date).split('T')[0];
    const parts = rawTarget.split('-');
    if (parts.length !== 3) return null;

    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10) - 1;
    const targetDay = parseInt(parts[2], 10);

    const targetDate = new Date(targetYear, targetMonth, targetDay);
    const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const stageName = opp.deal_stage_name || opp.deal_stage || 'In Progress';

    // Case 1: Crossed due date (Overdue)
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        type: 'overdue',
        severity: 'danger',
        diffDays,
        daysOverdue,
        targetDateStr: rawTarget,
        badgeText: `⚠️ Overdue (${daysOverdue}d)`,
        shortLabel: daysOverdue === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOverdue} days`,
        title: `Opportunity Overdue (${daysOverdue} days)`,
        message: daysOverdue === 1
          ? `Crossed target submission deadline yesterday (${rawTarget}). Stage: ${stageName}.`
          : `Crossed target submission deadline by ${daysOverdue} days (was due on ${rawTarget}). Stage: ${stageName}.`
      };
    }

    // Case 2: About to cross due date (Approaching deadline: today, or within 3 days)
    if (diffDays <= 3) {
      let shortLabel = '';
      let badgeText = '';
      let message = '';
      let title = '';

      if (diffDays === 0) {
        shortLabel = 'Due Today';
        badgeText = '🚨 Due Today';
        title = 'Submission Deadline Today';
        message = `Target submission deadline is TODAY (${rawTarget})! Stage: ${stageName}.`;
      } else if (diffDays === 1) {
        shortLabel = 'Due Tomorrow';
        badgeText = '⏳ Due Tomorrow';
        title = 'Submission Deadline Tomorrow';
        message = `Target submission deadline is TOMORROW (${rawTarget}). Stage: ${stageName}.`;
      } else {
        shortLabel = `Due in ${diffDays} days`;
        badgeText = `⏳ Due in ${diffDays}d`;
        title = `Due in ${diffDays} days`;
        message = `Approaching submission deadline in ${diffDays} days (${rawTarget}). Stage: ${stageName}.`;
      }

      return {
        type: 'approaching',
        severity: diffDays === 0 ? 'danger' : 'warning',
        diffDays,
        daysOverdue: 0,
        targetDateStr: rawTarget,
        badgeText,
        shortLabel,
        title,
        message
      };
    }

    return null;
  } catch (err) {
    console.error('Error computing deadline info:', err);
    return null;
  }
}

/**
 * Filters all opportunities and returns alerts strictly for opportunities
 * directly related to the specified user.
 */
export function getUserOpportunityAlerts(opportunities = [], username, userRole = null) {
  if (!Array.isArray(opportunities) || !username) {
    return { overdue: [], approaching: [], allAlerts: [], totalCount: 0 };
  }

  // Filter only to opportunities directly related to this user
  const relatedOpps = opportunities.filter(opp => isUserAssociatedWithOpp(opp, username));

  const overdue = [];
  const approaching = [];

  for (const opp of relatedOpps) {
    const alertInfo = getOpportunityDeadlineInfo(opp);
    if (!alertInfo) continue;

    const userRoleText = getUserRoleInOpp(opp, username);

    const item = {
      ...alertInfo,
      opportunityId: opp.id,
      opportunityName: opp.opportunity_name,
      company: opp.company,
      dealStageName: opp.deal_stage_name || opp.deal_stage || 'In Progress',
      primarySalesOwner: opp.primary_sales_owner,
      presalesOwner: opp.presales_owner,
      deliveryTeam: opp.delivery_team,
      userRoleInOpp: userRoleText,
      rawOpp: opp
    };

    if (alertInfo.type === 'overdue') {
      overdue.push(item);
    } else {
      approaching.push(item);
    }
  }

  // Sort overdue by most days overdue (descending)
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Sort approaching by closest due date (ascending diffDays: 0, 1, 2, 3)
  approaching.sort((a, b) => a.diffDays - b.diffDays);

  const allAlerts = [...overdue, ...approaching];

  return {
    overdue,
    approaching,
    allAlerts,
    totalCount: allAlerts.length,
    overdueCount: overdue.length,
    approachingCount: approaching.length
  };
}
