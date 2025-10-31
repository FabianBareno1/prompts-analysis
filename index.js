import { renderCodeCoverageChart } from './features/codeCoverage.js';
import { renderTestSmellsChart } from './features/testSmells.js';
import { renderSecurityPostureChart } from './features/securityPosture.js';
import { renderSemanticBugDetectionChart } from './features/semanticBugDetection.js';
import { renderRegressionRiskSection } from './features/regressionRisk.js';

// Show/hide summary and detail
document.addEventListener('DOMContentLoaded', () => {
  const summaryBtn = document.getElementById('show-summary-btn');
  const detailBtn = document.getElementById('show-detail-btn');
  const summaryContainer = document.getElementById('summary-md-container');
  const chartSvg = document.getElementById('chart');
  if (summaryBtn && detailBtn && summaryContainer && chartSvg) {
    summaryBtn.onclick = () => {
      summaryContainer.style.display = 'block';
      chartSvg.style.display = 'none';
    };
    detailBtn.onclick = () => {
      summaryContainer.style.display = 'none';
      chartSvg.style.display = 'block';
    };
    // By default, show the detail (chart)
    summaryContainer.style.display = 'none';
    chartSvg.style.display = 'block';
  }
});



// --- State and DOM references ---
export const chart = d3.select('#chart');
export const summaryMd = document.getElementById('summary-md');
export const errorMessage = document.getElementById('error-message');
export const loader = document.getElementById('loader');
export const csvSummary = document.getElementById('csv-summary');

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
  csvSummary.style.display = 'none';
  console.error(msg);
}

/**
 * Clears any error message and hides the loader and CSV summary.
 */
export function clearError() {
  errorMessage.hidden = true;
  loader.style.display = 'none';
  csvSummary.style.display = 'none';
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
 * Renders the main chart based on the data and section type.
 * @param {Array<Object>} data - Parsed CSV data.
 * @param {string} type - Active section (code-coverage, security-posture, etc).
 * @param {string} chartType - Chart type to display.
 */
export function renderChart(data, type, chartType) {
  updateSummaryMarkdown(type);
  clearError();
  chart.selectAll('*').remove();
  chart.style('display', 'block');
  if (!data || data.length === 0) {
    showError('No data available for this section.');
    return;
  }
  csvSummary.style.display = 'none';
  if (type === 'code-coverage') {
    renderCodeCoverageChart(data, chartType);
  } else if (type === 'semantic-bug-detection') {
    renderSemanticBugDetectionChart(data, chartType);
  } else if (type === 'test-smells') {
    renderTestSmellsChart(data, chartType);
  } else if (type === 'security-posture') {
    renderSecurityPostureChart(data, chartType);
  } else if (type === 'regression-risk') {
    renderRegressionRiskSection(data, chartType);
  } else {
    // For ALL other sections, always hide commit bar charts
    if (typeof window.hideCommitsBarCharts === 'function') window.hideCommitsBarCharts();
  }

}

/**
 * Parses a CSV file uploaded by the user and updates the visualization.
 * @param {File} file - Selected CSV file.
 * @param {string} type - Active section.
 * @param {string} chartType - Chart type to display.
 */
export function parseCSVFile(file, type, chartType) {
  if (!file) {
    showError('No file selected.');
    return;
  }
  loader.style.display = 'block';
  const reader = new FileReader();
  reader.onload = function (e) {
    setTimeout(() => {
      try {
        const text = e.target.result;
        d3.csvParse(text, function (row) { return row; });
        const data = d3.csvParse(text);
        loader.style.display = 'none';
        if (data.length === 0) {
          showError('The CSV file is empty.');
          return;
        }
        let requiredCols = [];
        if (type === 'code-coverage') {
          if (chartType === 'severity') requiredCols = ['Severity'];
          else requiredCols = ['Module'];
        } else if (type === 'semantic-bug-detection') {
          if (chartType === 'severity') requiredCols = ['Severity'];
          else if (chartType === 'category') requiredCols = ['Category'];
          else requiredCols = ['Module'];
        } else if (type === 'security-posture') {
          if (chartType === 'category') requiredCols = ['Category'];
          else requiredCols = ['Severity'];
        } else if (type === 'regression-risk') {
          if (chartType === 'category') requiredCols = ['Category'];
          else if (chartType === 'module') requiredCols = ['Module'];
          else requiredCols = ['Severity'];
        }
        const columns = Object.keys(data[0]);
        const missing = requiredCols.filter(col => !columns.some(c => c.trim().toLowerCase() === col.trim().toLowerCase()));
        if (missing.length === 0) {
          sectionData[type] = data;
          renderChart(data, type, chartType || 'module');
          if (typeof updateChartTypeSelectorVisibility === 'function') updateChartTypeSelectorVisibility();
          csvSummary.style.display = 'none';
          return;
        }
        let summaryHtml = `<strong>Columnas detectadas:</strong><ul style='margin:0.5em 0 0 1.2em;'>`;
        columns.forEach(col => { summaryHtml += `<li>${col}</li>`; });
        summaryHtml += '</ul>';
        summaryHtml += `<div style='color:#f87171;margin-top:0.5em;'>Missing required columns: <b>${missing.join(', ')}</b></div>`;
        summaryHtml += `<div style='margin-top:0.7em;'><button id='continue-csv-btn' style='background:#3b82f6;color:#fff;border:none;padding:0.5em 1.2em;border-radius:0.4em;cursor:pointer;'>Chart anyway</button></div>`;
        csvSummary.innerHTML = summaryHtml;
        csvSummary.style.display = 'block';
        document.getElementById('continue-csv-btn').onclick = function () {
          csvSummary.style.display = 'none';
          sectionData[type] = data;
          renderChart(data, type, chartType || 'module');
          if (typeof updateChartTypeSelectorVisibility === 'function') updateChartTypeSelectorVisibility();
        };
      } catch (err) {
        loader.style.display = 'none';
        showError('Error parsing CSV: ' + err.message);
      }
    }, 400);
  };
  reader.onerror = function () {
    loader.style.display = 'none';
    showError('Error reading file.');
  };
  reader.readAsText(file);
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
    if (typeof showFileInputForSection === 'function') showFileInputForSection(type);
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
        renderChart(filteredData, type, chartTypeToUse || (type === 'regression-risk' ? 'severity' : 'module'));
      }, 0);
    }
  } catch (err) {
    sectionData[type] = null;
    showError('Could not load CSV file from server. You can upload it manually.');
    if (typeof updateChartTypeSelectorVisibility === 'function') updateChartTypeSelectorVisibility();
    if (typeof showFileInputForSection === 'function') showFileInputForSection(type);
  }
}

/**
 * Loads the data for the given section, from memory or server, and renders the chart.
 * @param {string} type - Active section.
 * @param {string} chartType - Chart type to display.
 */
export function loadData(type, chartType) {
  if (typeof showFileInputForSection === 'function') showFileInputForSection(type);
  const data = sectionData[type];
  if (!data || data.length === 0) {
    tryLoadServerCSV(type, chartType);
    return;
  }
  renderChart(data, type, chartType || 'module');
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
    renderChart(sectionData[type], type, chartType);
  } else {
    renderChart(sectionData[type], type, chartType);
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
    renderChart(sectionData[type], type, chartType);
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
      { value: 'module', label: 'Smells per Module' },
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
      { value: 'category', label: 'Items per Category' }
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
