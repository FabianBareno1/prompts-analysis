import { chart, showError, clearError, updateSummaryMarkdown } from '../index.js';
import { hasColumn } from '../dataHelpers.js';
import { drawBarChart, drawPieChart, aggregateByColumn } from '../chartHelpers.js';

export function renderSecurityPostureChart(data, chartType) {
  updateSummaryMarkdown('security-posture');
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
    chartType = 'severity';
  }
  if (chartType === 'severity') {
    if (!hasColumn(data, 'Severity')) { showError('CSV is missing the "Severity" column.'); return; }
    agg = aggregateByColumn(data, 'Severity');
    drawBarChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Items per Severity', 'Severity', 'Count');
  } else if (chartType === 'state') {
    if (!hasColumn(data, 'Maintenance State')) { showError('CSV is missing the "Maintenance State" column.'); return; }
    agg = aggregateByColumn(data, 'Maintenance State');
    drawPieChart(chart, agg.map(d => d.key), agg.map(d => d.count), width, height, colorScale, 'Items per Maintenance State');
  }
}
