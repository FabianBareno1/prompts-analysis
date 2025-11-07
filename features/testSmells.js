import { clearError, updateSummaryMarkdown } from '../index.js';

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
  }
}

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

  // Scales & layout (vertical grouped bars: modules on X, smell counts on Y)
  const margin = { top: 50, right: 40, bottom: 70, left: 70 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const modules = agg.map(labelFn);
  const categories = ['Low','Medium','High'];
  const x = d3.scaleBand().domain(modules).range([0, w]).padding(0.25);
  const xInner = d3.scaleBand().domain(categories).range([0, x.bandwidth()]).padding(0.1);
  const yMax = d3.max(agg, d => d.total) || 0;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([h, 0]);

  // Axes
  g.append('g')
    .attr('class','x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.95rem')
    .attr('transform','rotate(-25)')
    .style('text-anchor','end');
  g.append('g')
    .attr('class','y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.95rem');

  // Color mapping per severity category
  const colorMap = {
    'Low': '#22c55e',
    'Medium': '#f59e42',
    'High': '#ef4444'
  };

  // Draw grouped bars
  const moduleGroups = g.selectAll('.module-group')
    .data(agg)
    .enter()
    .append('g')
    .attr('class','module-group')
    .attr('transform', d => `translate(${x(labelFn(d))},0)`);

  moduleGroups.selectAll('rect')
    .data(d => categories.map(cat => ({
      category: cat,
      value: cat === 'High' ? d.countHigh : cat === 'Medium' ? d.countMed : d.countLow
    })))
    .enter()
    .append('rect')
    .attr('class','bar')
    .attr('x', d => xInner(d.category))
    .attr('y', d => y(d.value))
    .attr('width', xInner.bandwidth())
    .attr('height', d => h - y(d.value))
    .attr('fill', d => colorMap[d.category]);

  // Value labels on top of each bar
  moduleGroups.selectAll('text.bar-label')
    .data(d => categories.map(cat => ({
      category: cat,
      value: cat === 'High' ? d.countHigh : cat === 'Medium' ? d.countMed : d.countLow
    })))
    .enter()
    .append('text')
    .attr('class','bar-label')
    .attr('x', d => xInner(d.category) + xInner.bandwidth()/2)
    .attr('y', d => y(d.value) - 6)
    .attr('text-anchor','middle')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.7rem')
    .text(d => d.value > 0 ? d.value : '');

  // Optional total label above group (omit if zero)
  moduleGroups.append('text')
    .attr('class','group-total')
    .attr('x', xInner.range()[1]/2)
    .attr('y', d => y(d.total) - 18)
    .attr('text-anchor','middle')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.75rem')
    .attr('font-weight','bold')
    .text(d => d.total > 0 ? d.total : '');

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor','middle')
    .attr('fill','#e5e7eb')
    .attr('font-size','1.25rem')
    .text('Test Smell Counts by Module');

  // Legend (reuse severity legend for colors Low/Medium/High)
  addSeverityLegend(svg, width, height);
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

  const margin = { top: 50, right: 30, bottom: 60, left: 60 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + 12})`);

  const x = d3.scaleBand().domain(severities).range([0, w]).padding(0.25);
  const maxVal = d3.max(counts) || 0;
  const y = d3.scaleLinear().domain([0, maxVal === 0 ? 1 : maxVal]).nice().range([h, 0]);

  // Axes
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem');
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem');

  const severityColor = s => s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e42' : s === 'Low' ? '#22c55e' : '#64748b';

  // Bars
  g.selectAll('.bar')
    .data(severities)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d))
    .attr('y', (d, i) => y(counts[i]))
    .attr('width', x.bandwidth())
    .attr('height', (d, i) => h - y(counts[i]))
    .attr('fill', d => severityColor(d));

  // Value labels
  g.selectAll('.label')
    .data(severities)
    .enter()
    .append('text')
    .attr('x', d => x(d) + x.bandwidth() / 2)
    .attr('y', (d, i) => y(counts[i]) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '0.95rem')
    .text((d, i) => counts[i]);

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.25rem')
    .text('Total Test Smell Counts by Severity');

  addSeverityLegend(svg, width, height);
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

  const margin = { top: 60, right: 30, bottom: 160, left: 70 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(agg.map(d => d.Smell)).range([0, w]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(agg, d => d.total)]).nice().range([h, 0]);

  // Axes
  g.append('g')
    .attr('class','x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.75rem')
    .attr('transform','rotate(-35)')
    .style('text-anchor','end');
  g.append('g')
    .attr('class','y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.95rem');

  // Color mapping by severity
  const severityColor = s => s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e42' : s === 'Low' ? '#22c55e' : '#64748b';

  // Bars
  g.selectAll('.bar')
    .data(agg)
    .enter()
    .append('rect')
    .attr('class','bar')
    .attr('x', d => x(d.Smell))
    .attr('y', d => y(d.total))
    .attr('width', x.bandwidth())
    .attr('height', d => h - y(d.total))
    .attr('fill', d => severityColor(d.severity));

  // Labels
  g.selectAll('.label')
    .data(agg)
    .enter()
    .append('text')
    .attr('x', d => x(d.Smell) + x.bandwidth()/2)
    .attr('y', d => y(d.total) - 6)
    .attr('text-anchor','middle')
    .attr('fill','#e5e7eb')
    .attr('font-size','0.7rem')
    .text(d => d.total);

  // Title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor','middle')
    .attr('fill','#e5e7eb')
    .attr('font-size','1.25rem')
    .text('Test Smell Occurrences by Type');

  // Reuse severity legend (shift down to avoid overlap with long smell labels)
  addSeverityLegend(svg, width, height, true);
}

function addSeverityLegend(svg, width, height, shiftDown=false) {
  const legendData = [
    { label: 'High', color: '#ef4444' },
    { label: 'Medium', color: '#f59e42' },
    { label: 'Low', color: '#22c55e' }
  ];
  const legendGroup = svg.append('g').attr('class','legend')
    .attr('transform', `translate(${(width - legendData.length * 100)/2},${height + (shiftDown? 40 : 30)})`);
  legendData.forEach((d,i) => {
    const g = legendGroup.append('g').attr('transform', `translate(${i*100},0)`);
    g.append('rect').attr('width',16).attr('height',16).attr('fill',d.color);
    g.append('text').attr('x',24).attr('y',12).attr('fill','#e5e7eb').attr('font-size','0.95rem').attr('alignment-baseline','middle').text(d.label);
  });
}
