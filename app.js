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
  const isGet = ['getInscricoes','getMusicos','getBandas','getEscalas','getMusicas',
    'getRepertorios','getCelebracoes','getTokens','getDashboard','getMinhasBandas',
    'getMinhasEscalas','getMeuPerfil','getSubs','getEscalaById'].includes(action);

  const session = getSession();
  const payload = { action, sessionKey: session?.sessionKey || '', ...data };

  try {
    let resp;
    if (isGet) {
      const u = new URL(url);
      Object.entries(payload).forEach(([k,v]) => u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v));
      resp = await fetch(u.toString());
    } else {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
    }
    const json = await resp.json();
    return json;
  } catch(e) {
    console.error('API error:', e);
    return { ok: false, error: 'Erro de conexão' };
  }
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
  const res = await api('submitInscricao', { nome, eklesia, whatsapp: whats, instrumentos: instrs, obs });
  showLoading(false);

  if (!res.ok) { showToast(res.error || 'Erro ao enviar', 'error'); return; }

  document.querySelector('#screenInscricao .pub-wrap').innerHTML = `
    <div class="empty" style="padding:80px 24px">
      <div class="empty-icon">🎉</div>
      <h2 style="font-family:var(--fhead);font-size:24px;font-weight:800;margin-bottom:10px">Inscrição enviada!</h2>
      <p style="color:var(--text2);margin-bottom:28px">Em breve o administrador entrará em contato pelo WhatsApp para agendar sua audição.</p>
      <button class="btn-primary" onclick="goTo('screenHome')">Voltar ao início</button>
    </div>`;
}

// ==================== VOLUNTÁRIO ====================
async function initVoluntario(res) {
  document.getElementById('volNome').textContent = res.nome;
  document.getElementById('volGreeting').textContent = `Olá, ${res.nome.split(' ')[0]}! 👋`;
  document.getElementById('volEklesia').textContent = res.eklesia;
  showScreen('screenVoluntario');
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
  const list = f === 'todas' ? _volEscalas : _volEscalas.filter(e => e.meuStatus === f);
  const el = document.getElementById('volEscalasList');
  if (!list.length) { el.innerHTML = emptyState('📅','Nenhuma escala encontrada'); return; }
  el.innerHTML = list.map(e => {
    const d = parseDate(e.Data);
    return `
    <div class="list-item" onclick="openDetailEscalaVol('${e.Id}')">
      <div class="date-block">
        <div class="date-day">${d.day}</div>
        <div class="date-mon">${d.mon}</div>
      </div>
      <div class="list-item-info">
        <div class="list-item-name">${e.Titulo}</div>
        <div class="list-item-sub">⏰ ${e.Horario} • 📍 ${e.Local}</div>
      </div>
      <div class="list-item-right">
        ${badgeStatus(e.meuStatus)}
      </div>
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

async function loadVolSubs() {
  showLoading(true);
  const res = await api('getSubs', {});
  showLoading(false);
  const subs = res.ok ? res.data.filter(s => s.Status === 'aberta') : [];
  const el = document.getElementById('volSubsList');
  if (!subs.length) { el.innerHTML = emptyState('🔄','Nenhuma substituição aberta'); return; }
  el.innerHTML = subs.map(s => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">Sub: ${s.Instrumento}</div>
        <div class="list-item-sub">Escala ID: ${s.EscalaId}</div>
      </div>
      <span class="badge badge-pend">aberta</span>
    </div>`).join('');
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
  const list = _inscFilter === 'todos' ? _inscAll : _inscAll.filter(i => i.Status === _inscFilter);
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
    <div class="form-group"><label>Data</label><input type="date" id="audData"/></div>
    <div class="form-group"><label>Horário</label><input type="time" id="audHora"/></div>
    <div class="form-group"><label>Local</label><input type="text" id="audLocal" placeholder="Ex: Sala de ensaio B"/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="confirmarAgendamento('${id}')">Confirmar</button>
    </div>`);
}

async function confirmarAgendamento(id) {
  showLoading(true);
  const res = await api('agendarAudicao', {
    id,
    dataAudicao: document.getElementById('audData').value,
    horario: document.getElementById('audHora').value,
    local: document.getElementById('audLocal').value,
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast('Audição agendada! Notifique via WhatsApp. 📱', 'success');
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

// MÚSICOS
async function loadAdmMusicos() {
  showLoading(true);
  const res = await api('getMusicos');
  showLoading(false);
  const list = res.ok ? res.data : [];
  const el = document.getElementById('admMusicosList');
  if (!list.length) { el.innerHTML = emptyState('👥','Nenhum músico cadastrado'); return; }
  el.innerHTML = list.map(m => `
    <div class="card">
      <div class="card-head">
        <div class="avatar">${(m.Nome||'?')[0]}</div>
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
  el.innerHTML = _admBandas.map(b => `
    <div class="card">
      <div class="card-head">
        <div style="font-size:30px">${b.Emoji||'🎸'}</div>
        <div>
          <div class="card-name">${b.Nome}</div>
          <div class="card-sub">Líder: ${b.LiderNome}</div>
        </div>
      </div>
    </div>`).join('');
}

function openModalCriarBanda() {
  openModal('Nova Banda', `
    <div class="form-group"><label>Nome da banda *</label><input type="text" id="bNome"/></div>
    <div class="form-group"><label>Nome do líder *</label><input type="text" id="bLider"/></div>
    <div class="form-group"><label>Emoji</label><input type="text" id="bEmoji" value="🎸" maxlength="2"/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarBanda()">Criar banda</button>
    </div>`);
}

async function salvarBanda() {
  showLoading(true);
  const res = await api('criarBanda', {
    nome: document.getElementById('bNome').value,
    liderNome: document.getElementById('bLider').value,
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

function openModalGerarToken() {
  openModal('Gerar Token de Acesso', `
    <div class="form-group"><label>Nome *</label><input type="text" id="tNome"/></div>
    <div class="form-group"><label>Eklesia / Igreja</label><input type="text" id="tEklesia"/></div>
    <div class="form-group"><label>Nível de acesso *</label>
      <select id="tNivel">
        <option value="voluntario">🎵 Voluntário</option>
        <option value="lider">🎸 Líder de Banda</option>
        <option value="admin">⚙️ Administrador</option>
      </select>
    </div>
    <div class="form-group"><label>ID do Músico (se voluntário)</label><input type="text" id="tMusicoId" placeholder="Deixe em branco para admin/líder"/></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarToken()">Gerar token</button>
    </div>`);
}

async function salvarToken() {
  const nome = document.getElementById('tNome').value.trim();
  if (!nome) { showToast('Informe o nome', 'error'); return; }
  showLoading(true);
  const res = await api('gerarToken', {
    nome,
    eklesia: document.getElementById('tEklesia').value,
    nivel: document.getElementById('tNivel').value,
    musicoId: document.getElementById('tMusicoId').value,
  });
  showLoading(false);
  if (!res.ok) { showToast(res.error || 'Erro', 'error'); return; }
  showToast(`Token gerado: ${res.token}`, 'success');
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
