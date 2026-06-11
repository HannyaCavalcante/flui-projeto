/* ─── Elementos DOM ─── */
const loginScreen    = document.querySelector('#loginScreen');
const appShell       = document.querySelector('#appShell');
const loginForm      = document.querySelector('#loginForm');
const connectorFilter= document.querySelector('#connectorFilter');
const powerFilter    = document.querySelector('#powerFilter');
const amenityFilter  = document.querySelector('#amenityFilter');
const textFilter     = document.querySelector('#textFilter');
const stationList    = document.querySelector('#stationList');
const nearbyList     = document.querySelector('#nearbyList');
const stationDetail  = document.querySelector('#stationDetail');
const mapPins        = document.querySelector('#mapPins');
const mapFrame       = document.querySelector('#mapFrame');
const mapOpenLink    = document.querySelector('#mapOpenLink');
const resultCount    = document.querySelector('#resultCount');
const filterToggle   = document.querySelector('#filterToggle');
const filterPanel    = document.querySelector('#filterPanel');
const actionToast    = document.querySelector('#actionToast');
const openSettings   = document.querySelector('#openSettings');
const closeSettings  = document.querySelector('#closeSettings');
const saveSettings   = document.querySelector('#saveSettings');
const logoutButton   = document.querySelector('#logoutButton');
const settingsName   = document.querySelector('#settingsName');
const settingsEmail  = document.querySelector('#settingsEmail');
const settingsNameField  = document.querySelector('#settingsNameField');
const settingsEmailField = document.querySelector('#settingsEmailField');
const settingsCarField   = document.querySelector('#settingsCarField');

/* ─── Estado ─── */
let stations         = [];           // dados da API (substitui fluiStations)
let selectedStationId = null;
let currentUser      = null;
let toastTimer;

/* ─── Helpers de API ─── */
const API = window.FLUI_API || 'http://localhost:3001/api';

function getToken()        { return sessionStorage.getItem('fluiToken'); }
function setToken(t)       { sessionStorage.setItem('fluiToken', t); }
function clearToken()      { sessionStorage.removeItem('fluiToken'); }

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ─── Login / Logout ─── */
async function login(provider = 'Email', emailVal = '', passwordVal = '') {
  try {
    let user, token;

    if (provider === 'Email') {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });
      token = data.token;
      user  = data.user;
    } else {
      /* Provedores sociais / biométrico: usa usuário demo */
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'carlos@flui.com', password: '123456' }),
      });
      token = data.token;
      user  = data.user;
    }

    setToken(token);
    currentUser = user;
    await loadStations();

    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    sessionStorage.setItem('fluiLoginProvider', provider);
    render();
    showToast(`Bem-vindo, ${user.name.split(' ')[0]}!`);
  } catch (err) {
    showToast(`Erro: ${err.message}`);
  }
}

async function register(name, email, password, car) {
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, car }),
    });
    setToken(data.token);
    currentUser = data.user;
    await loadStations();

    loginScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    render();
    showToast(`Conta criada! Bem-vindo, ${data.user.name.split(' ')[0]}!`);
  } catch (err) {
    showToast(`Erro: ${err.message}`);
  }
}

/* ─── Carrega estações da API ─── */
async function loadStations() {
  try {
    stations = await apiFetch('/stations');
    if (stations.length && !selectedStationId)
      selectedStationId = stations[0].id;
  } catch {
    /* fallback: usar dados do data.js se a API estiver fora */
    stations = (typeof fluiStations !== 'undefined') ? [...fluiStations] : [];
    if (stations.length) selectedStationId = stations[0].id;
  }
}

/* ─── Filtros ─── */
function filteredStations() {
  const connector = connectorFilter?.value || 'all';
  const power     = Number(powerFilter?.value || 0);
  const amenity   = amenityFilter?.value || 'all';
  const term      = (textFilter?.value || '').trim().toLowerCase();

  return stations.filter(s => {
    const conn = s.connectors || [];
    const amen = s.amenities  || [];
    if (connector !== 'all' && !conn.includes(connector)) return false;
    if (power && s.power < power) return false;
    if (amenity !== 'all' && !amen.includes(amenity)) return false;
    if (term && ![s.name, s.address, ...conn, ...amen].join(' ').toLowerCase().includes(term)) return false;
    return true;
  });
}

/* ─── Map ─── */
function renderMap(list) {
  const station = list.find(s => s.id === selectedStationId) || list[0];
  if (!station) return;
  const { lat, lng } = station.coords || { lat: -23.561, lng: -46.655 };
  const m = 0.035;
  const bbox = [(lng-m).toFixed(5),(lat-m).toFixed(5),(lng+m).toFixed(5),(lat+m).toFixed(5)].join('%2C');
  mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  mapOpenLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

function renderPins(list) {
  mapPins.innerHTML = list.map(s => `
    <button class="map-pin ${s.id === selectedStationId ? 'selected' : ''}"
      style="top:${(s.position||{top:50}).top}%;left:${(s.position||{left:50}).left}%"
      aria-label="${s.name}" data-id="${s.id}">
      ${s.available}/${s.chargers}
    </button>`).join('');
  mapPins.querySelectorAll('button').forEach(pin =>
    pin.addEventListener('click', () => setSelectedStation(pin.dataset.id))
  );
}

function setSelectedStation(id) { selectedStationId = id; render(); }
function stationMeta(s) { return `${s.power} kW • ${s.price} • ${s.rating?.toFixed(1)}`; }

/* ─── Listas ─── */
function stationCard(s, compact = false) {
  return `
    <button class="station-card ${s.id === selectedStationId ? 'selected' : ''}" data-id="${s.id}">
      <div class="station-card-top">
        <strong>${s.name}</strong>
        <span class="${s.available === 0 ? 'busy-pill' : 'free-pill'}">${s.available}/${s.chargers} livres</span>
      </div>
      <small>${s.distance || '--'} • Espera: ${s.queue === 'Baixa' ? '5 min' : s.queue === 'Média' ? '12 min' : '18 min'}</small>
      <div class="station-stats">
        <span>${s.power} kW</span>
        <span>${(s.rating||0).toFixed(1)}</span>
        <span>${s.price}</span>
      </div>
      ${compact
        ? `<small>${s.confirmations||0} confirmaram • ${s.reports||0} reportaram fila</small>`
        : `<small>${(s.connectors||[]).join(' + ')} • ${(s.amenities||[]).join(', ')}</small>`}
    </button>`;
}

function renderLists(list) {
  if (resultCount)
    resultCount.textContent = `${list.length} resultado${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}`;

  if (!list.length) {
    stationList.innerHTML = '<p class="empty-state">Nenhum ponto encontrado com esses filtros.</p>';
    nearbyList.innerHTML  = '<p class="empty-state">Nenhum ponto próximo.</p>';
    stationDetail.innerHTML = '';
    return;
  }

  if (!list.some(s => s.id === selectedStationId))
    selectedStationId = list[0].id;

  stationList.innerHTML = list.map(s => stationCard(s)).join('');
  nearbyList.innerHTML  = stations.slice(0, 3).map(s => stationCard(s, true)).join('');

  document.querySelectorAll('.station-card').forEach(card =>
    card.addEventListener('click', () => setSelectedStation(card.dataset.id))
  );
}

/* ─── Dados de veículos ─── */
const CAR_BATTERY_KWH = {
  'Tesla Model 3': 75, 'BYD Dolphin': 44.9, 'Volvo EX30': 51,
  'GWM Ora 03': 48, 'default': 60,
};
const CAR_CONNECTORS = {
  'Tesla Model 3': ['CCS2','Tipo 2'], 'BYD Dolphin': ['CCS2','Tipo 2','CHAdeMO'],
  'Volvo EX30': ['CCS2','Tipo 2'], 'GWM Ora 03': ['CCS2','CHAdeMO'],
  'default': ['CCS2'],
};

function parsePrice(str) {
  if (!str || /grátis|gratis|free|0/i.test(str)) return 0;
  const m = str.match(/[\d,]+/);
  return m ? parseFloat(m[0].replace(',', '.')) : 0;
}
function carBattery() { return CAR_BATTERY_KWH[currentUser?.car] || CAR_BATTERY_KWH.default; }
function carConnectors() { return CAR_CONNECTORS[currentUser?.car] || CAR_CONNECTORS.default; }

/* ─── Alertas da comunidade ─── */
const COMMUNITY_ALERTS = [
  { stationId: 'supercharger-pinheiros', icon: '⚠', type: 'queue',   text: 'Fila de ~15 min relatada',          ago: '4 min atrás',  votes: 8  },
  { stationId: 'shell-vila-olimpia',     icon: '🔴', type: 'offline', text: 'Conector CCS2 fora de operação',    ago: '11 min atrás', votes: 5  },
  { stationId: 'green-charge-moema',     icon: '🐢', type: 'slow',    text: 'Carregamento mais lento que o esperado', ago: '22 min atrás', votes: 3  },
  { stationId: 'eldorado',              icon: '✅', type: 'ok',      text: 'Ponto funcionando normalmente',     ago: '2 min atrás',  votes: 12 },
];

/* ─── Detalhe ─── */
function renderDetail(list) {
  const s = list.find(st => st.id === selectedStationId);
  if (!s) return;
  const canReserve = s.available > 0 && s.status === 'Ativo';
  const stars = r => '★'.repeat(r) + '☆'.repeat(5 - r);
  const reviewsHtml = (s.reviews || []).map(rv => `
    <div class="review-item">
      <div class="review-header">
        <strong>${rv.driver}</strong>
        <span class="review-stars">${stars(rv.rating)}</span>
      </div>
      <p>${rv.text}</p>
    </div>`).join('') || '<p class="empty-state">Sem avaliações ainda.</p>';

  // Compatibilidade do veículo
  const myConns = carConnectors();
  const stConns = s.connectors || [];
  const compatible = stConns.some(c => myConns.includes(c));
  const compatHtml = `
    <div class="compat-badge ${compatible ? 'compat-ok' : 'compat-no'}">
      ${compatible ? '✓ Compatível com seu ' + (currentUser?.car || 'veículo') : '✗ Conectores incompatíveis com seu veículo'}
    </div>`;

  // Alertas desta estação
  const alert = COMMUNITY_ALERTS.find(a => a.stationId === s.id);
  const alertHtml = alert ? `
    <div class="detail-alert alert-${alert.type}">
      <span>${alert.icon}</span>
      <div><strong>${alert.text}</strong><small>${alert.ago} • ${alert.votes} confirmações</small></div>
    </div>` : '';

  stationDetail.innerHTML = `
    <div class="detail-topline">
      <span>${s.status}</span>
      <strong>${s.available}/${s.chargers} livres</strong>
    </div>
    <h2>${s.name}</h2>
    <p>${s.address}</p>
    ${compatHtml}
    ${alertHtml}
    <div class="detail-grid">
      <div><span>Carregadores</span><strong>${s.chargers}</strong></div>
      <div><span>Potência</span><strong>${s.power} kW</strong></div>
      <div><span>Horário</span><strong>${s.hours}</strong></div>
      <div><span>Preço</span><strong>${s.price}</strong></div>
    </div>
    <h3>Conectores</h3>
    <div class="chip-row">${stConns.map(c=>`<span class="${myConns.includes(c)?'chip-compat':''}">${c}</span>`).join('')}</div>
    <h3>Comodidades</h3>
    <div class="chip-row">${(s.amenities||[]).map(a=>`<span>${a}</span>`).join('')}</div>

    <div class="detail-actions">
      <button class="primary-button" type="button" id="reserveBtn" ${canReserve ? '' : 'disabled'}>
        ${canReserve ? 'Reservar conector' : 'Indisponível agora'}
      </button>
      <a class="secondary-link" target="_blank" rel="noreferrer"
        href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}">
        🧭 Navegar
      </a>
    </div>

    <!-- Calculadora de custo -->
    <div class="cost-calculator">
      <h3>💡 Calculadora de custo</h3>
      <div class="calc-sliders">
        <label>De <span class="calc-val" id="calcFromVal">65</span>%
          <input type="range" id="calcFrom" min="0" max="100" value="65" /></label>
        <label>Até <span class="calc-val" id="calcToVal">90</span>%
          <input type="range" id="calcTo" min="0" max="100" value="90" /></label>
      </div>
      <div class="calc-result-row">
        <div class="calc-result-item"><span>kWh</span><strong id="calcKwh">—</strong></div>
        <div class="calc-result-item"><span>Custo</span><strong id="calcCost">—</strong></div>
        <div class="calc-result-item"><span>Tempo est.</span><strong id="calcTime">—</strong></div>
      </div>
    </div>

    <h3>Avaliações</h3>
    <div class="reviews-list">${reviewsHtml}</div>
    <form class="review-form" id="reviewForm">
      <h4>Deixar avaliação</h4>
      <div class="star-picker" id="starPicker">
        ${[1,2,3,4,5].map(n=>`<button type="button" class="star-btn" data-v="${n}">★</button>`).join('')}
      </div>
      <input type="hidden" id="reviewRating" value="0"/>
      <textarea id="reviewText" rows="2" placeholder="Conta como foi sua experiência…" required></textarea>
      <button class="primary-button" type="submit" style="margin-top:.5rem">Enviar avaliação</button>
    </form>`;

  /* Reserva */
  document.getElementById('reserveBtn')?.addEventListener('click', async () => {
    try {
      const res = await apiFetch(`/stations/${s.id}/reserve`, { method: 'POST' });
      showToast(`Reserva confirmada em ${s.name}. Chegue em até 15 min.`);
      s.available = Math.max(0, s.available - 1);
      render();
    } catch (err) {
      showToast(`Erro: ${err.message}`);
    }
  });

  /* Star picker */
  let pickedRating = 0;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pickedRating = Number(btn.dataset.v);
      document.getElementById('reviewRating').value = pickedRating;
      document.querySelectorAll('.star-btn').forEach((b, i) =>
        b.classList.toggle('active', i < pickedRating)
      );
    });
  });

  /* Calculadora de custo */
  function updateCalc() {
    const from = Number(document.getElementById('calcFrom')?.value || 65);
    const to   = Number(document.getElementById('calcTo')?.value   || 90);
    document.getElementById('calcFromVal').textContent = from;
    document.getElementById('calcToVal').textContent   = to;
    if (to <= from) {
      document.getElementById('calcKwh').textContent  = '—';
      document.getElementById('calcCost').textContent = '—';
      document.getElementById('calcTime').textContent = '—';
      return;
    }
    const kwh      = ((to - from) / 100 * carBattery()).toFixed(1);
    const priceKwh = parsePrice(s.price);
    const cost     = priceKwh > 0 ? `R$ ${(kwh * priceKwh).toFixed(2)}` : 'Grátis';
    const mins     = Math.ceil((kwh / (s.power * 0.85)) * 60);
    document.getElementById('calcKwh').textContent  = `${kwh} kWh`;
    document.getElementById('calcCost').textContent = cost;
    document.getElementById('calcTime').textContent = mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`;
  }
  document.getElementById('calcFrom')?.addEventListener('input', updateCalc);
  document.getElementById('calcTo')?.addEventListener('input',   updateCalc);
  updateCalc();

  /* Envio de avaliação */
  document.getElementById('reviewForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!pickedRating) { showToast('Selecione uma nota antes de enviar.'); return; }
    const text = document.getElementById('reviewText').value.trim();
    if (!text) { showToast('Escreva um comentário.'); return; }
    try {
      await apiFetch(`/stations/${s.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: pickedRating, text }),
      });
      showToast('Avaliação enviada! Obrigado.');
      const updated = await apiFetch(`/stations/${s.id}`);
      const idx = stations.findIndex(st => st.id === s.id);
      if (idx >= 0) stations[idx] = updated;
      render();
    } catch (err) {
      showToast(`Erro: ${err.message}`);
    }
  });
}

/* ─── Perfil ─── */
function renderProfile() {
  const u = currentUser;
  if (!u) return;

  if (document.querySelector('#profileName'))   document.querySelector('#profileName').textContent   = u.name;
  if (document.querySelector('#profileEmail'))  document.querySelector('#profileEmail').textContent  = u.email;
  if (document.querySelector('#profileLevel'))  document.querySelector('#profileLevel').textContent  = `Nível ${u.level || 1}`;
  if (document.querySelector('#profileCar'))    document.querySelector('#profileCar').textContent    = u.car || '—';
  if (document.querySelector('#progressValue')) document.querySelector('#progressValue').textContent = `${u.progress || 0}%`;
  if (document.querySelector('#progressBar'))   document.querySelector('#progressBar').style.width   = `${u.progress || 0}%`;
  if (document.querySelector('#profileCharges'))document.querySelector('#profileCharges').textContent= u.charges  || 0;
  if (document.querySelector('#profileCo2'))    document.querySelector('#profileCo2').textContent    = u.co2_saved|| 0;
  if (document.querySelector('#profileEco'))    document.querySelector('#profileEco').textContent    = u.eco_score|| 0;

  const achievements = [
    { icon: '🚀', title: 'Pioneiro',    description: 'Primeiro carregamento'   },
    { icon: '🌱', title: 'Eco Warrior', description: '50 recargas completadas' },
    { icon: '⭐', title: 'Contribuidor',description: '10 avaliações enviadas'  },
  ];
  if (document.querySelector('#profileAchievements'))
    document.querySelector('#profileAchievements').textContent = achievements.length;
  if (document.querySelector('#achievementsList'))
    document.querySelector('#achievementsList').innerHTML = achievements.map(a => `
      <article>
        <span class="achievement-icon">${a.icon}</span>
        <div><strong>${a.title}</strong><p>${a.description}</p></div>
      </article>`).join('');

  if (settingsName)       settingsName.textContent        = u.name;
  if (settingsEmail)      settingsEmail.textContent       = u.email;
  if (settingsNameField)  settingsNameField.value         = u.name;
  if (settingsEmailField) settingsEmailField.value        = u.email;
  if (settingsCarField)   settingsCarField.value          = u.car || '';
}

async function saveProfileSettings() {
  const name = settingsNameField?.value.trim() || currentUser.name;
  const car  = settingsCarField?.value || '';
  try {
    currentUser = await apiFetch('/users/me', {
      method: 'PUT',
      body: JSON.stringify({ name, car }),
    });
    renderProfile();
    switchTab('profile');
    showToast('Perfil atualizado com sucesso.');
  } catch (err) {
    showToast(`Erro: ${err.message}`);
  }
}

/* ─── Navegação ─── */
function switchTab(target) {
  document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`#${target}Tab`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.tabTarget === target)
  );
  document.querySelector(`#${target}Tab`)?.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Toast ─── */
function showToast(msg) {
  if (!actionToast) return;
  clearTimeout(toastTimer);
  actionToast.textContent = msg;
  actionToast.classList.add('is-visible');
  toastTimer = setTimeout(() => actionToast.classList.remove('is-visible'), 2600);
}

/* ─── Render principal ─── */
function render() {
  const list = filteredStations();
  renderMap(list);
  renderPins(list);
  renderLists(list);
  renderDetail(list);
  renderProfile();
  renderRoute();
  renderRewards();
  renderCommunity();
}

/* ─── Listeners ─── */
document.querySelectorAll('[data-login]').forEach(btn =>
  btn.addEventListener('click', () => login(btn.dataset.loginProvider || 'Social'))
);

loginForm?.addEventListener('submit', e => {
  e.preventDefault();
  const email    = document.querySelector('#loginEmail')?.value.trim()    || '';
  const password = document.querySelector('#loginPassword')?.value         || '';

  /* Detecta se é cadastro ou login pelo campo extra (se existir) */
  const isRegister = document.querySelector('#registerMode')?.checked;
  if (isRegister) {
    const name = document.querySelector('#loginName')?.value.trim() || email.split('@')[0];
    const car  = document.querySelector('#loginCar')?.value.trim()  || '';
    register(name, email, password, car);
  } else {
    login('Email', email, password);
  }
});

/* Botão "Não tem conta? Cadastre-se" */
document.querySelector('[data-login-provider="Cadastro"]')?.addEventListener('click', () => {
  login('Social');
});

[connectorFilter, powerFilter, amenityFilter, textFilter].forEach(f => {
  f?.addEventListener('input',  render);
  f?.addEventListener('change', render);
});

document.querySelectorAll('[data-tab-target]').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tabTarget))
);

openSettings?.addEventListener('click',  () => switchTab('settings'));
closeSettings?.addEventListener('click', () => switchTab('profile'));
saveSettings?.addEventListener('click',  saveProfileSettings);

logoutButton?.addEventListener('click', () => {
  clearToken();
  currentUser = null;
  stations    = [];
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  showToast('Sessão encerrada.');
});

if (filterToggle && filterPanel) {
  filterToggle.addEventListener('click', () => {
    const open = filterPanel.classList.toggle('is-open');
    filterToggle.setAttribute('aria-expanded', String(open));
    filterToggle.textContent = open ? 'Ocultar filtros' : 'Filtros';
  });
}

/* ─── Aba Rota ─── */
let routeFilter = 'all';

function renderRoute() {
  const dest      = (document.getElementById('routeDest')?.value || '').trim().toLowerCase();
  const batt      = currentUser?.level ? 65 : 65;
  const rangeKm   = Math.round(batt * 3.77); // ~3.77 km/% para carro médio

  const el = document.getElementById('routeBattLabel');
  if (el) el.textContent = `65% • ${rangeKm} km de autonomia`;

  const statusEl = document.getElementById('routeRangeStatus');
  if (statusEl) statusEl.textContent = rangeKm > 200
    ? 'Bateria suficiente para a maioria das rotas na cidade'
    : 'Recomendamos recarregar antes de rotas longas';

  // Filtrar estações
  let list = [...stations];
  if (routeFilter === 'fast')      list = list.filter(s => s.power >= 100);
  if (routeFilter === 'free')      list = list.filter(s => /grátis|gratis|free/i.test(s.price || ''));
  if (routeFilter === 'available') list = list.filter(s => s.available > 0);
  if (dest) list = list.filter(s =>
    [s.name, s.address].join(' ').toLowerCase().includes(dest)
  );

  const countEl = document.getElementById('routeCount');
  if (countEl) countEl.textContent = `${list.length} estação${list.length !== 1 ? 'ões' : ''}`;

  const routeList = document.getElementById('routeStationList');
  if (routeList) routeList.innerHTML = list.length
    ? list.map(s => stationCard(s)).join('')
    : '<p class="empty-state">Nenhuma estação encontrada com esses filtros.</p>';

  routeList?.querySelectorAll('.station-card').forEach(card =>
    card.addEventListener('click', () => { setSelectedStation(card.dataset.id); switchTab('search'); })
  );

  // Alertas da comunidade
  const alertsEl = document.getElementById('communityAlertsList');
  if (alertsEl) alertsEl.innerHTML = COMMUNITY_ALERTS.map(a => `
    <div class="community-alert alert-${a.type}">
      <span class="alert-icon">${a.icon}</span>
      <div class="alert-body">
        <strong>${stations.find(s=>s.id===a.stationId)?.name || a.stationId}</strong>
        <p>${a.text}</p>
      </div>
      <div class="alert-meta">
        <small>${a.ago}</small>
        <span class="alert-votes">👍 ${a.votes}</span>
      </div>
    </div>`).join('');

  // Map alert chips
  renderMapAlertChips();
}

function renderMapAlertChips() {
  const el = document.getElementById('mapAlertChips');
  if (!el) return;
  el.innerHTML = COMMUNITY_ALERTS.slice(0, 3).map(a => {
    const name = stations.find(s => s.id === a.stationId)?.name?.split(' ').slice(0,2).join(' ') || '';
    return `<span class="map-chip alert-${a.type}">${a.icon} ${name}</span>`;
  }).join('');
}

document.getElementById('routeDest')?.addEventListener('input', renderRoute);
document.getElementById('routeChips')?.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#routeChips .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    routeFilter = btn.dataset.routeFilter;
    renderRoute();
  });
});

/* ─── Aba Conquistas ─── */
const BADGES = [
  { icon:'🚀', title:'Pioneiro',       desc:'Primeira recarga',               earned:true  },
  { icon:'⚡', title:'Turbo',          desc:'Carregou acima de 150 kW',       earned:true  },
  { icon:'🌱', title:'Eco Warrior',    desc:'50 recargas completas',          earned:true  },
  { icon:'⭐', title:'Crítico',        desc:'10 avaliações enviadas',         earned:true  },
  { icon:'📍', title:'Explorador',     desc:'5 postos diferentes',            earned:true  },
  { icon:'🔥', title:'Sequência',      desc:'4 semanas seguidas',             earned:false },
  { icon:'🏆', title:'Elite',          desc:'Nível 20',                       earned:false },
  { icon:'🌍', title:'Carbono Zero',   desc:'1.000 kg de CO₂ economizado',    earned:false },
  { icon:'🤝', title:'Embaixador',     desc:'Convidou 3 amigos',              earned:false },
  { icon:'⏱',  title:'Velocista',      desc:'10 recargas rápidas',            earned:false },
  { icon:'💎', title:'Premium',        desc:'200 recargas',                   earned:false },
  { icon:'🏙',  title:'Urbano',        desc:'Usou postos em 3 cidades',       earned:false },
];

const CHALLENGES = [
  { title:'Recarregue 3× esta semana',  current:2, total:3, xp:150 },
  { title:'Experimente um posto novo',  current:0, total:1, xp:200 },
  { title:'Envie 2 avaliações',         current:1, total:2, xp:100 },
];

const LEADERBOARD = [
  { name:'Carlos Mendes', car:'Tesla Model 3', eco:94, charges:87, isMe:true  },
  { name:'Pedro Alves',   car:'Volvo EX30',    eco:89, charges:74, isMe:false },
  { name:'Ana Souza',     car:'BYD Dolphin',   eco:87, charges:63, isMe:false },
  { name:'Beatriz Lima',  car:'GWM Ora 03',    eco:79, charges:51, isMe:false },
  { name:'Rafael Costa',  car:'BYD Dolphin',   eco:71, charges:38, isMe:false },
];

function renderRewards() {
  const u = currentUser;
  if (!u) return;

  const level = u.level || 12;
  const prog  = u.progress || 78;
  const xp    = Math.round(prog * 10);

  const levelEl = document.getElementById('rewardsLevel');
  if (levelEl) levelEl.textContent = level;
  const xpBar = document.getElementById('rewardsXpBar');
  if (xpBar) xpBar.style.width = `${prog}%`;
  const xpLabel = document.getElementById('rewardsXpLabel');
  if (xpLabel) xpLabel.textContent = `${xp} / 1000 XP para o nível ${level + 1}`;

  // Eco impact
  const co2 = u.co2_saved || 1247;
  const trees = Math.floor(co2 / 20);
  const km    = (u.charges || 87) * 100;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ecoTrees', trees);
  set('ecoCO2',   co2.toLocaleString('pt-BR'));
  set('ecoKm',    km.toLocaleString('pt-BR'));

  // Challenges
  const clEl = document.getElementById('challengesList');
  if (clEl) clEl.innerHTML = CHALLENGES.map(c => `
    <div class="challenge-item">
      <div class="challenge-top">
        <span class="challenge-title">${c.title}</span>
        <span class="challenge-xp">+${c.xp} XP</span>
      </div>
      <div class="challenge-bar-track">
        <div class="challenge-bar-fill" style="width:${Math.round(c.current/c.total*100)}%"></div>
      </div>
      <small class="challenge-prog">${c.current}/${c.total} ${c.current >= c.total ? '✓' : ''}</small>
    </div>`).join('');

  // Leaderboard
  const lbEl = document.getElementById('leaderboardList');
  if (lbEl) lbEl.innerHTML = LEADERBOARD.map((p, i) => `
    <div class="leaderboard-row ${p.isMe ? 'is-me' : ''}">
      <span class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
      <div class="lb-info">
        <strong>${p.name}</strong>
        <small>${p.car} • ${p.charges} recargas</small>
      </div>
      <span class="lb-eco">${p.eco} <small>eco</small></span>
    </div>`).join('');

  // Badges
  const earned = BADGES.filter(b => b.earned).length;
  const badgeCount = document.getElementById('badgeCount');
  if (badgeCount) badgeCount.textContent = `${earned} / ${BADGES.length}`;
  const bgEl = document.getElementById('badgesGrid');
  if (bgEl) bgEl.innerHTML = BADGES.map(b => `
    <div class="badge-item ${b.earned ? 'badge-earned' : 'badge-locked'}">
      <span class="badge-icon">${b.icon}</span>
      <strong class="badge-title">${b.title}</strong>
      <small class="badge-desc">${b.desc}</small>
    </div>`).join('');
}

/* ─── Modo Carro / CarPlay ─── */
const carplayOverlay = document.getElementById('carplayOverlay');

function openCarplay() {
  if (!carplayOverlay) return;
  carplayOverlay.classList.remove('hidden');

  // Preenche dados
  const s = stations.find(st => st.id === selectedStationId) || stations[0];
  if (s) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('carplayStName',  s.name);
    set('carplayStAddr',  s.address);
    set('carplayAvail',   `${s.available}/${s.chargers} livres`);
    set('carplayDist',    s.distance || '—');
    set('carplayQueue',   s.queue === 'Baixa' ? '5 min' : s.queue === 'Média' ? '12 min' : '18 min');
    set('carplayEta',     '8 min');
    set('carplayBattPct', '65%');
    set('carplayRange',   '245 km');

    // Quick chips das outras estações
    const rowEl = document.getElementById('carplayStationRow');
    if (rowEl) rowEl.innerHTML = stations.filter(st => st.id !== s.id).slice(0,4).map(st => `
      <button class="carplay-st-chip" type="button" data-id="${st.id}">
        <span>${st.available > 0 ? '🟢' : '🔴'}</span>
        <span>${st.name.split(' ').slice(0,2).join(' ')}</span>
        <small>${st.available}/${st.chargers}</small>
      </button>`).join('');

    rowEl?.querySelectorAll('.carplay-st-chip').forEach(chip =>
      chip.addEventListener('click', () => {
        setSelectedStation(chip.dataset.id);
        openCarplay();
      })
    );
  }

  document.getElementById('carplayNavigate')?.addEventListener('click', () => {
    const st = stations.find(st => st.id === selectedStationId);
    if (st) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.address)}`, '_blank');
  }, { once: true });

  document.getElementById('carplayReserve')?.addEventListener('click', async () => {
    const st = stations.find(st => st.id === selectedStationId);
    if (!st || !st.available) { showToast('Sem vagas disponíveis.'); return; }
    try {
      await apiFetch(`/stations/${st.id}/reserve`, { method: 'POST' });
      showToast(`Reserva confirmada em ${st.name}!`);
      st.available = Math.max(0, st.available - 1);
      render();
    } catch (err) { showToast(`Erro: ${err.message}`); }
  }, { once: true });
}

document.getElementById('carplayClose')?.addEventListener('click', () => {
  carplayOverlay?.classList.add('hidden');
});
document.getElementById('openCarplay')?.addEventListener('click', openCarplay);

/* ─── Busca no mapa ─── */
(function initMapSearch() {
  const searchInput   = document.getElementById('mapSearchInput');
  const filterToggle  = document.getElementById('mapFilterToggle');
  const filterPanel   = document.getElementById('mapFilterPanel');
  const connFilter    = document.getElementById('mapConnectorFilter');
  const powerFilter   = document.getElementById('mapPowerFilter');
  const statusFilter  = document.getElementById('mapStatusFilter');
  const resultCount   = document.getElementById('mapResultCount');

  function mapFilteredStations() {
    const term   = (searchInput?.value || '').trim().toLowerCase();
    const conn   = connFilter?.value   || 'all';
    const power  = Number(powerFilter?.value || 0);
    const status = statusFilter?.value || 'all';

    return stations.filter(s => {
      if (term && ![s.name, s.address, ...(s.connectors||[])].join(' ').toLowerCase().includes(term))
        return false;
      if (conn !== 'all' && !(s.connectors||[]).includes(conn)) return false;
      if (power && s.power < power) return false;
      if (status === 'available' && s.available <= 0) return false;
      if (status === 'Ativo' && s.status !== 'Ativo') return false;
      return true;
    });
  }

  function applyMapSearch() {
    const list = mapFilteredStations();
    renderPins(list);
    if (list.length) renderMap(list);

    const nearby = document.getElementById('nearbyList');
    if (nearby) nearby.innerHTML = list.slice(0, 4).map(s => stationCard(s, true)).join('');
    nearby?.querySelectorAll('.station-card').forEach(c =>
      c.addEventListener('click', () => setSelectedStation(c.dataset.id))
    );

    if (resultCount) {
      resultCount.textContent = list.length < stations.length
        ? `${list.length} resultado${list.length !== 1 ? 's' : ''}`
        : '';
    }
  }

  searchInput?.addEventListener('input', applyMapSearch);
  [connFilter, powerFilter, statusFilter].forEach(s =>
    s?.addEventListener('change', applyMapSearch)
  );

  filterToggle?.addEventListener('click', () => {
    const open = filterPanel?.classList.toggle('open');
    filterToggle.classList.toggle('active', !!open);
  });
})();

/* ─── Re-bind dos tabs (inclui as novas abas Rota, Conquistas e Comunidade) ─── */
document.querySelectorAll('[data-tab-target]').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tabTarget))
);

/* ============================================================
   COMUNIDADE — dados e renderização
   ============================================================ */
const CAR_LISTINGS = [
  {
    id: 1, model: 'Tesla Model 3', year: 2023, km: 18400, price: 349900,
    battery: 94, color: 'Branco Pérola', city: 'São Paulo, SP',
    seller: { name: 'Rodrigo M.', avatar: '👨' },
    category: 'sedan',
    description: 'Único dono, revisão em dia, sem arranhões. Vendo por mudança de cidade.',
  },
  {
    id: 2, model: 'BYD Dolphin', year: 2024, km: 6200, price: 159900,
    battery: 99, color: 'Azul Oceano', city: 'Campinas, SP',
    seller: { name: 'Fernanda L.', avatar: '👩' },
    category: 'hatch',
    description: 'Seminovo em estado de zero. Nota fiscal e transferência inclusas.',
  },
  {
    id: 3, model: 'Volvo EX30', year: 2024, km: 11000, price: 289000,
    battery: 87, color: 'Cinza Tempestade', city: 'Rio de Janeiro, RJ',
    seller: { name: 'Carlos A.', avatar: '👨' },
    category: 'suv',
    description: 'Apenas dois anos de uso. Teto solar panorâmico e Pilot Assist.',
  },
  {
    id: 4, model: 'GWM Ora 03', year: 2023, km: 29800, price: 139900,
    battery: 78, color: 'Rosa Sakura', city: 'Belo Horizonte, MG',
    seller: { name: 'Patrícia S.', avatar: '👩' },
    category: 'hatch',
    description: 'Ótimo custo-benefício. Ideal para cidade.',
  },
  {
    id: 5, model: 'Porsche Taycan', year: 2022, km: 21000, price: 699000,
    battery: 91, color: 'Preto Jato', city: 'São Paulo, SP',
    seller: { name: 'André B.', avatar: '👨' },
    category: 'sedan',
    description: 'Sport Turismo, pacote de esporte, bancos em couro premium.',
  },
  {
    id: 6, model: 'Hyundai IONIQ 5', year: 2023, km: 14300, price: 389000,
    battery: 96, color: 'Verde Menta', city: 'Curitiba, PR',
    seller: { name: 'Juliana R.', avatar: '👩' },
    category: 'suv',
    description: 'V2L incluso. Carregamento ultra-rápido 800V.',
  },
  {
    id: 7, model: 'BYD Seal', year: 2024, km: 4500, price: 249900,
    battery: 100, color: 'Branco Ártico', city: 'Porto Alegre, RS',
    seller: { name: 'Marcos T.', avatar: '👨' },
    category: 'sedan',
    description: 'Zero quilômetro emplacado. Garantia de fábrica.',
  },
  {
    id: 8, model: 'Chevrolet Bolt EV', year: 2022, km: 38000, price: 119900,
    battery: 72, color: 'Prata Lunar', city: 'Brasília, DF',
    seller: { name: 'Camila N.', avatar: '👩' },
    category: 'hatch',
    description: 'Excelente para uso diário. Bateria 100% saudável segundo diagnóstico.',
  },
];

let communityFilter = 'all';
let communitySearch = '';
let communitySort   = 'recent';

function filteredListings() {
  let list = [...CAR_LISTINGS];

  if (communitySearch) {
    const q = communitySearch.toLowerCase();
    list = list.filter(l =>
      l.model.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.color.toLowerCase().includes(q)
    );
  }

  if (communityFilter === 'sedan')   list = list.filter(l => l.category === 'sedan');
  if (communityFilter === 'suv')     list = list.filter(l => l.category === 'suv');
  if (communityFilter === 'hatch')   list = list.filter(l => l.category === 'hatch');
  if (communityFilter === 'below150') list = list.filter(l => l.price < 150000);
  if (communityFilter === 'above150') list = list.filter(l => l.price >= 150000);

  if (communitySort === 'price_asc')  list.sort((a, b) => a.price - b.price);
  if (communitySort === 'price_desc') list.sort((a, b) => b.price - a.price);
  if (communitySort === 'km_asc')     list.sort((a, b) => a.km - b.km);
  if (communitySort === 'battery')    list.sort((a, b) => b.battery - a.battery);

  return list;
}

function renderCommunity() {
  const container = document.getElementById('communityListings');
  const countEl   = document.getElementById('communityCount');
  if (!container) return;

  const list = filteredListings();
  if (countEl) countEl.textContent = `${list.length} anúncio${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px 16px;color:var(--muted)">
      <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
      <p style="margin:0;font-size:.9rem">Nenhum anúncio encontrado</p>
    </div>`;
    return;
  }

  container.innerHTML = list.map(l => {
    const fmtPrice = l.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const fmtKm    = l.km.toLocaleString('pt-BR');
    const battColor = l.battery >= 90 ? 'green' : l.battery >= 70 ? '' : 'red';
    const carEmoji = { sedan: '🚗', suv: '🚙', hatch: '🚗' }[l.category] || '🚗';
    return `
    <div class="car-listing-card">
      <div class="car-listing-img placeholder">${carEmoji}</div>
      <div class="car-listing-body">
        <div class="car-listing-top">
          <h3 class="car-listing-title">${l.model} ${l.year}</h3>
          <span class="car-listing-price">${fmtPrice}</span>
        </div>
        <p class="car-listing-meta">${l.color} · ${fmtKm} km · ${l.city}</p>
        <div class="car-listing-chips">
          <span class="car-chip ${battColor}">🔋 ${l.battery}%</span>
          <span class="car-chip purple">${l.category === 'sedan' ? 'Sedã' : l.category === 'suv' ? 'SUV' : 'Hatchback'}</span>
          <span class="car-chip">⚡ Elétrico</span>
        </div>
      </div>
      <div class="car-listing-footer">
        <div class="car-seller-info">
          <div class="car-seller-avatar">${l.seller.avatar}</div>
          <div>
            <div class="car-seller-name">${l.seller.name}</div>
            <div class="car-seller-city">${l.city.split(',')[1]?.trim() || l.city}</div>
          </div>
        </div>
        <button class="car-listing-cta" onclick="alert('Em breve: chat com o vendedor!')">Contato</button>
      </div>
    </div>`;
  }).join('');
}

/* ─── Community wiring ─── */
(function initCommunity() {
  const searchEl = document.getElementById('communitySearch');
  const sortEl   = document.getElementById('communitySort');
  const chipsEl  = document.getElementById('communityChips');
  const openBtn  = document.getElementById('openPostListing');
  const closeBtn = document.getElementById('closePostListing');
  const overlay  = document.getElementById('postListingOverlay');
  const form     = document.getElementById('postListingForm');

  searchEl?.addEventListener('input', e => {
    communitySearch = e.target.value;
    renderCommunity();
  });

  sortEl?.addEventListener('change', e => {
    communitySort = e.target.value;
    renderCommunity();
  });

  chipsEl?.addEventListener('click', e => {
    const chip = e.target.closest('[data-comm-filter]');
    if (!chip) return;
    communityFilter = chip.dataset.commFilter;
    chipsEl.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderCommunity();
  });

  openBtn?.addEventListener('click', () => overlay?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));
  overlay?.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    overlay?.classList.add('hidden');
    form.reset();
    // Mostra toast de confirmação
    if (actionToast) {
      actionToast.textContent = '✅ Anúncio enviado para revisão!';
      actionToast.classList.add('show');
      setTimeout(() => actionToast.classList.remove('show'), 3000);
    }
  });
})();
