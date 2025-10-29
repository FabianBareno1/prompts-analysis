// UI helper functions for the audit dashboard
// All helpers here are UI-specific and stateless

// --- HEATMAP HELPERS ---

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
  // Load the mocked CSV
  const response = await fetch('./files/details/dir_month_churn.csv');
  const text = await response.text();
  const data = parseCSV(text);
  // Axes
  const modules = [...new Set(data.map(d => d.module || d.Module))];
  const months = [...new Set(data.map(d => d.month || d.Month))];
  // Churn matrix
  const churnMatrix = modules.map(mod =>
    months.map(month => {
      const found = data.find(d => (d.module || d.Module) === mod && (d.month || d.Month) === month);
      return found ? Number(found.churn || found.Churn) : 0;
    })
  );
  return { modules, months, churnMatrix };
}


export function renderModuleHeatmap({ modules, months, churnMatrix }) {
  const container = d3.select('#heatmap-container');
  container.selectAll('*').remove();
  const margin = { top: 40, right: 80, bottom: 40, left: 100 };
  const width = (container.node().clientWidth || 900) - margin.left - margin.right;
  const height = (container.node().clientHeight || 400) - margin.top - margin.bottom;
  const cellWidth = width / months.length;
  const cellHeight = height / modules.length;
  // Use the 'churn' field as the value for the heatmap
  // Change color scale to red palette
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([0, d3.max(churnMatrix.flat())]);
  const svg = container.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  // Cells
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

  // X axis (months)
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

  // Y axis (modules)
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

  // Legend
  const legendHeight = 120;
  const legendWidth = 16;
  const legendScale = d3.scaleLinear()
    .domain(colorScale.domain())
    .range([legendHeight, 0]);
  const legendAxis = d3.axisRight(legendScale)
    .ticks(6);
  const legend = svg.append('g')
    .attr('transform', `translate(${width + margin.left + 30},${margin.top})`);
  // Gradient
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

export function showHeatmapIfNeeded() {
  const regressionBtn = document.getElementById('regression-risk');
  const heatmapContainer = document.getElementById('heatmap-container');
  const mainChart = document.getElementById('chart');
  regressionBtn.addEventListener('click', async () => {
    heatmapContainer.style.display = 'block';
    mainChart.style.display = 'block';
    const heatmapData = await generateModuleHeatmapData();
    renderModuleHeatmap(heatmapData);
  });
  ['unit-testing', 'security-posture', 'semantic-bug-detection'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      heatmapContainer.style.display = 'none';
      mainChart.style.display = 'block';
      heatmapContainer.innerHTML = '';
    });
  });
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
