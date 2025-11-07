/**
 * Draws a grouped bar chart for category/subcategory counts.
 * @param {d3.Selection} chart - D3 selection of the container.
 * @param {Array<Object>} data - Original CSV data.
 * @param {number} width - Chart width.
 * @param {number} height - Chart height.
 * @param {d3.ScaleOrdinal} colorScale - D3 color scale.
 * @param {string} title - Chart title.
 */


/**
 * Draws a two-level donut chart (category and subcategory).
 * @param {d3.Selection} chart - D3 selection of the container.
 * @param {Array<Object>} data - Original CSV data.
 * @param {number} width - Chart width.
 * @param {number} height - Chart height.
 * @param {d3.ScaleOrdinal} colorScale - D3 color scale.
 * @param {string} title - Chart title.
 */
export function drawNestedPieChart(chart, data, width, height, colorScale, title) {
  chart.selectAll('svg').remove();
  if (!width || !height) {
    const bounds = chart.node().getBoundingClientRect();
    width = bounds.width || 650;
    height = bounds.height || 600;
  }
  const svg = chart.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  const radius = Math.min(width, height) / 2 - 40;
  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2 + 40})`);

  // Aggregate counts by category and subcategory
  const nested = d3.rollups(
    data,
    v => v.length,
    d => d.Category,
    d => d.Subcategory
  );

  // Convert to d3 hierarchy format
  const hierarchyData = {
    name: 'root',
    children: nested.map(([category, subcats]) => ({
      name: category,
      children: subcats.map(([subcat, count]) => ({ name: subcat, value: count }))
    }))
  };
  const root = d3.hierarchy(hierarchyData)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  // Partition layout for sunburst/donut
  const partition = d3.partition()
    .size([2 * Math.PI, radius]);
  partition(root);

  // Color by category (level 1)
  const categoryNames = Array.from(new Set(data.map(d => d.Category)));
  const categoryColor = d3.scaleOrdinal().domain(categoryNames).range(d3.schemeTableau10);

  // Draw arcs
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.depth === 1 ? radius * 0.45 : radius * 0.7)
    .outerRadius(d => d.depth === 1 ? radius * 0.7 : radius);

  g.selectAll('path')
    .data(root.descendants().filter(d => d.depth > 0))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => d.depth === 1 ? categoryColor(d.data.name) : colorScale(d.parent.data.name + '-' + d.data.name))
    .attr('stroke', '#222')
    .attr('stroke-width', 1.5)
    .on('mouseover', function (event, d) {
      d3.select(this).attr('opacity', 0.7);
    })
    .on('mouseout', function () {
      d3.select(this).attr('opacity', 1);
    });

  // Category labels (center ring)
  g.selectAll('text.category-label')
    .data(root.children)
    .enter()
    .append('text')
    .attr('class', 'category-label')
    .attr('transform', d => {
      const angle = ((d.x0 + d.x1) / 2) * 180 / Math.PI - 90;
      const r = (radius * 0.45 + radius * 0.7) / 2;
      return `rotate(${angle}) translate(${r},0) rotate(${angle > 90 ? 180 : 0})`;
    })
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .text(d => `${d.data.name} (${d.value})`);

  // Subcategory labels (outer ring)
  g.selectAll('text.subcategory-label')
    .data(root.leaves())
    .enter()
    .append('text')
    .attr('class', 'subcategory-label')
    .attr('transform', d => {
      const angle = ((d.x0 + d.x1) / 2) * 180 / Math.PI - 90;
      const r = (radius * 0.7 + radius) / 2;
      return `rotate(${angle}) translate(${r},0) rotate(${angle > 90 ? 180 : 0})`;
    })
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '0.9rem')
    .text(d => `${d.data.name} (${d.value})`);

  // Central label (title)
  g.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1.3rem')
    .attr('font-weight', 'bold')
    .text(title);
}
// Common chart rendering and aggregation helpers for all dashboard sections

export function drawBarChart(chart, labels, values, width, height, colorScale, title, xLabel, yLabel, showValueLabels = true, valueLabelFormatter, tooltipFormatter = undefined) {
  if (!width || !height) {
    const bounds = chart.node().getBoundingClientRect();
    width = bounds.width || 650;
    height = bounds.height || 600;
  }
  // Improved mobile chart height and margin logic
  let margin;
  if (width < 500) {
    height = Math.max(height, 400);
    let extraBottom = labels.length > 12 ? 28 : 0;
    margin = { top: 100, right: 10, bottom: 100 + extraBottom, left: 10 };
  } else if (width < 700) {
    margin = { top: 80, right: 18, bottom: 150, left: 38 };
  } else {
    margin = { top: 80, right: 30, bottom: 120, left: 60 };
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
        .html(tooltipFormatter ? tooltipFormatter(d, xLabel, yLabel) : `<b>${xLabel}:</b> ${d.label}<br><b>${yLabel}:</b> ${d.value}`);
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
  if (showValueLabels) {
    g.selectAll('.label')
      .data(labels.map((d, i) => ({ label: d, value: values[i] })))
      .enter()
      .append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', width < 500 ? '0.65rem' : width < 700 ? '0.8rem' : '0.9rem')
      .text(d => valueLabelFormatter ? valueLabelFormatter(d.value) : d.value);
  }
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
  // Add extra vertical space below the title (e.g., 40px instead of 20)
  const g = chart.append('g').attr('transform', `translate(${width / 2},${height / 2 + 40})`);
  const pie = d3.pie().value(d => d.value);
  // Aggregate small portions into "Other"
  const threshold = 2; // Define the threshold for small portions
  const aggregatedData = labels.map((label, i) => ({ label, value: values[i] }));
  const smallPortions = aggregatedData.filter(d => d.value <= threshold);
  const otherValue = smallPortions.reduce((sum, d) => sum + d.value, 0);
  const filteredData = aggregatedData.filter(d => d.value > threshold);

  if (otherValue > 0) {
      filteredData.push({ label: 'Other', value: otherValue });
  }

  const arcs = pie(filteredData);
  // Calculate total count to convert slice values into percentages
  const totalCount = filteredData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  const arcGenerator = d3.arc().innerRadius(radius * 0.45).outerRadius(radius);
  const outerArc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius * 0.85); // Reduced radius for better fit

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
    .attr('transform', function(d) {
      // Place label just outside the arc
      const pos = d3.arc().innerRadius(radius * 1.05).outerRadius(radius * 1.15).centroid(d);
      return `translate(${pos[0]},${pos[1]})`;
    })
    .attr('text-anchor', function(d) {
      // Place anchor based on angle
      const midAngle = (d.startAngle + d.endAngle) / 2;
      return midAngle < Math.PI ? 'start' : 'end';
    })
    .attr('fill', '#e5e7eb')
    .attr('font-size', '1rem')
    .attr('font-weight', 'bold')
    .text(d => {
      const count = Number(d.data.value) || 0;
      const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
      return `${d.data.label}: ${pct.toFixed(1)}%`;
    });
  chart.append('text')
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

/**
 * Draws a stacked bar chart by category/subcategory.
 * @param {d3.Selection} chart - D3 selection of the container.
 * @param {Array<Object>} data - Original CSV data.
 * @param {number} width - Chart width.
 * @param {number} height - Chart height.
 * @param {d3.ScaleOrdinal} colorScale - D3 color scale.
 * @param {string} title - Chart title.
 */
export function drawStackedBarChart(chart, data, width, height, colorScale, title) {
  console.log('[StackedBar] Datos recibidos:', data);
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[StackedBar] No hay datos para graficar');
  }
  if (!data[0] || !('Category' in data[0]) || !('Subcategory' in data[0])) {
    console.warn('[StackedBar] Faltan columnas Category/Subcategory en los datos:', data[0]);
  }
  console.log('[StackedBar] chart:', chart);
  console.log('[StackedBar] width/height:', width, height);
    chart.selectAll('svg').remove();
    console.log('[StackedBar] SVG removido, creando nuevo...');
    if (!width || !height) {
      const bounds = chart.node().getBoundingClientRect();
      width = bounds.width || 650;
      height = bounds.height || 600;
    }
  // Group by category and subcategory
    const nested = d3.rollups(
      data,
      v => v.length,
      d => d.Category,
      d => d.Subcategory
    );
    const categories = nested.map(([cat]) => cat);
    const subcategories = Array.from(new Set(
      nested.flatMap(([cat, subcats]) => subcats.map(([subcat]) => subcat))
    ));
  // Build data for stacking
    const stackedData = categories.map(cat => {
      const subcatMap = new Map(nested.find(([c]) => c === cat)[1]);
      const obj = { category: cat };
      subcategories.forEach(subcat => {
        obj[subcat] = subcatMap.get(subcat) || 0;
      });
      return obj;
    });
  // D3 stack configuration
    const stack = d3.stack()
      .keys(subcategories)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);
    const series = stack(stackedData);
  // Margin and dimensions
    const legendWidth = 180;
    const margin = { top: 50, right: legendWidth + 80, bottom: 100, left: 60 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const svg = chart.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    console.log('[StackedBar] SVG creado:', svg);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  // Scales
    const x = d3.scaleBand()
      .domain(categories)
      .range([0, w])
      .padding(0.18);
    const y = d3.scaleLinear()
      .domain([0, d3.max(stackedData, d => d3.sum(subcategories, k => d[k])) || 1])
      .nice()
      .range([h, 0]);
  // Draw stacked bars
    g.selectAll('g.layer')
      .data(series)
      .enter()
      .append('g')
      .attr('class', 'layer')
      .attr('fill', (d, i) => colorScale(subcategories[i]))
      .selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', d => x(d.data.category))
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]))
      .attr('width', x.bandwidth())
      .attr('opacity', 0.92);
    console.log('[StackedBar] Barras apiladas dibujadas');
  // Value labels (optional, only total)
    g.selectAll('text.stacked-label')
      .data(stackedData)
      .enter()
      .append('text')
      .attr('class', 'stacked-label')
      .attr('x', d => x(d.category) + x.bandwidth() / 2)
      .attr('y', d => y(d3.sum(subcategories, k => d[k])) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', width < 500 ? '0.65rem' : width < 700 ? '0.8rem' : '0.9rem')
      .text(d => d3.sum(subcategories, k => d[k]));
  // X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', width < 500 ? '0.7rem' : width < 700 ? '0.85rem' : '0.95rem')
      .attr('transform', null)
      .style('text-anchor', 'middle');
  // Y axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', '#e5e7eb')
      .attr('font-size', width < 500 ? '0.7rem' : width < 700 ? '0.85rem' : '0.95rem');
  // Chart title
    // Move title further left for better centering
    svg.append('text')
      .attr('x', width / 2 - 80)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', width < 500 ? '0.9rem' : width < 700 ? '1rem' : '1.1rem')
      .text(title);
    // Legend (improved layout for long labels)
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - legendWidth + 10},${margin.top})`);
    subcategories.forEach((subcat, i) => {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', i * 32)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', colorScale(subcat));
      // Text wrapping for legend labels
      const maxLineLength = 18; // characters per line
      const words = subcat.split(' ');
      let lines = [];
      let currentLine = '';
      words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length > maxLineLength) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += ' ' + word;
        }
      });
      if (currentLine) lines.push(currentLine.trim());
      const text = legend.append('text')
        .attr('x', 26)
        .attr('y', i * 32 + 14)
        .attr('fill', '#e5e7eb')
        .attr('font-size', '1.05rem')
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'middle');
      lines.forEach((line, idx) => {
        text.append('tspan')
          .attr('x', 26)
          .attr('y', i * 32 + 14 + idx * 16)
          .text(line);
      });
    });
  }
