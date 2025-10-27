// UI helper functions for the audit dashboard
// All helpers here are UI-specific and stateless

/**
 * Sets the display style for a group of elements by id.
 * @param {string[]} ids - Array of element ids.
 * @param {string} display - CSS display value.
 */
export function setDisplayByIds(ids, display) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  });
}

/**
 * Hides all chart type selectors.
 * @param {Object} selectors - Object of chart type selectors.
 */
export function hideAllChartTypeSelectors(selectors) {
  Object.values(selectors).forEach(sel => {
    if (sel) sel.style.display = 'none';
  });
}
