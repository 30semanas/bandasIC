/* ============================================
   MINISTÉRIO DE MÚSICA — APP.JS
============================================ */

// ==================== CONFIG ====================
const _c = [
  'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy',
  '9BS2Z5Y2J6MmJnWDlWMmZvajRCM19maWs3LUNDTG9rM19v',
  'T1hFYzgtZXFjQjYxay14cEk3WmFvTmRtV1lLeEFBblEwQU',
  'RDMURJUS9leGVj'
].join('');
const CONFIG = {
  get APPS_SCRIPT_URL() { return atob(_c); },
  DRIVE_FOLDER_ID: '',
};

// ==================== STATE ====================
let currentUser = null;
let currentPage = 'dashboard';
let sidebarOpen = false;

// ==================== MOCK DATA ====================
const DB = {
  audicoes: [
    { id: 1, nome: 'João Silva', whatsapp: '11999990001', instrumentos: ['Guitarra', 'Violão'], status: 'pendente', obs: 'Toco há 10 anos em igrejas', foto: null, data: '2025-06-05' },
    { id: 2, nome: 'Maria Santos', whatsapp: '11999990002', instrumentos: ['Voz', 'Backing Vocal'], status: 'agendada', obs: 'Cantora há 5 anos', foto: null, data: '2025-06-10', dataAudicao: '2025-06-15', horario: '10:00', local: 'Sala de ensaio B' },
    { id: 3, nome: 'Pedro Lima', whatsapp: '11999990003', instrumentos: ['Bateria'], status: 'pendente', obs: 'Baterista profissional', foto: null, data: '2025-06-12' },
    { id: 4, nome: 'Ana Costa', whatsapp: '11999990004', instrumentos: ['Teclado'], status: 'aprovado', obs: '', foto: null, data: '2025-05-20' },
    { id: 5, nome: 'Lucas Pereira', whatsapp: '11999990005', instrumentos: ['Baixo'], status: 'reprovado', obs: 'Recomendado treinar mais', foto: null, data: '2025-05-15' },
  ],

  musicos: [
    { id: 1, nome: 'Ana Costa', whatsapp: '11999990004', instrumentos: ['Teclado'], banda: 'Banda Principal', foto: null, ativo: true },
    { id: 2, nome: 'Carlos Rocha', whatsapp: '11999990006', instrumentos: ['Guitarra'], banda: 'Banda de Louvor', foto: null, ativo: true },
    { id: 3, nome: 'Fernanda Silva', whatsapp: '11999990007', instrumentos: ['Voz', 'Backing Vocal'], banda: 'Banda Principal', foto: null, ativo: true },
    { id: 4, nome: 'Ricardo Alves', whatsapp: '11999990008', instrumentos: ['Bateria'], banda: 'Banda Principal', foto: null, ativo: true },
    { id: 5, nome: 'Mariana Lima', whatsapp: '11999990009', instrumentos: ['Violão', 'Backing Vocal'], banda: 'Banda Jovem', foto: null, ativo: true },
    { id: 6, nome: 'Thiago Santos', whatsapp: '11999990010', instrumentos: ['Baixo'], banda: 'Banda de Louvor', foto: null, ativo: true },
  ],

  bandas: [
    { id: 1, nome: 'Banda Principal', lider: 'Carlos Rocha', emoji: '🎸', membros: [1, 2, 3, 4], cor: '#6C63FF' },
    { id: 2, nome: 'Banda de Louvor', lider: 'Fernanda Silva', emoji: '🎤', membros: [3, 6], cor: '#FF6B9D' },
    { id: 3, nome: 'Banda Jovem', lider: 'Mariana Lima', emoji: '🎵', membros: [5], cor: '#4ECDC4' },
    { id: 4, nome: 'Coral', lider: 'Ana Costa', emoji: '🎶', membros: [1, 3], cor: '#FFD93D' },
  ],

  escalas: [
    { id: 1, titulo: 'Culto de Domingo', data: '2025-06-01', horario: '09:00', local: 'Templo Principal', banda: 'Banda Principal', tipo: 'principal', status: 'aceita', musicos: [1,2,3,4], aceitesMap: {1:'aceita',2:'aceita',3:'pendente',4:'recusada'}, musicas: [1,2,3] },
    { id: 2, titulo: 'Culto de Quarta', data: '2025-06-04', horario: '19:30', local: 'Templo Principal', banda: 'Banda de Louvor', tipo: 'principal', status: 'pendente', musicos: [3,6], aceitesMap: {3:'pendente',6:'pendente'}, musicas: [2,4] },
    { id: 3, titulo: 'Culto de Jovens', data: '2025-06-07', horario: '18:00', local: 'Auditório', banda: 'Banda Jovem', tipo: 'principal', status: 'pendente', musicos: [5], aceitesMap: {5:'pendente'}, musicas: [3,5] },
    { id: 4, titulo: 'Conferência de Mulheres', data: '2025-06-14', horario: '08:00', local: 'Templo Principal', banda: 'Coral', tipo: 'principal', status: 'aceita', musicos: [1,3], aceitesMap: {1:'aceita',3:'aceita'}, musicas: [1,4,5] },
  ],

  musicas: [
    { id: 1, nome: 'Grande é o Senhor', artista: 'Fernandinho', tom: 'G', bpm: 72, versao: 'Fernandinho', youtube: 'https://youtube.com', letra: '', cifra: '', partitura: '' },
    { id: 2, nome: 'Nada Além do Sangue', artista: 'Hillsong', tom: 'C', bpm: 68, versao: 'Pt-BR', youtube: 'https://youtube.com', letra: '', cifra: '', partitura: '' },
    { id: 3, nome: 'Oceanos', artista: 'Hillsong United', tom: 'D', bpm: 60, versao: 'Hillsong', youtube: 'https://youtube.com', letra: '', cifra: '', partitura: '' },
    { id: 4, nome: 'Quão Grande é o Meu Deus', artista: 'Chris Tomlin', tom: 'A', bpm: 74, versao: 'Pt-BR', youtube: 'https://youtube.com', letra: '', cifra: '', partitura: '' },
    { id: 5, nome: 'Águas Purificadoras', artista: 'Fernandinho', tom: 'E', bpm: 78, versao: 'Original', youtube: 'https://youtube.com', letra: '', cifra: '', partitura: '' },
  ],

  repertorios: [
    { id: 1, nome: 'Louvor Dominical Junho', musicas: [1, 2, 3], criado: '2025-06-01' },
    { id: 2, nome: 'Conferência 2025', musicas: [1, 4, 5], criado: '2025-05-20' },
  ],

  celebracoes: [
    { id: 1, nome: 'Culto Dominical', data: '2025-06-01', horario: '09:00', local: 'Templo Principal', obs: '', bandas: [1], repertorio: 1 },
    { id: 2, nome: 'Conferência de Mulheres', data: '2025-06-14', horario: '08:00', local: 'Templo Principal', obs: 'Evento especial', bandas: [4], repertorio: 2 },
    { id: 3, nome: 'Culto de Jovens', data: '2025-06-07', horario: '18:00', local: 'Auditório', obs: '', bandas: [3], repertorio: 1 },
  ],

  ensaios: [
    { id: 1, banda: 'Banda Principal', data: '2025-05-30', horario: '19:00', local: 'Sala B', obs: 'Focar nas novas músicas', musicos: [1,2,3,4] },
    { id: 2, banda: 'Banda de Louvor', data: '2025-06-02', horario: '19:30', local: 'Sala A', obs: '', musicos: [3,6] },
  ],

  subs: [
    { id: 1, escala: 1, musico_out: 4, instrumento: 'Bateria', musico_in: null, status: 'aberta', data: '2025-06-01' },
  ],

  users: [
    { id: 1, nome: 'Admin', email: 'admin', senha: 'admin', role: 'admin', avatar: 'A' },
    { id: 2, nome: 'Carlos Rocha', email: 'lider', senha: '1234', role: 'lider', avatar: 'C' },
    { id: 3, nome: 'Ana Costa', email: 'musico', senha: '1234', role: 'musico', avatar: 'A', musicoId: 1 },
  ],
};

// ==================== AUTH ====================
function login() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  const found = DB.users.find(u => u.email === user && u.senha === pass);
  if (!found) {
    showToast('Usuário ou senha inválidos', 'error');
    return;
  }

  currentUser = found;
  document.getElementById('sidebarName').textContent = found.nome;
  document.getElementById('sidebarRole').textContent = getRoleLabel(found.role);
  document.getElementById('sidebarAvatar').textContent = found.avatar;
  document.getElementById('topbarAvatar').textContent = found.avatar;

  showScreen('appScreen');
  showPage('dashboard');
  loadAllData();
  showToast(`Bem-vindo, ${found.nome}! 🎵`, 'success');
}

function logout() {
  currentUser = null;
  showScreen('loginScreen');
}

function getRoleLabel(role) {
  return { admin: 'Administrador', lider: 'Líder', musico: 'Músico' }[role] || role;
}

// ==================== NAVIGATION ====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === name);
  });

  const titles = {
    dashboard: 'Dashboard', audicoes: 'Audições', musicos: 'Músicos',
    bandas: 'Bandas', escalas: 'Escalas', ensaios: 'Ensaios',
    repertorios: 'Repertórios', celebracoes: 'Celebrações',
    musicas: 'Músicas', subs: 'Substituições'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;
  currentPage = name;

  if (sidebarOpen) toggleSidebar();
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open', sidebarOpen);
}

function showPublicInscricao() {
  showScreen('inscricaoScreen');
}
function showLogin() {
  showScreen('loginScreen');
}

// ==================== LOAD DATA ====================
function loadAllData() {
  renderDashboard();
  renderAudicoes();
  renderMusicos();
  renderBandas();
  renderEscalas();
  renderMusicas();
  renderCelebracoes();
  renderRepertorios();
  renderEnsaios();
  renderSubs();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  // Escalas
  const escalaEl = document.getElementById('dashEscalas');
  escalaEl.innerHTML = DB.escalas.slice(0, 3).map(e => `
    <div class="musica-list-item" onclick="openDetailEscala(${e.id})">
      <div class="musica-num">📅</div>
      <div class="musica-list-info">
        <div class="musica-list-name">${e.titulo}</div>
        <div class="musica-list-sub">${formatDate(e.data)} • ${e.horario} • ${e.banda}</div>
      </div>
      <span class="status-badge status-${e.status}">${e.status}</span>
    </div>
  `).join('');

  // Audições
  const audEl = document.getElementById('dashAudicoes');
  const pendentes = DB.audicoes.filter(a => a.status === 'pendente');
  audEl.innerHTML = pendentes.slice(0, 3).map(a => `
    <div class="musica-list-item" onclick="openDetailAudicao(${a.id})">
      <div class="card-avatar" style="width:36px;height:36px;border-radius:8px;font-size:14px;">${a.nome[0]}</div>
      <div class="musica-list-info">
        <div class="musica-list-name">${a.nome}</div>
        <div class="musica-list-sub">${a.instrumentos.join(', ')}</div>
      </div>
      <span class="status-badge status-pendente">pendente</span>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">🎉</div><p>Nenhuma audição pendente</p></div>';

  // Celebrações
  const celEl = document.getElementById('dashCelebracoes');
  celEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">` +
    DB.celebracoes.slice(0, 3).map(c => `
      <div class="celebracao-card" onclick="openDetailCelebracao(${c.id})">
        <div class="celebracao-name">${c.nome}</div>
        <div class="celebracao-meta">
          <span>📅 ${formatDate(c.data)}</span>
          <span>⏰ ${c.horario}</span>
          <span>📍 ${c.local}</span>
        </div>
      </div>
    `).join('') + '</div>';
}

// ==================== AUDICOES ====================
let audicaoFilter = 'todos';

function renderAudicoes(data) {
  const grid = document.getElementById('audicoesGrid');
  let list = data || DB.audicoes;
  if (audicaoFilter !== 'todos') list = list.filter(a => a.status === audicaoFilter);

  grid.innerHTML = list.map(a => `
    <div class="audicao-card" onclick="openDetailAudicao(${a.id})">
      <div class="card-head">
        <div class="card-avatar">${a.nome[0]}</div>
        <div class="card-info">
          <div class="card-name">${a.nome}</div>
          <div class="card-sub">📱 ${a.whatsapp}</div>
        </div>
        <span class="status-badge status-${a.status}">${a.status}</span>
      </div>
      <div class="instruments-row">
        ${a.instrumentos.map(i => `<span class="instr-tag">${i}</span>`).join('')}
      </div>
      ${a.obs ? `<p style="font-size:13px;color:var(--text2);margin-bottom:12px">"${a.obs}"</p>` : ''}
      <div class="card-footer">
        <span class="card-date">📅 ${formatDate(a.data)}</span>
        <div style="display:flex;gap:8px">
          ${a.status === 'pendente' ? `<button class="btn-primary" style="padding:6px 12px;font-size:12px" onclick="event.stopPropagation();agendarAudicao(${a.id})">Agendar</button>` : ''}
          <a class="btn-whats" href="${whatsLink(a.whatsapp, '')}" target="_blank" onclick="event.stopPropagation()">💬</a>
        </div>
      </div>
    </div>
  `).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎙</div><p>Nenhuma audição encontrada</p></div>`;
}

function filterTabAudicao(tab, el) {
  audicaoFilter = tab;
  document.querySelectorAll('#page-audicoes .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderAudicoes();
}

function filterAudicoes(q) {
  const list = DB.audicoes.filter(a =>
    a.nome.toLowerCase().includes(q.toLowerCase()) ||
    a.instrumentos.some(i => i.toLowerCase().includes(q.toLowerCase()))
  );
  renderAudicoes(list);
}

function openDetailAudicao(id) {
  const a = DB.audicoes.find(x => x.id === id);
  if (!a) return;

  const panel = document.getElementById('detailPanel');
  document.getElementById('detailTitle').textContent = a.nome;

  const isAgendada = a.status === 'agendada';
  const waMsg = isAgendada
    ? `Olá, ${a.nome}! Sua audição para ${a.instrumentos.join('/')} foi agendada:%0A%0A📅 Data: ${formatDate(a.dataAudicao)}%0A⏰ Horário: ${a.horario}%0A📍 Local: ${a.local}%0A%0ANos vemos lá! 🎵`
    : `Olá, ${a.nome}! Gostaríamos de agendar sua audição para ${a.instrumentos.join('/')}. Você tem disponibilidade?`;

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Nome</label><span>${a.nome}</span></div>
      <div class="detail-info-item"><label>WhatsApp</label><span>${a.whatsapp}</span></div>
      <div class="detail-info-item"><label>Instrumentos</label><span>${a.instrumentos.join(', ')}</span></div>
      <div class="detail-info-item"><label>Status</label><span class="status-badge status-${a.status}">${a.status}</span></div>
      <div class="detail-info-item"><label>Inscrição</label><span>${formatDate(a.data)}</span></div>
      ${isAgendada ? `
        <div class="detail-info-item"><label>Data audição</label><span>${formatDate(a.dataAudicao)}</span></div>
        <div class="detail-info-item"><label>Horário</label><span>${a.horario}</span></div>
        <div class="detail-info-item"><label>Local</label><span>${a.local}</span></div>
      ` : ''}
    </div>
    ${a.obs ? `<div class="detail-section"><h3>Observações</h3><p style="font-size:14px;color:var(--text2)">${a.obs}</p></div>` : ''}

    <div class="detail-section">
      <h3>Ações</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${a.status === 'pendente' ? `<button class="btn-primary" onclick="agendarAudicao(${a.id})">📅 Agendar audição</button>` : ''}
        ${a.status === 'agendada' ? `
          <button class="btn-green" onclick="aprovarMusico(${a.id},'aprovado')">✅ Aprovar</button>
          <button class="btn-red" onclick="aprovarMusico(${a.id},'reprovado')">❌ Reprovar</button>
          <button class="btn-ghost sm" onclick="aprovarMusico(${a.id},'parcial')">⚡ Aprovar parcialmente</button>
        ` : ''}
        <a class="btn-whats" href="${whatsLink(a.whatsapp, waMsg)}" target="_blank">💬 Notificar WhatsApp</a>
        <button class="btn-ghost sm" onclick="alterarNumero(${a.id})">📱 Alterar número</button>
      </div>
    </div>
  `;

  panel.classList.add('open');
}

function agendarAudicao(id) {
  const a = DB.audicoes.find(x => x.id === id);
  openModal('Agendar Audição', `
    <div class="form-group"><label>Data da audição</label><input type="date" id="audData" /></div>
    <div class="form-group"><label>Horário</label><input type="time" id="audHora" /></div>
    <div class="form-group"><label>Local</label><input type="text" id="audLocal" placeholder="Ex: Sala de ensaio B" /></div>
    <div class="form-group"><label>Observações</label><textarea id="audObs" placeholder="..."></textarea></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="confirmarAudicao(${id})">Confirmar →</button>
    </div>
  `);
}

function confirmarAudicao(id) {
  const a = DB.audicoes.find(x => x.id === id);
  a.status = 'agendada';
  a.dataAudicao = document.getElementById('audData').value;
  a.horario = document.getElementById('audHora').value;
  a.local = document.getElementById('audLocal').value;
  closeModalDirect();
  renderAudicoes();
  showToast('Audição agendada! Notifique o candidato via WhatsApp.', 'success');
  openDetailAudicao(id);
}

function aprovarMusico(id, tipo) {
  const a = DB.audicoes.find(x => x.id === id);
  a.status = tipo;
  if (tipo === 'aprovado') {
    // Criar músico
    const novoMusico = {
      id: DB.musicos.length + 1,
      nome: a.nome,
      whatsapp: a.whatsapp,
      instrumentos: a.instrumentos,
      banda: 'Banda Principal',
      foto: null,
      ativo: true,
    };
    DB.musicos.push(novoMusico);
    renderMusicos();
    showToast(`${a.nome} aprovado(a) e adicionado(a) como músico! 🎉`, 'success');
  } else {
    showToast(`${a.nome} ${tipo === 'reprovado' ? 'reprovado(a)' : 'aprovado(a) parcialmente'}`, 'info');
  }
  renderAudicoes();
  closeDetail();
}

function alterarNumero(id) {
  const a = DB.audicoes.find(x => x.id === id);
  openModal('Alterar número', `
    <div class="form-group">
      <label>Novo número de WhatsApp</label>
      <input type="text" id="novoNum" value="${a.whatsapp}" />
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarNumero(${id})">Salvar</button>
    </div>
  `);
}
function salvarNumero(id) {
  const a = DB.audicoes.find(x => x.id === id);
  a.whatsapp = document.getElementById('novoNum').value;
  closeModalDirect();
  showToast('Número atualizado!', 'success');
}

// ==================== MUSICOS ====================
function renderMusicos(data) {
  const grid = document.getElementById('musicosGrid');
  const list = data || DB.musicos;
  grid.innerHTML = list.map(m => `
    <div class="musico-card" onclick="openDetailMusico(${m.id})">
      <div class="musico-avatar">${m.nome[0]}</div>
      <div class="card-info">
        <div class="card-name">${m.nome}</div>
        <div class="card-sub" style="margin-bottom:8px">🎸 ${m.banda}</div>
        <div class="instruments-row">
          ${m.instrumentos.map(i => `<span class="instr-tag">${i}</span>`).join('')}
        </div>
      </div>
      <div class="card-footer" style="margin-top:12px">
        <span class="status-badge status-aprovado">ativo</span>
        <a class="btn-whats" href="${whatsLink(m.whatsapp, `Olá, ${m.nome}!`)}" target="_blank" onclick="event.stopPropagation()">💬</a>
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum músico cadastrado</p></div>';
}

function filterMusicos(q) {
  const list = DB.musicos.filter(m => m.nome.toLowerCase().includes(q.toLowerCase()));
  renderMusicos(list);
}
function filterMusicoInstrumento(instr) {
  const list = instr ? DB.musicos.filter(m => m.instrumentos.includes(instr)) : DB.musicos;
  renderMusicos(list);
}

function openDetailMusico(id) {
  const m = DB.musicos.find(x => x.id === id);
  if (!m) return;

  const minhasEscalas = DB.escalas.filter(e => e.musicos.includes(id));

  document.getElementById('detailTitle').textContent = m.nome;
  document.getElementById('detailContent').innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div class="musico-avatar" style="margin:0 auto 12px;width:80px;height:80px;font-size:32px">${m.nome[0]}</div>
      <h2 style="font-family:var(--font-head);font-size:22px;font-weight:800">${m.nome}</h2>
      <p style="color:var(--text2);margin-top:4px">📱 ${m.whatsapp}</p>
    </div>

    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Banda</label><span>${m.banda}</span></div>
      <div class="detail-info-item"><label>Instrumentos</label><span>${m.instrumentos.join(', ')}</span></div>
      <div class="detail-info-item"><label>Status</label><span class="status-badge status-aprovado">Ativo</span></div>
    </div>

    <div class="detail-section">
      <h3>Escalas recentes</h3>
      ${minhasEscalas.map(e => `
        <div class="musica-list-item" onclick="openDetailEscala(${e.id})">
          <div class="musica-num">📅</div>
          <div class="musica-list-info">
            <div class="musica-list-name">${e.titulo}</div>
            <div class="musica-list-sub">${formatDate(e.data)} • ${e.horario}</div>
          </div>
          <span class="status-badge status-${e.aceitesMap[id] || 'pendente'}">${e.aceitesMap[id] || 'pendente'}</span>
        </div>
      `).join('') || '<p style="font-size:13px;color:var(--text3)">Nenhuma escala ainda</p>'}
    </div>

    <div class="detail-section">
      <h3>Contato</h3>
      <div style="display:flex;gap:10px">
        <a class="btn-whats" href="${whatsLink(m.whatsapp, `Olá, ${m.nome}!`)}" target="_blank">💬 Enviar mensagem</a>
        <button class="btn-ghost sm" onclick="editarMusico(${m.id})">✏️ Editar</button>
      </div>
    </div>
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function openModalMusico() {
  openModal('Adicionar músico', `
    <div class="form-group"><label>Nome completo</label><input type="text" id="mNome" /></div>
    <div class="form-group"><label>WhatsApp</label><input type="text" id="mWa" /></div>
    <div class="form-group"><label>Banda</label>
      <select id="mBanda">${DB.bandas.map(b=>`<option>${b.nome}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Instrumentos</label>
      <div class="instrument-grid">
        ${['Voz','Violão','Guitarra','Baixo','Teclado','Bateria','Percussão','Backing Vocal'].map(i=>
          `<label class="instrument-chip"><input type="checkbox" value="${i}" /><span>${i}</span></label>`
        ).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarMusico()">Salvar músico</button>
    </div>
  `);
}

function salvarMusico() {
  const instrChecked = [...document.querySelectorAll('#modalBody .instrument-chip input:checked')].map(i => i.value);
  DB.musicos.push({
    id: DB.musicos.length + 1,
    nome: document.getElementById('mNome').value,
    whatsapp: document.getElementById('mWa').value,
    instrumentos: instrChecked,
    banda: document.getElementById('mBanda').value,
    foto: null, ativo: true,
  });
  closeModalDirect();
  renderMusicos();
  showToast('Músico adicionado!', 'success');
}

function editarMusico(id) {
  showToast('Função de edição disponível em breve', 'info');
}

// ==================== BANDAS ====================
function renderBandas() {
  const grid = document.getElementById('bandasGrid');
  grid.innerHTML = DB.bandas.map(b => {
    const membros = DB.musicos.filter(m => b.membros.includes(m.id));
    return `
      <div class="banda-card" onclick="openDetailBanda(${b.id})">
        <div class="banda-header">
          <div class="banda-icon" style="background:${b.cor}22;border:1px solid ${b.cor}44">${b.emoji}</div>
          <button class="btn-ghost sm" onclick="event.stopPropagation();editarBanda(${b.id})">✏️</button>
        </div>
        <div class="banda-name" style="color:${b.cor}">${b.nome}</div>
        <div class="banda-lider">👤 Líder: ${b.lider}</div>
        <div class="banda-members">
          ${membros.slice(0,5).map(m=>`<div class="member-pip">${m.nome[0]}</div>`).join('')}
          <span class="members-count">${membros.length} integrante${membros.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="card-footer" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text3)">📅 ${DB.escalas.filter(e=>e.banda===b.nome).length} escala(s)</span>
          <button class="btn-primary" style="padding:6px 14px;font-size:12px" onclick="event.stopPropagation();criarEscalaBanda(${b.id})">+ Escala</button>
        </div>
      </div>
    `;
  }).join('');
}

function openDetailBanda(id) {
  const b = DB.bandas.find(x => x.id === id);
  if (!b) return;
  const membros = DB.musicos.filter(m => b.membros.includes(m.id));
  const escalas = DB.escalas.filter(e => e.banda === b.nome);

  document.getElementById('detailTitle').textContent = b.nome;
  document.getElementById('detailContent').innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="width:64px;height:64px;border-radius:16px;background:${b.cor}22;border:1px solid ${b.cor}44;display:flex;align-items:center;justify-content:center;font-size:28px">${b.emoji}</div>
      <div>
        <h2 style="font-family:var(--font-head);font-size:24px;font-weight:800;color:${b.cor}">${b.nome}</h2>
        <p style="color:var(--text2)">👤 Líder: ${b.lider}</p>
      </div>
    </div>

    <div class="detail-section">
      <h3>Integrantes (${membros.length})</h3>
      ${membros.map(m => `
        <div class="musica-list-item" onclick="openDetailMusico(${m.id})">
          <div class="user-avatar">${m.nome[0]}</div>
          <div class="musica-list-info">
            <div class="musica-list-name">${m.nome}</div>
            <div class="musica-list-sub">${m.instrumentos.join(', ')}</div>
          </div>
          <a class="btn-whats" href="${whatsLink(m.whatsapp,'')}" target="_blank" onclick="event.stopPropagation()">💬</a>
        </div>
      `).join('')}
      <button class="btn-ghost sm" style="margin-top:8px" onclick="adicionarMembroBanda(${id})">+ Adicionar integrante</button>
    </div>

    <div class="detail-section">
      <h3>Escalas da banda</h3>
      ${escalas.map(e => {
        const aceitos = Object.values(e.aceitesMap).filter(v => v === 'aceita').length;
        const total = e.musicos.length;
        return `
          <div class="musica-list-item" onclick="openDetailEscala(${e.id})">
            <div class="musica-num">📅</div>
            <div class="musica-list-info">
              <div class="musica-list-name">${e.titulo}</div>
              <div class="musica-list-sub">${formatDate(e.data)} • ${e.horario}</div>
            </div>
            <span style="font-size:12px;color:var(--text2)">${aceitos}/${total} aceitos</span>
          </div>
        `;
      }).join('') || '<p style="font-size:13px;color:var(--text3)">Nenhuma escala</p>'}
      <button class="btn-primary" style="margin-top:12px;font-size:13px;padding:8px 16px" onclick="openModalEscala()">+ Nova escala</button>
    </div>
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function openModalBanda() {
  openModal('Nova banda', `
    <div class="form-group"><label>Nome da banda</label><input type="text" id="bNome" /></div>
    <div class="form-group"><label>Líder</label>
      <select id="bLider">${DB.musicos.map(m=>`<option>${m.nome}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Emoji / Ícone</label><input type="text" id="bEmoji" value="🎸" maxlength="2" /></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarBanda()">Criar banda</button>
    </div>
  `);
}

function salvarBanda() {
  DB.bandas.push({
    id: DB.bandas.length + 1,
    nome: document.getElementById('bNome').value,
    lider: document.getElementById('bLider').value,
    emoji: document.getElementById('bEmoji').value || '🎸',
    membros: [],
    cor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
  });
  closeModalDirect();
  renderBandas();
  showToast('Banda criada!', 'success');
}
function editarBanda(id) { showToast('Edição de banda em breve', 'info'); }
function criarEscalaBanda(id) { openModalEscala(id); }
function adicionarMembroBanda(id) { showToast('Selecione um músico para adicionar', 'info'); }

// ==================== ESCALAS ====================
let escalaFilter = 'todas';

function renderEscalas(data) {
  const grid = document.getElementById('escalasGrid');
  let list = data || DB.escalas;
  if (escalaFilter !== 'todas') list = list.filter(e => e.status === escalaFilter);

  grid.innerHTML = list.map(e => {
    const d = new Date(e.data + 'T12:00:00');
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' });
    const aceitos = Object.values(e.aceitesMap).filter(v=>v==='aceita').length;
    const recusados = Object.values(e.aceitesMap).filter(v=>v==='recusada').length;
    const pendentes = Object.values(e.aceitesMap).filter(v=>v==='pendente').length;
    return `
      <div class="escala-card" onclick="openDetailEscala(${e.id})">
        <div class="escala-date-block">
          <div class="escala-day">${day}</div>
          <div class="escala-month">${month}</div>
        </div>
        <div class="escala-info">
          <div class="escala-title">${e.titulo}</div>
          <div class="escala-meta">
            <span>⏰ ${e.horario}</span>
            <span>📍 ${e.local}</span>
            <span>🎸 ${e.banda}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <span style="font-size:11px;padding:2px 8px;background:rgba(52,211,153,0.1);color:var(--green);border-radius:20px">✓ ${aceitos}</span>
            <span style="font-size:11px;padding:2px 8px;background:rgba(248,113,113,0.1);color:var(--red);border-radius:20px">✗ ${recusados}</span>
            <span style="font-size:11px;padding:2px 8px;background:rgba(251,191,36,0.1);color:var(--yellow);border-radius:20px">⏳ ${pendentes}</span>
          </div>
        </div>
        <div class="escala-actions">
          <span class="status-badge status-${e.status}">${e.status}</span>
          <button class="btn-ghost sm" onclick="event.stopPropagation();notificarEscala(${e.id})">💬</button>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhuma escala encontrada</p></div>';
}

function filterTabEscala(tab, el) {
  escalaFilter = tab;
  document.querySelectorAll('#page-escalas .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderEscalas();
}

function openDetailEscala(id) {
  const e = DB.escalas.find(x => x.id === id);
  if (!e) return;

  const musicosEscala = e.musicos.map(mid => DB.musicos.find(m => m.id === mid)).filter(Boolean);
  const musicasEscala = e.musicas.map(mid => DB.musicas.find(m => m.id === mid)).filter(Boolean);

  document.getElementById('detailTitle').textContent = e.titulo;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Data</label><span>${formatDate(e.data)}</span></div>
      <div class="detail-info-item"><label>Horário</label><span>${e.horario}</span></div>
      <div class="detail-info-item"><label>Local</label><span>${e.local}</span></div>
      <div class="detail-info-item"><label>Banda</label><span>${e.banda}</span></div>
      <div class="detail-info-item"><label>Tipo</label><span>${e.tipo}</span></div>
      <div class="detail-info-item"><label>Status</label><span class="status-badge status-${e.status}">${e.status}</span></div>
    </div>

    <div class="detail-section">
      <h3>Músicas da escala (${musicasEscala.length})</h3>
      ${musicasEscala.map((m, i) => `
        <div class="musica-list-item" onclick="openDetailMusica(${m.id})">
          <div class="musica-num">${i+1}</div>
          <div class="musica-list-info">
            <div class="musica-list-name">${m.nome}</div>
            <div class="musica-list-sub">${m.artista} • ${m.versao}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="musica-list-key">${m.tom}</span>
            <span style="font-size:11px;color:var(--text3)">${m.bpm}bpm</span>
          </div>
        </div>
      `).join('') || '<p style="font-size:13px;color:var(--text3)">Nenhuma música adicionada</p>'}
      <button class="btn-ghost sm" style="margin-top:8px" onclick="addMusicaEscala(${e.id})">+ Adicionar música</button>
    </div>

    <div class="detail-section">
      <h3>Status de aceite dos músicos</h3>
      <div class="aceite-grid">
        ${musicosEscala.map(m => {
          const aceite = e.aceitesMap[m.id] || 'pendente';
          return `
            <div class="aceite-item">
              <div class="user-avatar">${m.nome[0]}</div>
              <div class="aceite-name">${m.nome.split(' ')[0]}</div>
              <div class="aceite-status"><span class="status-badge status-${aceite}">${aceite}</span></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="detail-section">
      <h3>Ações</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        <button class="btn-whats" onclick="notificarEscala(${e.id})">💬 Notificar músicos</button>
        <button class="btn-ghost sm" onclick="pedirSub(${e.id})">🔄 Pedir substituto</button>
        <button class="btn-ghost sm" onclick="editarEscala(${e.id})">✏️ Editar</button>
      </div>
    </div>

    ${currentUser?.role === 'musico' ? `
      <div class="detail-section">
        <h3>Minha resposta</h3>
        <div style="display:flex;gap:10px">
          <button class="btn-green" onclick="responderEscala(${e.id},'aceita')">✅ Aceitar</button>
          <button class="btn-red" onclick="responderEscala(${e.id},'recusada')">❌ Recusar</button>
        </div>
      </div>
    ` : ''}
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function responderEscala(id, resp) {
  const e = DB.escalas.find(x => x.id === id);
  if (currentUser?.musicoId) {
    e.aceitesMap[currentUser.musicoId] = resp;
    showToast(`Escala ${resp === 'aceita' ? 'aceita' : 'recusada'}!`, resp === 'aceita' ? 'success' : 'info');
    closeDetail();
    renderEscalas();
  }
}

function notificarEscala(id) {
  const e = DB.escalas.find(x => x.id === id);
  const musicosEscala = e.musicos.map(mid => DB.musicos.find(m => m.id === mid)).filter(Boolean);
  const msg = `🎵 *${e.titulo}*%0A%0A📅 Data: ${formatDate(e.data)}%0A⏰ Horário: ${e.horario}%0A📍 Local: ${e.local}%0A🎸 Banda: ${e.banda}%0A%0APor favor confirme sua presença!`;

  openModal('Notificar músicos', `
    <p style="color:var(--text2);font-size:14px;margin-bottom:16px">Clique em cada músico para abrir o WhatsApp:</p>
    ${musicosEscala.map(m => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:8px">
        <div class="user-avatar">${m.nome[0]}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${m.nome}</div>
          <div style="font-size:12px;color:var(--text2)">${m.whatsapp}</div>
        </div>
        <a class="btn-whats" href="${whatsLink(m.whatsapp, msg)}" target="_blank">💬 Notificar</a>
      </div>
    `).join('')}
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Fechar</button>
    </div>
  `);
}

function openModalEscala(bandaId) {
  openModal('Nova escala', `
    <div class="form-group"><label>Título</label><input type="text" id="eTitulo" placeholder="Ex: Culto Dominical" /></div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input type="date" id="eData" /></div>
      <div class="form-group"><label>Horário</label><input type="time" id="eHora" /></div>
    </div>
    <div class="form-group"><label>Local</label><input type="text" id="eLocal" /></div>
    <div class="form-group"><label>Banda</label>
      <select id="eBanda">${DB.bandas.map(b=>`<option ${bandaId&&b.id===bandaId?'selected':''}>${b.nome}</option>`).join('')}</select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarEscala()">Criar escala</button>
    </div>
  `);
}

function salvarEscala() {
  const bandaNome = document.getElementById('eBanda').value;
  const banda = DB.bandas.find(b => b.nome === bandaNome);
  DB.escalas.push({
    id: DB.escalas.length + 1,
    titulo: document.getElementById('eTitulo').value,
    data: document.getElementById('eData').value,
    horario: document.getElementById('eHora').value,
    local: document.getElementById('eLocal').value,
    banda: bandaNome,
    tipo: 'principal',
    status: 'pendente',
    musicos: banda ? banda.membros : [],
    aceitesMap: {},
    musicas: [],
  });
  closeModalDirect();
  renderEscalas();
  showToast('Escala criada!', 'success');
}

function editarEscala(id) { showToast('Edição disponível em breve', 'info'); }
function pedirSub(id) { showPage('subs'); closeDetail(); }
function addMusicaEscala(id) { showToast('Selecione uma música da biblioteca', 'info'); }

// ==================== MUSICAS ====================
function renderMusicas(data) {
  const grid = document.getElementById('musicasGrid');
  const list = data || DB.musicas;
  grid.innerHTML = list.map(m => `
    <div class="musica-card" onclick="openDetailMusica(${m.id})">
      <div class="musica-icon">🎵</div>
      <div class="musica-name">${m.nome}</div>
      <div class="musica-artist">${m.artista} • ${m.versao}</div>
      <div class="musica-tags">
        <span class="musica-tag">${m.tom}</span>
        <span class="musica-tag">${m.bpm} BPM</span>
      </div>
      <div class="musica-links">
        ${m.youtube ? `<a class="link-btn" href="${m.youtube}" target="_blank" onclick="event.stopPropagation()">▶ YouTube</a>` : ''}
        ${m.cifra ? `<a class="link-btn" href="${m.cifra}" target="_blank" onclick="event.stopPropagation()">🎸 Cifra</a>` : ''}
        ${m.partitura ? `<a class="link-btn" href="${m.partitura}" target="_blank" onclick="event.stopPropagation()">📄 Partitura</a>` : ''}
      </div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">🎼</div><p>Nenhuma música cadastrada</p></div>';
}

function filterMusicas(q) {
  const list = DB.musicas.filter(m =>
    m.nome.toLowerCase().includes(q.toLowerCase()) ||
    m.artista.toLowerCase().includes(q.toLowerCase())
  );
  renderMusicas(list);
}

function openDetailMusica(id) {
  const m = DB.musicas.find(x => x.id === id);
  if (!m) return;
  document.getElementById('detailTitle').textContent = m.nome;
  document.getElementById('detailContent').innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#FF6B9D,#FB923C);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 12px">🎵</div>
      <h2 style="font-family:var(--font-head);font-size:22px;font-weight:800">${m.nome}</h2>
      <p style="color:var(--text2)">${m.artista} • ${m.versao}</p>
    </div>

    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Tonalidade</label><span style="font-family:monospace;font-size:20px;color:var(--accent2)">${m.tom}</span></div>
      <div class="detail-info-item"><label>BPM</label><span>${m.bpm}</span></div>
    </div>

    <div class="detail-section">
      <h3>Links</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${m.youtube ? `<a class="btn-primary" href="${m.youtube}" target="_blank" style="text-decoration:none">▶ YouTube</a>` : ''}
        ${m.cifra ? `<a class="link-btn" href="${m.cifra}" target="_blank">🎸 Ver cifra</a>` : ''}
        ${m.partitura ? `<a class="link-btn" href="${m.partitura}" target="_blank">📄 Ver partitura</a>` : ''}
        ${m.letra ? `<a class="link-btn" href="${m.letra}" target="_blank">📝 Ver letra</a>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <h3>Upload de arquivos</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <label class="upload-area" style="padding:12px 16px">
          <input type="file" accept=".pdf" style="display:none" onchange="uploadArquivo(this,'cifra',${m.id})" />
          <span style="font-size:13px;color:var(--text2)">📎 Upload cifra PDF</span>
        </label>
        <label class="upload-area" style="padding:12px 16px">
          <input type="file" accept=".pdf" style="display:none" onchange="uploadArquivo(this,'partitura',${m.id})" />
          <span style="font-size:13px;color:var(--text2)">📎 Upload partitura PDF</span>
        </label>
      </div>
    </div>
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function openModalMusica() {
  openModal('Adicionar música', `
    <div class="form-group"><label>Nome da música *</label><input type="text" id="muNome" /></div>
    <div class="form-group"><label>Artista / Ministério *</label><input type="text" id="muArtista" /></div>
    <div class="form-row">
      <div class="form-group"><label>Tonalidade</label><input type="text" id="muTom" placeholder="Ex: G, A, C#" /></div>
      <div class="form-group"><label>BPM</label><input type="text" id="muBpm" placeholder="Ex: 72" /></div>
    </div>
    <div class="form-group"><label>Versão</label><input type="text" id="muVersao" placeholder="Ex: Fernandinho, Pt-BR" /></div>
    <div class="form-group"><label>Link YouTube</label><input type="text" id="muYt" placeholder="https://..." /></div>
    <div class="form-group"><label>Link Cifra</label><input type="text" id="muCifra" placeholder="https://..." /></div>
    <div class="form-group"><label>Link Partitura</label><input type="text" id="muPart" placeholder="https://..." /></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarMusica()">Salvar música</button>
    </div>
  `);
}

function salvarMusica() {
  DB.musicas.push({
    id: DB.musicas.length + 1,
    nome: document.getElementById('muNome').value,
    artista: document.getElementById('muArtista').value,
    tom: document.getElementById('muTom').value,
    bpm: parseInt(document.getElementById('muBpm').value) || 0,
    versao: document.getElementById('muVersao').value,
    youtube: document.getElementById('muYt').value,
    cifra: document.getElementById('muCifra').value,
    partitura: document.getElementById('muPart').value,
    letra: '',
  });
  closeModalDirect();
  renderMusicas();
  showToast('Música adicionada à biblioteca!', 'success');
}

function uploadArquivo(input, tipo, id) {
  if (input.files[0]) {
    showToast(`Arquivo de ${tipo} recebido! Enviando para Google Drive...`, 'info');
    // sendToDrive(input.files[0], tipo, id); // Integrar com Apps Script
  }
}

// ==================== CELEBRACOES ====================
function renderCelebracoes() {
  const grid = document.getElementById('celebracoesGrid');
  grid.innerHTML = DB.celebracoes.map(c => `
    <div class="celebracao-card" onclick="openDetailCelebracao(${c.id})">
      <div class="celebracao-name">${c.nome}</div>
      <div class="celebracao-meta">
        <span>📅 ${formatDate(c.data)}</span>
        <span>⏰ ${c.horario}</span>
        <span>📍 ${c.local}</span>
        <span>🎸 ${c.bandas.map(bid => DB.bandas.find(b=>b.id===bid)?.nome).join(', ')}</span>
      </div>
    </div>
  `).join('');
}

function openDetailCelebracao(id) {
  const c = DB.celebracoes.find(x => x.id === id);
  if (!c) return;
  const rep = DB.repertorios.find(r => r.id === c.repertorio);
  const bandas = c.bandas.map(bid => DB.bandas.find(b => b.id === bid)).filter(Boolean);

  document.getElementById('detailTitle').textContent = c.nome;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-info-grid">
      <div class="detail-info-item"><label>Data</label><span>${formatDate(c.data)}</span></div>
      <div class="detail-info-item"><label>Horário</label><span>${c.horario}</span></div>
      <div class="detail-info-item"><label>Local</label><span>${c.local}</span></div>
      ${c.obs ? `<div class="detail-info-item"><label>Observações</label><span>${c.obs}</span></div>` : ''}
    </div>

    <div class="detail-section">
      <h3>Bandas</h3>
      ${bandas.map(b => `
        <div class="musica-list-item" onclick="openDetailBanda(${b.id})">
          <div style="font-size:24px">${b.emoji}</div>
          <div class="musica-list-info">
            <div class="musica-list-name">${b.nome}</div>
            <div class="musica-list-sub">Líder: ${b.lider}</div>
          </div>
        </div>
      `).join('')}
    </div>

    ${rep ? `
      <div class="detail-section">
        <h3>Repertório: ${rep.nome}</h3>
        ${rep.musicas.map((mid, i) => {
          const m = DB.musicas.find(x => x.id === mid);
          return m ? `
            <div class="musica-list-item" onclick="openDetailMusica(${m.id})">
              <div class="musica-num">${i+1}</div>
              <div class="musica-list-info">
                <div class="musica-list-name">${m.nome}</div>
                <div class="musica-list-sub">${m.artista}</div>
              </div>
              <span class="musica-list-key">${m.tom}</span>
            </div>
          ` : '';
        }).join('')}
      </div>
    ` : ''}
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function openModalCelebracao() {
  openModal('Nova celebração', `
    <div class="form-group"><label>Nome da celebração</label><input type="text" id="cNome" placeholder="Ex: Culto Dominical" /></div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input type="date" id="cData" /></div>
      <div class="form-group"><label>Horário</label><input type="time" id="cHora" /></div>
    </div>
    <div class="form-group"><label>Local</label><input type="text" id="cLocal" /></div>
    <div class="form-group"><label>Observações</label><textarea id="cObs"></textarea></div>
    <div class="form-group"><label>Banda(s)</label>
      <select id="cBanda">${DB.bandas.map(b=>`<option value="${b.id}">${b.nome}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Repertório</label>
      <select id="cRep"><option value="">— Selecionar —</option>${DB.repertorios.map(r=>`<option value="${r.id}">${r.nome}</option>`).join('')}</select>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarCelebracao()">Criar celebração</button>
    </div>
  `);
}

function salvarCelebracao() {
  DB.celebracoes.push({
    id: DB.celebracoes.length + 1,
    nome: document.getElementById('cNome').value,
    data: document.getElementById('cData').value,
    horario: document.getElementById('cHora').value,
    local: document.getElementById('cLocal').value,
    obs: document.getElementById('cObs').value,
    bandas: [parseInt(document.getElementById('cBanda').value)],
    repertorio: parseInt(document.getElementById('cRep').value) || null,
  });
  closeModalDirect();
  renderCelebracoes();
  showToast('Celebração criada!', 'success');
}

// ==================== REPERTORIOS ====================
function renderRepertorios() {
  const grid = document.getElementById('repertoriosGrid');
  grid.innerHTML = DB.repertorios.map(r => `
    <div class="celebracao-card" onclick="openDetailRepertorio(${r.id})" style="cursor:pointer">
      <div class="celebracao-name">📋 ${r.nome}</div>
      <div class="celebracao-meta">
        <span>🎵 ${r.musicas.length} música(s)</span>
        <span>📅 Criado: ${formatDate(r.criado)}</span>
      </div>
      <div style="margin-top:12px">
        ${r.musicas.slice(0,3).map(mid => {
          const m = DB.musicas.find(x => x.id === mid);
          return m ? `<span style="display:inline-block;font-size:12px;padding:2px 8px;background:var(--bg4);border-radius:6px;margin:2px">${m.nome}</span>` : '';
        }).join('')}
        ${r.musicas.length > 3 ? `<span style="font-size:12px;color:var(--text3)">+${r.musicas.length-3} mais</span>` : ''}
      </div>
    </div>
  `).join('');
}

function openDetailRepertorio(id) {
  const r = DB.repertorios.find(x => x.id === id);
  if (!r) return;
  document.getElementById('detailTitle').textContent = r.nome;
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-section">
      <h3>Músicas (${r.musicas.length})</h3>
      ${r.musicas.map((mid, i) => {
        const m = DB.musicas.find(x => x.id === mid);
        return m ? `
          <div class="musica-list-item" onclick="openDetailMusica(${m.id})">
            <div class="musica-num">${i+1}</div>
            <div class="musica-list-info">
              <div class="musica-list-name">${m.nome}</div>
              <div class="musica-list-sub">${m.artista} • ${m.versao}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="musica-list-key">${m.tom}</span>
              <span style="font-size:11px;color:var(--text3)">${m.bpm}bpm</span>
            </div>
          </div>
        ` : '';
      }).join('')}
      <button class="btn-ghost sm" style="margin-top:8px" onclick="addMusicaRepertorio(${r.id})">+ Adicionar música</button>
    </div>
  `;
  document.getElementById('detailPanel').classList.add('open');
}

function openModalRepertorio() {
  openModal('Novo repertório', `
    <div class="form-group"><label>Nome do repertório</label><input type="text" id="rNome" placeholder="Ex: Louvor Dominical Junho" /></div>
    <div class="form-group"><label>Músicas</label>
      ${DB.musicas.map(m => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px">
          <input type="checkbox" value="${m.id}" />
          <span style="font-size:14px">${m.nome}</span>
          <span style="font-size:12px;color:var(--text3)">${m.artista}</span>
        </label>
      `).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarRepertorio()">Criar repertório</button>
    </div>
  `);
}

function salvarRepertorio() {
  const checked = [...document.querySelectorAll('#modalBody input[type=checkbox]:checked')].map(i => parseInt(i.value));
  DB.repertorios.push({
    id: DB.repertorios.length + 1,
    nome: document.getElementById('rNome').value,
    musicas: checked,
    criado: new Date().toISOString().split('T')[0],
  });
  closeModalDirect();
  renderRepertorios();
  showToast('Repertório criado!', 'success');
}
function addMusicaRepertorio(id) { showToast('Selecione músicas para adicionar', 'info'); }

// ==================== ENSAIOS ====================
function renderEnsaios() {
  const grid = document.getElementById('ensaiosGrid');
  grid.innerHTML = DB.ensaios.map(e => {
    const d = new Date(e.data + 'T12:00:00');
    return `
      <div class="escala-card" onclick="">
        <div class="escala-date-block">
          <div class="escala-day">${d.getDate()}</div>
          <div class="escala-month">${d.toLocaleString('pt-BR',{month:'short'})}</div>
        </div>
        <div class="escala-info">
          <div class="escala-title">Ensaio — ${e.banda}</div>
          <div class="escala-meta">
            <span>⏰ ${e.horario}</span>
            <span>📍 ${e.local}</span>
          </div>
          ${e.obs ? `<p style="font-size:12px;color:var(--text3);margin-top:6px">${e.obs}</p>` : ''}
        </div>
        <div class="escala-actions">
          <button class="btn-ghost sm" onclick="event.stopPropagation();notificarEnsaio(${e.id})">💬</button>
        </div>
      </div>
    `;
  }).join('') || '<div class="empty-state"><div class="empty-icon">🎵</div><p>Nenhum ensaio cadastrado</p></div>';
}

function openModalEnsaio() {
  openModal('Novo ensaio', `
    <div class="form-group"><label>Banda</label>
      <select id="enBanda">${DB.bandas.map(b=>`<option>${b.nome}</option>`).join('')}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input type="date" id="enData" /></div>
      <div class="form-group"><label>Horário</label><input type="time" id="enHora" /></div>
    </div>
    <div class="form-group"><label>Local</label><input type="text" id="enLocal" /></div>
    <div class="form-group"><label>Observações</label><textarea id="enObs"></textarea></div>
    <div class="modal-footer">
      <button class="btn-ghost sm" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn-primary" onclick="salvarEnsaio()">Criar ensaio</button>
    </div>
  `);
}

function salvarEnsaio() {
  const bandaNome = document.getElementById('enBanda').value;
  const banda = DB.bandas.find(b => b.nome === bandaNome);
  DB.ensaios.push({
    id: DB.ensaios.length + 1,
    banda: bandaNome,
    data: document.getElementById('enData').value,
    horario: document.getElementById('enHora').value,
    local: document.getElementById('enLocal').value,
    obs: document.getElementById('enObs').value,
    musicos: banda ? banda.membros : [],
  });
  closeModalDirect();
  renderEnsaios();
  showToast('Ensaio criado!', 'success');
}

function notificarEnsaio(id) {
  const e = DB.ensaios.find(x => x.id === id);
  const musicosEnsaio = e.musicos.map(mid => DB.musicos.find(m => m.id === mid)).filter(Boolean);
  const msg = `🎵 *Ensaio — ${e.banda}*%0A%0A📅 ${formatDate(e.data)}%0A⏰ ${e.horario}%0A📍 ${e.local}${e.obs ? `%0A%0A📝 ${e.obs}` : ''}`;
  openModal('Notificar ensaio', `
    <p style="color:var(--text2);font-size:14px;margin-bottom:16px">Notifique os músicos:</p>
    ${musicosEnsaio.map(m => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg3);border-radius:10px;margin-bottom:8px">
        <div class="user-avatar">${m.nome[0]}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:14px">${m.nome}</div></div>
        <a class="btn-whats" href="${whatsLink(m.whatsapp, msg)}" target="_blank">💬</a>
      </div>
    `).join('')}
    <div class="modal-footer"><button class="btn-ghost sm" onclick="closeModalDirect()">Fechar</button></div>
  `);
}

// ==================== SUBS ====================
function renderSubs() {
  const grid = document.getElementById('subsGrid');
  grid.innerHTML = `
    <div class="dash-section">
      <div class="section-header"><h2>Substituições abertas</h2></div>
      ${DB.subs.filter(s=>s.status==='aberta').map(s => {
        const escala = DB.escalas.find(e => e.id === s.escala);
        const musicoOut = DB.musicos.find(m => m.id === s.musico_out);
        return `
          <div class="musica-list-item">
            <div class="musica-num">🔄</div>
            <div class="musica-list-info">
              <div class="musica-list-name">${escala?.titulo || 'Escala'}</div>
              <div class="musica-list-sub">${formatDate(s.data)} • ${s.instrumento} • Saída: ${musicoOut?.nome || '?'}</div>
            </div>
            <button class="btn-primary" style="font-size:12px;padding:6px 12px" onclick="buscarSub(${s.id})">Buscar sub</button>
          </div>
        `;
      }).join('') || '<p style="font-size:13px;color:var(--text3)">Nenhuma substituição aberta</p>'}
    </div>

    <div class="dash-section">
      <div class="section-header"><h2>Músicos disponíveis</h2></div>
      <div style="margin-bottom:12px">
        <select onchange="filtrarSubInstrumento(this.value)" class="select-filter" style="width:100%">
          <option value="">Todos os instrumentos</option>
          ${['Voz','Violão','Guitarra','Baixo','Teclado','Bateria','Percussão','Backing Vocal'].map(i=>`<option>${i}</option>`).join('')}
        </select>
      </div>
      <div id="subsMusicos">
        ${DB.musicos.map(m => `
          <div class="musica-list-item">
            <div class="user-avatar">${m.nome[0]}</div>
            <div class="musica-list-info">
              <div class="musica-list-name">${m.nome}</div>
              <div class="musica-list-sub">${m.instrumentos.join(', ')}</div>
            </div>
            <a class="btn-whats" href="${whatsLink(m.whatsapp,'Olá! Precisamos de um substituto...')}" target="_blank">💬 Convidar</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function filtrarSubInstrumento(instr) {
  const list = instr ? DB.musicos.filter(m => m.instrumentos.includes(instr)) : DB.musicos;
  document.getElementById('subsMusicos').innerHTML = list.map(m => `
    <div class="musica-list-item">
      <div class="user-avatar">${m.nome[0]}</div>
      <div class="musica-list-info">
        <div class="musica-list-name">${m.nome}</div>
        <div class="musica-list-sub">${m.instrumentos.join(', ')}</div>
      </div>
      <a class="btn-whats" href="${whatsLink(m.whatsapp,'Olá! Precisamos de um substituto...')}" target="_blank">💬 Convidar</a>
    </div>
  `).join('');
}

function buscarSub(id) { showToast('Selecione um músico disponível ao lado', 'info'); }

// ==================== INSCRICAO PUBLICA ====================
function previewFoto(input) {
  const el = document.getElementById('fotoPreview');
  if (input.files && input.files[0]) {
    const r = new FileReader();
    r.onload = e => {
      el.innerHTML = `<img src="${e.target.result}" style="width:80px;height:80px;border-radius:50%;object-fit:cover" /><p style="font-size:12px;margin-top:8px">Foto selecionada</p>`;
    };
    r.readAsDataURL(input.files[0]);
  }
}

function enviarInscricao() {
  const nome = document.getElementById('inscNome').value.trim();
  const whats = document.getElementById('inscWhats').value.trim();
  const instrs = [...document.querySelectorAll('.instrument-chip input:checked')].map(i => i.value);

  if (!nome) { showToast('Por favor, insira seu nome', 'error'); return; }
  if (!whats) { showToast('Por favor, insira seu WhatsApp', 'error'); return; }
  if (instrs.length === 0) { showToast('Selecione ao menos um instrumento', 'error'); return; }

  DB.audicoes.push({
    id: DB.audicoes.length + 1,
    nome,
    whatsapp: whats,
    instrumentos: instrs,
    status: 'pendente',
    obs: document.getElementById('inscObs').value,
    foto: null,
    data: new Date().toISOString().split('T')[0],
  });

  document.getElementById('badgeAudicoes').textContent = DB.audicoes.filter(a=>a.status==='pendente').length;

  // Show success
  document.querySelector('.public-container').innerHTML = `
    <div style="text-align:center;padding:60px 24px">
      <div style="font-size:72px;margin-bottom:20px">🎉</div>
      <h2 style="font-family:var(--font-head);font-size:28px;font-weight:800;margin-bottom:12px">Inscrição enviada!</h2>
      <p style="color:var(--text2);font-size:16px;margin-bottom:32px">Em breve entraremos em contato pelo WhatsApp para agendar sua audição.</p>
      <button class="btn-primary" onclick="showLogin()">Voltar →</button>
    </div>
  `;

  // sendToAppsScript({ action: 'createInscricao', data: { nome, whats, instrs } });
}

// ==================== MODAL ==================== 
function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ==================== DETAIL PANEL ====================
function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
}

// ==================== TOAST ====================
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ==================== HELPERS ====================
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function whatsLink(number, msg) {
  const clean = number.replace(/\D/g, '');
  const num = clean.startsWith('55') ? clean : '55' + clean;
  return `https://wa.me/${num}?text=${msg}`;
}

// ==================== APPS SCRIPT INTEGRATION ====================
// ==================== APPS SCRIPT INTEGRATION ====================
async function sendToAppsScript(payload) {
  try {
    const resp = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (e) {
    console.error('Apps Script error:', e);
    return { error: e.message };
  }
}

async function loadFromAppsScript(action, params = {}) {
  try {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch (e) {
    console.error('Apps Script load error:', e);
    return null;
  }
}

async function uploadFileToAppsScript(file, tipo, referenciaId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await sendToAppsScript({
        action: tipo === 'foto' ? 'uploadFoto' : 'uploadArquivo',
        data: {
          base64: reader.result,
          nome: file.name,
          mimeType: file.type,
          tipo,
          musicaId: referenciaId,
          musicoId: referenciaId,
        },
      });
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Close sidebar on outside click (mobile)
  document.addEventListener('click', e => {
    if (sidebarOpen && !e.target.closest('#sidebar') && !e.target.closest('.hamburger')) {
      toggleSidebar();
    }
  });
});
