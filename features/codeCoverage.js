import { chart, showError, updateSummaryMarkdown } from '../index.js';
import { drawBarChart } from '../chartHelpers.js';
import { renderLegendHTML, LEGEND_SEVERITY_OPTIONS } from '../uiHelpers.js';


export function renderCodeCoverageChart(data, chartType) {

  updateSummaryMarkdown('code-coverage');
  chart.selectAll('*').remove();
  // Get chart area size for custom charts
  const chartArea = document.getElementById('chart-area');
  const width = chartArea ? chartArea.clientWidth - 40 : 600;
  const height = chartArea ? chartArea.clientHeight - 60 : 400;
  // Make SVG responsive for unit testing charts only
  chart
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  if (!chartType) {
    chartType = 'module';
  }
  if (chartType === 'module') {
    if (!data[0] || !('Module' in data[0] || 'module' in data[0])) { showError('CSV is missing the "Module" column.'); return; }
    renderCoveragePerModule(data, chart, width, height);
  } else if (chartType === 'severity') {
    renderSeverityByModuleChart(data, chart, width, height);
  } else if (chartType === 'lollipop') {
    if (!data[0] || !('Module' in data[0] || 'module' in data[0])) { showError('CSV is missing the "Module" column.'); return; }
    renderCoverageLollipopByModule(data, chart, width, height);
  }
}

// --- Helper functions for code quality ---
function getNumericColumns(row) {
  // Returns all numeric columns except 'Module', 'module', and 'Severity'
  return Object.keys(row).filter(k => k !== 'Module' && k !== 'module' && k !== 'Severity' && !isNaN(parseFloat(row[k])));
}

function averageColumn(rows, col) {
  // Calculates the average for a column, handling comma as decimal separator
  const vals = rows.map(r => parseFloat(r[col].replace(',', '.'))).filter(v => !isNaN(v));
  return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function getLinesKey(row) {
  // Returns the key for the lines% column (case-insensitive)
  return Object.keys(row).find(k => k.trim().toLowerCase() === 'lines%' || k.trim().toLowerCase() === 'linespercent');
}

function calculateSeverity(avgLines) {
  // Returns severity based on average lines coverage
  if (avgLines == null) return '';
  if (avgLines < 30) return 'High';
  if (avgLines <= 70) return 'Medium';
  return 'Low';
}

function getShortModuleName(moduleName) {
  // Returns the short module name (before parenthesis)
  return moduleName.split('(')[0].trim();
}

function disambiguateLabels(agg) {
  // Returns a function to disambiguate labels if short names are duplicated
  const shortModuleCounts = agg.reduce((acc, d) => {
    acc[d.shortModule] = (acc[d.shortModule] || 0) + 1;
    return acc;
  }, {});
  return d => shortModuleCounts[d.shortModule] > 1 ? d.Module : d.shortModule;
}

function groupZeroCoverageModules(agg, linesKey) {
  // Groups modules with zero coverage into a single 'Others' entry
  if (!linesKey) return agg;
  const zeroModules = agg.filter(d => (d[linesKey] || 0) === 0);
  const nonZeroAgg = agg.filter(d => (d[linesKey] || 0) !== 0);
  if (zeroModules.length > 0) {
    const count = zeroModules.reduce((a, b) => a + (b.Count || 0), 0);
    const others = {
      Module: 'Others',
      shortModule: 'Others',
      [linesKey]: 0,
      Severity: 'High',
      Count: count
    };
    nonZeroAgg.unshift(others);
  }
  return nonZeroAgg;
}

// Helper: aggregate modules and calculate severity and averages
export function aggregateModulesWithSeverity(data) {  
  // Aggregates modules, calculates severity and averages for numeric columns
  const grouped = d3.group(data, d => d.Module || d.module);
  return Array.from(grouped, ([Module, rows]) => {
    const numericCols = getNumericColumns(rows[0]);
    const averages = {};
    numericCols.forEach(col => {
      averages[col] = averageColumn(rows, col);
    });
    const linesCol = getLinesKey(rows[0]);
    const avgLines = linesCol ? averageColumn(rows, linesCol) : null;
    const severity = calculateSeverity(avgLines);
    const shortModule = getShortModuleName(Module);
    return {
      Module,
      shortModule,
      ...averages,
      Severity: severity,
      Count: rows.length
    };
  });
}

// Lollipop chart: module contribution to total coverage (lines%)
export function renderCoverageLollipopByModule(data, chart, width, height) {
  // Lollipop chart: each module's contribution to the total (sums to 100%)
  let agg = aggregateModulesWithSeverity(data);
  const linesKey = agg.length > 0 ? getLinesKey(agg[0]) : null;
  // Use Count if no linesKey
  let total = 0;
  if (linesKey) {
    total = agg.reduce((sum, d) => sum + (d[linesKey] || 0), 0);
  } else {
    total = agg.reduce((sum, d) => sum + (d.Count || 0), 0);
  }
  // Calculate real percentage contribution
  agg = agg.map(d => {
    let value = linesKey ? (d[linesKey] || 0) : d.Count;
    let percent = total > 0 ? (value / total) * 100 : 0;
    return { ...d, contribution: percent };
  });
  // Sort by contribution ascending
  agg = agg.sort((a, b) => a.contribution - b.contribution);
  agg = groupZeroCoverageModules(agg, 'contribution');
  const labelFn = disambiguateLabels(agg);
  const labels = agg.map(labelFn);
  // Color scale
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  // Lollipop chart layout
  const margin = { top: 60, right: 40, bottom: 60, left: 120 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const g = chart.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  // Y: modules, X: contribution
  const y = d3.scaleBand().domain(labels).range([0, h]).padding(0.3);
  // Find the maximum contribution and set the X axis just above it
  const maxContribution = d3.max(agg, d => d.contribution);
  // Add a small buffer (e.g., 5% of max or at least 2 units)
  const xMax = Math.min(100, Math.ceil((maxContribution + Math.max(2, maxContribution * 0.05)) * 10) / 10);
  const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, w]);
  // Y axis
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem');
  // X axis
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d => d + '%'))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem');
  // Draw lollipop lines
  g.selectAll('.lollipop-line')
    .data(agg)
    .enter()
    .append('line')
    .attr('class', 'lollipop-line')
    .attr('x1', x(0))
    .attr('x2', d => x(d.contribution))
    .attr('y1', (d, i) => y(labelFn(d)) + y.bandwidth() / 2)
    .attr('y2', (d, i) => y(labelFn(d)) + y.bandwidth() / 2)
    .attr('stroke', '#888')
    .attr('stroke-width', 2);
  // Draw lollipop circles
  g.selectAll('.lollipop-circle')
    .data(agg)
    .enter()
    .append('circle')
    .attr('class', 'lollipop-circle')
    .attr('cx', d => x(d.contribution))
    .attr('cy', (d, i) => y(labelFn(d)) + y.bandwidth() / 2)
    .attr('r', 9)
    .attr('fill', (d, i) => colorScale(i));
  // Value labels
  g.selectAll('.lollipop-label')
    .data(agg)
    .enter()
    .append('text')
    .attr('class', 'lollipop-label')
    .attr('x', d => x(d.contribution) + 14)
    .attr('y', (d, i) => y(labelFn(d)) + y.bandwidth() / 2 + 4)
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .attr('font-weight', 'bold')
    .text(d => d.contribution != null ? d.contribution.toFixed(1) + '%' : '');
  // Chart title
  chart.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.3rem')
    .text('Module Contribution to Total Coverage');
}

// Chart: Severity on X, count of modules on Y
export function renderSeverityByModuleChart(data, chart, width, height) {
  // Bar chart: number of modules per severity using drawBarChart
  const agg = aggregateModulesWithSeverity(data);
  const severities = ['High', 'Medium', 'Low'];
  const severityCounts = d3.rollup(agg, v => v.length, d => d.Severity);
  const labels = severities;
  const values = severities.map(sev => severityCounts.get(sev) || 0);
  // Color scale by severity
  const severityColor = severity => {
    if (severity === 'High') return '#ef4444';
    if (severity === 'Medium') return '#f59e42';
    if (severity === 'Low') return '#22c55e';
    return '#a1a1aa';
  };
  const colorScale = i => severityColor(labels[i]);
  drawBarChart(chart, labels, values, width, height, colorScale, 'Modules per Severity', 'Severity', 'Modules', true);
}

export function renderCoveragePerModule(data, chart, width, height) {    

  // Bar chart: coverage (lines%) by module, colored by severity, using drawBarChart for layout and axes
  let agg = aggregateModulesWithSeverity(data);
  const linesKey = agg.length > 0 ? getLinesKey(agg[0]) : null;
  if (linesKey) agg = agg.sort((a, b) => (a[linesKey] || 0) - (b[linesKey] || 0));
  agg = groupZeroCoverageModules(agg, linesKey);
  const labelFn = disambiguateLabels(agg);
  const labels = agg.map(labelFn);
  const values = agg.map(d => linesKey ? d[linesKey] : 0);
  // Color by severity
  const severityColor = severity => {
    if (severity === 'High') return '#ef4444';
    if (severity === 'Medium') return '#f59e42';
    if (severity === 'Low') return '#22c55e';
    return '#a1a1aa';
  };
  // Color scale that respects the order of agg
  const colorScale = i => severityColor(agg[i].Severity);
  // Use drawBarChart for layout, axes, and value labels (as percentages)
  drawBarChart(
    chart,
    labels,
    values,
    width,
    height,
    colorScale,
    'Coverage (lines%) by Module',
    'Module',
    'Coverage',
    true,
    v => (typeof v === 'number' && !isNaN(v) ? v.toFixed(1) + '%' : ''),
    (d, xLabel, yLabel) => `<b>${xLabel}:</b> ${d.label}<br><b>${yLabel}:</b> ${typeof d.value === 'number' && !isNaN(d.value) ? d.value.toFixed(1) + '%' : d.value}`
  );
  // Render legend como HTML debajo del gráfico, después de renderizar el SVG
  renderLegendHTML(LEGEND_SEVERITY_OPTIONS);
}
