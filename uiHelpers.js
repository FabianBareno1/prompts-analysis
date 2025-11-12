export const LEGEND_SEVERITY_OPTIONS = {
  legendId: 'legend',
  legendData: [
    { label: 'High', color: '#ef4444' },
    { label: 'Medium', color: '#f59e42' },
    { label: 'Low', color: '#22c55e' }
  ],
  chartAreaId: 'chart-area',
  margin: '-30px 0 0 0',
  padding: '0 0 10px 0'
};

export function truncateLabel(label, maxLen = 18) {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
}

export function renderLegendHTML({ legendId, legendData, chartAreaId, margin = '-30px 0 0 0', padding = '0 0 10px 0' }) {
  setTimeout(() => {
    let legendDiv = document.getElementById(legendId);
    const chartArea = document.getElementById(chartAreaId);
    if (!legendDiv) {
      legendDiv = document.createElement('div');
      legendDiv.id = legendId;
      legendDiv.style.display = 'flex';
      legendDiv.style.justifyContent = 'center';
      legendDiv.style.gap = '1.5rem';
      legendDiv.style.margin = margin;
      legendDiv.style.padding = padding;
      if (chartArea) {
        chartArea.appendChild(legendDiv);
      } else {
        document.body.appendChild(legendDiv);
      }
    } else {
      legendDiv.innerHTML = '';
      if (chartArea && legendDiv.parentNode !== chartArea) {
        chartArea.appendChild(legendDiv);
      }
    }
    while (legendDiv.firstChild) legendDiv.removeChild(legendDiv.firstChild);
    legendData.forEach(item => {
      const itemSpan = document.createElement('span');
      itemSpan.style.display = 'flex';
      itemSpan.style.alignItems = 'center';
      itemSpan.style.gap = '0.5em';
      itemSpan.style.fontSize = '1rem';

      const colorBox = document.createElement('span');
      colorBox.style.display = 'inline-block';
      colorBox.style.width = '16px';
      colorBox.style.height = '16px';
      colorBox.style.background = item.color;
      colorBox.style.borderRadius = '3px';
      colorBox.style.marginRight = '2px';

      const labelSpan = document.createElement('span');
      labelSpan.style.color = '#e5e7eb';
      labelSpan.textContent = item.label;

      itemSpan.appendChild(colorBox);
      itemSpan.appendChild(labelSpan);
      legendDiv.appendChild(itemSpan);
    });
  }, 0);
}/**
 * Renders the heatmap for Regression Risk section.
 */
export function renderHeatmap() {
  const heatmapContainer = document.getElementById(SELECTORS.heatmapContainer);
  if (!heatmapContainer) return;
  heatmapContainer.style.display = 'block';
  heatmapContainer.innerHTML = '';
  generateModuleHeatmapData().then(renderModuleHeatmapBarScaleLinear);
}

const SECTION_IDS = ['regression-risk', 'unit-testing', 'security-posture', 'semantic-bug-detection'];

// UI element selectors
const SELECTORS = {
  chartArea: 'chart-area',
  heatmapContainer: 'heatmap-container',
  mainChart: 'chart',
  commitsBarCharts: 'commits-bar-charts',
  weekBar: 'commits-week-bar',
  monthBar: 'commits-month-bar',
};

/**
 * Attaches section switching logic and ensures heatmap/bar charts are shown only for Regression Risk.
 */
export function showHeatmapIfNeeded() {
  SECTION_IDS.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => updateDashboardUI(id));
  });
}

/**
 * Renders the commit bar charts for Regression Risk section.
 * Loads data from CSV files and displays two bar charts.
 */
export async function renderCommitsBarCharts() {
  const chartArea = document.getElementById(SELECTORS.chartArea);
  if (!chartArea) return;
  hideCommitsBarCharts();
  // Create the container
  const container = document.createElement('div');
  container.id = SELECTORS.commitsBarCharts;
  container.style.width = '100%';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '2rem';
  container.style.marginBottom = '1.5rem';
  // Week bar
  const weekBar = document.createElement('div');
  weekBar.id = SELECTORS.weekBar;
  weekBar.style.width = '100%';
  weekBar.style.minWidth = '350px';
  weekBar.style.height = '340px';
  weekBar.style.marginBottom = '2rem';
  container.appendChild(weekBar);
  // Month bar
  const monthBar = document.createElement('div');
  monthBar.id = SELECTORS.monthBar;
  monthBar.style.width = '100%';
  monthBar.style.minWidth = '350px';
  monthBar.style.height = '340px';
  container.appendChild(monthBar);
  // Insert the bar charts just before the heatmap
  const heatmap = document.getElementById(SELECTORS.heatmapContainer);
  if (heatmap) {
    chartArea.insertBefore(container, heatmap);
  } else {
    chartArea.appendChild(container);
  }
  // Render the charts
  const weekResp = await fetch('./files/details/commits_by_week.csv');
  const weekText = await weekResp.text();
  const weekData = parseCSV(weekText).filter(d => d.week && d.commits);
  const weekLabels = weekData.map(d => d.week);
  const weekValues = weekData.map(d => Number(d.commits));
  renderBarChart('#' + SELECTORS.weekBar, weekLabels, weekValues, 'Commits per Week', 'Week', 'Commits');
  const monthResp = await fetch('./files/details/commits_by_month.csv');
  const monthText = await monthResp.text();
  const monthData = parseCSV(monthText).filter(d => d.month && d.commits);
  const monthLabels = monthData.map(d => d.month);
  const monthValues = monthData.map(d => Number(d.commits));
  renderBarChart('#' + SELECTORS.monthBar, monthLabels, monthValues, 'Commits per Month', 'Month', 'Commits');
}

/**
 * Hides the commit bar charts container if present.
 */
export function hideCommitsBarCharts() {
  const chartArea = document.getElementById(SELECTORS.chartArea);
  if (!chartArea) return;
  const container = document.getElementById(SELECTORS.commitsBarCharts);
  if (container && container.parentNode === chartArea) {
    chartArea.removeChild(container);
  }
}

/**
 * Renders a bar chart in the specified container.
 * @param {string} containerSelector - CSS selector for the chart container.
 * @param {string[]} labels - Array of labels for the x-axis.
 * @param {number[]} values - Array of values for the y-axis.
 * @param {string} title - Chart title.
 * @param {string} xLabel - X-axis label.
 * @param {string} yLabel - Y-axis label.
 */
function renderBarChart(containerSelector, labels, values, title, xLabel, yLabel) {
  const container = d3.select(containerSelector);
  container.selectAll('*').remove();
  let width = container.node().clientWidth || 350;
  const height = container.node().clientHeight || 400;
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);
  const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(values)]).nice().range([h, 0]);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  // Reduce x-axis label density only if there are many bars
  let showLabelEvery = 1;
  const isMobile = width < 800;
  if (isMobile) {
    showLabelEvery = labels.length > 20 ? 5 : 1;
  } else if (labels.length > 20) {
    showLabelEvery = Math.ceil(labels.length / 20);
  }
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat((d, i) => (i % showLabelEvery === 0 ? d : '')))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '0.95rem')
    .attr('transform', 'rotate(-25)')
    .style('text-anchor', 'end');
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '0.95rem');
  // Add custom tooltip for bars
  // Create tooltip div (once per chart)
  let tooltip = d3.select('body').select('.bar-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div')
      .attr('class', 'bar-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'rgba(30,41,59,0.97)')
      .style('color', '#e5e7eb')
      .style('padding', '7px 13px')
      .style('border-radius', '7px')
      .style('font-size', '1rem')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.18)')
      .style('z-index', '9999')
      .style('display', 'none');
  }
  g.selectAll('.bar')
    .data(labels.map((d, i) => ({ label: d, value: values[i] })))
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => h - y(d.value))
    .attr('fill', (d, i) => d3.schemeTableau10[i % 10])
    .on('mouseover', function(event, d) {
      tooltip.style('display', 'block')
        .html(`<b>${xLabel}:</b> ${d.label}<br><b>${yLabel}:</b> ${d.value}`);
      d3.select(this).attr('opacity', 0.8);
    })
    .on('mousemove', function(event) {
      tooltip.style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('display', 'none');
      d3.select(this).attr('opacity', 1);
    });
  g.selectAll('.label')
    .data(labels.map((d, i) => ({ label: d, value: values[i] })))
    .enter()
    .append('text')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.value) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '0.9rem')
    .text(d => d.value);
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.1rem')
    .text(title);
}

// Helper to parse CSV (simple, no external libraries)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      // Parse 'churn' as a number, keep other fields as string
      if (h.toLowerCase() === 'churn') {
        const num = Number(values[i]);
        obj[h] = (!isNaN(num) && values[i] !== '') ? num : 0;
      } else {
        obj[h] = values[i];
      }
    });
    return obj;
  });
}

export async function generateModuleHeatmapData() {
  const response = await fetch('./files/details/generated_output.ndjson');
  const rawText = await response.text();
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);

  const records = lines.map(l => {
    const clean = l.replace(/,+\s*$/,'');
    try { return JSON.parse(clean); } catch (e) { return null; }
  }).filter(Boolean);
  if (!records.length) {
    return { modules: [], months: [], churnMatrix: [] };
  }
  const months = records.map(r => r.Month);
  const modules = Array.from(new Set(records.flatMap(r => Object.keys(r).filter(k => k !== 'Month'))));

  const churnMatrix = modules.map(mod => months.map((m,i) => {
    const rec = records[i];
    const v = rec[mod];
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  }));
  return { modules, months, churnMatrix };
}

/**
 * Updates the dashboard UI based on the selected section.
 * Only renders commit bar charts and heatmap for Regression Risk.
 * @param {string} sectionId - The id of the selected section.
 */
export function updateDashboardUI(sectionId) {
  hideCommitsBarCharts();
  hideHeatmap();
  const mainChart = document.getElementById(SELECTORS.mainChart);
  if (sectionId === 'regression-risk') {
    if (mainChart) mainChart.style.display = 'none';
    renderCommitsBarCharts();
    renderHeatmap();
  } else {
    if (mainChart) mainChart.style.display = '';
  }
}

/**
 * Hides the heatmap container if present.
 */
export function hideHeatmap() {
  const heatmapContainer = document.getElementById(SELECTORS.heatmapContainer);
  if (!heatmapContainer) return;
  heatmapContainer.style.display = 'none';
  heatmapContainer.innerHTML = '';
}

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

export function renderModuleHeatmapBarScaleLinear({ modules, months, churnMatrix }) {
  const container = d3.select('#heatmap-container');
  container.selectAll('*').remove();
  const margin = { top: 40, right: 80, bottom: 40, left: 100 };
  const width = (container.node().clientWidth || 2000) - margin.left - margin.right;
  const height = (container.node().clientHeight || 600) - margin.top - margin.bottom;
  const maxChurn = churnMatrix.length ? d3.max(churnMatrix.flat()) : 0;
  const colorSteps = 5;
  // Step values: 0, 1/49, 2/49, ..., 49/49 of maxChurn
  const stepValues = Array.from({length: colorSteps}, (_, i) => i * maxChurn / (colorSteps - 1));
  // Build color range: white for 0, then interpolate greens for the rest
  const colorRange = ['#fff', ...Array.from({length: colorSteps - 1}, (_, i) => d3.interpolateGreens((i + 1) / (colorSteps - 1)))];
  const colorScale = d3.scaleOrdinal()
    .domain(stepValues)
    .range(colorRange);
  const totalWidth = width + margin.left + margin.right;
  const totalHeight = height + margin.top + margin.bottom;
  
    const svg = container.append("svg")
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('text')
    .attr('x', totalWidth / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.1rem')
    .text('Heatmap');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        var x0 = d3.scaleBand()
            .rangeRound([0, width])
            .paddingInner(0.1);

        var x1 = d3.scaleBand()
            .padding(0.05);

        var y = d3.scaleLinear()
            .rangeRound([height, 0]);

        var colorValues = ['#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948','#B07AA1','#FF9DA7','#9C755F','#BAB0AC'];
        var z = d3.scaleOrdinal()
            .range(colorValues);

    var data = months.map((month, mi) => {
      const row = { Month: month };
      modules.forEach((mod, idx) => { row[mod] = churnMatrix[idx][mi]; });
      return row;
    });
    var keys = modules.slice();
       
        // x-axis grouping is called here
  x0.domain(months);
        x1.domain(keys).rangeRound([0, x0.bandwidth()]);
    y.domain([
      0,
  d3.max(data, function (d) { return d3.max(keys, function (key) { return (d[key] ?? 0); }); }) || 0
    ]).nice();

    let tooltip = d3.select('body').select('.heatmap-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'heatmap-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(30,41,59,0.97)')
        .style('color', '#e5e7eb')
        .style('padding', '7px 13px')
        .style('border-radius', '7px')
        .style('font-size', '1rem')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.18)')
        .style('z-index', '9999')
        .style('display', 'none');
    }

    g.append("g")
      .selectAll("g")
      .data(data)
      .enter().append("g")
      .attr("transform", function (d) { return "translate(" + x0(d.Month) + ",0)"; })
      .selectAll("rect")
      .data(function (d) { return keys.map(function (key) { return { key: key, value: (d[key] ?? 0) }; }); })
      .enter().append("rect")
      .attr("x", function (d) { return x1(d.key); })
      .attr("y", function (d) { return y(d.value); })
      .attr("width", x1.bandwidth())
      .attr("height", function (d) { return height - y(d.value); })
      .attr("fill", function (d) { return z(d.key); })
      .on('mouseover', function(event, d) {
        tooltip.style('display', 'block')
          .html(`<b>Module:</b> ${d.key}<br><b>Value:</b> ${d.value}`);
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('display', 'none');
        d3.select(this).attr('opacity', 1);
      });

        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x0));

// Linear
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(null, "s"))
            .append("text")
            .attr("x", 2)
            .attr("y", y(y.ticks().pop()) + 0.5)
            .attr("dy", "0.32em")
            .attr("fill", "#fff")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .text("Churn"); // Y-Axis is named here
            
        var legend = g.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
            .attr("text-anchor", "end")
            .selectAll("g")
            .data(keys.slice().reverse())
            .enter().append("g")
            .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
            .attr("x", width - 19)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", z);

        legend.append("text")
          .attr("x", width + 4)
          .attr("y", 9.5)
          .attr("dy", "0.32em")
          .attr("fill", "#fff")
          .attr("text-anchor", "start")
          .text(function (d) { return d; });
}

export function renderModuleHeatmapBarScaleLog({ modules, months, churnMatrix }) {
  const container = d3.select('#heatmap-container');
  container.selectAll('*').remove();
  const margin = { top: 40, right: 80, bottom: 40, left: 100 };
  const width = (container.node().clientWidth || 2000) - margin.left - margin.right;
  const height = (container.node().clientHeight || 600) - margin.top - margin.bottom;
  const maxChurn = churnMatrix.length ? d3.max(churnMatrix.flat()) : 0;
  const colorSteps = 5;
  // Step values: 0, 1/49, 2/49, ..., 49/49 of maxChurn
  const stepValues = Array.from({length: colorSteps}, (_, i) => i * maxChurn / (colorSteps - 1));
  // Build color range: white for 0, then interpolate greens for the rest
  const colorRange = ['#fff', ...Array.from({length: colorSteps - 1}, (_, i) => d3.interpolateGreens((i + 1) / (colorSteps - 1)))];
  const colorScale = d3.scaleOrdinal()
    .domain(stepValues)
    .range(colorRange);
  // Extra horizontal space reserved for legend so text isn't clipped.
  const legendExtraWidth = 180; // adjust if more space needed
  const totalWidth = width + margin.left + margin.right + legendExtraWidth;
  const totalHeight = height + margin.top + margin.bottom;
  
    const svg = container.append("svg")
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('text')
    .attr('x', totalWidth / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.1rem')
    .text('Heatmap');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        var x0 = d3.scaleBand()
            .rangeRound([0, width])
            .paddingInner(0.1);

        var x1 = d3.scaleBand()
            .padding(0.05);

    // Log scale for Y (churn). Zero values will be mapped to 1 (minimum positive) to avoid log(0).
    var y = d3.scaleLog()
      .rangeRound([height, 0]);

        var colorValues = ['#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948','#B07AA1','#FF9DA7','#9C755F','#BAB0AC'];
        var z = d3.scaleOrdinal()
            .range(colorValues);

    var data = months.map((month, mi) => {
      const row = { Month: month };
      modules.forEach((mod, idx) => { row[mod] = churnMatrix[idx][mi]; });
      return row;
    });
    var keys = modules.slice();
       
        // x-axis grouping is called here
  x0.domain(months);
        x1.domain(keys).rangeRound([0, x0.bandwidth()]);
    const positiveValues2 = data.flatMap(d => keys.map(k => (d[k] ?? 0))).filter(v => v > 0);
    const minLog2 = d3.min(positiveValues2) || 1;
    const maxLog2 = d3.max(positiveValues2) || 1;
    y.domain([minLog2, maxLog2]).nice();

    let tooltip = d3.select('body').select('.heatmap-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'heatmap-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(30,41,59,0.97)')
        .style('color', '#e5e7eb')
        .style('padding', '7px 13px')
        .style('border-radius', '7px')
        .style('font-size', '1rem')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.18)')
        .style('z-index', '9999')
        .style('display', 'none');
    }

    g.append("g")
      .selectAll("g")
      .data(data)
      .enter().append("g")
      .attr("transform", function (d) { return "translate(" + x0(d.Month) + ",0)"; })
      .selectAll("rect")
      .data(function (d) { return keys.map(function (key) { return { key: key, value: (d[key] ?? 0) }; }); })
      .enter().append("rect")
      .attr("x", function (d) { return x1(d.key); })
  .attr("y", function (d) { return y(d.value > 0 ? d.value : minLog2); })
      .attr("width", x1.bandwidth())
  .attr("height", function (d) { return height - y(d.value > 0 ? d.value : minLog2); })
      .attr("fill", function (d) { return z(d.key); })
      .on('mouseover', function(event, d) {
        tooltip.style('display', 'block')
          .html(`<b>Module:</b> ${d.key}<br><b>Value:</b> ${d.value}`);
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('display', 'none');
        d3.select(this).attr('opacity', 1);
      });

        g.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x0));

// Linear
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y)
              .ticks(10, ".2s")) // log scale ticks
            .append("text")
            .attr("x", 2)
            .attr("y", y(y.ticks().pop()) + 0.5)
            .attr("dy", "0.32em")
            .attr("fill", "#fff")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .text("Churn"); // Y-Axis is named here
            
    // Legend moved to right margin (outside bar area) to avoid overlap.
    var legend = g.append("g")
      .attr("class", "legend")
      .attr("font-family", "sans-serif")
      .attr("font-size", 12)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(keys.slice().reverse())
      .enter().append("g")
      .attr("transform", function (d, i) { return "translate(" + (width + 20) + "," + i * 22 + ")"; });

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", z);

        legend.append("text")
          .attr("x", 24)
          .attr("y", 9.5)
          .attr("dy", "0.32em")
          .attr("fill", "#fff")
          .attr("text-anchor", "start")
          .style("white-space", "nowrap")
          .text(function (d) { return d; });
}