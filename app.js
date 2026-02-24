// MSP Leadership Dashboard Frontend Logic

const data = window.MSP_DASHBOARD_DATA;

function init() {
  if (!data) {
    console.error("No data found. Please run build_data.py.");
    return;
  }

  updateGlobals();
  renderOverviewTable();
  renderUsersTable();
  renderDevicesTable();
  renderClientsTable();
  renderCharts();
  initTabs();
  initModal();
  initSearch();
  initFilters();
}

function updateGlobals() {
  document.getElementById('totalClients').textContent = data.totalClients;
  document.getElementById('totalUsers').textContent = data.totalUsersLicensed.toLocaleString();
  document.getElementById('totalDevices').textContent = data.totalDevices.toLocaleString();
  document.getElementById('lastUpdated').textContent = `Last update: ${new Date().toLocaleString()}`;
}

function renderOverviewTable() {
  const tbody = document.getElementById('overviewTableBody');
  tbody.innerHTML = '';
  Object.entries(data.perClient).sort((a,b) => b[1].usersCount - a[1].usersCount).forEach(([client, stats]) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${client}</td><td>${stats.usersCount}</td><td>${stats.devicesCount}</td>`;
    tr.addEventListener('click', () => showDetails(client));
    tbody.appendChild(tr);
  });
}

function renderUsersTable(filterText = '', clientFilter = '') {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';
  
  const filtered = data.allUsers.filter(u => {
    const matchesText = !filterText || 
      u.client.toLowerCase().includes(filterText.toLowerCase()) ||
      u.name.toLowerCase().includes(filterText.toLowerCase()) ||
      u.upn.toLowerCase().includes(filterText.toLowerCase()) ||
      u.licenses.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesClient = !clientFilter || u.client === clientFilter;
    
    return matchesText && matchesClient;
  });

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.client}</td><td>${u.name}</td><td>${u.upn}</td><td>${u.licenses}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('usersCountLabel').textContent = `Showing: ${filtered.length} users`;
}

function renderDevicesTable(filterText = '') {
  const tbody = document.getElementById('devicesTableBody');
  tbody.innerHTML = '';
  
  const filtered = data.allDevices.filter(d => {
    return !filterText || 
      d.client.toLowerCase().includes(filterText.toLowerCase()) ||
      d.name.toLowerCase().includes(filterText.toLowerCase()) ||
      d.os.toLowerCase().includes(filterText.toLowerCase());
  });

  filtered.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.client}</td><td>${d.name}</td><td>${d.os}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('devicesCountLabel').textContent = `Showing: ${filtered.length} devices`;
}

function renderClientsTable() {
  const tbody = document.getElementById('clientsTableBody');
  tbody.innerHTML = '';
  Object.entries(data.perClient).sort().forEach(([client, stats]) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `<td>${client}</td><td>${stats.usersCount}</td><td>${stats.devicesCount}</td>`;
    tr.addEventListener('click', () => showDetails(client));
    tbody.appendChild(tr);
  });
}

function renderCharts() {
  const labels = Object.keys(data.perClient).sort((a,b) => data.perClient[b].usersCount - data.perClient[a].usersCount).slice(0, 10);
  const userCounts = labels.map(l => data.perClient[l].usersCount);
  const deviceCounts = labels.map(l => data.perClient[l].devicesCount);

  // Clear existing charts if any
  const chartIds = ['usersChart', 'devicesChart'];
  chartIds.forEach(id => {
    const chartStatus = Chart.getChart(id);
    if (chartStatus !== undefined) chartStatus.destroy();
  });

  new Chart(document.getElementById('usersChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Licensed Users', data: userCounts, backgroundColor: '#3b82f6' }]
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Top 10 Clients by Users' } } }
  });

  new Chart(document.getElementById('devicesChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Devices', data: deviceCounts, backgroundColor: '#10b981' }]
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Devices for Top Clients' } } }
  });
}

function initTabs() {
  const navItems = document.querySelectorAll('nav li');
  const contents = document.querySelectorAll('.tab-content');
  const title = document.getElementById('activeTabTitle');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      navItems.forEach(i => i.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(tab).classList.add('active');
      title.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
    });
  });
}

function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const close = document.getElementById('modalClose');
  close.onclick = () => overlay.style.display = 'none';
  window.onclick = (e) => { if (e.target == overlay) overlay.style.display = 'none'; }
}

function initSearch() {
  document.getElementById('usersSearch').addEventListener('input', (e) => {
    const clientFilter = document.getElementById('usersClientFilter').value;
    renderUsersTable(e.target.value, clientFilter);
  });

  document.getElementById('devicesSearch').addEventListener('input', (e) => {
    renderDevicesTable(e.target.value);
  });
}

function initFilters() {
  const clientSelector = document.getElementById('usersClientFilter');
  const clients = Object.keys(data.perClient).sort();
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    clientSelector.appendChild(opt);
  });

  clientSelector.addEventListener('change', (e) => {
    const searchText = document.getElementById('usersSearch').value;
    renderUsersTable(searchText, e.target.value);
  });
}

function showDetails(client) {
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const userList = document.getElementById('modalUserList');
  const deviceList = document.getElementById('modalDeviceList');

  title.textContent = `Client: ${client}`;
  userList.innerHTML = '';
  deviceList.innerHTML = '';

  const users = data.usersByClient[client] || [];
  const devices = data.devicesByClient[client] || [];

  if (users.length === 0) userList.innerHTML = '<li>No licensed users</li>';
  users.forEach(u => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${u.name}</strong><br><small>${u.upn}</small><br><span style="color:#64748b">${u.licenses}</span>`;
    userList.appendChild(li);
  });

  if (devices.length === 0) deviceList.innerHTML = '<li>No devices</li>';
  devices.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d.name}</strong><br><small>${d.os}</small>`;
    deviceList.appendChild(li);
  });

  overlay.style.display = 'flex';
}

// Global sort function
window.sortTable = function(tableId, colIndex) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.rows);
  
  if (rows.length === 0) return;

  // Determine direction: toggle or default to asc
  let direction = table.dataset.sortDir === 'asc' ? -1 : 1;
  let lastCol = parseInt(table.dataset.sortCol);

  // If clicking a new column, reset to ascending
  if (lastCol !== colIndex) {
    direction = 1;
  }

  table.dataset.sortDir = direction === 1 ? 'asc' : 'desc';
  table.dataset.sortCol = colIndex;

  rows.sort((a, b) => {
    let valA = a.cells[colIndex].innerText.replace(/,/g, '').trim();
    let valB = b.cells[colIndex].innerText.replace(/,/g, '').trim();
    
    // Check if numeric
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (!isNaN(numA) && !isNaN(numB) && valA.match(/^-?\d+(\.\d+)?$/)) {
      return (numA - numB) * direction;
    }
    
    return valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'}) * direction;
  });

  rows.forEach(row => tbody.appendChild(row));
};

init();
