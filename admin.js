/* ─── Config ─── */
const API = window.FLUI_API || 'http://localhost:3001/api';

function getToken()    { return sessionStorage.getItem('fluiAdminToken'); }
function setToken(t)   { sessionStorage.setItem('fluiAdminToken', t); }
function clearToken()  { sessionStorage.removeItem('fluiAdminToken'); sessionStorage.removeItem('fluiAdminUser'); }

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const DEMO_TOKEN = 'demo-token';
const DEMO_USER  = { name: 'Admin Demo', role: 'admin', email: 'admin@flui.com' };

function isDemoMode() { return getToken() === DEMO_TOKEN; }

async function apiFetch(path, opts = {}) {
  if (isDemoMode()) throw new Error('demo');
  const res  = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ─── DOM refs ─── */
const overlay       = document.getElementById('adminLoginOverlay');
const loginForm     = document.getElementById('adminLoginForm');
const loginError    = document.getElementById('adminLoginError');
const sidebar       = document.getElementById('adminSidebar');
const adminMain     = document.getElementById('adminMain');
const adminTable    = document.getElementById('adminTable');
const stationForm   = document.getElementById('stationForm');
const adminSearch   = document.getElementById('adminSearch');
const reviewsList   = document.getElementById('reviewsList');
const formTitle     = document.getElementById('formTitle');

/* ─── Estado ─── */
let adminStations = [];
let reservChart   = null;

/* ─── Bootstrap ─── */
(async function init() {
  const token = getToken();
  if (token === DEMO_TOKEN) {
    showPanel(DEMO_USER);
    return;
  }
  if (token) {
    try {
      const user = await apiFetch('/auth/me');
      if (user.role !== 'admin') throw new Error('not admin');
      showPanel(user);
    } catch {
      clearToken();
      showOverlay();
    }
  } else {
    showOverlay();
  }
})();

function showOverlay() {
  overlay.classList.remove('hidden');
  sidebar.style.display  = 'none';
  adminMain.style.display = 'none';
}

function showPanel(user) {
  overlay.classList.add('hidden');
  sidebar.style.display   = '';
  adminMain.style.display = '';
  const nameEl = document.getElementById('adminUserName');
  if (nameEl) nameEl.textContent = user.name;
  loadAll();
  initSidebarToggle();
}

/* ─── Mobile sidebar toggle ─── */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebarToggle');
  if (!toggleBtn) return;

  // Create backdrop once
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('visible');
  });

  backdrop.addEventListener('click', closeSidebar);

  // Close sidebar when a nav link is tapped on mobile
  sidebar.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
  }
}

/* ─── Login ─── */
loginForm?.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const btn      = loginForm.querySelector('button[type=submit]');
  btn.textContent = 'Entrando…';
  btn.disabled    = true;
  try {
    /* Modo demo sem backend */
    if (email === 'admin@flui.com' && password === '123456') {
      setToken(DEMO_TOKEN);
      sessionStorage.setItem('fluiAdminUser', JSON.stringify(DEMO_USER));
      showPanel(DEMO_USER);
      return;
    }
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.user.role !== 'admin') {
      loginError.textContent = 'Esta conta não tem acesso administrativo.';
      clearToken();
      return;
    }
    setToken(data.token);
    sessionStorage.setItem('fluiAdminUser', JSON.stringify(data.user));
    showPanel(data.user);
  } catch (err) {
    if (err.message === 'demo' || err.message.includes('fetch') || err.message.includes('Failed')) {
      loginError.textContent = 'Use admin@flui.com / 123456 para testar';
    } else {
      loginError.textContent = err.message;
    }
  } finally {
    btn.textContent = 'Entrar';
    btn.disabled    = false;
  }
});

/* ─── Logout ─── */
document.getElementById('adminLogoutBtn')?.addEventListener('click', e => {
  e.preventDefault();
  clearToken();
  showOverlay();
});

/* ─── Navegação entre painéis ─── */
document.querySelectorAll('.nav-link[data-panel]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchPanel(link.dataset.panel);
  });
});

function switchPanel(name) {
  ['pontos', 'relatorios', 'motoristas'].forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.classList.toggle('hidden', p !== name);
  });
  document.querySelectorAll('.nav-link[data-panel]').forEach(l =>
    l.classList.toggle('active', l.dataset.panel === name)
  );
  const titles = { pontos: 'Pontos de Recarga', relatorios: 'Relatórios', motoristas: 'Motoristas' };
  const titleEl = document.getElementById('adminPanelTitle');
  if (titleEl) titleEl.textContent = titles[name] || '';
  const newBtn = document.getElementById('newStationButton');
  if (newBtn) newBtn.style.display = name === 'pontos' ? '' : 'none';

  if (name === 'relatorios') loadReports();
  if (name === 'motoristas') loadDrivers();
}

/* ─── Carrega tudo ─── */
async function loadAll() {
  await Promise.all([loadMetrics(), loadStations()]);
}

/* ─── Métricas ─── */
async function loadMetrics() {
  try {
    const m = await apiFetch('/admin/metrics');
    document.getElementById('metricStations').textContent    = m.activeStations;
    document.getElementById('metricConnectors').textContent  = m.totalConnectors;
    document.getElementById('metricRating').textContent      = m.avgRating;
    document.getElementById('metricReservations').textContent= m.totalReservations;
    document.getElementById('metricDrivers').textContent     = m.registeredDrivers;
    document.getElementById('metricReviews').textContent     = m.totalReviews;
  } catch { /* silencia em dev sem backend */ }
}

/* ─── Estações ─── */
async function loadStations() {
  try {
    adminStations = await apiFetch('/stations');
  } catch {
    adminStations = typeof fluiStations !== 'undefined'
      ? fluiStations.map(s => ({ ...s, reviews: [...(s.reviews || [])] }))
      : [];
  }
  render();
}

function renderMetrics() {
  /* métricas locais (fallback quando API indisponível) */
  if (document.getElementById('metricStations').textContent !== '—') return;
  const connCount = adminStations.reduce((n, s) => n + (s.connectors || []).length, 0);
  const avg = adminStations.reduce((n, s) => n + (s.rating || 0), 0) / (adminStations.length || 1);
  document.getElementById('metricStations').textContent   = adminStations.length;
  document.getElementById('metricConnectors').textContent = connCount;
  document.getElementById('metricRating').textContent     = avg.toFixed(1);
}

function renderTable() {
  const term = (adminSearch?.value || '').trim().toLowerCase();
  const rows = adminStations.filter(s =>
    [s.name, s.address, s.status].join(' ').toLowerCase().includes(term)
  );

  adminTable.innerHTML = rows.map(s => `
    <tr>
      <td><strong>${s.name}</strong><span>${s.address}</span></td>
      <td>${(s.connectors || []).join(', ')}</td>
      <td>${s.power} kW</td>
      <td>
        <input class="avail-input" type="number" min="0" max="${s.chargers}"
          value="${s.available}" data-id="${s.id}" title="Alterar disponibilidade" />
        / ${s.chargers}
      </td>
      <td><span class="status-pill ${(s.status||'').toLowerCase().replaceAll(' ', '-')}">${s.status}</span></td>
      <td class="action-cell">
        <button class="table-action" data-edit="${s.id}">Editar</button>
        <button class="table-action danger" data-delete="${s.id}">Excluir</button>
      </td>
    </tr>`).join('');

  /* Editar */
  adminTable.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => editStation(btn.dataset.edit))
  );

  /* Excluir */
  adminTable.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => deleteStation(btn.dataset.delete))
  );

  /* Alterar disponibilidade inline */
  adminTable.querySelectorAll('.avail-input').forEach(input =>
    input.addEventListener('change', () => updateAvailability(input.dataset.id, input.value))
  );
}

function renderReviews() {
  if (!reviewsList) return;
  reviewsList.innerHTML = adminStations.map(s => {
    const reviews = s.reviews || [];
    if (!reviews.length) return '';
    return `
      <article class="review-station-block">
        <div class="review-station-header">
          <strong>${s.name}</strong>
          <span>⭐ ${(s.rating || 0).toFixed(1)} média · ${reviews.length} avaliação${reviews.length !== 1 ? 'ões' : ''}</span>
        </div>
        ${reviews.map(r => `
          <p class="review-row">
            <b>${r.driver || r.driver_name || 'Motorista'} (${r.rating}/5)</b> ${r.text}
          </p>`).join('')}
      </article>`;
  }).join('') || '<p class="empty-hint">Nenhuma avaliação cadastrada ainda.</p>';
}

function render() {
  renderMetrics();
  renderTable();
  renderReviews();
}

/* ─── CRUD Estações ─── */
function getField(id) { return document.getElementById(id); }

function resetForm() {
  stationForm?.reset();
  getField('stationId').value = '';
  if (formTitle) formTitle.textContent = 'Cadastrar ponto';
}

function editStation(id) {
  const s = adminStations.find(st => st.id === id);
  if (!s) return;
  getField('stationId').value    = s.id;
  getField('nameField').value    = s.name;
  getField('addressField').value = s.address;
  getField('connectorsField').value = (s.connectors || []).join(', ');
  getField('powerField').value   = s.power;
  getField('chargersField').value= s.chargers || 4;
  getField('availableField').value= s.available ?? s.chargers ?? 4;
  getField('priceField').value   = s.price || '';
  getField('hoursField').value   = s.hours || '';
  getField('amenitiesField').value = (s.amenities || []).join(', ');
  getField('latField').value     = s.lat || (s.coords && s.coords.lat) || '';
  getField('lngField').value     = s.lng || (s.coords && s.coords.lng) || '';
  getField('statusField').value  = s.status || 'Ativo';
  if (formTitle) formTitle.textContent = 'Editar ponto';
  stationForm?.scrollIntoView({ behavior: 'smooth' });
}

async function deleteStation(id) {
  if (!confirm('Excluir este ponto de recarga?')) return;
  if (isDemoMode()) {
    adminStations = adminStations.filter(s => s.id !== id);
    render();
    return;
  }
  try {
    await apiFetch(`/stations/${id}`, { method: 'DELETE' });
    adminStations = adminStations.filter(s => s.id !== id);
    render();
    loadMetrics();
  } catch (err) {
    alert(`Erro: ${err.message}`);
  }
}

async function updateAvailability(id, value) {
  const idx = adminStations.findIndex(s => s.id === id);
  if (idx >= 0) adminStations[idx].available = Number(value);
  if (isDemoMode()) return;
  try {
    await apiFetch(`/admin/stations/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available: Number(value) }),
    });
  } catch (err) {
    alert(`Erro ao atualizar disponibilidade: ${err.message}`);
  }
}

stationForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const existingId = getField('stationId').value;
  const connectors = getField('connectorsField').value.split(',').map(c => c.trim()).filter(Boolean);
  const amenities  = getField('amenitiesField').value.split(',').map(a => a.trim()).filter(Boolean);
  const payload = {
    name:       getField('nameField').value,
    address:    getField('addressField').value,
    connectors,
    power:      Number(getField('powerField').value),
    chargers:   Number(getField('chargersField').value) || 4,
    available:  Number(getField('availableField').value) ?? 4,
    price:      getField('priceField').value || 'Grátis',
    hours:      getField('hoursField').value,
    amenities,
    lat:        parseFloat(getField('latField').value) || null,
    lng:        parseFloat(getField('lngField').value) || null,
    status:     getField('statusField').value,
  };

  const btn = stationForm.querySelector('button[type=submit]');
  btn.textContent = 'Salvando…';
  btn.disabled    = true;

  try {
    if (isDemoMode()) {
      if (existingId) {
        const idx = adminStations.findIndex(s => s.id === existingId);
        if (idx >= 0) adminStations[idx] = { ...adminStations[idx], ...payload };
      } else {
        adminStations = [{ ...payload, id: `demo-${Date.now()}`, rating: 5, reviews: [] }, ...adminStations];
      }
      resetForm();
      render();
    } else if (existingId) {
      const updated = await apiFetch(`/stations/${existingId}`, {
        method: 'PUT', body: JSON.stringify(payload),
      });
      const idx = adminStations.findIndex(s => s.id === existingId);
      if (idx >= 0) adminStations[idx] = { ...adminStations[idx], ...updated };
      resetForm();
      render();
      loadMetrics();
    } else {
      const created = await apiFetch('/stations', {
        method: 'POST', body: JSON.stringify(payload),
      });
      adminStations = [created, ...adminStations];
      resetForm();
      render();
      loadMetrics();
    }
  } catch (err) {
    alert(`Erro: ${err.message}`);
  } finally {
    btn.textContent = 'Salvar ponto';
    btn.disabled    = false;
  }
});

document.getElementById('newStationButton')?.addEventListener('click', resetForm);
document.getElementById('cancelFormBtn')?.addEventListener('click', resetForm);
adminSearch?.addEventListener('input', renderTable);

/* ─── Relatórios ─── */
async function loadReports() {
  try {
    const r = await apiFetch('/admin/reports');

    /* Gráfico de reservas por dia */
    const labels = r.byDay.map(d => d.date.slice(5));  /* MM-DD */
    const data   = r.byDay.map(d => d.count);
    const ctx    = document.getElementById('chartReservations')?.getContext('2d');
    if (ctx) {
      if (reservChart) reservChart.destroy();
      reservChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Reservas',
            data,
            backgroundColor: '#7B2FBE',
            borderRadius: 6,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
          },
        },
      });
    }

    /* Top pontos por reservas */
    const byStation = document.getElementById('reportByStation');
    if (byStation)
      byStation.innerHTML = r.byStation.map(s =>
        `<tr><td>${s.name}</td><td><strong>${s.reservations}</strong></td></tr>`
      ).join('') || '<tr><td colspan="2">Sem dados ainda</td></tr>';

    /* Top pontos por avaliações */
    const byReviews = document.getElementById('reportByReviews');
    if (byReviews)
      byReviews.innerHTML = r.reviewStats.map(s =>
        `<tr><td>${s.name}</td><td>${s.reviews}</td><td><strong>${s.avg_rating || '—'}</strong></td></tr>`
      ).join('') || '<tr><td colspan="3">Sem dados ainda</td></tr>';

  } catch (err) {
    console.warn('Relatórios indisponíveis:', err.message);
  }
}

/* ─── Motoristas ─── */
let allDrivers = [];

async function loadDrivers() {
  try {
    allDrivers = await apiFetch('/admin/users');
    renderDrivers();
    const search = document.getElementById('driversSearch');
    search?.addEventListener('input', renderDrivers);
  } catch (err) {
    console.warn('Motoristas indisponíveis:', err.message);
  }
}

function renderDrivers() {
  const term  = (document.getElementById('driversSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('driversTable');
  if (!tbody) return;
  const rows  = allDrivers.filter(u =>
    [u.name, u.email, u.car || ''].join(' ').toLowerCase().includes(term)
  );
  tbody.innerHTML = rows.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.car || '—'}</td>
      <td>${u.level || 1}</td>
      <td>${u.charges || 0}</td>
      <td>${u.eco_score || '—'}</td>
      <td>${(u.created_at || '').slice(0, 10)}</td>
    </tr>`).join('') || '<tr><td colspan="7">Nenhum motorista encontrado.</td></tr>';
}
