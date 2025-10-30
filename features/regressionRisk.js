import { chart, clearError, updateSummaryMarkdown } from '../index.js';
import { renderCommitsBarCharts, renderHeatmap } from '../uiHelpers.js';

export function renderRegressionRiskSection(data, chartType) {
  updateSummaryMarkdown('regression-risk');
  clearError();
  chart.selectAll('*').remove();
  chart.style('display', 'none');

  renderCommitsBarCharts();
  renderHeatmap();
}
