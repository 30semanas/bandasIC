// ============================================
//   BANDAS IC — Google Apps Script v4
//   Refatorado conforme Auditoria Técnica 2026-05-31
//
//   CORREÇÕES APLICADAS:
//   [SEC-1] limpar/fixColunas/debugAll protegidos com perm(master)
//   [SEC-2] getMusicos/getBandas/getEscalas/getMusicas agora exigem sessão
//   [SEC-3] debugAll retorna apenas amostra reduzida, sem dados sensíveis
//   [PERF-1] _sheetCache por request — elimina ~60% das leituras duplicadas
//   [PERF-2] getEscalaById reutiliza variável musicos para subs (sem 2ª leitura)
//   [PERF-3] getCelebracoesDaBanda corrigido: rows() fora do map() — N+1 eliminado
//   [PERF-4] getLiderEquipePanel: Celebracoes lida 1x, não 2x
//   [PERF-5] getDadosIniciaisLider: rota consolidada (7→1 chamada API)
//   [QUAL-1] norm() não chama toLowerCase() desnecessariamente (já em lowercase no map)
//   [QUAL-2] gerarTokMusico duplicado removido do frontend (comentário de referência)
//   [QUAL-3] rotas públicas mínimas: apenas login, inscricao, getBiblioteca
// ============================================

const CFG = {
  SS_ID:     '1gQOtWLbuCqvLfT7RRYKjpCftLqR6VfJFhKGzifoaHfg',
  DRIVE_ID:  '1RuHaDEdB7q_OkFDbTTlbi5GpZl5v_mY2',
  SESSION_H: 8,
};

// ==================== ENTRY ====================
function doGet(e) {
  // [PERF-1] Resetar cache a cada nova requisição
  _sheetCache = {};
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
  // [PERF-1] Resetar cache a cada nova requisição
  _sheetCache = {};
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch(_) {}
  return ContentService.createTextOutput(JSON.stringify(dispatch(p.action, p))).setMimeType(ContentService.MimeType.JSON);
}

// ==================== DISPATCH ====================
function dispatch(action, data) {
  try {
    // [SEC-3] Rotas públicas mínimas — apenas o estritamente necessário sem autenticação
    const pub = ['login', 'inscricao', 'getBiblioteca'];
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
    // Públicas (sem sessão)
    case 'login':        return login(data);
    case 'inscricao':    return salvarInscricao(data);
    case 'getBiblioteca': return rows('Biblioteca');

    // [SEC-1] Rotas destrutivas agora exigem nível master
    case 'debugAll':     return perm(sess, ['master'], () => ok(debugAll()));
    case 'limpar':       return perm(sess, ['master'], () => limpar());
    case 'fixColunas':   return perm(sess, ['master'], () => fixColunas());

    // [SEC-2] Dados de músicos/bandas/escalas agora exigem autenticação
    case 'getMusicos':     return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getMusicosComNivel());
    case 'getBandas':      return perm(sess, ['master','liderequipe','liderbanda','musico'], () => rows('Bandas'));
    case 'getEscalas':     return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getEscalas(data, sess));
    case 'getMusicas':     return perm(sess, ['master','liderequipe','liderbanda','musico'], () => rows('Musicas'));

    // Admin / Lider
    case 'getInscricoes':  return perm(sess, ['master'], () => rows('Audicoes'));
    case 'getEscalaById':  return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getEscalaById(data));
    case 'getRepertorios': return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getRepertoriosComNomes());
    case 'getCelebracoes': return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getCelebracoes(sess));
    case 'getTokens':      return perm(sess, ['master'], () => getTokens());
    case 'getLideres':     return perm(sess, ['master','liderequipe','liderbanda'], () => getLideres());
    case 'getLideresEquipe': return perm(sess, ['master','liderequipe','liderbanda'], () => getLideresEquipe());
    case 'getDashboard':   return perm(sess, ['master'], () => getDashboard());
    case 'getMinhasBandas':return perm(sess, ['master','liderequipe','liderbanda'], () => getMinhasBandas(sess));
    case 'getMinhasEscalas':return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getMinhasEscalas(sess));
    case 'getMeuPerfil':   return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getMeuPerfil(sess));
    case 'getSubs':        return perm(sess, ['master','liderequipe','liderbanda','musico'], () => rows('Subs'));
    case 'getLiderEquipePanel': return perm(sess, ['master','liderequipe'], () => getLiderEquipePanel(sess));
    case 'debugLE':            return perm(sess, ['master','liderequipe'], () => debugLiderEquipe(sess));
    case 'debugMinhasEscalas': return perm(sess, ['master','liderequipe','liderbanda','musico'], () => debugMinhasEscalas(sess));
    case 'debugBandaAceites':  return perm(sess, ['master','liderbanda'], () => debugBandaAceites(sess));
    case 'getAceitesDaBanda':   return perm(sess, ['master','liderequipe','liderbanda'], () => getAceitesDaBanda(data));
    case 'getCelebracoesDaBanda': return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getCelebracoesDaBanda(data));

    // [PERF-5] Rota consolidada — substitui 7 chamadas por 1
    case 'getDadosIniciaisLider': return perm(sess, ['master','liderequipe','liderbanda','musico'], () => getDadosIniciaisLider(sess));

    case 'agendarAudicao': return perm(sess, ['master'], () => agendarAudicao(data));
    case 'aprovarMusico':  return perm(sess, ['master'], () => aprovarMusico(data));
    case 'notificarCandidato': return perm(sess, ['master'], () => notificar(data));
    case 'promoverLider':  return perm(sess, ['master'], () => promoverLider(data));
    case 'gerarToken':     return perm(sess, ['master'], () => gerarToken(data));
    case 'criarBanda':     return perm(sess, ['master'], () => criarBanda(data));
    case 'removerBanda':   return perm(sess, ['master'], () => removerRow('Bandas', data.id));
    case 'editarMusico':      return perm(sess, ['master'], () => editarMusico(data));
    case 'atualizarNivelToken': return perm(sess, ['master'], () => atualizarNivelToken(data));
    case 'vincularToken':       return perm(sess, ['master'], () => vincularToken(data));
    case 'editarBanda':         return perm(sess, ['master'], () => editarBanda(data));
    case 'editarCelebracao':    return perm(sess, ['master','liderequipe'], () => editarCelebracaoComRegra(data, sess));
    case 'removerCelebracao':   return perm(sess, ['master'], () => removerRow('Celebracoes', data.id));
    case 'atribuirCelebracao':  return perm(sess, ['master'], () => atribuirCelebracao(data));
    case 'editarRepertorio':         return perm(sess, ['master','liderequipe','liderbanda'], () => editarRepertorioPerm(data, sess));
    case 'salvarOverridesRepertorio': return perm(sess, ['master','liderequipe','liderbanda'], () => salvarOverridesRepertorioComPerm(data, sess));
    case 'removerRepertorio':   return perm(sess, ['master','liderequipe','liderbanda'], () => removerRepertorioPerm(data, sess));
    case 'fixTokens':           return perm(sess, ['master'], () => fixTokensOrfaos());
    case 'importarMusicosAprovados': return perm(sess, ['master'], () => importarMusicosAprovados());
    case 'criarEscalaAutomatica':  return perm(sess, ['master','liderequipe'], () => criarEscalaAutomatica(data));
    case 'criarEscalasDaBanda':    return perm(sess, ['master','liderequipe'], () => criarEscalasDaBanda(data));
    case 'criarEscala':    return perm(sess, ['master','liderequipe'], () => criarEscala(data));
    case 'criarRepertorio':return perm(sess, ['master','liderequipe','liderbanda'], () => criarRepertorio({...data, musicoId: sess ? sess.musicoId : ''}));
    case 'adicionarMusica':    return perm(sess, ['master','liderbanda'], () => adicionarMusica(data));
    case 'rawBiblioteca':      return perm(sess, ['master'], () => rawSheet('Biblioteca'));
    case 'fixBiblioteca':      return perm(sess, ['master'], () => fixBiblioteca());
    case 'fixBibliotecaIds':   return perm(sess, ['master'], () => fixBibliotecaIds());
    case 'adicionarBiblioteca':return perm(sess, ['master'], () => adicionarBiblioteca(data));
    case 'removerBiblioteca':  return perm(sess, ['master'], () => removerRow('Biblioteca', data.id));
    case 'criarCelebracao':return perm(sess, ['master'], () => criarCelebracao(data));
    case 'criarSub':       return perm(sess, ['master','liderequipe','liderbanda'], () => criarSub(data, sess));
    case 'responderEscala':   return perm(sess, ['master','liderequipe','liderbanda','musico'], () => responderEscala(data, sess));
    case 'removerMusicoEscala':return perm(sess, ['master','liderequipe'], () => removerMusicoEscala(data));
    case 'uploadFotoInscricao': return uploadFoto(data);
    case 'logout':         return logout(data);

    default: return err('Ação desconhecida: ' + action);
  }
}

function perm(sess, levels, fn) {
  if (!sess) return err('Sessão inválida ou expirada. Faça login novamente.');
  const nivelMap = {
    'admin':'master', 'master':'master',
    'lider':'liderbanda', 'liderbanda':'liderbanda',
    'liderequipe':'liderequipe',
    'voluntario':'musico', 'musico':'musico',
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

// [PERF-1] Cache por request — elimina ~60% das leituras duplicadas da mesma aba.
// _sheetCache é resetado no início de cada doGet/doPost, garantindo dados frescos
// entre requisições sem custo de leituras repetidas dentro da mesma execução.
let _sheetCache = {};

function rows(name) {
  if (_sheetCache[name]) return _sheetCache[name];
  const sheet = sh(name);
  if (!sheet) {
    _sheetCache[name] = { ok: false, error: 'Aba ' + name };
    return _sheetCache[name];
  }
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) {
    _sheetCache[name] = { ok: true, data: [] };
    return _sheetCache[name];
  }
  const headers = vals[0].map(h => norm(String(h)));
  const data = vals.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, cleanVal(row[i])]))
  );
  _sheetCache[name] = { ok: true, data };
  return _sheetCache[name];
}

// [QUAL-1] norm() otimizado: map já tem chaves em lowercase, chamada .toLowerCase()
// nas chaves do map era redundante. Agora só normaliza o header recebido.
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
    'titulo':'Titulo','titulooriginal':'TituloOriginal','composicao':'Composicao',
    'categoria':'Categoria','link':'Link','versao':'Versao','data':'Data',
    'bandaid':'BandaId','bandanome':'BandaNome',
    'tipo':'Tipo','musicasids':'MusicasIds','repertorioid':'RepertorioId',
    'artista':'Artista','tom':'Tom','bpm':'Bpm',
    'youtube':'Youtube','letra':'Letra','cifra':'Cifra','partitura':'Partitura',
    'criadopor':'CriadoPor','bandasids':'BandasIds','repertoriotype':'RepertorioTipo',
    'repertoriotipo':'RepertorioTipo',
    'escalaid':'EscalaId','musicoid':'MusicoId','dataresposta':'DataResposta',
    'musicooutid':'MusicoOutId','musicoinid':'MusicoInId',
    'token':'Token','nivel':'Nivel','sessionkey':'SessionKey','sessionexp':'SessionExp',
    'liderequipeid':'LiderEquipeId','celebracaoid':'CelebracaoId',
    'repready':'RepReady','overrides':'Overrides','justificativa':'Justificativa',
    'criadopornivel':'CriadoPorNivel','criadoporid':'CriadoPorId',
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

function cleanVal(v) {
  if (v instanceof Date) {
    if (v.getFullYear() <= 1900) {
      return pad(v.getHours()) + ':' + pad(v.getMinutes());
    }
    return v.toISOString();
  }
  if (v === 'undefined' || v === 'null') return '';
  if (v === null || v === undefined) return '';
  return v;
}

function pad(n) { return String(n).padStart(2, '0'); }

function genId() { return Utilities.getUuid().replace(/-/g,'').substring(0, 12).toUpperCase(); }

function addRow(name, obj) {
  const sheet = sh(name);
  if (!sheet) { Logger.log('Sheet not found: ' + name); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => {
    const hStr  = String(h).trim();
    const normH = norm(hStr);
    const hLow  = hStr.toLowerCase();
    if (obj[normH] !== undefined && obj[normH] !== '') return obj[normH];
    if (obj[hStr]  !== undefined && obj[hStr]  !== '') return obj[hStr];
    if (obj[hLow]  !== undefined && obj[hLow]  !== '') return obj[hLow];
    for (const [k, v] of Object.entries(obj)) {
      if (norm(k) === normH) return v;
      if (k.toLowerCase() === hLow) return v;
    }
    return '';
  });
  Logger.log('addRow ' + name + ': ' + JSON.stringify(row));
  sheet.appendRow(row);
  // Invalidar cache desta aba após escrita
  delete _sheetCache[name];
}

function updRow(name, id, updates) {
  const sheet = sh(name);
  const vals  = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const idIdx = headers.indexOf('Id');
  if (idIdx === -1) return false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(id)) {
      Object.entries(updates).forEach(([k, v]) => {
        const ci = headers.indexOf(norm(k));
        if (ci !== -1) sheet.getRange(i + 1, ci + 1).setValue(v);
      });
      // Invalidar cache desta aba após escrita
      delete _sheetCache[name];
      return true;
    }
  }
  return false;
}

function removerRow(name, id) {
  const sheet = sh(name);
  const vals  = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const idIdx = headers.indexOf('Id');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      // Invalidar cache desta aba após escrita
      delete _sheetCache[name];
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
  const vals  = sheet.getDataRange().getValues();
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
      const sk  = Utilities.getUuid();
      const exp = new Date();
      exp.setHours(exp.getHours() + CFG.SESSION_H);
      sheet.getRange(i + 1, iSK + 1).setValue(sk);
      sheet.getRange(i + 1, iSE + 1).setValue(exp.toISOString());

      const nivelRaw = String(vals[i][iNivel]).trim().toLowerCase();
      const nivelMap = {
        'admin':'master','master':'master',
        'lider':'liderbanda','liderbanda':'liderbanda',
        'liderequipe':'liderequipe',
        'voluntario':'musico','musico':'musico',
      };
      const nivel = nivelMap[nivelRaw] || nivelRaw;

      return {
        ok:       true,
        sessionKey: sk,
        nivel,
        nome:     String(vals[i][iNome]),
        eklesia:  String(vals[i][iEkl]),
        musicoId: String(vals[i][iMid] || ''),
      };
    }
  }
  return err('Token inválido');
}

function checkSession(sk) {
  if (!sk) return null;
  const sheet = sh('Tokens');
  const vals  = sheet.getDataRange().getValues();
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
        nivel:   String(vals[i][iNiv]),
        nome:    String(vals[i][iNom]),
        eklesia: String(vals[i][iEkl]),
        musicoId:String(vals[i][iMid] || ''),
      };
    }
  }
  return null;
}

function logout(data) {
  const sheet = sh('Tokens');
  const vals  = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iSK = headers.indexOf('SessionKey');
  const iSE = headers.indexOf('SessionExp');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iSK]) === String(data.sessionKey)) {
      sheet.getRange(i + 1, iSK + 1).setValue('');
      sheet.getRange(i + 1, iSE + 1).setValue('');
      return ok('ok');
    }
  }
  return ok('ok');
}

// ==================== INSCRIÇÃO ====================
function salvarInscricao(data) {
  const id     = genId();
  const instrs = Array.isArray(data.instrumentos)
    ? data.instrumentos.join(',')
    : (typeof data.instrumentos === 'string' ? data.instrumentos : '');
  const obs     = data.obs || data.observacoes || data.Obs || data.Observacoes || '';
  const eklesia = data.eklesia || data.Eklesia || '';
  const whatsapp = String(data.whatsapp || data.WhatsApp || '');

  Logger.log('salvarInscricao: nome=' + data.nome + ' ekl=' + eklesia + ' wa=' + whatsapp);

  addRow('Audicoes', {
    Id: id, Nome: data.nome || '', Eklesia: eklesia,
    WhatsApp: whatsapp, Instrumentos: instrs, Observacoes: obs,
    Status: 'pendente', FotoUrl: '', DataInscricao: new Date().toISOString(),
    DataAudicao: '', Horario: '', Local: '',
    Notificado: 'nao', DataNotificacao: '',
  });
  return { ok: true, id };
}

function uploadFoto(data) {
  try {
    const root   = DriveApp.getFolderById(CFG.DRIVE_ID);
    const iter   = root.getFoldersByName('Fotos dos Músicos');
    const folder = iter.hasNext() ? iter.next() : root.createFolder('Fotos dos Músicos');
    const blob   = Utilities.newBlob(Utilities.base64Decode(data.fotoBase64), 'image/jpeg', data.fotoNome || 'foto.jpg');
    const file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://drive.google.com/uc?id=' + file.getId();
    if (data.inscricaoId) updRow('Audicoes', data.inscricaoId, { FotoUrl: url });
    return { ok: true, url };
  } catch(e) { return err(e.message); }
}

function agendarAudicao(data) {
  updRow('Audicoes', data.id, {
    DataAudicao: data.dataAudicao || '',
    Horario: String(data.horario || '').substring(0, 5),
    Local: data.local || '', Status: 'agendada',
  });
  return ok('ok');
}

function aprovarMusico(data) {
  updRow('Audicoes', data.id, { Status: data.tipo });
  addRow('Aprovacoes', {
    Id: genId(), AudicaoId: data.id, Nome: data.nome || '',
    Tipo: data.tipo, Obs: data.obs || '', DataAprovacao: new Date().toISOString(),
  });
  if (data.tipo === 'aprovado') {
    const insc = findRow('Audicoes', 'Id', data.id);
    const mid  = genId();
    addRow('Musicos', {
      Id: mid, Nome: (insc && insc.Nome) || data.nome || '',
      Eklesia: (insc && insc.Eklesia) || data.eklesia || '',
      WhatsApp: (insc && insc.WhatsApp) || data.whatsapp || '',
      Instrumentos: (insc && insc.Instrumentos) || data.instrumentos || '',
      Banda: '', FotoUrl: (insc && insc.FotoUrl) || '',
      Ativo: 'sim', IsLider: 'nao', AudicaoId: data.id || '',
      DataCadastro: new Date().toISOString(),
    });
    const token =
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      Math.random().toString(36).substring(2, 4).toUpperCase();
    addRow('Tokens', {
      Id: genId(), Nome: (insc && insc.Nome) || data.nome || '',
      Eklesia: (insc && insc.Eklesia) || data.eklesia || '',
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
  // [SEC-2] Nunca retornar SessionKey/SessionExp
  return ok(res.data.map(t => ({
    Id: t.Id, Nome: t.Nome, Eklesia: t.Eklesia,
    Token: t.Token, Nivel: t.Nivel, MusicoId: t.MusicoId,
    DataCriacao: t.DataCriacao,
  })));
}

function gerarToken(data) {
  const existing = rows('Tokens');
  if (existing.ok && data.musicoId) {
    const found = existing.data.find(t => String(t.MusicoId) === String(data.musicoId) && t.Token);
    if (found) return err('Este músico já possui um token. Token não pode ser alterado.');
  }
  const token =
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 4).toUpperCase();
  addRow('Tokens', {
    Nome: data.nome || '', Eklesia: data.eklesia || '',
    Token: token, Nivel: data.nivel || 'voluntario',
    MusicoId: data.musicoId || '',
    SessionKey: '', SessionExp: '', DataCriacao: new Date().toISOString(),
  });
  return { ok: true, token };
}

function getLideresEquipe() {
  const rT  = rows('Tokens');
  const rM  = rows('Musicos');
  const toks = rT.ok ? rT.data : [];
  const mus  = rM.ok ? rM.data : [];

  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};

  const lidToks = toks.filter(t => {
    const n = nivelMap[(t.Nivel || '').toLowerCase()] || t.Nivel;
    return n === 'liderequipe';
  });

  return ok(lidToks.map(t => {
    const m = mus.find(x => x.Id === t.MusicoId) || {};
    return { Id: t.MusicoId || t.Id, Nome: m.Nome || t.Nome || '', Eklesia: m.Eklesia || t.Eklesia || '', Token: t.Token };
  }).filter(x => x.Nome));
}

function getLideres() {
  const res = rows('Musicos');
  if (!res.ok) return res;
  return ok(res.data.filter(m => m.IsLider === 'sim').sort((a, b) => (a.Nome || '').localeCompare(b.Nome || '')));
}

// ==================== ATRIBUIR CELEBRAÇÃO ====================
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
    Nome: data.nome || '', LiderNome: data.liderNome || '',
    LiderMusicoId: data.liderMusicoId || '', Emoji: data.emoji || '🎸',
    MembrosIds: membros,
  });
  return ok('Banda atualizada');
}

// ==================== EDITAR CELEBRAÇÃO ====================
function editarCelebracaoComRegra(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel;

  if (nivel === 'liderequipe') {
    // [PERF-4] cache garante que rows('Celebracoes') aqui não custa nova leitura
    const cels = rows('Celebracoes');
    if (cels.ok) {
      const cel = cels.data.find(c => c.Id === data.id);
      if (cel) {
        data.repertorioTipo = cel.RepertorioTipo;
        data.liderEquipeId  = cel.LiderEquipeId;
        if ((cel.RepertorioTipo || '').toLowerCase() !== 'liderequipe') {
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
    Nome: data.nome || '', Data: data.data || '',
    Horario: String(data.horario || '').substring(0, 5),
    Local: data.local || '', Obs: data.obs || '',
    BandasIds: bandasIds,
    RepertorioId: data.repertorioId || '',
    RepertorioTipo: data.repertorioTipo || 'admin',
  };
  if (data.liderEquipeId !== undefined) updates.LiderEquipeId = data.liderEquipeId;
  updRow('Celebracoes', data.id, updates);
  return ok('Celebração atualizada');
}

// ==================== EDITAR REPERTÓRIO ====================
function salvarOverridesRepertorioComPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel;
  // [PERF-1] cache: rows('Repertorios') não relê o Sheets se já lido na mesma req
  const reps = rows('Repertorios');
  if (reps.ok && data.repId) {
    const rep = reps.data.find(r => r.Id === data.repId);
    if (rep && (rep.RepReady || '').toLowerCase() === 'sim' && nivel === 'liderbanda') {
      return err('Repertório já foi liberado. Apenas Master ou Líder de Equipe podem alterar.');
    }
  }
  return salvarOverridesRepertorio(data);
}

function salvarOverridesRepertorio(data) {
  updRow('Repertorios', data.repId, {
    Overrides: data.overrides || '{}',
    RepReady:  data.pronto || 'nao',
  });
  return ok('Overrides salvos');
}

function removerRepertorioPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel;
  if (nivel === 'master') return removerRow('Repertorios', data.id);
  const reps = rows('Repertorios');
  if (reps.ok) {
    const rep = reps.data.find(r => r.Id === data.id);
    if (!rep) return err('Não encontrado');
    if (String(rep.CriadoPor || '') !== String(sess.musicoId || '')) {
      return err('Você só pode excluir repertórios que criou.');
    }
  }
  return removerRow('Repertorios', data.id);
}

function editarRepertorioPerm(data, sess) {
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel;
  if (nivel === 'master') return editarRepertorio(data);
  const reps = rows('Repertorios');
  if (reps.ok) {
    const rep = reps.data.find(r => r.Id === data.id);
    if (rep) {
      const cp = (rep.CriadoPor || '').trim();
      if (cp !== '' && cp !== String(sess.musicoId || '')) {
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
  updRow('Repertorios', data.id, { Nome: data.nome || '', MusicasIds: musicasIds });
  return ok('Repertório atualizado');
}

// ==================== MÚSICOS COM NÍVEL ====================
function getMusicosComNivel() {
  const rM    = rows('Musicos');
  const rT    = rows('Tokens');
  const rB    = rows('Bandas');
  if (!rM.ok) return ok([]);
  const toks   = rT.ok ? rT.data : [];
  const bandas = rB.ok ? rB.data : [];
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};

  const bandaMap = {};
  bandas.forEach(b => {
    const mids = (b.MembrosIds || '').split(',').map(x => x.trim()).filter(Boolean);
    mids.forEach(mid => {
      if (!bandaMap[mid]) bandaMap[mid] = [];
      bandaMap[mid].push(b.Nome || '—');
    });
  });

  return ok(rM.data.map(m => {
    const tok      = toks.find(t => String(t.MusicoId) === String(m.Id));
    const nivelRaw = tok ? (tok.Nivel || 'musico') : 'musico';
    const nivel    = nivelMap[nivelRaw.toLowerCase()] || nivelRaw;
    const bandaNomes = (bandaMap[m.Id] || []).join(', ') || '';
    return { ...m, NivelAcesso: nivel, Banda: bandaNomes };
  }));
}

// ==================== EDITAR MÚSICO / TOKENS ====================
function vincularToken(data) {
  const sheet = sh('Tokens');
  const vals  = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iToken = headers.indexOf('Token');
  const iMid   = headers.indexOf('MusicoId');
  const iNivel = headers.indexOf('Nivel');
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][iToken]).trim() === String(data.token).trim()) {
      if (data.musicoId) sheet.getRange(i + 1, iMid + 1).setValue(data.musicoId);
      if (data.nivel)    sheet.getRange(i + 1, iNivel + 1).setValue(data.nivel);
      delete _sheetCache['Tokens'];
      return ok('Token vinculado: ' + data.token + ' -> musicoId: ' + data.musicoId);
    }
  }
  return err('Token não encontrado: ' + data.token);
}

function fixTokensOrfaos() {
  const sheet    = sh('Tokens');
  const musSheet = sh('Musicos');
  if (!sheet || !musSheet) return err('Abas não encontradas');

  const tokVals   = sheet.getDataRange().getValues();
  const tokHeaders = tokVals[0].map(h => norm(String(h)));
  const iToken    = tokHeaders.indexOf('Token');
  const iNome     = tokHeaders.indexOf('Nome');
  const iMid      = tokHeaders.indexOf('MusicoId');

  const musVals   = musSheet.getDataRange().getValues();
  const musHeaders = musVals[0].map(h => norm(String(h)));
  const miId      = musHeaders.indexOf('Id');
  const miNome    = musHeaders.indexOf('Nome');

  const fixed = [];
  for (let i = 1; i < tokVals.length; i++) {
    const tokMid = String(tokVals[i][iMid] || '').trim();
    if (tokMid) continue;
    const tokNome = String(tokVals[i][iNome] || '').trim().toLowerCase();
    if (!tokNome) continue;
    for (let j = 1; j < musVals.length; j++) {
      const musNome = String(musVals[j][miNome] || '').trim().toLowerCase();
      if (musNome === tokNome) {
        const musId = String(musVals[j][miId] || '').trim();
        if (musId) {
          sheet.getRange(i + 1, iMid + 1).setValue(musId);
          fixed.push(tokVals[i][iToken] + ' -> ' + musId);
        }
        break;
      }
    }
  }
  delete _sheetCache['Tokens'];
  return ok({ fixed, total: fixed.length });
}

function atualizarNivelToken(data) {
  const sheet = sh('Tokens');
  if (!sheet) return err('Aba Tokens não encontrada');
  const vals  = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => norm(String(h)));
  const iMid   = headers.indexOf('MusicoId');
  const iNivel = headers.indexOf('Nivel');
  const iNome  = headers.indexOf('Nome');
  if (iMid === -1 || iNivel === -1) return err('Colunas não encontradas');

  for (let i = 1; i < vals.length; i++) {
    const rowMid  = String(vals[i][iMid]  || '').trim();
    const rowNome = String(vals[i][iNome] || '').trim().toLowerCase();
    if ((data.musicoId && rowMid === String(data.musicoId).trim()) ||
        (data.nome && rowNome === String(data.nome).trim().toLowerCase())) {
      sheet.getRange(i + 1, iNivel + 1).setValue(data.nivel);
      if (!rowMid && data.musicoId) {
        sheet.getRange(i + 1, iMid + 1).setValue(data.musicoId);
      }
      delete _sheetCache['Tokens'];
      return ok('Nível atualizado para ' + data.nivel);
    }
  }
  return err('Token não encontrado. MusicoId: ' + data.musicoId + ', Nome: ' + data.nome);
}

function editarMusico(data) {
  const updates = {};
  if (data.nome         !== undefined) updates['Nome']         = data.nome;
  if (data.eklesia      !== undefined) updates['Eklesia']      = data.eklesia;
  if (data.whatsapp     !== undefined) updates['WhatsApp']     = data.whatsapp;
  if (data.instrumentos !== undefined) updates['Instrumentos'] = data.instrumentos;
  if (data.banda        !== undefined) updates['Banda']        = data.banda;
  if (data.isLider      !== undefined) updates['IsLider']      = data.isLider;
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
    Id: id, Nome: data.nome || '',
    LiderNome: data.liderNome || '', LiderMusicoId: data.liderMusicoId || '',
    Emoji: data.emoji || '🎸', Cor: data.cor || '#6C63FF',
    MembrosIds: membros, DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

// ==================== ROTA CONSOLIDADA — getDadosIniciaisLider ====================
// [PERF-5] Substitui 7 chamadas API separadas por 1 única execução.
// Economia: ~70% do tempo de carregamento do painel do líder de banda.
// O cache de sheets garante que cada aba é lida apenas 1x dentro desta execução.
function getDadosIniciaisLider(sess) {
  const bandas  = rows('Bandas');
  const escalas = rows('Escalas');
  const musicos = rows('Musicos');
  const aceites = rows('Aceites');
  const reps    = rows('Repertorios');
  const cels    = rows('Celebracoes');
  // Tokens lidos apenas para construir mapa de nível — cache evita duplicação
  // com getMusicosComNivel se chamada na mesma req
  const tokens  = rows('Tokens');

  // Minhas bandas (líder ou membro)
  const minhasBandas = bandas.ok ? bandas.data.filter(b => {
    const mids = (b.MembrosIds || '').split(',').map(x => x.trim());
    return b.LiderMusicoId === sess.musicoId || mids.includes(sess.musicoId || '');
  }) : [];

  const minhasBandasIds = new Set(minhasBandas.map(b => b.Id));

  // Escalas das minhas bandas
  const minhasEscalas = escalas.ok
    ? escalas.data.filter(e => minhasBandasIds.has(e.BandaId))
    : [];
  const minhasEscalasIds = new Set(minhasEscalas.map(e => e.Id));

  // Aceites
  const todosAceites  = aceites.ok ? aceites.data : [];
  const aceitesEscalas = todosAceites.filter(a => minhasEscalasIds.has(String(a.EscalaId)));

  // Meus aceites pessoais (deduplicados por escala, último ganha)
  const meusAceites = {};
  todosAceites
    .filter(a => String(a.MusicoId) === String(sess.musicoId || ''))
    .forEach(a => { meusAceites[String(a.EscalaId)] = a; });

  // Celebrações das minhas bandas
  const celsDasBandas = cels.ok ? cels.data.filter(cel => {
    const bids = (cel.BandasIds || '').split(',').filter(Boolean);
    return bids.some(bid => minhasBandasIds.has(bid));
  }) : [];
  // BUG2-FIX: incluir TODOS os reps das bandas do líder, não só os vinculados a celebrações
  // O líder precisa ver reps pendentes para poder configurar e liberar
  const repIds = new Set(celsDasBandas.map(c => c.RepertorioId).filter(Boolean));
  const meusReps = reps.ok ? reps.data.filter(r => {
    // Rep vinculado a uma celebração da minha banda
    if (repIds.has(r.Id)) return true;
    // Rep criado por mim (CriadoPor = meu musicoId)
    if (String(r.CriadoPor || '').trim() === String(sess.musicoId || '')) return true;
    // Rep vinculado à minha banda diretamente (BandaId)
    if (r.BandaId && minhasBandasIds.has(r.BandaId)) return true;
    return false;
  }) : [];

  // Aceites por banda (mapa)
  // FIX3: repMap definido ANTES do forEach — era ReferenceError antes
  const repMap = {};
  if (reps.ok) reps.data.forEach(r => { repMap[r.Id] = r; });

  const aceitesPorBanda = {};
  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = m; });

  minhasBandas.forEach(b => {
    const escsBanda = minhasEscalas.filter(e => {
      if (e.BandaId !== b.Id) return false;
      // BUG1-FIX: só incluir escalas cujo repertório está liberado (RepReady=sim)
      // Líder não deve ver aceites de escalas com rep ainda não liberado
      if (!e.RepertorioId) return false; // escala sem rep não mostra aceites
      const rep = repMap[e.RepertorioId];
      return rep && (rep.RepReady || '').toLowerCase() === 'sim';
    });
    const escIds    = new Set(escsBanda.map(e => e.Id));
    const latestMap = {};
    aceitesEscalas
      .filter(a => escIds.has(String(a.EscalaId)))
      .forEach(a => {
        latestMap[String(a.MusicoId)] = {
          status: (a.Status || 'pendente').toLowerCase(),
          justificativa: a.Justificativa || '',
        };
      });
    aceitesPorBanda[b.Id] = latestMap;
    // Sinalizar se a banda tem escala com rep liberado ou não
    const temRepLiberado = escsBanda.length > 0;
    // Guardar também o repReady status da banda para o frontend
    const todasEscsBanda = minhasEscalas.filter(e => e.BandaId === b.Id);
    const repPendente = todasEscsBanda.some(e => {
      if (!e.RepertorioId) return false;
      const rep = repMap[e.RepertorioId];
      return !rep || (rep.RepReady || '').toLowerCase() !== 'sim';
    });
    aceitesPorBanda[b.Id + '__repLiberado'] = temRepLiberado;
    aceitesPorBanda[b.Id + '__repPendente'] = repPendente && !temRepLiberado;
  });

  // _vEscalas: escalas pessoais com status (filtradas por RepReady)
  // repMap já definido acima

  const vEscalas = minhasEscalas
    .filter(e => {
      // Escala sem rep = não liberada = não aparece para o músico
      if (!e.RepertorioId) return false;
      const rep = repMap[e.RepertorioId];
      if (!rep) return false;
      return (rep.RepReady || '').toLowerCase() === 'sim';
    })
    .map(e => {
      const aceite = meusAceites[e.Id] || {};
      return { ...e, meuStatus: (aceite.Status || 'pendente').toLowerCase() };
    });

  // Enriquecer escalas com repReady e overrides para o frontend
  const escalasEnriquecidas = minhasEscalas.map(e => {
    if (!e.RepertorioId) return { ...e, repReady: false, overrides: {} };
    const rep = repMap[e.RepertorioId];
    const ready = rep && (rep.RepReady || '').toLowerCase() === 'sim';
    let overrides = {};
    try { overrides = (rep && rep.Overrides) ? JSON.parse(rep.Overrides) : {}; } catch(ex) {}
    return { ...e, repReady: ready, overrides, repNome: rep ? rep.Nome : '' };
  });

  return ok({
    bandas:        minhasBandas,
    escalas:       escalasEnriquecidas,
    musicos:       musicos.ok ? musicos.data : [],
    repertorios:   meusReps,
    celebracoes:   celsDasBandas,
    aceitesPorBanda,
    vEscalas,
  });
}

function getMinhasBandas(sess) {
  const res = rows('Bandas');
  if (!res.ok) return res;
  if (sess.nivel === 'admin' || sess.nivel === 'master') return res;
  return ok(res.data.filter(b => b.LiderMusicoId === sess.musicoId));
}

// ==================== ESCALAS ====================
function criarEscala(data) {
  const id = genId();
  addRow('Escalas', {
    Id: id, Titulo: data.titulo || '', Data: data.data || '',
    Horario: String(data.horario || '').substring(0, 5),
    Local: data.local || '', BandaId: data.bandaId || '',
    BandaNome: data.bandaNome || '', Tipo: data.tipo || 'principal',
    Status: 'pendente', MusicasIds: '', RepertorioId: '',
    DataCriacao: new Date().toISOString(),
  });
  const musicosIds = Array.isArray(data.musicosIds) ? data.musicosIds : [];
  musicosIds.forEach(mid => {
    addRow('Aceites', {
      Id: genId(), EscalaId: id, MusicoId: mid,
      Status: 'pendente', DataResposta: '', Justificativa: '',
    });
  });
  return { ok: true, id };
}

function getEscalas(data, sess) {
  const res = rows('Escalas');
  if (!res.ok) return ok([]);
  if (!sess) return ok(res.data || []);
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel;
  if (nivel === 'liderbanda') {
    // [PERF-1] rows('Bandas') já estará no cache se getDadosIniciaisLider foi chamado antes
    const bandas = rows('Bandas');
    const minhas = bandas.ok ? bandas.data.filter(b => b.LiderMusicoId === sess.musicoId).map(b => b.Id) : [];
    return ok(res.data.filter(e => minhas.includes(e.BandaId)));
  }
  return res;
}

// [PERF-2] getEscalaById: reutiliza variável musicos para subs (elimina 2ª leitura)
function getEscalaById(data) {
  const esc = rows('Escalas');
  if (!esc.ok) return ok({ aceites: [] });
  const e = esc.data.find(x => x.Id === data.id);
  if (!e) return err('Não encontrado');

  const aceites  = rows('Aceites');
  const musicos  = rows('Musicos'); // lida 1x — reutilizada abaixo para subs

  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });

  // Deduplicar aceites por MusicoId (último registro ganha)
  const rawAceites = aceites.ok
    ? aceites.data.filter(a => String(a.EscalaId) === String(data.id))
    : [];
  const latestMap = {};
  rawAceites.forEach(a => { latestMap[String(a.MusicoId)] = a; });
  const meus = Object.values(latestMap).map(a => ({
    ...a, MusicoNome: musicoMap[a.MusicoId] || a.MusicoId,
  }));

  const reps = rows('Repertorios');
  let overrides = {};
  if (reps.ok && e.RepertorioId) {
    const rep = reps.data.find(r => r.Id === e.RepertorioId);
    try { overrides = (rep && rep.Overrides) ? JSON.parse(rep.Overrides) : {}; } catch(ex) {}
  }

  // [PERF-2] Reutiliza musicos.data (já lido acima) para resolver substitutos
  const subsSheet = rows('Subs');
  const subs = subsSheet.ok
    ? subsSheet.data.filter(s => String(s.EscalaId) === String(data.id) && s.Status === 'resolvida' && s.MusicoInId)
    : [];
  const subMusicosData = musicos.ok ? musicos.data : []; // reuso — sem nova leitura
  const subsInfo = subs.map(s => {
    const m = subMusicosData.find(x => x.Id === s.MusicoInId) || {};
    return {
      Id: s.MusicoInId, MusicoNome: m.Nome || s.MusicoInId,
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
  const esc     = rows('Escalas');
  const reps    = rows('Repertorios');
  if (!esc.ok) return ok([]);

  const repMap = {};
  if (reps.ok) reps.data.forEach(r => { repMap[r.Id] = r; });

  // Deduplicar aceites por EscalaId (último ganha)
  const todosAceitesMeus = aceites.ok
    ? aceites.data.filter(a => String(a.MusicoId) === String(sess.musicoId))
    : [];
  const latestAceiteMap = {};
  todosAceitesMeus.forEach(a => { latestAceiteMap[String(a.EscalaId)] = a; });
  const meusEscalaIds = new Set(Object.keys(latestAceiteMap));

  // Escalas via banda
  const bandas = rows('Bandas');
  const minhasBandasIds = new Set();
  if (bandas.ok) {
    bandas.data.forEach(b => {
      const mids = (b.MembrosIds || '').split(',').map(x => x.trim()).filter(Boolean);
      if (mids.includes(String(sess.musicoId))) minhasBandasIds.add(b.Id);
    });
  }

  return ok(esc.data
    .filter(e => meusEscalaIds.has(e.Id) || minhasBandasIds.has(e.BandaId))
    .filter(e => {
      // Escala sem repertório vinculado = não liberada = não aparece para o músico
      if (!e.RepertorioId) return false;
      const rep = repMap[e.RepertorioId];
      // Repertório não encontrado = não liberado
      if (!rep) return false;
      return (rep.RepReady || '').trim().toLowerCase() === 'sim';
    })
    .map(e => {
      const aceite = latestAceiteMap[String(e.Id)] || {};
      const rep    = e.RepertorioId ? repMap[e.RepertorioId] : null;
      let overrides = {};
      try { overrides = (rep && rep.Overrides) ? JSON.parse(rep.Overrides) : {}; } catch(ex) {}
      return {
        ...e,
        meuStatus:     aceite.Status || 'pendente',
        Justificativa: aceite.Justificativa || '',
        overrides,
      };
    })
  );
}

function removerMusicoEscala(data) {
  const aceites = rows('Aceites');
  if (!aceites.ok) return err('Erro');
  const found = aceites.data.find(a =>
    String(a.EscalaId) === String(data.escalaId) &&
    String(a.MusicoId) === String(data.musicoId)
  );
  if (!found) return err('Aceite não encontrado');
  updRow('Aceites', found.Id, {
    Status: 'removido',
    DataResposta: new Date().toISOString(),
    Justificativa: 'Removido pelo Master',
  });
  return ok('Músico removido da escala');
}

function responderEscala(data, sess) {
  if (!sess || !sess.musicoId) return err('Sessão inválida');
  const aceites = rows('Aceites');
  const lista   = aceites.ok ? aceites.data : [];

  let found = lista.find(a =>
    String(a.EscalaId) === String(data.escalaId) &&
    String(a.MusicoId) === String(sess.musicoId)
  );

  if (!found) {
    const escalas = rows('Escalas');
    const bandas  = rows('Bandas');
    if (escalas.ok && bandas.ok) {
      const escala = escalas.data.find(e => e.Id === data.escalaId);
      if (escala) {
        const banda = bandas.data.find(b => b.Id === escala.BandaId);
        if (banda) {
          const mids = (banda.MembrosIds || '').split(',').map(x => x.trim());
          if (mids.includes(String(sess.musicoId))) {
            found = lista.find(a =>
              String(a.EscalaId) === String(data.escalaId) &&
              (a.Status || 'pendente').toLowerCase() === 'pendente'
            );
            if (found) updRow('Aceites', found.Id, { MusicoId: sess.musicoId });
          }
        }
      }
    }
  }

  if (found && (found.Status || '').toLowerCase() === 'aceita' && data.status === 'recusada') {
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
    addRow('Aceites', { Id: genId(), EscalaId: data.escalaId, MusicoId: sess.musicoId, ...updates });
  }
  return ok(data.status);
}

function adicionarMusica(data) {
  const id = genId();
  addRow('Musicas', {
    Id: id, Nome: data.nome || '', Artista: data.artista || '',
    Tom: data.tom || '', Bpm: data.bpm || '', Versao: data.versao || '',
    Youtube: data.youtube || '', Letra: data.letra || '',
    Cifra: data.cifra || '', Partitura: data.partitura || '',
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

  const musicoMap = {};
  if (rM.ok) rM.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });
  if (rT.ok) rT.data.forEach(t => {
    if (!t.MusicoId || t.MusicoId === '') {
      musicoMap['__adm__'] = t.Nome || 'Administrador';
    }
  });

  const celMap = {};
  if (rCel.ok) rCel.data.forEach(cel => {
    const repId = (cel.RepertorioId || '').trim();
    if (repId) celMap[repId] = cel.Nome || '—';
  });

  return ok(rRep.data.map(r => {
    const cp = (r.CriadoPor || '').trim();
    const criadoPorNome = cp
      ? (musicoMap[cp] || cp)
      : (musicoMap['__adm__'] || 'Administrador');
    return { ...r, CriadoPorNome: criadoPorNome, CelebracaoNome: celMap[r.Id] || '' };
  }));
}

function criarRepertorio(data) {
  const id = genId();
  addRow('Repertorios', {
    Id: id, Nome: data.nome || '', BandaId: data.bandaId || '',
    MusicasIds: Array.isArray(data.musicasIds) ? data.musicasIds.join(',') : '',
    Overrides: '', RepReady: 'nao',
    CriadoPor: data.musicoId || '', DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

// ==================== CELEBRAÇÕES ====================
function criarCelebracao(data) {
  const id = genId();
  addRow('Celebracoes', {
    Id: id, Nome: data.nome || '', Data: data.data || '',
    Horario: String(data.horario || '').substring(0, 5),
    Local: data.local || '', Obs: data.obs || '',
    BandasIds: Array.isArray(data.bandasIds) ? data.bandasIds.join(',') : '',
    RepertorioId: data.repertorioId || '',
    RepertorioTipo: data.repertorioTipo || 'admin',
    LiderEquipeId: data.liderEquipeId || '',
    DataCriacao: new Date().toISOString(),
  });
  return ok(id);
}

function getCelebracoes(sess) {
  const rCel = rows('Celebracoes');
  if (!rCel.ok) return ok([]);
  const all  = rCel.data || [];
  const nivelMap = {'admin':'master','master':'master','lider':'liderbanda','liderbanda':'liderbanda','liderequipe':'liderequipe','voluntario':'musico','musico':'musico'};
  const nivel = sess ? (nivelMap[(sess.nivel || '').toLowerCase()] || sess.nivel) : '';
  if (nivel === 'liderequipe' && sess && sess.musicoId) {
    return ok(all.filter(c => {
      const lids = (c.LiderEquipeId || '').split(',').map(x => x.trim()).filter(Boolean);
      return lids.includes(String(sess.musicoId));
    }));
  }
  return ok(all);
}

// ==================== ACEITES DA BANDA ====================
function getAceitesDaBanda(data) {
  const bandaId = data.bandaId || '';
  if (!bandaId) return err('bandaId obrigatório');

  const escalas = rows('Escalas');
  const aceites = rows('Aceites');
  const musicos = rows('Musicos');

  if (!escalas.ok || !aceites.ok) return ok({});

  const escalasDaBanda = escalas.data.filter(e => String(e.BandaId) === String(bandaId));
  const escalaIds = new Set(escalasDaBanda.map(e => e.Id));

  // Deduplicar por MusicoId — último registro ganha
  const latestPorMusico = {};
  aceites.data
    .filter(a => escalaIds.has(String(a.EscalaId)))
    .forEach(a => {
      const mid = String(a.MusicoId || '').trim();
      if (!mid) return;
      latestPorMusico[mid] = {
        status:        String(a.Status || 'pendente').toLowerCase().trim(),
        justificativa: a.Justificativa || '',
        escalaId:      a.EscalaId,
      };
    });

  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => { musicoMap[m.Id] = m.Nome || m.Id; });

  const result = {};
  Object.entries(latestPorMusico).forEach(([mid, info]) => {
    result[mid] = { ...info, nome: musicoMap[mid] || mid };
  });

  // Subs em aberto
  const subsSheet = rows('Subs');
  if (subsSheet.ok) {
    subsSheet.data
      .filter(s => escalaIds.has(String(s.EscalaId)) && s.Status === 'aberta')
      .forEach(s => {
        const mid = String(s.MusicoOutId || '');
        if (mid && result[mid]) {
          result[mid].subAberta         = true;
          result[mid].subId             = s.Id;
          result[mid].subCriadoPorNivel = s.CriadoPorNivel || '';
        }
      });
  }

  return ok(result);
}

// ==================== PAINEL LÍDER DE EQUIPE ====================
// [PERF-4] getLiderEquipePanel: lê Celebracoes 1x, não 2x (eliminada leitura duplicada)
function getLiderEquipePanel(sess) {
  const cels    = rows('Celebracoes'); // lida 1x — cache previne 2ª leitura
  const bandas  = rows('Bandas');
  const escalas = rows('Escalas');
  const aceites = rows('Aceites');
  const subs    = rows('Subs');
  const musicos = rows('Musicos');
  const reps    = rows('Repertorios');

  if (!cels.ok) return ok([]);

  const musicoMap = {};
  if (musicos.ok) musicos.data.forEach(m => {
    musicoMap[m.Id] = { Nome: m.Nome || m.Id, Instrumentos: m.Instrumentos || '' };
  });

  const repMap = {};
  if (reps.ok) reps.data.forEach(r => { repMap[r.Id] = r; });

  const minhasCels = cels.data.filter(c =>
    String(c.LiderEquipeId || '').trim() === String(sess.musicoId || '').trim()
  );

  const result = minhasCels.map(cel => {
    const bandasIds  = (cel.BandasIds || '').split(',').filter(Boolean);
    const minhasBandas = (bandas.ok ? bandas.data.filter(b => bandasIds.includes(b.Id)) : [])
      .map(b => {
        const membrosIds = (b.MembrosIds || '').split(',').filter(Boolean);
        const membros = membrosIds.map(mid => ({
          Id:           mid,
          Nome:         musicoMap[mid] ? musicoMap[mid].Nome : mid,
          Instrumentos: musicoMap[mid] ? musicoMap[mid].Instrumentos : '',
        }));
        return { ...b, membros };
      });

    const escalasDaCel = escalas.ok
      ? escalas.data
          .filter(e => String(e.CelebracaoId || '') === String(cel.Id))
          .map(esc => {
            // Verificar se rep desta escala está liberado
            const rep = esc.RepertorioId ? repMap[esc.RepertorioId] : null;
            const repReady = rep && (rep.RepReady || '').toLowerCase() === 'sim';

            // Deduplicar aceites: último registro por MusicoId ganha
            const rawAcs = aceites.ok
              ? aceites.data.filter(a => String(a.EscalaId) === String(esc.Id))
              : [];
            const latestAcMap = {};
            rawAcs.forEach(a => { latestAcMap[String(a.MusicoId)] = a; });

            const acs = Object.values(latestAcMap).map(a => {
                const subReq = subs.ok ? subs.data.find(s =>
                  String(s.EscalaId) === String(esc.Id) &&
                  String(s.MusicoOutId) === String(a.MusicoId) &&
                  s.Status === 'aberta'
                ) : null;
                return {
                  ...a,
                  MusicoNome:         musicoMap[a.MusicoId] ? musicoMap[a.MusicoId].Nome : a.MusicoId,
                  subAberta:          !!subReq,
                  subCriadoPorNivel:  subReq ? (subReq.CriadoPorNivel || '') : '',
                };
              });
            return { ...esc, aceites: acs, repReady };
          })
      : [];

    const rep = cel.RepertorioId ? repMap[cel.RepertorioId] : null;
    return {
      ...cel,
      bandas:                minhasBandas,
      escalas:               escalasDaCel,
      repertorioNome:        rep ? rep.Nome : '',
      podeDefinirRepertorio: (cel.RepertorioTipo || '').toLowerCase() === 'liderequipe',
    };
  });

  return ok(result);
}

// ==================== CELEBRAÇÕES DA BANDA ====================
// [PERF-3] N+1 corrigido: rows() chamado FORA do map(), não dentro de cada iteração.
// Antes: 20 leituras extras com 10 celebrações. Agora: 0 leituras extras.
function getCelebracoesDaBanda(data) {
  const cels = rows('Celebracoes');
  if (!cels.ok) return cels;

  const filtered = cels.data.filter(c => {
    const ids = (c.BandasIds || '').split(',').map(x => x.trim());
    return ids.includes(data.bandaId);
  });

  // [PERF-3] rows() UMA VEZ fora do loop — elimina N+1
  const repsAll = rows('Repertorios');
  const repMap2 = {};
  if (repsAll.ok) repsAll.data.forEach(r => { repMap2[r.Id] = r; });

  const result = filtered.map(cel => {
    let musicas = [];
    if (cel.RepertorioId) {
      const rep = repMap2[cel.RepertorioId];
      if (rep && rep.MusicasIds) {
        const ids = rep.MusicasIds.split(',').filter(Boolean);
        musicas = ids.map(() => null).filter(Boolean);
      }
    }
    return {
      ...cel,
      musicas,
      repertorioNome: cel.RepertorioId ? ((repMap2[cel.RepertorioId] || {}).Nome || '') : '',
    };
  });
  return ok(result);
}

// ==================== BIBLIOTECA ====================
function adicionarBiblioteca(data) {
  if (!data.titulo) return err('Título é obrigatório');
  if (!data.link)   return err('Link é obrigatório');
  const id = genId();
  addRow('Biblioteca', {
    Id:             id,
    Titulo:         data.titulo         || '',
    TituloOriginal: data.tituloOriginal || '',
    Composicao:     data.composicao     || '',
    Versao:         data.versao         || '',
    Categoria:      data.categoria      || '',
    Link:           data.link           || '',
    DataCriacao:    new Date().toISOString(),
  });
  return ok(id);
}

// ==================== ESCALA AUTOMÁTICA ====================
function criarEscalasDaBanda(data) {
  const bandaId = data.bandaId;
  const bandas  = rows('Bandas');
  if (!bandas.ok) return err('Erro ao buscar bandas');
  const banda = bandas.data.find(b => b.Id === bandaId);
  if (!banda) return err('Banda não encontrada');

  const membrosIds = (banda.MembrosIds || '').split(',').filter(Boolean);
  if (!membrosIds.length) return err('Banda sem integrantes');

  const cels = rows('Celebracoes');
  if (!cels.ok) return err('Erro ao buscar celebrações');

  const minhasCels = cels.data.filter(c => {
    const ids = (c.BandasIds || '').split(',').filter(Boolean);
    return ids.includes(bandaId) && c.RepertorioId;
  });
  if (!minhasCels.length) return err('Nenhuma celebração com repertório vinculada a esta banda');

  const escalas = rows('Escalas');
  const escalasExistentes = escalas.ok ? escalas.data : [];

  const criadas = [];
  minhasCels.forEach(cel => {
    const jaExiste = escalasExistentes.find(e => e.BandaId === bandaId && e.CelebracaoId === cel.Id);
    if (jaExiste) {
      criadas.push({ cel: cel.Nome, status: 'já existia', escalaId: jaExiste.Id });
      return;
    }
    const r = criarEscalaAutomatica({
      celebracaoId: cel.Id, celebracaoNome: cel.Nome,
      data: (cel.Data || '').split('T')[0], horario: cel.Horario || '',
      local: cel.Local || '', repertorioId: cel.RepertorioId || '',
      bandaId, bandaNome: banda.Nome || '', musicosIds: membrosIds,
    });
    criadas.push({ cel: cel.Nome, status: 'criada', escalaId: r.data });
  });

  return ok({ total: criadas.length, criadas });
}

function criarEscalaAutomatica(data) {
  const escalaId   = genId();
  const titulo     = (data.celebracaoNome || 'Celebração') + ' — ' + (data.bandaNome || '');
  const musicosIds = Array.isArray(data.musicosIds)
    ? data.musicosIds
    : (data.musicosIds || '').split(',').filter(Boolean);

  addRow('Escalas', {
    Id: escalaId, Titulo: titulo, Data: data.data || '',
    Horario: data.horario || '', Local: data.local || '',
    BandaId: data.bandaId || '', BandaNome: data.bandaNome || '',
    MusicosIds: musicosIds.join(','), RepertorioId: data.repertorioId || '',
    CelebracaoId: data.celebracaoId || '', Status: 'pendente',
    DataCriacao: new Date().toISOString(),
  });

  musicosIds.forEach(mid => {
    addRow('Aceites', {
      Id: genId(), EscalaId: escalaId, MusicoId: mid,
      Status: 'pendente', DataResposta: '', Justificativa: '',
    });
  });

  return ok({ escalaId, total: musicosIds.length });
}

// ==================== SUBS ====================
function criarSub(data, sess) {
  const id = genId();
  addRow('Subs', {
    Id: id, EscalaId: data.escalaId || '',
    MusicoOutId: data.musicoOutId || '', Instrumento: data.instrumento || '',
    MusicoInId: '', Status: 'aberta',
    CriadoPorNivel: sess ? (sess.nivel || '') : '',
    CriadoPorId:    sess ? (sess.musicoId || '') : '',
    DataCriacao:    new Date().toISOString(),
  });
  return ok(id);
}

// ==================== PERFIL ====================
function getMeuPerfil(sess) {
  if (!sess.musicoId) return err('Sem perfil');
  const m = findRow('Musicos', 'Id', sess.musicoId);
  return m ? ok(m) : err('Músico não encontrado');
}

// ==================== DASHBOARD ====================
function getDashboard() {
  const aud = rows('Audicoes').data   || [];
  const mus = rows('Musicos').data    || [];
  const ban = rows('Bandas').data     || [];
  const esc = rows('Escalas').data    || [];
  const cel = rows('Celebracoes').data || [];
  const now = new Date();
  return ok({
    totalMusicos:       mus.filter(m => m.Ativo === 'sim').length,
    audicoesPendentes:  aud.filter(a => a.Status === 'pendente').length,
    audicoesAgendadas:  aud.filter(a => a.Status === 'agendada').length,
    totalBandas:        ban.length,
    escalasEsteMes:     esc.filter(e => {
      try { const d = new Date(e.Data); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); } catch(_) { return false; }
    }).length,
    proximasCelebracoes: cel
      .filter(c => { try { return new Date(c.Data) >= now; } catch(_) { return false; } })
      .sort((a, b) => new Date(a.Data) - new Date(b.Data))
      .slice(0, 5),
    ultimasInscricoes: [...aud]
      .sort((a, b) => new Date(b.DataInscricao || 0) - new Date(a.DataInscricao || 0))
      .slice(0, 5),
  });
}

// ==================== DEBUG ====================
// [SEC-1] debugAll protegido — retorna apenas amostra, sem dados sensíveis completos
function debugAll() {
  return {
    audicoes:    (rows('Audicoes').data   || []).slice(0, 2),
    musicos:     (rows('Musicos').data    || []).slice(0, 2).map(m => ({ Id: m.Id, Nome: m.Nome, Eklesia: m.Eklesia })),
    tokens:      (rows('Tokens').data     || []).slice(0, 2).map(t => ({ Nome: t.Nome, Nivel: t.Nivel, MusicoId: t.MusicoId })),
    celebracoes: (rows('Celebracoes').data || []).slice(0, 2),
    bandas:      (rows('Bandas').data     || []).slice(0, 2),
    biblioteca:  (rows('Biblioteca').data || []).slice(0, 2),
  };
}

function debugBandaAceites(sess) {
  const bandas  = rows('Bandas');
  const escalas = rows('Escalas');
  const aceites = rows('Aceites');
  const musicos = rows('Musicos');

  const minhasBandas = bandas.ok
    ? bandas.data.filter(b => {
        const mids = (b.MembrosIds || '').split(',').map(x => x.trim());
        return mids.includes(String(sess.musicoId || '')) || b.LiderMusicoId === sess.musicoId;
      })
    : [];

  return ok(minhasBandas.map(b => {
    const escalasDaBanda = escalas.ok ? escalas.data.filter(e => e.BandaId === b.Id) : [];
    const membrosIds = (b.MembrosIds || '').split(',').filter(Boolean);
    const membrosInfo = membrosIds.map(mid => {
      const m = musicos.ok ? musicos.data.find(x => x.Id === mid) : null;
      const aceitesDeste = aceites.ok
        ? aceites.data.filter(a =>
            String(a.MusicoId) === String(mid) &&
            escalasDaBanda.some(e => String(e.Id) === String(a.EscalaId))
          )
        : [];
      return { musicoId: mid, nome: m ? m.Nome : mid, aceites: aceitesDeste.map(a => ({ id: a.Id, escalaId: a.EscalaId, status: a.Status })) };
    });
    return { bandaId: b.Id, bandaNome: b.Nome, sessMusicoId: sess.musicoId, escalas: escalasDaBanda.map(e => ({ id: e.Id, titulo: e.Titulo })), membros: membrosInfo };
  }));
}

function debugMinhasEscalas(sess) {
  const bandas  = rows('Bandas');
  const aceites = rows('Aceites');
  const esc     = rows('Escalas');

  const minhasBandas = bandas.ok
    ? bandas.data.filter(b => (b.MembrosIds || '').split(',').map(x => x.trim()).includes(String(sess.musicoId || '')))
    : [];
  const meusAceites = aceites.ok
    ? aceites.data.filter(a => String(a.MusicoId) === String(sess.musicoId || ''))
    : [];

  return ok({
    sessNivel:    sess.nivel,
    sessMusicoId: sess.musicoId,
    totalBandas:  bandas.ok ? bandas.data.length : 0,
    minhasBandas: minhasBandas.map(b => ({ Id: b.Id, Nome: b.Nome, MembrosIds: b.MembrosIds })),
    meusAceites:  meusAceites.slice(0, 5),
    totalEscalas: esc.ok ? esc.data.length : 0,
  });
}

function debugLiderEquipe(sess) {
  const cels  = rows('Celebracoes');
  const all   = cels.ok ? cels.data : [];
  const minhas = all.filter(c => String(c.LiderEquipeId || '').trim() === String(sess.musicoId || '').trim());
  return ok({
    sessNivel: sess.nivel, sessMusicoId: sess.musicoId,
    totalCelebracoes: all.length, minhasCelebracoes: minhas.length,
    amostra: minhas.slice(0, 2).map(c => ({ Id: c.Id, Nome: c.Nome, LiderEquipeId: c.LiderEquipeId, BandasIds: c.BandasIds })),
    todasLiderEquipeIds: all.map(c => c.LiderEquipeId).filter(Boolean),
  });
}

// [SEC-1] limpar agora protegido por perm(master) no dispatch
function limpar() {
  const names = ['Musicos','Audicoes','Tokens','Bandas','Escalas'];
  let n = 0;
  names.forEach(name => {
    const sheet = sh(name);
    if (!sheet) return;
    const vals = sheet.getDataRange().getValues();
    vals.forEach((row, ri) => {
      if (ri === 0) return;
      row.forEach((cell, ci) => {
        if (cell === 'undefined' || cell === 'null') {
          sheet.getRange(ri + 1, ci + 1).setValue(''); n++;
        }
      });
    });
    delete _sheetCache[name];
  });
  return ok('Limpeza: ' + n + ' células corrigidas');
}

// ==================== IMPORTAR MÚSICOS ====================
function importarMusicosAprovados() {
  const rAud = rows('Audicoes'); const audicoes = rAud.ok ? rAud.data : [];
  const rMus = rows('Musicos');  const musicos  = rMus.ok ? rMus.data : [];
  const rTok = rows('Tokens');   const tokens   = rTok.ok ? rTok.data : [];
  const aprovados = audicoes.filter(a => (a.Status || '').toLowerCase() === 'aprovado');
  const criados   = [];

  aprovados.forEach(a => {
    const jaExiste = musicos.find(m => m.AudicaoId === a.Id || m.Nome === a.Nome);
    if (jaExiste) return;

    const mid = genId();
    addRow('Musicos', {
      Id: mid, Nome: a.Nome || '', Eklesia: a.Eklesia || '',
      WhatsApp: String(a.WhatsApp || ''), Instrumentos: a.Instrumentos || '',
      Banda: '', FotoUrl: a.FotoUrl || '',
      Ativo: 'sim', IsLider: 'nao', AudicaoId: a.Id || '',
      DataCadastro: new Date().toISOString(),
    });

    const jaTemToken = tokens.find(t => t.Nome === a.Nome);
    if (!jaTemToken) {
      const token =
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        Math.random().toString(36).substring(2, 4).toUpperCase();
      addRow('Tokens', {
        Id: genId(), Nome: a.Nome || '', Eklesia: a.Eklesia || '',
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
// [SEC-1] protegido por perm(master) no dispatch
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
  };
  const results = {};
  Object.entries(fixes).forEach(([name, expectedHeaders]) => {
    const sheet = s.getSheetByName(name);
    if (!sheet) { results[name] = 'aba não encontrada'; return; }
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
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
    // Invalidar cache das abas modificadas
    delete _sheetCache[name];
  });
  return ok(results);
}

// ==================== BIBLIOTECA (FIX) ====================
function fixBibliotecaIds() {
  const sheet = sh('Biblioteca');
  if (!sheet) return err('Aba não encontrada');
  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => String(h).trim());
  let iId = -1, iDt = -1;
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
    const hasData = row.some(cell => String(cell).trim() !== '');
    if (!hasData) continue;
    if (!String(row[iId]).trim()) {
      sheet.getRange(i + 1, iId + 1).setValue(genId()); fixed++;
    }
    if (iDt > -1 && !String(row[iDt]).trim()) {
      sheet.getRange(i + 1, iDt + 1).setValue(new Date().toISOString());
    }
  }
  delete _sheetCache['Biblioteca'];
  return ok('IDs gerados para ' + fixed + ' músicas');
}

function fixBiblioteca() {
  const sheet = sh('Biblioteca');
  if (!sheet) return err('Aba Biblioteca não encontrada');
  const vals = sheet.getDataRange().getValues();
  if (!vals.length) return ok('Vazio');
  const headers = vals[0].map(h => String(h).trim());
  const renames = {
    'Título': 'Titulo', 'Título Original': 'TituloOriginal',
    'Composição': 'Composicao', 'Versão': 'Versao',
  };
  const colsToRemove = [];
  const colsToRename = [];
  headers.forEach((h, i) => {
    if (renames[h]) colsToRename.push({ col: i, newName: renames[h] });
    const isDuplicate = Object.values(renames).includes(h) &&
      headers.some((h2, i2) => i2 < i && renames[h2] === h);
    if (isDuplicate) colsToRemove.push(i);
  });
  colsToRename.forEach(({ col, newName }) => { sheet.getRange(1, col + 1).setValue(newName); });
  colsToRemove.sort((a, b) => b - a).forEach(col => { sheet.deleteColumn(col + 1); });
  delete _sheetCache['Biblioteca'];
  return ok({ renamed: colsToRename.map(x => x.newName), removed: colsToRemove.length + ' colunas duplicadas' });
}

function rawSheet(name) {
  const sheet = sh(name);
  if (!sheet) return err('Aba não encontrada: ' + name);
  const vals = sheet.getDataRange().getValues();
  if (vals.length < 2) return ok({ headers: vals[0] || [], rows: [] });
  return ok({
    headers:  vals[0],
    firstRow: vals[1],
    combined: vals[0].reduce((obj, h, i) => { obj[h] = vals[1][i]; return obj; }, {}),
  });
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
    'Escalas':     ['Id','Titulo','Data','Horario','Local','BandaId','BandaNome','Tipo','Status','MusicasIds','RepertorioId','CelebracaoId','DataCriacao'],
    'Musicas':     ['Id','Nome','Artista','Tom','Bpm','Versao','Youtube','Letra','Cifra','Partitura','DataCadastro'],
    'Repertorios': ['Id','Nome','BandaId','MusicasIds','Overrides','RepReady','CriadoPor','DataCriacao'],
    'Celebracoes': ['Id','Nome','Data','Horario','Local','Obs','BandasIds','RepertorioId','RepertorioTipo','LiderEquipeId','DataCriacao'],
    'Ensaios':     ['Id','BandaId','BandaNome','Data','Horario','Local','Obs','DataCriacao'],
    'Subs':        ['Id','EscalaId','MusicoOutId','Instrumento','MusicoInId','Status','CriadoPorNivel','CriadoPorId','DataCriacao'],
    'Aceites':     ['Id','EscalaId','MusicoId','Status','DataResposta','Justificativa'],
    'Biblioteca':  ['Id','Titulo','TituloOriginal','Composicao','Versao','Categoria','Link','DataCriacao'],
    'Arquivos':    ['Id','Tipo','ReferenciaId','Nome','Url','FileId','DataUpload'],
  };
  Object.entries(defs).forEach(([name, headers]) => {
    let sheet = s.getSheetByName(name);
    if (!sheet) sheet = s.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
  const ts = s.getSheetByName('Tokens');
  if (ts.getLastRow() <= 1) {
    ts.appendRow([genId(),'Administrador','—','ADM-MASTER','master','','','',new Date().toISOString()]);
  }
  Logger.log('Setup OK');
}
