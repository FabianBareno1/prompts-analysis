// Common chart rendering and aggregation helpers for all dashboard sections

export function drawBarChart(chart, labels, values, width, height, colorScale, title, xLabel, yLabel) {
  if (!width || !height) {
    const bounds = chart.node().getBoundingClientRect();
    width = bounds.width || 650;
    height = bounds.height || 600;
  }
  // Improved mobile chart height and margin logic
  let margin;
  if (width < 500) {
    height = Math.max(height, 220);
    let extraBottom = labels.length > 12 ? 18 : 0;
    let extraLeft = labels.some(l => l.length > 8) ? 10 : 0;
    margin = { top: 18, right: 8, bottom: 60 + extraBottom, left: 28 + extraLeft };
  } else if (width < 700) {
    margin = { top: 28, right: 18, bottom: 38, left: 38 };
  } else {
    margin = { top: 40, right: 30, bottom: 60, left: 60 };
  }

  chart.selectAll('svg').remove();

  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(labels)
    .range([0, w])
    .padding(0.18);
  const y = d3.scaleLinear()
    .domain([0, d3.max(values)])
    .range([h, 0]);

  const svg = chart.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // X axis
  const showLabelEvery = Math.ceil(labels.length / Math.max(10, Math.floor(w / 40)));
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat((d, i) => (i % showLabelEvery === 0 ? d : '')))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', width < 500 ? '0.7rem' : width < 700 ? '0.85rem' : '0.95rem')
    .attr('transform', 'rotate(-25)')
    .style('text-anchor', 'end');

  // Y axis
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .attr('fill', '#e5e7eb')
    .attr('font-size', width < 500 ? '0.7rem' : width < 700 ? '0.85rem' : '0.95rem');

  // Tooltip logic
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

  // Bars
  g.selectAll('.bar')
    .data(labels.map((d, i) => ({ label: d, value: values[i] })))
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => h - y(d.value))
    .attr('fill', (d, i) => colorScale(i))
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

  // Value labels
  g.selectAll('.label')
    .data(labels.map((d, i) => ({ label: d, value: values[i] })))
    .enter()
    .append('text')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.value) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', width < 500 ? '0.65rem' : width < 700 ? '0.8rem' : '0.9rem')
    .text(d => d.value);

  // Chart title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', width < 500 ? '0.9rem' : width < 700 ? '1rem' : '1.1rem')
    .text(title);
}

export function drawPieChart(chart, labels, values, width, height, colorScale, title) {
  // Remove previous SVG if any
  chart.selectAll('svg').remove();

  // Get container width if not provided
  if (!width || !height) {
    const bounds = chart.node().getBoundingClientRect();
    width = bounds.width || 650;
    height = bounds.height || 600;
  }

  // Create responsive SVG
  const svg = chart.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const radius = Math.min(width, height) / 2 - 40;
  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2 + 20})`);
  const pie = d3.pie().value(d => d.value);
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
  g.selectAll('text')
    .data(arcs)
    .enter()
    .append('text')
    .attr('transform', d => `translate(${d3.arc().innerRadius(radius * 0.7).outerRadius(radius).centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .text(d => `${d.data.label}: ${d.data.value}`);
  // Chart title
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.3rem')
    .text(title);
}

export function aggregateByColumn(data, column, filterEmpty = false) {
  if (filterEmpty) {
    return Array.from(
      d3.rollup(
        data.filter(row => row[column] && row[column].trim() !== ''),
        v => v.length,
        d => d[column]
      ),
      ([key, count]) => ({ key, count })
    );
  } else {
    return Array.from(
      d3.rollup(
        data,
        v => v.length,
        d => d[column] || d[column.toLowerCase()]
      ),
      ([key, count]) => ({ key, count })
    );
  }
}
