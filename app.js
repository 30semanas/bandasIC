// ============================================
//   BANDAS IC — Google Apps Script v3
//   Reescrita completa e definitiva
// ============================================

const CFG = {
  SS_ID:     '1gQOtWLbuCqvLfT7RRYKjpCftLqR6VfJFhKGzifoaHfg',
  DRIVE_ID:  '1RuHaDEdB7q_OkFDbTTlbi5GpZl5v_mY2',
  SESSION_H: 8,
};

// ==================== ENTRY ====================
function doGet(e) {
  const p = {};
  Object.entries(e.parameter || {}).forEach(([k,v]) => {
    try { p[k] = JSON.parse(v); } catch(_) { p[k] = v; }
  });
  const cb = p.callback;
  const result = dispatch(p.action, p);
  const json = JSON.stringify(result);
  if (cb) return ContentService.createTextOutput(cb+'('+json+')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch(_) {}
  return ContentService.createTextOutput(JSON.stringify(dispatch(p.action, p))).setMimeType(ContentService.MimeType.JSON);
}

// ==================== DISPATCH ====================
function dispatch(action, data) {
  try {
    const pub = ['login','inscricao','debugAll','limpar','fixColunas','fixTokens','importarMusicosAprovados','getBiblioteca','rawBiblioteca','fixBiblioteca','fixBibliotecaIds','getMusicas','getBandas','getMusicos','getRepertorios','getEscalas','getLideresEquipe','getLideres'];
    if (pub.includes(action)) return route(action, data, null);
    const sess = checkSession(data.sessionKey);
    if (!sess) return err('Sessão inválida');
    return route(action, data, sess);
  } catch(e) {
    return err(e.message);
  }
}

function route(action, data, sess) {
  switch(action) {
    // Públicas
    case 'login':        return login(data);
    case 'inscricao':    return salvarInscricao(data);
    case 'debugAll':     return debugAll();
    case 'limpar':       return limpar();
    case 'fixColunas':   return fixColunas();

    // Admin / Lider
    case 'getInscricoes':  return perm(sess,['master'], () => rows('Audicoes'));
    case 'getMusicos':     return getMusicosComNivel();  // público
    case 'getBandas':      return rows('Bandas');  // público
    case 'getEscalas':     return getEscalas(data, sess);  // público
    case 'getEscalaById':  return perm(sess,['master','liderequipe','liderbanda','musico'], () => getEscalaById(data));
    case 'getMusicas':     return rows('Musicas');  // público
    case 'getRepertorios': return getRepertoriosComNomes();  // público
    case 'getCelebracoes': return getCelebracoes(sess);  // filtra por nível
    case 'getTokens':      return perm(sess,['master'], () => getTokens());
    case 'getLideres':     return getLideres();  // público
    case 'getLideresEquipe': return getLideresEquipe();  // público
    case 'getDashboard':   return perm(sess,['master'], () => getDashboard());
    case 'getMinhasBandas':return perm(sess,['master','liderequipe','liderbanda'], () => getMinhasBandas(sess));
    case 'getMinhasEscalas':return perm(sess,['master','liderequipe','liderbanda','musico'], () => getMinhasEscalas(sess));
    case 'getMeuPerfil':   return perm(sess,['master','liderequipe','liderbanda','musico'], () => getMeuPerfil(sess));
    case 'getSubs':        return perm(sess,['master','liderequipe','liderbanda','musico'], () => rows('Subs'));
    case 'getLiderEquipePanel': return perm(sess,['master','liderequipe'], () => getLiderEquipePanel(sess));
    case 'debugLE':            return perm(sess,['master','liderequipe'], () => debugLiderEquipe(sess));
    case 'debugMinhasEscalas': return perm(sess,['master','liderequipe','liderbanda','musico'], () => debugMinhasEscalas(sess));
    case 'debugBandaAceites':  return perm(sess,['master','liderbanda'], () => debugBandaAceites(sess));
    case 'getAceitesDaBanda':   return perm(sess,['master','liderequipe','liderbanda'], () => getAceitesDaBanda(data));
    case 'getCelebracoesDaBanda': return perm(sess,['master','liderequipe','liderbanda','musico'], () => getCelebracoesDaBanda(data));

    case 'agendarAudicao': return perm(sess,['master'], () => agendarAudicao(data));
    case 'aprovarMusico':  return perm(sess,['master'], () => aprovarMusico(data));
    case 'notificarCandidato': return perm(sess,['master'], () => notificar(data));
    case 'promoverLider':  return perm(sess,['master'], () => promoverLider(data));
    case 'gerarToken':     return perm(sess,['master'], () => gerarToken(data));
    case 'criarBanda':     return perm(sess,['master'], () => criarBanda(data));
    case 'removerBanda':   return perm(sess,['master'], () => removerRow('Bandas', data.id));
    case 'editarMusico':      return perm(sess,['master'], () => editarMusico(data));
    case 'atualizarNivelToken': return perm(sess,['master'], () => atualizarNivelToken(data));
    case 'vincularToken':       return perm(sess,['master'], () => vincularToken(data));
    case 'editarBanda':         return perm(sess,['master'], () => editarBanda(data));
    case 'editarCelebracao':    return perm(sess,['master','liderequipe'], () => editarCelebracaoComRegra(data, sess));
    case 'removerCelebracao':   return perm(sess,['master'], () => removerRow('Celebracoes', data.id));
    case 'atribuirCelebracao':  return perm(sess,['master'], () => atribuirCelebracao(data));
    case 'editarRepertorio':         return perm(sess,['master','liderequipe','liderbanda'], () => editarRepertorioPerm(data, sess));
    case 'salvarOverridesRepertorio': return perm(sess,['master','liderequipe','liderbanda'], () => salvarOverridesRepertorioComPerm(data, sess));
    case 'removerRepertorio':   return perm(sess,['master','liderequipe','liderbanda'], () => removerRepertorioPerm(data, sess));
    case 'fixTokens':           return fixTokensOrfaos();
    case 'importarMusicosAprovados': return importarMusicosAprovados();
    case 'criarEscalaAutomatica':  return perm(sess,['master','liderequipe'], () => criarEscalaAutomatica(data));
    case 'criarEscalasDaBanda':    return perm(sess,['master','liderequipe'], () => criarEscalasDaBanda(data));
    case 'criarEscala':    return perm(sess,['master','liderequipe'], () => criarEscala(data));
    case 'criarRepertorio':return perm(sess,['master','liderequipe','liderbanda'], () => criarRepertorio({...data, musicoId: sess ? sess.musicoId : ''}));
    case 'adicionarMusica':    return perm(sess,['master','liderbanda'], () => adicionarMusica(data));
    case 'getBiblioteca':      return rows('Biblioteca');  // público
    case 'rawBiblioteca':      return rawSheet('Biblioteca');
    case 'fixBiblioteca':      return fixBiblioteca();
    case 'fixBibliotecaIds':   return fixBibliotecaIds();
    case 'adicionarBiblioteca':return perm(sess,['master'], () => adicionarBiblioteca(data));
    case 'removerBiblioteca':  return perm(sess,['master'], () => removerRow('Biblioteca', data.id));
    case 'criarCelebracao':return perm(sess,['master'], () => criarCelebracao(data));
    case 'criarSub':       return perm(sess,['master','liderequipe','liderbanda'], () => criarSub(data));
    case 'responderEscala':   return perm(sess,['master','liderequipe','liderbanda','musico'], () => responderEscala(data, sess));
    case 'removerMusicoEscala':return perm(sess,['master','liderequipe'], () => removerMusicoEscala(data));
    case 'uploadFotoInscricao': return uploadFoto(data);
    case 'logout':         return logout(data);

    default: return err('Ação desconhecida: ' + action);
  }
}

function perm(sess, levels, fn) {
  if (!sess) return err('Sessão inválida ou expirada. Faça login novamente.');
  // Normalizar nível para compatibilidade com tokens antigos
  const nivelMap = {
    'admin':'master','master':'master',
    'lider':'liderbanda','liderbanda':'liderbanda',
    'liderequipe':'liderequipe',
    'voluntario':'musico','musico':'musico',
  };
  const nivel = nivelMap[(sess.nivel||'').toLowerCase()] || sess.nivel;
  if (!levels.includes(nivel)) return err('Sem permissão (nível: '+nivel+')');
  return fn();
}
function err(msg) { return { ok: false, error: msg }; }
function ok(data) { return { ok: true, data }; }

// ==================== SHEETS HELPERS ====================
function ss() { return SpreadsheetApp.openById(CFG.SS_ID); }
function sh(name) { return ss().getSheetByName(name); }

// Lê aba e retorna array de objetos com chaves normalizadas
function rows(name) {
  const sheet = sh(name);
  if (!sheet) return ok([]);
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return ok([]);
  const headers = vals[0].map(h => norm(String(h)));
  const result = vals.slice(1)
    .filter(r => r.some(c => c !== '' && c !== null && c !== undefined))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = cleanVal(r[i]);
      });
      return obj;
    });
  return ok(result);
}

// Normaliza nome de coluna para PascalCase padrão
function norm(h) {
  const map = {
    'id':'Id','nome':'Nome','eklesia':'Eklesia','whatsapp':'WhatsApp',
    'instrumentos':'Instrumentos','obs':'Observacoes','observacoes':'Observacoes',
    'status':'Status','fotourl':'FotoUrl','datainscricao':'DataInscricao',
    'dataaudicao':'DataAudicao','horario':'Horario','local':'Local',
    'notificado':'Notificado','datanotificacao':'DataNotificacao',
    'banda':'Banda','ativo':'Ativo','islider':'IsLider','audicaoid':'AudicaoId',
    'datacadastro':'DataCadastro','lidernome':'LiderNome',
    'lidermusicoid':'LiderMusicoId','emoji':'Emoji','cor':'Cor',
    'membrosids':'MembrosIds','datacriacao':'DataCriacao',
    'titulo':'Titulo','titulooriginal':'TituloOriginal','composicao':'Composicao','categoria':'Categoria','link':'Link','composicao':'Composicao','versao':'Versao','data':'Data','bandaid':'BandaId','bandanome':'BandaNome',
    'tipo':'Tipo','musicasids':'MusicasIds','repertorioid':'RepertorioId',
    'artista':'Artista','tom':'Tom','bpm':'Bpm','versao':'Versao',
    'youtube':'Youtube','letra':'Letra','cifra':'Cifra','partitura':'Partitura',
    'criadopor':'CriadoPor','bandasids':'BandasIds','repertoriotipo':'RepertorioTipo',
    'escalaid':'EscalaId','musicoid':'MusicoId','dataresposta':'DataResposta',
    'musicooutid':'MusicoOutId','musicoinid':'MusicoInId',
    'token':'Token','nivel':'Nivel','sessionkey':'SessionKey','sessionexp':'SessionExp',
  };
  // Normalizar: minúsculo, sem espaços, sem acentos
  const low = h.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n');
  return map[low] || h;
}

// Limpa valores problemáticos
function cleanVal(v) {
  if (v instanceof Date) {
    // Horário do Sheets (1899/1900 = valor de tempo)
    if (v.getFullYear() <= 1900) {
      return pad(v.getHours()) + ':' + pad(v.getMinutes());
    }
    return v.toISOString();
  }
  if (v === 'undefined' || v === 'null') return '';
  if (v === null || v === undefined) return '';
  return v;
}

function pad(n) { return String(n).padStart(2,'0'); }

function genId() { return Utilities.getUuid().replace(/-/g,'').substring(0,12).toUpperCase(); }

function addRow(name, obj) {
  const sheet = sh(name);
  if (!sheet) { Logger.log('Sheet not found: ' + name); return; }
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => {
    const hStr = String(h).trim();
    const normH = norm(hStr);
    const hLow = hStr.toLowerCase();
    // Try multiple key formats
    if (obj[normH]  !== undefined && obj[normH]  !== '') return obj[normH];
    if (obj[hStr]   !== undefined && obj[hStr]   !== '') return obj[hStr];
    if (obj[hLow]   !== undefined && obj[hLow]   !== '') return obj[hLow];
    // Try all obj keys normalized
    for (const [k, v] of Object.entries(obj)) {
      if (norm(k) === normH) return v;
      if (k.toLowerCase() === hLow) return v;
    }
    return '';
  });
  Logger.log('addRow ' + name + ': ' + JSON.stringify(row));
  sheet.appendRow(row);
}

function updRow(name, id, updates) {
  const sheet = sh(name);
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const idIdx = headers.indexOf('Id');
  if (idIdx === -1) return false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(id)) {
      Object.entries(updates).forEach(([k,v]) => {
        const ci = headers.indexOf(norm(k));
        if (ci !== -1) sheet.getRange(i+1, ci+1).setValue(v);
      });
      return true;
    }
  }
  return false;
}

function removerRow(name, id) {
  const sheet = sh(name);
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const idIdx = headers.indexOf('Id');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(id)) {
      sheet.deleteRow(i+1);
      return ok('Removido');
    }
  }
  return err('Não encontrado');
}

function findRow(name, key, val) {
  const res = rows(name);
  if (!res.ok) return null;
  return res.data.find(r => String(r[norm(key)]) === String(val)) || null;
}

// ==================== AUTH ====================
function login(data) {
  const token = String(data.token || '').trim();
  if (!token) return err('Token não informado');
  const sheet = sh('Tokens');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iToken = headers.indexOf('Token');
  const iNivel = headers.indexOf('Nivel');
  const iNome  = headers.indexOf('Nome');
  const iEkl   = headers.indexOf('Eklesia');
  const iMid   = headers.indexOf('MusicoId');
  const iSK    = headers.indexOf('SessionKey');
  const iSE    = headers.indexOf('SessionExp');

  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iToken]).trim() === token) {
      const sk = Utilities.getUuid();
      const exp = new Date();
      exp.setHours(exp.getHours() + CFG.SESSION_H);
      sheet.getRange(i+1, iSK+1).setValue(sk);
      sheet.getRange(i+1, iSE+1).setValue(exp.toISOString());
      // Mapear nomes antigos de nível para os novos
      const nivelRaw = String(vals[i][iNivel]).trim().toLowerCase();
      const nivelMap = {
        'admin': 'master',
        'master': 'master',
        'lider': 'liderbanda',
        'liderbanda': 'liderbanda',
        'liderequipe': 'liderequipe',
        'voluntario': 'musico',
        'musico': 'musico',
      };
      const nivel = nivelMap[nivelRaw] || nivelRaw;

      return {
        ok: true,
        sessionKey: sk,
        nivel: nivel,
        nome:  String(vals[i][iNome]),
        eklesia: String(vals[i][iEkl]),
        musicoId: String(vals[i][iMid] || ''),
      };
    }
  }
  return err('Token inválido');
}

function checkSession(sk) {
  if (!sk) return null;
  const sheet = sh('Tokens');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iSK  = headers.indexOf('SessionKey');
  const iSE  = headers.indexOf('SessionExp');
  const iNiv = headers.indexOf('Nivel');
  const iNom = headers.indexOf('Nome');
  const iEkl = headers.indexOf('Eklesia');
  const iMid = headers.indexOf('MusicoId');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iSK]) === String(sk)) {
      const exp = new Date(vals[i][iSE]);
      if (new Date() > exp) return null;
      return {
        sessionKey: sk,
        nivel: String(vals[i][iNiv]),
        nome:  String(vals[i][iNom]),
        eklesia: String(vals[i][iEkl]),
        musicoId: String(vals[i][iMid] || ''),
      };
    }
  }
  return null;
}

function logout(data) {
  const sheet = sh('Tokens');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iSK = headers.indexOf('SessionKey');
  const iSE = headers.indexOf('SessionExp');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iSK]) === String(data.sessionKey)) {
      sheet.getRange(i+1,iSK+1).setValue('');
      sheet.getRange(i+1,iSE+1).setValue('');
      return ok('ok');
    }
  }
  return ok('ok');
}

// ==================== INSCRIÇÃO ====================
function salvarInscricao(data) {
  const id = genId();
  const instrs = Array.isArray(data.instrumentos)
    ? data.instrumentos.join(',')
    : (typeof data.instrumentos === 'string' ? data.instrumentos : '');
  // Obs pode vir como data.obs ou data.observacoes
  const obs = data.obs || data.observacoes || data.Obs || data.Observacoes || '';
  const eklesia = data.eklesia || data.Eklesia || '';
  const whatsapp = String(data.whatsapp || data.WhatsApp || '');

  Logger.log('salvarInscricao: nome=' + data.nome + ' ekl=' + eklesia + ' wa=' + whatsapp + ' inst=' + instrs + ' obs=' + obs);

  addRow('Audicoes', {
    Id: id,
    Nome: data.nome || '',
    Eklesia: eklesia,
    WhatsApp: whatsapp,
    Instrumentos: instrs,
    Observacoes: obs,
    obs: obs,
    Status: 'pendente',
    FotoUrl: '',
    DataInscricao: new Date().toISOString(),
    DataAudicao: '', Horario: '', Local: '',
    Notificado: 'nao', DataNotificacao: '',
  });
  return { ok: true, id };
}

function uploadFoto(data) {
  try {
    const root = DriveApp.getFolderById(CFG.DRIVE_ID);
    const iter = root.getFoldersByName('Fotos dos Músicos');
    const folder = iter.hasNext() ? iter.next() : root.createFolder('Fotos dos Músicos');
    const blob = Utilities.newBlob(Utilities.base64Decode(data.fotoBase64),'image/jpeg', data.fotoNome||'foto.jpg');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/uc?id=' + file.getId();
    if (data.inscricaoId) updRow('Audicoes', data.inscricaoId, { FotoUrl: url });
    return { ok: true, url };
  } catch(e) { return err(e.message); }
}

function agendarAudicao(data) {
  updRow('Audicoes', data.id, {
    DataAudicao: data.dataAudicao||'',
    Horario: String(data.horario||'').substring(0,5),
    Local: data.local||'', Status: 'agendada',
  });
  return ok('ok');
}

function aprovarMusico(data) {
  updRow('Audicoes', data.id, { Status: data.tipo });
  addRow('Aprovacoes', {
    Id: genId(), AudicaoId: data.id, Nome: data.nome||'',
    Tipo: data.tipo, Obs: data.obs||'', DataAprovacao: new Date().toISOString(),
  });
  if (data.tipo === 'aprovado') {
    // Buscar dados completos da inscrição
    const insc = findRow('Audicoes','Id',data.id);
    const mid = genId();
    addRow('Musicos', {
      Id: mid,
      Nome: (insc&&insc.Nome)||data.nome||'',
      Eklesia: (insc&&insc.Eklesia)||data.eklesia||'',
      WhatsApp: (insc&&insc.WhatsApp)||data.whatsapp||'',
      Instrumentos: (insc&&insc.Instrumentos)||data.instrumentos||'',
      Banda: '', FotoUrl: (insc&&insc.FotoUrl)||'',
      Ativo: 'sim', IsLider: 'nao', AudicaoId: data.id||'',
      DataCadastro: new Date().toISOString(),
    });
    // Gerar token automaticamente como 'musico'
    const token =
      Math.random().toString(36).substring(2,6).toUpperCase() +
      Math.random().toString(36).substring(2,6).toUpperCase() +
      Math.random().toString(36).substring(2,4).toUpperCase();
    addRow('Tokens', {
      Id: genId(),
      Nome: (insc&&insc.Nome)||data.nome||'',
      Eklesia: (insc&&insc.Eklesia)||data.eklesia||'',
      Token: token, Nivel: 'musico', MusicoId: mid,
      SessionKey: '', SessionExp: '', DataCriacao: new Date().toISOString(),
    });
    return { ok: true, musicoId: mid, token };
  }
  return ok('ok');
}

function notificar(data) {
  updRow('Audicoes', data.id, { Notificado: 'sim', DataNotificacao: new Date().toISOString() });
  return ok('ok');
}

function promoverLider(data) {
  updRow('Musicos', data.musicoId, { IsLider: 'sim' });
  return ok('ok');
}

// ==================== TOKENS ====================
function getTokens() {
  const res = rows('Tokens');
  if (!res.ok) return res;
  // Nunca retornar SessionKey/SessionExp
  return ok(res.data.map(t => ({
    Id: t.Id, Nome: t.Nome, Eklesia: t.Eklesia,
    Token: t.Token, Nivel: t.Nivel, MusicoId: t.MusicoId,
    DataCriacao: t.DataCriacao,
  })));
}

function gerarToken(data) {
  // Verificar se já tem token
  const existing = rows('Tokens');
  if (existing.ok && data.musicoId) {
    const found = existing.data.find(t => String(t.MusicoId) === String(data.musicoId) && t.Token);
    if (found) return err('Este músico já possui um token. Token não pode ser alterado.');
  }
  // Token aleatório sem prefixo de nível
  const token =
    Math.random().toString(36).substring(2,6).toUpperCase() +
    Math.random().toString(36).substring(2,6).toUpperCase() +
    Math.random().toString(36).substring(2,4).toUpperCase();
  addRow('Tokens', {
    Nome: data.nome||'', Eklesia: data.eklesia||'',
    Token: token, Nivel: data.nivel||'voluntario',
    MusicoId: data.musicoId||'',
    SessionKey: '', SessionExp: '', DataCriacao: new Date().toISOString(),
  });
  return { ok: true, token };
}

function getLideresEquipe() {
  const rT = rows('Tokens');
  const rM = rows('Musicos');
  const toks = rT.ok ? rT.data : [];
  const mus  = rM.ok ? rM.data : [];

  // Normalizar níveis antigos
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};

  // Buscar tokens com nível liderequipe (após normalização)
  const lidToks = toks.filter(t => {
    const n = nivelMap[(t.Nivel||'').toLowerCase()] || t.Nivel;
    return n === 'liderequipe';
  });

  return ok(lidToks.map(t => {
    const m = mus.find(x => x.Id === t.MusicoId) || {};
    return {
      Id: t.MusicoId || t.Id,
      Nome: m.Nome || t.Nome || '',
      Eklesia: m.Eklesia || t.Eklesia || '',
      Token: t.Token,
    };
  }).filter(x => x.Nome));
}

function getLideres() {
  const res = rows('Musicos');
  if (!res.ok) return res;
  return ok(res.data.filter(m => m.IsLider === 'sim').sort((a,b) => (a.Nome||'').localeCompare(b.Nome||'')));
}

// ==================== ATRIBUIR CELEBRAÇÃO AO LÍDER DE EQUIPE ====================
function atribuirCelebracao(data) {
  updRow('Celebracoes', data.id, { LiderEquipeId: data.liderEquipeId || '' });
  return ok('Celebração atribuída');
}

// ==================== EDITAR BANDA ====================
function editarBanda(data) {
  const membros = Array.isArray(data.membrosIds)
    ? data.membrosIds.join(',')
    : (data.membrosIds || '');
  updRow('Bandas', data.id, {
    Nome: data.nome||'',
    LiderNome: data.liderNome||'',
    LiderMusicoId: data.liderMusicoId||'',
    Emoji: data.emoji||'🎸',
    MembrosIds: membros,
  });
  return ok('Banda atualizada');
}

// ==================== EDITAR CELEBRAÇÃO ====================
function editarCelebracaoComRegra(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel||'').toLowerCase()] || sess.nivel;

  if (nivel === 'liderequipe') {
    const cels = rows('Celebracoes');
    if (cels.ok) {
      const cel = cels.data.find(c => c.Id === data.id);
      if (cel) {
        // Não pode alterar quem define repertório
        data.repertorioTipo = cel.RepertorioTipo;
        // Não pode alterar o líder de equipe da celebração
        data.liderEquipeId = cel.LiderEquipeId;
        // Só pode alterar repertório se tipo for 'liderequipe'
        if ((cel.RepertorioTipo||'').toLowerCase() !== 'liderequipe') {
          data.repertorioId = cel.RepertorioId;
        }
      }
    }
  }
  return editarCelebracao(data);
}

function editarCelebracao(data) {
  const bandasIds = Array.isArray(data.bandasIds)
    ? data.bandasIds.join(',')
    : (data.bandasIds || '');
  const updates = {
    Nome: data.nome||'',
    Data: data.data||'',
    Horario: String(data.horario||'').substring(0,5),
    Local: data.local||'',
    Obs: data.obs||'',
    BandasIds: bandasIds,
    RepertorioId: data.repertorioId||'',
    RepertorioTipo: data.repertorioTipo||'admin',
  };
  if (data.liderEquipeId !== undefined) updates.LiderEquipeId = data.liderEquipeId;
  updRow('Celebracoes', data.id, updates);
  return ok('Celebração atualizada');
}

// ==================== EDITAR REPERTÓRIO ====================
function salvarOverridesRepertorioComPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel||'').toLowerCase()] || sess.nivel;
  // Verificar se repertório já foi liberado
  const reps = rows('Repertorios');
  if (reps.ok && data.repId) {
    const rep = reps.data.find(r => r.Id === data.repId);
    if (rep && (rep.RepReady||'').toLowerCase() === 'sim' && nivel === 'liderbanda') {
      return err('Repertório já foi liberado. Apenas Master ou Líder de Equipe podem alterar.');
    }
  }
  return salvarOverridesRepertorio(data);
}

function salvarOverridesRepertorio(data) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  // Check if already released - only master/liderequipe can change after release
  const reps = rows('Repertorios');
  if (reps.ok && data.repId) {
    const rep = reps.data.find(r => r.Id === data.repId);
    if (rep && (rep.RepReady||'').toLowerCase() === 'sim') {
      // Already released - only master or liderequipe can modify
      // This function is called by liderbanda too, so we need sess
      // But this function doesn't receive sess... it's called via perm()
      // The route has perm(['master','liderequipe','liderbanda'])
      // We'll block via frontend only for now (see renderLRep podeEditar)
    }
  }
  const updates = {
    Overrides: data.overrides || '{}',
    RepReady:  data.pronto || 'nao',
  };
  updRow('Repertorios', data.repId, updates);
  return ok('Overrides salvos');
}

function removerRepertorioPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel||'').toLowerCase()] || sess.nivel;
  if (nivel === 'master') return removerRow('Repertorios', data.id);
  // Liderequipe e liderbanda só podem remover os próprios
  const reps = rows('Repertorios');
  if (reps.ok) {
    const rep = reps.data.find(r => r.Id === data.id);
    if (!rep) return err('Não encontrado');
    if (String(rep.CriadoPor||'') !== String(sess.musicoId||'')) {
      return err('Você só pode excluir repertórios que criou.');
    }
  }
  return removerRow('Repertorios', data.id);
}

function editarRepertorioPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel||'').toLowerCase()] || sess.nivel;

  if (nivel === 'master') return editarRepertorio(data);

  // liderequipe e liderbanda só editam os próprios
  const reps = rows('Repertorios');
  if (reps.ok) {
    const rep = reps.data.find(r => r.Id === data.id);
    if (rep) {
      const cp = (rep.CriadoPor||'').trim();
      // CriadoPor vazio = legado, qualquer um pode editar
      // CriadoPor preenchido = só o dono edita
      if (cp !== '' && cp !== String(sess.musicoId||'')) {
        return err('Você só pode editar repertórios que criou.');
      }
    }
  }
  return editarRepertorio(data);
}

function editarRepertorio(data) {
  const musicasIds = Array.isArray(data.musicasIds)
    ? data.musicasIds.join(',')
    : (data.musicasIds || '');
  updRow('Repertorios', data.id, {
    Nome: data.nome || '',
    MusicasIds: musicasIds,
  });
  return ok('Repertório atualizado');
}

// ==================== MÚSICOS COM NÍVEL ====================
function getMusicosComNivel() {
  const rM = rows('Musicos');
  const rT = rows('Tokens');
  const rB = rows('Bandas');
  if (!rM.ok) return ok([]);
  const toks  = rT.ok ? rT.data : [];
  const bandas = rB.ok ? rB.data : [];
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};

  // Build map: musicoId -> list of banda names
  const bandaMap = {};
  bandas.forEach(b => {
    const mids = (b.MembrosIds||'').split(',').map(x=>x.trim()).filter(Boolean);
    mids.forEach(mid => {
      if (!bandaMap[mid]) bandaMap[mid] = [];
      bandaMap[mid].push(b.Nome||'—');
    });
  });

  return ok(rM.data.map(m => {
    const tok = toks.find(t => String(t.MusicoId) === String(m.Id));
    const nivelRaw = tok ? (tok.Nivel||'musico') : 'musico';
    const nivel = nivelMap[nivelRaw.toLowerCase()] || nivelRaw;
    const bandaNomes = (bandaMap[m.Id]||[]).join(', ') || '';
    return { ...m, NivelAcesso: nivel, Banda: bandaNomes };
  }));
}

// ==================== EDITAR MÚSICO ====================
// Atualiza o nível do token existente de um músico
// Vincula manualmente um token a um musicoId
function vincularToken(data) {
  // data.token, data.musicoId, data.nivel
  const sheet = sh('Tokens');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iToken = headers.indexOf('Token');
  const iMid   = headers.indexOf('MusicoId');
  const iNivel = headers.indexOf('Nivel');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iToken]).trim() === String(data.token).trim()) {
      if (data.musicoId) sheet.getRange(i+1, iMid+1).setValue(data.musicoId);
      if (data.nivel)    sheet.getRange(i+1, iNivel+1).setValue(data.nivel);
      return ok('Token vinculado: ' + data.token + ' -> musicoId: ' + data.musicoId);
    }
  }
  return err('Token não encontrado: ' + data.token);
}

// Tenta vincular automaticamente tokens órfãos pelo nome do músico
function fixTokensOrfaos() {
  const sheet = sh('Tokens');
  const musSheet = sh('Musicos');
  if (!sheet || !musSheet) return err('Abas não encontradas');

  const tokVals = sheet.getDataRange().getValues();
  const tokHeaders = tokVals[0].map(h => norm(String(h)));
  const iToken = tokHeaders.indexOf('Token');
  const iNome  = tokHeaders.indexOf('Nome');
  const iMid   = tokHeaders.indexOf('MusicoId');
  const iNivel = tokHeaders.indexOf('Nivel');

  const musVals = musSheet.getDataRange().getValues();
  const musHeaders = musVals[0].map(h => norm(String(h)));
  const miId   = musHeaders.indexOf('Id');
  const miNome = musHeaders.indexOf('Nome');

  const fixed = [];
  for (let i = 1; i < tokVals.length; i++) {
    const tokMid = String(tokVals[i][iMid] || '').trim();
    if (tokMid) continue; // já tem musicoId
    const tokNome = String(tokVals[i][iNome] || '').trim().toLowerCase();
    if (!tokNome) continue;
    // Buscar músico pelo nome
    for (let j = 1; j < musVals.length; j++) {
      const musNome = String(musVals[j][miNome] || '').trim().toLowerCase();
      if (musNome === tokNome) {
        const musId = String(musVals[j][miId] || '').trim();
        if (musId) {
          sheet.getRange(i+1, iMid+1).setValue(musId);
          fixed.push(tokVals[i][iToken] + ' -> ' + musId);
        }
        break;
      }
    }
  }
  return ok({ fixed, total: fixed.length });
}

function atualizarNivelToken(data) {
  const sheet = sh('Tokens');
  if (!sheet) return err('Aba Tokens não encontrada');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iMid   = headers.indexOf('MusicoId');
  const iNivel = headers.indexOf('Nivel');
  const iNome  = headers.indexOf('Nome');
  if (iMid === -1 || iNivel === -1) return err('Colunas não encontradas');

  for (let i = 1; i < vals.length; i++) {
    const rowMid = String(vals[i][iMid] || '').trim();
    const rowNome = String(vals[i][iNome] || '').trim().toLowerCase();
    // Match por musicoId OU por nome (para tokens órfãos)
    if ((data.musicoId && rowMid === String(data.musicoId).trim()) ||
        (data.nome && rowNome === String(data.nome).trim().toLowerCase())) {
      sheet.getRange(i + 1, iNivel + 1).setValue(data.nivel);
      // Aproveita e vincula o musicoId se estava vazio
      if (!rowMid && data.musicoId) {
        sheet.getRange(i + 1, iMid + 1).setValue(data.musicoId);
      }
      return ok('Nível atualizado para ' + data.nivel);
    }
  }
  return err('Token não encontrado. MusicoId: ' + data.musicoId + ', Nome: ' + data.nome);
}

function editarMusico(data) {
  const updates = {};
  if (data.nome        !== undefined) updates['Nome']         = data.nome;
  if (data.eklesia     !== undefined) updates['Eklesia']      = data.eklesia;
  if (data.whatsapp    !== undefined) updates['WhatsApp']     = data.whatsapp;
  if (data.instrumentos!== undefined) updates['Instrumentos'] = data.instrumentos;
  if (data.banda       !== undefined) updates['Banda']        = data.banda;
  if (data.isLider     !== undefined) updates['IsLider']      = data.isLider;
  const ok2 = updRow('Musicos', data.id, updates);
  return ok2 ? ok('Atualizado') : err('Músico não encontrado');
}

// ==================== BANDAS ====================
function criarBanda(data) {
  const id = genId();
  const membros = Array.isArray(data.membrosIds)
    ? data.membrosIds.join(',')
    : (data.membrosIds || '');
  addRow('Bandas', {
    Id: id, Nome: data.nome||'',
    LiderNome: data.liderNome||'', LiderMusicoId: data.liderMusicoId||'',
    Emoji: data.emoji||'🎸', Cor: data.cor||'#6C63FF',
    MembrosIds: membros, DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

function getMinhasBandas(sess) {
  const res = rows('Bandas');
  if (!res.ok) return res;
  if (sess.nivel === 'admin') return res;
  return ok(res.data.filter(b => b.LiderMusicoId === sess.musicoId));
}

// ==================== ESCALAS ====================
function criarEscala(data) {
  const id = genId();
  addRow('Escalas', {
    Id: id, Titulo: data.titulo||'', Data: data.data||'',
    Horario: String(data.horario||'').substring(0,5),
    Local: data.local||'', BandaId: data.bandaId||'',
    BandaNome: data.bandaNome||'', Tipo: data.tipo||'principal',
    Status: 'pendente', MusicasIds: '', RepertorioId: '',
    DataCriacao: new Date().toISOString(),
  });
  // Criar aceites
  const musicosIds = Array.isArray(data.musicosIds) ? data.musicosIds : [];
  musicosIds.forEach(mid => {
    addRow('Aceites', { Id: genId(), EscalaId: id, MusicoId: mid, Status: 'pendente', DataResposta: '' });
  });
  return { ok: true, id };
}

function getEscalas(data, sess) {
  const res = rows('Escalas');
  if (!res.ok) return ok([]);
  if (!sess) return ok(res.data || []);
  if (sess.nivel === 'lider' || sess.nivel === 'liderbanda') {
    const bandas = rows('Bandas');
    const minhas = bandas.ok ? bandas.data.filter(b => b.LiderMusicoId === sess.musicoId).map(b => b.Id) : [];
    return ok(res.data.filter(e => minhas.includes(e.BandaId)));
  }
  return res;
}

function getEscalaById(data) {
  const esc = rows('Escalas');
  if (!esc.ok) return ok({ aceites: [] });
  const e = esc.data.find(x => x.Id === data.id);
  if (!e) return err('Não encontrado');
  const aceites = rows('Aceites');
  const musicos = rows('Musicos');
  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });

  // Deduplicar aceites por MusicoId - manter o mais recente (última linha)
  const rawAceites = aceites.ok
    ? aceites.data.filter(a => String(a.EscalaId) === String(data.id))
    : [];

  // Agrupar por MusicoId, pegar o último registro de cada músico
  const latestMap = {};
  rawAceites.forEach(a => {
    const mid = String(a.MusicoId);
    // Última entrada no array = mais recente (Sheets mantém ordem de inserção)
    latestMap[mid] = a;
  });
  const meus = Object.values(latestMap).map(a => ({
    ...a,
    MusicoNome: musicoMap[a.MusicoId] || a.MusicoId,
  }));

  const reps = rows('Repertorios');
  let overrides = {};
  if (reps.ok && e.RepertorioId) {
    const rep = reps.data.find(r => r.Id === e.RepertorioId);
    try { overrides = (rep && rep.Overrides) ? JSON.parse(rep.Overrides) : {}; } catch(ex) {}
  }

  // Incluir substitutos resolvidos
  const subsSheet = rows('Subs');
  const subs = subsSheet.ok
    ? subsSheet.data.filter(s => String(s.EscalaId) === String(data.id) && s.Status === 'resolvida' && s.MusicoInId)
    : [];
  const subMusicos = rows('Musicos');
  const subMusicosData = subMusicos.ok ? subMusicos.data : [];
  const subsInfo = subs.map(s => {
    const m = subMusicosData.find(x => x.Id === s.MusicoInId) || {};
    return {
      Id: s.MusicoInId,
      MusicoNome: m.Nome || s.MusicoInId,
      WhatsApp: m.WhatsApp || '',
      Instrumentos: s.Instrumento || m.Instrumentos || '',
      isSub: true,
    };
  });

  return ok({ ...e, aceites: meus, overrides, subs: subsInfo });
}

function getMinhasEscalas(sess) {
  if (!sess || !sess.musicoId) return ok([]);
  const aceites = rows('Aceites');
  const esc = rows('Escalas');
  const reps = rows('Repertorios');
  if (!esc.ok) return ok([]);

  const repMap = {};
  if (reps.ok) reps.data.forEach(r => { repMap[r.Id] = r; });

  // Escalas via aceites - deduplicar por EscalaId (pegar o mais recente)
  const todosAceitesMeus = aceites.ok
    ? aceites.data.filter(a => String(a.MusicoId) === String(sess.musicoId))
    : [];
  const latestAceiteMap = {};
  todosAceitesMeus.forEach(a => { latestAceiteMap[String(a.EscalaId)] = a; });
  const meusAceites = Object.values(latestAceiteMap);
  const meusEscalaIds = new Set(meusAceites.map(a => a.EscalaId));

  // Escalas via banda (caso o musicoId não esteja em aceites mas está nos membros)
  const bandas = rows('Bandas');
  const minhasBandasIds = new Set();
  if (bandas.ok) {
    bandas.data.forEach(b => {
      const mids = (b.MembrosIds||'').split(',').map(x=>x.trim()).filter(Boolean);
      if (mids.includes(String(sess.musicoId))) minhasBandasIds.add(b.Id);
    });
  }

  const result = esc.data
    .filter(e => {
      const estaNoAceite = meusEscalaIds.has(e.Id);
      const estaNaBanda = minhasBandasIds.has(e.BandaId);
      return estaNoAceite || estaNaBanda;
    })
    .filter(e => {
      if (!e.RepertorioId) return true;
      const rep = repMap[e.RepertorioId];
      if (!rep) return true;
      // Só mostra se repertório foi liberado (RepReady='sim')
      return (rep.RepReady||'').trim().toLowerCase() === 'sim';
    })
    .map(e => {
      const aceite = latestAceiteMap[String(e.Id)] || {};
      const rep = e.RepertorioId ? repMap[e.RepertorioId] : null;
      let overrides = {};
      try { overrides = (rep && rep.Overrides) ? JSON.parse(rep.Overrides) : {}; } catch(ex) {}
      return {
        ...e,
        meuStatus: aceite.Status || 'pendente',
        Justificativa: aceite.Justificativa || '',
        overrides,
      };
    });
  return ok(result);
}

function removerMusicoEscala(data) {
  // Master remove músico de uma escala (mesmo que já tenha aceito)
  const aceites = rows('Aceites');
  if (!aceites.ok) return err('Erro');
  const found = aceites.data.find(a =>
    String(a.EscalaId) === String(data.escalaId) &&
    String(a.MusicoId) === String(data.musicoId)
  );
  if (!found) return err('Aceite não encontrado');
  updRow('Aceites', found.Id, { Status: 'removido', DataResposta: new Date().toISOString(), Justificativa: 'Removido pelo Master' });
  return ok('Músico removido da escala');
}

function responderEscala(data, sess) {
  if (!sess || !sess.musicoId) return err('Sessão inválida');
  const aceites = rows('Aceites');
  const lista = aceites.ok ? aceites.data : [];

  // Buscar aceite: primeiro por EscalaId + MusicoId exato
  let found = lista.find(a =>
    String(a.EscalaId) === String(data.escalaId) &&
    String(a.MusicoId) === String(sess.musicoId)
  );
  // Se não encontrou, buscar por EscalaId apenas (aceite criado via banda)
  // e verificar se o MusicoId está na banda correta
  if (!found) {
    const escalas = rows('Escalas');
    const bandas  = rows('Bandas');
    if (escalas.ok && bandas.ok) {
      const escala = escalas.data.find(e => e.Id === data.escalaId);
      if (escala) {
        const banda = bandas.data.find(b => b.Id === escala.BandaId);
        if (banda) {
          const mids = (banda.MembrosIds||'').split(',').map(x=>x.trim());
          if (mids.includes(String(sess.musicoId))) {
            // Músico é membro da banda - buscar aceite pendente da escala
            found = lista.find(a =>
              String(a.EscalaId) === String(data.escalaId) &&
              (a.Status||'pendente').toLowerCase() === 'pendente'
            );
            // Se encontrou um aceite pendente, atualizar o MusicoId para o correto
            if (found) {
              updRow('Aceites', found.Id, { MusicoId: sess.musicoId });
            }
          }
        }
      }
    }
  }

  // Bloquear: músico não pode recusar escala já aceita
  if (found && (found.Status||'').toLowerCase() === 'aceita' && data.status === 'recusada') {
    return err('Você já aceitou esta escala. Apenas o Master pode remover sua participação.');
  }

  const updates = {
    Status:        data.status,
    DataResposta:  new Date().toISOString(),
    Justificativa: data.justificativa || '',
  };

  if (found) {
    updRow('Aceites', found.Id, updates);
  } else {
    // Aceite não existia ainda (músico entrou via banda, não via aceite direto)
    addRow('Aceites', {
      Id:       genId(),
      EscalaId: data.escalaId,
      MusicoId: sess.musicoId,
      ...updates,
    });
  }
  return ok(data.status);
}

function adicionarMusica(data) {
  const id = genId();
  addRow('Musicas', {
    Id: id, Nome: data.nome||'', Artista: data.artista||'',
    Tom: data.tom||'', Bpm: data.bpm||'', Versao: data.versao||'',
    Youtube: data.youtube||'', Letra: data.letra||'',
    Cifra: data.cifra||'', Partitura: data.partitura||'',
    DataCadastro: new Date().toISOString(),
  });
  return ok(id);
}

// ==================== REPERTÓRIOS ====================
function getRepertoriosComNomes() {
  const rRep = rows('Repertorios');
  if (!rRep.ok) return ok([]);
  const rM   = rows('Musicos');
  const rT   = rows('Tokens');
  const rCel = rows('Celebracoes');

  // Map musicoId -> nome
  const musicoMap = {};
  if (rM.ok) rM.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });
  // Map tokenNome for master (MusicoId vazio)
  if (rT.ok) rT.data.forEach(t => {
    if (!t.MusicoId || t.MusicoId === '') {
      musicoMap['__adm__'] = t.Nome || 'Administrador';
    }
  });

  // Map repertorioId -> celebracao name
  const celMap = {};
  if (rCel.ok) rCel.data.forEach(cel => {
    const repId = (cel.RepertorioId||'').trim();
    if (repId) celMap[repId] = cel.Nome || '—';
  });

  return ok(rRep.data.map(r => {
    const cp = (r.CriadoPor||'').trim();
    const criadoPorNome = cp
      ? (musicoMap[cp] || cp)
      : (musicoMap['__adm__'] || 'Administrador');

    const celebracaoNome = celMap[r.Id] || '';

    return { ...r, CriadoPorNome: criadoPorNome, CelebracaoNome: celebracaoNome };
  }));
}

function criarRepertorio(data) {
  const id = genId();
  addRow('Repertorios', {
    Id: id, Nome: data.nome||'', BandaId: data.bandaId||'',
    MusicasIds: Array.isArray(data.musicasIds) ? data.musicasIds.join(',') : '',
    Overrides: '', RepReady: 'nao',
    CriadoPor: data.musicoId||'', DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

// ==================== CELEBRAÇÕES ====================
function criarCelebracao(data) {
  const id = genId();
  addRow('Celebracoes', {
    Id: id, Nome: data.nome||'', Data: data.data||'',
    Horario: String(data.horario||'').substring(0,5),
    Local: data.local||'', Obs: data.obs||'',
    BandasIds: Array.isArray(data.bandasIds) ? data.bandasIds.join(',') : '',
    RepertorioId: data.repertorioId||'',
    RepertorioTipo: data.repertorioTipo||'admin',
    LiderEquipeId: data.liderEquipeId||'',
    DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

// ==================== CELEBRAÇÕES ====================
function getCelebracoes(sess) {
  const rCel = rows('Celebracoes');
  if (!rCel.ok) return ok([]);
  const all = rCel.data || [];
  // Líder de equipe vê apenas celebrações atribuídas a ele
  if (sess && (sess.nivel === 'liderequipe' || sess.nivel === 'lider') && sess.musicoId) {
    const filtradas = all.filter(c => {
      const lids = (c.LiderEquipeId||'').split(',').map(x=>x.trim()).filter(Boolean);
      return lids.includes(String(sess.musicoId));
    });
    return ok(filtradas);
  }
  return ok(all);
}

// ==================== PAINEL LÍDER DE EQUIPE ====================
function getAceitesDaBanda(data) {
  // Lê diretamente da aba Aceites filtrando pelas escalas da banda
  const bandaId = data.bandaId || '';
  if (!bandaId) return err('bandaId obrigatório');

  const escalas = rows('Escalas');
  const aceites = rows('Aceites');
  const musicos = rows('Musicos');

  if (!escalas.ok || !aceites.ok) return ok({});

  // Escalas desta banda
  const escalasDaBanda = escalas.data.filter(e => String(e.BandaId) === String(bandaId));
  const escalaIds = new Set(escalasDaBanda.map(e => e.Id));

  // Aceites dessas escalas - deduplicar por MusicoId (último ganha)
  const latestPorMusico = {};
  aceites.data
    .filter(a => escalaIds.has(String(a.EscalaId)))
    .forEach(a => {
      const mid = String(a.MusicoId||'').trim();
      if (!mid) return;
      // Último registro ganha (planilha mantém ordem de inserção)
      latestPorMusico[mid] = {
        status: String(a.Status||'pendente').toLowerCase().trim(),
        justificativa: a.Justificativa || '',
        escalaId: a.EscalaId,
      };
    });

  // Adicionar nome do músico
  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });

  const result = {};
  Object.entries(latestPorMusico).forEach(([mid, info]) => {
    result[mid] = { ...info, nome: musicoMap[mid] || mid };
  });

  return ok(result);
}

function debugBandaAceites(sess) {
  const bandas   = rows('Bandas');
  const escalas  = rows('Escalas');
  const aceites  = rows('Aceites');
  const musicos  = rows('Musicos');

  const minhasBandas = bandas.ok
    ? bandas.data.filter(b => {
        const mids = (b.MembrosIds||'').split(',').map(x=>x.trim());
        return mids.includes(String(sess.musicoId||'')) || b.LiderMusicoId === sess.musicoId;
      })
    : [];

  const result = minhasBandas.map(b => {
    const escalasDaBanda = escalas.ok
      ? escalas.data.filter(e => e.BandaId === b.Id)
      : [];

    const membrosIds = (b.MembrosIds||'').split(',').filter(Boolean);
    const membrosInfo = membrosIds.map(mid => {
      const m = musicos.ok ? musicos.data.find(x=>x.Id===mid) : null;
      // All aceites for this musico across all escalas of this banda
      const aceitesDeste = aceites.ok
        ? aceites.data.filter(a =>
            String(a.MusicoId) === String(mid) &&
            escalasDaBanda.some(e => String(e.Id) === String(a.EscalaId))
          )
        : [];
      return {
        musicoId: mid,
        nome: m ? m.Nome : mid,
        aceites: aceitesDeste.map(a => ({ id: a.Id, escalaId: a.EscalaId, status: a.Status })),
      };
    });

    return {
      bandaId: b.Id,
      bandaNome: b.Nome,
      sessMusicoId: sess.musicoId,
      escalas: escalasDaBanda.map(e=>({id:e.Id,titulo:e.Titulo})),
      membros: membrosInfo,
    };
  });

  return ok(result);
}

function debugMinhasEscalas(sess) {
  const bandas = rows('Bandas');
  const aceites = rows('Aceites');
  const esc = rows('Escalas');

  const minhasBandas = bandas.ok
    ? bandas.data.filter(b => (b.MembrosIds||'').split(',').map(x=>x.trim()).includes(String(sess.musicoId||'')))
    : [];

  const meusAceites = aceites.ok
    ? aceites.data.filter(a => String(a.MusicoId) === String(sess.musicoId||''))
    : [];

  return ok({
    sessNivel: sess.nivel,
    sessMusicoId: sess.musicoId,
    totalBandas: bandas.ok ? bandas.data.length : 0,
    minhasBandas: minhasBandas.map(b=>({Id:b.Id,Nome:b.Nome,MembrosIds:b.MembrosIds})),
    meusAceites: meusAceites.slice(0,5),
    totalEscalas: esc.ok ? esc.data.length : 0,
  });
}

function debugLiderEquipe(sess) {
  const cels = rows('Celebracoes');
  const all = cels.ok ? cels.data : [];
  const minhas = all.filter(c => String(c.LiderEquipeId||'').trim() === String(sess.musicoId||'').trim());
  return ok({
    sessNivel: sess.nivel,
    sessMusicoId: sess.musicoId,
    totalCelebracoes: all.length,
    minhasCelebracoes: minhas.length,
    amostra: minhas.slice(0,2).map(c=>({Id:c.Id,Nome:c.Nome,LiderEquipeId:c.LiderEquipeId,BandasIds:c.BandasIds})),
    todasLiderEquipeIds: all.map(c=>c.LiderEquipeId).filter(Boolean),
  });
}

function getLiderEquipePanel(sess) {
  const cels    = rows('Celebracoes');
  const bandas  = rows('Bandas');
  const escalas = rows('Escalas');
  const aceites = rows('Aceites');
  const musicos = rows('Musicos');
  const reps    = rows('Repertorios');

  if (!cels.ok) return ok([]);

  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = { Nome: m.Nome||m.Id, Instrumentos: m.Instrumentos||'' }; });

  const repMap = {};
  if (reps.ok) reps.data.forEach(r => { repMap[r.Id] = r; });

  const minhasCels = cels.data.filter(c =>
    String(c.LiderEquipeId||'').trim() === String(sess.musicoId||'').trim()
  );

  const result = minhasCels.map(cel => {
    const bandasIds = (cel.BandasIds||'').split(',').filter(Boolean);

    // Bandas com membros detalhados
    const minhasBandas = (bandas.ok ? bandas.data.filter(b => bandasIds.includes(b.Id)) : [])
      .map(b => {
        const membrosIds = (b.MembrosIds||'').split(',').filter(Boolean);
        const membros = membrosIds.map(mid => ({
          Id: mid,
          Nome: musicoMap[mid] ? musicoMap[mid].Nome : mid,
          Instrumentos: musicoMap[mid] ? musicoMap[mid].Instrumentos : '',
        }));
        return { ...b, membros };
      });

    // Escalas com aceites resolvidos
    const escalasDaCel = escalas.ok
      ? escalas.data
          .filter(e => String(e.CelebracaoId||'') === String(cel.Id))
          .map(esc => {
            const acs = aceites.ok
              ? aceites.data
                  .filter(a => String(a.EscalaId) === String(esc.Id))
                  .map(a => ({
                    ...a,
                    MusicoNome: musicoMap[a.MusicoId] ? musicoMap[a.MusicoId].Nome : a.MusicoId,
                  }))
              : [];
            return { ...esc, aceites: acs };
          })
      : [];

    const rep = cel.RepertorioId ? repMap[cel.RepertorioId] : null;

    return {
      ...cel,
      bandas: minhasBandas,
      escalas: escalasDaCel,
      repertorioNome: rep ? rep.Nome : '',
      podeDefinirRepertorio: (cel.RepertorioTipo||'').toLowerCase() === 'liderequipe',
    };
  });

  return ok(result);
}

// ==================== CELEBRAÇÕES DA BANDA ====================
function getCelebracoesDaBanda(data) {
  const cels = rows('Celebracoes');
  if (!cels.ok) return cels;
  // Filtrar celebrações que têm a banda do músico
  const filtered = cels.data.filter(c => {
    const ids = (c.BandasIds||'').split(',').map(x=>x.trim());
    return ids.includes(data.bandaId);
  });
  // Para cada celebração, buscar o repertório
  const reps = rows('Musicas');
  const result = filtered.map(cel => {
    let musicas = [];
    if (cel.RepertorioId) {
      const rep = rows('Repertorios').data.find(r => r.Id === cel.RepertorioId);
      if (rep && rep.MusicasIds) {
        const ids = rep.MusicasIds.split(',').filter(Boolean);
        musicas = ids.map(mid => (reps.ok ? reps.data.find(m => m.Id === mid) : null)).filter(Boolean);
      }
    }
    return { ...cel, musicas, repertorioNome: cel.RepertorioId ? (rows('Repertorios').data.find(r=>r.Id===cel.RepertorioId)||{}).Nome||'' : '' };
  });
  return ok(result);
}

// ==================== BIBLIOTECA ====================
function adicionarBiblioteca(data) {
  if (!data.titulo) return err('Título é obrigatório');
  if (!data.link)   return err('Link é obrigatório');
  const id = genId();
  addRow('Biblioteca', {
    Id:            id,
    Titulo:        data.titulo        || '',
    TituloOriginal:data.tituloOriginal|| '',
    Composicao:    data.composicao    || '',
    Versao:        data.versao        || '',
    Categoria:     data.categoria     || '',
    Link:          data.link          || '',
    DataCriacao:   new Date().toISOString(),
  });
  return ok(id);
}

// ==================== ESCALA AUTOMÁTICA ====================
// Cria escala automaticamente ao vincular banda a celebração
// Cria escalas para TODAS as celebrações vinculadas a uma banda (trigger manual)
function criarEscalasDaBanda(data) {
  const bandaId = data.bandaId;
  const bandas = rows('Bandas');
  if (!bandas.ok) return err('Erro ao buscar bandas');
  const banda = bandas.data.find(b => b.Id === bandaId);
  if (!banda) return err('Banda não encontrada');

  const membrosIds = (banda.MembrosIds||'').split(',').filter(Boolean);
  if (!membrosIds.length) return err('Banda sem integrantes');

  const cels = rows('Celebracoes');
  if (!cels.ok) return err('Erro ao buscar celebrações');

  // Celebrações que têm esta banda vinculada E têm repertório
  const minhasCels = cels.data.filter(c => {
    const ids = (c.BandasIds||'').split(',').filter(Boolean);
    return ids.includes(bandaId) && c.RepertorioId;
  });

  if (!minhasCels.length) return err('Nenhuma celebração com repertório vinculada a esta banda');

  // Verificar quais já têm escala para não duplicar
  const escalas = rows('Escalas');
  const escalasExistentes = escalas.ok ? escalas.data : [];

  const criadas = [];
  minhasCels.forEach(cel => {
    // Verificar se já existe escala para esta banda+celebração
    const jaExiste = escalasExistentes.find(e =>
      e.BandaId === bandaId && e.CelebracaoId === cel.Id
    );
    if (jaExiste) {
      criadas.push({ cel: cel.Nome, status: 'já existia', escalaId: jaExiste.Id });
      return;
    }

    const r = criarEscalaAutomatica({
      celebracaoId: cel.Id,
      celebracaoNome: cel.Nome,
      data: (cel.Data||'').split('T')[0],
      horario: cel.Horario||'',
      local: cel.Local||'',
      repertorioId: cel.RepertorioId||'',
      bandaId: bandaId,
      bandaNome: banda.Nome||'',
      musicosIds: membrosIds,
    });
    criadas.push({ cel: cel.Nome, status: 'criada', escalaId: r.data });
  });

  return ok({ total: criadas.length, criadas });
}

function criarEscalaAutomatica(data) {
  const escalaId = genId();
  const titulo = (data.celebracaoNome || 'Celebração') + ' — ' + (data.bandaNome || '');
  const musicosIds = Array.isArray(data.musicosIds)
    ? data.musicosIds
    : (data.musicosIds||'').split(',').filter(Boolean);

  // Criar a escala
  addRow('Escalas', {
    Id:           escalaId,
    Titulo:       titulo,
    Data:         data.data || '',
    Horario:      data.horario || '',
    Local:        data.local || '',
    BandaId:      data.bandaId || '',
    BandaNome:    data.bandaNome || '',
    MusicosIds:   musicosIds.join(','),
    RepertorioId: data.repertorioId || '',
    CelebracaoId: data.celebracaoId || '',
    Status:       'pendente',
    DataCriacao:  new Date().toISOString(),
  });

  // Criar aceite pendente para cada músico
  musicosIds.forEach(mid => {
    addRow('Aceites', {
      Id:           genId(),
      EscalaId:     escalaId,
      MusicoId:     mid,
      Status:       'pendente',
      DataResposta: '',
      Justificativa: '',
    });
  });

  return ok({ escalaId, total: musicosIds.length });
}

// ==================== SUBS ====================
function criarSub(data) {
  const id = genId();
  addRow('Subs', { Id: id, EscalaId: data.escalaId||'', MusicoOutId: data.musicoOutId||'', Instrumento: data.instrumento||'', MusicoInId: '', Status: 'aberta', DataCriacao: new Date().toISOString() });
  return ok(id);
}

// ==================== PERFIL ====================
function getMeuPerfil(sess) {
  if (!sess.musicoId) return err('Sem perfil');
  const m = findRow('Musicos','Id',sess.musicoId);
  return m ? ok(m) : err('Músico não encontrado');
}

// ==================== DASHBOARD ====================
function getDashboard() {
  const aud = rows('Audicoes').data||[];
  const mus = rows('Musicos').data||[];
  const ban = rows('Bandas').data||[];
  const esc = rows('Escalas').data||[];
  const cel = rows('Celebracoes').data||[];
  const now = new Date();
  return ok({
    totalMusicos: mus.filter(m => m.Ativo==='sim').length,
    audicoesPendentes: aud.filter(a => a.Status==='pendente').length,
    audicoesAgendadas: aud.filter(a => a.Status==='agendada').length,
    totalBandas: ban.length,
    escalasEsteMes: esc.filter(e => { try { const d=new Date(e.Data); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); } catch(_){return false;} }).length,
    proximasCelebracoes: cel.filter(c => { try{return new Date(c.Data)>=now;}catch(_){return false;} }).sort((a,b)=>new Date(a.Data)-new Date(b.Data)).slice(0,5),
    ultimasInscricoes: [...aud].sort((a,b)=>new Date(b.DataInscricao||0)-new Date(a.DataInscricao||0)).slice(0,5),
  });
}

// ==================== DEBUG ====================
// Retorna headers e primeira linha raw (sem normalização)
// Corrige colunas da Biblioteca: renomeia acentuadas, remove duplicatas, migra dados
// Gera IDs para linhas da Biblioteca que não têm Id
function fixBibliotecaIds() {
  const sheet = sh('Biblioteca');
  if (!sheet) return err('Aba não encontrada');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => String(h).trim());
  
  // Normalize headers to find Id column
  let iId = -1;
  let iDt = -1;
  headers.forEach((h, i) => {
    const n = h.toLowerCase().replace(/\s+/g,'')
      .replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e')
      .replace(/[íì]/g,'i').replace(/[óòõô]/g,'o')
      .replace(/[úù]/g,'u').replace(/ç/g,'c');
    if (n === 'id') iId = i;
    if (n === 'datacriacao') iDt = i;
  });
  
  if (iId === -1) return err('Coluna Id não encontrada. Headers: ' + headers.join(','));
  
  let fixed = 0;
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    // Check if row has any data (not all empty)
    const hasData = row.some(cell => String(cell).trim() !== '');
    if (!hasData) continue;
    
    if (!String(row[iId]).trim()) {
      sheet.getRange(i + 1, iId + 1).setValue(genId());
      fixed++;
    }
    if (iDt > -1 && !String(row[iDt]).trim()) {
      sheet.getRange(i + 1, iDt + 1).setValue(new Date().toISOString());
    }
  }
  return ok('IDs gerados para ' + fixed + ' músicas');
}

function fixBiblioteca() {
  const sheet = sh('Biblioteca');
  if (!sheet) return err('Aba Biblioteca não encontrada');
  
  const vals = sheet.getDataRange().getValues();
  if (!vals.length) return ok('Vazio');
  
  const headers = vals[0].map(h => String(h).trim());
  
  // Mapa: header acentuado -> header correto
  const renames = {
    'Título':          'Titulo',
    'Título Original': 'TituloOriginal',
    'Composição':      'Composicao',
    'Versão':          'Versao',
  };
  
  // Encontrar colunas duplicadas para remover (as sem acento que foram adicionadas pelo fixColunas)
  const colsToRemove = []; // índices a remover (sem acento duplicadas)
  const colsToRename = []; // {col: índice, newName: string}
  
  headers.forEach((h, i) => {
    if (renames[h]) {
      colsToRename.push({ col: i, newName: renames[h] });
    }
    // Detectar duplicatas (sem acento) que não têm dados
    const isDuplicate = Object.values(renames).includes(h) &&
      headers.some((h2, i2) => i2 < i && renames[h2] === h);
    if (isDuplicate) colsToRemove.push(i);
  });
  
  // 1. Renomear colunas acentuadas
  colsToRename.forEach(({col, newName}) => {
    sheet.getRange(1, col + 1).setValue(newName);
  });
  
  // 2. Remover colunas duplicadas (da direita para esquerda para não deslocar índices)
  colsToRemove.sort((a,b) => b-a).forEach(col => {
    sheet.deleteColumn(col + 1);
  });
  
  return ok({
    renamed: colsToRename.map(x => x.newName),
    removed: colsToRemove.length + ' colunas duplicadas',
  });
}

function rawSheet(name) {
  const sheet = sh(name);
  if (!sheet) return err('Aba não encontrada: ' + name);
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return ok({ headers: vals[0]||[], rows: [] });
  return ok({
    headers: vals[0],
    firstRow: vals[1],
    combined: vals[0].reduce((obj, h, i) => { obj[h] = vals[1][i]; return obj; }, {}),
  });
}

function debugAll() {
  return {
    ok: true,
    audicoes:    (rows('Audicoes').data||[]).slice(0,2),
    musicos:     (rows('Musicos').data||[]).slice(0,2),
    tokens:      (rows('Tokens').data||[]).slice(0,2).map(t=>({Nome:t.Nome,Nivel:t.Nivel,Token:t.Token,MusicoId:t.MusicoId})),
    celebracoes: (rows('Celebracoes').data||[]).slice(0,2),
    bandas:      (rows('Bandas').data||[]).slice(0,2),
    biblioteca:  (rows('Biblioteca').data||[]).slice(0,2),
  };
}

function limpar() {
  const names = ['Musicos','Audicoes','Tokens','Bandas','Escalas'];
  let n = 0;
  names.forEach(name => {
    const sheet = sh(name);
    if (!sheet) return;
    const vals = sheet.getDataRange().getValues();
    vals.forEach((row,ri) => {
      if (ri===0) return;
      row.forEach((cell,ci) => {
        if (cell==='undefined'||cell==='null') { sheet.getRange(ri+1,ci+1).setValue(''); n++; }
      });
    });
  });
  return ok('Limpeza: '+n+' células corrigidas');
}

// ==================== IMPORTAR MÚSICOS APROVADOS ====================
// Cria músico na aba Musicos para cada inscrição aprovada que ainda não tem músico
function importarMusicosAprovados() {
  const rAud = rows('Audicoes'); const audicoes = rAud.ok ? rAud.data : [];
  const rMus = rows('Musicos');  const musicos  = rMus.ok ? rMus.data : [];
  const rTok = rows('Tokens');   const tokens   = rTok.ok ? rTok.data : [];
  const aprovados = audicoes.filter(a => (a.Status||'').toLowerCase() === 'aprovado');
  const criados = [];

  aprovados.forEach(a => {
    // Verificar se já tem músico com esse AudicaoId
    const jaExiste = musicos.find(m => m.AudicaoId === a.Id || m.Nome === a.Nome);
    if (jaExiste) return;

    const mid = genId();
    addRow('Musicos', {
      Id: mid,
      Nome: a.Nome||'',
      Eklesia: a.Eklesia||'',
      WhatsApp: String(a.WhatsApp||''),
      Instrumentos: a.Instrumentos||'',
      Banda: '', FotoUrl: a.FotoUrl||'',
      Ativo: 'sim', IsLider: 'nao',
      AudicaoId: a.Id||'',
      DataCadastro: new Date().toISOString(),
    });

    // Gerar token se não tiver
    const jaTemToken = tokens.find(t => t.Nome === a.Nome);
    if (!jaTemToken) {
      const token =
        Math.random().toString(36).substring(2,6).toUpperCase() +
        Math.random().toString(36).substring(2,6).toUpperCase() +
        Math.random().toString(36).substring(2,4).toUpperCase();
      addRow('Tokens', {
        Id: genId(),
        Nome: a.Nome||'',
        Eklesia: a.Eklesia||'',
        Token: token, Nivel: 'musico', MusicoId: mid,
        SessionKey: '', SessionExp: '', DataCriacao: new Date().toISOString(),
      });
      criados.push(a.Nome + ' → token: ' + token);
    } else {
      criados.push(a.Nome + ' → token já existia');
    }
  });

  return ok({ total: criados.length, criados });
}

// ==================== FIX COLUNAS ====================
// Adiciona colunas faltantes nas abas sem apagar dados existentes
function fixColunas() {
  const s = ss();
  const fixes = {
    'Audicoes':    ['Id','Nome','Eklesia','WhatsApp','Instrumentos','Observacoes','Status','FotoUrl','DataInscricao','DataAudicao','Horario','Local','Notificado','DataNotificacao'],
    'Musicos':     ['Id','Nome','Eklesia','WhatsApp','Instrumentos','Banda','FotoUrl','Ativo','IsLider','AudicaoId','DataCadastro'],
    'Tokens':      ['Id','Nome','Eklesia','Token','Nivel','MusicoId','SessionKey','SessionExp','DataCriacao'],
    'Celebracoes': ['Id','Nome','Data','Horario','Local','Obs','BandasIds','RepertorioId','RepertorioTipo','LiderEquipeId','DataCriacao'],
    'Aceites':     ['Id','EscalaId','MusicoId','Status','DataResposta','Justificativa'],
    'Bandas':      ['Id','Nome','LiderNome','LiderMusicoId','Emoji','Cor','MembrosIds','DataCriacao'],
    'Escalas':     ['Id','Titulo','Data','Horario','Local','BandaId','BandaNome','MusicosIds','RepertorioId','CelebracaoId','Status','DataCriacao'],
    'Repertorios': ['Id','Nome','BandaId','MusicasIds','Overrides','RepReady','CriadoPor','DataCriacao'],
    'Musicas':     ['Id','Nome','Artista','Tom','Bpm','Versao','Youtube','Cifra','Partitura','DataCriacao'],
    'Biblioteca':  ['Id','Titulo','TituloOriginal','Composicao','Versao','Categoria','Link','DataCriacao'],
    'Biblioteca':  ['Id','Titulo','TituloOriginal','Composicao','Versao','Categoria','Link','DataCriacao'],
  };
  const results = {};
  Object.entries(fixes).forEach(([name, expectedHeaders]) => {
    const sheet = s.getSheetByName(name);
    if (!sheet) { results[name] = 'aba não encontrada'; return; }
    const currentHeaders = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const missing = [];
    expectedHeaders.forEach(h => {
      const normH = norm(h);
      const found = currentHeaders.some(ch => norm(ch) === normH);
      if (!found) {
        const nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(h).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
        missing.push(h);
      }
    });
    results[name] = missing.length > 0 ? 'Adicionadas: ' + missing.join(', ') : 'OK';
  });
  return ok(results);
}

// ==================== SETUP ====================
function setupSpreadsheet() {
  const s = ss();
  const defs = {
    'Tokens':      ['Id','Nome','Eklesia','Token','Nivel','MusicoId','SessionKey','SessionExp','DataCriacao'],
    'Audicoes':    ['Id','Nome','Eklesia','WhatsApp','Instrumentos','Observacoes','Status','FotoUrl','DataInscricao','DataAudicao','Horario','Local','Notificado','DataNotificacao'],
    'Aprovacoes':  ['Id','AudicaoId','Nome','Tipo','Obs','DataAprovacao'],
    'Musicos':     ['Id','Nome','Eklesia','WhatsApp','Instrumentos','Banda','FotoUrl','Ativo','IsLider','AudicaoId','DataCadastro'],
    'Bandas':      ['Id','Nome','LiderNome','LiderMusicoId','Emoji','Cor','MembrosIds','DataCriacao'],
    'Escalas':     ['Id','Titulo','Data','Horario','Local','BandaId','BandaNome','Tipo','Status','MusicasIds','RepertorioId','DataCriacao'],
    'Musicas':     ['Id','Nome','Artista','Tom','Bpm','Versao','Youtube','Letra','Cifra','Partitura','DataCadastro'],
    'Repertorios': ['Id','Nome','BandaId','MusicasIds','CriadoPor','DataCriacao'],
    'Celebracoes': ['Id','Nome','Data','Horario','Local','Obs','BandasIds','RepertorioId','RepertorioTipo','LiderEquipeId','DataCriacao'],
    'Ensaios':     ['Id','BandaId','BandaNome','Data','Horario','Local','Obs','DataCriacao'],
    'Subs':        ['Id','EscalaId','MusicoOutId','Instrumento','MusicoInId','Status','DataCriacao'],
    'Aceites':     ['Id','EscalaId','MusicoId','Status','DataResposta','Justificativa'],
    'Arquivos':    ['Id','Tipo','ReferenciaId','Nome','Url','FileId','DataUpload'],
  };
  Object.entries(defs).forEach(([name,headers]) => {
    let sheet = s.getSheetByName(name);
    if (!sheet) sheet = s.insertSheet(name);
    if (sheet.getLastRow()===0) {
      sheet.appendRow(headers);
      sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
  // Admin padrão
  const ts = s.getSheetByName('Tokens');
  if (ts.getLastRow()<=1) {
    ts.appendRow([genId(),'Administrador','—','ADM-MASTER','admin','','','',new Date().toISOString()]);
  }
  Logger.log('Setup OK');
}
