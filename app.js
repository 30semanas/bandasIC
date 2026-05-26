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
  const wa   = document.getElementById('iWa').value.trim();
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
    let html = minhasBandas.map(b=>`
      <div class="card" style="margin-bottom:12px">
        <div class="ch"><div style="font-size:28px">${b.Emoji||'🎸'}</div>
          <div><div class="cn">${b.Nome}</div><div class="cs">Líder: ${b.LiderNome||'—'}</div></div>
        </div>
      </div>`).join('');

    // Buscar celebrações e repertórios da banda
    for (const banda of minhasBandas) {
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
            ${cel.musicas && cel.musicas.length ? `
              <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
                <div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">📋 ${cel.repertorioNome||'Repertório'}</div>
                ${cel.musicas.map((m,i)=>`
                  <div class="li" style="margin-bottom:6px" onclick="detMusVoluntario('${m.Id||''}','${(m.Nome||'').replace(/'/g,'')}','${m.Tom||''}','${m.Bpm||''}','${(m.Youtube||'').replace(/'/g,'')}')">
                    <div style="width:24px;height:24px;background:var(--bg4);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text3);flex-shrink:0">${i+1}</div>
                    <div class="li-info"><div class="li-name">${m.Nome||'—'}</div><div class="li-sub">${m.Artista||''} • ${m.Versao||''}</div></div>
                    <div style="display:flex;gap:6px;align-items:center">
                      <span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--accent2);background:var(--bg4);padding:2px 8px;border-radius:5px">${m.Tom||''}</span>
                      <span style="font-size:11px;color:var(--text3)">${m.Bpm||''}bpm</span>
                    </div>
                  </div>`).join('')}
              </div>` : '<div style="font-size:12px;color:var(--text3);margin-top:8px">Sem repertório definido</div>'}
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
  const r = await api('getEscalaById',{id});
  load(false);
  if(!r.ok){toast('Erro','err');return;}
  const e=r.data, d=pd(e.Data), s=getSess();
  const meu=(r.aceites||[]).find(a=>a.MusicoId===s.mid);
  const st=meu?.Status||'pendente';
  document.getElementById('dTitle').textContent=e.Titulo||'Escala';
  document.getElementById('dBody').innerHTML=`
    <div class="igrid">
      <div class="ii"><label>Data</label><span>${d.day}/${d.mon}/${d.year}</span></div>
      <div class="ii"><label>Horário</label><span>${e.Horario||'—'}</span></div>
      <div class="ii"><label>Local</label><span>${e.Local||'—'}</span></div>
      <div class="ii"><label>Banda</label><span>${e.BandaNome||'—'}</span></div>
    </div>
    <div class="dsec"><h3>Minha resposta</h3>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Atual: ${badge(st)}</p>
      <div class="arow">
        <button class="btn-green" onclick="respEsc('${e.Id}','aceita')">✅ Aceitar</button>
        <button class="btn-red" onclick="respEsc('${e.Id}','recusada')">❌ Recusar</button>
      </div>
    </div>`;
  openD();
}

async function respEsc(escId, st){
  load(true);
  const r=await api('responderEscala',{escalaId:escId,status:st});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast(st==='aceita'?'Escala aceita! ✅':'Escala recusada','info');
  closeD();
  const rEsc=await api('getMinhasEscalas');
  _vEscalas=rEsc.ok?rEsc.data:[];
  renderVEsc();
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
let _lBandas=[], _lMusicas=[];

async function initLider(sess){
  document.getElementById('lNome').textContent = sess.nome;
  document.getElementById('lEkl').textContent  = sess.eklesia;
  show('sLid');
  load(true);
  const [rB, rE, rM, rME] = await Promise.all([
    api('getMinhasBandas'),
    api('getEscalas'),
    api('getMusicas'),
    api('getMinhasEscalas'), // escalas pessoais do líder como voluntário
  ]);
  load(false);
  _lBandas  = rB.ok  ? rB.data  : [];
  _lMusicas = rM.ok  ? rM.data  : [];
  _vEscalas = rME.ok ? rME.data : []; // reutiliza variável do voluntário

  renderLBandas();
  renderLEsc(rE.ok ? rE.data : []);
  renderLMus();

  // Renderizar escalas pessoais do líder na tab "Minhas Escalas"
  const lMEEl = document.getElementById('lMinhasEsc');
  if (lMEEl) {
    _vEscFilter = 'todas';
    // Renderizar igual ao voluntário
    renderVEscInEl('lMinhasEscList');
  }

  const rRep  = await api('getRepertorios');
  renderLRep(rRep.ok ? rRep.data : []);
  const rSubs = await api('getSubs');
  renderLSubs(rSubs.ok ? rSubs.data : []);
}

function ltab(id,el){
  document.querySelectorAll('#sLid .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#sLid .tc').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(id).classList.add('active');
  // Renderizar escalas pessoais quando tab for selecionada
  if (id === 'lMinhasEsc') renderVEscInEl('lMinhasEscList');
}

function renderLBandas(){
  const el=document.getElementById('lBandasList');
  if(!_lBandas.length){el.innerHTML=empty('🎸','Nenhuma banda');return;}
  el.innerHTML=_lBandas.map(b=>`<div class="card click" onclick="detBandaLid('${b.Id}')">
    <div class="ch"><div style="font-size:28px">${b.Emoji||'🎸'}</div><div><div class="cn">${b.Nome}</div><div class="cs">Líder: ${b.LiderNome||'—'}</div></div></div>
    <div class="cf"><span style="font-size:12px;color:var(--text3)">Toque para gerenciar</span><span style="color:var(--text3)">→</span></div>
  </div>`).join('');
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
      ${ac.length?`<div style="display:flex;flex-direction:column;gap:8px">${ac.map(a=>`<div class="li"><div class="li-info"><div class="li-name">${a.MusicoId}</div></div>${badge(a.Status||'pendente')}</div>`).join('')}</div>`:'<p style="font-size:13px;color:var(--text3)">Nenhum músico escalado</p>'}
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
  el.innerHTML=list.map(r=>`<div class="li"><div class="li-info"><div class="li-name">📋 ${r.Nome||'—'}</div><div class="li-sub">${(r.MusicasIds||'').split(',').filter(Boolean).length} música(s)</div></div></div>`).join('');
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

async function initAdmin(sess){
  document.getElementById('admNome').textContent=sess.nome;
  document.getElementById('admAv').textContent=sess.nome[0]||'A';
  document.getElementById('admTopAv').textContent=sess.nome[0]||'A';
  document.getElementById('admGreet').textContent='Bem-vindo, '+sess.nome.split(' ')[0]+'!';
  show('sAdm');
  await loadDash();
}

function toggleSide(){ _sideOpen=!_sideOpen; document.getElementById('admSide').classList.toggle('open',_sideOpen); }

const apgTitles={dashboard:'Dashboard',inscricoes:'Inscrições',musicos:'Músicos',bandas:'Bandas',celebracoes:'Celebrações',escalas:'Escalas',repertorios:'Repertórios',tokens:'Tokens'};

function apg(name){
  document.querySelectorAll('.ap').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('ap-'+name).classList.add('active');
  const ni=document.querySelector(`.ni[data-p="${name}"]`);
  if(ni) ni.classList.add('active');
  document.getElementById('admTopTit').textContent=apgTitles[name]||name;
  if(_sideOpen) toggleSide();
  const loaders={inscricoes:loadInsc,musicos:loadMusicos,bandas:loadBandas,celebracoes:loadCel,escalas:loadEsc,repertorios:loadRepertoriosAdmin,tokens:loadTokens};
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
  const waMsg=encodeURIComponent('Olá, '+nome+'! Sua audição para '+instrs+' foi agendada:\n\n📅 Data: '+fd(dataA)+'\n⏰ Horário: '+hor+'\n📍 Local: '+loc+'\n\nNos vemos lá! 🎵');
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
        <button class="btn-wa" onclick="notifCand('${id}','${whats}','${waMsg}')">💬 Notificar</button>
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
  const r=await api('aprovarMusico',{id,tipo,nome:i.Nome,eklesia:i.Eklesia,whatsapp:String(i.WhatsApp),instrumentos:i.Instrumentos});
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast(tipo==='aprovado'?i.Nome+' aprovado(a)! Gere o token em Tokens.':i.Nome+' reprovado(a)','info');
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
  el.innerHTML=_aMusicos.map(m=>`
    <div class="card click" onclick="detMusico('${m.Id}')">
      <div class="ch">
        <div class="av">${(m.Nome||'?')[0]}</div>
        <div style="flex:1"><div class="cn">${m.Nome||'—'} ${m.IsLider==='sim'?'<span class="rtag">Líder</span>':''}</div><div class="cs">${m.Eklesia||'—'} • 📱 ${m.WhatsApp||'—'}</div></div>
        <span class="badge b-aprov">ativo</span>
      </div>
      <div class="itags">${(m.Instrumentos||'').split(',').filter(Boolean).map(x=>`<span class="itag">${x.trim()}</span>`).join('')}</div>
      <div class="cf"><span style="font-size:12px;color:var(--text3)">${m.Banda||'Sem banda'}</span><a class="btn-wa" href="${wa(String(m.WhatsApp||''),'')}" target="_blank" onclick="event.stopPropagation()">💬</a></div>
    </div>`).join('');
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
  const tokNiv  = tokEx ? (tokEx.Nivel  || '') : '';

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
        <div class="fg"><label>WhatsApp</label><input type="text" id="edWa" value="${whats}"/></div>
        <div class="fg"><label>Instrumentos</label><input type="text" id="edInstr" value="${instr}" placeholder="Voz, Guitarra..."/></div>
        <div class="fg">
          <label>Banda(s)</label>
          <input type="text" value="${bandaNomes}" disabled style="opacity:.6;cursor:not-allowed;background:var(--bg4)"/>
          <span style="font-size:11px;color:var(--text3);margin-top:3px">Gerenciado pelo administrador em Bandas</span>
        </div>
        <div class="fg"><label>Perfil de acesso</label>
          <select id="edNivel">
            <option value="voluntario" ${!lider?'selected':''}>🎵 Voluntário</option>
            <option value="lider" ${lider?'selected':''}>🎸 Líder de Banda</option>
          </select>
        </div>
        <button class="btn-primary sm" onclick="salvarEdMusico('${id}')">💾 Salvar alterações</button>
      </div>
    </div>

    <div class="dsec">
      <h3>Token de acesso</h3>
      ${tokEx ? `
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">TOKEN ATUAL</div>
          <div style="font-family:monospace;font-size:18px;font-weight:700;color:var(--accent2);letter-spacing:2px">${tokStr}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">Nível: ${tokNiv}</div>
        </div>
        <div class="arow">
          <a class="btn-wa" href="https://wa.me/55${waNum}?text=${msgToken}" target="_blank">💬 Notificar no WhatsApp</a>
          <button class="btn-ghost sm" onclick="navigator.clipboard.writeText('${tokStr}').then(()=>toast('Copiado!','ok'))">📋 Copiar</button>
        </div>
      ` : `
        <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Sem token. Defina o perfil acima e clique em gerar:</p>
        <button class="btn-primary sm" onclick="gerarTokMusico('${id}')">🔑 Gerar token</button>
      `}
    </div>`;
  openD();
}

async function salvarEdMusico(id) {
  const nivel   = document.getElementById('edNivel').value;
  const nome    = document.getElementById('edNome').value.trim();
  const ekl     = document.getElementById('edEkl').value.trim();
  const whats   = document.getElementById('edWa').value.trim();
  const instr   = document.getElementById('edInstr').value.trim();
  const isLider = nivel === 'lider' ? 'sim' : 'nao';

  load(true);

  // 1. Salvar dados do músico
  const r = await api('editarMusico', {
    id, nome, eklesia: ekl, whatsapp: whats, instrumentos: instr, isLider,
  });

  if (!r.ok) { load(false); toast(r.error || 'Erro ao salvar', 'err'); return; }

  // 2. Promover IsLider se necessário
  if (isLider === 'sim') await api('promoverLider', { musicoId: id });

  // 3. Verificar token atual
  const rT = await api('getTokens');
  const toks = rT.ok ? rT.data : [];
  const tokEx = toks.find(t => String(t.MusicoId) === String(id));

  if (!tokEx) {
    // Sem token: gerar novo com o nível escolhido
    const rG = await api('gerarToken', { nome, eklesia: ekl, nivel, musicoId: id });
    load(false);
    if (rG.ok) toast('Dados salvos! Token gerado: ' + rG.token + ' ✅', 'ok');
    else toast('Dados salvos! Erro ao gerar token: ' + (rG.error||''), 'ok');
  } else if ((tokEx.Nivel || '') !== nivel) {
    // Token existe com nível diferente: atualizar nível do token existente
    const rN = await api('atualizarNivelToken', { musicoId: id, nivel, nome });
    load(false);
    const novoTok = tokEx.Token || '';
    if (rN.ok) {
      toast('Perfil atualizado para ' + (nivel==='lider'?'🎸 Líder':'🎵 Voluntário') + '! Token: ' + novoTok + ' ✅', 'ok');
    } else {
      toast('Dados salvos! ' + (rN.error||''), 'info');
    }
  } else {
    load(false);
    toast('Dados salvos! ✅', 'ok');
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
  load(true);
  const [rL, rM] = await Promise.all([api('getLideres'), api('getMusicos')]);
  load(false);
  const lids = rL.ok ? rL.data : [];
  const mus  = rM.ok ? rM.data : [];
  const memIds = (b.MembrosIds||'').split(',').filter(Boolean);

  openM('Editar Banda', `
    <div class="fg"><label>Nome *</label><input type="text" id="ebNome" value="${(b.Nome||'').replace(/"/g,'&quot;')}"/></div>
    <div class="fg"><label>Líder *</label>
      <select id="ebLidId">
        ${lids.map(m=>`<option value="${m.Id}" data-nome="${m.Nome||''}" ${m.Id===b.LiderMusicoId?'selected':''}>${m.Nome||'—'} — ${m.Eklesia||''}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Emoji</label><input type="text" id="ebEmoji" value="${b.Emoji||'🎸'}" maxlength="2"/></div>
    <div class="dsec" style="margin-top:8px">
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
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEdicaoBanda('${id}')">💾 Salvar</button>
    </div>`);
  window._bandaMusicos = mus;
}

function addLinhaIntegranteEd() {
  const mus = window._bandaMusicos || [];
  const instrList = [...new Set(mus.flatMap(m=>(m.Instrumentos||'').split(',').map(i=>i.trim()).filter(Boolean)))].sort();
  const container = document.getElementById('ebMembros');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center';
  div.innerHTML = `
    <select class="bi-instr" onchange="filtrarMusBandaEd(this)" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font);font-size:13px">
      <option value="">Instrumento...</option>
      ${instrList.map(i=>`<option value="${i}">${i}</option>`).join('')}
    </select>
    <select class="bi-musico" style="flex:1;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:var(--font);font-size:13px">
      <option value="">— Selecione instrumento —</option>
    </select>
    <button onclick="this.parentElement.remove()" style="background:rgba(248,113,113,.2);border:1px solid var(--red);color:var(--red);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px">✕</button>`;
  container.appendChild(div);
}

function filtrarMusBandaEd(sel) {
  const instr = sel.value;
  const mus = (window._bandaMusicos||[]).filter(m=>(m.Instrumentos||'').split(',').map(i=>i.trim()).includes(instr));
  const row = sel.parentElement;
  const musSel = row.querySelector('.bi-musico');
  musSel.innerHTML = `<option value="">— Selecione —</option>` + mus.map(m=>`<option value="${m.Id}">${m.Nome||'—'}</option>`).join('');
}

async function salvarEdicaoBanda(id) {
  const sel = document.getElementById('ebLidId');
  const nome = document.getElementById('ebNome').value.trim();
  const lidId = sel.value;
  const opt = sel.options[sel.selectedIndex];
  const lidNome = opt ? (opt.dataset.nome || opt.text.split('—')[0].trim()) : '';
  if (!nome) { toast('Informe o nome','err'); return; }
  if (!lidId) { toast('Selecione um líder','err'); return; }

  // Coletar membros:
  // 1) Membros existentes não removidos (cada linha tem span com data-mid ou hidden input)
  const existentes = [...document.querySelectorAll('#ebMembros [data-mid]')]
    .map(el => el.dataset.mid).filter(Boolean);

  // 2) Novos membros adicionados via select
  const novos = [...document.querySelectorAll('#ebMembros .bi-musico')]
    .map(s => s.value).filter(Boolean);

  // Juntar tudo sem duplicatas, incluindo o líder
  const membrosIds = [...new Set([lidId, ...existentes, ...novos].filter(Boolean))];

  console.log('Salvando banda:', nome, 'Membros:', membrosIds);

  load(true);
  const r = await api('editarBanda', {
    id,
    nome,
    liderNome: lidNome,
    liderMusicoId: lidId,
    emoji: document.getElementById('ebEmoji').value || '🎸',
    membrosIds,
  });
  load(false);
  if (!r.ok) { toast(r.error||'Erro ao salvar','err'); return; }
  toast('Banda atualizada com ' + membrosIds.length + ' integrante(s)! ✅','ok');
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
  load(true); const r=await api('getCelebracoes'); load(false);
  const list=r.ok?r.data:[];
  const el=document.getElementById('admCelList');
  if(!list.length){el.innerHTML=empty('✨','Nenhuma celebração');return;}
  list.sort((a,b)=>new Date(a.Data||'9999')-new Date(b.Data||'9999'));
  el.innerHTML=list.map(c=>{
    const d=pd(c.Data);
    return `
    <div class="card">
      <div class="ch">
        <div class="db"><div class="db-d">${d.day}</div><div class="db-m">${d.mon}</div></div>
        <div style="flex:1"><div class="cn">${c.Nome||'—'}</div><div class="cs">⏰ ${c.Horario||''} • 📍 ${c.Local||''}</div></div>
        <button class="btn-ghost sm" onclick="modalEditarCel('${c.Id}')">✏️</button>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
        <span>🎸 ${c.BandasIds?'Banda vinculada':'Sem banda'}</span>
        <span>📋 Repertório: ${c.RepertorioTipo==='lider'?'Líder define':'Admin define'}</span>
      </div>
      ${c.Obs?`<p style="font-size:12px;color:var(--text3);margin-top:6px">${c.Obs}</p>`:''}
    </div>`; }).join('');
}

async function modalEditarCel(id) {
  load(true);
  const [rCel, rBandas, rRep] = await Promise.all([api('getCelebracoes'), api('getBandas'), api('getRepertorios',{})]);
  load(false);
  const list = rCel.ok ? rCel.data : [];
  const c = list.find(x => x.Id === id);
  if (!c) { toast('Não encontrado','err'); return; }
  const bandas = rBandas.ok ? rBandas.data : [];
  const reps   = rRep.ok   ? rRep.data   : [];
  const celBandas = (c.BandasIds||'').split(',').filter(Boolean);

  // Formatar data e horário corretamente para inputs
  const celData = (c.Data||'').includes('T') ? c.Data.split('T')[0] : (c.Data||'');
  const celHora = (c.Horario||'').length > 5 ? c.Horario.substring(0,5) : (c.Horario||'');

  openM('Editar Celebração', `
    <div class="fg"><label>Nome *</label><input type="text" id="ecNome" value="${(c.Nome||'').replace(/"/g,'&quot;')}"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Data *</label><input type="date" id="ecDt" value="${celData}"/></div>
      <div class="fg"><label>Horário *</label><input type="time" id="ecHr" value="${celHora}"/></div>
    </div>
    <div class="fg"><label>Local *</label><input type="text" id="ecLoc" value="${(c.Local||'').replace(/"/g,'&quot;')}"/></div>
    <div class="fg"><label>Observações</label><textarea id="ecObs" rows="2">${c.Obs||''}</textarea></div>
    <div class="fg"><label>Banda vinculada</label>
      <select id="ecBanda">
        <option value="">— Sem banda —</option>
        ${bandas.map(b=>`<option value="${b.Id}" ${celBandas.includes(b.Id)?'selected':''}>${b.Nome||'—'}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Repertório</label>
      <select id="ecRep">
        <option value="">— Sem repertório —</option>
        ${reps.map(r=>`<option value="${r.Id}" ${c.RepertorioId===r.Id?'selected':''}>${r.Nome||'—'}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label>Quem define o repertório</label>
      <select id="ecRepT">
        <option value="admin" ${c.RepertorioTipo!=='lider'?'selected':''}>⚙️ Administrador define</option>
        <option value="lider" ${c.RepertorioTipo==='lider'?'selected':''}>🎸 Líder de banda define</option>
      </select>
    </div>
    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEdicaoCel('${id}')">💾 Salvar</button>
    </div>`);
}

async function salvarEdicaoCel(id) {
  const nome = document.getElementById('ecNome').value.trim();
  const dt   = document.getElementById('ecDt').value;
  const hr   = document.getElementById('ecHr').value;
  const loc  = document.getElementById('ecLoc').value.trim();
  if (!nome||!dt||!hr||!loc) { toast('Preencha os campos obrigatórios','err'); return; }
  const bandaId = document.getElementById('ecBanda').value;
  const repId   = document.getElementById('ecRep').value;
  load(true);
  const r = await api('editarCelebracao', {
    id, nome, data:dt, horario:hr, local:loc,
    obs: document.getElementById('ecObs').value,
    bandasIds: bandaId ? [bandaId] : [],
    repertorioId: repId,
    repertorioTipo: document.getElementById('ecRepT').value,
  });
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Celebração atualizada! ✅','ok');
  closeM();
  await loadCel();
}

async function modalCriarCel(){
  load(true);
  const [rBandas, rRep] = await Promise.all([api('getBandas'), api('getRepertorios',{})]);
  load(false);
  const bandas = rBandas.ok ? rBandas.data : [];
  const reps   = rRep.ok   ? rRep.data   : [];

  openM('Nova Celebração',`
    <div class="fg"><label>Nome *</label><input type="text" id="cNome" placeholder="Ex: Culto Dominical"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="fg"><label>Data *</label><input type="date" id="cDt"/></div>
      <div class="fg"><label>Horário *</label><input type="time" id="cHr"/></div>
    </div>
    <div class="fg"><label>Local *</label><input type="text" id="cLoc"/></div>
    <div class="fg"><label>Observações</label><textarea id="cObs" rows="2"></textarea></div>
    <div class="fg"><label>Banda</label>
      <select id="cBanda">
        <option value="">— Sem banda —</option>
        ${bandas.map(b=>`<option value="${b.Id}">${b.Nome||'—'}</option>`).join('')}
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
        <option value="admin">⚙️ Administrador define</option>
        <option value="lider">🎸 Líder de banda define</option>
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
  if(!nome||!dt||!hr||!loc){toast('Preencha os campos obrigatórios','err');return;}
  const bandaId = document.getElementById('cBanda').value;
  const repId   = document.getElementById('cRep').value;
  load(true);
  const r=await api('criarCelebracao',{
    nome, data:dt, horario:hr, local:loc,
    obs: document.getElementById('cObs').value,
    bandasIds: bandaId ? [bandaId] : [],
    repertorioId: repId,
    repertorioTipo: document.getElementById('cRepT').value,
  });
  load(false);
  if(!r.ok){toast(r.error||'Erro','err');return;}
  toast('Celebração criada!','ok'); closeM(); await loadCel();
}

// ESCALAS ADMIN
async function loadEsc(){
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
  const [rRep, rMus] = await Promise.all([api('getRepertorios',{}), api('getMusicas')]);
  load(false);
  _aMusicas = rMus.ok ? rMus.data : [];

  // Render repertórios
  // Botão de adicionar música fica apenas na biblioteca, não no header da página
  const repEl = document.getElementById('admRepList');
  const reps = rRep.ok ? rRep.data : [];
  if (!reps.length) {
    repEl.innerHTML = `<p style="font-size:13px;color:var(--text3);margin-bottom:12px">Nenhum repertório criado ainda.</p>`;
  } else {
    reps.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||''));
    repEl.innerHTML = reps.map(r => {
      const musIds = (r.MusicasIds||'').split(',').filter(Boolean);
      const musNomes = musIds.map(mid => {
        const m = _aMusicas.find(x => x.Id === mid);
        return m ? m.Nome : null;
      }).filter(Boolean);
      return `
      <div class="card" style="margin-bottom:10px">
        <div class="ch">
          <div style="flex:1">
            <div class="cn">📋 ${r.Nome||'—'}</div>
            <div class="cs" style="margin-top:2px">${musIds.length} música(s)</div>
          </div>
          <button class="btn-ghost sm" onclick="modalEditarRepertorio('${r.Id}')">✏️</button>
        </div>
        ${musNomes.length ? `<div class="itags">${musNomes.map(n=>`<span class="itag">🎵 ${n}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
  }

  // Render músicas
  renderAMusicas(_aMusicas);
}

async function modalCriarRepertorioAdmin() {
  load(true);
  const rM = await api('getMusicas');
  load(false);
  const mus = rM.ok ? rM.data.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||'')) : [];

  openM('Novo Repertório', `
    <div class="fg"><label>Nome *</label><input type="text" id="rNome" placeholder="Ex: Louvor Junho"/></div>

    <div class="fg">
      <label>Músicas</label>
      <p style="font-size:11px;color:var(--text3);margin-bottom:8px">Selecione as músicas para este repertório</p>
      <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;border:1px solid var(--border);border-radius:10px;padding:10px">
        ${mus.length ? mus.map(m=>`
          <label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:8px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background='var(--bg3)'">
            <input type="checkbox" value="${m.Id}" style="width:16px;height:16px;flex-shrink:0"/>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${m.Nome||'—'}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px">${m.Artista||''} ${m.Tom?'• Tom: <strong style=color:var(--accent2)>'+m.Tom+'</strong>':''} ${m.Bpm?'• '+m.Bpm+' BPM':''}</div>
            </div>
          </label>`).join('') : '<p style="font-size:13px;color:var(--text3);text-align:center;padding:20px">Nenhuma música cadastrada ainda. Adicione músicas na biblioteca abaixo.</p>'}
      </div>
    </div>

    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarRepAdmin()">Criar repertório</button>
    </div>`);
}

async function salvarRepAdmin() {
  const nome = document.getElementById('rNome').value.trim();
  if (!nome) { toast('Informe o nome','err'); return; }
  const ids = [...document.querySelectorAll('#mBody input[type=checkbox]:checked')].map(i=>i.value);
  load(true);
  const r = await api('criarRepertorio',{nome, bandaId:'', musicasIds:ids});
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Repertório criado! ✅','ok'); closeM(); await loadRepertoriosAdmin();
}

async function modalEditarRepertorio(id) {
  load(true);
  const [rRep, rMus] = await Promise.all([api('getRepertorios',{}), api('getMusicas')]);
  load(false);
  const rep = rRep.ok ? rRep.data.find(x=>x.Id===id) : null;
  if (!rep) { toast('Não encontrado','err'); return; }
  const mus = rMus.ok ? rMus.data.sort((a,b)=>(a.Nome||'').localeCompare(b.Nome||'')) : [];
  const selIds = (rep.MusicasIds||'').split(',').filter(Boolean);

  openM('Editar Repertório', `
    <div class="fg"><label>Nome *</label><input type="text" id="erNome" value="${(rep.Nome||'').replace(/"/g,'&quot;')}"/></div>

    <div class="fg">
      <label>Músicas do repertório</label>
      <p style="font-size:11px;color:var(--text3);margin-bottom:8px">Selecione as músicas que fazem parte deste repertório</p>
      <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px 0;border:1px solid var(--border);border-radius:10px;padding:10px">
        ${mus.length ? mus.map(m=>`
          <label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:8px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--bg4)'" onmouseout="this.style.background='var(--bg3)'">
            <input type="checkbox" value="${m.Id}" ${selIds.includes(m.Id)?'checked':''} style="width:16px;height:16px;flex-shrink:0"/>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${m.Nome||'—'}</div>
              <div style="font-size:11px;color:var(--text2);margin-top:2px">${m.Artista||''} ${m.Tom?'• Tom: <strong style=color:var(--accent2)>'+m.Tom+'</strong>':''} ${m.Bpm?'• '+m.Bpm+' BPM':''}</div>
            </div>
          </label>`).join('') : '<p style="font-size:13px;color:var(--text3);text-align:center;padding:20px">Nenhuma música cadastrada. Adicione músicas na biblioteca abaixo.</p>'}
      </div>
    </div>

    <div class="mfoot">
      <button class="btn-ghost sm" onclick="closeM()">Cancelar</button>
      <button class="btn-primary sm" onclick="salvarEditarRepAdmin('${id}')">💾 Salvar</button>
    </div>`);
}

async function salvarEditarRepAdmin(id) {
  const nome = document.getElementById('erNome').value.trim();
  if (!nome) { toast('Informe o nome','err'); return; }
  const ids = [...document.querySelectorAll('#mBody input[type=checkbox]:checked')].map(i=>i.value);
  load(true);
  const r = await api('editarRepertorio',{id, nome, musicasIds:ids});
  load(false);
  if (!r.ok) { toast(r.error||'Erro','err'); return; }
  toast('Repertório atualizado! ✅','ok'); closeM(); await loadRepertoriosAdmin();
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
      <select id="tNiv"><option value="voluntario">🎵 Voluntário</option><option value="lider">🎸 Líder</option><option value="admin">⚙️ Admin</option></select>
    </div>
    <div class="mfoot"><button class="btn-ghost sm" onclick="closeM()">Cancelar</button><button class="btn-primary sm" onclick="salvarTok()">Gerar token</button></div>`);
}

function autoNivel(sel){
  const opt=sel.options[sel.selectedIndex];
  const isExt=sel.value==='__ext__';
  document.getElementById('extFields').style.display=isExt?'':'none';
  if(opt.dataset.lider==='sim') document.getElementById('tNiv').value='lider';
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
    if(s.nivel==='admin') initAdmin(s);
    else if(s.nivel==='lider') initLider(s);
    else if(s.nivel==='voluntario') initVol(s);
  }
});
