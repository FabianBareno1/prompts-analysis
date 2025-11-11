import { renderCodeCoverageChart } from './features/codeCoverage.js';
import { renderCodeCoverageSummaryTable } from './features/codeCoverageTable.js';
// Flag to prevent duplicate rendering of the code coverage summary table
let codeCoverageTableDrawn = false;
import { renderTestSmellsChart } from './features/testSmells.js';
import { renderSecurityPostureChart } from './features/securityPosture.js';
import { renderSemanticBugDetectionChart } from './features/semanticBugDetection.js';
import { renderRegressionRiskSection } from './features/regressionRisk.js';
import { loadSecurityDatatable } from './uiSecurityFunctions.js';

// Show/hide summary and detail
document.addEventListener('DOMContentLoaded', () => {
  // Render summary table on load if code coverage is active
  const summaryBtn = document.getElementById('show-summary-btn');
  const detailBtn = document.getElementById('show-detail-btn');
  const summaryContainer = document.getElementById('summary-md-container');
  const chartSvg = document.getElementById('chart');
  if (summaryBtn && detailBtn && summaryContainer && chartSvg) {
    summaryBtn.onclick = () => {
      summaryContainer.style.display = 'block';
      chartSvg.style.display = 'none';
      document.getElementById('summary-table-container').style.display = 'block';
    };
    detailBtn.onclick = () => {
      summaryContainer.style.display = 'none';
      chartSvg.style.display = 'block';
      document.getElementById('summary-table-container').style.display = 'block';
    };
    // By default, show the detail (chart)
    summaryContainer.style.display = 'none';
    chartSvg.style.display = 'block';
    document.getElementById('summary-table-container').style.display = 'block';
  }
});



// --- State and DOM references ---
export const chart = d3.select('#chart');
export const dependenciesDatatable = document.getElementById('dependencies-datatable');
export const summaryMd = document.getElementById('summary-md');
export const errorMessage = document.getElementById('error-message');
export const loader = document.getElementById('loader');

export const sectionData = {
  'code-coverage': null,
  'test-smells': null,
  'security-posture': null,
  'regression-risk': null,
  'semantic-bug-detection': null
};

/**
 * Shows an error message in the UI and clears the chart.
 * @param {string} msg - Error message to display.
 */
export function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.hidden = false;
  chart.selectAll('*').remove();
  loader.style.display = 'none';
  console.error(msg);
}

/**
 * Clears any error message and hides the loader and CSV summary.
 */
export function clearError() {
  errorMessage.hidden = true;
  loader.style.display = 'none';
}

/**
 * Show or hide the security datatable area depending on the active section.
 *
 * Behavior:
 * - When `type` is 'security-posture' this will load the default
 *   CSV file for the security posture datatable and show the related
 *   datatable elements in the UI.
 * - For any other `type` the datatable container is hidden.
 *
 * @param {string} type - Active section identifier (e.g. 'security-posture').
 */
export function showSecurityDatatable(type) {
  let csvPath = '';
  const datatableContainer = document.getElementById('datatable-container');
  if (type === 'security-posture') {
    csvPath = 'files/details/SecurityPosture.csv';
    loadSecurityDatatable(csvPath);
    dependenciesDatatable.style.display = csvPath ? 'block' : 'none';
    if (datatableContainer) datatableContainer.style.display = csvPath ? 'block' : 'none';
  } else {
    if (datatableContainer) datatableContainer.style.display = 'none';
  }
}

/**
 * Updates the markdown summary shown above the chart according to the type.
 * @param {string} type - Active section.
 */
export function updateSummaryMarkdown(type) {
  if (!summaryMd) return;
  let mdPath = '';
  if (type === 'code-coverage') mdPath = 'files/summaries/CodeCoverageSummary.md';
  else if (type === 'test-smells') mdPath = 'files/summaries/TestSmellsSummary.md';
  else if (type === 'security-posture') mdPath = 'files/summaries/SecurityPostureSummary.md';
  else if (type === 'semantic-bug-detection') mdPath = 'files/summaries/SemanticBugDetectionSummary.md';
  // Do not show markdown for regression-risk
  summaryMd.setAttribute('src', mdPath);
  if (type === 'regression-risk') {
    summaryMd.style.display = 'none';
    const summaryContainer = document.getElementById('summary-md-container');
    if (summaryContainer) summaryContainer.style.display = 'none';
  } else {
    summaryMd.style.display = mdPath ? 'block' : 'none';
    const summaryContainer = document.getElementById('summary-md-container');
    if (summaryContainer) summaryContainer.style.display = mdPath ? 'block' : 'none';
  }
}

/**
 * Renders the main section (chart and related UI) based on the data and section type.
 * @param {Array<Object>} data - Parsed CSV data for the section.
 * @param {string} type - Active section identifier (e.g., 'code-coverage', 'security-posture', etc).
 * @param {string} chartType - Chart type to display (optional, depends on section).
  summaryTableDrawn = true;
 */
export function renderSection(data, type, chartType) {
  // Show/hide summary table and title for code coverage
  const summaryTable = document.getElementById('summary-table-container');
  let coverageTitle = document.getElementById('code-coverage-title');
  if (type === 'code-coverage') {
    if (!codeCoverageTableDrawn) {
      codeCoverageTableDrawn = true;
      renderCodeCoverageSummaryTable();
    }
    if (summaryTable) summaryTable.style.display = 'block';
    // Add title if not present
    if (!coverageTitle) {
      coverageTitle = document.createElement('h2');
      coverageTitle.id = 'code-coverage-title';
      coverageTitle.textContent = 'Code Coverage';
      coverageTitle.style = 'margin-top:1.5rem;margin-bottom:1rem;color:#fff;font-size:2rem;text-align:left;';
      summaryTable.parentNode.insertBefore(coverageTitle, summaryTable);
    } else {
      coverageTitle.style.display = 'block';
    }
  } else {
    // Reset flag when leaving code coverage section
    codeCoverageTableDrawn = false;
    if (summaryTable) summaryTable.style.display = 'none';
    if (coverageTitle) coverageTitle.style.display = 'none';
  }
  const legendDiv = document.getElementById('legend');
  if (legendDiv && legendDiv.parentNode) legendDiv.parentNode.removeChild(legendDiv);
  showSecurityDatatable(type);
  switch (type) {
    case 'code-coverage':
      renderCodeCoverageChart(data, chartType);
      break;
    case 'semantic-bug-detection':
      renderSemanticBugDetectionChart(data, chartType);
      break;
    case 'test-smells':
      renderTestSmellsChart(data, chartType);
      break;
    case 'security-posture':
      renderSecurityPostureChart(data, chartType);
      break;
    case 'regression-risk':
      renderRegressionRiskSection(data, chartType);
      break;
    default:
      showError('Unknown section type.');
      break;
  }
}

/**
 * Attempts to load the corresponding CSV from the server for the given section.
 * @param {string} type - Active section.
 * @param {string} chartType - Chart type to display.
 */
export async function tryLoadServerCSV(type, chartType) {
  let csvPath;
  if (type === 'code-coverage') csvPath = 'files/details/CodeCoverage.csv';
  else if (type === 'test-smells') csvPath = 'files/details/TestSmells.csv';
  else if (type === 'security-posture') csvPath = 'files/details/SecurityPosture.csv';
  else if (type === 'regression-risk') csvPath = 'files/details/RegressionRisk.csv';
  else if (type === 'semantic-bug-detection') csvPath = 'files/details/SEMANTIC_BUG_REPORT.csv';
  try {
    // Load CSV ignoring empty lines and comments
    const data = await d3.csv(csvPath, row => {
      // Ignore empty rows or comment rows
      if (!row || Object.values(row).every(v => v === '' || v == null)) return null;
      if (Object.values(row)[0] && Object.values(row)[0].startsWith('//')) return null;
      return row;
    });
    if (!data || data.filter(Boolean).length === 0) throw new Error('CSV empty or invalid');
    const filteredData = data.filter(Boolean);
    sectionData[type] = filteredData;
    if (typeof updateChartTypeSelectorVisibility === 'function') updateChartTypeSelectorVisibility();
    if (typeof showAdvancedOptionsForSection === 'function') showAdvancedOptionsForSection(type);
    const activeBtn = document.querySelector('nav button.active');
    if (activeBtn && activeBtn.id === type) {
      let chartTypeToUse = chartType;
      const selector = window.chartTypeSelectors ? window.chartTypeSelectors[type] : null;
      if (type === 'regression-risk') {
        const uniqueCategories = Array.from(new Set(filteredData.map(row => row.Category))).filter(Boolean);
        if (uniqueCategories.length > 1) {
          chartTypeToUse = 'category';
          if (selector) selector.value = 'category';
        }
      }
      if (selector && (!selector.value || selector.value === '')) {
        if (selector.options.length > 0) {
          selector.selectedIndex = 0;
          chartTypeToUse = selector.options[0].value;
        }
      } else if (selector && selector.value) {
        chartTypeToUse = selector.value;
      }
      // Recalculating chart size
      setTimeout(() => {
        renderSection(filteredData, type, chartTypeToUse || (type === 'regression-risk' ? 'severity' : 'module'));
      }, 0);
    }
  } catch (err) {
    sectionData[type] = null;
    showError('Could not load CSV file from server.');
    if (typeof updateChartTypeSelectorVisibility === 'function') updateChartTypeSelectorVisibility();
    if (typeof showAdvancedOptionsForSection === 'function') showAdvancedOptionsForSection(type);
  }
}

/**
 * Loads the data for the given section, from memory or server, and renders the chart.
 * @param {string} type - Active section.
 * @param {string} chartType - Chart type to display.
 */
export function loadData(type, chartType) {
  if (typeof showAdvancedOptionsForSection === 'function') showAdvancedOptionsForSection(type);
  const data = sectionData[type];
  if (!data || data.length === 0) {
    tryLoadServerCSV(type, chartType);
    return;
  }
  renderSection(data, type, chartType || 'module');
}


// --- Responsive chart redraw on window resize and container resize ---
let lastChartType = null;
window.addEventListener('resize', () => {
  const activeBtn = document.querySelector('nav button.active');
  const type = activeBtn ? activeBtn.id : null;
  if (!type || !sectionData[type] || sectionData[type].length === 0) return;
  let chartType = null;
  if (window.chartTypeSelectors && window.chartTypeSelectors[type]) {
    chartType = window.chartTypeSelectors[type].value;
  }
  chartType = chartType || lastChartType || 'module';
  lastChartType = chartType;
  // Always re-render semantic-bug-detection and code-coverage charts on resize
  if (type === 'semantic-bug-detection' || type === 'code-coverage') {
    renderSection(sectionData[type], type, chartType);
  } else {
    renderSection(sectionData[type], type, chartType);
  }
});

// ResizeObserver para el contenedor del gráfico
document.addEventListener('DOMContentLoaded', () => {
  const chartArea = document.getElementById('chart-area');
  if (!chartArea) return;
  const observer = new ResizeObserver(() => {
    const activeBtn = document.querySelector('nav button.active');
    const type = activeBtn ? activeBtn.id : null;
    if (!type || !sectionData[type] || sectionData[type].length === 0) return;
    let chartType = null;
    if (window.chartTypeSelectors && window.chartTypeSelectors[type]) {
      chartType = window.chartTypeSelectors[type].value;
    }
    chartType = chartType || lastChartType || 'module';
    lastChartType = chartType;
    renderSection(sectionData[type], type, chartType);
  });
  observer.observe(chartArea);
});
/**
 * Updates the visibility and options of the chart type selector based on the section and data.
 */
export function updateChartTypeSelectorVisibility() {
  const activeBtn = document.querySelector('nav button.active');
  const activeType = activeBtn ? activeBtn.id : null;
  const chartOptions = {
    'code-coverage': [
      { value: 'module', label: 'Coverage per Module' },
      { value: 'severity', label: 'Modules per Severity' },
      { value: 'lollipop', label: 'Test Coverage Distribution (Lollipop)' }
    ],
    'test-smells': [
      { value: 'module', label: 'Smells per Module and Severity' },
      { value: 'severity', label: 'Smells per Severity' },
      { value: 'category', label: 'Smells per Category' }
    ],
    'semantic-bug-detection': [
      { value: 'module', label: 'Issues per Module' },
      { value: 'severity', label: 'Issues per Severity' },
      { value: 'category', label: 'Issues per Category' }
    ],
    'security-posture': [
      { value: 'severity', label: 'Items per Severity' },
      { value: 'state', label: 'Items per Maintenance State (Pie)' }
    ]
  };
  Object.keys(window.chartTypeSelectors).forEach(type => {
    window.chartTypeSelectors[type].style.display = 'none';
    window.chartTypeSelectors[type].innerHTML = '';
  });
  if (
    activeType &&
    chartOptions[activeType] &&
    sectionData[activeType] &&
    Array.isArray(sectionData[activeType]) &&
    sectionData[activeType].length > 0 &&
    window.chartTypeSelectors[activeType]
  ) {
    window.chartTypeSelectors[activeType].innerHTML = '';
    chartOptions[activeType].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      window.chartTypeSelectors[activeType].appendChild(option);
    });
    window.chartTypeSelectors[activeType].style.display = 'block';
  }
}
