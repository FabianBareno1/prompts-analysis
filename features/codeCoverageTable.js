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
  outer.classList.add('datatable-container');
  // Only show for code coverage section
  const activeBtn = document.querySelector('nav button.active');
  if (!activeBtn || activeBtn.id !== 'code-coverage') return;
  // Load CSV (coverage_by_module.csv) and map/clean data
  const csvPath = 'files/details/coverage_by_module.csv';
  let rows;
  try {
    rows = await d3.csv(csvPath, row => {
      if (!row || Object.values(row).every(v => v === '' || v == null)) return null;
      if (Object.values(row)[0] && Object.values(row)[0].startsWith('//')) return null;
      // Map and clean columns
      return {
        'Module': row['module'],
        'Lines%': (row['lines_percent'] || '').replace('%', ''),
        'Branches%': (row['branches_percent'] || '').replace('%', ''),
        'Functions%': (row['functions_percent'] || '').replace('%', ''),
        'Statements%': (row['statements_percent'] || '').replace('%', '')
      };
    });
    rows = rows.filter(Boolean);
  } catch (err) {
    outer.textContent = 'Error loading coverage_by_module.csv';
    outer.style.display = 'block';
    return;
  }
  if (!rows.length) {
    outer.textContent = 'No data found in coverage_by_module.csv';
    outer.style.display = 'block';
    return;
  }
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
  // Initialize DataTables with mapped/cleaned columns
  $(tbl).DataTable({
    data: rows,
    columns: [
      { title: 'Module', data: 'Module' },
      { title: 'Lines%', data: 'Lines%' },
      { title: 'Branches%', data: 'Branches%' },
      { title: 'Functions%', data: 'Functions%' },
      { title: 'Statements%', data: 'Statements%' }
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
        targets: [0, 1, 2, 3, 4],
        columnControl: ['order', ['searchList']],
        columnControlPlacement: 'right'
      }
    ],
    ordering: {
      indicators: false,
      handler: false
    }
  });
  outer.style.display = 'block';
}
