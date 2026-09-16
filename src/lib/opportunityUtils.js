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
