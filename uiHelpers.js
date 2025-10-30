
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
  weekBar.style.height = '260px';
  weekBar.style.marginBottom = '2rem';
  container.appendChild(weekBar);
  // Month bar
  const monthBar = document.createElement('div');
  monthBar.id = SELECTORS.monthBar;
  monthBar.style.width = '100%';
  monthBar.style.minWidth = '350px';
  monthBar.style.height = '260px';
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
  const weekData = parseCSV(weekText).filter(d => d.weeks && d.commits);
  const weekLabels = weekData.map(d => d.weeks);
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
  const height = container.node().clientHeight || 260;
  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);
  const x = d3.scaleBand().domain(labels).range([0, w]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(values)]).nice().range([h, 0]);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  // Reduce x-axis label density: show only every 3rd label if crowded
  const showLabelEvery = (labels.length > 20) ? 3 : 1;
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

/**
 * Loads and prepares heatmap data from CSV.
 */
export async function generateModuleHeatmapData() {
  const response = await fetch('./files/details/dir_month_churn.csv');
  const text = await response.text();
  const data = parseCSV(text);
  const modules = [...new Set(data.map(d => d.module || d.Module))];
  const months = [...new Set(data.map(d => d.month || d.Month))];
  const churnMatrix = modules.map(mod =>
    months.map(month => {
      const found = data.find(d => (d.module || d.Module) === mod && (d.month || d.Month) === month);
      return found ? Number(found.churn || found.Churn) : 0;
    })
  );
  return { modules, months, churnMatrix };
}

/**
 * Renders the module churn heatmap.
 */
export function renderModuleHeatmap({ modules, months, churnMatrix }) {
  const container = d3.select('#heatmap-container');
  container.selectAll('*').remove();
  const margin = { top: 40, right: 80, bottom: 40, left: 100 };
  const width = (container.node().clientWidth || 900) - margin.left - margin.right;
  const height = (container.node().clientHeight || 400) - margin.top - margin.bottom;
  const cellWidth = width / months.length;
  const cellHeight = height / modules.length;
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([0, d3.max(churnMatrix.flat())]);
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  g.selectAll('g')
    .data(churnMatrix)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0,${i * cellHeight})`)
    .selectAll('rect')
    .data((row, i) => row.map((d, j) => ({ churn: d, month: months[j], module: modules[i] })))
    .enter()
    .append('rect')
    .attr('x', (d, j) => j * cellWidth)
    .attr('width', cellWidth)
    .attr('height', cellHeight)
    .attr('fill', d => colorScale(d.churn))
    .append('title')
    .text(d => `Module: ${d.module}\nMonth: ${d.month}\nChurn: ${d.churn}`);
  svg.append('g')
    .attr('transform', `translate(${margin.left},${height + margin.top})`)
    .call(d3.axisBottom(d3.scaleBand().domain(months).range([0, width])))
    .selectAll('text')
    .style('font-size', '10px')
    .attr('transform', 'rotate(-45)')
    .attr('text-anchor', 'end');
  svg.append('text')
    .attr('x', margin.left + width / 2)
    .attr('y', height + margin.top + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .style('font-size', '13px')
    .text('Month');
  svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    .call(d3.axisLeft(d3.scaleBand().domain(modules).range([0, height])))
    .selectAll('text')
    .style('font-size', '10px');
  svg.append('text')
    .attr('transform', `rotate(-90)`)
    .attr('x', -margin.top - height / 2)
    .attr('y', margin.left - 70)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .style('font-size', '13px')
    .text('Module');
  const legendHeight = 120;
  const legendWidth = 16;
  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([legendHeight, 0]);
  const legendAxis = d3.axisRight(legendScale)
    .ticks(6);
  const legend = svg.append('g')
    .attr('transform', `translate(${width + margin.left + 30},${margin.top})`);
  const defs = svg.append('defs');
  const gradientId = 'heatmap-gradient';
  const gradient = defs.append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%').attr('y1', '100%')
    .attr('x2', '0%').attr('y2', '0%');
  for (let i = 0; i <= 100; i++) {
    gradient.append('stop')
      .attr('offset', `${i}%`)
      .attr('stop-color', colorScale(colorScale.domain()[0] + (colorScale.domain()[1] - colorScale.domain()[0]) * i / 100));
  }
  legend.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`);
  legend.append('g')
    .attr('transform', `translate(${legendWidth},0)`)
    .call(legendAxis)
    .selectAll('text')
    .style('font-size', '10px');
  legend.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', legendHeight + 20)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .style('font-size', '12px')
    .text('Churn');
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
 * Renders the heatmap for Regression Risk section.
 */
export function renderHeatmap() {
  const heatmapContainer = document.getElementById(SELECTORS.heatmapContainer);
  if (!heatmapContainer) return;
  heatmapContainer.style.display = 'block';
  heatmapContainer.innerHTML = '';
  generateModuleHeatmapData().then(renderModuleHeatmap);
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
