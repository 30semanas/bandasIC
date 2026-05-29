// BANDAS IC — app.js v4 (clean rewrite)

// API URL obfuscada
const _e=['aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy','9BS2Z5Y2J6MmJnWDlWMmZvajRCM19maWs3LUNDTG9rM19v','T1hFYzgtZXFjQjYxay14cEk3WmFvTmRtV1lLeEFBblEwQU','RDMURJUS9leGVj'].join('');

// ===== API =====
async function api(action, data={}) {
  const url = atob(_e);
  const sess = getSess();
  const p = {action, sessionKey: sess ? sess.sk : '', ...data};
  return new Promise(resolve => {
    const cb = '_cb_' + Math.random().toString(36).slice(2,9);
    const u = new URL(url);
    Object.entries(p).forEach(([k,v]) => u.searchParams.set(k, typeof v==='object' ? JSON.stringify(v) : String(v===undefined?'':v)));
    u.searchParams.set('callback', cb);
    const s = document.createElement('script');
    const t = setTimeout(()=>{ cleanup(); resolve({ok:false,error:'Timeout'}); }, 15000);
    function cleanup(){ clearTimeout(t); delete window[cb]; if(s.parentNode) s.parentNode.removeChild(s); }
    window[cb] = r => { cleanup(); resolve(r); };
    s.onerror = () => { cleanup(); resolve({ok:false,error:'Rede'}); };
    s.src = u.toString();
    document.head.appendChild(s);
  });
}

// ===== SESSION =====
function saveSess(d){ sessionStorage.setItem('bic',JSON.stringify({sk:d.sessionKey,nivel:d.nivel,nome:d.nome,eklesia:d.eklesia,mid:d.musicoId||'',exp:Date.now()+8*3600000})); }
function getSess(){ try{ const s=JSON.parse(sessionStorage.getItem('bic')); if(!s||Date.now()>s.exp){sessionStorage.removeItem('bic');return null;} return s; }catch{return null;} }
function clearSess(){ sessionStorage.removeItem('bic'); }

// ===== NAV =====
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0,0); }

// Login pela tela home com campo único de token
async function doLoginHome() {
  const token = document.getElementById('homeToken').value.trim();
  if (!token) { toast('Digite seu token de acesso','err'); return; }
  load(true);
  const r = await api('login', { token });
  load(false);
  if (!r.ok) { toast(r.error || 'Token inválido. Verifique e tente novamente.','err'); return; }
  saveSess(r);
  toast('Bem-vindo, ' + r.nome + '! 🎵','ok');
  if (r.nivel==='master')          initAdmin(r);
  else if (r.nivel==='liderequipe')initLiderEquipe(r);
  else if (r.nivel==='liderbanda') initLider(r);
  else if (r.nivel==='musico')     initVol(r);
  else toast('Nível desconhecido: ' + r.nivel,'err');
}

// Navegar para tela de login (chamada pelos botões da home)
function irLogin(title, nivel) {
  _loginNivel = nivel;
  const el = document.getElementById('loginTitle');
  if (el) el.textContent = title || 'Acessar';
  const tok = document.getElementById('iToken');
  if (tok) tok.value = '';
  // Esconder todas as telas
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // Mostrar tela de login
  const login = document.getElementById('sLogin');
  if (login) login.classList.add('active');
  window.scrollTo(0, 0);
}

function showLogin(title, nivel){
  _loginNivel = nivel;
  document.getElementById('loginTitle').textContent = title || 'Acessar';
  document.getElementById('iToken').value = '';
  if (!nivel) { show('sInsc'); return; }
  show('sLogin');
}
let _loginNivel = 'admin';

// ===== AUTH =====
async function doLogin(){
  const token = document.getElementById('iToken').value.trim();
  if (!token){ toast('Digite seu token','err'); return; }
  load(true);
  const r = await api('login',{token});
  load(false);
  if (!r.ok){ toast(r.error||'Token inválido','err'); return; }
  saveSess(r);
  toast('Bem-vindo, '+r.nome+'! 🎵','ok');
  if (r.nivel==='admin') initAdmin(r);
  else if (r.nivel==='lider') initLider(r);
  else if (r.nivel==='voluntario') initVol(r);
  else toast('Nível desconhecido','err');
}

async function sair(){
  const s = getSess();
  if (s) await api('logout',{sessionKey:s.sk});
  clearSess();
  show('sHome');
}

// ===== INSCRIÇÃO =====
function prevFoto(inp){
  const el = document.getElementById('fotoPrev');
  if(inp.files&&inp.files[0]){ const r=new FileReader(); r.onload=e=>{ el.innerHTML=`<img src="${e.target.result}" style="width:80px;height:80px;border-radius:50%;object-fit:cover"><p style="font-size:11px;color:var(--text2);margin-top:6px">✓ Selecionada</p>`; }; r.readAsDataURL(inp.files[0]); }
}

async function enviarInscricao(){
  const nome = document.getElementById('iNome').value.trim();
  const ekl  = document.getElementById('iEkl').value.trim();
  const wa   = phoneToRaw(document.getElementById('iWa').value);
  const inst = [...document.querySelectorAll('#sInsc .chip input:checked')].map(i=>i.value);
  const obs  = document.getElementById('iObs').value.trim();
  if (!nome){ toast('Informe seu nome','err'); return; }
  if (!ekl){  toast('Informe sua Eklesia','err'); return; }
  if (!wa){   toast('Informe seu WhatsApp','err'); return; }
  if (!inst.length){ toast('Selecione ao menos um instrumento','err'); return; }
  load(true);
  const r = await api('inscricao',{nome,eklesia:ekl,whatsapp:wa,instrumentos:inst,obs});
  // Upload foto via fetch POST (separado do JSONP)
  const fotoFile = document.getElementById('iFoto').files[0];
  if (fotoFile && r.ok) {
    try {
      const b64 = await toB64(fotoFile);
      const url = atob(_e);
      // Envia em chunks menores se necessário, mas primeiro tenta direto
      const payload = JSON.stringify({
        action: 'uploadFotoInscricao',
        sessionKey: '',
        inscricaoId: r.id,
        fotoBase64: b64.split(',')[1],
        fotoNome: 'foto_' + nome.replace(/\s+/g,'_') + '_' + Date.now() + '.jpg',
      });
      // Usa fetch com no-cors — Apps Script processa mas não retorna
      fetch(url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: payload });
    } catch(e) {
      console.warn('Upload foto:', e);
    }
  }
  load(false);
  if (!r.ok){ toast(r.error||'Erro ao enviar','err'); return; }
  document.querySelector('#sInsc .pub-wrap').innerHTML = `<div class="empty"><div class="empty-ico">🎉</div><h2 style="font-family:var(--fh);font-size:22px;font-weight:800;margin-bottom:8px">Inscrição enviada!</h2><p style="color:var(--text2);margin-bottom:24px">Em breve entraremos em contato pelo WhatsApp.</p><button class="btn-primary" onclick="show('sHome')">Voltar ao início</button></div>`;
}

// ===== VOLUNTÁRIO =====
let _vEscalas=[], _vSubFilter='todas', _vEscFilter='todas';

async function initVol(sess){
  document.getElementById('vNome').textContent = sess.nome;
  document.getElementById('vGreet').textContent = 'Olá, '+sess.nome.split(' ')[0]+'! 👋';
  document.getElementById('vEkl').textContent = sess.eklesia;
  show('sVol');
  load(true);
  const [rEsc, rBandas] = await Promise.all([api('getMinhasEscalas'), api('getBandas')]);
  load(false);
  _vEscalas = rEsc.ok ? rEsc.data : [];
  renderVEsc();

  // Banda do voluntário
  const s = getSess();
  const todasBandas = rBandas.ok ? rBandas.data : [];
  const minhasBandas = todasBandas.filter(b => {
    const mids = (b.MembrosIds||'').split(',').map(x=>x.trim());
    return mids.includes(s.mid);
  });

  const bEl = document.getElementById('vBandaInfo');
  if (!minhasBandas.length) {
    bEl.innerHTML = empty('🎸','Sem banda vinculada');
  } else {
    // Buscar todos os músicos para resolver nomes dos membros
    const rTodosMusicos = await api('getMusicos');
    const todosMusicos = rTodosMusicos.ok ? rTodosMusicos.data : [];

    let html = '';
    for (const banda of minhasBandas) {
      const membrosIds = (banda.MembrosIds||'').split(',').filter(Boolean);
      const membros = membrosIds.map(mid => {
        const mus = todosMusicos.find(x => x.Id === mid);
        return mus || { Id: mid, Nome: mid, Instrumentos: '' };
      });

      html += `
      <div class="card" style="margin-bottom:16px">
        <div class="ch">
          <span style="font-size:28px">${banda.Emoji||'🎸'}</span>
          <div style="flex:1">
            <div class="cn">${banda.Nome||'—'}</div>
            <div class="cs">Líder: ${banda.LiderNome||'—'} • ${membros.length} integrante(s)</div>
          </div>
        </div>

        <!-- Integrantes -->
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
          <p style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">INTEGRANTES</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${membros.map(mem => {
              const isMe = mem.Id === s.mid;
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${isMe?'rgba(124,111,247,.12)':'var(--bg3)'};border-radius:8px;${isMe?'border:1px solid var(--accent)':''}">
                <div class="av" style="width:30px;height:30px;font-size:12px;flex-shrink:0">${(mem.Nome||'?')[0]}</div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${mem.Nome||'—'} ${isMe?'<span style="font-size:10px;color:var(--accent)">• você</span>':''}</div>
                  <div style="font-size:11px;color:var(--text3)">${mem.Instrumentos||'—'}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

      // Celebrações da banda
      const rCel = await api('getCelebracoesDaBanda', { bandaId: banda.Id });
      const cels = rCel.ok ? rCel.data : [];
      if (cels.length) {
        html += `<div class="dsec"><h3>PRÓXIMAS CELEBRAÇÕES</h3>`;
        html += cels.map(cel => {
          const d = pd(cel.Data||'');
          return `
          <div class="card" style="margin-bottom:10px">
            <div class="cn">${cel.Nome||'—'}</div>
            <div class="cs">📅 ${d.day}/${d.mon}/${d.year} • ⏰ ${cel.Horario||''} • 📍 ${cel.Local||''}</div>
          </div>`;
        }).join('');
        html += `</div>`;
      }
    }
    bEl.innerHTML = html;
  }

  // Subs
  const rSubs = await api('getSubs');
  renderVSubs(rSubs.ok ? rSubs.data : []);
}

function detMusVoluntario(id, nome, tom, bpm, youtube) {
  document.getElementById('dTitle').textContent = nome;
  document.getElementById('dBody').innerHTML = `
    <div class="igrid">
      <div class="ii"><label>Tom</label><span style="font-family:monospace;font-size:20px;color:var(--accent2)">${tom||'—'}</span></div>
      <div class="ii"><label>BPM</label><span>${bpm||'—'}</span></div>
    </div>
    ${youtube?`<div class="dsec"><h3>Links</h3><a class="btn-primary sm" href="${youtube}" target="_blank" style="text-decoration:none">▶ YouTube</a></div>`:''}`;
  openD();
}

function vtab(id, el){ document.querySelectorAll('#sVol .tab').forEach(t=>t.classList.remove('active')); document.querySelectorAll('#sVol .tc').forEach(t=>t.classList.remove('active')); el.classList.add('active'); document.getElementById(id).classList.add('active'); }

function fvesc(f,el){ _vEscFilter=f; document.querySelectorAll('#vEsc .ftab').forEach(t=>t.classList.remove('active')); el.classList.add('active'); renderVEsc(); }

function renderVEscInEl(elId) {
  const targetEl = document.getElementById(elId);
  if (!targetEl) return;
  const now = new Date();
  let list = _vEscFilter==='todas' ? [..._vEscalas] : _vEscalas.filter(e=>(e.meuStatus||'pendente')===_vEscFilter);
  list.sort((a,b)=>{
    const dA=new Date((a.Data||'9999')+'T12:00:00'), dB=new Date((b.Data||'9999')+'T12:00:00');
    const stA=a.meuStatus||'pendente', stB=b.meuStatus||'pendente';
    const pA=dA<now, pB=dB<now;
    if(stA==='pendente'&&!pA&&(stB!=='pendente'||pB)) return -1;
    if(stB==='pendente'&&!pB&&(stA!=='pendente'||pA)) return 1;
    if(!pA&&pB) return -1; if(pA&&!pB) return 1;
    return dA-dB;
  });
  if(!list.length){targetEl.innerHTML=empty('📅','Nenhuma escala');return;}
  targetEl.innerHTML=list.map(e=>{
    const id=e.Id||e.id||'', titulo=e.Titulo||e.titulo||'Escala';
    const horario=e.Horario||e.horario||'', local=e.Local||e.local||'';
    const d=pd(e.Data||e.data||''), isPast=e.Data&&new Date(e.Data+'T12:00:00')<now;
    const st=e.meuStatus||'pendente';
    return `<div class="li" onclick="detEscVol('${id}')" style="${isPast?'opacity:.75':''}">
      <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
      <div class="li-info"><div class="li-name">${titulo} ${isPast?'<span style="font-size:10px;color:var(--text3)">(passada)</span>':''}</div><div class="li-sub">⏰ ${horario} • 📍 ${local}</div></div>
      <div class="li-r">${badge(st)}</div>
    </div>`;
  }).join('');
}

function renderVEsc(){
  const el=document.getElementById('vEscList');
  if(el) renderVEscInEl('vEscList');
}


async function detEscVol(id){
  load(true);
  const [rEsc, rBib] = await Promise.all([api('getEscalaById',{id}), api('getBiblioteca')]);
  load(false);
  if(!rEsc.ok){toast('Erro','err');return;}
  const e=rEsc.data, d=pd(e.Data), s=getSess();
  const meu=(rEsc.aceites||[]).find(a=>String(a.MusicoId)===String(s.mid));
  const st=meu?.Status||meu?.status||'pendente';
  const jaAceita = st === 'aceita';
  const bib = rBib.ok ? rBib.data : [];

  // Buscar músicas do repertório
  let musicas = [];
  if (e.RepertorioId) {
    const rRep = await api('getRepertorios',{});
    if (rRep.ok) {
      const rep = rRep.data.find(r => r.Id === e.RepertorioId);
      if (rep && rep.MusicasIds) {
        const ids = rep.MusicasIds.split(',').filter(Boolean);
        musicas = ids.map(mid => bib.find(m => m.Id === mid)).filter(Boolean);
      }
    }
  }

  document.getElementById('dTitle').textContent = e.Titulo||'Escala';
  document.getElementById('dBody').innerHTML = `
    <div class="igrid">
      <div class="ii"><label>Data</label><span>${d.day}/${d.mon}/${d.year}</span></div>
      <div class="ii"><label>Horário</label><span>${e.Horario||'—'}</span></div>
      <div class="ii"><label>Local</label><span>${e.Local||'—'}</span></div>
      <div class="ii"><label>Banda</label><span>${e.BandaNome||'—'}</span></div>
    </div>

    ${musicas.length ? `
    <div class="dsec">
      <h3>📋 Repertório</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${musicas.map((m,i) => {
          const ov = (e.overrides && e.overrides[m.Id]) ? e.overrides[m.Id] : {};
          const tom    = ov.tom    || '';
          const bpm    = ov.bpm    || '';
          const versao = ov.versao || m.Versao || '';
          return `
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:${tom||bpm||versao?'10':'0'}px">
              <span style="width:24px;height:24px;background:var(--accent);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${i+1}</span>
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px">${m.Titulo||'—'}</div>
                <div style="font-size:11px;color:var(--text3)">${m.Composicao||''}</div>
              </div>
              ${m.Link ? `<a href="${m.Link}" target="_blank" style="background:var(--accent);color:#fff;border-radius:8px;padding:5px 12px;text-decoration:none;font-size:13px">▶</a>` : ''}
            </div>
            ${tom||bpm||versao ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${tom    ? `<span style="background:rgba(124,111,247,.2);color:var(--accent2);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600">🎵 Tom: ${tom}</span>` : ''}
              ${bpm    ? `<span style="background:rgba(52,211,153,.15);color:var(--green);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600">⏱ ${bpm} BPM</span>` : ''}
              ${versao ? `<span style="background:rgba(251,191,36,.15);color:#FBBF24;border-radius:6px;padding:4px 10px;font-size:12px">🎤 ${versao}</span>` : ''}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="dsec">
      <h3>Minha resposta</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Atual: ${badge(st)}</p>
      ${jaAceita ? `
        <div style="padding:12px;background:rgba(52,211,153,.08);border:1px solid var(--green);border-radius:10px">
          <p style="font-size:13px;color:var(--green)">✅ Você aceitou esta escala.</p>
          <p style="font-size:12px;color:var(--text3);margin-top:4px">Apenas o Master pode remover sua participação.</p>
        </div>
      ` : st === 'recusada' ? `
        <div style="padding:12px;background:rgba(248,113,113,.08);border:1px solid var(--red);border-radius:10px">
          <p style="font-size:13px;color:var(--red)">❌ Você recusou esta escala.</p>
          ${meu?.Justificativa ? `<p style="font-size:12px;color:var(--text3);margin-top:4px">Justificativa: "${meu.Justificativa}"</p>` : ''}
        </div>
      ` : `
        <div class="arow">
          <button class="btn-green" onclick="respEsc('${e.Id}','aceita')">✅ Aceitar</button>
          <button class="btn-red" onclick="respEsc('${e.Id}','recusada')">❌ Recusar</button>
        </div>
      `}
    </div>`;
  openD();
}

async function respEsc(escId, st){
  if (st === 'recusada') {
    // Mostrar campo de justificativa obrigatório
    openM('Justificar recusa', `
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Por favor, informe o motivo da recusa:</p>
      <div class="fg"><label>Justificativa *</label>
        <textarea id="justTxt" rows="4" placeholder="Ex: Compromisso familiar, viagem, indisposição..."></textarea>
      </div>
      <div class="mfoot">
        <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
        <button class="btn-red" onclick="confirmarRecusa('${escId}')">❌ Confirmar recusa</button>
      </div>`);
    return;
  }
  load(true);
  const r=await api('responderEscala',{escalaId:escId,status:st,justificativa:''});
  if(!r.ok){load(false);toast(r.error||'Erro','err');return;}
  toast('Escala aceita! ✅','ok');
  closeD();
  const esc = _vEscalas.find(e=>e.Id===escId);
  if(esc) esc.meuStatus='aceita';
  renderVEsc();
  // Recarregar em background e atualizar painel da banda se for lider
  api('getMinhasEscalas').then(async rEsc=>{
    load(false);
    _vEscalas=rEsc.ok?rEsc.data:_vEscalas;
    renderVEsc();
    // Se for líder de banda, atualizar aceites da banda
    const s=getSess();
    if(s && s.nivel==='liderbanda') await recarregarAceitesBanda();
  });
}

async function confirmarRecusa(escId) {
  const just = document.getElementById('justTxt').value.trim();
  if (!just) { toast('A justificativa é obrigatória','err'); return; }
  closeM();
  load(true);
  const r = await api('responderEscala',{escalaId:escId,status:'recusada',justificativa:just});
  if(!r.ok){load(false);toast(r.error||'Erro','err');return;}
  toast('Recusa registrada.','info');
  closeD();
  const esc2 = _vEscalas.find(e=>e.Id===escId);
  if(esc2) esc2.meuStatus='recusada';
  renderVEsc();
  api('getMinhasEscalas').then(async rEsc=>{
    load(false);
    _vEscalas=rEsc.ok?rEsc.data:_vEscalas;
    renderVEsc();
    const s=getSess();
    if(s && s.nivel==='liderbanda') await recarregarAceitesBanda();
  });
}

function fvsub(f,el){ _vSubFilter=f; document.querySelectorAll('#vSubs .ftab').forEach(t=>t.classList.remove('active')); el.classList.add('active'); }

function renderVSubs(subs){
  const el=document.getElementById('vSubsList');
  if(!subs.length){el.innerHTML=empty('🔄','Nenhuma substituição');return;}
  el.innerHTML=subs.map(s=>{
    const st=s.Status||'aberta';
    return `<div class="li">
      <div class="li-info"><div class="li-name">Sub: ${s.Instrumento||'—'}</div><div class="li-sub">Escala: ${s.EscalaId||''}</div></div>
      <span class="badge ${st==='aberta'?'b-pend':st==='resolvida'?'b-aprov':'b-recusada'}">${st}</span>
    </div>`;
  }).join('');
}

// ===== LÍDER =====
let _lBandas=[], _lMusicas=[], _lTodosMusicos=[];

async function initLider(sess){
  document.getElementById('lNome').textContent = sess.nome;
  document.getElementById('lEkl').textContent  = sess.eklesia;
  show('sLid');
  load(true);
  const [rB, rE, rM, rME, rRep, rCels] = await Promise.all([
    api('getMinhasBandas'),
    api('getEscalas'),
    api('getMusicos'),   // todos os músicos para resolver nomes
    api('getMinhasEscalas'),
    api('getRepertorios',{}),
    api('getCelebracoes'),
  ]);

  _lBandas  = rB.ok  ? rB.data  : [];
  _lTodosMusicos = rM.ok ? rM.data : [];  // global com todos os músicos
  _lMusicas = [];
  _vEscalas = rME.ok ? rME.data : [];

  // Pré-carregar aceites de todas as escalas das minhas bandas - UMA VEZ só
  const todasEscalas = rE.ok ? rE.data : [];
  const aceiteData = {};  // bandaId -> { musicoId -> {status, justificativa} }
  const escalasMinhasBandas = todasEscalas.filter(e =>
    _lBandas.some(b => b.Id === e.BandaId)
  );
  for (const esc of escalasMinhasBandas) {
    const rEsc = await api('getEscalaById', { id: esc.Id });
    if (rEsc.ok) {
      if (!aceiteData[esc.BandaId]) aceiteData[esc.BandaId] = {};
      (rEsc.aceites||[]).forEach(a => {
        aceiteData[esc.BandaId][a.MusicoId] = {
          status: (a.Status||'pendente').toLowerCase(),
          justificativa: a.Justificativa||'',
        };
      });
    }
  }
  // Também guardar escalas por banda para renderLBandas
  const escalasPorBanda = {};
  for (const esc of escalasMinhasBandas) {
    if (!escalasPorBanda[esc.BandaId]) escalasPorBanda[esc.BandaId] = [];
    escalasPorBanda[esc.BandaId].push(esc);
  }
  window._lBandaAceites    = aceiteData;
  window._lEscalasPorBanda = escalasPorBanda;

  load(false);

  // Filtrar repertórios das celebrações das minhas bandas
  const todasCels = rCels.ok ? rCels.data : [];
  const minhasBandasIds = new Set(_lBandas.map(b => b.Id));
  const repIdsDasBandas = new Set();
  todasCels.forEach(cel => {
    const bandasDaCel = (cel.BandasIds||'').split(',').filter(Boolean);
    if (bandasDaCel.some(bid => minhasBandasIds.has(bid)) && cel.RepertorioId) {
      repIdsDasBandas.add(cel.RepertorioId);
    }
  });
  const todosReps = rRep.ok ? rRep.data : [];
  // Mostrar: repertórios das celebrações da banda + os que o líder criou
  const s = getSess();
  const repsFiltered = todosReps.filter(r =>
    repIdsDasBandas.has(r.Id) ||
    (r.CriadoPor && r.CriadoPor === s.mid)
  );

  renderLBandas();
  renderLEsc(rE.ok ? rE.data : []);
  renderLMus();
  renderVEscInEl('lMinhasEscList');
  renderLRep(repsFiltered);

  const rSubs = await api('getSubs');
  renderLSubs(rSubs.ok ? rSubs.data : []);
}

// ===== LÍDER — CONFIGURAR REPERTÓRIO =====
async function modalEditarRepLider(repId) {
  load(true);
  const [rRep, rBib] = await Promise.all([api('getRepertorios',{}), api('getBiblioteca')]);
  load(false);

  const rep = rRep.ok ? rRep.data.find(r => r.Id === repId) : null;
  if (!rep) { toast('Repertório não encontrado','err'); return; }

  const bib = rBib.ok ? rBib.data : [];
  const musIds = (rep.MusicasIds||'').split(',').filter(Boolean);
  // Get overrides already saved
  const overrides = rep.Overrides ? JSON.parse(rep.Overrides) : {};

  if (!musIds.length) {
    toast('Este repertório não tem músicas cadastradas','err');
    return;
  }

  const musicas = musIds.map(mid => {
    const m = bib.find(x => x.Id === mid) || {};
    const ov = overrides[mid] || {};
    return { ...m, Id: mid, _tom: ov.tom||'', _bpm: ov.bpm||'', _versao: ov.versao||(m.Versao||'') };
  });

  openM('Configurar Repertório — ' + (rep.Nome||''), `
    <p style="font-size:12px;color:var(--text2);margin-bottom:14px">
      Configure tom, BPM e versão para cada música. Essas configurações são específicas para este repertório e não alteram a biblioteca.
    </p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${musicas.map((m,i) => `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-weight:600;font-size:14px;margin-bottom:10px">${i+1}. ${m.Titulo||'—'}</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:10px">${m.Composicao||''} ${m.Versao?'• '+m.Versao:''}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div class="fg">
              <label style="font-size:10px">Tom</label>
              <input type="text" class="rep-tom" data-mid="${m.Id}" value="${m._tom}" placeholder="Ex: G, A, C#" style="padding:7px 10px;font-size:13px"/>
            </div>
            <div class="fg">
              <label style="font-size:10px">BPM</label>
              <input type="number" class="rep-bpm" data-mid="${m.Id}" value="${m._bpm}" placeholder="Ex: 75" style="padding:7px 10px;font-size:13px"/>
            </div>
            <div class="fg">
              <label style="font-size:10px">Versão</label>
              <input type="text" class="rep-versao" data-mid="${m.Id}" value="${m._versao}" placeholder="Ex: Fernandinho" style="padding:7px 10px;font-size:13px"/>
            </div>
          </div>
          ${m.Link?`<a href="${m.Link}" target="_blank" style="font-size:11px;color:var(--accent2);text-decoration:none;display:inline-block;margin-top:8px">▶ Ouvir referência</a>`:''}
        </div>`).join('')}
    </div>
    <div style="margin-top:14px;padding:12px;background:rgba(52,211,153,.08);border:1px solid var(--green);border-radius:10px">
      <p style="font-size:12px;color:var(--green)">✅ Ao salvar como <strong>Pronto</strong>, a escala será liberada para os músicos aceitarem.</p>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-ghost sm" onclick="salvarRepLider('${repId}',false)">💾 Salvar rascunho</button>
      <button class="btn-primary sm" onclick="salvarRepLider('${repId}',true)">✅ Salvar e liberar</button>
    </div>`);
}

async function salvarRepLider(repId, liberar) {
  // Coletar overrides: tom, bpm, versao por musicaId
  const overrides = {};
  document.querySelectorAll('.rep-tom').forEach(el => {
    const mid = el.dataset.mid;
    if (!overrides[mid]) overrides[mid] = {};
    overrides[mid].tom = el.value.trim();
  });
  document.querySelectorAll('.rep-bpm').forEach(el => {
    const mid = el.dataset.mid;
    if (!overrides[mid]) overrides[mid] = {};
    overrides[mid].bpm = el.value.trim();
  });
  document.querySelectorAll('.rep-versao').forEach(el => {
    const mid = el.dataset.mid;
    if (!overrides[mid]) overrides[mid] = {};
    overrides[mid].versao = el.value.trim();
  });

  // Validar: tom obrigatório para liberar
  if (liberar) {
    const semTom = Object.values(overrides).filter(o => !o.tom);
    if (semTom.length) {
      toast('Preencha o tom de todas as músicas antes de liberar','err');
      return;
    }
  }

  load(true);
  const r = await api('salvarOverridesRepertorio', {
    repId,
    overrides: JSON.stringify(overrides),
    pronto: liberar ? 'sim' : 'nao',
  });
  load(false);

  if (!r.ok) { toast(r.error||'Erro','err'); return; }

  if (liberar) {
    // Criar escalas para todas as bandas que têm este repertório via celebrações
    const rBandas = await api('getMinhasBandas');
    if (rBandas.ok) {
      for (const banda of rBandas.data) {
        await api('criarEscalasDaBanda', { bandaId: banda.Id });
      }
    }
    toast('Repertório liberado! Escalas enviadas aos músicos ✅','ok');
  } else {
    toast('Rascunho salvo!','ok');
  }
  closeM();
  const rRep = await api('getRepertorios',{});
  renderLRep(rRep.ok ? rRep.data : []);
}


function ltab(id,el){
  document.querySelectorAll('#sLid .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#sLid .tc').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(id).classList.add('active');
  if (id === 'lMinhasEsc') renderVEscInEl('lMinhasEscList');
  if (id === 'lBandas') renderLBandas();
}

function renderLBandas(){
  const el = document.getElementById('lBandasList');
  if (!_lBandas.length) { el.innerHTML = empty('🎸','Nenhuma banda'); return; }
  const aceiteData  = window._lBandaAceites     || {};
  const escalasData = window._lEscalasPorBanda  || {};

  el.innerHTML = _lBandas.map(b => {
    const membrosIds = (b.MembrosIds||'').split(',').filter(Boolean);
    const membros = membrosIds.map(mid => {
      const mus = (_lTodosMusicos||[]).find(x => x.Id === mid);
      return mus || { Id:mid, Nome:mid, Instrumentos:'', WhatsApp:'' };
    });

    const aceiteMap     = aceiteData[b.Id]  || {};
    const escalasDaBanda = escalasData[b.Id] || [];
    const s = getSess();
    // Para o próprio líder, usar _vEscalas (mais atualizado) como status
    escalasDaBanda.forEach(esc => {
      const minhaEsc = (_vEscalas||[]).find(e => e.Id === esc.Id);
      if (minhaEsc && s && s.mid) {
        aceiteMap[s.mid] = {
          status: minhaEsc.meuStatus || 'pendente',
          justificativa: minhaEsc.Justificativa || '',
        };
      }
    });
    const temEscala      = escalasDaBanda.length > 0;
    const aceitaram = membros.filter(m => aceiteMap[m.Id]?.status === 'aceita').length;
    const recusaram = membros.filter(m => aceiteMap[m.Id]?.status === 'recusada').length;
    const pendentes = membros.length - aceitaram - recusaram;

    return `
    <div class="card" style="margin-bottom:16px">
      <div class="ch">
        <span style="font-size:26px">${b.Emoji||'🎸'}</span>
        <div style="flex:1">
          <div class="cn">${b.Nome||'—'}</div>
          <div class="cs">Líder: ${b.LiderNome||'—'} • ${membros.length} integrante(s)</div>
        </div>
        ${temEscala ? `<div style="display:flex;gap:5px;font-size:11px">
          <span style="background:rgba(52,211,153,.2);color:var(--green);border-radius:6px;padding:3px 7px">✅${aceitaram}</span>
          <span style="background:rgba(248,113,113,.2);color:var(--red);border-radius:6px;padding:3px 7px">❌${recusaram}</span>
          <span style="background:rgba(251,191,36,.2);color:#FBBF24;border-radius:6px;padding:3px 7px">⏳${pendentes}</span>
        </div>` : '<span style="font-size:11px;color:var(--text3)">sem escala</span>'}
      </div>

      ${temEscala ? `
      <div style="margin-top:8px;padding:8px 10px;background:var(--bg3);border-radius:8px">
        ${escalasDaBanda.map(e => {
          const d = pd(e.Data||'');
          return `<div style="font-size:12px;color:var(--text2)">📅 <strong>${e.Titulo||'Escala'}</strong> — ${d.day}/${d.mon}/${d.year} ${e.Horario?'• ⏰ '+e.Horario:''} ${e.Local?'• 📍 '+e.Local:''}</div>`;
        }).join('')}
      </div>` : ''}

      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
        <p style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">INTEGRANTES</p>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${membros.map(mem => {
            const aceite  = aceiteMap[mem.Id];
            const st      = temEscala ? (aceite?.status || 'pendente') : null;
            const stColor = st==='aceita'?'var(--green)':st==='recusada'?'var(--red)':st?'#FBBF24':'var(--border)';
            const stIcon  = st==='aceita'?'✅':st==='recusada'?'❌':st?'⏳':'';
            const waNum   = String(mem.WhatsApp||'').replace(/\D/g,'');
            return `
            <div style="background:var(--bg3);border-radius:8px;border-left:3px solid ${stColor}">
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px">
                <div class="av" style="width:32px;height:32px;font-size:13px;flex-shrink:0">${(mem.Nome||'?')[0]}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600">${mem.Nome||'—'}</div>
                  <div style="font-size:11px;color:var(--text3)">${mem.Instrumentos||'—'}${mem.Eklesia?' • Ekl. '+mem.Eklesia:''}</div>
                  ${waNum?`<div style="font-size:11px;color:var(--text2);margin-top:2px">📱 ${phoneToDisplay(waNum)}</div>`:''}
                  ${st==='recusada'&&aceite?.justificativa?`<div style="font-size:11px;color:var(--red);margin-top:3px">💬 "${aceite.justificativa}"</div>`:''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
                  ${st?`<span style="font-size:11px;color:${stColor};font-weight:600">${stIcon} ${st.charAt(0).toUpperCase()+st.slice(1)}</span>`:''}
                  ${waNum?`<a href="https://wa.me/55${waNum}" target="_blank" style="background:rgba(37,211,102,.15);border:1px solid #25D366;color:#25D366;border-radius:6px;padding:3px 8px;font-size:11px;text-decoration:none">💬</a>`:''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

function detBandaLid(id){
  const b=_lBandas.find(x=>x.Id===id); if(!b) return;
  document.getElementById('dTitle').textContent=b.Nome;
  document.getElementById('dBody').innerHTML=`
    <div class="igrid"><div class="ii"><label>Nome</label><span>${b.Nome}</span></div><div class="ii"><label>Líder</label><span>${b.LiderNome||'—'}</span></div></div>
    <div class="dsec"><h3>Ações rápidas</h3><div class="arow">
      <button class="btn-primary sm" onclick="modalCriarEscalaParaBanda('${b.Id}','${b.Nome}')">📅 Criar escala</button>
      <button class="btn-ghost sm" onclick="modalCriarRepertorioParaBanda('${b.Id}','${b.Nome}')">📋 Criar repertório</button>
    </div></div>`;
  openD();
}

function renderLEsc(list){
  const el=document.getElementById('lEscList');
  if(!list.length){el.innerHTML=empty('📅','Nenhuma escala');return;}
  list.sort((a,b)=>new Date(a.Data||'9999')-new Date(b.Data||'9999'));
  el.innerHTML=list.map(e=>{
    const d=pd(e.Data);
    return `<div class="li" onclick="detEscLid('${e.Id}')">
      <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
      <div class="li-info"><div class="li-name">${e.Titulo||'—'}</div><div class="li-sub">⏰ ${e.Horario||''} • 🎸 ${e.BandaNome||''}</div></div>
      <div class="li-r">${badge(e.Status||'pendente')}</div>
    </div>`;
  }).join('');
}

async function detEscLid(id){
  load(true);
  const r=await api('getEscalaById',{id});
  load(false);
  if(!r.ok){toast('Erro','err');return;}
  const e=r.data, ac=r.aceites||[], d=pd(e.Data);
  document.getElementById('dTitle').textContent=e.Titulo||'Escala';
  document.getElementById('dBody').innerHTML=`
    <div class="igrid">
      <div class="ii"><label>Data</label><span>${d.day}/${d.mon}/${d.year}</span></div>
      <div class="ii"><label>Horário</label><span>${e.Horario||'—'}</span></div>
      <div class="ii"><label>Local</label><span>${e.Local||'—'}</span></div>
      <div class="ii"><label>Banda</label><span>${e.BandaNome||'—'}</span></div>
    </div>
    <div class="dsec"><h3>Aceites (${ac.length})</h3>
      ${ac.length?`<div style="display:flex;flex-direction:column;gap:8px">${ac.map(a=>{
        const just=a.Justificativa||a.justificativa||'';
        const st=a.Status||a.status||'pendente';
        const nome=a.MusicoNome||a.MusicoId||'—';
        return `<div class="li" style="flex-direction:column;align-items:flex-start;gap:6px">
          <div style="display:flex;align-items:center;gap:10px;width:100%">
            <div class="av sm">${nome[0]||'?'}</div>
            <div class="li-info"><div class="li-name">${nome}</div></div>
            ${badge(st)}
          </div>
          ${just&&st==='recusada'?`<div style="font-size:12px;color:var(--red);padding:6px 10px;background:rgba(248,113,113,.1);border-radius:6px;width:100%">💬 "${just}"</div>`:''}
        </div>`;
      }).join('')}</div>`:'<p style="font-size:13px;color:var(--text3)">Nenhum músico escalado</p>'}
    </div>
    <div class="dsec"><h3>Ações</h3><div class="arow">
      <button class="btn-ghost sm" onclick="modalSub('${e.Id}')">🔄 Pedir sub</button>
    </div></div>`;
  openD();
}

function renderLMus(){
  const el=document.getElementById('lMusList');
  if(!_lMusicas.length){el.innerHTML=empty('🎼','Nenhuma música');return;}
  _lMusicas.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  el.innerHTML=_lMusicas.map((m,i)=>`<div class="li" onclick="detMus('${m.Id}')">
    <div style="width:28px;height:28px;background:var(--bg4);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text3);flex-shrink:0">${i+1}</div>
    <div class="li-info"><div class="li-name">${m.Nome||'—'}</div><div class="li-sub">${m.Artista||''} • ${m.Versao||''}</div></div>
    <div class="li-r"><span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--accent2);background:var(--bg4);padding:2px 8px;border-radius:5px">${m.Tom||''}</span><span style="font-size:11px;color:var(--text3)">${m.Bpm||''}bpm</span></div>
  </div>`).join('');
}

function detMus(id){
  const m=_lMusicas.find(x=>x.Id===id)||{};
  document.getElementById('dTitle').textContent=m.Nome||'Música';
  document.getElementById('dBody').innerHTML=`
    <div class="igrid"><div class="ii"><label>Tom</label><span style="font-family:monospace;font-size:20px;color:var(--accent2)">${m.Tom||'—'}</span></div><div class="ii"><label>BPM</label><span>${m.Bpm||'—'}</span></div><div class="ii"><label>Artista</label><span>${m.Artista||'—'}</span></div><div class="ii"><label>Versão</label><span>${m.Versao||'—'}</span></div></div>
    <div class="dsec"><h3>Links</h3><div class="arow">
      ${m.Youtube?`<a class="btn-primary sm" href="${m.Youtube}" target="_blank" style="text-decoration:none">▶ YouTube</a>`:''}
      ${m.Cifra?`<a class="btn-ghost sm" href="${m.Cifra}" target="_blank">🎸 Cifra</a>`:''}
      ${m.Partitura?`<a class="btn-ghost sm" href="${m.Partitura}" target="_blank">📄 Partitura</a>`:''}
    </div></div>`;
  openD();
}

function renderLRep(list){
  const el=document.getElementById('lRepList');
  if(!list.length){el.innerHTML=empty('📋','Nenhum repertório');return;}
  const s=getSess();
  const isMaster = s && s.nivel==='master';
  const myId = s ? s.mid : '';
  el.innerHTML=list.map(r=>{
    const musCount=(r.MusicasIds||'').split(',').filter(Boolean).length;
    const pronto = r.RepReady === 'sim';
    const criadoPor = (r.CriadoPor||'').trim();
    const eMeu = isMaster || criadoPor === '' || (criadoPor !== '' && criadoPor === (myId||''));
    // Após liberar (pronto), só master e liderequipe podem editar/excluir
    const podeEditar = eMeu && (isMaster || !pronto);
    return `<div class="li">
      <div class="li-info">
        <div class="li-name">📋 ${r.Nome||'—'} ${pronto?'<span class="badge b-aprov" style="margin-left:6px">✅ pronto</span>':'<span class="badge b-pend" style="margin-left:6px">⏳ pendente</span>'}</div>
        <div class="li-sub">
          ${musCount} música(s)
          ${r.CriadoPorNome ? ` • 👤 ${r.CriadoPorNome}` : ''}
          ${r.CelebracaoNome ? ` • ✨ ${r.CelebracaoNome}` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        ${!pronto ? `<button class="btn-primary sm" onclick="modalEditarRepLider('${r.Id}')">⚙️ Configurar</button>` : `<span style="font-size:11px;color:var(--green);padding:5px 8px">🔒 Liberado</span>`}
        ${podeEditar ? `<button class="btn-ghost sm" onclick="modalEditarRepertorio('${r.Id}')">✏️</button>` : ''}
        ${podeEditar ? `<button class="btn-red" style="padding:5px 10px;font-size:12px" onclick="confExcluirRepertorio('${r.Id}','${(r.Nome||'').replace(/'/g,'')}')">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderLSubs(list){
  const el=document.getElementById('lSubsList');
  const abertas=list.filter(s=>s.Status==='aberta');
  if(!abertas.length){el.innerHTML=empty('🔄','Nenhuma sub aberta');return;}
  el.innerHTML=abertas.map(s=>`<div class="li"><div class="li-info"><div class="li-name">Sub: ${s.Instrumento||'—'}</div><div class="li-sub">Escala: ${s.EscalaId||''}</div></div><span class="badge b-pend">aberta</span></div>`).join('');
}

// Modais Líder
function modalCriarEscala(){ modalCriarEscalaParaBanda('',''); }
function modalCriarEscalaParaBanda(bandaId, bandaNome){
  openM('Nova Escala',`
    <div class="fg"><label>Título *</label><input type="text" id="eTit" placeholder="Ex: Culto Dominical"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Data *</label><input type="date" id="eDt"/></div>
      <div class="fg"><label>Horário *</label><input type="time" id="eHr"/></div>
    </div>
    <div class="fg"><label>Local *</label><input type="text" id="eLoc" placeholder="Ex: Templo Principal"/></div>
    <div class="fg"><label>Banda</label>
      <select id="eBanda">${_lBandas.map(b=>`<option value="${b.Id}" ${b.Id===bandaId?'selected':''}>${b.Nome}</option>`).join('')}</select>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEscalaLid()">Criar escala</button>
    </div>`);
}

async function salvarEscalaLid(){
  const tit=document.getElementById('eTit').value.trim();
  const dt=document.getElementById('eDt').value;
  const hr=document.getElementById('eHr').value;
  const loc=document.getElementById('eLoc').value.trim();
  if(!tit||!dt||!hr||!loc){toast('Preencha todos os campos obrigatórios','err');return;}
  const bid=document.getElementById('eBanda').value;
  const b=_lBandas.find(x=>x.Id===bid)||{};
  load(true);
  const r=await api('criarEscala',{titulo:tit,data:dt,horario:hr,local:loc,bandaId:bid,bandaNome:b.Nome||'',musicosIds:(b.MembrosIds||'').split(',').filter(Boolean)});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Escala criada! ✅','ok'); closeM();
  const rE=await api('getEscalas'); renderLEsc(rE.ok?rE.data:[]);
}

function modalCriarRepertorio(){ modalCriarRepertorioParaBanda('',''); }
function modalCriarRepertorioParaBanda(bandaId, bandaNome){
  openM('Novo Repertório',`
    <div class="fg"><label>Nome *</label><input type="text" id="rNome" placeholder="Ex: Louvor Junho"/></div>
    <div class="fg"><label>Banda</label><select id="rBanda">${_lBandas.map(b=>`<option value="${b.Id}" ${b.Id===bandaId?'selected':''}>${b.Nome}</option>`).join('')}</select></div>
    <div class="fg"><label>Músicas</label>
      <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px 0">
        ${_lMusicas.map(m=>`<label style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg3);border-radius:8px;cursor:pointer"><input type="checkbox" value="${m.Id}"/><div><div style="font-size:13px;font-weight:600">${m.Nome}</div><div style="font-size:11px;color:var(--text2)">${m.Artista||''} • ${m.Tom||''}</div></div></label>`).join('')}
      </div>
    </div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarRepLid()">Criar</button></div>`);
}

async function salvarRepLid(){
  const nome=document.getElementById('rNome').value.trim();
  if(!nome){toast('Informe o nome','err');return;}
  const ids=[...document.querySelectorAll('#mBody input[type=checkbox]:checked')].map(i=>i.value);
  load(true);
  const r=await api('criarRepertorio',{nome,bandaId:document.getElementById('rBanda').value,musicasIds:ids});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Repertório criado!','ok'); closeM();
  const rRep=await api('getRepertorios'); renderLRep(rRep.ok?rRep.data:[]);
}

function modalAdicionarMusica(){
  openM('Adicionar Música',`
    <div class="fg"><label>Nome *</label><input type="text" id="mNome"/></div>
    <div class="fg"><label>Artista</label><input type="text" id="mArt"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Tom</label><input type="text" id="mTom" placeholder="G, A, C#"/></div>
      <div class="fg"><label>BPM</label><input type="text" id="mBpm"/></div>
    </div>
    <div class="fg"><label>Versão</label><input type="text" id="mVers"/></div>
    <div class="fg"><label>YouTube</label><input type="text" id="mYt" placeholder="https://..."/></div>
    <div class="fg"><label>Cifra</label><input type="text" id="mCif" placeholder="https://..."/></div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarMus()">Salvar</button></div>`);
}

async function salvarMus(){
  const nome=document.getElementById('mNome').value.trim();
  if(!nome){toast('Informe o nome','err');return;}
  load(true);
  const r=await api('adicionarMusica',{nome,artista:document.getElementById('mArt').value,tom:document.getElementById('mTom').value,bpm:document.getElementById('mBpm').value,versao:document.getElementById('mVers').value,youtube:document.getElementById('mYt').value,cifra:document.getElementById('mCif').value});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Música adicionada! 🎵','ok'); closeM();
  const rM=await api('getMusicas'); _lMusicas=rM.ok?rM.data:[]; renderLMus();
  const rM2=await api('getMusicas'); renderAMusicas(rM2.ok?rM2.data:[]);
}

function modalSub(escId){
  openM('Pedir Substituto',`
    <div class="fg"><label>Instrumento necessário</label>
      <select id="subInstr"><option>Voz</option><option>Violão</option><option>Guitarra</option><option>Baixo</option><option>Teclado</option><option>Bateria</option><option>Percussão</option><option>Backing Vocal</option></select>
    </div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarSub('${escId}')">Abrir vaga</button></div>`);
}

async function salvarSub(escId){
  load(true);
  const r=await api('criarSub',{escalaId:escId,instrumento:document.getElementById('subInstr').value,musicoOutId:''});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Vaga aberta!','ok'); closeM();
}

// ===== ADMIN =====
let _aInsc=[], _aInscFilter='todos', _aBandas=[], _aMusicos=[], _aMusicas=[];
let _pendAct=null, _sideOpen=false;

// ===== LÍDER DE EQUIPE =====
async function initLiderEquipe(sess) {
  document.getElementById('admNome').textContent = sess.nome;
  document.getElementById('admAv').textContent = sess.nome[0]||'L';
  document.getElementById('admTopAv').textContent = sess.nome[0]||'L';
  document.getElementById('admGreet').textContent = 'Olá, '+sess.nome.split(' ')[0]+'!';
  show('sAdm');

  // Esconder menus que lider de equipe não acessa
  const hidePages = ['inscricoes','musicos','tokens','bandas','biblioteca'];
  hidePages.forEach(p => {
    const el = document.querySelector('.ni[data-p="'+p+'"]');
    if (el) el.style.display = 'none';
  });
  // Esconder botão "+ Nova celebração"
  const btnNovaCel = document.querySelector('[onclick="modalCriarCel()"]');
  if (btnNovaCel) btnNovaCel.style.display = 'none';

  // Carregar dados
  load(true);
  const rME = await api('getMinhasEscalas');
  _vEscalas = rME.ok ? rME.data : [];
  await Promise.all([loadLiderEquipePanel(), loadRepertoriosAdmin()]);
  load(false);

  // Navegar para celebrações e mostrar painel LE dedicado
  apg('celebracoes');
  const leEl = document.getElementById('lePanelList');
  const celEl = document.getElementById('admCelList');
  if (leEl) leEl.style.display = 'block';
  if (celEl) celEl.style.display = 'none';
  const btnNovaCel2 = document.querySelector('[onclick="modalCriarCel()"]');
  if (btnNovaCel2) btnNovaCel2.style.display = 'none';
}

async function loadLiderEquipePanel() {
  const r = await api('getLiderEquipePanel');
  if (!r.ok) return;
  window._lePanel = r.data || [];
  renderLiderEquipePanel();
}

function renderLiderEquipePanel() {
  const el = document.getElementById('lePanelList') || document.getElementById('admCelList');
  if (!el) return;
  const panel = window._lePanel || [];
  if (!panel.length) {
    el.innerHTML = empty('✨','Nenhuma celebração atribuída a você');
    return;
  }
  el.innerHTML = panel.map(cel => {
    const d = pd(cel.Data||'');
    const podeRep = cel.podeDefinirRepertorio;

    // Mapa aceites: musicoId -> {status, justificativa}
    const aceiteMap = {};
    (cel.escalas||[]).forEach(esc => {
      (esc.aceites||[]).forEach(a => {
        aceiteMap[String(a.MusicoId)] = {
          status: (a.Status||'pendente').toLowerCase(),
          justificativa: a.Justificativa||''
        };
      });
    });

    const temBanda = cel.bandas && cel.bandas.length > 0;

    return `
    <div class="card" style="margin-bottom:16px">

      <!-- Cabeçalho Celebração -->
      <div class="ch">
        <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
        <div style="flex:1">
          <div class="cn">${cel.Nome||'—'}</div>
          <div class="cs">📍 ${cel.Local||''} • ⏰ ${cel.Horario||''}</div>
          <div style="font-size:11px;margin-top:3px;color:${podeRep?'var(--accent2)':'var(--text3)'}">
            📋 ${podeRep?'Você define o repertório':'Master define o repertório'}
            ${cel.repertorioNome?`• <strong>${cel.repertorioNome}</strong>`:''}
          </div>
        </div>
        ${podeRep ? `<button class="btn-ghost sm" onclick="modalEditarCel('${cel.Id}')">✏️ Repertório</button>` : ''}
      </div>

      <!-- Bandas e Músicos -->
      ${temBanda ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        ${cel.bandas.map(b => {
          const membros = b.membros || [];
          const aceitaram = membros.filter(mem => (aceiteMap[mem.Id]?.status) === 'aceita').length;
          const recusaram = membros.filter(mem => (aceiteMap[mem.Id]?.status) === 'recusada').length;
          const pendentes = membros.length - aceitaram - recusaram;
          return `
          <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:10px">
            <!-- Cabeçalho Banda -->
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:20px">${b.Emoji||'🎸'}</span>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:700">${b.Nome||'—'}</div>
                <div style="font-size:11px;color:var(--text3)">Líder: ${b.LiderNome||'—'} • ${membros.length} integrante(s)</div>
              </div>
              <div style="display:flex;gap:6px;font-size:11px">
                <span style="background:rgba(52,211,153,.2);color:var(--green);border-radius:6px;padding:3px 8px">✅ ${aceitaram}</span>
                <span style="background:rgba(248,113,113,.2);color:var(--red);border-radius:6px;padding:3px 8px">❌ ${recusaram}</span>
                <span style="background:rgba(251,191,36,.2);color:#FBBF24;border-radius:6px;padding:3px 8px">⏳ ${pendentes}</span>
              </div>
            </div>

            <!-- Lista de Músicos -->
            <div style="display:flex;flex-direction:column;gap:6px">
              ${membros.length ? membros.map(mem => {
                const aceite = aceiteMap[String(mem.Id)] || { status: 'pendente' };
                const st = aceite.status;
                const stColor = st==='aceita'?'var(--green)':st==='recusada'?'var(--red)':'#FBBF24';
                const stIcon  = st==='aceita'?'✅':st==='recusada'?'❌':'⏳';
                return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg2);border-radius:8px;border-left:3px solid ${stColor}">
                  <div class="av" style="width:32px;height:32px;font-size:13px;flex-shrink:0">${(mem.Nome||'?')[0]}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:600">${mem.Nome||'—'}</div>
                    <div style="font-size:11px;color:var(--text3)">${mem.Instrumentos||'—'}</div>
                    ${st==='recusada'&&aceite.justificativa?`<div style="font-size:11px;color:var(--red);margin-top:2px">💬 "${aceite.justificativa}"</div>`:''}
                  </div>
                  <span style="font-size:12px;color:${stColor};font-weight:600;flex-shrink:0">${stIcon} ${st.charAt(0).toUpperCase()+st.slice(1)}</span>
                </div>`;
              }).join('') : '<p style="font-size:12px;color:var(--text3);text-align:center">Nenhum integrante cadastrado</p>'}
            </div>
          </div>`;
        }).join('')}
      </div>` : `
      <div style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:8px;text-align:center">
        <p style="font-size:12px;color:var(--text3)">Nenhuma banda vinculada a esta celebração ainda</p>
      </div>`}
    </div>`;
  }).join('');
}

async function initAdmin(sess){
  document.getElementById('admNome').textContent=sess.nome;
  document.getElementById('admAv').textContent=sess.nome[0]||'A';
  document.getElementById('admTopAv').textContent=sess.nome[0]||'A';
  document.getElementById('admGreet').textContent='Bem-vindo, '+sess.nome.split(' ')[0]+'!';
  show('sAdm');
  await loadDash();
}

function toggleSide(){ _sideOpen=!_sideOpen; document.getElementById('admSide').classList.toggle('open',_sideOpen); }

const apgTitles={dashboard:'Dashboard',inscricoes:'Inscrições',musicos:'Músicos',bandas:'Bandas',celebracoes:'Celebrações',escalas:'Escalas',repertorios:'Repertórios',biblioteca:'Biblioteca',tokens:'Tokens'};
const nivelLabel = {master:'Master',liderequipe:'Líder de Equipe',liderbanda:'Líder de Banda',musico:'Músico',admin:'Administrador'};

function apg(name){
  document.querySelectorAll('.ap').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('ap-'+name).classList.add('active');
  const ni=document.querySelector(`.ni[data-p="${name}"]`);
  if(ni) ni.classList.add('active');
  document.getElementById('admTopTit').textContent=apgTitles[name]||name;
  if(_sideOpen) toggleSide();
  // Para lider de equipe: garantir visibilidade correta do painel
  const s=getSess();
  const isLE = s && s.nivel==='liderequipe';
  if(isLE && name==='celebracoes'){
    const leEl=document.getElementById('lePanelList');
    const celEl=document.getElementById('admCelList');
    if(leEl) leEl.style.display='block';
    if(celEl) celEl.style.display='none';
    const btnNova=document.querySelector('[onclick="modalCriarCel()"]');
    if(btnNova) btnNova.style.display='none';
  }
  const loaders={inscricoes:loadInsc,musicos:loadMusicos,bandas:loadBandas,celebracoes:loadCel,escalas:loadEsc,repertorios:loadRepertoriosAdmin,biblioteca:loadBiblioteca,tokens:loadTokens};
  if(loaders[name]) loaders[name]();
}

// DASHBOARD
async function loadDash(){
  load(true);
  const r=await api('getDashboard');
  load(false);
  if(!r.ok){toast('Erro dashboard','err');return;}
  const d=r.data;
  document.getElementById('bInsc').textContent=d.audicoesPendentes||0;
  document.getElementById('admStats').innerHTML=`
    <div class="stat" style="border-left-color:#7C6FF7"><span class="sl">Músicos</span><span class="sv">${d.totalMusicos}</span></div>
    <div class="stat" style="border-left-color:#F87171"><span class="sl">Pendentes</span><span class="sv">${d.audicoesPendentes}</span></div>
    <div class="stat" style="border-left-color:#4ECDC4"><span class="sl">Bandas</span><span class="sv">${d.totalBandas}</span></div>
    <div class="stat" style="border-left-color:#FBBF24"><span class="sl">Escalas mês</span><span class="sv">${d.escalasEsteMes}</span></div>`;
  document.getElementById('dInsc').innerHTML=(d.ultimasInscricoes||[]).map(i=>`<div class="li" style="margin-bottom:6px;cursor:default"><div class="av sm">${(i.Nome||'?')[0]}</div><div class="li-info"><div class="li-name">${i.Nome||'—'}</div><div class="li-sub">${i.Instrumentos||''}</div></div>${badge(i.Status||'pendente')}</div>`).join('')||empty('🎙','Nenhuma');
  document.getElementById('dCel').innerHTML=(d.proximasCelebracoes||[]).map(c=>{const d2=pd(c.Data);return`<div class="li" style="margin-bottom:6px;cursor:default"><div class="db"><div class="db-d">${d2.day}</div><div class="db-m">${d2.mon}</div></div><div class="li-info"><div class="li-name">${c.Nome||'—'}</div><div class="li-sub">📍 ${c.Local||''}</div></div></div>`;}).join('')||empty('✨','Nenhuma');
}

// INSCRIÇÕES
async function loadInsc(){
  load(true);
  const r=await api('getInscricoes');
  load(false);
  _aInsc=r.ok?r.data:[];
  document.getElementById('bInsc').textContent=_aInsc.filter(i=>i.Status==='pendente').length;
  renderInsc();
}

function fInsc(f,el){ _aInscFilter=f; document.querySelectorAll('#inscFtabs .ftab').forEach(t=>t.classList.remove('active')); el.classList.add('active'); renderInsc(); }

function renderInsc(){
  let list=_aInscFilter==='todos'?[..._aInsc]:_aInsc.filter(i=>i.Status===_aInscFilter);
  list.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  const el=document.getElementById('admInscList');
  if(!list.length){el.innerHTML=empty('🎙','Nenhuma inscrição');return;}
  el.innerHTML=list.map(i=>`
    <div class="card click" onclick="detInsc('${i.Id}')">
      <div class="ch">
        <div class="av">${(i.Nome||'?')[0]}</div>
        <div style="flex:1"><div class="cn">${i.Nome||'—'}</div><div class="cs">${i.Eklesia||'—'} • 📱 ${i.WhatsApp||'—'}</div></div>
        ${badge(i.Status||'pendente')}
      </div>
      <div class="itags">${(i.Instrumentos||'').split(',').filter(Boolean).map(x=>`<span class="itag">${x.trim()}</span>`).join('')}</div>
      <div class="cf">
        <span style="font-size:12px;color:var(--text3)">${fd(i.DataInscricao)} ${i.Notificado==='sim'?'• ✅':''}</span>
        <a class="btn-wa" href="${wa(i.WhatsApp,'')}" target="_blank" onclick="event.stopPropagation()">💬</a>
      </div>
    </div>`).join('');
}

function detInsc(id){
  const i=_aInsc.find(x=>x.Id===id); if(!i){toast('Não encontrado','err');return;}
  const nome=i.Nome||'—', ekl=i.Eklesia||'—', whats=String(i.WhatsApp||'');
  const instrs=i.Instrumentos||'—', st=i.Status||'pendente';
  const obs=i.Observacoes||'', dataI=i.DataInscricao||'';
  const dataA=i.DataAudicao||'', hor=i.Horario||'', loc=i.Local||'';
  const notif=i.Notificado||'nao', dataN=i.DataNotificacao||'';
  const foto=i.FotoUrl||'';
  window._waMsgCache = encodeURIComponent('Olá, '+nome+'! Sua audição para '+instrs+' foi agendada:\n\n📅 Data: '+fd(dataA)+'\n⏰ Horário: '+hor+'\n📍 Local: '+loc+'\n\nNos vemos lá! 🎵');
  window._waNumCache = String(i.WhatsApp||'').replace(/\D/g,'');
  window._waIdCache  = id;
  document.getElementById('dTitle').textContent=nome;
  document.getElementById('dBody').innerHTML=`
    ${foto?`<div style="text-align:center;margin-bottom:16px"><img src="${foto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border)"/></div>`:''}
    <div class="igrid">
      <div class="ii"><label>Nome</label><span>${nome}</span></div>
      <div class="ii"><label>Eklesia</label><span>${ekl}</span></div>
      <div class="ii"><label>WhatsApp</label><span>${whats||'—'}</span></div>
      <div class="ii"><label>Status</label><span>${badge(st)}</span></div>
      <div class="ii"><label>Instrumentos</label><span>${instrs}</span></div>
      <div class="ii"><label>Inscrição</label><span>${fd(dataI)}</span></div>
      ${dataA?`<div class="ii"><label>Data audição</label><span>${fd(dataA)}</span></div>`:''}
      ${hor?`<div class="ii"><label>Horário</label><span>${hor}</span></div>`:''}
      ${loc?`<div class="ii"><label>Local</label><span>${loc}</span></div>`:''}
      <div class="ii"><label>Notificado</label><span>${notif==='sim'?'✅ Sim — '+fd(dataN):'⏳ Não'}</span></div>
    </div>
    ${obs?`<div class="dsec"><h3>Observações</h3><p style="font-size:13px;color:var(--text2)">${obs}</p></div>`:''}
    <div class="dsec"><h3>Ações</h3><div class="arow">
      ${st==='pendente'?`<button class="btn-primary sm" onclick="modalAgendar('${id}')">📅 Agendar audição</button>`:''}
      ${st==='agendada'?`
        <button class="btn-green" onclick="confAprovar('${id}','aprovado','${nome.replace(/'/g,'')}')">✅ Aprovar</button>
        <button class="btn-red" onclick="confAprovar('${id}','reprovado','${nome.replace(/'/g,'')}')">❌ Reprovar</button>
        <button class="btn-wa" onclick="notifCand(window._waIdCache,window._waNumCache,window._waMsgCache)">💬 Notificar</button>
      `:st==='aprovado'?'':`<a class="btn-wa" href="${wa(whats,'')}" target="_blank">💬 WhatsApp</a>`}
    </div></div>
`;
  openD();
}

function confAprovar(id,tipo,nome){
  _pendAct={id,tipo};
  const label=tipo==='aprovado'?'Aprovar':'Reprovar', cls=tipo==='aprovado'?'btn-green':'btn-red', em=tipo==='aprovado'?'✅':'❌';
  openM(em+' Confirmar',`
    <p style="text-align:center;padding:12px 0;font-size:15px;color:var(--text2);line-height:1.7">Deseja <strong style="color:var(--text)">${label.toUpperCase()}</strong> a inscrição de<br/><strong style="color:var(--accent2);font-size:18px">${nome}</strong>?</p>
    <div class="mfoot" style="justify-content:center;gap:12px">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="${cls}" onclick="execAprovar()"> ${em} Confirmar</button>
    </div>`);
}

async function execAprovar(){
  if(!_pendAct) return;
  const {id,tipo}=_pendAct; _pendAct=null; closeM();
  const i=_aInsc.find(x=>x.Id===id); if(!i) return;
  load(true);
  const r=await api('aprovarMusico',{id,tipo,nome:i.Nome,eklesia:i.Eklesia,whatsapp:String(i.WhatsApp||''),instrumentos:i.Instrumentos});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  if(tipo==='aprovado' && r.token){
    toast(i.Nome+' aprovado! Token: '+r.token+' 🎵','ok');
  } else {
    toast(tipo==='aprovado'?i.Nome+' aprovado!':i.Nome+' reprovado(a)','info');
  }
  closeD(); await loadInsc();
}

function modalAgendar(id){
  openM('Agendar Audição',`
    <div class="fg"><label>Data *</label><input type="date" id="audDt"/></div>
    <div class="fg"><label>Horário *</label><input type="time" id="audHr"/></div>
    <div class="fg"><label>Local *</label><input type="text" id="audLoc" placeholder="Ex: Sala de ensaio B"/></div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarAgendar('${id}')">Confirmar</button></div>`);
}

async function salvarAgendar(id){
  const dt=document.getElementById('audDt').value, hr=document.getElementById('audHr').value, loc=document.getElementById('audLoc').value.trim();
  if(!dt){toast('Informe a data','err');return;}
  if(!hr){toast('Informe o horário','err');return;}
  if(!loc){toast('Informe o local','err');return;}
  load(true);
  const r=await api('agendarAudicao',{id,dataAudicao:dt,horario:hr,local:loc});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Audição agendada! ✅','ok'); closeM(); closeD(); await loadInsc();
}

async function notifCand(id, whats, msg){
  window.open(`https://wa.me/55${whats.replace(/\D/g,'')}?text=${msg}`,'_blank');
  load(true); await api('notificarCandidato',{id}); load(false);
  toast('Notificação registrada!','ok');
  await loadInsc();
}

function confPromLid(id,nome){
  _pendAct={type:'prom',id};
  openM('⭐ Promover a Líder',`
    <p style="text-align:center;padding:12px 0;font-size:15px;color:var(--text2);line-height:1.7">Promover <strong style="color:var(--accent2)">${nome}</strong> a líder de banda?</p>
    <div class="mfoot" style="justify-content:center;gap:12px">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="execPromLid('${id}')">⭐ Confirmar</button>
    </div>`);
}

async function execPromLid(musicoId){
  closeM();
  if(!musicoId){toast('ID do músico necessário','err');return;}
  load(true); const r=await api('promoverLider',{musicoId}); load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Promovido a líder! ⭐','ok'); closeD(); await loadMusicos();
}

// MÚSICOS
async function loadMusicos(){
  load(true); const r=await api('getMusicos'); load(false);
  _aMusicos=r.ok?r.data:[];
  _aMusicos.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  const el=document.getElementById('admMusList');
  if(!_aMusicos.length){el.innerHTML=empty('👥','Nenhum músico');return;}
  const nivelLabel2 = {master:'⚙️ Master',liderequipe:'👥 Líder Equipe',liderbanda:'🎸 Líder Banda',musico:'🎵 Músico'};
  el.innerHTML=_aMusicos.map(m=>{
    const niv = m.NivelAcesso || (m.IsLider==='sim' ? 'liderbanda' : 'musico');
    const nivLabel = nivelLabel2[niv] || niv;
    const nivColor = niv==='master'?'#EF4444':niv==='liderequipe'?'#FBBF24':niv==='liderbanda'?'var(--accent2)':'var(--green)';
    return `
    <div class="card click" onclick="detMusico('${m.Id}')">
      <div class="ch">
        <div class="av">${(m.Nome||'?')[0]}</div>
        <div style="flex:1"><div class="cn">${m.Nome||'—'} <span class="rtag" style="background:rgba(0,0,0,.3);color:${nivColor}">${nivLabel}</span></div><div class="cs">${m.Eklesia||'—'} • 📱 ${phoneToDisplay(m.WhatsApp||'')||'—'}</div></div>
        <span class="badge b-aprov">ativo</span>
      </div>
      <div class="itags">${(m.Instrumentos||'').split(',').filter(Boolean).map(x=>`<span class="itag">${x.trim()}</span>`).join('')}</div>
      <div class="cf"><span style="font-size:12px;color:var(--text3)">${m.Banda||'Sem banda'}</span><a class="btn-wa" href="${wa(String(m.WhatsApp||''),'')}" target="_blank" onclick="event.stopPropagation()">💬</a></div>
    </div>`;
  }).join('');
}

async function detMusico(id){
  load(true);
  const [rT, rBandas] = await Promise.all([api('getTokens'), api('getBandas')]);
  load(false);
  const m = _aMusicos.find(x => x.Id === id);
  if (!m) { toast('Não encontrado','err'); return; }

  const nome    = m.Nome  || '—';
  const ekl     = m.Eklesia || '';
  const whats   = String(m.WhatsApp || '');
  const instr   = m.Instrumentos || '';
  const lider   = m.IsLider === 'sim';
  const foto    = m.FotoUrl || '';
  const toks    = rT.ok ? rT.data : [];
  const tokEx   = toks.find(t => String(t.MusicoId) === String(id));
  const tokStr  = tokEx ? (tokEx.Token || '') : '';
  // Nível: usa NivelAcesso (já normalizado) ou pega do token
  const nivelMapLocal = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const tokNivRaw = tokEx ? (tokEx.Nivel || '') : '';
  const tokNiv  = m.NivelAcesso || nivelMapLocal[tokNivRaw.toLowerCase()] || tokNivRaw || (lider ? 'liderbanda' : 'musico');

  // Banda: buscar do cadastro de bandas onde o músico é membro
  const bandas  = rBandas.ok ? rBandas.data : [];
  const minhasBandas = bandas.filter(b => {
    const mids = (b.MembrosIds || '').split(',').map(x => x.trim());
    return mids.includes(id);
  });
  const bandaNomes = minhasBandas.map(b => b.Nome).join(', ') || 'Sem banda';

  const waNum = whats.replace(/\D/g,'');
  const msgToken = 'Olá, ' + nome + '! 🎵%0A%0ASeu token de acesso ao sistema *Bandas IC*:%0A%0A🔑 *' + tokStr + '*%0A%0AAcesse: https://30semanas.github.io/bandasIC%0A%0AEscolha *' + (tokNiv === 'lider' ? 'Líder de Banda' : 'Voluntário') + '* na tela inicial.';

  document.getElementById('dTitle').textContent = nome;
  document.getElementById('dBody').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      ${foto ? `<img src="${foto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:10px"/>` : `<div class="av lg" style="margin:0 auto 10px">${nome[0]||'?'}</div>`}
      <h2 style="font-family:var(--fh);font-size:20px;font-weight:800">${nome}</h2>
      <p style="color:var(--text2);font-size:13px">${ekl||'—'}</p>
    </div>

    <div class="dsec">
      <h3>Dados do músico</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="fg"><label>Nome</label><input type="text" id="edNome" value="${nome==='—'?'':nome}"/></div>
        <div class="fg"><label>Eklesia</label><input type="text" id="edEkl" value="${ekl}"/></div>
        <div class="fg"><label>WhatsApp</label><input type="text" id="edWa" value="${phoneToDisplay(whats)}" oninput="applyPhoneMask(this)" placeholder="(99) 99999-9999" maxlength="15"/></div>
        <div class="fg"><label>Instrumentos</label><input type="text" id="edInstr" value="${instr}" placeholder="Voz, Guitarra..."/></div>
        <div class="fg">
          <label>Banda(s)</label>
          <input type="text" value="${bandaNomes}" disabled style="opacity:.6;cursor:not-allowed;background:var(--bg4)"/>
          <span style="font-size:11px;color:var(--text3);margin-top:3px">Gerenciado pelo administrador em Bandas</span>
        </div>
        <div class="fg"><label>Perfil de acesso</label>
          <select id="edNivel">
            <option value="musico" ${tokNiv==='musico'||(!tokNiv&&!lider&&tokNiv!=='liderequipe'&&tokNiv!=='master')?'selected':''}>🎵 Músico</option>
            <option value="liderbanda" ${tokNiv==='liderbanda'||(lider&&tokNiv!=='liderequipe'&&tokNiv!=='master')?'selected':''}>🎸 Líder de Banda</option>
            <option value="liderequipe" ${tokNiv==='liderequipe'?'selected':''}>👥 Líder de Equipe</option>
            <option value="master" ${tokNiv==='master'?'selected':''}>⚙️ Master</option>
          </select>
        </div>
        <button class="btn-primary sm" onclick="salvarEdMusico('${id}')">💾 Salvar alterações</button>
      </div>
    </div>

    <div class="dsec">
      <h3>Token de acesso</h3>
      ${tokEx ? `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">TOKEN</div>
          <div style="font-family:monospace;font-size:20px;font-weight:700;color:var(--accent2);letter-spacing:3px">${tokStr}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">Nível: ${nivelLabel[tokNiv]||tokNiv}</div>
        </div>
        <div class="arow">
          <a class="btn-wa" href="https://wa.me/55${waNum}?text=${msgToken}" target="_blank">💬 Notificar no WhatsApp</a>
          <button class="btn-ghost sm" onclick="navigator.clipboard.writeText('${tokStr}').then(()=>toast('Token copiado!','ok'))">📋 Copiar</button>
        </div>
      ` : `
        <div style="background:rgba(251,191,36,.08);border:1px solid var(--yellow);border-radius:10px;padding:14px;text-align:center">
          <p style="font-size:13px;color:var(--yellow);margin-bottom:4px">⚠️ Token ainda não gerado</p>
          <p style="font-size:12px;color:var(--text3)">Salve o perfil de acesso acima para gerar automaticamente.</p>
        </div>
      `}
    </div>`;
  openD();
}

async function salvarEdMusico(id) {
  const nivel   = document.getElementById('edNivel').value;
  const nome    = document.getElementById('edNome').value.trim();
  const ekl     = document.getElementById('edEkl').value.trim();
  const whats   = phoneToRaw(document.getElementById('edWa').value);
  const instr   = document.getElementById('edInstr').value.trim();
  const isLider = (nivel === 'liderbanda' || nivel === 'liderequipe' || nivel === 'master') ? 'sim' : 'nao';

  load(true);

  // 1. Salvar dados do músico
  const r = await api('editarMusico', {
    id, nome, eklesia: ekl, whatsapp: whats, instrumentos: instr, isLider,
  });
  if (!r.ok) { load(false); toast(r.error || 'Erro ao salvar','err'); return; }

  // 2. Promover IsLider se necessário
  if (isLider === 'sim') await api('promoverLider', { musicoId: id });

  // 3. Verificar token
  const rT = await api('getTokens');
  const toks = rT.ok ? rT.data : [];
  const tokEx = toks.find(t => String(t.MusicoId) === String(id));

  if (!tokEx) {
    // Gerar token automaticamente
    const rG = await api('gerarToken', { nome, eklesia: ekl, nivel, musicoId: id });
    load(false);
    if (rG.ok) {
      toast('Dados salvos! Token gerado: ' + rG.token + ' ✅','ok');
    } else {
      toast('Dados salvos! (' + (rG.error||'erro ao gerar token') + ')','info');
    }
  } else if (tokEx.Nivel !== nivel) {
    // Atualizar nível do token existente
    await api('atualizarNivelToken', { musicoId: id, nivel, nome });
    load(false);
    toast('Perfil atualizado → ' + (nivelLabel[nivel]||nivel) + ' ✅','ok');
  } else {
    load(false);
    toast('Dados salvos! ✅','ok');
  }

  closeD();
  await loadMusicos();
}

async function gerarTokMusico(id) {
  const m = _aMusicos.find(x => x.Id === id);
  if (!m) { toast('Músico não encontrado', 'err'); return; }
  const nivel = document.getElementById('edNivel')?.value || 'voluntario';

  // Verificar se já tem token
  const rT = await api('getTokens');
  const toks = rT.ok ? rT.data : [];
  const tokEx = toks.find(t => String(t.MusicoId) === String(id));

  if (tokEx) {
    // Já tem token — atualizar nível
    load(true);
    const r = await api('atualizarNivelToken', { musicoId: id, nivel });
    if (nivel === 'lider') await api('promoverLider', { musicoId: id });
    load(false);
    toast('Nível do token atualizado para ' + (nivel === 'lider' ? 'Líder' : 'Voluntário') + ' ✅', 'ok');
    closeD();
    await loadMusicos();
    setTimeout(() => detMusico(id), 400);
    return;
  }

  // Gerar novo token
  load(true);
  const r = await api('gerarToken', {
    nome: m.Nome || '',
    eklesia: m.Eklesia || '',
    nivel,
    musicoId: id,
  });
  if (nivel === 'lider') await api('promoverLider', { musicoId: id });
  load(false);

  if (!r.ok) { toast(r.error || 'Erro', 'err'); return; }
  toast('Token gerado: ' + r.token + ' ✅', 'ok');
  closeD();
  await loadMusicos();
  setTimeout(() => detMusico(id), 400);
}

async function gerarTokMusico(mid,nome,ekl,wa_num){
  const nivel=document.getElementById('mNivel')?.value||'voluntario';
  load(true); const r=await api('gerarToken',{nome,eklesia:ekl,nivel,musicoId:mid}); load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Token: '+r.token+' ✅','ok');
  closeD(); setTimeout(()=>detMusico(mid),400);
}

// BANDAS
async function loadBandas(){
  load(true); const r=await api('getBandas'); load(false);
  _aBandas=r.ok?r.data:[];
  const el=document.getElementById('admBandList');
  if(!_aBandas.length){el.innerHTML=empty('🎸','Nenhuma banda');return;}
  el.innerHTML=_aBandas.map(b=>`
    <div class="card">
      <div class="ch">
        <div style="font-size:28px">${b.Emoji||'🎸'}</div>
        <div style="flex:1"><div class="cn">${b.Nome||'—'}</div><div class="cs">Líder: ${b.LiderNome||'—'}</div></div>
        <div style="display:flex;gap:6px">
          <button class="btn-ghost sm" onclick="modalEditarBanda('${b.Id}')">✏️</button>
          <button class="btn-red" style="padding:5px 10px;font-size:12px" onclick="confRemBanda('${b.Id}','${(b.Nome||'').replace(/'/g,'')}')">🗑</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">
        ${(b.MembrosIds||'').split(',').filter(Boolean).length} integrante(s)
      </div>
    </div>`).join('');
}

async function modalEditarBanda(id) {
  const b = _aBandas.find(x => x.Id === id);
  if (!b) return;
  window._bandaEditandoId = id;
  load(true);
  const [rL, rM, rCel] = await Promise.all([api('getLideres'), api('getMusicos'), api('getCelebracoes')]);
  load(false);
  const lids  = rL.ok  ? rL.data  : [];
  const mus   = rM.ok  ? rM.data  : [];
  const cels  = rCel.ok ? rCel.data : [];
  const memIds = (b.MembrosIds||'').split(',').filter(Boolean);

  // Celebrações que já têm essa banda
  const celsDaBanda = cels.filter(cel => {
    const ids = (cel.BandasIds||'').split(',').map(x=>x.trim());
    return ids.includes(id);
  });
  const celsDaBandaIds = celsDaBanda.map(c => c.Id);

  openM('Editar Banda', `
    <div class="fg"><label>Nome *</label><input type="text" id="ebNome" value="${(b.Nome||'').replace(/"/g,'&quot;')}"/></div>
    <div class="fg"><label>Líder *</label>
      <select id="ebLidId">
        ${lids.map(m=>`<option value="${m.Id}" data-nome="${m.Nome||''}" ${m.Id===b.LiderMusicoId?'selected':''}>${m.Nome||'—'} — ${m.Eklesia||''}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Emoji</label><input type="text" id="ebEmoji" value="${b.Emoji||'🎸'}" maxlength="2"/></div>

    <div class="dsec" style="margin-top:4px">
      <h3 style="font-size:12px;color:var(--text2);margin-bottom:10px">INTEGRANTES ATUAIS</h3>
      <div id="ebMembros" style="display:flex;flex-direction:column;gap:6px">
        ${memIds.map(mid => {
          const mm = mus.find(x => x.Id === mid);
          return mm ? `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg3);border-radius:8px" data-mid="${mid}">
            <span style="flex:1;font-size:13px">${mm.Nome||'?'} — ${mm.Instrumentos||''}</span>
            <button onclick="this.parentElement.remove()" style="background:rgba(248,113,113,.2);border:1px solid var(--red);color:var(--red);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px">✕</button>
          </div>` : '';
        }).join('')}
      </div>
      <button class="btn-ghost sm" style="margin-top:8px;width:100%" onclick="addLinhaIntegranteEd()">+ Adicionar integrante</button>
    </div>

    <div class="dsec" style="margin-top:8px">
      <h3 style="font-size:12px;color:var(--text2);margin-bottom:8px">CELEBRAÇÕES DESTA BANDA</h3>

      <!-- Celebrações já vinculadas -->
      <div id="bandaCelsSelecionadas" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
        ${celsDaBanda.length ? celsDaBanda.map(cel => {
          const d = pd(cel.Data||'');
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:8px" data-cel-id="${cel.Id}">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${cel.Nome||'—'}</div>
              <div style="font-size:11px;color:var(--text2)">📅 ${d.day}/${d.mon}/${d.year} • 📍 ${cel.Local||''}</div>
            </div>
            <button onclick="removerCelDaBanda('${cel.Id}')" style="background:rgba(248,113,113,.15);border:1px solid var(--red);color:var(--red);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">✕</button>
          </div>`;
        }).join('') : '<p id="bandaCelsVazio" style="font-size:12px;color:var(--text3);text-align:center;padding:8px">Nenhuma celebração vinculada</p>'}
      </div>

      <!-- Busca para adicionar mais -->
      <div style="position:relative">
        <input type="text" id="bandaCelBusca"
          placeholder="🔍 Buscar celebração para adicionar..."
          oninput="buscarCelParaBanda(this.value)"
          autocomplete="off"
          style="width:100%;padding:9px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:9px;color:var(--text);font-family:var(--font);font-size:13px;outline:none"/>
        <div id="bandaCelSugestoes" style="display:none;position:absolute;z-index:100;width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-top:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>
      </div>
    </div>

    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEdicaoBanda('${id}')">💾 Salvar</button>
    </div>`);
  window._bandaMusicos = mus;
  window._todasCels = cels;
  window._bandaId = id;
}

function addLinhaIntegrante() {
  // Para criar banda (#bMembros)
  const mus = window._bandaMusicos || [];
  console.log('addLinhaIntegrante: músicos disponíveis:', mus.length, mus.map(m=>m.Nome));
  const instrList = [...new Set(
    mus.flatMap(m => (m.Instrumentos||'').split(',').map(i=>i.trim()).filter(Boolean))
  )].sort();
  const container = document.getElementById('bMembros');
  if (!container) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px';
  div.innerHTML =
    '<select class="bi-instr" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">' +
    '<option value="">Instrumento...</option>' +
    instrList.map(i => '<option value="' + i + '">' + i + '</option>').join('') +
    '</select>' +
    '<select class="bi-musico" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">' +
    '<option value="">— Selecione instrumento —</option>' +
    '</select>' +
    '<button onclick="this.parentElement.remove()" style="background:rgba(248,113,113,.2);border:1px solid var(--red);color:var(--red);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>';
  // Bind change event
  const instrSel = div.querySelector('.bi-instr');
  instrSel.addEventListener('change', function() {
    const instr = this.value;
    const filtrados = mus.filter(m =>
      (m.Instrumentos||'').split(',').map(x=>x.trim()).includes(instr)
    );
    const musSel = div.querySelector('.bi-musico');
    musSel.innerHTML = '<option value="">— Selecione músico —</option>' +
      filtrados.map(m => '<option value="' + m.Id + '">' + (m.Nome||'—') + '</option>').join('');
  });
  container.appendChild(div);
}

function addLinhaIntegranteEd() {
  const mus = window._bandaMusicos || [];
  const instrList = [...new Set(
    mus.flatMap(m => (m.Instrumentos||'').split(',').map(i=>i.trim()).filter(Boolean))
  )].sort();
  const container = document.getElementById('ebMembros');
  if (!container) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px';
  div.innerHTML =
    '<select class="bi-instr" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">' +
    '<option value="">Instrumento...</option>' +
    instrList.map(i => '<option value="' + i + '">' + i + '</option>').join('') +
    '</select>' +
    '<select class="bi-musico" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">' +
    '<option value="">— Selecione instrumento —</option>' +
    '</select>' +
    '<button onclick="this.parentElement.remove()" style="background:rgba(248,113,113,.2);border:1px solid var(--red);color:var(--red);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>';
  const instrSel = div.querySelector('.bi-instr');
  instrSel.addEventListener('change', function() {
    const instr = this.value;
    const filtrados = mus.filter(m =>
      (m.Instrumentos||'').split(',').map(x=>x.trim()).includes(instr)
    );
    const musSel = div.querySelector('.bi-musico');
    musSel.innerHTML = '<option value="">— Selecione músico —</option>' +
      filtrados.map(m => '<option value="' + m.Id + '">' + (m.Nome||'—') + '</option>').join('');
  });
  container.appendChild(div);
}

function filtrarMusBandaEd(sel) {
  const instr = sel.value;
  const mus = (window._bandaMusicos||[]).filter(m=>(m.Instrumentos||'').split(',').map(i=>i.trim()).includes(instr));
  const row = sel.parentElement;
  const musSel = row.querySelector('.bi-musico');
  musSel.innerHTML = `<option value="">— Selecione —</option>` + mus.map(m=>`<option value="${m.Id}">${m.Nome||'—'}</option>`).join('');
}

// ===== BANDA-CELEBRAÇÕES AUTOCOMPLETE =====
function buscarCelParaBanda(query) {
  const div = document.getElementById('bandaCelSugestoes');
  if (!div) return;
  if (!query.trim()) { div.style.display = 'none'; return; }

  const q = query.toLowerCase();
  const jaVinculados = [...document.querySelectorAll('#bandaCelsSelecionadas [data-cel-id]')]
    .map(el => el.dataset.celId);

  const cels = (window._todasCels || []).filter(c =>
    !jaVinculados.includes(c.Id) &&
    ((c.Nome||'').toLowerCase().includes(q) ||
     (c.Local||'').toLowerCase().includes(q))
  ).slice(0, 6);

  if (!cels.length) { div.style.display = 'none'; return; }

  div.style.display = 'block';
  div.innerHTML = cels.map(cel => {
    const d = pd(cel.Data||'');
    const temRep = cel.RepertorioId && cel.RepertorioId.trim() !== '';
    const bandasDaCel = (cel.BandasIds||'').split(',').filter(Boolean);
    const bandaAtualId = window._bandaEditandoId || '';
    const outrasBandas = bandasDaCel.filter(bid => bid !== bandaAtualId);
    const jaVinculada = outrasBandas.length > 0;
    const todasBandas = window._aBandas || [];
    const nomeBandaVinc = jaVinculada ? (todasBandas.find(x=>x.Id===outrasBandas[0])?.Nome||'outra banda') : '';
    const bloqueada = jaVinculada;
    return `<div onclick="adicionarCelBanda('${cel.Id}')"
      style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);opacity:${bloqueada?0.5:1}"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="font-size:13px;font-weight:600">${cel.Nome||'—'}
        ${!temRep?'<span style="font-size:10px;color:var(--yellow)"> ⚠️ sem repertório</span>':''}
        ${jaVinculada?`<span style="font-size:10px;color:var(--red)"> ⛔ vinculada à ${nomeBandaVinc}</span>`:''}
      </div>
      <div style="font-size:11px;color:var(--text2)">📅 ${d.day}/${d.mon}/${d.year} • 📍 ${cel.Local||''}</div>
    </div>`;
  }).join('');
}

function adicionarCelBanda(celId) {
  const div = document.getElementById('bandaCelSugestoes');
  if (div) div.style.display = 'none';
  const input = document.getElementById('bandaCelBusca');
  if (input) input.value = '';

  // Verificar se já está vinculada a ESTA banda
  if (document.querySelector(`#bandaCelsSelecionadas [data-cel-id="${celId}"]`)) return;

  const cel = (window._todasCels || []).find(c => c.Id === celId);
  if (!cel) return;

  // Bloquear se celebração já tem OUTRA banda vinculada
  const bandasDaCel = (cel.BandasIds||'').split(',').filter(Boolean);
  const bandaAtualId = window._bandaEditandoId || '';
  const outrasBAndas = bandasDaCel.filter(bid => bid !== bandaAtualId);
  if (outrasBAndas.length > 0) {
    const todasBandas = window._aBandas || [];
    const nomesBandas = outrasBAndas.map(bid => {
      const b = todasBandas.find(x => x.Id === bid);
      return b ? b.Nome : bid;
    }).join(', ');
    toast(`⛔ Esta celebração já está vinculada à(s) banda(s): ${nomesBandas}`, 'err');
    return;
  }

  const vazio = document.getElementById('bandaCelsVazio');
  if (vazio) vazio.style.display = 'none';

  const d = pd(cel.Data||'');
  const container = document.getElementById('bandaCelsSelecionadas');
  const item = document.createElement('div');
  item.dataset.celId = celId;
  item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:8px';
  item.innerHTML = `
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600">${cel.Nome||'—'}</div>
      <div style="font-size:11px;color:var(--text2)">📅 ${d.day}/${d.mon}/${d.year} • 📍 ${cel.Local||''}</div>
    </div>
    <button onclick="removerCelDaBanda('${celId}')"
      style="background:rgba(248,113,113,.15);border:1px solid var(--red);color:var(--red);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">✕</button>`;
  container.appendChild(item);
}

function removerCelDaBanda(celId) {
  const el = document.querySelector(`#bandaCelsSelecionadas [data-cel-id="${celId}"]`);
  if (el) el.remove();
  // Mostrar vazio se não sobrou nenhuma
  const restantes = document.querySelectorAll('#bandaCelsSelecionadas [data-cel-id]');
  if (!restantes.length) {
    const container = document.getElementById('bandaCelsSelecionadas');
    if (container && !document.getElementById('bandaCelsVazio')) {
      const p = document.createElement('p');
      p.id = 'bandaCelsVazio';
      p.style.cssText = 'font-size:12px;color:var(--text3);text-align:center;padding:8px';
      p.textContent = 'Nenhuma celebração vinculada';
      container.appendChild(p);
    }
  }
}

async function salvarEdicaoBanda(id) {
  const sel = document.getElementById('ebLidId');
  const nome = document.getElementById('ebNome').value.trim();
  const lidId = sel.value;
  const opt = sel.options[sel.selectedIndex];
  const lidNome = opt ? (opt.dataset.nome || opt.text.split('—')[0].trim()) : '';
  if (!nome) { toast('Informe o nome','err'); return; }
  if (!lidId) { toast('Selecione um líder','err'); return; }

  const existentes = [...document.querySelectorAll('#ebMembros [data-mid]')]
    .map(el => el.dataset.mid).filter(Boolean);
  const novos = [...document.querySelectorAll('#ebMembros select.bi-musico')]
    .map(s => s.value).filter(Boolean);
  const membrosIds = [...new Set([lidId, ...existentes, ...novos].filter(Boolean))];

  const celsSelecionadas = [...document.querySelectorAll('#bandaCelsSelecionadas [data-cel-id]')]
    .map(el => el.dataset.celId).filter(Boolean);

  const todasCels = window._todasCels || [];
  const celAnteriores = todasCels
    .filter(c => (c.BandasIds||'').split(',').filter(Boolean).includes(id))
    .map(c => c.Id);
  const celNovas = celsSelecionadas.filter(cid => !celAnteriores.includes(cid));

  load(true);

  // Salvar banda
  const r = await api('editarBanda', {
    id, nome, liderNome: lidNome, liderMusicoId: lidId,
    emoji: document.getElementById('ebEmoji').value || '🎸',
    membrosIds,
  });
  if (!r.ok) { load(false); toast(r.error||'Erro','err'); return; }

  // Atualizar celebrações
  for (const celId of celsSelecionadas) {
    const cel = todasCels.find(c => c.Id === celId);
    if (!cel) continue;
    const ids = (cel.BandasIds||'').split(',').filter(Boolean);
    if (!ids.includes(id)) {
      ids.push(id);
      await api('editarCelebracao', { id: celId, nome: cel.Nome, data: (cel.Data||'').split('T')[0], horario: cel.Horario, local: cel.Local, obs: cel.Obs||'', bandasIds: ids, repertorioId: cel.RepertorioId||'', repertorioTipo: cel.RepertorioTipo||'master', liderEquipeId: cel.LiderEquipeId||'' });
    }
  }
  for (const cel of todasCels) {
    const tinha = (cel.BandasIds||'').split(',').filter(Boolean).includes(id);
    if (tinha && !celsSelecionadas.includes(cel.Id)) {
      const ids = (cel.BandasIds||'').split(',').filter(Boolean).filter(bid => bid !== id);
      await api('editarCelebracao', { id: cel.Id, nome: cel.Nome, data: (cel.Data||'').split('T')[0], horario: cel.Horario, local: cel.Local, obs: cel.Obs||'', bandasIds: ids, repertorioId: cel.RepertorioId||'', repertorioTipo: cel.RepertorioTipo||'master', liderEquipeId: cel.LiderEquipeId||'' });
    }
  }

  // Criar escalas automáticas para celebrações novas
  let escalasCreadas = 0;
  for (const celId of celNovas) {
    const cel = todasCels.find(c => c.Id === celId);
    if (!cel) continue;
    const r2 = await api('criarEscalaAutomatica', {
      celebracaoId: celId,
      celebracaoNome: cel.Nome || '',
      data: (cel.Data||'').split('T')[0],
      horario: cel.Horario || '',
      local: cel.Local || '',
      repertorioId: cel.RepertorioId || '',
      bandaId: id,
      bandaNome: nome,
      musicosIds: membrosIds,
    });
    if (r2.ok) escalasCreadas++;
  }

  load(false);
  toast(escalasCreadas > 0
    ? `Banda atualizada! ${escalasCreadas} escala(s) criada(s) para os músicos ✅`
    : `Banda atualizada com ${membrosIds.length} integrante(s)! ✅`, 'ok');
  closeM();
  await loadBandas();
}

async function modalCriarBanda(){
  load(true);
  const [rL, rM] = await Promise.all([api('getLideres'), api('getMusicos')]);
  load(false);
  const lids = rL.ok ? rL.data : [];
  const mus  = rM.ok ? rM.data : [];
  window._bandaMusicos = mus;

  openM('Nova Banda', `
    <div class="fg"><label>Nome da banda *</label><input type="text" id="bNome"/></div>
    <div class="fg"><label>Líder *</label>
      <select id="bLidId">
        <option value="">— Selecione um líder —</option>
        ${lids.map(m=>`<option value="${m.Id}" data-nome="${m.Nome||''}">${m.Nome||'—'} — ${m.Eklesia||''}</option>`).join('')}
      </select>
      ${!lids.length ? '<p style="font-size:11px;color:var(--red);margin-top:4px">Nenhum líder disponível. Promova um músico a líder primeiro.</p>' : ''}
    </div>
    <div class="fg"><label>Emoji</label><input type="text" id="bEmoji" value="🎸" maxlength="2"/></div>
    <div class="dsec" style="margin-top:4px">
      <h3 style="font-size:12px;color:var(--text2);margin-bottom:10px">INTEGRANTES</h3>
      <div id="bMembros" style="display:flex;flex-direction:column;gap:8px"></div>
      <button class="btn-ghost sm" style="margin-top:8px;width:100%" onclick="addLinhaIntegrante()">+ Adicionar integrante</button>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarBanda()">Criar banda</button>
    </div>`);
}

async function salvarBanda(){
  const sel = document.getElementById('bLidId');
  const nome = document.getElementById('bNome').value.trim();
  const lidId = sel ? sel.value : '';
  const opt = sel ? sel.options[sel.selectedIndex] : null;
  const lidNome = opt ? (opt.dataset.nome || opt.text.split('—')[0].trim()) : '';
  if (!nome) { toast('Informe o nome da banda','err'); return; }
  if (!lidId) { toast('Selecione um líder','err'); return; }

  // Coletar todos os músicos selecionados (selects com classe bi-musico dentro de #bMembros)
  const container = document.getElementById('bMembros');
  const musicoSelects = container ? container.querySelectorAll('select.bi-musico') : [];
  const novos = [...musicoSelects].map(s => s.value).filter(Boolean);
  const membrosIds = [...new Set([lidId, ...novos].filter(Boolean))];

  load(true);
  const r = await api('criarBanda', {
    nome,
    liderNome: lidNome,
    liderMusicoId: lidId,
    emoji: document.getElementById('bEmoji').value || '🎸',
    membrosIds,
  });
  load(false);
  if (!r.ok) { toast(r.error||'Erro ao criar banda','err'); return; }
  toast('Banda criada com ' + membrosIds.length + ' integrante(s)! ✅','ok');
  closeM();
  await loadBandas();
}

function confRemBanda(id,nome){
  _pendAct={type:'remBanda',id};
  openM('🗑 Remover Banda',`
    <p style="text-align:center;padding:12px 0;font-size:15px;color:var(--text2);line-height:1.7">Remover a banda <strong style="color:var(--red)">${nome}</strong>?<br/><span style="font-size:12px;color:var(--text3)">Ação irreversível.</span></p>
    <div class="mfoot" style="justify-content:center;gap:12px"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-red" onclick="execRemBanda()">🗑 Confirmar</button></div>`);
}

async function execRemBanda(){
  if(!_pendAct||_pendAct.type!=='remBanda') return;
  const {id}=_pendAct; _pendAct=null; closeM();
  load(true); const r=await api('removerBanda',{id}); load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Banda removida!','ok'); await loadBandas();
}

// CELEBRAÇÕES
async function loadCel(){
  const s=getSess();
  // Lider de equipe usa painel próprio, não loadCel
  if (s && s.nivel==='liderequipe') {
    await loadLiderEquipePanel();
    return;
  }
  load(true); const r=await api('getCelebracoes'); load(false);
  const list=r.ok?r.data:[];
  const el=document.getElementById('admCelList');
  if(!list.length){el.innerHTML=empty('✨','Nenhuma celebração');return;}
  const isMaster = s && s.nivel==='master';
  const isLE = false;
  list.sort((a,b)=>new Date(a.Data||'9999')-new Date(b.Data||'9999'));
  el.innerHTML=list.map(c=>{
    const d=pd(c.Data);
    const podeRepLE = isLE && (c.RepertorioTipo||'').toLowerCase()==='liderequipe';
    return `
    <div class="card">
      <div class="ch">
        <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
        <div style="flex:1">
          <div class="cn">${c.Nome||'—'}</div>
          <div class="cs">⏰ ${c.Horario||''} • 📍 ${c.Local||''}</div>
          ${c.LiderEquipeId ? `<div style="font-size:11px;color:var(--accent2);margin-top:3px">👥 Líder de equipe atribuído</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${isMaster ? `<button class="btn-ghost sm" onclick="modalEditarCel('${c.Id}')">✏️</button>` : ''}
          ${isLE ? `<button class="btn-ghost sm" onclick="modalEditarCel('${c.Id}')">👁 Ver${podeRepLE?' / Repertório':''}</button>` : ''}
          ${isMaster ? `<button class="btn-red" style="padding:5px 10px;font-size:12px" onclick="confExcluirCel('${c.Id}','${(c.Nome||'').replace(/'/g,'')}')">🗑</button>` : ''}
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <span>📋 Repertório: ${c.RepertorioTipo==='liderequipe'?'👥 Líder de equipe define':c.RepertorioTipo==='lider'?'🎸 Líder define':'⚙️ Master define'}</span>
      </div>
      ${c.Obs?`<p style="font-size:12px;color:var(--text3);margin-top:6px">${c.Obs}</p>`:''}
    </div>`;
  }).join('');
}

async function modalCriarCel(){
  load(true);
  const [rRep, rLE] = await Promise.all([api('getRepertorios',{}), api('getLideresEquipe')]);
  load(false);
  const reps  = rRep.ok ? rRep.data : [];
  const lides = rLE.ok  ? rLE.data  : [];

  openM('Nova Celebração',`
    <div class="fg"><label>Nome *</label><input type="text" id="cNome" placeholder="Ex: Culto Dominical"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Data *</label><input type="date" id="cDt"/></div>
      <div class="fg"><label>Horário *</label><input type="time" id="cHr"/></div>
    </div>
    <div class="fg"><label>Local *</label><input type="text" id="cLoc"/></div>
    <div class="fg"><label>Observações</label><textarea id="cObs" rows="2"></textarea></div>
    <div class="fg"><label>Atribuir a Líder de Equipe</label>
      <select id="cLiderEq">
        <option value="">— Sem líder de equipe —</option>
        ${lides.map(l=>`<option value="${l.Id}">${l.Nome||'—'} — ${l.Eklesia||''}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Repertório</label>
      <select id="cRep">
        <option value="">— Sem repertório —</option>
        ${reps.map(r=>`<option value="${r.Id}">${r.Nome||'—'}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Quem define o repertório</label>
      <select id="cRepT">
        <option value="master">⚙️ Master define</option>
        <option value="liderequipe">👥 Líder de equipe define</option>
      </select>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarCel()">Criar</button>
    </div>`);
}

async function salvarCel(){
  const nome = document.getElementById('cNome').value.trim();
  const dt   = document.getElementById('cDt').value;
  const hr   = document.getElementById('cHr').value;
  const loc  = document.getElementById('cLoc').value.trim();
  if(!nome||!dt||!hr||!loc){toast('Preencha todos os campos obrigatórios','err');return;}
  const repId     = document.getElementById('cRep').value;
  const liderEqId = document.getElementById('cLiderEq').value;
  load(true);
  const r=await api('criarCelebracao',{
    nome, data:dt, horario:hr, local:loc,
    obs: document.getElementById('cObs').value,
    bandasIds: [],
    repertorioId: repId,
    repertorioTipo: document.getElementById('cRepT').value,
    liderEquipeId: liderEqId,
  });
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Celebração criada!','ok'); closeM(); await loadCel();
}


function confExcluirCel(id, nome) {
  if (!confirm('Excluir a celebração "' + nome + '"?\nEsta ação não pode ser desfeita.')) return;
  load(true);
  api('removerCelebracao', { id }).then(r => {
    load(false);
    if (!r.ok) { toast(r.error||'Erro','err'); return; }
    toast('Celebração excluída!','ok');
    loadCel();
  });
}

async function modalEditarCel(id) {
  load(true);
  const [rCel, rRep, rLE] = await Promise.all([
    api('getCelebracoes'),
    api('getRepertorios',{}),
    api('getLideresEquipe'),
  ]);
  load(false);
  const list = rCel.ok ? rCel.data : [];
  const cel = list.find(x => x.Id === id);
  if (!cel) { toast('Não encontrado','err'); return; }

  const reps  = rRep.ok ? rRep.data : [];
  const lides = rLE.ok  ? rLE.data  : [];
  const s = getSess();
  const isMaster = s && s.nivel === 'master';
  const isLE     = s && s.nivel === 'liderequipe';
  const podeRepLE = isLE && (cel.RepertorioTipo||'').toLowerCase() === 'liderequipe';

  const celData = (cel.Data||'').includes('T') ? cel.Data.split('T')[0] : (cel.Data||'');
  const celHora = (cel.Horario||'').length > 5 ? cel.Horario.substring(0,5) : (cel.Horario||'');

  // Líder de equipe só pode editar campos básicos + repertório (se for do tipo liderequipe)
  openM(isLE ? 'Celebração' : 'Editar Celebração', `
    <div class="fg"><label>Nome *</label>
      <input type="text" id="ecNome" value="${(cel.Nome||'').replace(/"/g,'&quot;')}" ${isLE?'readonly style="opacity:.6"':''}/>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Data</label><input type="date" id="ecDt" value="${celData}" ${isLE?'readonly style="opacity:.6"':''}></div>
      <div class="fg"><label>Horário</label><input type="time" id="ecHr" value="${celHora}" ${isLE?'readonly style="opacity:.6"':''}></div>
    </div>
    <div class="fg"><label>Local</label>
      <input type="text" id="ecLoc" value="${(cel.Local||'').replace(/"/g,'&quot;')}" ${isLE?'readonly style="opacity:.6"':''}/>
    </div>
    ${!isLE ? `<div class="fg"><label>Observações</label><textarea id="ecObs" rows="2">${cel.Obs||''}</textarea></div>` : ''}

    ${isMaster ? `
    <div class="fg"><label>Atribuir a Líder de Equipe</label>
      <select id="ecLiderEq">
        <option value="">— Sem líder de equipe —</option>
        ${lides.map(l=>`<option value="${l.Id}" ${cel.LiderEquipeId===l.Id?'selected':''}>${l.Nome||'—'} — ${l.Eklesia||''}</option>`).join('')}
      </select>
    </div>` : `<input type="hidden" id="ecLiderEq" value="${cel.LiderEquipeId||''}"/>`}

    <div class="fg"><label>Repertório ${podeRepLE ? '' : isLE ? '<span style="font-size:10px;color:var(--text3)">(definido pelo Admin)</span>' : ''}</label>
      ${podeRepLE || isMaster ? `
      <select id="ecRep">
        <option value="">— Sem repertório —</option>
        ${reps.map(r=>`<option value="${r.Id}" ${cel.RepertorioId===r.Id?'selected':''}>${r.Nome||'—'}</option>`).join('')}
      </select>` : `
      <input type="text" value="${reps.find(r=>r.Id===cel.RepertorioId)?.Nome||'Não definido'}" readonly style="opacity:.6"/>
      <input type="hidden" id="ecRep" value="${cel.RepertorioId||''}"/>`}
    </div>

    ${isMaster ? `
    <div class="fg"><label>Quem define o repertório</label>
      <select id="ecRepT">
        <option value="master" ${cel.RepertorioTipo==='master'||cel.RepertorioTipo==='admin'||!cel.RepertorioTipo?'selected':''}>⚙️ Master define</option>
        <option value="liderequipe" ${cel.RepertorioTipo==='liderequipe'?'selected':''}>👥 Líder de equipe define</option>
      </select>
    </div>` : `
    <input type="hidden" id="ecRepT" value="${cel.RepertorioTipo||'master'}"/>
    <p style="font-size:11px;color:var(--text3)">📋 Quem define: ${cel.RepertorioTipo==='liderequipe'?'👥 Líder de equipe':'⚙️ Master'}</p>`}

    ${!isLE ? '' : ''}
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      ${isMaster || podeRepLE ? `<button class="btn-primary sm" onclick="salvarEdicaoCel('${id}')">💾 Salvar</button>` : ''}
    </div>`);
}

async function salvarEdicaoCel(id) {
  const nome = document.getElementById('ecNome').value.trim();
  const dt   = document.getElementById('ecDt').value;
  const hr   = document.getElementById('ecHr').value;
  const loc  = document.getElementById('ecLoc').value.trim();
  if (!nome||!dt||!hr||!loc) { toast('Preencha os campos obrigatórios','err'); return; }
  const repId     = document.getElementById('ecRep').value;
  const liderEl   = document.getElementById('ecLiderEq');
  const liderEqId = liderEl ? liderEl.value : '';
  load(true);
  const r = await api('editarCelebracao', {
    id, nome, data: dt, horario: hr, local: loc,
    obs: document.getElementById('ecObs')?.value || '',
    repertorioId: repId,
    repertorioTipo: document.getElementById('ecRepT').value,
    liderEquipeId: liderEqId,
  });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Celebração atualizada! ✅','ok');
  closeM();
  await loadCel();
}

async function loadEsc(){
  const s=getSess();
  // Lider de equipe vê suas escalas pessoais nesta tela
  if(s && s.nivel==='liderequipe'){
    renderVEscInEl('admEscList');
    return;
  }
  load(true); const r=await api('getEscalas'); load(false);
  const list=r.ok?r.data:[];
  const el=document.getElementById('admEscList');
  if(!list.length){el.innerHTML=empty('📅','Nenhuma escala');return;}
  list.sort((a,b)=>new Date(a.Data||'9999')-new Date(b.Data||'9999'));
  el.innerHTML=list.map(e=>{const d=pd(e.Data);return`
    <div class="li">
      <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
      <div class="li-info"><div class="li-name">${e.Titulo||'—'}</div><div class="li-sub">⏰ ${e.Horario||''} • 🎸 ${e.BandaNome||''} • 📍 ${e.Local||''}</div></div>
      <div class="li-r">${badge(e.Status||'pendente')}</div>
    </div>`;}).join('');
}

// REPERTÓRIOS + MÚSICAS ADMIN
async function loadRepertoriosAdmin(){
  load(true);
  const [rRep, rMus, rBib] = await Promise.all([api('getRepertorios',{}), api('getMusicas'), api('getBiblioteca')]);
  load(false);
  _aMusicas  = rMus.ok  ? rMus.data  : [];
  _biblioteca = rBib.ok ? rBib.data  : [];

  const repEl = document.getElementById('admRepList');
  const reps  = rRep.ok ? rRep.data  : [];

  if (!reps.length) {
    repEl.innerHTML = `<p style="font-size:13px;color:var(--text3);margin-bottom:12px">Nenhum repertório criado ainda.</p>`;
    return;
  }

  const s = getSess();
  const isMaster = s && s.nivel === 'master';
  const myId = s ? s.mid : '';

  reps.sort((a,b) => (a.Nome||'').localeCompare(b.Nome||''));
  repEl.innerHTML = reps.map(r => {
    const musIds  = (r.MusicasIds||'').split(',').filter(Boolean);
    const musNomes = musIds.map(mid => {
      const bm = _biblioteca.find(x => x.Id === mid);
      if (bm) return bm.Titulo;
      const m2 = _aMusicas.find(x => x.Id === mid);
      return m2 ? m2.Nome : null;
    }).filter(Boolean);

    const criadoPor = (r.CriadoPor||'').trim();
    // CriadoPor vazio = criado antes da coluna existir, todos podem editar
    // CriadoPor preenchido = só o dono ou master
    const eMeu = isMaster || criadoPor === '' || (criadoPor !== '' && criadoPor === (myId||''));
    const pronto = r.RepReady === 'sim';

    return `
    <div class="card" style="margin-bottom:10px">
      <div class="ch">
        <div style="flex:1">
          <div class="cn">📋 ${r.Nome||'—'} ${pronto?'<span class="badge b-aprov" style="margin-left:6px;font-size:10px">✅ pronto</span>':''}</div>
          <div class="cs" style="margin-top:2px;display:flex;flex-wrap:wrap;gap:8px">
            <span>${musIds.length} música(s)</span>
            ${r.CriadoPor ? `<span style="color:var(--text3)">👤 ${r.CriadoPorNome||'—'}</span>` : `<span style="color:var(--text3)">👤 ${r.CriadoPorNome||'Administrador'}</span>`}
            ${r.CelebracaoNome ? `<span style="color:var(--accent2)">✨ ${r.CelebracaoNome}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          ${eMeu ? `<button class="btn-ghost sm" onclick="modalEditarRepertorio('${r.Id}')">✏️ Editar</button>` : ''}
          ${eMeu ? `<button class="btn-red" style="padding:5px 12px;font-size:13px" onclick="confExcluirRepertorio('${r.Id}','${(r.Nome||'').replace(/'/g,'')}')">🗑</button>` : ''}
        </div>
      </div>
      ${musNomes.length ? `<div class="itags">${musNomes.map(n=>`<span class="itag">🎵 ${n}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function confExcluirRepertorio(id, nome) {
  if (!confirm('Excluir o repertório "' + nome + '"?\nEsta ação não pode ser desfeita.')) return;
  api('removerRepertorio', { id }).then(r => {
    if (!r.ok) { toast(r.error||'Erro','err'); return; }
    toast('Repertório excluído!','ok');
    loadRepertoriosAdmin();
  });
}

async function modalCriarRepertorioAdmin() {
  load(true);
  const rB = await api('getBiblioteca');
  load(false);
  window._repBiblioteca = rB.ok ? rB.data.sort((a,b)=>(a.Titulo||'').localeCompare(b.Titulo||'')) : [];
  window._repSelecionadas = [];

  const bibVazia = window._repBiblioteca.length === 0;
  openM('Novo Repertório', `
    <div class="fg"><label>Nome *</label><input type="text" id="rNome" placeholder="Ex: Louvor Junho"/></div>

    <div class="fg">
      <label>Buscar músicas da biblioteca</label>
      ${bibVazia
        ? `<div style="padding:14px;background:rgba(251,191,36,.08);border:1px solid var(--yellow);border-radius:10px;text-align:center">
             <p style="font-size:13px;color:var(--yellow);">⚠️ Biblioteca vazia</p>
             <p style="font-size:12px;color:var(--text3);margin-top:4px">Vá em <strong>Biblioteca</strong> no menu lateral e adicione músicas primeiro.</p>
           </div>`
        : `<input type="text" id="repBusca" placeholder="Digite título ou compositor..." oninput="buscarRepMusica(this.value)" autocomplete="off"/>
           <div id="repSugestoes" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-top:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>
           <p style="font-size:11px;color:var(--text3);margin-top:4px">${window._repBiblioteca.length} música(s) disponíveis</p>`
      }
    </div>

    <div class="fg">
      <label>Músicas selecionadas</label>
      <div id="repSelecionadas" style="display:flex;flex-direction:column;gap:6px;min-height:48px;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:10px">
        <p id="repVazio" style="font-size:12px;color:var(--text3);text-align:center;margin:auto">Nenhuma música adicionada</p>
      </div>
    </div>

    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarRepAdmin()">Criar repertório</button>
    </div>`);
}

function buscarRepMusica(query) {
  const bib = window._repBiblioteca || [];
  const div = document.getElementById('repSugestoes');
  console.log('buscarRepMusica: bib size=', bib.length, 'query=', query);
  if (!query.trim()) { if(div) div.style.display='none'; return; }
  if (!div) { console.warn('repSugestoes not found'); return; }
  const q = query.toLowerCase();
  const results = bib.filter(m =>
    (m.Titulo||'').toLowerCase().includes(q) ||
    (m.Composicao||'').toLowerCase().includes(q) ||
    (m.Versao||'').toLowerCase().includes(q)
  ).slice(0, 8);
  if (!results.length) { div.style.display='none'; return; }
  div.style.display = 'block';
  div.innerHTML = results.map(m => `
    <div onclick="addRepMusica('${m.Id}')"
         style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s"
         onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background=''">
      <div style="font-size:13px;font-weight:600">${m.Titulo||'—'}</div>
      <div style="font-size:11px;color:var(--text2)">${m.Composicao||''} ${m.Versao?'• '+m.Versao:''} <span class="badge b-agend" style="margin-left:4px">${m.Categoria||''}</span></div>
    </div>`).join('');
}

function addRepMusica(id) {
  const bib = window._repBiblioteca || [];
  const sel = window._repSelecionadas || [];
  const m = bib.find(x => x.Id === id);
  if (!m || sel.find(x => x.Id === id)) {
    document.getElementById('repSugestoes').style.display='none';
    document.getElementById('repBusca').value='';
    return;
  }
  sel.push(m);
  window._repSelecionadas = sel;
  renderRepSelecionadas();
  document.getElementById('repSugestoes').style.display='none';
  document.getElementById('repBusca').value='';
}

function removerRepMusica(id) {
  window._repSelecionadas = (window._repSelecionadas||[]).filter(m => m.Id !== id);
  renderRepSelecionadas();
}

function renderRepSelecionadas() {
  const sel = window._repSelecionadas || [];
  const el = document.getElementById('repSelecionadas');
  const vazio = document.getElementById('repVazio');
  if (!sel.length) {
    if(vazio) vazio.style.display='block';
    const items = el.querySelectorAll('.rep-item');
    items.forEach(i=>i.remove());
    return;
  }
  if(vazio) vazio.style.display='none';
  // Remove old items and re-render
  el.querySelectorAll('.rep-item').forEach(i=>i.remove());
  sel.forEach((m,i) => {
    const div = document.createElement('div');
    div.className = 'rep-item';
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg4);border-radius:8px';
    div.innerHTML = `
      <span style="font-size:11px;color:var(--text3);font-weight:700;width:20px">${i+1}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${m.Titulo||'—'}</div>
        <div style="font-size:11px;color:var(--text2)">${m.Composicao||''} ${m.Versao?'• '+m.Versao:''}</div>
      </div>
      ${m.Link?`<a href="${m.Link}" target="_blank" style="color:var(--accent2);font-size:12px;text-decoration:none">▶</a>`:''}
      <button onclick="removerRepMusica('${m.Id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0 4px">✕</button>`;
    el.appendChild(div);
  });
}

async function salvarRepAdmin() {
  const nome = document.getElementById('rNome').value.trim();
  if (!nome) { toast('Informe o nome do repertório','err'); return; }
  const sel = window._repSelecionadas || [];
  if (!sel.length) { toast('Adicione ao menos uma música','err'); return; }
  const ids = sel.map(m => m.Id);
  load(true);
  const r = await api('criarRepertorio', { nome, bandaId:'', musicasIds: ids });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Repertório criado com ' + ids.length + ' música(s)! ✅','ok');
  closeM();
  await loadRepertoriosAdmin();
}

async function modalEditarRepertorio(id) {
  load(true);
  const [rRep, rB] = await Promise.all([api('getRepertorios',{}), api('getBiblioteca')]);
  load(false);

  const rep = rRep.ok ? rRep.data.find(x => x.Id === id) : null;
  if (!rep) { toast('Não encontrado','err'); return; }

  const bib    = rB.ok ? rB.data.sort((a,b)=>(a.Titulo||'').localeCompare(b.Titulo||'')) : [];
  const selIds = (rep.MusicasIds||'').split(',').filter(Boolean);

  // Pre-populate globals
  window._repBiblioteca   = bib;
  window._repSelecionadas = bib.filter(m => selIds.includes(m.Id));

  openM('Editar Repertório', `
    <div class="fg"><label>Nome *</label><input type="text" id="erNome" value="${(rep.Nome||'').replace(/"/g,'&quot;')}"/></div>
    <div class="fg">
      <label>Buscar músicas da biblioteca</label>
      ${bib.length
        ? `<input type="text" id="repBusca" placeholder="Digite título ou compositor..." oninput="buscarRepMusica(this.value)" autocomplete="off"/>
           <div id="repSugestoes" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-top:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>
           <p style="font-size:11px;color:var(--text3);margin-top:4px">${bib.length} música(s) disponíveis</p>`
        : `<p style="font-size:13px;color:var(--yellow)">⚠️ Biblioteca vazia. Adicione músicas em Biblioteca.</p>`
      }
    </div>
    <div class="fg">
      <label>Músicas no repertório (${window._repSelecionadas.length})</label>
      <div id="repSelecionadas" style="display:flex;flex-direction:column;gap:6px;min-height:48px;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:10px">
        <p id="repVazio" style="font-size:12px;color:var(--text3);text-align:center;margin:auto;${window._repSelecionadas.length?'display:none':''}">Nenhuma música adicionada</p>
      </div>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEditarRepAdmin('${id}')">💾 Salvar</button>
    </div>`);

  // Render pre-selected after modal is open
  setTimeout(() => renderRepSelecionadas(), 80);
}

async function salvarEditarRepAdmin(id) {
  const nome = document.getElementById('erNome').value.trim();
  if (!nome) { toast('Informe o nome','err'); return; }
  const sel = window._repSelecionadas || [];
  const ids = sel.map(m => m.Id);
  load(true);
  const r = await api('editarRepertorio', { id, nome, musicasIds: ids });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Repertório atualizado com ' + ids.length + ' música(s)! ✅','ok');
  closeM();
  await loadRepertoriosAdmin();
}

// MÚSICAS ADMIN
async function loadMusicas2(){ await loadRepertoriosAdmin(); }

function renderAMusicas(list){
  _aMusicas = list;
  const el = document.getElementById('admMusList2');
  if (!el) return;
  if (!list.length) { el.innerHTML=empty('🎼','Nenhuma música cadastrada'); return; }
  list.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  el.innerHTML = list.map(m=>`
    <div class="card">
      <div class="cn">🎵 ${m.Nome||'—'}</div>
      <div class="cs" style="margin-top:4px">${m.Artista||''} • ${m.Versao||''}</div>
      <div class="itags">
        <span class="itag">${m.Tom||'?'}</span>
        <span class="itag">${m.Bpm||'?'} BPM</span>
        ${m.Youtube?`<a href="${m.Youtube}" target="_blank" class="itag" style="color:var(--accent2);text-decoration:none">▶ YT</a>`:''}
      </div>
    </div>`).join('');
}

// TOKENS
// ===== BIBLIOTECA =====
let _biblioteca = [];

async function loadBiblioteca() {
  load(true);
  const r = await api('getBiblioteca');
  load(false);
  _biblioteca = r.ok ? (r.data || []) : [];

  // Inserir campo de busca antes da lista se não existir
  const el = document.getElementById('admBibList');
  const page = document.getElementById('ap-biblioteca');
  if (page && !document.getElementById('bibBuscaWrap')) {
    const wrap = document.createElement('div');
    wrap.id = 'bibBuscaWrap';
    wrap.style.cssText = 'margin-bottom:16px;position:relative';
    wrap.innerHTML = `
      <div style="position:relative">
        <input type="text" id="bibBusca"
          placeholder="🔍 Buscar por título, compositor, versão ou categoria..."
          oninput="renderBiblioteca()"
          style="width:100%;padding:11px 44px 11px 16px;background:var(--bg2);border:1px solid var(--border);
                 border-radius:10px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;
                 transition:border-color .2s"/>
        <span id="bibBuscaCount" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);
              font-size:12px;color:var(--text3)"></span>
      </div>`;
    page.insertBefore(wrap, el);

    // Focus style
    document.getElementById('bibBusca').addEventListener('focus', function() {
      this.style.borderColor = 'var(--accent)';
      this.style.boxShadow = '0 0 0 3px rgba(124,111,247,.12)';
    });
    document.getElementById('bibBusca').addEventListener('blur', function() {
      this.style.borderColor = 'var(--border)';
      this.style.boxShadow = 'none';
    });
  }

  renderBiblioteca();
}

function renderBiblioteca(filtro) {
  const el = document.getElementById('admBibList');
  if (!el) return;

  let lista = [..._biblioteca].sort((a,b) => (a.Titulo||'').localeCompare(b.Titulo||''));

  // Aplicar filtro se houver
  const q = (filtro || document.getElementById('bibBusca')?.value || '').toLowerCase().trim();
  if (q) {
    lista = lista.filter(m =>
      (m.Titulo||'').toLowerCase().includes(q) ||
      (m.Composicao||'').toLowerCase().includes(q) ||
      (m.Versao||'').toLowerCase().includes(q) ||
      (m.Categoria||'').toLowerCase().includes(q)
    );
  }

  if (!lista.length && !q) {
    el.innerHTML = empty('🎵', 'Nenhuma música cadastrada ainda');
    return;
  }
  if (!lista.length && q) {
    el.innerHTML = `<p style="text-align:center;padding:32px;color:var(--text3)">Nenhuma música encontrada para "<strong>${q}</strong>"</p>`;
    return;
  }

  // Atualizar contador
  const countEl = document.getElementById('bibBuscaCount');
  if (countEl) countEl.textContent = lista.length + ' / ' + _biblioteca.length;

  el.innerHTML = lista.map(m => `
    <div class="li">
      <div class="li-info">
        <div class="li-name">🎵 ${m.Titulo||'—'} ${m.TituloOriginal&&m.TituloOriginal!==m.Titulo?`<span style="font-size:11px;color:var(--text3)">(${m.TituloOriginal})</span>`:''}
          <span class="badge b-agend" style="margin-left:8px">${m.Categoria||''}</span>
        </div>
        <div class="li-sub">${m.Composicao||''} ${m.Versao?'• '+m.Versao:''}</div>
      </div>
      <div class="li-r">
        ${m.Link?`<a href="${m.Link}" target="_blank" class="btn-primary sm" style="text-decoration:none">▶</a>`:''}
        <button class="btn-red" style="padding:5px 10px;font-size:12px" onclick="removerBib('${m.Id}','${(m.Titulo||'').replace(/'/g,'')}')">🗑</button>
      </div>
    </div>`).join('');
}

function modalAddBiblioteca() {
  openM('Adicionar Música à Biblioteca', `
    <div class="fg"><label>Título *</label><input type="text" id="bibTit" placeholder="Ex: A Alegria do Senhor"/></div>
    <div class="fg"><label>Título Original</label><input type="text" id="bibTitOrig" placeholder="Título na língua original"/></div>
    <div class="fg"><label>Composição *</label><input type="text" id="bibComp" placeholder="Ex: Fernandinho"/></div>
    <div class="fg"><label>Versão</label><input type="text" id="bibVers" placeholder="Ex: Fernandinho, Ministério Zoe..."/></div>
    <div class="fg"><label>Categoria</label>
      <select id="bibCat">
        <option value="Nacional">Nacional</option>
        <option value="Internacional">Internacional</option>
        <option value="Hino">Hino</option>
        <option value="Gospel Pop">Gospel Pop</option>
        <option value="Contemporâneo">Contemporâneo</option>
        <option value="Clássico">Clássico</option>
      </select>
    </div>
    <div class="fg"><label>Link *</label><input type="text" id="bibLink" placeholder="https://youtu.be/..."/></div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarBiblioteca()">Adicionar</button>
    </div>`);
}

async function salvarBiblioteca() {
  const titulo = document.getElementById('bibTit').value.trim();
  const comp   = document.getElementById('bibComp').value.trim();
  const link   = document.getElementById('bibLink').value.trim();
  if (!titulo) { toast('Título é obrigatório','err'); return; }
  if (!comp)   { toast('Composição é obrigatória','err'); return; }
  if (!link)   { toast('Link é obrigatório','err'); return; }
  load(true);
  const r = await api('adicionarBiblioteca', {
    titulo,
    tituloOriginal: document.getElementById('bibTitOrig').value.trim(),
    composicao: comp,
    versao:   document.getElementById('bibVers').value.trim(),
    categoria:document.getElementById('bibCat').value,
    link,
  });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Música adicionada à biblioteca! 🎵','ok');
  closeM();
  await loadBiblioteca();
}

async function removerBib(id, titulo) {
  if (!confirm('Remover "' + titulo + '" da biblioteca?')) return;
  load(true);
  const r = await api('removerBiblioteca', { id });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Música removida!','ok');
  await loadBiblioteca();
}


async function loadTokens(){
  load(true); const r=await api('getTokens'); load(false);
  const list=r.ok?r.data:[];
  const el=document.getElementById('admTokList');
  if(!list.length){el.innerHTML=empty('🔑','Nenhum token');return;}
  list.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  el.innerHTML=list.map(t=>`
    <div class="tok-item">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div><div style="font-weight:600;font-size:14px">${t.Nome||'—'} <span class="rtag">${t.Nivel||''}</span></div><div style="font-size:12px;color:var(--text2);margin-top:2px">${t.Eklesia||''}</div></div>
        <span class="tok-code">${t.Token||''}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <a class="btn-wa" href="${wa('','Seu token Bandas IC: *'+(t.Token||'')+'*%0AAcesse: https://30semanas.github.io/bandasIC')}" target="_blank">💬 Enviar</a>
        <button class="btn-ghost sm" onclick="navigator.clipboard.writeText('${t.Token||''}').then(()=>toast('Copiado!','ok'))">📋 Copiar</button>
      </div>
    </div>`).join('');
}

async function modalGerarToken(){
  load(true);
  const [rM,rT]=await Promise.all([api('getMusicos'),api('getTokens')]);
  load(false);
  const mus=(rM.ok?rM.data:[]).sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
  const toks=rT.ok?rT.data:[];
  const comTok=new Set(toks.map(t=>t.MusicoId).filter(Boolean));
  const semTok=mus.filter(m=>!comTok.has(m.Id));
  openM('Gerar Token de Acesso',`
    <div class="fg"><label>Músico *</label>
      <select id="tMus" onchange="autoNivel(this)">
        <option value="">— Selecione —</option>
        ${semTok.map(m=>`<option value="${m.Id}" data-nome="${m.Nome||''}" data-ekl="${m.Eklesia||''}" data-lider="${m.IsLider||'nao'}">${m.Nome||'—'} — ${m.Eklesia||''}</option>`).join('')}
        <option value="__ext__" data-nome="" data-ekl="" data-lider="nao">+ Novo (externo)</option>
      </select>
    </div>
    <div id="extFields" style="display:none">
      <div class="fg"><label>Nome</label><input type="text" id="tNomeExt"/></div>
      <div class="fg"><label>Eklesia</label><input type="text" id="tEklExt"/></div>
    </div>
    <div class="fg"><label>Nível *</label>
      <select id="tNiv">
        <option value="musico">🎵 Músico</option>
        <option value="liderbanda">🎸 Líder de Banda</option>
        <option value="liderequipe">👥 Líder de Equipe</option>
        <option value="master">⚙️ Master</option>
      </select>
    </div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarTok()">Gerar token</button></div>`);
}

function autoNivel(sel){
  const opt=sel.options[sel.selectedIndex];
  const isExt=sel.value==='__ext__';
  document.getElementById('extFields').style.display=isExt?'':'none';
  if(opt.dataset.lider==='sim') document.getElementById('tNiv').value='liderbanda';
}

async function salvarTok(){
  const sel=document.getElementById('tMus');
  const isExt=sel.value==='__ext__';
  const opt=sel.options[sel.selectedIndex];
  const mid=isExt?'':sel.value;
  const nome=isExt?document.getElementById('tNomeExt').value.trim():(opt.dataset.nome||'');
  const ekl=isExt?document.getElementById('tEklExt').value.trim():(opt.dataset.ekl||'');
  const nivel=document.getElementById('tNiv').value;
  if(!nome){toast('Selecione ou informe o nome','err');return;}
  load(true);
  const r=await api('gerarToken',{nome,eklesia:ekl,nivel,musicoId:mid});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Token: '+r.token+' ✅','ok'); closeM(); await loadTokens();
}

// ===== MODAL =====
function openM(title, body){ document.getElementById('mTitle').textContent=title; document.getElementById('mBody').innerHTML=body; document.getElementById('mOverlay').classList.add('open'); }
function closeMov(e){ if(e.target===document.getElementById('mOverlay')) closeM(); }
function closeM(){ document.getElementById('mOverlay').classList.remove('open'); }

// ===== DETAIL =====
function openD(){ document.getElementById('detail').classList.add('open'); }
function closeD(){ document.getElementById('detail').classList.remove('open'); }

// Recarrega aceites das bandas do líder e re-renderiza
async function recarregarAceitesBanda() {
  const rEsc = await api('getEscalas');
  const todasEscalas = rEsc.ok ? rEsc.data : [];
  const escalasMinhasBandas = todasEscalas.filter(e => _lBandas.some(b => b.Id === e.BandaId));
  const aceiteData = {};
  const escalasPorBanda = {};
  for (const esc of escalasMinhasBandas) {
    const rEsc2 = await api('getEscalaById', { id: esc.Id });
    if (rEsc2.ok) {
      if (!aceiteData[esc.BandaId]) aceiteData[esc.BandaId] = {};
      if (!escalasPorBanda[esc.BandaId]) escalasPorBanda[esc.BandaId] = [];
      escalasPorBanda[esc.BandaId].push(esc);
      (rEsc2.aceites||[]).forEach(a => {
        aceiteData[esc.BandaId][a.MusicoId] = {
          status: (a.Status||'pendente').toLowerCase(),
          justificativa: a.Justificativa||'',
        };
      });
    }
  }
  window._lBandaAceites    = aceiteData;
  window._lEscalasPorBanda = escalasPorBanda;
  renderLBandas();
}

// ===== SYNC =====
async function sincronizar() {
  const s = getSess();
  if (!s) return;
  toast('Sincronizando...', 'info');
  if (s.nivel === 'master') {
    const pg = document.querySelector('.ni.active')?.dataset?.p || 'dashboard';
    const loaders = {inscricoes:loadInsc,musicos:loadMusicos,bandas:loadBandas,celebracoes:loadCel,escalas:loadEsc,repertorios:loadRepertoriosAdmin,biblioteca:loadBiblioteca,tokens:loadTokens,dashboard:loadDash};
    if (loaders[pg]) await loaders[pg]();
  } else if (s.nivel === 'liderequipe') {
    const rME2 = await api('getMinhasEscalas');
    _vEscalas = rME2.ok ? rME2.data : [];
    await Promise.all([loadLiderEquipePanel(), loadRepertoriosAdmin()]);
    // Re-render escalas if visible
    const escPage = document.getElementById('ap-escalas');
    if (escPage && escPage.classList.contains('active')) renderVEscInEl('admEscList');
    toast('Sincronizado! ✅', 'ok');
    return;
  } else if (s.nivel === 'liderbanda') {
    const [rB,rE,rRep,rME,rCels] = await Promise.all([api('getMinhasBandas'),api('getEscalas'),api('getRepertorios',{}),api('getMinhasEscalas'),api('getCelebracoes')]);
    _lBandas = rB.ok ? rB.data : [];
    _lMusicas = [];
    _vEscalas = rME.ok ? rME.data : [];
    // Filtrar repertórios das celebrações das minhas bandas
    const _syncCels = rCels.ok ? rCels.data : [];
    const _syncBIds = new Set(_lBandas.map(b => b.Id));
    const _syncRepIds = new Set();
    _syncCels.forEach(cel => {
      if ((cel.BandasIds||'').split(',').some(bid => _syncBIds.has(bid)) && cel.RepertorioId) _syncRepIds.add(cel.RepertorioId);
    });
    const _syncReps = (rRep.ok ? rRep.data : []).filter(r => _syncRepIds.has(r.Id) || (r.CriadoPor && r.CriadoPor === s.mid));
    // Recarregar aceites
    _lTodosMusicos = (await api('getMusicos')).data || [];
    const _syncEscB = (rE.ok?rE.data:[]).filter(e=>_syncBIds.has(e.BandaId));
    const _syncAceites = {};
    for (const esc of _syncEscB) {
      const rEsc = await api('getEscalaById',{id:esc.Id});
      if (rEsc.ok) {
        if (!_syncAceites[esc.BandaId]) _syncAceites[esc.BandaId]={};
        (rEsc.aceites||[]).forEach(a=>{ _syncAceites[esc.BandaId][a.MusicoId]={status:(a.Status||'pendente').toLowerCase(),justificativa:a.Justificativa||''}; });
      }
    }
    window._lBandaAceites = _syncAceites;
    renderLBandas();
    renderLEsc(rE.ok ? rE.data : []);
    renderLRep(_syncReps);
    renderVEscInEl('lMinhasEscList');
  } else if (s.nivel === 'musico') {
    const rEsc = await api('getMinhasEscalas');
    _vEscalas = rEsc.ok ? rEsc.data : [];
    renderVEsc();
    const rBandas = await api('getBandas');
    const minhasBandas = (rBandas.ok ? rBandas.data : []).filter(b => {
      return (b.MembrosIds||'').split(',').map(x=>x.trim()).includes(s.mid);
    });
    if (minhasBandas.length) {
      for (const banda of minhasBandas) {
        const rCel = await api('getCelebracoesDaBanda',{bandaId:banda.Id});
        // refresh banda info
      }
    }
  }
  toast('Sincronizado! ✅', 'ok');
}


// ===== MÁSCARA TELEFONE =====
function maskPhone(value) {
  // Remove tudo que não é dígito
  const d = String(value).replace(/\D/g, '').substring(0, 11);
  if (d.length <= 2)  return d.length ? '(' + d : '';
  if (d.length <= 7)  return '(' + d.substring(0,2) + ') ' + d.substring(2);
  if (d.length <= 10) return '(' + d.substring(0,2) + ') ' + d.substring(2,6) + '-' + d.substring(6);
  return '(' + d.substring(0,2) + ') ' + d.substring(2,7) + '-' + d.substring(7,11);
}

function applyPhoneMask(el) {
  el.value = maskPhone(el.value);
}

function phoneToRaw(value) {
  return String(value).replace(/\D/g, '');
}

function phoneToDisplay(value) {
  // Recebe número puro (12997047380) ou já formatado
  return maskPhone(String(value).replace(/\D/g, ''));
}

// ===== UTILS =====
function load(v){ document.getElementById('loading').classList.toggle('on',v); }
function toast(msg,type='info'){ const t=document.getElementById('toast'); t.textContent=msg; t.className='toast show '+type; setTimeout(()=>t.classList.remove('show'),3500); }
function empty(ico,msg){ return `<div class="empty"><div class="empty-ico">${ico}</div><p>${msg}</p></div>`; }

function pd(str){
  if(!str) return {day:'—',mon:'—',year:'—'};
  const d=new Date(str.includes('T')?str:str+'T12:00:00');
  return {day:String(d.getDate()).padStart(2,'0'),mon:d.toLocaleString('pt-BR',{month:'short'}).replace('.',''),year:d.getFullYear()};
}

function fd(str){
  if(!str) return '—';
  const {day,mon,year}=pd(str);
  return day+'/'+mon+'/'+year;
}

function badge(st){
  const m={pendente:['b-pend','pendente'],agendada:['b-agend','agendada'],aprovado:['b-aprov','aprovado'],reprovado:['b-reprov','reprovado'],aceita:['b-aceita','aceita'],recusada:['b-recusada','recusada'],aberta:['b-pend','aberta'],resolvida:['b-aprov','resolvida'],ativo:['b-aprov','ativo']};
  const [cls,lbl]=m[st]||['b-pend',st||'—'];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function wa(num, msg){
  const n=(String(num||'')).replace(/\D/g,'');
  const full=n.startsWith('55')?n:'55'+n;
  return `https://wa.me/${full||''}?text=${msg}`;
}

function toB64(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); }); }

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  document.addEventListener('click',e=>{ if(_sideOpen&&!e.target.closest('#admSide')&&!e.target.closest('.burger')) toggleSide(); });
  const s=getSess();
  if(s){
    if(s.nivel==='master')          initAdmin(s);
    else if(s.nivel==='liderequipe')initLiderEquipe(s);
    else if(s.nivel==='liderbanda') initLider(s);
    else if(s.nivel==='musico')     initVol(s);
  }
});
