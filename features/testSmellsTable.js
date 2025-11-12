/**
 * Render summary table for Test Smells
 * @returns {Promise<void>}
 */
export async function renderTestSmellsSummaryTable() {
  const outer = document.getElementById('summary-table-container');
  if (!outer) return;
  // Remove any existing table to avoid duplicates
  while (outer.firstChild) outer.removeChild(outer.firstChild);
  outer.style.display = 'none';
  outer.classList.add('datatable-container');
  // Only show for Test Smells section
  const activeBtn = document.querySelector('nav button.active');
  if (!activeBtn || activeBtn.id !== 'test-smells') return;
  // Load CSV
  const csvPath = 'files/details/TestSmells.csv';
  let data;
  try {
    data = await d3.csv(csvPath, row => {
      if (!row || Object.values(row).every(v => v === '' || v == null)) return null;
      if (Object.values(row)[0] && Object.values(row)[0].startsWith('//')) return null;
      return row;
    });
    data = data.filter(Boolean);
  } catch (err) {
    outer.textContent = 'Error loading TestSmells.csv';
    outer.style.display = 'block';
    return;
  }
  if (!data.length) {
    outer.textContent = 'No data found in TestSmells.csv';
    outer.style.display = 'block';
    return;
  }
  // Group by module and calculate sums
  const grouped = d3.group(data, d => d.Module);
  const rows = Array.from(grouped, ([Module, items]) => {
    const sum = col => items.reduce((acc, r) => acc + (parseInt(r[col]) || 0), 0);
    return {
      Module,
      'High': sum('Count_High'),
      'Medium': sum('Count_Medium'),
      'Low': sum('Count_Low'),
      'Total Smells': sum('Count_High') + sum('Count_Medium') + sum('Count_Low'),
      'Files Inspected': items.length
    };
  });
  // Dedicated mount point so the wrapper lives *inside* it
  let mount = document.getElementById('testsmells-datatable');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'testsmells-datatable';
    outer.appendChild(mount);
  }
  // Start fresh inside the mount
  mount.innerHTML = '';
  // Create the table node
  const tbl = document.createElement('table');
  tbl.id = 'testsmells-table';
  tbl.className = 'display';
  tbl.style.width = '100%';
  mount.appendChild(tbl);
  // Initialize DataTables con opciones igual a code coverage
  $(tbl).DataTable({
    data: rows,
    columns: [
      { title: 'Module', data: 'Module' },
      { title: '🔴 High', data: 'High' },
      { title: '🟠 Medium', data: 'Medium' },
      { title: '🟢 Low', data: 'Low' },
      { title: 'Total Smells', data: 'Total Smells' },
      { title: 'Files Inspected', data: 'Files Inspected' }
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
