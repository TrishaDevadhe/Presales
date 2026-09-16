/**
 * Utility functions for Opportunities
 */

/**
 * Checks if an opportunity is considered closed (Dropped or Lost).
 * Case-insensitive check.
 * 
 * @param {string} dealStageName 
 * @returns {boolean} True if the opportunity is closed.
 */
export function isOpportunityClosed(dealStageName) {
  if (!dealStageName) return false;
  const stage = dealStageName.toLowerCase().trim();
  return stage === 'lost' || stage === 'dropped';
}

/**
 * Checks if an opportunity is locked from having work items created or assigned to it.
 * Opportunities that are Won, Lost, or Dropped cannot have work items created.
 * 
 * @param {string} dealStageName 
 * @returns {boolean} True if the opportunity is Won, Lost, or Dropped.
 */
export function isOpportunityLockedForWork(dealStageName) {
  if (!dealStageName) return false;
  const stage = dealStageName.toLowerCase().trim();
  return stage === 'won' || stage === 'lost' || stage === 'dropped';
}

