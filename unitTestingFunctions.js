// --- Helper functions for code quality ---
function getNumericColumns(row) {
  return Object.keys(row).filter(k => k !== 'Module' && k !== 'module' && k !== 'Severity' && !isNaN(parseFloat(row[k])));
}

function averageColumn(rows, col) {
  const vals = rows.map(r => parseFloat(r[col].replace(',', '.'))).filter(v => !isNaN(v));
  return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

function getLinesKey(row) {
  return Object.keys(row).find(k => k.trim().toLowerCase() === 'lines%' || k.trim().toLowerCase() === 'linespercent');
}

function calculateSeverity(avgLines) {
  if (avgLines == null) return '';
  if (avgLines < 30) return 'High';
  if (avgLines <= 70) return 'Medium';
  return 'Low';
}

function getShortModuleName(moduleName) {
  return moduleName.split('(')[0].trim();
}

function disambiguateLabels(agg) {
  const shortModuleCounts = agg.reduce((acc, d) => {
    acc[d.shortModule] = (acc[d.shortModule] || 0) + 1;
    return acc;
  }, {});
  return d => shortModuleCounts[d.shortModule] > 1 ? d.Module : d.shortModule;
}

function groupZeroCoverageModules(agg, linesKey) {
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

// Pie chart: module contribution to total coverage (lines%)
export function renderCoveragePieByModule(data, chart, width, height) {
  let agg = aggregateModulesWithSeverity(data);
  const linesKey = agg.length > 0 ? getLinesKey(agg[0]) : null;
  if (linesKey) agg = agg.sort((a, b) => (a[linesKey] || 0) - (b[linesKey] || 0));
  agg = groupZeroCoverageModules(agg, linesKey);
  const labelFn = disambiguateLabels(agg);
  // If no lines% column, fallback to count
  let values = agg.map(d => linesKey ? (d[linesKey] || 0) : d.Count);
  // Normalize so total is 100
  const total = values.reduce((a, b) => a + b, 0) || 1;
  values = values.map(v => v * 100 / total);
  const labels = agg.map(labelFn);
  // Color scale
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  const radius = Math.min(width, height) / 2 - 40;
  // Add extra vertical space below the title (e.g., 40px instead of 20)
  const g = chart.append('g').attr('transform', `translate(${width / 2},${height / 2 + 40})`);
  const pie = d3.pie().value((d, i) => values[i]);
  const dataPie = labels.map((d, i) => ({ label: d, value: values[i] }));
  const arcs = pie(dataPie);
  g.selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', d3.arc().innerRadius(radius * 0.45).outerRadius(radius))
    .attr('fill', (d, i) => colorScale(i))
    .attr('stroke', '#222')
    .attr('stroke-width', 2);
  // Labels outside the pie slices
  g.selectAll('text')
    .data(arcs)
    .enter()
    .append('text')
    .attr('transform', function(d) {
      // Place label just outside the arc
      const pos = d3.arc().innerRadius(radius * 1.05).outerRadius(radius * 1.15).centroid(d);
      return `translate(${pos[0]},${pos[1]})`;
    })
    .attr('text-anchor', function(d) {
      // Place anchor based on angle
      const midAngle = (d.startAngle + d.endAngle) / 2;
      return midAngle < Math.PI ? 'start' : 'end';
    })
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .attr('font-weight', 'bold')
    .text(d => `${d.data.label}: ${d.data.value.toFixed(1)}%`);
  chart.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.3rem')
    .text('Module Contribution to Total Coverage');

  // (Removed horizontal line below the title)
}

// Chart: Severity on X, count of modules on Y
export function renderSeverityByModuleChart(data, chart, width, height) {
  const agg = aggregateModulesWithSeverity(data);
  // Count modules per severity
  const severityCounts = d3.rollup(agg, v => v.length, d => d.Severity);
  const severities = ['High', 'Medium', 'Low'];
  const counts = severities.map(sev => severityCounts.get(sev) || 0);
  // Color scale by severity
  const severityColor = severity => {
    if (severity === 'High') return '#ef4444';
    if (severity === 'Medium') return '#f59e42';
    if (severity === 'Low') return '#22c55e';
    return '#a1a1aa';
  };
  // Draw bar chart
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const g = chart.append('g').attr('transform', `translate(${margin.left},${margin.top + 18})`);
  const x = d3.scaleBand().domain(severities).range([0, w]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(counts)]).nice().range([h, 0]);
  // X axis
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .style('text-anchor', 'middle');
  // Y axis
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem');
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
  // Chart title
  chart.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.3rem')
    .text('Modules per Severity');
}

export function renderCoveragePerModule(data, chart, width, height) {    
    let agg = aggregateModulesWithSeverity(data);
    const linesKey = agg.length > 0 ? getLinesKey(agg[0]) : null;
    if (linesKey) agg = agg.sort((a, b) => (a[linesKey] || 0) - (b[linesKey] || 0));
    agg = groupZeroCoverageModules(agg, linesKey);
    const labelFn = disambiguateLabels(agg);
    // Color scale by severity
    const severityColor = severity => {
      if (severity === 'High') return '#ef4444'; // red
      if (severity === 'Medium') return '#f59e42'; // orange
      if (severity === 'Low') return '#22c55e'; // green
      return '#a1a1aa'; // gray fallback
    };
    // Draw custom bar chart with colored bars
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = chart.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleBand().domain(agg.map(labelFn)).range([0, w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, 100]).nice().range([h, 0]);

    // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1rem')
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');
    // Y axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1rem');

    // Bars
    g.selectAll('.bar')
      .data(agg)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(labelFn(d)))
      .attr('y', d => y(linesKey ? d[linesKey] : 0))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(linesKey ? d[linesKey] : 0))
      .attr('fill', d => severityColor(d.Severity));

    // Value labels
    g.selectAll('.label')
      .data(agg)
      .enter()
      .append('text')
      .attr('x', d => x(labelFn(d)) + x.bandwidth() / 2)
      .attr('y', d => y(linesKey ? d[linesKey] : 0) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '0.95rem')
      .text(d => linesKey && d[linesKey] != null ? d[linesKey].toFixed(1) + '%' : '');
    // Chart title 
    chart.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '1.3rem')
      .text('Coverage (lines%) by Module');

    // Add extra space below the title
    g.attr('transform', `translate(${margin.left},${margin.top + 18})`);

    // Add severity legend below the chart, centered, and not overlapping x-axis labels
    const legendData = [
      { label: 'High', color: '#ef4444' },
      { label: 'Medium', color: '#f59e42' },
      { label: 'Low', color: '#22c55e' }
    ];
    const legendItemWidth = 90;
    const legendItemHeight = 20;
    const legendBoxWidth = legendData.length * legendItemWidth;
    const legendX = (width - legendBoxWidth) / 2;
  const legendY = height + 30;
    const legend = chart.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);
    legend.selectAll('g.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${i * legendItemWidth},0)`)
      .each(function(d, i) {
        d3.select(this)
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 16)
          .attr('height', 16)
          .attr('fill', d.color);
        d3.select(this)
          .append('text')
          .attr('x', 24)
          .attr('y', 12)
          .attr('fill', '#e5e7eb')
          .attr('font-size', '1rem')
          .attr('alignment-baseline', 'middle')
          .text(d.label);
      });
    // Chart area stays the same
    g.attr('transform', `translate(${margin.left},${margin.top + 18})`);
  }