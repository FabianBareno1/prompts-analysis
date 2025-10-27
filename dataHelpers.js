// Data helper functions for the audit dashboard
// All helpers here are stateless and data-focused

/**
 * Checks if a column exists in the data (case-insensitive).
 * @param {Array<Object>} data - Parsed CSV data.
 * @param {string} col - Column name to check.
 * @returns {boolean}
 */
export function hasColumn(data, col) {
  return data.length > 0 && Object.keys(data[0]).some(k => k.trim().toLowerCase() === col.trim().toLowerCase());
}

/**
 * Returns unique values for a column in the data.
 * @param {Array<Object>} data - Parsed CSV data.
 * @param {string} col - Column name.
 * @returns {Array<string>}
 */
export function uniqueColumnValues(data, col) {
  return Array.from(new Set(data.map(row => row[col]).filter(Boolean)));
}
