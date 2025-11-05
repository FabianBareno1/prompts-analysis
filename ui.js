import { hideAllChartTypeSelectors } from './uiHelpers.js';
import { hideHeatmap, hideCommitsBarCharts } from './uiHelpers.js';
const SECTIONS = ['code-coverage', 'test-smells', 'security-posture', 'semantic-bug-detection'];


import {
	parseCSVFile,
	tryLoadServerCSV,
	loadData,
	updateChartTypeSelectorVisibility
} from './index.js';

const chartTypeSelectors = {};
SECTIONS.forEach(type => {
	chartTypeSelectors[type] = document.getElementById(`${type}-chart-type`);
});
// Only expose chartTypeSelectors globally for dashboard.js compatibility
window.chartTypeSelectors = chartTypeSelectors;

const fileInputs = {};
SECTIONS.forEach(type => {
	fileInputs[type] = document.getElementById(`${type}-file`);
});

export function showFileInputForSection(section) {
	// Show only the selected section's file input
	SECTIONS.forEach(type => {
		document.getElementById(type + '-upload').style.display = (type === section) ? 'flex' : 'none';
	});
	// Hide all chart type selectors using helper
	hideAllChartTypeSelectors(chartTypeSelectors);
}
// Only expose showFileInputForSection globally for dashboard.js compatibility
window.showFileInputForSection = showFileInputForSection;

const advancedBtns = {};
SECTIONS.forEach(type => {
	advancedBtns[type] = document.getElementById(`${type}-advanced-btn`);
});
Object.keys(advancedBtns).forEach(type => {
	advancedBtns[type].addEventListener('click', () => {
		chartTypeSelectors[type].style.display = (chartTypeSelectors[type].style.display === 'block') ? 'none' : 'block';
	});
});

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
		showFileInputForSection(btn.id);
		updateChartTypeSelectorVisibility();
		const chartType = (chartTypeSelectors[btn.id] && chartTypeSelectors[btn.id].value) ? chartTypeSelectors[btn.id].value : undefined;
		loadData(btn.id, chartType);
	});
});

Object.keys(fileInputs).forEach(type => {
	fileInputs[type].addEventListener('change', (e) => {
		const file = e.target.files[0];
		const chartType = (chartTypeSelectors[type] && chartTypeSelectors[type].value) ? chartTypeSelectors[type].value : undefined;
		parseCSVFile(file, type, chartType);
	});
});

Object.keys(chartTypeSelectors).forEach(type => {
	chartTypeSelectors[type].addEventListener('change', () => {
		const activeBtn = document.querySelector('nav button.active');
		if (activeBtn && activeBtn.id === type && chartTypeSelectors[type].value) {
			loadData(type, chartTypeSelectors[type].value);
		}
	});
});

showFileInputForSection('code-coverage');
tryLoadServerCSV('code-coverage');
