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

// D3 chart rendering and CSV parsing logic for the audit dashboard
// All chart rendering, CSV parsing, and data aggregation functions


// --- State and DOM references ---
export const chart = d3.select('#chart');
export const summaryMd = document.getElementById('summary-md');
export const errorMessage = document.getElementById('error-message');
export const loader = document.getElementById('loader');
export const csvSummary = document.getElementById('csv-summary');

export const sectionData = {
  'unit-testing': null,
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
  if (type === 'unit-testing') mdPath = 'files/summaries/UnitTestingSummary.md';
  else if (type === 'security-posture') mdPath = 'files/summaries/SecurityPostureSummary.md';
  else if (type === 'regression-risk') mdPath = 'files/summaries/RegressionRiskSummary.md';
  else if (type === 'semantic-bug-detection') mdPath = 'files/summaries/SemanticBugDetectionSummary.md';
  summaryMd.setAttribute('src', mdPath);
  summaryMd.style.display = mdPath ? 'block' : 'none';
}

/**
 * Renders the main chart based on the data and section type.
 * @param {Array<Object>} data - Parsed CSV data.
 * @param {string} type - Active section (unit-testing, security-posture, etc).
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
  const chartArea = document.getElementById('chart-area');
  const width = chartArea ? chartArea.clientWidth - 40 : 600;
  const height = chartArea ? chartArea.clientHeight - 60 : 400;
  function hasColumn(col) {
    return data.length > 0 && Object.keys(data[0]).some(k => k.trim().toLowerCase() === col.trim().toLowerCase());
  }
  // SVG responsive
  chart
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  function drawBarChart(labels, values, title, xLabel, yLabel) {
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = chart.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(values)]).nice().range([h, 0]);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1rem')
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1rem');
    g.selectAll('.bar')
      .data(labels.map((d, i) => ({ label: d, value: values[i] })))
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(d.value))
      .attr('fill', (d, i) => colorScale(i));
    g.selectAll('.label')
      .data(labels.map((d, i) => ({ label: d, value: values[i] })))
      .enter()
      .append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '0.95rem')
      .text(d => d.value);
    chart.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1.3rem')
      .text(title);
  }
  function drawPieChart(labels, values, title) {
    const radius = Math.min(width, height) / 2 - 40;
    const g = chart.append('g').attr('transform', `translate(${width / 2},${height / 2 + 20})`);
    const pie = d3.pie().value(d => d.value);

    // Aggregate small portions into "Other"
    const threshold = 2; // Define the threshold for small portions
    const aggregatedData = labels.map((label, i) => ({ label, value: values[i] }));
    const smallPortions = aggregatedData.filter(d => d.value <= threshold);
    const otherValue = smallPortions.reduce((sum, d) => sum + d.value, 0);
    const filteredData = aggregatedData.filter(d => d.value > threshold);

    if (otherValue > 0) {
      filteredData.push({ label: 'Other', value: otherValue });
    }

    const arcs = pie(filteredData);

    const arcGenerator = d3.arc().innerRadius(radius * 0.45).outerRadius(radius);
    // Helper to determine readable text color on a given background
    function getContrastColor(hexColor) {
      // convert hex (e.g. "#ff0000" or "#f00") to RGB
      const c = hexColor.replace('#', '');
      const hex = c.length === 3 ? c.split('').map(ch => ch + ch).join('') : c;
      const r = parseInt(hex.substring(0, 2), 16);
      const gCol = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // luminance
      const lum = 0.2126 * (r / 255) + 0.7152 * (gCol / 255) + 0.0722 * (b / 255);
      return lum > 0.55 ? '#111827' : '#ffffff';
    }

    g.selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', (d, i) => colorScale(i))
      .attr('stroke', '#222')
      .attr('stroke-width', 2);

    // Place labels inside the slices using arc centroids. If a slice is too small, place label at centroid with smaller font.
    g.selectAll('text')
      .data(arcs)
      .enter()
      .append('text')
      .attr('transform', d => {
        const pos = arcGenerator.centroid(d);
        return `translate(${pos})`;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', (d, i) => getContrastColor(colorScale(i)))
      .attr('font-size', d => {
        // larger font for larger slices
        const angle = d.endAngle - d.startAngle;
        return angle > 0.4 ? '0.95rem' : '0.7rem';
      })
      .each(function (d) {
        const el = d3.select(this);
        const label = `${d.data.label}: ${d.data.value}`;
        // If slice is very small, show only the value to avoid overflow
        const angle = d.endAngle - d.startAngle;
        el.text(angle > 0.25 ? label : d.data.value);
      });

    chart.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1.3rem')
      .text(title);
  }
  let agg = [];
  if (!chartType) {
    const selector = window.chartTypeSelectors ? window.chartTypeSelectors[type] : null;
    const firstOpt = selector ? selector.querySelector('option') : null;
    chartType = firstOpt ? firstOpt.value : 'module';
  }
  if (type === 'unit-testing') {
    if (chartType === 'module') {
      if (!hasColumn('Module')) { showError('CSV is missing the "Module" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Module || d.module);
      agg = Array.from(counts, ([Module, Count]) => ({ Module, Count }));
      drawBarChart(agg.map(d => d.Module), agg.map(d => d.Count), 'Tests per Module', 'Module', 'Count');
    } else if (chartType === 'severity') {
      if (!hasColumn('Severity')) { showError('CSV is missing the "Severity" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Severity || d.severity);
      agg = Array.from(counts, ([Severity, Count]) => ({ Severity, Count }));
      drawBarChart(agg.map(d => d.Severity), agg.map(d => d.Count), 'Tests per Severity', 'Severity', 'Count');
    } else if (chartType === 'pie') {
      if (!hasColumn('Module')) { showError('CSV is missing the "Module" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Module || d.module);
      agg = Array.from(counts, ([Module, Count]) => ({ Module, Count }));
      drawPieChart(agg.map(d => d.Module), agg.map(d => d.Count), 'Tests Distribution (Pie)');
    }
  } else if (type === 'semantic-bug-detection') {
    if (chartType === 'module') {
      if (!hasColumn('Module')) { showError('CSV is missing the "Module" column.'); return; }
      const filtered = data.filter(row => row.Module && row.Module.trim() !== '');
      const counts = d3.rollup(filtered, v => v.length, d => d.Module);
      agg = Array.from(counts, ([Module, Count]) => ({ Module, Count }));
      drawBarChart(agg.map(d => d.Module), agg.map(d => d.Count), 'Issues per Module', 'Module', 'Count');
    } else if (chartType === 'severity') {
      if (!hasColumn('Severity')) { showError('CSV is missing the "Severity" column.'); return; }
      const filtered = data.filter(row => row.Severity && row.Severity.trim() !== '');
      const counts = d3.rollup(filtered, v => v.length, d => d.Severity);
      agg = Array.from(counts, ([Severity, Count]) => ({ Severity, Count }));
      drawBarChart(agg.map(d => d.Severity), agg.map(d => d.Count), 'Issues per Severity', 'Severity', 'Count');
    } else if (chartType === 'category') {
      if (!hasColumn('Category')) { showError('CSV is missing the "Category" column.'); return; }
      const filtered = data.filter(row => row.Category && row.Category.trim() !== '');
      const counts = d3.rollup(filtered, v => v.length, d => d.Category);
      agg = Array.from(counts, ([Category, Count]) => ({ Category, Count }));
      drawPieChart(agg.map(d => d.Category), agg.map(d => d.Count), 'Issues per Category');
    }
  } else if (type === 'security-posture') {
    if (chartType === 'severity') {
      if (!hasColumn('Severity')) { showError('CSV is missing the "Severity" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Severity);
      agg = Array.from(counts, ([Severity, Count]) => ({ Severity, Count }));
      drawBarChart(agg.map(d => d.Severity), agg.map(d => d.Count), 'Items per Severity', 'Severity', 'Count');
    } else if (chartType === 'category') {
      if (!hasColumn('Maintenance State')) { showError('CSV is missing the "Maintenance State" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d['Maintenance State']);
      agg = Array.from(counts, ([MaintenanceState, Count]) => ({ MaintenanceState, Count }));
      drawPieChart(agg.map(d => d.MaintenanceState), agg.map(d => d.Count), 'Items per Maintenance State');
    }
  } else if (type === 'regression-risk') {
    if (chartType === 'severity') {
      if (!hasColumn('Severity')) { showError('CSV is missing the "Severity" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Severity);
      agg = Array.from(counts, ([Severity, Count]) => ({ Severity, Count }));
      drawBarChart(agg.map(d => d.Severity), agg.map(d => d.Count), 'Items per Severity', 'Severity', 'Count');
    } else if (chartType === 'category') {
      if (!hasColumn('Category')) { showError('CSV is missing the "Category" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Category);
      agg = Array.from(counts, ([Category, Count]) => ({ Category, Count }));
      drawPieChart(agg.map(d => d.Category), agg.map(d => d.Count), 'Items per Category');
    } else if (chartType === 'module') {
      if (!hasColumn('Module')) { showError('CSV is missing the "Module" column.'); return; }
      const counts = d3.rollup(data, v => v.length, d => d.Module);
      agg = Array.from(counts, ([Module, Count]) => ({ Module, Count }));
      drawPieChart(agg.map(d => d.Module), agg.map(d => d.Count), 'Items per Module');
    }
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
        if (type === 'unit-testing') {
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
  if (type === 'unit-testing') csvPath = 'files/details/UnitTesting.csv';
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

// --- Chart type selector visibility logic ---
/**
 * Updates the visibility and options of the chart type selector based on the section and data.
 */
export function updateChartTypeSelectorVisibility() {
  const activeBtn = document.querySelector('nav button.active');
  const activeType = activeBtn ? activeBtn.id : null;
  const chartOptions = {
    'unit-testing': [
      { value: 'module', label: 'Tests per Module' },
      { value: 'severity', label: 'Tests per Severity' },
      { value: 'pie', label: 'Tests Distribution (Pie)' }
    ],
    'semantic-bug-detection': [
      { value: 'module', label: 'Issues per Module' },
      { value: 'severity', label: 'Issues per Severity' },
      { value: 'category', label: 'Issues per Category' }
    ],
    'security-posture': [
      { value: 'severity', label: 'Items per Severity' },
      { value: 'category', label: 'Items per Category' }
    ],
    'regression-risk': [
      { value: 'severity', label: 'Items per Severity' },
      { value: 'category', label: 'Items per Category' },
      { value: 'module', label: 'Items per Module' }
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
