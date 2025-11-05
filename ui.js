import { hideHeatmap, hideCommitsBarCharts } from './uiHelpers.js';
import {
  tryLoadServerCSV,
  loadData,
  updateChartTypeSelectorVisibility
} from './index.js';

const SECTIONS = ['code-coverage', 'test-smells', 'security-posture', 'semantic-bug-detection'];

const chartTypeSelectors = {};
SECTIONS.forEach(type => {
	chartTypeSelectors[type] = document.getElementById(`${type}-chart-type`);
});
// Only expose chartTypeSelectors globally for dashboard.js compatibility
window.chartTypeSelectors = chartTypeSelectors;

export function showAdvancedOptionsForSection(section) {
	// Show only the selected section's advanced options
	SECTIONS.forEach(type => {
		const group = document.getElementById(type + '-upload');
		if (group) group.style.display = (type === section) ? 'flex' : 'none';
		// Always show chart type selector for the active section
		if (chartTypeSelectors[type]) {
			chartTypeSelectors[type].style.display = (type === section) ? 'inline-block' : 'none';
			chartTypeSelectors[type].style.float = (type === section) ? 'right' : '';
			chartTypeSelectors[type].style.marginLeft = (type === section) ? 'auto' : '';
		}
	});
}
window.showAdvancedOptionsForSection = showAdvancedOptionsForSection;



const buttons = document.querySelectorAll('nav button');
buttons.forEach(btn => {
	btn.addEventListener('click', () => {
        hideHeatmap();
        hideCommitsBarCharts();

		buttons.forEach(b => {
			b.classList.remove('active');
			b.setAttribute('aria-pressed', 'false');
		});
		btn.classList.add('active');
		btn.setAttribute('aria-pressed', 'true');
	showAdvancedOptionsForSection(btn.id);
		updateChartTypeSelectorVisibility();
		const chartType = (chartTypeSelectors[btn.id] && chartTypeSelectors[btn.id].value) ? chartTypeSelectors[btn.id].value : undefined;
		loadData(btn.id, chartType);
	});
});

// No file input logic needed

Object.keys(chartTypeSelectors).forEach(type => {
	chartTypeSelectors[type].addEventListener('change', () => {
		const activeBtn = document.querySelector('nav button.active');
		if (activeBtn && activeBtn.id === type && chartTypeSelectors[type].value) {
			loadData(type, chartTypeSelectors[type].value);
		}
	});
});

showAdvancedOptionsForSection('code-coverage');
tryLoadServerCSV('code-coverage');
