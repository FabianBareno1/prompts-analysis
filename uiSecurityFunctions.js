/**
 * Load and render the security dependencies datatable into the
 * `#datatable-container` element.
 *
 * Behavior and notes:
 * - If `#datatable-container` does not exist the function will early-return
 *   and log a warning.
 * - The function ensures a dedicated mount element with id
 *   `dependencies-datatable` exists inside the container and recreates the
 *   table contents on each call.
 * - It fetches CSV data using `d3.csv` and initializes a DataTables instance
 *   (`#dependencies-table`).
 * - Errors during CSV load are printed to the console and displayed in the
 *   mount node as plain text.
 *
 * @param {string} csvPath - Relative path or URL to the CSV file to load.
 */
export function loadSecurityDatatable(csvPath) {
  const outer = document.getElementById('datatable-container');
  if (!outer) return console.warn('No #datatable-container found');

  // Dedicated mount point so the wrapper lives *inside* it
  let mount = document.getElementById('dependencies-datatable');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'dependencies-datatable';
    outer.appendChild(mount);
  }

  // Start fresh inside the mount
  mount.innerHTML = '';

  // Create the table node
  const tbl = document.createElement('table');
  tbl.id = 'dependencies-table';
  tbl.className = 'display';
  tbl.style.width = '100%';
  mount.appendChild(tbl);

  d3.csv(csvPath).then((data) => {
    if (!data?.length) {
      mount.textContent = 'No data found in ' + csvPath;
      return;
    }

    const columns = Object.keys(data[0]).map(k => ({ title: k, data: k }));

    const dt = $('#dependencies-table').DataTable({
      data,
      columns,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100, 200],
      order: [],
      scrollX: true,
      scrollY: '400px',
      scrollCollapse: true,
      autoWidth: false,
      destroy: true,      // safe re-init if called again
      deferRender: true,
      columnControl: {
        target: 'tfoot',
        content: ['search']
      }
    });
  }).catch(err => {
    console.error('Failed to load ' + csvPath, err);
    mount.textContent = 'Error loading ' + csvPath;
  });

}
