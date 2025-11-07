import { chart, showError, clearError, updateSummaryMarkdown } from '../index.js';
import { hasColumn } from '../dataHelpers.js';
import { drawBarChart, drawPieChart, drawNestedPieChart, drawStackedBarChart, aggregateByColumn } from '../chartHelpers.js';

export function renderSemanticBugDetectionChart(data, chartType) {
  updateSummaryMarkdown('semantic-bug-detection');
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
    agg = aggregateByColumn(data, 'Module', true);
    drawBarChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Issues per Module', 'Module', 'Count');
  } else if (chartType === 'severity') {
    if (!hasColumn(data, 'Severity')) { showError('CSV is missing the "Severity" column.'); return; }
    agg = aggregateByColumn(data, 'Severity', true);
    drawBarChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Issues per Severity', 'Severity', 'Count');
  } else if (chartType === 'category') {
    if (!hasColumn(data, 'Category')) { showError('CSV is missing the "Category" column.'); return; }
    if (!hasColumn(data, 'Subcategory')) { showError('CSV is missing the "Subcategory" column.'); return; }
  drawStackedBarChart(chart, data, width, height, colorScale, 'Issues per Category and Subcategory');
  }
}
