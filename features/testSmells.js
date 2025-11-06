
import { clearError, updateSummaryMarkdown } from '../index.js';
import { drawBarChart } from '../chartHelpers.js';
import { renderLegendHTML, LEGEND_SEVERITY_OPTIONS } from '../uiHelpers.js';

/**
 * Test Smells charts renderer.
 * Expected columns (case-insensitive): Module, Severity, Category
 */
export function renderTestSmellsChart(data, chartType) {
  if (typeof updateSummaryMarkdown === 'function') updateSummaryMarkdown('test-smells');
  if (typeof clearError === 'function') clearError();
  const svg = d3.select('#chart');
  svg.selectAll('*').remove();
  svg.style('display', 'block');
  const chartArea = document.getElementById('chart-area');
  const width = chartArea ? chartArea.clientWidth - 40 : 800;
  const height = chartArea ? chartArea.clientHeight - 60 : 420;
  svg.attr('width', '100%').attr('height', '100%').attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
  if (!chartType) chartType = 'module';
  if (!data || data.length === 0) return;
  if (chartType === 'module') {
    renderSmellsPerModule(data, svg, width, height);
  } else if (chartType === 'severity') {
    renderSmellsPerSeverity(data, svg, width, height);
  } else if (chartType === 'category') {
    renderSmellsPerCategory(data, svg, width, height);
  } else {
    renderSmellsPerModule(data, svg, width, height);
    }  }

function normalizeKey(obj, key) {
  const found = Object.keys(obj).find(k => k.trim().toLowerCase() === key.toLowerCase());
  return found || key;
}

function renderSmellsPerModule(data, svg, width, height) {
  // Group & aggregate smells per module summing Count_High, Count_Medium, Count_Low
  const moduleKey = normalizeKey(data[0], 'Module');
  const highKey = normalizeKey(data[0], 'Count_High');
  const medKey = normalizeKey(data[0], 'Count_Medium');
  const lowKey = normalizeKey(data[0], 'Count_Low');

  // Helper: short module name (before parenthesis) to mimic coverage chart behavior
  const getShortModuleName = m => (m || '').split('(')[0].trim();

  // Aggregate rows by module
  const grouped = d3.group(data, d => d[moduleKey]);
  let agg = Array.from(grouped, ([Module, rows]) => {
    const sum = (key) => rows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
    const countHigh = sum(highKey);
    const countMed = sum(medKey);
    const countLow = sum(lowKey);
    const total = countHigh + countMed + countLow;
    return {
      Module,
      shortModule: getShortModuleName(Module),
      countHigh,
      countMed,
      countLow,
      total
    };
  });

  // Disambiguate labels when short names repeat
  const shortCounts = agg.reduce((acc,d) => { acc[d.shortModule] = (acc[d.shortModule]||0)+1; return acc; }, {});
  const labelFn = d => shortCounts[d.shortModule] > 1 ? d.Module : d.shortModule;

  // Group zero-smell modules into an "Others" bucket (placed first)
  const zeroModules = agg.filter(d => d.total === 0);
  const nonZeroModules = agg.filter(d => d.total !== 0);
  if (zeroModules.length > 0) {
    const zeroTotals = zeroModules.reduce((acc,d) => {
      acc.countHigh += d.countHigh; acc.countMed += d.countMed; acc.countLow += d.countLow; return acc; 
    }, { countHigh:0, countMed:0, countLow:0 });
    const others = {
      Module: 'Others',
      shortModule: 'Others',
      countHigh: zeroTotals.countHigh,
      countMed: zeroTotals.countMed,
      countLow: zeroTotals.countLow,
      total: zeroTotals.countHigh + zeroTotals.countMed + zeroTotals.countLow
    };
    agg = [others, ...nonZeroModules];
  } else {
    agg = nonZeroModules; // if no zeros, keep as-is
  }

  // Sort ascending by total smells (Others stays first if present)
  const hasOthers = agg.length > 0 && agg[0].Module === 'Others';
  const rest = hasOthers ? agg.slice(1).sort((a,b) => a.total - b.total) : agg.sort((a,b) => a.total - b.total);
  agg = hasOthers ? [agg[0], ...rest] : rest;

  // Prepare data for drawBarChart
  const labels = agg.map(labelFn);
  const values = agg.map(d => d.total);
  // Color by severity: use the highest severity present in the module
  const getSeverity = d => {
    if (d.countHigh > 0) return 'High';
    if (d.countMed > 0) return 'Medium';
    if (d.countLow > 0) return 'Low';
    return 'Low';
  };
  const severityColor = severity => {
    if (severity === 'High') return '#ef4444';
    if (severity === 'Medium') return '#f59e42';
    if (severity === 'Low') return '#22c55e';
    return '#a1a1aa';
  };
  const colorScale = i => severityColor(getSeverity(agg[i]));

  // Remove previous SVG content
  svg.selectAll('*').remove();
  // Use drawBarChart for rendering (pass chart container directly)
  drawBarChart(
    d3.select('#chart'),
    labels,
    values,
    width,
    height,
    colorScale,
    'Test Smell Counts by Module',
    'Module',
    'Smells',
    true
  );
  // Render legend as HTML below the chart, after SVG is rendered
  renderLegendHTML(LEGEND_SEVERITY_OPTIONS);
}

function renderSmellsPerSeverity(data, svg, width, height) {
  // Sum numeric smell count columns instead of counting rows by severity label
  const highKey = normalizeKey(data[0], 'Count_High');
  const medKey = normalizeKey(data[0], 'Count_Medium');
  const lowKey = normalizeKey(data[0], 'Count_Low');

  const sumCol = key => data.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
  const totalHigh = sumCol(highKey);
  const totalMed = sumCol(medKey);
  const totalLow = sumCol(lowKey);

  const severities = ['High', 'Medium', 'Low'];
  const counts = [totalHigh, totalMed, totalLow];
  const severityColor = s => s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e42' : s === 'Low' ? '#22c55e' : '#64748b';
  const colorScale = i => severityColor(severities[i]);

  // Remove previous SVG content
  svg.selectAll('*').remove();
  // Use drawBarChart for rendering (pass chart container directly)
  drawBarChart(
    d3.select('#chart'),
    severities,
    counts,
    width,
    height,
    colorScale,
    'Total Test Smell Counts by Severity',
    'Severity',
    'Smells',
    true
  );
  // Render legend as HTML below the chart, after SVG is rendered
  renderLegendHTML(LEGEND_SEVERITY_OPTIONS);
}

function renderSmellsPerCategory(data, svg, width, height) {
  // Reinterpreted: group by individual Smell (column 'Smells') and count occurrences.
  const smellKey = normalizeKey(data[0], 'Smells');
  const severityKey = normalizeKey(data[0], 'Severity');
  // Filter out empty / blank smell values
  const filtered = data.filter(d => {
    const val = (d[smellKey] || '').trim();
    return val.length > 0; 
  });
  if (filtered.length === 0) {
    svg.append('text')
      .attr('x', width/2)
      .attr('y', 40)
      .attr('text-anchor','middle')
      .attr('fill','#e5e7eb')
      .attr('font-size','1.1rem')
      .text('No smell occurrences to display');
    return;
  }

  // Aggregate counts and determine severity per smell (highest severity present among its rows)
  const smellsMap = new Map(); // smell -> { count, high, med, low }
  filtered.forEach(r => {
    const smell = r[smellKey].trim();
    if (!smellsMap.has(smell)) {
      smellsMap.set(smell, { count: 0, High: 0, Medium: 0, Low: 0 });
    }
    const entry = smellsMap.get(smell);
    entry.count += 1;
    const sevRaw = (r[severityKey] || '').trim().toLowerCase();
    if (sevRaw === 'high') entry.High += 1;
    else if (sevRaw === 'medium') entry.Medium += 1;
    else if (sevRaw === 'low') entry.Low += 1;
  });

  // Convert to array
  let agg = Array.from(smellsMap, ([Smell, stats]) => {
    // Determine overall severity for coloring: High > Medium > Low
    let sev = 'Low';
    if (stats.High > 0) sev = 'High';
    else if (stats.Medium > 0) sev = 'Medium';
    return { Smell, total: stats.count, severity: sev };
  });

  // Sort by severity
  const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 }; 
  agg = agg.sort((a, b) => { 
    if (severityOrder[a.severity] !== severityOrder[b.severity]) { 
      return severityOrder[a.severity] - severityOrder[b.severity]; 
    } 
    return a.total - b.total; 
  });

  // Prepare data for drawBarChart
  const labels = agg.map(d => d.Smell);
  const values = agg.map(d => d.total);
  const severityColor = s => s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e42' : s === 'Low' ? '#22c55e' : '#64748b';
  const colorScale = i => severityColor(agg[i].severity);

  // Remove previous SVG content
  svg.selectAll('*').remove();
  // Use drawBarChart for rendering (pass chart container directly)
  drawBarChart(
    d3.select('#chart'),
    labels,
    values,
    width,
    height,
    colorScale,
    'Test Smell Occurrences by Type',
    'Smell',
    'Occurrences',
    true
  );
  // Render legend as HTML below the chart, after SVG is rendered
  renderLegendHTML(LEGEND_SEVERITY_OPTIONS);
}

