/* ============================================
   BANDAS IC — APP.JS
   Toda autenticação via backend (Apps Script)
   Nenhuma credencial exposta no frontend
============================================ */

// ==================== API ====================
const _e=[
  'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy',
  '9BS2Z5Y2J6MmJnWDlWMmZvajRCM19maWs3LUNDTG9rM19v',
  'T1hFYzgtZXFjQjYxay14cEk3WmFvTmRtV1lLeEFBblEwQU',
  'RDMURJUS9leGVj'
].join('');

async function api(action, data = {}) {
  const url = atob(_e);
  const session = getSession();
  const payload = { action, sessionKey: session?.sessionKey || '', ...data };

  return new Promise((resolve) => {
    // Usa callback JSONP — único método que funciona com Apps Script sem servidor proxy
    const cbName = '_cb_' + Math.random().toString(36).substring(2, 9);
    const u = new URL(url);
    Object.entries(payload).forEach(([k, v]) => {
      u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    u.searchParams.set('callback', cbName);

    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'Tempo de resposta esgotado' });
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = (result) => {
      cleanup();
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      resolve({ ok: false, error: 'Erro de conexão' });
    };

    script.src = u.toString();
    document.head.appendChild(script);
  });
}

// ==================== SESSION ====================
function saveSession(data) {
  sessionStorage.setItem('bic_session', JSON.stringify({
    sessionKey: data.sessionKey,
    nivel: data.nivel,
    nome: data.nome,
    eklesia: data.eklesia,
    musicoId: data.musicoId || '',
    exp: Date.now() + 8 * 60 * 60 * 1000,
  }));
}

function updateSession(extra) {
  const s = getSession();
  if (!s) return;
  sessionStorage.setItem('bic_session', JSON.stringify({ ...s, ...extra }));
}

function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('bic_session'));
    if (!s || Date.now() > s.exp) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem('bic_session');
}

// ==================== NAV ====================
let _loginNivel = 'admin';

function goTo(screenId, nivel) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (nivel) {
    _loginNivel = nivel;
    const titles = { admin: 'Administrador', lider: 'Líder de Banda', voluntario: 'Voluntário' };
    document.getElementById('loginTitle').textContent = titles[nivel] || 'Acessar';
    document.getElementById('inputToken').value = '';
  }
  window.scrollTo(0, 0);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ==================== AUTH ====================
async function doLogin() {
  const token = document.getElementById('inputToken').value.trim();
  if (!token) { showToast('Digite seu token de acesso', 'error'); return; }

  showLoading(true);
  const res = await api('login', { token });
  showLoading(false);

  if (!res.ok) { showToast(res.error || 'Token inválido', 'error'); return; }

  saveSession(res);
  showToast(`Bem-vindo, ${res.nome}! 🎵`, 'success');

  const nivel = res.nivel;
  if (nivel === 'admin') initAdmin(res);
  else if (nivel === 'lider') initLider(res);
  else if (nivel === 'voluntario') initVoluntario(res);
  else showToast('Nível de acesso desconhecido', 'error');
}

async function doLogout() {
  const s = getSession();
  if (s) await api('logout', { sessionKey: s.sessionKey });
  clearSession();
  showScreen('screenHome');
}

// ==================== INSCRIÇÃO PÚBLICA ====================
function previewFoto(input) {
  const el = document.getElementById('fotoThumb');
  if (input.files && input.files[0]) {
    const r = new FileReader();
    r.onload = e => {
      el.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;border-radius:50%;object-fit:cover"><p style="font-size:12px;margin-top:6px;color:var(--text2)">Foto selecionada ✓</p>`;
    };
    r.readAsDataURL(input.files[0]);
  }
}

async function submitInscricao() {
  const nome    = document.getElementById('iNome').value.trim();
  const eklesia = document.getElementById('iEklesia').value.trim();
  const whats   = document.getElementById('iWhats').value.trim();
  const instrs  = [...document.querySelectorAll('#screenInscricao .chip input:checked')].map(i => i.value);
  const obs     = document.getElementById('iObs').value.trim();

  if (!nome)   { showToast('Informe seu nome', 'error'); return; }
  if (!eklesia){ showToast('Informe sua Eklesia/Igreja', 'error'); return; }
  if (!whats)  { showToast('Informe seu WhatsApp', 'error'); return; }
  if (!instrs.length) { showToast('Selecione ao menos um instrumento', 'error'); return; }

  showLoading(true);

  // Passo 1: salvar inscrição (sem foto — JSONP não suporta base64 grande na URL)
  const res = await api('submitInscricao', {
    nome, eklesia,
    whatsapp: whats,
    instrumentos: instrs,
    obs,
  });

  if (!res.ok) {
    showLoading(false);
    showToast(res.error || 'Erro ao enviar', 'error');
    return;
  }

  const inscricaoId = res.id;

  // Passo 2: upload da foto via fetch POST separado (não usa JSONP)
  const fotoFile = document.getElementById('iFoto').files[0];
  if (fotoFile && inscricaoId) {
    try {
      const fotoBase64 = await fileToBase64(fotoFile);
      const url = atob(_e);
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'uploadFotoInscricao',
          inscricaoId,
          fotoBase64: fotoBase64.split(',')[1],
          fotoNome: 'foto_' + nome.replace(/\s+/g, '_') + '_' + Date.now() + '.jpg',
        }),
      });
    } catch(e) {
      console.warn('Foto não enviada:', e);
    }
  }

  showLoading(false);

  document.querySelector('#screenInscricao .pub-wrap').innerHTML = `
    <div class="empty" style="padding:80px 24px">
      <div class="empty-icon">🎉</div>
      <h2 style="font-family:var(--fhead);font-size:24px;font-weight:800;margin-bottom:10px">Inscrição enviada!</h2>
      <p style="color:var(--text2);margin-bottom:28px">Em breve o administrador entrará em contato pelo WhatsApp para agendar sua audição.</p>
      <button class="btn-primary" onclick="goTo('screenHome')">Voltar ao início</button>
    </div>`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== VOLUNTÁRIO ====================
async function initVoluntario(res) {
  document.getElementById('volNome').textContent = res.nome;
  document.getElementById('volGreeting').textContent = `Olá, ${res.nome.split(' ')[0]}! 👋`;
  document.getElementById('volEklesia').textContent = res.eklesia;
  showScreen('screenVoluntario');

  // Carregar perfil do músico vinculado ao token
  if (res.musicoId) {
    const perfil = await api('getMusicoById', { id: res.musicoId });
    if (perfil.ok && perfil.data) {
      const m = perfil.data;
      const nome = m.Nome || m.nome || res.nome;
      document.getElementById('volGreeting').textContent = `Olá, ${nome.split(' ')[0]}! 👋`;
      document.getElementById('volEklesia').textContent = m.Eklesia || m.eklesia || res.eklesia;
      updateSession({ nome, eklesia: m.Eklesia || m.eklesia });
    }
  }

  await loadVolEscalas();
  await loadVolBanda();
  await loadVolSubs();
}

let _volEscalas = [];
async function loadVolEscalas() {
  showLoading(true);
  const res = await api('getMinhasEscalas');
  showLoading(false);
  _volEscalas = res.ok ? res.data : [];
  renderVolEscalas('todas');
}

function filterEscalasVol(f, el) {
  document.querySelectorAll('#screenVoluntario .ftab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderVolEscalas(f);
}

function renderVolEscalas(f) {
  const now = new Date();
  let list = f === 'todas' ? [..._volEscalas] : _volEscalas.filter(e => (e.meuStatus||'pendente') === f);

  // Ordenar: pendentes futuras primeiro, depois passadas
  list.sort((a, b) => {
    const dA = new Date((a.Data||a.data||'9999') + 'T12:00:00');
    const dB = new Date((b.Data||b.data||'9999') + 'T12:00:00');
    const stA = a.meuStatus || 'pendente';
    const stB = b.meuStatus || 'pendente';
    const pastA = dA < now;
    const pastB = dB < now;
    // Pendentes abertas no topo
    if (stA === 'pendente' && !pastA && (stB !== 'pendente' || pastB)) return -1;
    if (stB === 'pendente' && !pastB && (stA !== 'pendente' || pastA)) return 1;
    // Passadas depois das futuras
    if (!pastA && pastB) return -1;
    if (pastA && !pastB) return 1;
    return dA - dB;
  });

  const el = document.getElementById('volEscalasList');
  if (!list.length) { el.innerHTML = emptyState('📅','Nenhuma escala encontrada'); return; }
  el.innerHTML = list.map(e => {
    const id   = e.Id || e.id || '';
    const titulo = e.Titulo || e.titulo || 'Escala';
    const horario = e.Horario || e.horario || '';
    const local   = e.Local   || e.local   || '';
    const dataStr = e.Data    || e.data    || '';
    const d = parseDate(dataStr);
    const isPast = dataStr && new Date(dataStr + 'T12:00:00') < now;
    const st = e.meuStatus || 'pendente';
    return `
    <div class="list-item" onclick="openDetailEscalaVol('${id}')" style="${isPast?'opacity:.75':''}" >
      <div class="date-block">
        <div class="date-day">${d.day}</div>
        <div class="date-mon">${d.mon}</div>
      </div>
      <div class="list-item-info">
        <div class="list-item-name">${titulo} ${isPast?'<span style="font-size:10px;color:var(--text3)">(passada)</span>':''}</div>
        <div class="list-item-sub">⏰ ${horario} • 📍 ${local}</div>
      </div>
      <div class="list-item-right">${badgeStatus(st)}</div>
    </div>`;
  }).join('');
}

async function openDetailEscalaVol(id) {
  showLoading(true);
  const res = await api('getEscalaById', { id });
  showLoading(false);
  if (!res.ok) { showToast('Erro ao carregar', 'error'); return; }
  const e = res.data;
  const d = parseDate(e.Data);
  const s = getSession();
  const meuAceite = (res.aceites || []).find(a => a.MusicoId === s.musicoId);
  const meuStatus = meuAceite?.Status || 'pendente';

  document.getElementById('detailTitle').textContent = e.Titulo;
  document.getElementById('detailBody').innerHTML = `
    <div class="info-grid">
      <div class="info-item"><label>Data</label><span>${d.day}/${d.mon}/${d.year}</span></div>
      <div class="info-item"><label>Horário</label><span>${e.Horario}</span></div>
      <div class="info-item"><label>Local</label><span>${e.Local}</span></div>
      <div class="info-item"><label>Banda</label><span>${e.BandaNome}</span></div>
    </div>
    <div class="detail-section">
      <h3>Minha resposta</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Status atual: ${badgeStatus(meuStatus)}</p>
      <div class="action-row">
        <button class="btn-green" onclick="responderEscala('${e.Id}','aceita')">✅ Aceitar</button>
        <button class="btn-red" onclick="responderEscala('${e.Id}','recusada')">❌ Recusar</button>
      </div>
    </div>
    ${e.MusicasIds ? `
    <div class="detail-section">
      <h3>Músicas da escala</h3>
      <p style="font-size:13px;color:var(--text2)">Acesse a aba Músicas para ver detalhes.</p>
    </div>` : ''}
  `;
  openDetail();
}

async function responderEscala(escalaId, status) {
  showLoading(true);
  const res = await api('responderEscala', { escalaId, status });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast(status === 'aceita' ? 'Escala aceita! ✅' : 'Escala recusada', 'info');
  closeDetail();
  await loadVolEscalas();
}

async function loadVolBanda() {
  const s = getSession();
  if (!s.musicoId) { document.getElementById('volBandaInfo').innerHTML = emptyState('🎸','Sem banda vinculada'); return; }
  showLoading(true);
  const res = await api('getBandas');
  showLoading(false);
  const bandas = res.ok ? res.data.filter(b => b.MembrosIds && b.MembrosIds.includes(s.musicoId)) : [];
  const el = document.getElementById('volBandaInfo');
  if (!bandas.length) { el.innerHTML = emptyState('🎸','Você ainda não faz parte de uma banda'); return; }
  el.innerHTML = bandas.map(b => `
    <div class="card">
      <div class="card-head">
        <div style="font-size:28px">${b.Emoji || '🎸'}</div>
        <div>
          <div class="card-name">${b.Nome}</div>
          <div class="card-sub">Líder: ${b.LiderNome}</div>
        </div>
      </div>
    </div>`).join('');
}

let _volSubs = [];
let _volSubFilter = 'todas';

async function loadVolSubs() {
  // Inject filter tabs into the subs tab if not already there
  const subsContainer = document.getElementById('volTab-subs');
  if (!subsContainer.querySelector('.filter-tabs')) {
    const tabs = document.createElement('div');
    tabs.className = 'filter-tabs';
    tabs.innerHTML = `
      <button class="ftab active" onclick="filterSubsVol('todas',this)">Todas</button>
      <button class="ftab" onclick="filterSubsVol('pendente',this)">Abertas</button>
      <button class="ftab" onclick="filterSubsVol('aceita',this)">Resolvidas</button>
    `;
    subsContainer.insertBefore(tabs, document.getElementById('volSubsList'));
  }

  showLoading(true);
  // Carregar tanto subs quanto escalas para mostrar informação completa
  const [resSubs, resEscalas] = await Promise.all([
    api('getSubs', {}),
    api('getMinhasEscalas'),
  ]);
  showLoading(false);

  const s = getSession();
  const todas = resSubs.ok ? resSubs.data : [];
  const escalas = resEscalas.ok ? resEscalas.data : [];

  // Enriquecer subs com dados da escala e filtrar apenas do músico
  _volSubs = todas
    .filter(sub => {
      const esc = escalas.find(e => e.Id === sub.EscalaId || e.id === sub.EscalaId);
      return esc; // mostrar apenas subs das escalas do músico
    })
    .map(sub => {
      const esc = escalas.find(e => (e.Id||e.id) === (sub.EscalaId||sub.escalaId)) || {};
      return { ...sub, _escala: esc };
    });

  renderVolSubs();
}

function filterSubsVol(f, el) {
  _volSubFilter = f;
  document.querySelectorAll('#volTab-subs .ftab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderVolSubs();
}

function renderVolSubs() {
  const el = document.getElementById('volSubsList');
  const now = new Date();

  let list = [..._volSubs];

  // Filtrar por status
  if (_volSubFilter !== 'todas') {
    const map = { pendente:'aberta', aceita:'resolvida', recusada:'recusada' };
    list = list.filter(s => (s.Status||s.status) === (map[_volSubFilter] || _volSubFilter));
  }

  // Ordenar: abertas primeiro, depois passadas por data
  list.sort((a, b) => {
    const stA = a.Status || a.status || '';
    const stB = b.Status || b.status || '';
    const isOpenA = stA === 'aberta';
    const isOpenB = stB === 'aberta';
    if (isOpenA && !isOpenB) return -1;
    if (!isOpenA && isOpenB) return 1;
    const dA = new Date((a._escala?.Data || a._escala?.data || '9999') + 'T12:00:00');
    const dB = new Date((b._escala?.Data || b._escala?.data || '9999') + 'T12:00:00');
    // Passadas após abertas mas antes das futuras
    const pastA = dA < now;
    const pastB = dB < now;
    if (pastA && !pastB) return -1;
    if (!pastA && pastB) return 1;
    return dA - dB;
  });

  if (!list.length) { el.innerHTML = emptyState('🔄','Nenhuma substituição encontrada'); return; }

  el.innerHTML = list.map(s => {
    const esc = s._escala || {};
    const d = parseDate(esc.Data || esc.data || '');
    const status = s.Status || s.status || 'aberta';
    const isPast = esc.Data && new Date(esc.Data + 'T12:00:00') < now;
    return `
    <div class="list-item" style="${isPast ? 'opacity:.7' : ''}">
      <div class="date-block">
        <div class="date-day">${d.day}</div>
        <div class="date-mon">${d.mon}</div>
      </div>
      <div class="list-item-info">
        <div class="list-item-name">${esc.Titulo || esc.titulo || 'Escala'}</div>
        <div class="list-item-sub">🎸 ${s.Instrumento||s.instrumento||'—'} • ${esc.Horario||esc.horario||''} • ${esc.Local||esc.local||''}</div>
      </div>
      <div class="list-item-right">
        <span class="badge ${status==='aberta'?'badge-pend':status==='resolvida'?'badge-aprov':'badge-reprov'}">${status}</span>
        ${isPast ? '<span style="font-size:10px;color:var(--text3)">passada</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function volTab(tab, el) {
  document.querySelectorAll('#screenVoluntario .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#screenVoluntario .tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('volTab-' + tab).classList.add('active');
}

// ==================== LÍDER ====================
async function initLider(res) {
  document.getElementById('lidNome').textContent = res.nome;
  document.getElementById('lidEklesia').textContent = res.eklesia;
  showScreen('screenLider');

  // Carregar perfil do líder vinculado ao token
  if (res.musicoId) {
    const perfil = await api('getMusicoById', { id: res.musicoId });
    if (perfil.ok && perfil.data) {
      const m = perfil.data;
      const nome = m.Nome || m.nome || res.nome;
      document.getElementById('lidNome').textContent = nome;
      document.getElementById('lidEklesia').textContent = m.Eklesia || m.eklesia || res.eklesia;
      updateSession({ nome, eklesia: m.Eklesia || m.eklesia });
    }
  }

  await loadLidBandas();
  await loadLidEscalas();
  await loadLidRepertorios();
  await loadLidMusicas();
  await loadLidSubs();
}

let _lidBandas = [];
async function loadLidBandas() {
  showLoading(true);
  const res = await api('getMinhasBandas');
  showLoading(false);
  _lidBandas = res.ok ? res.data : [];
  const el = document.getElementById('lidBandasList');
  if (!_lidBandas.length) { el.innerHTML = emptyState('🎸','Nenhuma banda vinculada'); return; }
  el.innerHTML = _lidBandas.map(b => `
    <div class="card" onclick="openDetailBandaLider('${b.Id}')">
      <div class="card-head">
        <div style="font-size:32px">${b.Emoji || '🎸'}</div>
        <div>
          <div class="card-name">${b.Nome}</div>
          <div class="card-sub">Líder: ${b.LiderNome}</div>
        </div>
      </div>
      <div class="card-foot">
        <span style="font-size:12px;color:var(--text2)">Toque para gerenciar</span>
        <span style="color:var(--text3)">→</span>
      </div>
    </div>`).join('');
}

async function openDetailBandaLider(id) {
  const b = _lidBandas.find(x => x.Id === id);
  if (!b) return;
  document.getElementById('detailTitle').textContent = b.Nome;
  document.getElementById('detailBody').innerHTML = `
    <div class="info-grid">
      <div class="info-item"><label>Nome</label><span>${b.Nome}</span></div>
      <div class="info-item"><label>Líder</label><span>${b.LiderNome}</span></div>
    </div>
    <div class="detail-section">
      <h3>Ações</h3>
      <div class="action-row">
        <button class="btn-primary sm" onclick="openModalCriarEscalaParaBanda('${b.Id}','${b.Nome}')">📅 Criar escala</button>
        <button class="btn-ghost sm" onclick="openModalCriarRepertorioParaBanda('${b.Id}','${b.Nome}')">📋 Criar repertório</button>
      </div>
    </div>`;
  openDetail();
}

let _lidEscalas = [];
async function loadLidEscalas() {
  showLoading(true);
  const res = await api('getEscalas');
  showLoading(false);
  _lidEscalas = res.ok ? res.data : [];
  renderLidEscalas();
}

function renderLidEscalas() {
  const el = document.getElementById('lidEscalasList');
  if (!_lidEscalas.length) { el.innerHTML = emptyState('📅','Nenhuma escala criada'); return; }
  el.innerHTML = _lidEscalas.map(e => {
    const d = parseDate(e.Data);
    return `
    <div class="list-item" onclick="openDetailEscalaLider('${e.Id}')">
      <div class="date-block">
        <div class="date-day">${d.day}</div>
        <div class="date-mon">${d.mon}</div>
      </div>
      <div class="list-item-info">
        <div class="list-item-name">${e.Titulo}</div>
        <div class="list-item-sub">⏰ ${e.Horario} • 🎸 ${e.BandaNome}</div>
      </div>
      <div class="list-item-right">${badgeStatus(e.Status)}</div>
    </div>`;
  }).join('');
}

async function openDetailEscalaLider(id) {
  showLoading(true);
  const res = await api('getEscalaById', { id });
  showLoading(false);
  if (!res.ok) { showToast('Erro ao carregar', 'error'); return; }
  const e = res.data;
  const aceites = res.aceites || [];
  const d = parseDate(e.Data);

  document.getElementById('detailTitle').textContent = e.Titulo;
  document.getElementById('detailBody').innerHTML = `
    <div class="info-grid">
      <div class="info-item"><label>Data</label><span>${d.day}/${d.mon}/${d.year}</span></div>
      <div class="info-item"><label>Horário</label><span>${e.Horario}</span></div>
      <div class="info-item"><label>Local</label><span>${e.Local}</span></div>
      <div class="info-item"><label>Banda</label><span>${e.BandaNome}</span></div>
    </div>
    <div class="detail-section">
      <h3>Status de aceite (${aceites.length})</h3>
      ${aceites.length ? `
        <div class="aceites-grid">
          ${aceites.map(a => `
            <div class="aceite-item">
              <div class="avatar sm" style="margin:0 auto">${(a.MusicoId||'?')[0]}</div>
              <div class="aceite-name">${a.MusicoId}</div>
              <div class="aceite-st">${badgeStatus(a.Status)}</div>
            </div>`).join('')}
        </div>` : '<p style="font-size:13px;color:var(--text3)">Nenhum músico escalado ainda</p>'}
    </div>
    <div class="detail-section">
      <h3>Ações</h3>
      <div class="action-row">
        <button class="btn-ghost sm" onclick="openModalAdicionarMusicaEscala('${e.Id}')">🎵 Adicionar músicas</button>
        <button class="btn-ghost sm" onclick="openModalCriarSub('${e.Id}')">🔄 Pedir sub</button>
      </div>
    </div>`;
  openDetail();
}

let _lidMusicas = [];
async function loadLidMusicas() {
  showLoading(true);
  const res = await api('getMusicas');
  showLoading(false);
  _lidMusicas = res.ok ? res.data : [];
  renderLidMusicas();
}

function renderLidMusicas() {
  const el = document.getElementById('lidMusicasList');
  if (!_lidMusicas.length) { el.innerHTML = emptyState('🎼','Nenhuma música cadastrada'); return; }
  el.innerHTML = _lidMusicas.map((m, i) => `
    <div class="musica-item" onclick="openDetailMusica('${m.Id}')">
      <div class="musica-num">${i+1}</div>
      <div class="list-item-info">
        <div class="list-item-name">${m.Nome}</div>
        <div class="list-item-sub">${m.Artista} • ${m.Versao}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="musica-key">${m.Tom}</span>
        <span style="font-size:11px;color:var(--text3)">${m.Bpm}bpm</span>
      </div>
    </div>`).join('');
}

async function loadLidRepertorios() {
  showLoading(true);
  const res = await api('getRepertorios', {});
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('lidRepertoriosList');
  if (!list.length) { el.innerHTML = emptyState('📋','Nenhum repertório'); return; }
  el.innerHTML = list.map(r => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">📋 ${r.Nome}</div>
        <div class="list-item-sub">${(r.MusicasIds||'').split(',').filter(Boolean).length} música(s)</div>
      </div>
    </div>`).join('');
}

async function loadLidSubs() {
  showLoading(true);
  const res = await api('getSubs', {});
  showLoading(false);
  const list = (res.ok ? res.data : []).filter(s => s.Status === 'aberta');
  const el = document.getElementById('lidSubsList');
  if (!list.length) { el.innerHTML = emptyState('🔄','Nenhuma sub aberta'); return; }
  el.innerHTML = list.map(s => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">Sub: ${s.Instrumento}</div>
        <div class="list-item-sub">Escala: ${s.EscalaId}</div>
      </div>
      <span class="badge badge-pend">aberta</span>
    </div>`).join('');
}

function lidTab(tab, el) {
  document.querySelectorAll('#screenLider .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#screenLider .tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('lidTab-' + tab).classList.add('active');
}

// MODAIS LÍDER
function openModalCriarEscala() { openModalCriarEscalaParaBanda('',''); }
function openModalCriarEscalaParaBanda(bandaId, bandaNome) {
  openModal('Nova Escala', `
    <div class="form-group"><label>Título</label><input type="text" id="eTitulo" placeholder="Ex: Culto Dominical"/></div>
    <div class="form-row2">
      <div class="form-group"><label>Data</label><input type="date" id="eData"/></div>
      <div class="form-group"><label>Horário</label><input type="time" id="eHora"/></div>
    </div>
    <div class="form-group"><label>Local</label><input type="text" id="eLocal" placeholder="Ex: Templo Principal"/></div>
    <div class="form-group"><label>Banda</label>
      <select id="eBanda">
        ${_lidBandas.map(b => `<option value="${b.Id}" ${b.Id===bandaId?'selected':''}>${b.Nome}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEscalaLider()">Criar escala</button>
    </div>`);
}

async function salvarEscalaLider() {
  const bandaId = document.getElementById('eBanda').value;
  const banda = _lidBandas.find(b => b.Id === bandaId);
  showLoading(true);
  const res = await api('criarEscala', {
    titulo: document.getElementById('eTitulo').value,
    data: document.getElementById('eData').value,
    horario: document.getElementById('eHora').value,
    local: document.getElementById('eLocal').value,
    bandaId,
    bandaNome: banda?.Nome || '',
    musicosIds: banda?.MembrosIds ? banda.MembrosIds.split(',').filter(Boolean) : [],
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Escala criada! ✅', 'success');
  closeModalDirect();
  await loadLidEscalas();
}

function openModalCriarRepertorio() { openModalCriarRepertorioParaBanda('',''); }
function openModalCriarRepertorioParaBanda(bandaId, bandaNome) {
  openModal('Novo Repertório', `
    <div class="form-group"><label>Nome do repertório</label><input type="text" id="rNome" placeholder="Ex: Louvor Junho"/></div>
    <div class="form-group"><label>Banda</label>
      <select id="rBanda">
        ${_lidBandas.map(b => `<option value="${b.Id}" ${b.Id===bandaId?'selected':''}>${b.Nome}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Músicas</label>
      <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
        ${_lidMusicas.map(m => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg3);border-radius:8px;cursor:pointer">
            <input type="checkbox" value="${m.Id}"/>
            <div>
              <div style="font-size:13px;font-weight:600">${m.Nome}</div>
              <div style="font-size:11px;color:var(--text2)">${m.Artista} • ${m.Tom}</div>
            </div>
          </label>`).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarRepertorioLider()">Criar</button>
    </div>`);
}

async function salvarRepertorioLider() {
  const musicasIds = [...document.querySelectorAll('#modalBody input[type=checkbox]:checked')].map(i => i.value);
  showLoading(true);
  const res = await api('criarRepertorio', {
    nome: document.getElementById('rNome').value,
    bandaId: document.getElementById('rBanda').value,
    musicasIds,
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Repertório criado!', 'success');
  closeModalDirect();
  await loadLidRepertorios();
}

function openModalAdicionarMusica() {
  openModal('Adicionar Música', `
    <div class="form-group"><label>Nome da música *</label><input type="text" id="mNome"/></div>
    <div class="form-group"><label>Artista / Ministério</label><input type="text" id="mArtista"/></div>
    <div class="form-row2">
      <div class="form-group"><label>Tom</label><input type="text" id="mTom" placeholder="Ex: G, A, C#"/></div>
      <div class="form-group"><label>BPM</label><input type="text" id="mBpm" placeholder="Ex: 72"/></div>
    </div>
    <div class="form-group"><label>Versão</label><input type="text" id="mVersao" placeholder="Ex: Fernandinho"/></div>
    <div class="form-group"><label>Link YouTube</label><input type="text" id="mYt" placeholder="https://..."/></div>
    <div class="form-group"><label>Link Cifra</label><input type="text" id="mCifra" placeholder="https://..."/></div>
    <div class="form-group"><label>Link Partitura</label><input type="text" id="mPart" placeholder="https://..."/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarMusica()">Salvar</button>
    </div>`);
}

async function salvarMusica() {
  const nome = document.getElementById('mNome').value.trim();
  if (!nome) { showToast('Informe o nome da música', 'error'); return; }
  showLoading(true);
  const res = await api('adicionarMusica', {
    nome,
    artista: document.getElementById('mArtista').value,
    tom: document.getElementById('mTom').value,
    bpm: document.getElementById('mBpm').value,
    versao: document.getElementById('mVersao').value,
    youtube: document.getElementById('mYt').value,
    cifra: document.getElementById('mCifra').value,
    partitura: document.getElementById('mPart').value,
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Música adicionada! 🎵', 'success');
  closeModalDirect();
  await loadLidMusicas();
}

function openDetailMusica(id) {
  const m = _lidMusicas.find(x => x.Id === id) || {};
  document.getElementById('detailTitle').textContent = m.Nome || 'Música';
  document.getElementById('detailBody').innerHTML = `
    <div class="info-grid">
      <div class="info-item"><label>Tom</label><span style="font-family:monospace;font-size:20px;color:var(--accent2)">${m.Tom||'—'}</span></div>
      <div class="info-item"><label>BPM</label><span>${m.Bpm||'—'}</span></div>
      <div class="info-item"><label>Artista</label><span>${m.Artista||'—'}</span></div>
      <div class="info-item"><label>Versão</label><span>${m.Versao||'—'}</span></div>
    </div>
    <div class="detail-section">
      <h3>Links</h3>
      <div class="action-row">
        ${m.Youtube ? `<a class="btn-primary sm" href="${m.Youtube}" target="_blank" style="text-decoration:none">▶ YouTube</a>` : ''}
        ${m.Cifra ? `<a class="btn-ghost sm" href="${m.Cifra}" target="_blank">🎸 Cifra</a>` : ''}
        ${m.Partitura ? `<a class="btn-ghost sm" href="${m.Partitura}" target="_blank">📄 Partitura</a>` : ''}
      </div>
    </div>`;
  openDetail();
}

function openModalAdicionarMusicaEscala(escalaId) {
  showToast('Selecione músicas e atualize a escala em breve', 'info');
}

function openModalCriarSub(escalaId) {
  openModal('Pedir Substituto', `
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Abra uma vaga de substituto para esta escala.</p>
    <div class="form-group"><label>Instrumento necessário</label>
      <select id="subInstr">
        <option>Voz</option><option>Violão</option><option>Guitarra</option>
        <option>Baixo</option><option>Teclado</option><option>Bateria</option>
        <option>Percussão</option><option>Backing Vocal</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarSub('${escalaId}')">Abrir vaga</button>
    </div>`);
}

async function salvarSub(escalaId) {
  showLoading(true);
  const res = await api('criarSub', { escalaId, instrumento: document.getElementById('subInstr').value, musicoOutId: '' });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Vaga de sub aberta!', 'success');
  closeModalDirect();
}

// ==================== ADMIN ====================
let _admSidebarOpen = false;

async function initAdmin(res) {
  document.getElementById('admNome').textContent = res.nome;
  document.getElementById('admAvatar').textContent = res.nome[0];
  document.getElementById('admTopAvatar').textContent = res.nome[0];
  document.getElementById('admGreeting').textContent = `Bem-vindo, ${res.nome.split(' ')[0]}!`;
  showScreen('screenAdmin');
  await loadAdmDashboard();
}

function admPage(name) {
  document.querySelectorAll('.adm-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('admPage-' + name).classList.add('active');
  document.querySelector(`[data-p="${name}"]`).classList.add('active');
  document.getElementById('admTopTitle').textContent = {
    dashboard:'Dashboard', inscricoes:'Inscrições', musicos:'Músicos',
    bandas:'Bandas', celebracoes:'Celebrações', escalas:'Escalas',
    repertorios:'Repertórios', musicas:'Músicas', tokens:'Tokens',
  }[name] || name;
  if (_admSidebarOpen) toggleSidebar();

  const loaders = {
    inscricoes: loadAdmInscricoes,
    musicos: loadAdmMusicos,
    bandas: loadAdmBandas,
    celebracoes: loadAdmCelebracoes,
    escalas: loadAdmEscalas,
    repertorios: loadAdmRepertorios,
    musicas: loadAdmMusicas,
    tokens: loadAdmTokens,
  };
  if (loaders[name]) loaders[name]();
}

function toggleSidebar() {
  _admSidebarOpen = !_admSidebarOpen;
  document.getElementById('adminSidebar').classList.toggle('open', _admSidebarOpen);
}

// DASHBOARD
async function loadAdmDashboard() {
  showLoading(true);
  const res = await api('getDashboard');
  showLoading(false);
  if (!res.ok) { showToast('Erro ao carregar dashboard', 'error'); return; }
  const d = res.data;
  document.getElementById('admStats').innerHTML = `
    <div class="stat" style="border-left-color:#7C6FF7"><span class="stat-label">Músicos ativos</span><span class="stat-val">${d.totalMusicos}</span></div>
    <div class="stat" style="border-left-color:#F87171"><span class="stat-label">Inscrições pendentes</span><span class="stat-val">${d.audicoesPendentes}</span></div>
    <div class="stat" style="border-left-color:#4ECDC4"><span class="stat-label">Bandas</span><span class="stat-val">${d.totalBandas}</span></div>
    <div class="stat" style="border-left-color:#FBBF24"><span class="stat-label">Escalas este mês</span><span class="stat-val">${d.escalasEsteMes}</span></div>`;
  document.getElementById('badgeInsc').textContent = d.audicoesPendentes;

  document.getElementById('dashInscricoes').innerHTML = (d.ultimasInscricoes||[]).map(i => `
    <div class="list-item" style="margin-bottom:6px">
      <div class="avatar sm">${(i.Nome||'?')[0]}</div>
      <div class="list-item-info">
        <div class="list-item-name">${i.Nome}</div>
        <div class="list-item-sub">${i.Instrumentos}</div>
      </div>
      ${badgeStatus(i.Status)}
    </div>`).join('') || emptyState('🎙','Nenhuma inscrição');

  document.getElementById('dashCelebracoes').innerHTML = (d.proximasCelebracoes||[]).map(c => {
    const d2 = parseDate(c.Data);
    return `
    <div class="list-item" style="margin-bottom:6px">
      <div class="date-block"><div class="date-day">${d2.day}</div><div class="date-mon">${d2.mon}</div></div>
      <div class="list-item-info">
        <div class="list-item-name">${c.Nome}</div>
        <div class="list-item-sub">📍 ${c.Local}</div>
      </div>
    </div>`;}).join('') || emptyState('✨','Nenhuma celebração');
}

// INSCRIÇÕES
let _inscFilter = 'todos';
let _inscAll = [];
async function loadAdmInscricoes() {
  showLoading(true);
  const res = await api('getInscricoes');
  showLoading(false);
  _inscAll = res.ok ? res.data : [];
  renderAdmInscricoes();
}

function filterInsc(f, el) {
  _inscFilter = f;
  document.querySelectorAll('#admPage-inscricoes .ftab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAdmInscricoes();
}

function renderAdmInscricoes() {
  let list = _inscFilter === 'todos' ? [..._inscAll] : _inscAll.filter(i => (i.Status||i.status) === _inscFilter);
  list.sort((a,b) => (a.Nome||a.nome||'').localeCompare(b.Nome||b.nome||''));
  const el = document.getElementById('admInscricoesList');
  if (!list.length) { el.innerHTML = emptyState('🎙','Nenhuma inscrição'); return; }
  el.innerHTML = list.map(i => `
    <div class="card" onclick="openDetailInscricao('${i.Id}')">
      <div class="card-head">
        <div class="avatar">${(i.Nome||'?')[0]}</div>
        <div>
          <div class="card-name">${i.Nome}</div>
          <div class="card-sub">${i.Eklesia} • 📱 ${i.WhatsApp}</div>
        </div>
        ${badgeStatus(i.Status)}
      </div>
      <div class="itags">${(i.Instrumentos||'').split(',').map(x=>`<span class="itag">${x.trim()}</span>`).join('')}</div>
      <div class="card-foot">
        <span style="font-size:12px;color:var(--text3)">${fmtDate(i.DataInscricao)}</span>
        <a class="btn-whats" href="${waLink(i.WhatsApp,'')}" target="_blank" onclick="event.stopPropagation()">💬</a>
      </div>
    </div>`).join('');
}

function openDetailInscricao(id) {
  const i = _inscAll.find(x => x.Id === id);
  if (!i) return;
  const waAud = `Olá, ${i.Nome}! Sua audição para ${i.Instrumentos} foi agendada:%0A%0A📅 Data: [DATA]%0A⏰ Horário: [HORÁRIO]%0A📍 Local: [LOCAL]%0A%0ANos vemos lá! 🎵`;
  document.getElementById('detailTitle').textContent = i.Nome;
  document.getElementById('detailBody').innerHTML = `
    <div class="info-grid">
      <div class="info-item"><label>Nome</label><span>${i.Nome}</span></div>
      <div class="info-item"><label>Eklesia</label><span>${i.Eklesia}</span></div>
      <div class="info-item"><label>WhatsApp</label><span>${i.WhatsApp}</span></div>
      <div class="info-item"><label>Status</label><span>${badgeStatus(i.Status)}</span></div>
      <div class="info-item"><label>Instrumentos</label><span>${i.Instrumentos}</span></div>
      <div class="info-item"><label>Inscrição</label><span>${fmtDate(i.DataInscricao)}</span></div>
      ${i.DataAudicao ? `<div class="info-item"><label>Data audição</label><span>${fmtDate(i.DataAudicao)}</span></div>` : ''}
      ${i.Horario ? `<div class="info-item"><label>Horário</label><span>${i.Horario}</span></div>` : ''}
      ${i.Local ? `<div class="info-item"><label>Local</label><span>${i.Local}</span></div>` : ''}
    </div>
    ${i.Observacoes ? `<div class="detail-section"><h3>Observações</h3><p style="font-size:13px;color:var(--text2)">${i.Observacoes}</p></div>` : ''}
    <div class="detail-section">
      <h3>Ações</h3>
      <div class="action-row">
        ${i.Status === 'pendente' ? `<button class="btn-primary sm" onclick="openModalAgendar('${i.Id}')">📅 Agendar audição</button>` : ''}
        ${i.Status === 'agendada' ? `
          <button class="btn-green" onclick="aprovarInscricao('${i.Id}','aprovado')">✅ Aprovar</button>
          <button class="btn-red" onclick="aprovarInscricao('${i.Id}','reprovado')">❌ Reprovar</button>` : ''}
        <a class="btn-whats" href="${waLink(i.WhatsApp, i.Status==='agendada' ? waAud : `Olá, ${i.Nome}!`)}" target="_blank">💬 WhatsApp</a>
      </div>
    </div>`;
  openDetail();
}

function openModalAgendar(id) {
  openModal('Agendar Audição', `
    <div class="form-group"><label>Data *</label><input type="date" id="audData" required/></div>
    <div class="form-group"><label>Horário *</label><input type="time" id="audHora" required/></div>
    <div class="form-group"><label>Local *</label><input type="text" id="audLocal" placeholder="Ex: Sala de ensaio B" required/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="confirmarAgendamento('${id}')">Confirmar</button>
    </div>`);
}

async function confirmarAgendamento(id) {
  const data   = document.getElementById('audData').value;
  const horario = document.getElementById('audHora').value;
  const local  = document.getElementById('audLocal').value.trim();
  if (!data)   { showToast('Informe a data da audição', 'error'); return; }
  if (!horario){ showToast('Informe o horário', 'error'); return; }
  if (!local)  { showToast('Informe o local', 'error'); return; }

  showLoading(true);
  const res = await api('agendarAudicao', { id, dataAudicao: data, horario, local });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Audição agendada! ✅', 'success');
  closeModalDirect();
  closeDetail();
  await loadAdmInscricoes();
}

async function aprovarInscricao(id, tipo) {
  const i = _inscAll.find(x => x.Id === id);
  showLoading(true);
  const res = await api('aprovarMusico', { id, tipo, nome: i.Nome, eklesia: i.Eklesia, whatsapp: i.WhatsApp, instrumentos: i.Instrumentos });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  const msg = tipo === 'aprovado'
    ? `✅ ${i.Nome} aprovado(a)! Gere o token de acesso na aba Tokens.`
    : `${i.Nome} reprovado(a).`;
  showToast(msg, tipo === 'aprovado' ? 'success' : 'info');
  closeDetail();
  await loadAdmInscricoes();
}

// Músico detail com geração de token inline
let _admMusicosList_data = [];

async function openDetailMusico(id) {
  showLoading(true);
  const [resMusicos, resTokens] = await Promise.all([api('getMusicos'), api('getTokens')]);
  showLoading(false);

  const list = resMusicos.ok ? resMusicos.data : [];
  const m = list.find(x => String(field(x,'Id','id')) === String(id));
  if (!m) { showToast('Músico não encontrado', 'error'); return; }

  const tokens = resTokens.ok ? resTokens.data : [];
  const tokenExistente = tokens.find(t => String(t.MusicoId||t.musicoId) === String(id));

  const nome  = field(m,'Nome','nome') || '—';
  const ekl   = field(m,'Eklesia','eklesia') || '—';
  const wa    = field(m,'WhatsApp','whatsapp','Whatsapp') || '';
  const instr = field(m,'Instrumentos','instrumentos') || '';
  const banda = field(m,'Banda','banda') || 'Sem banda';
  const lider = field(m,'IsLider','isLider','islider') === 'sim';
  const fotoUrl = field(m,'FotoUrl','fotoUrl','fotourl') || '';

  document.getElementById('detailTitle').textContent = nome;
  document.getElementById('detailBody').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      ${fotoUrl
        ? `<img src="${fotoUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:10px"/>`
        : `<div class="avatar lg" style="margin:0 auto 10px">${nome[0]||'?'}</div>`
      }
      <h2 style="font-family:var(--fhead);font-size:20px;font-weight:800">${nome}</h2>
      <p style="color:var(--text2);font-size:13px">${ekl}</p>
    </div>

    <div class="info-grid">
      <div class="info-item"><label>WhatsApp</label><span>${wa||'—'}</span></div>
      <div class="info-item"><label>Instrumentos</label><span>${instr||'—'}</span></div>
      <div class="info-item"><label>Banda</label><span>${banda}</span></div>
      <div class="info-item"><label>Perfil</label><span>${lider ? '<span class="role-tag">Líder</span>' : '<span class="role-tag" style="background:rgba(52,211,153,.2);color:var(--green)">Voluntário</span>'}</span></div>
    </div>

    <div class="detail-section">
      <h3>Perfil de acesso</h3>
      ${tokenExistente ? `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">TOKEN GERADO</div>
          <div style="font-family:monospace;font-size:16px;font-weight:700;color:var(--accent2);letter-spacing:1px">${tokenExistente.Token||tokenExistente.token}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">Nível: ${tokenExistente.Nivel||tokenExistente.nivel} • Token imutável</div>
        </div>
        <a class="btn-whats" href="${waLink(wa, 'Seu token de acesso ao sistema Bandas IC: *' + (tokenExistente.Token||tokenExistente.token) + '*%0AAcesse: https://30semanas.github.io/bandasIC')}" target="_blank">💬 Enviar token por WhatsApp</a>
      ` : `
        <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Este músico ainda não tem token de acesso. Defina o perfil e gere agora:</p>
        <div class="form-group" style="margin-bottom:12px">
          <label>Perfil de acesso</label>
          <select id="musicoNivel">
            <option value="voluntario">🎵 Voluntário</option>
            ${lider ? '<option value="lider" selected>🎸 Líder de Banda</option>' : '<option value="lider">🎸 Líder de Banda</option>'}
          </select>
        </div>
        <button class="btn-primary sm" onclick="gerarTokenMusico('${id}','${nome}','${ekl}','${wa}')">🔑 Gerar token agora</button>
      `}
    </div>

    ${!lider ? `
    <div class="detail-section">
      <h3>Promover a líder</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:10px">Isso permitirá que ele gerencie bandas.</p>
      <button class="btn-ghost sm" onclick="openModalPromoverLiderDireto('${id}','${nome}')">⭐ Promover a líder</button>
    </div>` : ''}

    <div class="detail-section">
      <h3>Contato</h3>
      <a class="btn-whats" href="${waLink(wa,'')}" target="_blank">💬 Abrir WhatsApp</a>
    </div>
  `;
  openDetail();
}

async function gerarTokenMusico(musicoId, nome, eklesia, wa) {
  const nivel = document.getElementById('musicoNivel')?.value || 'voluntario';
  showLoading(true);
  const res = await api('gerarToken', { nome, eklesia, nivel, musicoId });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast(`Token gerado: ${res.token} ✅`, 'success');
  // Reabrir detail atualizado
  closeDetail();
  setTimeout(() => openDetailMusico(musicoId), 400);
}

function openModalPromoverLiderDireto(musicoId, nome) {
  _pendingAction = { type: 'promoverDireto', musicoId };
  openModal('⭐ Promover a Líder', `
    <p style="font-size:15px;color:var(--text2);text-align:center;padding:12px 0;line-height:1.7">
      Promover <strong style="color:var(--accent2)">${nome}</strong> a líder de banda?<br/>
      <span style="font-size:12px;color:var(--text3)">O token dele precisará ser do nível "Líder".</span>
    </p>
    <div class="modal-footer" style="justify-content:center;gap:12px">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="executarPromoverDireto()">⭐ Confirmar</button>
    </div>`);
}

async function executarPromoverDireto() {
  if (!_pendingAction || _pendingAction.type !== 'promoverDireto') return;
  const { musicoId } = _pendingAction;
  _pendingAction = null;
  closeModalDirect();
  showLoading(true);
  const res = await api('promoverLider', { musicoId });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Músico promovido a líder! ⭐', 'success');
  closeDetail();
  await loadAdmMusicos();
}

// MÚSICOS
async function loadAdmMusicos() {
  showLoading(true);
  const res = await api('getMusicos');
  showLoading(false);
  const list = res.ok ? res.data : [];
  _admMusicosList_data = list;
  const el = document.getElementById('admMusicosList');
  if (!list.length) { el.innerHTML = emptyState('👥','Nenhum músico cadastrado'); return; }
  list.sort((a,b)=>(a.Nome||a.nome||'').localeCompare(b.Nome||b.nome||''));
  el.innerHTML = list.map(m => `
    <div class="card">
      <div class="card-head">
        <div class="avatar">${(m.Nome||m.nome||'?')[0]}</div>
        <div>
          <div class="card-name">${m.Nome}</div>
          <div class="card-sub">${m.Eklesia} • 📱 ${m.WhatsApp}</div>
        </div>
        <span class="badge badge-aprov">ativo</span>
      </div>
      <div class="itags">${(m.Instrumentos||'').split(',').map(x=>`<span class="itag">${x.trim()}</span>`).join('')}</div>
      <div class="card-foot">
        <span style="font-size:12px;color:var(--text3)">${m.Banda||'Sem banda'}</span>
        <a class="btn-whats" href="${waLink(m.WhatsApp,'')}" target="_blank">💬</a>
      </div>
    </div>`).join('');
}

// BANDAS
let _admBandas = [];
async function loadAdmBandas() {
  showLoading(true);
  const res = await api('getBandas');
  showLoading(false);
  _admBandas = res.ok ? res.data : [];
  const el = document.getElementById('admBandasList');
  if (!_admBandas.length) { el.innerHTML = emptyState('🎸','Nenhuma banda'); return; }
  el.innerHTML = _admBandas.map(b => {
    const bid  = b.Id  || b.id  || '';
    const nome = b.Nome || b.nome || '—';
    const lider = b.LiderNome || b.liderNome || '—';
    const emoji = b.Emoji || b.emoji || '🎸';
    return `
    <div class="card">
      <div class="card-head">
        <div style="font-size:30px">${emoji}</div>
        <div style="flex:1">
          <div class="card-name">${nome}</div>
          <div class="card-sub">Líder: ${lider}</div>
        </div>
        <button class="btn-red" style="padding:5px 10px;font-size:12px" onclick="confirmarRemoverBanda('${bid}','${nome}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function openModalCriarBanda() {
  // Buscar líderes
  showLoading(true);
  const resLid = await api('getLideres');
  showLoading(false);
  const lideres = resLid.ok ? resLid.data : [];

  openModal('Nova Banda', `
    <div class="form-group"><label>Nome da banda *</label><input type="text" id="bNome"/></div>
    <div class="form-group"><label>Líder da banda *</label>
      <select id="bLiderId">
        <option value="">— Selecione um líder —</option>
        ${lideres.map(m => {
          const mid = m.Id || m.id || '';
          const mnome = m.Nome || m.nome || '';
          const mekl = m.Eklesia || m.eklesia || '';
          return `<option value="${mid}" data-nome="${mnome}">${mnome} — ${mekl}</option>`;
        }).join('')}
      </select>
      ${lideres.length === 0 ? '<p style="font-size:11px;color:var(--red);margin-top:4px">Nenhum líder cadastrado. Promova um músico a líder primeiro.</p>' : ''}
    </div>
    <div class="form-group"><label>Emoji</label><input type="text" id="bEmoji" value="🎸" maxlength="2"/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarBanda()">Criar banda</button>
    </div>`);
}

function confirmarRemoverBanda(id, nome) {
  _pendingAction = { type: 'removeBanda', id };
  openModal('🗑 Remover Banda', `
    <p style="font-size:15px;color:var(--text2);text-align:center;padding:12px 0;line-height:1.7">
      Tem certeza que deseja remover a banda<br/>
      <strong style="color:var(--red);font-size:18px">${nome}</strong>?<br/>
      <span style="font-size:12px;color:var(--text3)">Esta ação não pode ser desfeita.</span>
    </p>
    <div class="modal-footer" style="justify-content:center;gap:12px">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-red" onclick="executarRemoverBanda()">🗑 Confirmar remoção</button>
    </div>`);
}

async function executarRemoverBanda() {
  if (!_pendingAction || _pendingAction.type !== 'removeBanda') return;
  const { id } = _pendingAction;
  _pendingAction = null;
  closeModalDirect();
  showLoading(true);
  const res = await api('removerBanda', { id });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro ao remover', 'error'); return; }
  showToast('Banda removida!', 'success');
  await loadAdmBandas();
}

async function salvarBanda() {
  const sel = document.getElementById('bLiderId');
  const liderMusicoId = sel.value;
  const liderNome = sel.options[sel.selectedIndex]?.dataset?.nome || '';
  if (!liderMusicoId) { showToast('Selecione um líder', 'error'); return; }
  showLoading(true);
  const res = await api('criarBanda', {
    nome: document.getElementById('bNome').value,
    liderNome,
    liderMusicoId,
    emoji: document.getElementById('bEmoji').value || '🎸',
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Banda criada!', 'success');
  closeModalDirect();
  await loadAdmBandas();
}

// CELEBRAÇÕES
async function loadAdmCelebracoes() {
  showLoading(true);
  const res = await api('getCelebracoes');
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('admCelebracoesList');
  if (!list.length) { el.innerHTML = emptyState('✨','Nenhuma celebração'); return; }
  el.innerHTML = list.map(c => {
    const d = parseDate(c.Data);
    return `
    <div class="card">
      <div class="card-head">
        <div class="date-block"><div class="date-day">${d.day}</div><div class="date-mon">${d.mon}</div></div>
        <div>
          <div class="card-name">${c.Nome}</div>
          <div class="card-sub">⏰ ${c.Horario} • 📍 ${c.Local}</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">
        Repertório: ${c.RepertorioTipo === 'lider' ? '🎸 Líder define' : '⚙️ Admin define'}
      </div>
    </div>`; }).join('');
}

function openModalCriarCelebracao() {
  openModal('Nova Celebração', `
    <div class="form-group"><label>Nome *</label><input type="text" id="cNome" placeholder="Ex: Culto Dominical"/></div>
    <div class="form-row2">
      <div class="form-group"><label>Data</label><input type="date" id="cData"/></div>
      <div class="form-group"><label>Horário</label><input type="time" id="cHora"/></div>
    </div>
    <div class="form-group"><label>Local</label><input type="text" id="cLocal"/></div>
    <div class="form-group"><label>Observações</label><textarea id="cObs" rows="2"></textarea></div>
    <div class="form-group"><label>Quem define o repertório?</label>
      <select id="cRepTipo">
        <option value="admin">⚙️ Administrador</option>
        <option value="lider">🎸 Líder de banda</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarCelebracao()">Criar</button>
    </div>`);
}

async function salvarCelebracao() {
  showLoading(true);
  const res = await api('criarCelebracao', {
    nome: document.getElementById('cNome').value,
    data: document.getElementById('cData').value,
    horario: document.getElementById('cHora').value,
    local: document.getElementById('cLocal').value,
    obs: document.getElementById('cObs').value,
    repertorioTipo: document.getElementById('cRepTipo').value,
    bandasIds: [],
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Celebração criada!', 'success');
  closeModalDirect();
  await loadAdmCelebracoes();
}

// ESCALAS ADMIN
async function loadAdmEscalas() {
  showLoading(true);
  const res = await api('getEscalas');
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('admEscalasList');
  if (!list.length) { el.innerHTML = emptyState('📅','Nenhuma escala'); return; }
  el.innerHTML = list.map(e => {
    const d = parseDate(e.Data);
    return `
    <div class="list-item">
      <div class="date-block"><div class="date-day">${d.day}</div><div class="date-mon">${d.mon}</div></div>
      <div class="list-item-info">
        <div class="list-item-name">${e.Titulo}</div>
        <div class="list-item-sub">⏰ ${e.Horario} • 🎸 ${e.BandaNome} • 📍 ${e.Local}</div>
      </div>
      <div class="list-item-right">${badgeStatus(e.Status)}</div>
    </div>`; }).join('');
}

// REPERTÓRIOS ADMIN
async function loadAdmRepertorios() {
  showLoading(true);
  const res = await api('getRepertorios', {});
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('admRepertoriosList');
  if (!list.length) { el.innerHTML = emptyState('📋','Nenhum repertório'); return; }
  el.innerHTML = list.map(r => `
    <div class="card">
      <div class="card-name">📋 ${r.Nome}</div>
      <div class="card-sub" style="margin-top:4px">${(r.MusicasIds||'').split(',').filter(Boolean).length} música(s)</div>
    </div>`).join('');
}

// MÚSICAS ADMIN
let _admMusicas = [];
async function loadAdmMusicas() {
  showLoading(true);
  const res = await api('getMusicas');
  showLoading(false);
  _admMusicas = res.ok ? res.data : [];
  const el = document.getElementById('admMusicasList');
  if (!_admMusicas.length) { el.innerHTML = emptyState('🎼','Nenhuma música'); return; }
  el.innerHTML = _admMusicas.map(m => `
    <div class="card">
      <div class="card-name">🎵 ${m.Nome}</div>
      <div class="card-sub">${m.Artista} • ${m.Versao}</div>
      <div class="itags">
        <span class="itag">${m.Tom}</span>
        <span class="itag">${m.Bpm} BPM</span>
      </div>
    </div>`).join('');
}

// TOKENS
async function loadAdmTokens() {
  showLoading(true);
  const res = await api('getTokens');
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('admTokensList');
  if (!list.length) { el.innerHTML = emptyState('🔑','Nenhum token gerado'); return; }
  el.innerHTML = list.map(t => `
    <div class="token-item">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-weight:600;font-size:14px">${t.Nome} <span class="role-tag">${t.Nivel}</span></div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${t.Eklesia}</div>
        </div>
        <span class="token-code">${t.Token}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <a class="btn-whats" href="${waLink('','Seu token de acesso ao sistema Bandas IC: *' + t.Token + '*%0A%0AAcesse: https://30semanas.github.io/bandasIC')}" target="_blank">💬 Enviar por WhatsApp</a>
        <button class="btn-ghost sm" onclick="copyToken('${t.Token}')">📋 Copiar</button>
      </div>
    </div>`).join('');
}

async function openModalGerarToken() {
  showLoading(true);
  const [resMusicos, resTokens] = await Promise.all([api('getMusicos'), api('getTokens')]);
  showLoading(false);

  const musicos = (resMusicos.ok ? resMusicos.data : [])
    .sort((a,b) => (a.Nome||a.nome||'').localeCompare(b.Nome||b.nome||''));
  const tokensExistentes = (resTokens.ok ? resTokens.data : []).map(t => String(t.MusicoId));

  // Filtrar apenas sem token
  const semToken = musicos.filter(m => !tokensExistentes.includes(String(m.Id || m.id || '')));

  openModal('Gerar Token de Acesso', `
    <div class="form-group"><label>Músico / Pessoa *</label>
      <select id="tMusicoSel" onchange="preencherDadosToken(this)">
        <option value="">— Selecione —</option>
        ${semToken.map(m => {
          const mid = m.Id||m.id||'';
          const mnome = m.Nome||m.nome||'';
          const mekl = m.Eklesia||m.eklesia||'';
          const mlider = m.IsLider||m.isLider||'nao';
          return `<option value="${mid}" data-nome="${mnome}" data-eklesia="${mekl}" data-lider="${mlider}">${mnome} — ${mekl}</option>`;
        }).join('')}
        <option value="__novo__" data-nome="" data-eklesia="" data-lider="nao">+ Admin externo (novo)</option>
      </select>
      ${semToken.length === 0 ? '<p style="font-size:11px;color:var(--yellow);margin-top:4px">Todos os músicos já possuem token.</p>' : ''}
    </div>
    <div class="form-group" id="tNomeGrp" style="display:none">
      <label>Nome</label><input type="text" id="tNome" placeholder="Nome completo"/>
    </div>
    <div class="form-group" id="tEklesiaGrp" style="display:none">
      <label>Eklesia</label><input type="text" id="tEklesia"/>
    </div>
    <div class="form-group"><label>Nível de acesso *</label>
      <select id="tNivel">
        <option value="voluntario">🎵 Voluntário</option>
        <option value="lider">🎸 Líder de Banda</option>
        <option value="admin">⚙️ Administrador</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarToken()">Gerar token</button>
    </div>`);
}

function preencherDadosToken(sel) {
  const opt = sel.options[sel.selectedIndex];
  const isNovo = sel.value === '__novo__';
  document.getElementById('tNomeGrp').style.display = isNovo ? '' : 'none';
  document.getElementById('tEklesiaGrp').style.display = isNovo ? '' : 'none';
  // Pré-selecionar nível se for líder
  const isLider = opt.dataset.lider === 'sim';
  if (isLider) document.getElementById('tNivel').value = 'lider';
}

async function salvarToken() {
  const sel = document.getElementById('tMusicoSel');
  const musicoId = sel.value;
  const opt = sel.options[sel.selectedIndex];
  const isNovo = musicoId === '__novo__';

  let nome = isNovo ? document.getElementById('tNome').value.trim() : (opt.dataset.nome || '');
  let eklesia = isNovo ? document.getElementById('tEklesia').value.trim() : (opt.dataset.eklesia || '');
  const nivel = document.getElementById('tNivel').value;

  if (!nome) { showToast('Selecione ou informe o nome', 'error'); return; }

  showLoading(true);
  const res = await api('gerarToken', {
    nome, eklesia, nivel,
    musicoId: isNovo ? '' : musicoId,
  });
  showLoading(false);

  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast(`Token gerado: ${res.token} ✅`, 'success');
  closeModalDirect();
  await loadAdmTokens();
}

function copyToken(token) {
  navigator.clipboard.writeText(token).then(() => showToast('Token copiado!', 'success'));
}

// ==================== MODAL ====================
function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(e) { if (e.target === document.getElementById('modalOverlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modalOverlay').classList.remove('open'); }

// ==================== DETAIL ====================
function openDetail() { document.getElementById('detailPanel').classList.add('open'); }
function closeDetail() { document.getElementById('detailPanel').classList.remove('open'); }

// ==================== LOADING ====================
function showLoading(v) { document.getElementById('loading').classList.toggle('active', v); }

// ==================== TOAST ====================
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ==================== HELPERS ====================

// Busca campo em objeto ignorando maiúsculas/minúsculas
// Prioridade: exato > capitalizado > minúsculo
// Normaliza horário vindo do Sheets (pode ser decimal ou ISO)
function normHorario(val) {
  if (!val) return '';
  const s = String(val);
  if (s.includes('T')) return s.split('T')[1].substring(0,5);
  if (!isNaN(val) && Number(val) < 1) {
    const min = Math.round(Number(val) * 24 * 60);
    return String(Math.floor(min/60)).padStart(2,'0') + ':' + String(min%60).padStart(2,'0');
  }
  return s.substring(0,5);
}

function field(obj, ...keys) {
  if (!obj) return '';
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    const low = key.toLowerCase();
    if (obj[low] !== undefined && obj[low] !== null && obj[low] !== '') return obj[low];
    const cap = key.charAt(0).toUpperCase() + key.slice(1);
    if (obj[cap] !== undefined && obj[cap] !== null && obj[cap] !== '') return obj[cap];
  }
  return '';
}

function parseDate(str) {
  if (!str) return { day:'—', mon:'—', year:'—' };
  const d = new Date(str.includes('T') ? str : str + 'T12:00:00');
  return {
    day: String(d.getDate()).padStart(2,'0'),
    mon: d.toLocaleString('pt-BR', { month: 'short' }).replace('.',''),
    year: d.getFullYear(),
  };
}

function fmtDate(str) {
  if (!str) return '—';
  const d = parseDate(str);
  return `${d.day}/${d.mon}/${d.year}`;
}

function badgeStatus(s) {
  const map = {
    pendente:  ['badge-pend','pendente'],
    agendada:  ['badge-agend','agendada'],
    aprovado:  ['badge-aprov','aprovado'],
    reprovado: ['badge-reprov','reprovado'],
    aceita:    ['badge-aceita','aceita'],
    recusada:  ['badge-recusada','recusada'],
    aberta:    ['badge-pend','aberta'],
  };
  const [cls, label] = map[s] || ['badge-pend', s || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function waLink(number, msg) {
  const clean = (number || '').replace(/\D/g, '');
  const num = clean.startsWith('55') ? clean : '55' + clean;
  return `https://wa.me/${num || ''}?text=${msg}`;
}

function emptyState(icon, msg) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Fechar sidebar ao clicar fora (mobile admin)
  document.addEventListener('click', e => {
    if (_admSidebarOpen &&
        !e.target.closest('#adminSidebar') &&
        !e.target.closest('.hamburger')) {
      toggleSidebar();
    }
  });

  // Verificar sessão ativa
  const s = getSession();
  if (s) {
    if (s.nivel === 'admin') {
      initAdmin(s);
    } else if (s.nivel === 'lider') {
      initLider(s);
    } else if (s.nivel === 'voluntario') {
      initVoluntario(s);
    }
  }
});
