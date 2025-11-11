/**
 * Render summary table for Code Coverage
 * @returns {Promise<void>}
 */
export async function renderCodeCoverageSummaryTable() {
  const outer = document.getElementById('summary-table-container');
  if (!outer) return;
  // Remove any existing table to avoid duplicates
  while (outer.firstChild) outer.removeChild(outer.firstChild);
  outer.style.display = 'none';
  // Only show for code coverage section
  const activeBtn = document.querySelector('nav button.active');
  if (!activeBtn || activeBtn.id !== 'code-coverage') return;
  // Load CSV
  const csvPath = 'files/details/CodeCoverage.csv';
  let data;
  try {
    data = await d3.csv(csvPath, row => {
      if (!row || Object.values(row).every(v => v === '' || v == null)) return null;
      if (Object.values(row)[0] && Object.values(row)[0].startsWith('//')) return null;
      return row;
    });
    data = data.filter(Boolean);
  } catch (err) {
    outer.textContent = 'Error loading CodeCoverage.csv';
    outer.style.display = 'block';
    return;
  }
  if (!data.length) {
    outer.textContent = 'No data found in CodeCoverage.csv';
    outer.style.display = 'block';
    return;
  }
  // Group by module and calculate averages
  const grouped = d3.group(data, d => d.Module);
  const rows = Array.from(grouped, ([Module, items]) => {
    const getAvg = col => {
      const vals = items.map(r => parseFloat(r[col].replace(',', '.'))).filter(v => !isNaN(v));
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    };
    return {
      Module,
      'Lines%': getAvg('Lines%').toFixed(2),
      'Branches%': getAvg('Branches%').toFixed(2),
      'Functions%': getAvg('Functions%').toFixed(2),
      'Statements%': getAvg('Statements%').toFixed(2),
      Files: items.length
    };
  });
  // Dedicated mount point so the wrapper lives *inside* it
  let mount = document.getElementById('codecoverage-datatable');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'codecoverage-datatable';
    outer.appendChild(mount);
  }
  // Start fresh inside the mount
  mount.innerHTML = '';
  // Create the table node
  const tbl = document.createElement('table');
  tbl.id = 'codecoverage-table';
  tbl.className = 'display';
  tbl.style.width = '100%';
  mount.appendChild(tbl);
  // Initialize DataTables con opciones igual a seguridad
  $(tbl).DataTable({
    data: rows,
    columns: [
      { title: 'Module', data: 'Module' },
      { title: 'Lines%', data: 'Lines%' },
      { title: 'Branches%', data: 'Branches%' },
      { title: 'Functions%', data: 'Functions%' },
      { title: 'Statements%', data: 'Statements%' },
      { title: 'Files', data: 'Files' }
    ],
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100, 200],
    order: [],
    scrollX: true,
    scrollY: '400px',
    scrollCollapse: true,
    autoWidth: false,
    destroy: true,
    deferRender: true,
      columnControl: ['order', ['search']],
      columnDefs: [
        {
          targets: [0, 1, 2, 3, 4, 5],
          columnControl: ['order', ['searchList']]
        }
      ],
      ordering: {
        indicators: false,
        handler: false
      }
  });
  outer.style.display = 'block';
}
