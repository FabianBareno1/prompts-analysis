import { chart, showError, clearError, updateSummaryMarkdown } from '../index.js';
import { hasColumn } from '../dataHelpers.js';
import { drawBarChart, drawPieChart, aggregateByColumn } from '../chartHelpers.js';

export function renderUnitTestingChart(data, chartType) {
  updateSummaryMarkdown('unit-testing');
  clearError();
  chart.selectAll('*').remove();
  chart.style('display', 'block');
  if (!data || data.length === 0) {
    showError('No data available for this section.');
    return;
  }
  const chartArea = document.getElementById('chart-area');
  const width = chartArea ? chartArea.clientWidth - 40 : 600;
  const height = chartArea ? chartArea.clientHeight - 60 : 600;
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  let agg = [];
  if (!chartType) {
    chartType = 'module';
  }
  if (chartType === 'module') {
    if (!hasColumn(data, 'Module')) { showError('CSV is missing the "Module" column.'); return; }
    agg = aggregateByColumn(data, 'Module');
    drawBarChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Tests per Module', 'Module', 'Count');
  } else if (chartType === 'severity') {
    if (!hasColumn(data, 'Severity')) { showError('CSV is missing the "Severity" column.'); return; }
    agg = aggregateByColumn(data, 'Severity');
    drawBarChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Tests per Severity', 'Severity', 'Count');
  } else if (chartType === 'pie') {
    if (!hasColumn(data, 'Module')) { showError('CSV is missing the "Module" column.'); return; }
    agg = aggregateByColumn(data, 'Module');
    drawPieChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Tests Distribution (Pie)');
  }
}
