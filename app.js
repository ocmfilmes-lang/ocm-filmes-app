// OCM Filmes — quadros estilo Trello / ClickUp / Monday, com dados na nuvem (Supabase)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { abertura } from './abertura.js?v=23';

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(Number(v) || 0);
const moneyInput = (v) => (v === '' || v == null ? '' : (Number(v) || 0).toFixed(2).replace('.', ','));
function parseMoney(s) {
  s = String(s ?? '').trim().replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s) || 0;
}
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const iniciais = (nome) => String(nome || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDate(d); };
const diffDays = (iso) => Math.round((parseISO(iso) - parseISO(today())) / 86400000);
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}` + (Number(y) !== new Date().getFullYear() ? `/${y.slice(2)}` : ''); };
const fmtDateFull = (iso) => (iso ? parseISO(iso).toLocaleDateString('pt-BR') : '');
const monthLabel = (ym) => cap(parseISO(ym + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
const shiftMonth = (ym, n) => { const d = parseISO(ym + '-01'); d.setMonth(d.getMonth() + n); return isoDate(d).slice(0, 7); };

const agoraHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function prazoBadge(iso, done, hora) {
  if (!iso) return '';
  const h = hora ? ' ' + hora : '';
  if (done) return `<span class="badge ok">✓ ${fmtDate(iso)}${h}</span>`;
  const n = diffDays(iso);
  if (n < 0) return `<span class="badge danger">${fmtDate(iso)}${h} · atrasado</span>`;
  if (n === 0) return `<span class="badge ${hora && hora < agoraHHMM() ? 'danger' : 'warn'}">Hoje${h}</span>`;
  if (n === 1) return `<span class="badge warn">Amanhã${h}</span>`;
  if (n <= 7) return `<span class="badge info">${fmtDate(iso)}${h}</span>`;
  return `<span class="badge">${fmtDate(iso)}${h}</span>`;
}
function prazoTxt(iso, done, hora) {
  if (!iso) return '';
  const h = hora ? ' ' + hora : '';
  if (done) return `<span class="kd ok">✓ ${fmtDate(iso)}</span>`;
  const n = diffDays(iso);
  if (n < 0) return `<span class="kd late">${fmtDate(iso)}${h} · atrasado</span>`;
  if (n === 0) return `<span class="kd ${hora && hora < agoraHHMM() ? 'late' : 'hoje'}">Hoje${h}</span>`;
  if (n === 1) return `<span class="kd prox">Amanhã${h}</span>`;
  return `<span class="kd">${fmtDate(iso)}${h}</span>`;
}
const quando = (c) => (c.prazo || '9999-99-99') + ' ' + (c.hora || '99:99');

/* =========================================================
   Cores e ícones
   ========================================================= */
const CORES = [
  { nome: 'Cinza', v: '#7c818c' }, { nome: 'Roxo', v: '#8a5cf5' }, { nome: 'Azul', v: '#2f7cf6' },
  { nome: 'Ciano', v: '#0ea5b7' }, { nome: 'Verde', v: '#1fa56a' }, { nome: 'Amarelo', v: '#d9a400' },
  { nome: 'Laranja', v: '#f07c12' }, { nome: 'Rosa', v: '#e2489a' }, { nome: 'Vermelho', v: '#e2483d' },
];
const COR = Object.fromEntries(CORES.map((c) => [c.nome, c.v]));
const LEMBRETES = [{ value: '', label: 'Sem lembrete' }, { value: '0', label: 'Na hora' }, { value: '5', label: '5 min antes' }, { value: '15', label: '15 min antes' }, { value: '30', label: '30 min antes' }, { value: '60', label: '1 hora antes' }, { value: '120', label: '2 horas antes' }, { value: '1440', label: '1 dia antes' }];
const PRIO = { Urgente: COR.Vermelho, Alta: COR.Laranja, Média: COR.Azul, Baixa: COR.Cinza };
const corDe = (s) => CORES[1 + (hash(s) % (CORES.length - 1))].v;

const ICON = {
  home: '<svg class="i" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  boards: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7v8M12 7v4M16 7v10"/></svg>',
  money: '<svg class="i" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  gear: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  mac: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  text: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
};

/* =========================================================
   Dados
   ========================================================= */
const col = (nome, cor, extra = {}) => ({ id: uid(), nome, cor: COR[cor], ...extra });
const MODELOS = {
  simples: { nome: 'Simples (A fazer · Fazendo · Feito)', tipo: 'livre', cols: () => [col('A fazer', 'Cinza'), col('Fazendo', 'Azul'), col('Feito', 'Verde', { concluida: true })] },
  producao: { nome: 'Produção de vídeo', tipo: 'livre', cols: () => [col('A iniciar', 'Cinza'), col('Pré-produção', 'Roxo'), col('Captação', 'Azul'), col('Edição', 'Ciano'), col('Aprovação', 'Laranja'), col('Ajustes', 'Rosa'), col('Entregue', 'Verde', { concluida: true })] },
  orcamentos: { nome: 'Orçamentos', tipo: 'orcamentos', cols: () => [col('Rascunho', 'Cinza'), col('Enviado', 'Azul'), col('Negociando', 'Laranja'), col('Aprovado', 'Verde', { concluida: true }), col('Recusado', 'Vermelho', { concluida: true })] },
};

function novoCard(quadro, colunaId, titulo, extra = {}, ordem = 0) {
  return {
    id: uid(), quadroId: quadro.id, colunaId, ordem, titulo,
    descricao: '', clienteId: '', prazo: '', prioridade: '', responsavel: '', link: '',
    checklist: [], hora: '', lembreteMin: '', numero: '', itens: [], desconto: 0, data: '', validade: '', condicoes: '', lancado: false,
    criadoEm: new Date().toISOString(), ...extra,
  };
}

/* ---------- nuvem (Supabase) ---------- */
const SUPA_URL = 'https://vckdipuixrsozkqlwzlf.supabase.co';
// chave pública (anon): só funciona junto com o login e as regras de acesso do banco
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja2RpcHVpeHJzb3prcWx3emxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0MjEzMDAsImV4cCI6MjEwOTk5NzMwMH0.Gubeo8H9RbiVUALk2gEt7qT4DlJ57pYE4w0E6calfoY';
const sb = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const TABELAS = {
  clientes: { id: 'id', nome: 'nome', contato: 'contato', email: 'email', telefone: 'telefone', obs: 'obs' },
  quadros: { id: 'id', nome: 'nome', cor: 'cor', tipo: 'tipo', posicao: 'posicao', colunas: 'colunas' },
  cards: {
    id: 'id', quadroId: 'quadro_id', colunaId: 'coluna_id', ordem: 'ordem', titulo: 'titulo', descricao: 'descricao',
    clienteId: 'cliente_id', prazo: 'prazo', prioridade: 'prioridade', responsavel: 'responsavel', link: 'link',
    checklist: 'checklist', numero: 'numero', itens: 'itens', desconto: 'desconto', data: 'data', validade: 'validade',
    condicoes: 'condicoes', lancado: 'lancado', hora: 'hora', lembreteMin: 'lembrete_min',
  },
  lancamentos: { id: 'id', tipo: 'tipo', descricao: 'descricao', valor: 'valor', data: 'data', categoria: 'categoria', clienteId: 'cliente_id', pago: 'pago', cardId: 'card_id' },
};
const ORDEM = ['clientes', 'quadros', 'cards', 'lancamentos'];
const ANULAVEIS = new Set(['cliente_id', 'prazo', 'data', 'validade', 'card_id', 'numero', 'hora', 'lembrete_min']);
const NUMEROS = new Set(['desconto', 'valor', 'ordem', 'posicao']);
const estavel = (v) => (Array.isArray(v) ? `[${v.map(estavel).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + estavel(v[k])).join(',')}}` : JSON.stringify(v ?? null));

let sessao = null;      // login atual
let ws = null;          // workspace (OCM Filmes)
let carregado = false;
let db = { clientes: [], quadros: [], cards: [], lancamentos: [] };
let snap = { clientes: new Map(), quadros: new Map(), cards: new Map(), lancamentos: new Map() };
let syncEstado = 'ok';  // ok | salvando | erro

function paraLinha(nome, o) {
  const r = { workspace_id: ws };
  for (const [k, c] of Object.entries(TABELAS[nome])) {
    let v = o[k];
    if (v === undefined) continue;
    if (ANULAVEIS.has(c) && (v === '' || v == null)) v = null;
    else if (c === 'lembrete_min') v = Number(v);
    if (NUMEROS.has(c)) v = Number(v) || 0;
    r[c] = v;
  }
  return r;
}
function deLinha(nome, r) {
  const o = {};
  for (const [k, c] of Object.entries(TABELAS[nome])) {
    let v = r[c];
    if (ANULAVEIS.has(c) && v == null) v = '';
    else if (c === 'hora') v = String(v).slice(0, 5);
    else if (c === 'lembrete_min') v = String(v);
    if (NUMEROS.has(c)) v = Number(v) || 0;
    o[k] = v;
  }
  if (r.criado_em) o.criadoEm = r.criado_em;
  return o;
}
const assinatura = (nome, o) => estavel(paraLinha(nome, o));

function marcarSync(estado) {
  syncEstado = estado;
  const el = $('#sync');
  if (el) { el.className = 'sync ' + estado; el.title = { ok: 'Tudo salvo', salvando: 'Salvando…', erro: 'Sem conexão — tentando de novo' }[estado]; }
}

let syncTimer = null, syncando = false, syncDeNovo = false;
function save() { marcarSync('salvando'); clearTimeout(syncTimer); syncTimer = setTimeout(sincronizar, 300); }
function temPendente() {
  return ORDEM.some((n) => db[n].length !== snap[n].size || db[n].some((o) => snap[n].get(o.id) !== assinatura(n, o)));
}
async function sincronizar() {
  if (!ws) return;
  if (syncando) { syncDeNovo = true; return; }
  syncando = true;
  try {
    // limpa referências a coisas que foram apagadas
    const cardIds = new Set(db.cards.map((c) => c.id)), cliIds = new Set(db.clientes.map((c) => c.id)), qIds = new Set(db.quadros.map((q) => q.id));
    db.cards = db.cards.filter((c) => qIds.has(c.quadroId));
    db.cards.forEach((c) => { if (c.clienteId && !cliIds.has(c.clienteId)) c.clienteId = ''; });
    db.lancamentos.forEach((l) => { if (l.cardId && !cardIds.has(l.cardId)) l.cardId = ''; if (l.clienteId && !cliIds.has(l.clienteId)) l.clienteId = ''; });

    const mudou = {}, sumiu = {};
    for (const n of ORDEM) {
      const atual = new Map(db[n].map((o) => [o.id, assinatura(n, o)]));
      mudou[n] = [...atual].filter(([id, a]) => snap[n].get(id) !== a);
      sumiu[n] = [...snap[n].keys()].filter((id) => !atual.has(id));
    }
    for (const n of ORDEM) {
      if (!mudou[n].length) continue;
      const linhas = mudou[n].map(([id]) => paraLinha(n, db[n].find((o) => o.id === id)));
      const { error } = await sb.from(n).upsert(linhas);
      if (error) throw error;
      mudou[n].forEach(([id, a]) => snap[n].set(id, a));
    }
    for (const n of [...ORDEM].reverse()) {
      if (!sumiu[n].length) continue;
      const { error } = await sb.from(n).delete().in('id', sumiu[n]);
      if (error) throw error;
      sumiu[n].forEach((id) => snap[n].delete(id));
    }
    marcarSync('ok');
  } catch (e) {
    console.error('sincronizar', e);
    marcarSync('erro');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sincronizar, 5000);
  } finally {
    syncando = false;
    if (syncDeNovo) { syncDeNovo = false; sincronizar(); }
  }
}

async function carregarTudo() {
  const novo = {};
  for (const n of ORDEM) {
    const { data, error } = await sb.from(n).select('*').eq('workspace_id', ws);
    if (error) throw error;
    novo[n] = data.map((r) => deLinha(n, r));
  }
  novo.quadros.sort((a, b) => a.posicao - b.posicao);
  db = novo;
  const { data: rs } = await sb.from('resumos').select('*').eq('workspace_id', ws).order('criado_em', { ascending: false }).limit(5);
  resumos = rs || [];
  await carregarTempos();
  await carregarMac().catch(() => {});
  for (const n of ORDEM) snap[n] = new Map(db[n].map((o) => [o.id, assinatura(n, o)]));
  carregado = true;
}

let canal = null;
let resumos = [];
let tempos = new Map(); // card_id -> segundos (vindo do rastreador do Mac)
async function carregarTempos() {
  const { data } = await sb.from('tempo_por_card').select('card_id,segundos').eq('workspace_id', ws);
  tempos = new Map((data || []).map((t) => [t.card_id, t.segundos]));
}
let tempoTimer = null;
const tempoMudou = () => { clearTimeout(tempoTimer); tempoTimer = setTimeout(async () => { await carregarTempos(); atualizarTela(); }, 2500); };
function duracao(seg) {
  const m = Math.round((seg || 0) / 60);
  if (m < 60) return m + 'min';
  return Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '');
}
function assinarAoVivo() {
  canal?.unsubscribe();
  canal = sb.channel('ws-' + ws);
  for (const n of ORDEM) {
    canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: n, filter: `workspace_id=eq.${ws}` }, (p) => chegou(n, p.new));
    canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: n, filter: `workspace_id=eq.${ws}` }, (p) => chegou(n, p.new));
    canal.on('postgres_changes', { event: 'DELETE', schema: 'public', table: n }, (p) => saiu(n, p.old?.id));
  }
  canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resumos', filter: `workspace_id=eq.${ws}` }, (p) => { resumos.unshift(p.new); resumos = resumos.slice(0, 5); atualizarTela(); });
  canal.on('postgres_changes', { event: '*', schema: 'public', table: 'tempos', filter: `workspace_id=eq.${ws}` }, tempoMudou);
  canal.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'resumos' }, (p) => { resumos = resumos.filter((r) => r.id !== p.old?.id); atualizarTela(); });
  canal.on('postgres_changes', { event: '*', schema: 'public', table: 'mac_estado', filter: `workspace_id=eq.${ws}` }, (p) => macChegou(p.new));
  canal.on('postgres_changes', { event: '*', schema: 'public', table: 'aprovacoes', filter: `workspace_id=eq.${ws}` }, (p) => { aprovChegou(p.new?.id ? p.new : p.old, p.eventType === 'DELETE'); atualizarTela(); });
  canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandos', filter: `workspace_id=eq.${ws}` }, (p) => { if (['ok', 'erro', 'expirado'].includes(p.new?.status)) esperando.get(p.new.id)?.(p.new); });
  canal.subscribe();
}
function chegou(n, row) {
  const o = deLinha(n, row);
  const a = assinatura(n, o);
  if (snap[n].get(o.id) === a) return; // é o eco da nossa própria alteração
  const i = db[n].findIndex((x) => x.id === o.id);
  if (i >= 0) Object.assign(db[n][i], o); else db[n].push(o);
  if (n === 'quadros') db.quadros.sort((x, y) => x.posicao - y.posicao);
  snap[n].set(o.id, a);
  atualizarTela();
}
function saiu(n, id) {
  if (!id || !snap[n].has(id)) return;
  db[n] = db[n].filter((x) => x.id !== id);
  snap[n].delete(id);
  atualizarTela();
}
function atualizarTela() { if (!sheet.open && !drag) render(); }

async function iniciarSessao() {
  try {
    const { data, error } = await sb.rpc('entrar');
    if (error) throw error;
    ws = data;
    await carregarTudo();
    assinarAoVivo();
    setTimeout(boasVindas, 50);
  } catch (e) {
    console.error(e);
    alert('Não consegui carregar seus dados: ' + (e.message || e));
  }
  render();
}

const quadro = (id) => db.quadros.find((q) => q.id === id);
const coluna = (q, id) => q?.colunas.find((c) => c.id === id);
const cliente = (id) => db.clientes.find((c) => c.id === id);
const cardsDe = (colId) => db.cards.filter((c) => c.colunaId === colId).sort((a, b) => a.ordem - b.ordem);
const concluido = (c) => !!coluna(quadro(c.quadroId), c.colunaId)?.concluida;
const orcTotal = (c) => (c.itens || []).reduce((s, i) => s + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0) - (Number(c.desconto) || 0);
const clienteOpts = () => [{ value: '', label: 'Sem cliente' }, ...[...db.clientes].sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ value: c.id, label: c.nome })), { value: '__novo', label: '+ Novo cliente…' }];
function novoCliente() {
  const nome = (prompt('Nome do novo cliente') || '').trim();
  if (!nome) return '';
  const c = { id: uid(), nome, contato: '', email: '', telefone: '', obs: '' };
  db.clientes.push(c);
  return c.id;
}
function criarCard(q, colunaId, titulo, extra = {}) {
  const ordem = Math.max(-1, ...cardsDe(colunaId).map((c) => c.ordem)) + 1;
  const c = novoCard(q, colunaId, titulo, extra, ordem);
  if (q.tipo === 'orcamentos') {
    Object.assign(c, { data: today(), validade: addDays(today(), 15) });
    sb.rpc('proximo_orcamento', { ws }).then(({ data }) => {
      if (!data) return;
      c.numero = data; save();
      const chip = $('#numOrc'); if (chip) chip.textContent = ' · nº ' + data;
      atualizarTela();
    });
  }
  db.cards.push(c);
  save();
  return c;
}

/* =========================================================
   Folha (sheet) e formulários simples
   ========================================================= */
const sheet = $('#sheet');
const sheetForm = $('#sheetForm');
let aoFecharSheet = null;
sheet.addEventListener('close', () => { if (sheet.open) return; const f = aoFecharSheet; aoFecharSheet = null; f?.(); });

const opts = (o) => (typeof o === 'function' ? o() : o).map((x) => (typeof x === 'string' ? { value: x, label: x } : x));
function fieldHTML(f, v) {
  const id = 'f_' + f.name;
  const val = v ?? f.default ?? '';
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea id="${id}" name="${f.name}" rows="3">${esc(val)}</textarea>`; break;
    case 'select': input = `<select id="${id}" name="${f.name}">${opts(f.options).map((o) => `<option value="${esc(o.value)}"${o.value === val ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`; break;
    case 'checkbox': return `<label class="check"><input type="checkbox" name="${f.name}"${val ? ' checked' : ''}> ${esc(f.label)}</label>`;
    case 'money': input = `<input id="${id}" name="${f.name}" inputmode="decimal" placeholder="0,00" value="${esc(moneyInput(val))}">`; break;
    case 'cor': return `<div class="field"><span>${esc(f.label)}</span><div class="colors">${CORES.map((c) => `<label title="${c.nome}"><input type="radio" name="${f.name}" value="${c.v}"${c.v === val ? ' checked' : ''}><span style="--c:${c.v}"></span></label>`).join('')}</div></div>`;
    default: input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}"${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}>`;
  }
  return `<label class="field" for="${id}"><span>${esc(f.label)}</span>${input}</label>`;
}
function readForm(form, fields) {
  const d = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === 'checkbox') d[f.name] = el.checked;
    else if (f.type === 'money') d[f.name] = parseMoney(el.value);
    else if (f.type === 'cor') d[f.name] = el.value;
    else d[f.name] = el.value.trim();
  }
  return d;
}
function openForm({ title, fields, values = {}, onSave, onDelete, deleteLabel = 'Excluir' }) {
  sheetForm.innerHTML = `
    <div class="sheet-head"><button type="button" class="link" data-act="cancel">Cancelar</button><h2>${esc(title)}</h2><button type="submit" class="link strong">Salvar</button></div>
    <div class="sheet-body">${fields.map((f) => fieldHTML(f, values[f.name])).join('')}
      ${onDelete ? `<button type="button" class="btn danger block" data-act="delete" style="margin-top:26px">${esc(deleteLabel)}</button>` : ''}</div>`;
  sheetForm.onclick = (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'cancel') sheet.close();
    if (a === 'delete' && confirm('Tem certeza? Não dá para desfazer.')) { onDelete(); save(); sheet.close(); render(); }
  };
  sheetForm.oninput = sheetForm.onchange = null;
  sheetForm.onsubmit = (e) => {
    e.preventDefault();
    const data = readForm(sheetForm, fields);
    const falta = fields.filter((f) => f.required && !data[f.name]);
    if (falta.length) return alert('Preencha: ' + falta.map((f) => f.label).join(', '));
    if (data.clienteId === '__novo') data.clienteId = novoCliente();
    onSave(data); save(); sheet.close(); render();
  };
  aoFecharSheet = null;
  sheet.showModal();
}
function openChooser(title, itens) {
  sheetForm.innerHTML = `<div class="sheet-head"><button type="button" class="link" data-act="cancel">Fechar</button><h2>${esc(title)}</h2><span></span></div>
    <div class="sheet-body choose">${itens.map((it, i) => `<button type="button" class="btn${it.danger ? ' danger' : ''}" data-i="${i}">${it.cor ? `<span class="sq" style="background:${it.cor}"></span>` : ''}${esc(it.label)}</button>`).join('')}</div>`;
  sheetForm.onclick = (e) => {
    if (e.target.closest('[data-act=cancel]')) return sheet.close();
    const i = e.target.closest('[data-i]')?.dataset.i;
    if (i != null) { sheet.close(); itens[i].run(); }
  };
  sheetForm.oninput = sheetForm.onchange = null;
  sheetForm.onsubmit = (e) => e.preventDefault();
  aoFecharSheet = null;
  sheet.showModal();
}

/* =========================================================
   Detalhe do cartão (salva sozinho, como no Trello)
   ========================================================= */
function itemRowHTML(it = {}) {
  return `<div class="item-row">
    <input name="it_desc" placeholder="Descrição" value="${esc(it.desc || '')}">
    <input name="it_qtd" inputmode="decimal" aria-label="Quantidade" value="${esc(it.qtd ?? 1)}">
    <input name="it_valor" inputmode="decimal" placeholder="Valor un." value="${esc(moneyInput(it.valor))}">
    <button type="button" class="iconbtn" data-act="rm-item" aria-label="Remover item">×</button></div>`;
}
function checklistHTML(c) {
  const ck = c.checklist || [];
  const feitos = ck.filter((i) => i.feito).length;
  return `${ck.length ? `<div class="ck-progress"><div style="width:${Math.round((feitos / ck.length) * 100)}%"></div></div>` : ''}
    ${ck.map((i) => `<div class="ck-item${i.feito ? ' feito' : ''}"><input type="checkbox" data-ck="${i.id}"${i.feito ? ' checked' : ''}><span>${esc(i.texto)}</span><button type="button" class="iconbtn" data-ck-rm="${i.id}" aria-label="Remover">×</button></div>`).join('')}
    <input class="ck-add" placeholder="+ Adicionar item e Enter" enterkeyhint="done" data-ck-add>`;
}

function openCard(id) {
  const c = db.cards.find((x) => x.id === id);
  if (!c) return;
  const q = quadro(c.quadroId);
  const isOrc = q.tipo === 'orcamentos';
  const colAtual = coluna(q, c.colunaId);

  sheetForm.innerHTML = `
    <div class="sheet-head">
      <span class="chipc" style="--c:${q.cor}">${esc(q.nome)}<span id="numOrc">${c.numero ? ` · nº ${esc(c.numero)}` : ''}</span></span>
      <span></span>
      <button type="button" class="link strong" data-act="close">Fechar</button>
    </div>
    <div class="sheet-body">
      <textarea class="card-title" name="titulo" rows="1" placeholder="Título do cartão">${esc(c.titulo)}</textarea>
      <label class="field status-big" style="--c:${colAtual?.cor}"><span>Status</span>
        <select name="colunaId">${q.colunas.map((k) => `<option value="${k.id}"${k.id === c.colunaId ? ' selected' : ''}>${esc(k.nome)}</option>`).join('')}</select></label>
      ${tempos.get(c.id) >= 60 ? `<p class="tempo-ficha"><span class="mo q">Tempo registrado</span><b>${duracao(tempos.get(c.id))}</b></p>` : ''}
      <div class="grid2">
        ${fieldHTML({ name: 'clienteId', label: 'Cliente', type: 'select', options: clienteOpts }, c.clienteId)}
        ${fieldHTML({ name: 'prazo', label: isOrc ? 'Retorno até' : 'Data', type: 'date' }, c.prazo)}
        ${fieldHTML({ name: 'hora', label: 'Hora', type: 'time' }, c.hora)}
        ${fieldHTML({ name: 'lembreteMin', label: 'Lembrete', type: 'select', options: LEMBRETES }, c.lembreteMin)}
        ${fieldHTML({ name: 'prioridade', label: 'Prioridade', type: 'select', options: [{ value: '', label: 'Nenhuma' }, ...Object.keys(PRIO)] }, c.prioridade)}
        ${fieldHTML({ name: 'responsavel', label: 'Responsável', placeholder: 'Nome' }, c.responsavel)}
      </div>
      ${isOrc ? `
        <div class="field"><span>Itens do orçamento (descrição · qtd · valor unitário)</span>
          <div class="itens">${(c.itens?.length ? c.itens : [{}]).map(itemRowHTML).join('')}</div>
          <button type="button" class="btn sm" data-act="add-item">+ Item</button>
          <div class="itens-total" id="itensTotal"></div></div>
        <div class="grid2">
          ${fieldHTML({ name: 'desconto', label: 'Desconto (R$)', type: 'money' }, c.desconto)}
          ${fieldHTML({ name: 'validade', label: 'Proposta válida até', type: 'date' }, c.validade)}
        </div>
        ${fieldHTML({ name: 'condicoes', label: 'Condições de pagamento e prazos (vai no PDF)', type: 'textarea' }, c.condicoes)}
        <div class="actions">
          <button type="button" class="btn primary" data-act="pdf">Gerar PDF</button>
          <button type="button" class="btn" data-act="lancar"${c.lancado ? ' disabled' : ''}>${c.lancado ? '✓ Lançado no financeiro' : 'Lançar como a receber'}</button>
          <button type="button" class="btn" data-act="duplicar">Duplicar</button>
        </div>` : ''}
      ${fieldHTML({ name: 'descricao', label: isOrc ? 'Observações internas' : 'Descrição', type: 'textarea' }, c.descricao)}
      <div class="field"><span>Checklist</span><div id="ck">${checklistHTML(c)}</div></div>
      ${aprovacaoHTML(c)}
      ${fieldHTML({ name: 'link', label: 'Link (Drive, Frame.io…)', type: 'url', placeholder: 'https://' }, c.link)}
      ${c.link ? `<p style="margin:-6px 2px 14px"><a href="${esc(c.link)}" target="_blank" rel="noopener" class="pilula" style="margin-top:0">Abrir link ↗</a></p>` : ''}
      <button type="button" class="btn danger block" data-act="delete" style="margin-top:28px">Excluir cartão</button>
    </div>`;

  const ta = $('.card-title', sheetForm);
  const autosize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

  const readItens = () => $$('.item-row', sheetForm).map((r) => ({
    desc: $('[name=it_desc]', r).value.trim(), qtd: parseMoney($('[name=it_qtd]', r).value) || 1, valor: parseMoney($('[name=it_valor]', r).value),
  })).filter((i) => i.desc || i.valor);

  const sync = () => {
    const f = sheetForm.elements;
    c.titulo = f.titulo.value.trim() || c.titulo;
    if (f.clienteId.value === '__novo') {
      const nid = novoCliente();
      f.clienteId.innerHTML = clienteOpts().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      f.clienteId.value = nid;
    }
    if (c.colunaId !== f.colunaId.value) {
      c.colunaId = f.colunaId.value;
      c.ordem = Math.max(-1, ...cardsDe(c.colunaId).filter((x) => x.id !== c.id).map((x) => x.ordem)) + 1;
      $('.status-big', sheetForm).style.setProperty('--c', coluna(q, c.colunaId).cor);
    }
    if (f.hora.value && !f.prazo.value) f.prazo.value = today();
    if (f.hora.value && !c.hora && !f.lembreteMin.value) f.lembreteMin.value = '30';
    if (!f.hora.value) f.lembreteMin.value = '';
    Object.assign(c, { hora: f.hora.value, lembreteMin: f.lembreteMin.value, clienteId: f.clienteId.value, prazo: f.prazo.value, prioridade: f.prioridade.value, responsavel: f.responsavel.value.trim(), descricao: f.descricao.value, link: f.link.value.trim() });
    if (isOrc) {
      Object.assign(c, { itens: readItens(), desconto: parseMoney(f.desconto.value), validade: f.validade.value, condicoes: f.condicoes.value });
      $('#itensTotal', sheetForm).textContent = `Total: ${money(orcTotal(c))}`;
    }
    save();
  };

  sheetForm.oninput = (e) => { if (e.target === ta) autosize(); if (!e.target.matches('[data-ck-add]')) sync(); };
  sheetForm.onchange = (e) => {
    const ck = e.target.closest('[data-ck]');
    if (ck) { const it = c.checklist.find((i) => i.id === ck.dataset.ck); it.feito = ck.checked; save(); $('#ck', sheetForm).innerHTML = checklistHTML(c); return; }
    if (!e.target.matches('[data-ck-add]')) sync();
  };
  sheetForm.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-ck-add]')) {
      e.preventDefault();
      const texto = e.target.value.trim();
      if (!texto) return;
      (c.checklist ||= []).push({ id: uid(), texto, feito: false });
      save();
      $('#ck', sheetForm).innerHTML = checklistHTML(c);
      $('[data-ck-add]', sheetForm).focus();
    }
    if (e.key === 'Enter' && e.target === ta) { e.preventDefault(); ta.blur(); }
  };
  sheetForm.onclick = (e) => {
    const rm = e.target.closest('[data-ck-rm]');
    if (rm) { c.checklist = c.checklist.filter((i) => i.id !== rm.dataset.ckRm); save(); $('#ck', sheetForm).innerHTML = checklistHTML(c); return; }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (!a) return;
    if (a === 'close') sheet.close();
    if (a === 'aprov-copiar') { navigator.clipboard?.writeText(e.target.dataset.link).then(() => { e.target.textContent = '✓ Copiado'; }, () => prompt('Copie o link:', e.target.dataset.link)); }
    if (a === 'aprov-premiere') {
      const b = e.target; b.disabled = true; b.textContent = 'Mandando ao Mac…';
      macCmd('marcadores', { card_id: c.id }).then((r) => { b.textContent = r.status === 'ok' ? '✓ ' + respTxt(r) : respTxt(r); b.disabled = false; });
    }
    if (a === 'add-item') { $('.itens', sheetForm).insertAdjacentHTML('beforeend', itemRowHTML()); $('.item-row:last-child input', sheetForm).focus(); }
    if (a === 'rm-item') { e.target.closest('.item-row').remove(); sync(); }
    if (a === 'pdf') { sync(); imprimirOrcamento(c); }
    if (a === 'lancar') {
      sync();
      if (!orcTotal(c)) return alert('O orçamento está sem valor.');
      db.lancamentos.push({ id: uid(), tipo: 'Entrada', descricao: `${c.titulo} (orç. ${c.numero})`, valor: orcTotal(c), data: c.prazo || today(), categoria: 'Projeto', clienteId: c.clienteId, pago: false, cardId: c.id });
      c.lancado = true; save();
      e.target.textContent = '✓ Lançado no financeiro'; e.target.disabled = true;
    }
    if (a === 'duplicar') {
      sync();
      const novo = criarCard(q, q.colunas[0].id, c.titulo + ' (cópia)', { clienteId: c.clienteId, descricao: c.descricao, prioridade: c.prioridade });
      Object.assign(novo, { itens: structuredClone(c.itens || []), desconto: c.desconto, condicoes: c.condicoes });
      save(); sheet.close(); setTimeout(() => openCard(novo.id), 50);
    }
    if (a === 'delete' && confirm('Excluir este cartão? Não dá para desfazer.')) {
      db.cards = db.cards.filter((x) => x.id !== c.id); save(); sheet.close();
    }
  };
  sheetForm.onsubmit = (e) => e.preventDefault();
  aoFecharSheet = render;
  sheet.showModal();
  autosize();
  carregarComentarios(c);
  if (isOrc) $('#itensTotal', sheetForm).textContent = `Total: ${money(orcTotal(c))}`;
  $('.sheet-body', sheetForm).scrollTop = 0;
  if (!c.titulo) ta.focus();
}

/* =========================================================
   Formulários de quadro, coluna, cliente, lançamento
   ========================================================= */
function novoQuadro() {
  openForm({
    title: 'Novo quadro',
    fields: [
      { name: 'nome', label: 'Nome do quadro', required: true, placeholder: 'Ex.: Projeto do cliente X' },
      { name: 'modelo', label: 'Colunas iniciais', type: 'select', options: Object.entries(MODELOS).map(([k, m]) => ({ value: k, label: m.nome })) },
      { name: 'cor', label: 'Cor', type: 'cor' },
    ],
    values: { cor: CORES[1 + (db.quadros.length % (CORES.length - 1))].v },
    onSave: (d) => {
      const m = MODELOS[d.modelo];
      const q = { id: uid(), nome: d.nome, cor: d.cor || COR.Azul, tipo: m.tipo, colunas: m.cols(), posicao: Math.max(-1, ...db.quadros.map((x) => x.posicao || 0)) + 1 };
      db.quadros.push(q);
      setTimeout(() => { location.hash = '#quadro/' + q.id; });
    },
  });
}
function editarQuadro(q) {
  openForm({
    title: 'Editar quadro',
    fields: [{ name: 'nome', label: 'Nome', required: true }, { name: 'cor', label: 'Cor', type: 'cor' }],
    values: q,
    onSave: (d) => Object.assign(q, d),
    deleteLabel: 'Excluir quadro e todos os cartões',
    onDelete: () => {
      db.cards = db.cards.filter((c) => c.quadroId !== q.id);
      db.quadros = db.quadros.filter((x) => x.id !== q.id);
      setTimeout(() => { location.hash = '#quadros'; });
    },
  });
}
function editarColuna(q, colId) {
  const k = colId ? coluna(q, colId) : null;
  openForm({
    title: k ? 'Editar coluna' : 'Nova coluna',
    fields: [
      { name: 'nome', label: 'Nome', required: true },
      { name: 'cor', label: 'Cor', type: 'cor' },
      { name: 'concluida', label: 'Cartões aqui contam como concluídos', type: 'checkbox' },
      ...(k ? [{ name: 'posicao', label: 'Posição', type: 'select', options: q.colunas.map((_, i) => ({ value: String(i), label: `${i + 1}ª coluna` })) }] : []),
    ],
    values: k ? { ...k, posicao: String(q.colunas.indexOf(k)) } : { cor: COR.Cinza },
    onSave: (d) => {
      if (!k) { q.colunas.push({ id: uid(), nome: d.nome, cor: d.cor || COR.Cinza, concluida: d.concluida }); return; }
      Object.assign(k, { nome: d.nome, cor: d.cor || k.cor, concluida: d.concluida });
      const i = Number(d.posicao);
      q.colunas = q.colunas.filter((x) => x !== k);
      q.colunas.splice(i, 0, k);
    },
    deleteLabel: 'Excluir coluna',
    onDelete: k ? () => {
      if (q.colunas.length === 1) return alert('O quadro precisa de pelo menos uma coluna.');
      const destino = q.colunas.find((x) => x !== k);
      db.cards.filter((c) => c.colunaId === k.id).forEach((c) => { c.colunaId = destino.id; });
      q.colunas = q.colunas.filter((x) => x !== k);
    } : null,
  });
}
const F_CLIENTE = [
  { name: 'nome', label: 'Nome', required: true },
  { name: 'contato', label: 'Pessoa de contato' },
  { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email' },
  { name: 'obs', label: 'Observações', type: 'textarea' },
];
function editarCliente(id) {
  const c = id ? cliente(id) : null;
  openForm({
    title: c ? 'Editar cliente' : 'Novo cliente', fields: F_CLIENTE, values: c || {},
    onSave: (d) => (c ? Object.assign(c, d) : db.clientes.push({ id: uid(), ...d })),
    onDelete: c ? () => {
      db.clientes = db.clientes.filter((x) => x.id !== id);
      db.cards.forEach((k) => { if (k.clienteId === id) k.clienteId = ''; });
    } : null,
  });
}
const CATEGORIAS = ['Projeto', 'Diária', 'Edição', 'Equipe/freela', 'Equipamento', 'Software', 'Transporte', 'Alimentação', 'Impostos', 'Outros'];
function editarLancamento(id, defaults = {}) {
  const l = id ? db.lancamentos.find((x) => x.id === id) : null;
  openForm({
    title: l ? 'Editar lançamento' : 'Novo lançamento',
    fields: [
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['Entrada', 'Saída'] },
      { name: 'descricao', label: 'Descrição', required: true },
      { name: 'valor', label: 'Valor (R$)', type: 'money', required: true },
      { name: 'data', label: 'Data (vencimento ou pagamento)', type: 'date' },
      { name: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIAS },
      { name: 'clienteId', label: 'Cliente', type: 'select', options: clienteOpts },
      { name: 'pago', label: 'Já recebido / pago', type: 'checkbox' },
    ],
    values: l || { tipo: 'Entrada', data: today(), categoria: 'Projeto', ...defaults },
    onSave: (d) => (l ? Object.assign(l, d) : db.lancamentos.push({ id: uid(), ...d })),
    onDelete: l ? () => { db.lancamentos = db.lancamentos.filter((x) => x.id !== id); } : null,
  });
}

/* =========================================================
   Peças de interface
   ========================================================= */
function kcardHTML(c, q) {
  const cli = cliente(c.clienteId);
  const ck = c.checklist || [];
  const feitos = ck.filter((i) => i.feito).length;
  const done = !!coluna(q, c.colunaId)?.concluida;
  const hoje = c.prazo === today() && !done;
  const valor = q.tipo === 'orcamentos' && orcTotal(c) ? money(orcTotal(c)) : '';
  return `<article class="kcard${done ? ' done' : ''}${hoje ? ' hoje' : ''}" data-card="${c.id}">
    ${c.prioridade || c.numero ? `<div class="labels">${c.numero ? `<span class="knum">Nº ${esc(c.numero)}</span>` : ''}${c.prioridade ? `<span class="label" style="--c:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span>` : ''}</div>` : ''}
    <div class="kt">${esc(c.titulo)}</div>
    ${valor ? `<div class="kval">${valor}</div>` : ''}
    ${ck.length ? `<div class="kck"><span style="width:${Math.round((feitos / ck.length) * 100)}%"></span></div>` : ''}
    <div class="km">${[
      prazoTxt(c.prazo, done, c.hora),
      ck.length ? `<span class="kd${feitos === ck.length ? ' ok' : ''}">${feitos}/${ck.length}</span>` : '',
      tempos.get(c.id) >= 60 ? `<span class="kd tempo" title="Tempo registrado no Mac">◷ ${duracao(tempos.get(c.id))}</span>` : '',
      c.descricao ? `<span class="kd" title="Tem descrição">${ICON.text}</span>` : '',
      cli ? `<span class="kcli">${esc(cli.nome)}</span>` : '',
      c.responsavel ? `<span class="avatar" style="--c:${corDe(c.responsavel)}" title="${esc(c.responsavel)}">${esc(iniciais(c.responsavel))}</span>` : '',
    ].join('')}</div>
  </article>`;
}
function rowCardHTML(c) {
  const q = quadro(c.quadroId);
  const k = coluna(q, c.colunaId);
  const cli = cliente(c.clienteId);
  return `<div class="row" data-open-card="${c.id}">
    <span class="bar" style="background:${q.cor}"></span>
    <div class="main">
      <div class="title">${esc(c.titulo)}</div>
      <div class="meta"><span class="pill" style="--c:${k?.cor}">${esc(k?.nome)}</span>${prazoBadge(c.prazo, k?.concluida, c.hora)}${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}<span>${esc(q.nome)}</span></div>
    </div>
    ${c.responsavel ? `<span class="avatar" style="--c:${corDe(c.responsavel)}">${esc(iniciais(c.responsavel))}</span>` : ''}
  </div>`;
}
const box = (rows, vazio) => `<div class="card">${rows.length ? rows.join('') : `<div class="empty">${vazio}</div>`}</div>`;
const sec = (t, n) => `<h3 class="section">${t}${n ? ` <span class="n">${n}</span>` : ''}</h3>`;

/* =========================================================
   Telas
   ========================================================= */
const ui = { modo: {}, filtroCli: {}, mes: today().slice(0, 7) };

function resumoMes(ym) {
  const ls = db.lancamentos.filter((l) => (l.data || '').startsWith(ym));
  const soma = (f) => ls.filter(f).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  return { ls, entRec: soma((l) => l.tipo === 'Entrada' && l.pago), entPrev: soma((l) => l.tipo === 'Entrada'), saiPag: soma((l) => l.tipo === 'Saída' && l.pago), saiPrev: soma((l) => l.tipo === 'Saída') };
}

function viewInicio() {
  const t = today(), semana = addDays(t, 7);
  const abertos = db.cards.filter((c) => c.prazo && !concluido(c)).sort((a, b) => quando(a).localeCompare(quando(b)));
  const atrasados = abertos.filter((c) => c.prazo < t);
  const hoje = abertos.filter((c) => c.prazo === t);
  const prox = abertos.filter((c) => c.prazo > t && c.prazo <= semana);
  const aReceber = db.lancamentos.filter((l) => l.tipo === 'Entrada' && !l.pago).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const agora = agoraHHMM();
  const proximo = hoje.find((c) => c.hora && c.hora >= agora) || hoje.find((c) => !c.hora) || prox[0];
  const n = hoje.length;
  const titulo = n ? `${n} ${n === 1 ? 'coisa' : 'coisas'}.` : 'dia livre.';
  const sub = [atrasados.length && `${atrasados.length} ${atrasados.length === 1 ? 'atrasada' : 'atrasadas'}`, prox.length && `${prox.length} nesta semana`].filter(Boolean).join(' — ') || 'nada pendente';
  const dt = new Date();
  const data = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' ' + String(dt.getDate()).padStart(2, '0') + '.' + String(dt.getMonth() + 1).padStart(2, '0');
  return `<div class="page">
    <div class="hero">
      <div class="mo">${esc(data)} — ${agora}</div>
      <h1><em>Hoje,</em><br>${titulo}</h1>
      <div class="mo q">${sub}</div>
    </div>
    ${macLinhaHTML()}
    <div class="blocos">
      ${proximo ? `<button class="bloco couro alto" data-open-card="${proximo.id}">
        <span class="mo q">${proximo.prazo === t ? 'Próximo' : 'Próximo · ' + fmtDate(proximo.prazo)}</span>
        <span><span class="hora">${proximo.hora ? proximo.hora.replace(':', 'h') : 'hoje'}</span><span class="tt">${esc(proximo.titulo)}</span>${cliente(proximo.clienteId) ? `<span class="mo">${esc(cliente(proximo.clienteId).nome)}</span>` : ''}</span>
      </button>` : `<div class="bloco couro alto"><span class="mo q">Próximo</span><span><span class="hora">—</span><span class="tt">Nada marcado</span></span></div>`}
      <a class="bloco marinho" href="#financeiro"><span class="mo q">A receber</span><span class="val">${money(aReceber).replace(',00', '')}</span></a>
      <div class="bloco linho"><span class="mo q">Atrasado</span><span class="val">${atrasados.length}</span></div>
    </div>
    ${atrasados.length ? `<div class="mo q sec">Atrasado</div><div class="agenda">${atrasados.map(agRow).join('')}</div>` : ''}
    <div class="mo q sec">Agenda</div>
    <div class="agenda">${hoje.length ? hoje.map(agRow).join('') : '<div class="ag vazio">Nada com prazo para hoje.</div>'}</div>
    ${prox.length ? `<div class="mo q sec">Esta semana</div><div class="agenda">${prox.map(agRow).join('')}</div>` : ''}
    ${resumoHTML()}
    <div class="mo q sec">Quadros</div>${tilesHTML()}
  </div>`;
}
function agRow(c) {
  const t = today();
  const cli = cliente(c.clienteId);
  const q = quadro(c.quadroId);
  const h = c.prazo === t ? (c.hora || '—') : fmtDate(c.prazo) + (c.hora ? ' ' + c.hora : '');
  return `<div class="ag${c.prazo < t ? ' late' : ''}" data-open-card="${c.id}"><span class="ag-h">${esc(h)}</span><span class="ag-t">${esc(c.titulo)}</span><span class="ag-m">${esc(cli ? cli.nome : q ? q.nome : '')}</span></div>`;
}
function resumoHTML() {
  const r = resumos[0];
  if (!r) return '';
  const quando = new Date(r.criado_em).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<details class="resumo" ${Date.now() - new Date(r.criado_em) < 12 * 3600e3 ? 'open' : ''}>
    <summary><span class="mo q">WhatsApp</span><b>${esc(r.titulo.replace(/^📲\s*/, '').replace(/^WhatsApp\s*·\s*/i, ''))}</b><small>${esc(quando)}</small></summary>
    <div class="resumo-txt">${esc(r.texto)}</div>
  </details>`;
}
function tilesHTML() {
  return `<div class="tiles">${db.quadros.map((q) => {
    const n = db.cards.filter((c) => c.quadroId === q.id && !concluido(c)).length;
    return `<a class="tile" href="#quadro/${q.id}" style="--c:${q.cor}"><span class="tile-n">${n}</span><span class="tile-t">${esc(q.nome)}<small>${n === 1 ? 'aberto' : 'abertos'}</small></span></a>`;
  }).join('')}<button class="tile new" data-novo-quadro>+ Criar quadro</button></div>`;
}
function viewQuadros() {
  const n = db.cards.filter((c) => !concluido(c)).length;
  return `<div class="page"><div class="hero"><div class="mo q">${db.quadros.length} ${db.quadros.length === 1 ? 'quadro' : 'quadros'}</div><h1><em>Seus</em><br>quadros.</h1><div class="mo q">${n} ${n === 1 ? 'cartão aberto' : 'cartões abertos'}</div></div>${tilesHTML()}</div>`;
}

function viewQuadro(id) {
  const q = quadro(id);
  if (!q) return `<div class="page"><p>Quadro não encontrado.</p><a href="#quadros">Voltar</a></div>`;
  const modo = ui.modo[id] || 'quadro';
  const fcli = ui.filtroCli[id] || '';
  const doQuadro = db.cards.filter((c) => c.quadroId === id);
  const clis = [...new Set(doQuadro.map((c) => c.clienteId).filter(Boolean))].map(cliente).filter(Boolean);
  const passa = (c) => !fcli || c.clienteId === fcli;
  const isOrc = q.tipo === 'orcamentos';

  const head = `<div class="board-head">
      <div class="bh-t"><div class="mo q">${isOrc ? 'Orçamentos' : 'Quadro'}</div><h1>${esc(q.nome)}</h1><div class="mo">${doQuadro.filter((c) => !concluido(c)).length} abertos · ${q.colunas.length} colunas</div></div>
      <div class="seg"><button class="${modo === 'quadro' ? 'on' : ''}" data-modo="quadro">Quadro</button><button class="${modo === 'lista' ? 'on' : ''}" data-modo="lista">Lista</button></div>
      <button class="iconbtn" data-board-menu aria-label="Opções do quadro">${ICON.more}</button>
    </div>
    ${clis.length ? `<div class="board-filters chips"><button class="chip${!fcli ? ' on' : ''}" data-fcli="">Todos</button>${clis.map((c) => `<button class="chip${fcli === c.id ? ' on' : ''}" data-fcli="${c.id}">${esc(c.nome)}</button>`).join('')}</div>` : ''}`;

  if (modo === 'lista') {
    return head + `<div class="lista">${q.colunas.map((k) => {
      const cs = cardsDe(k.id).filter(passa);
      return `<div class="group" style="--c:${k.cor}">
        <div class="group-head"><span class="col-n">${esc(k.nome)}</span> <span class="count">${cs.length} ${cs.length === 1 ? 'item' : 'itens'}${isOrc && cs.length ? ' · ' + money(cs.reduce((s, c) => s + orcTotal(c), 0)) : ''}</span></div>
        <div class="table">
          <div class="trow head${isOrc ? ' has-val' : ''}"><div>Item</div><div class="tc-center">Status</div><div>Cliente</div><div>Prazo</div><div class="tc-center">Prioridade</div>${isOrc ? '<div>Valor</div>' : ''}</div>
          ${cs.map((c) => { const cli = cliente(c.clienteId); return `<div class="trow${isOrc ? ' has-val' : ''}" data-open-card="${c.id}">
            <div>${esc(c.titulo)}</div>
            <div><select class="status-sel" style="--c:${k.cor}" data-status="${c.id}">${q.colunas.map((x) => `<option value="${x.id}"${x.id === k.id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>
            <div class="tc-cli">${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}</div>
            <div class="tc-prazo">${prazoBadge(c.prazo, k.concluida, c.hora)}</div>
            <div class="tc-prio">${c.prioridade ? `<span class="prio" style="--c:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span>` : ''}</div>
            ${isOrc ? `<div class="tc-val num">${money(orcTotal(c))}</div>` : ''}
            <div class="tc-meta">${prazoBadge(c.prazo, k.concluida, c.hora)}${c.prioridade ? `<span class="badge" style="color:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span>` : ''}${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}${isOrc ? `<span class="num">${money(orcTotal(c))}</span>` : ''}</div>
          </div>`; }).join('')}
          <form class="quick-add" data-quick="${k.id}"><input name="t" placeholder="+ Adicionar item" enterkeyhint="done"></form>
        </div></div>`;
    }).join('')}</div>`;
  }

  return head + `<div class="board" id="board">${q.colunas.map((k) => {
    const cs = cardsDe(k.id).filter(passa);
    return `<section class="col" data-col="${k.id}">
      <header class="col-head" data-edit-col="${k.id}"><span class="col-dot" style="--c:${k.cor}"></span><span class="col-n">${esc(k.nome)}</span><span class="count">${cs.length}</span>${isOrc && cs.length ? `<span class="sum">${money(cs.reduce((s, c) => s + orcTotal(c), 0))}</span>` : ''}</header>
      <div class="col-cards" data-col-cards="${k.id}">${cs.map((c) => kcardHTML(c, q)).join('')}</div>
      <form class="quick-add" data-quick="${k.id}"><input name="t" placeholder="+ Adicionar" enterkeyhint="done"></form>
    </section>`;
  }).join('')}<button class="add-col" data-add-col>+ Nova coluna</button></div>`;
}

function viewFinanceiro() {
  const ym = ui.mes, r = resumoMes(ym);
  const ls = [...r.ls].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const pend = ls.filter((l) => !l.pago), feitos = ls.filter((l) => l.pago);
  const curto = (v) => money(v).replace(',00', '');
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const [y, m] = ym.split('-').map(Number);
  const nomeMes = (d) => cap(d.toLocaleDateString('pt-BR', { month: 'long' }));
  const mes = nomeMes(new Date(y, m - 1, 1));
  const ant = nomeMes(new Date(y, m - 2, 1)).slice(0, 3), seg = nomeMes(new Date(y, m, 1)).slice(0, 3);
  const saldo = r.entRec - r.saiPag;
  const row = (l) => {
    const ent = l.tipo === 'Entrada';
    const atras = !l.pago && l.data && l.data < today();
    const cli = cliente(l.clienteId);
    const meta = [l.categoria, cli && cli.nome].filter(Boolean).map(esc).join(' · ');
    return `<div class="lc${atras ? ' late' : ''}${l.pago ? ' pago' : ''}" data-lanc="${l.id}">
      <span class="lc-d">${fmtDate(l.data)}</span>
      <span class="lc-t"><span class="lc-n">${esc(l.descricao)}</span>${meta ? `<span class="lc-m">${meta}</span>` : ''}
        ${l.pago ? '' : `<button class="lc-ok" data-pago="${l.id}">${atras ? 'Atrasado · ' : ''}marcar ${ent ? 'recebido' : 'pago'}</button>`}</span>
      <span class="lc-v ${ent ? 'ent' : 'sai'}">${ent ? '+' : '−'}${curto(l.valor)}</span>
    </div>`;
  };
  return `<div class="page">
    <div class="hero">
      <div class="mes-nav"><button class="mo" data-mes="-1">‹ ${ant}</button><span class="mo">${y}</span><button class="mo" data-mes="1">${seg} ›</button></div>
      <h1><em>${mes},</em><br><span class="${saldo < 0 ? 'neg' : ''}">${curto(saldo)}.</span></h1>
      <div class="mo q">Saldo do mês — previsto ${curto(r.entPrev - r.saiPrev)}</div>
    </div>
    <div class="blocos fin">
      <div class="bloco marinho"><span class="mo q">Entrou</span><span class="val">${curto(r.entRec)}</span><span class="barra"><span style="width:${pct(r.entRec, r.entPrev)}%"></span></span><span class="mo">de ${curto(r.entPrev)}</span></div>
      <div class="bloco couro"><span class="mo q">Saiu</span><span class="val">${curto(r.saiPag)}</span><span class="barra"><span style="width:${pct(r.saiPag, r.saiPrev)}%"></span></span><span class="mo">de ${curto(r.saiPrev)}</span></div>
      <div class="bloco linho largo"><span class="mo q">A receber</span><span class="val">${curto(r.entPrev - r.entRec)}</span><span class="mo q">A pagar</span><span class="val">${curto(r.saiPrev - r.saiPag)}</span></div>
    </div>
    ${pend.length ? `<div class="mo q sec">Pendente</div><div class="livro">${pend.map(row).join('')}</div>` : ''}
    <div class="mo q sec">Realizado</div>
    <div class="livro">${feitos.length ? feitos.map(row).join('') : '<div class="ag vazio">Nada realizado neste mês ainda.</div>'}</div>
    ${!ls.length ? '<p class="mo" style="margin-top:14px">Toque em + para lançar.</p>' : ''}
  </div>`;
}

function viewAjustes() {
  const cls = [...db.clientes].sort((a, b) => a.nome.localeCompare(b.nome));
  const ini = (nome, id) => `<span class="li-i" style="--c:${corDe(id)}">${esc(iniciais(nome))}</span>`;
  return `<div class="page">
    <div class="hero"><div class="mo q">Ajustes</div><h1><em>Seus</em><br>ajustes.</h1><div class="mo q">Clientes, equipe e avisos</div></div>
    <div class="mo q sec">Clientes · ${cls.length}</div>
    <div class="livro">${cls.length ? cls.map((c) => `<div class="li" data-cli="${c.id}">${ini(c.nome, c.id)}<span class="li-t"><span class="li-n">${esc(c.nome)}</span>${c.contato || c.telefone ? `<span class="li-m">${esc([c.contato, c.telefone].filter(Boolean).join(' · '))}</span>` : ''}</span><span class="li-a">›</span></div>`).join('') : '<div class="ag vazio">Nenhum cliente.</div>'}</div>
    <button class="pilula" data-novo-cli>+ Novo cliente</button>
    <div class="mo q sec">Equipe</div>
    <div class="livro">${equipe ? [
      ...equipe.membros.map((m) => `<div class="li" style="cursor:default">${ini(m.nome || 'M', m.user_id)}<span class="li-t"><span class="li-n">${esc(m.nome || 'Membro')}</span><span class="li-m">${m.papel === 'dono' ? 'Dono' : 'Membro'}${m.user_id === sessao?.user.id ? ' · você' : ''}</span></span></div>`),
      ...equipe.convites.map((c) => `<div class="li" style="cursor:default"><span class="li-i">✉︎</span><span class="li-t"><span class="li-n">${esc(c.email)}</span><span class="li-m">Convite pendente — a pessoa cria a conta no app com este e-mail</span></span><button class="pilula sm" data-desconvidar="${esc(c.email)}">Cancelar</button></div>`),
    ].join('') : '<div class="ag vazio">Carregando…</div>'}</div>
    <button class="pilula" data-convidar>+ Convidar pessoa</button>
    <div class="mo q sec">Notificações</div>
    <div id="notifBox">${notifHTML()}</div>
    <div class="bloco madeira conta">
      <span class="mo q">Conectado como</span>
      <span class="conta-e">${esc(sessao?.user.email || '')}</span>
      <span class="conta-b"><button class="pilula" data-export>Exportar backup</button><button class="pilula" data-sair>Sair</button></span>
    </div>
  </div>`;
}

/* ---------- notificações ---------- */
const VAPID = 'BDcyCZU1dZO8zpyHwqZdVtnUvDl3Ck9-O8Q14HbXZdfsg96JUQb8C3Ng-f59WxnxtMOiOi0VWpeasDFCX2jauXg';
const ehIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let notifAtiva = null; // null = ainda verificando
function notifHTML() {
  const nota = (t) => `<p class="nota">${t}</p>`;
  if (ehIOS && !instalado()) return nota('Para receber avisos no iPhone, primeiro adicione o app à Tela de Início (Safari → Compartilhar → <strong>Adicionar à Tela de Início</strong>) e abra por lá.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return nota('Este navegador não aceita notificações.');
  if (Notification.permission === 'denied') return nota('As notificações foram bloqueadas. Libere em Ajustes do iPhone → Notificações → OCM.');
  if (notifAtiva === null) { checarNotif(); return nota('Verificando…'); }
  if (!notifAtiva) return nota('Receba todo dia às 8h um resumo do que está atrasado, vence hoje ou vence amanhã.') + '<div class="pilulas"><button class="pilula cheia" data-notif-ativar>Ativar notificações neste aparelho</button></div>';
  return nota('✓ Ativadas neste aparelho. Todo dia às 8h chega um resumo dos prazos (só quando tiver algo vencendo).') + '<div class="pilulas"><button class="pilula" data-notif-teste>Enviar teste</button><button class="pilula" data-notif-desativar>Desativar</button></div>';
}
async function checarNotif() {
  try {
    const reg = await navigator.serviceWorker.ready;
    notifAtiva = !!(await reg.pushManager.getSubscription()) && Notification.permission === 'granted';
  } catch { notifAtiva = false; }
  const box = $('#notifBox'); if (box) box.innerHTML = notifHTML();
}
const b64u = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
async function ativarNotif() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('Sem permissão, não dá para avisar. Você pode liberar depois nos Ajustes do aparelho.'); return checarNotif(); }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) }));
    const j = sub.toJSON();
    const { error } = await sb.from('push_inscricoes').upsert({ endpoint: j.endpoint, user_id: sessao.user.id, workspace_id: ws, p256dh: j.keys.p256dh, auth: j.keys.auth });
    if (error) throw error;
    notifAtiva = true;
    const box = $('#notifBox'); if (box) box.innerHTML = notifHTML();
  } catch (e) { alert('Não consegui ativar: ' + (e.message || e)); }
}
async function testarNotif() {
  const { data, error } = await sb.functions.invoke('avisos', { body: { teste: true } });
  if (error || !data?.enviados) alert('O teste não foi enviado' + (error ? ': ' + error.message : '. Tente desativar e ativar de novo.'));
}
async function desativarNotif() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await sb.from('push_inscricoes').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  notifAtiva = false;
  const box = $('#notifBox'); if (box) box.innerHTML = notifHTML();
}

let equipe = null;
async function carregarEquipe() {
  const [m, c] = await Promise.all([
    sb.from('membros').select('user_id,nome,papel').eq('workspace_id', ws).order('criado_em'),
    sb.from('convites').select('email').eq('workspace_id', ws).order('criado_em'),
  ]);
  equipe = { membros: m.data || [], convites: c.data || [] };
  if (rota().r === 'ajustes') atualizarTela();
}

function viewLogin() {
  return `<div class="login"><form class="login-box" id="loginForm">
    <div class="mo q">Assistente</div>
    <div class="login-logo"><span class="wm">OCM <em>Filmes</em></span></div>
    <p class="sub" style="margin:4px 0 30px">Entre para ver seus quadros</p>
    <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
    <label class="field"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" minlength="6" required></label>
    <button class="btn primary block" name="acao" value="entrar">Entrar</button>
    <button class="btn block" name="acao" value="criar" style="margin-top:8px">Criar conta</button>
    <p class="login-msg" id="loginMsg"></p>
    <button type="button" class="link" data-esqueci style="width:100%;font-size:14px">Esqueci a senha</button>
  </form></div>`;
}

/* =========================================================
   PDF da proposta
   ========================================================= */
function imprimirOrcamento(c) {
  const cli = cliente(c.clienteId);
  const sub = (c.itens || []).reduce((s, i) => s + i.qtd * i.valor, 0);
  $('#print').innerHTML = `
    <div class="head"><div><h1>OCM Filmes</h1><div class="muted">Proposta comercial</div></div>
      <div style="text-align:right"><div><strong>Nº ${esc(c.numero || '')}</strong></div><div class="muted">${fmtDateFull(c.data || today())}</div></div></div>
    <div><span class="muted">Cliente:</span> <strong>${esc(cli?.nome || '')}</strong>${cli?.contato ? ` · A/C ${esc(cli.contato)}` : ''}</div>
    <div><span class="muted">Projeto:</span> <strong>${esc(c.titulo)}</strong></div>
    <table><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Valor unit.</th><th class="r">Total</th></tr>
      ${(c.itens || []).map((i) => `<tr><td>${esc(i.desc)}</td><td class="r">${esc(i.qtd)}</td><td class="r">${money(i.valor)}</td><td class="r">${money(i.qtd * i.valor)}</td></tr>`).join('')}
      ${c.desconto ? `<tr><td colspan="3" class="r">Subtotal</td><td class="r">${money(sub)}</td></tr><tr><td colspan="3" class="r">Desconto</td><td class="r">− ${money(c.desconto)}</td></tr>` : ''}
      <tr class="tot"><td colspan="3" class="r">Total</td><td class="r">${money(orcTotal(c))}</td></tr></table>
    ${c.condicoes ? `<div class="block"><strong>Condições</strong><br>${esc(c.condicoes)}</div>` : ''}
    ${c.validade ? `<div class="block muted">Proposta válida até ${fmtDateFull(c.validade)}.</div>` : ''}`;
  const t = document.title;
  document.title = `Proposta ${c.numero || ''} - ${cli?.nome || 'OCM Filmes'}`;
  window.print();
  setTimeout(() => { document.title = t; }, 1000);
}

/* =========================================================
   Arrastar cartões (mouse: arraste direto · dedo: segure e arraste)
   ========================================================= */
let drag = null;
let ultimoDrop = 0;
document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

function onCardPointerDown(e) {
  const el = e.target.closest('.kcard');
  if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const sx = e.clientX, sy = e.clientY, touch = e.pointerType !== 'mouse';
  let ativo = false, cancel = false;
  const timer = touch ? setTimeout(() => { if (!cancel) { ativo = true; iniciarDrag(el, sx, sy); } }, 260) : null;
  const move = (ev) => {
    const d = Math.hypot(ev.clientX - sx, ev.clientY - sy);
    if (!ativo) {
      if (touch) { if (d > 8) { cancel = true; clearTimeout(timer); limpar(); } return; }
      if (d < 5) return;
      ativo = true; iniciarDrag(el, sx, sy);
    }
    moverDrag(ev.clientX, ev.clientY);
  };
  const up = () => {
    clearTimeout(timer); limpar();
    if (ativo) { ultimoDrop = Date.now(); soltarDrag(); }
  };
  function limpar() { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

function iniciarDrag(el, x, y) {
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.classList.add('ghost');
  Object.assign(ghost.style, { width: r.width + 'px', left: '0px', top: '0px' });
  document.body.appendChild(ghost);
  const ph = document.createElement('div');
  ph.className = 'placeholder';
  ph.style.height = r.height + 'px';
  el.after(ph);
  el.style.display = 'none';
  document.body.classList.add('dragging');
  navigator.vibrate?.(12);
  drag = { el, ghost, ph, dx: x - r.left, dy: y - r.top, x, y, raf: 0 };
  posicionar();
  const loop = () => { if (!drag) return; autoScroll(); drag.raf = requestAnimationFrame(loop); };
  drag.raf = requestAnimationFrame(loop);
}
function posicionar() {
  const { ghost, dx, dy, x, y, ph } = drag;
  ghost.style.transform = `translate(${x - dx}px, ${y - dy}px) rotate(3deg)`;
  const alvo = document.elementFromPoint(x, y)?.closest('.col');
  if (!alvo) return;
  const lista = $('.col-cards', alvo);
  const irmaos = $$('.kcard', lista).filter((c) => c !== drag.el);
  const antes = irmaos.find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
  if (antes) { if (antes.previousElementSibling !== ph) lista.insertBefore(ph, antes); }
  else if (lista.lastElementChild !== ph) lista.appendChild(ph);
}
function moverDrag(x, y) { drag.x = x; drag.y = y; posicionar(); }
function autoScroll() {
  const board = $('#board');
  if (!board) return;
  const { x, y } = drag, b = board.getBoundingClientRect(), m = 48;
  let mexeu = false;
  if (x < b.left + m) { board.scrollLeft -= 12; mexeu = true; }
  else if (x > b.right - m) { board.scrollLeft += 12; mexeu = true; }
  const lista = drag.ph.parentElement;
  if (lista) {
    const r = lista.getBoundingClientRect();
    if (y < r.top + 30) { lista.scrollTop -= 10; mexeu = true; }
    else if (y > r.bottom - 30) { lista.scrollTop += 10; mexeu = true; }
  }
  if (mexeu) posicionar();
}
function soltarDrag() {
  const { el, ghost, ph, raf } = drag;
  cancelAnimationFrame(raf);
  const lista = ph.parentElement;
  const colId = lista.dataset.colCards;
  const ordem = [...lista.children].map((n) => (n === ph ? el.dataset.card : n === el ? null : n.dataset?.card)).filter(Boolean);
  const card = db.cards.find((c) => c.id === el.dataset.card);
  card.colunaId = colId;
  // mantém a ordem relativa dos cartões escondidos pelo filtro
  const todos = cardsDe(colId).filter((c) => !ordem.includes(c.id));
  [...ordem.map((id) => db.cards.find((c) => c.id === id)), ...todos].forEach((c, i) => { c.ordem = i; });
  ghost.remove(); ph.remove();
  document.body.classList.remove('dragging');
  drag = null;
  save();
  render();
}

/* =========================================================
   Navegação e eventos
   ========================================================= */
/* =========================================================
   Mac pelo celular (o OCM Tempo lê a fila de comandos)
   ========================================================= */
let macEstado = null, macVisto = null, aprovs = [];
const macOnline = () => !!macVisto && Date.now() - new Date(macVisto) < 3 * 60e3;
const tam = (b) => (b >= 1e12 ? (b / 1e12).toFixed(1).replace('.', ',') + ' TB' : Math.round(b / 1e9) + ' GB');
async function carregarMac() {
  const { data } = await sb.from('mac_estado').select('*').eq('workspace_id', ws).maybeSingle();
  if (data) { macEstado = data.estado; macVisto = data.visto_em; }
  const { data: ap } = await sb.from('aprovacoes').select('*').eq('workspace_id', ws).order('criado_em', { ascending: false }).limit(60);
  aprovs = ap || [];
}
function macChegou(row) {
  if (!row) return;
  const mudou = JSON.stringify(row.estado) !== JSON.stringify(macEstado) || macOnline() !== (Date.now() - new Date(row.visto_em) < 3 * 60e3);
  macEstado = row.estado; macVisto = row.visto_em;
  if (mudou && ['inicio', 'mac'].includes(rota().r)) atualizarTela();
}
function aprovChegou(row, apagou) {
  aprovs = aprovs.filter((a) => a.id !== row.id);
  if (!apagou) aprovs.unshift(row);
}

const esperando = new Map();
async function macCmd(tipo, args = {}, espera = 60) {
  const id = uid();
  const { error } = await sb.from('comandos').insert({ id, workspace_id: ws, tipo, args, status: 'pendente' });
  if (error) return { status: 'erro', resposta: { erro: error.message } };
  return new Promise((res) => {
    let n = 0, t;
    const fim = (row) => { clearInterval(t); esperando.delete(id); res(row); };
    esperando.set(id, fim);
    t = setInterval(async () => {
      n += 2;
      const { data } = await sb.from('comandos').select('status,resposta').eq('id', id).maybeSingle();
      if (data && ['ok', 'erro', 'expirado'].includes(data.status)) fim(data);
      else if (n >= espera) fim({ status: 'erro', resposta: { erro: 'O Mac não respondeu. Ele está ligado, com o OCM Tempo aberto?' } });
    }, 2000);
  });
}
const respTxt = (r) => (r.status === 'ok' ? r.resposta?.texto || 'Feito ✓' : r.status === 'expirado' ? 'O Mac não pegou o pedido a tempo.' : r.resposta?.erro || 'Não deu certo.');

function macLinhaHTML() {
  const e = macEstado;
  if (!e) return '';
  const on = macOnline();
  const hd = (e.hds || []).filter((h) => !h.cartao && h.nome !== 'Mac').sort((a, b) => b.total - a.total)[0];
  const partes = [
    e.cartao?.copiando ? `copiando cartão ${e.cartao.pct}%` : '',
    e.renders?.length ? 'renderizando' : '',
    hd ? `${esc(hd.nome)}: ${tam(hd.livre)} livres` : '',
    e.pausado ? 'contagem pausada' : '',
  ].filter(Boolean);
  return `<a class="mac-linha${on ? ' on' : ''}" href="#mac"><span class="pt"></span><b>Mac</b><span>${on ? partes.join(' · ') || 'online' : 'desligado ou sem internet'}</span><span class="seta">›</span></a>`;
}

function viewMac() {
  const e = macEstado || {};
  const on = macOnline();
  const visto = macVisto ? new Date(macVisto).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const hds = (e.hds || []).slice().sort((a, b) => (a.cartao - b.cartao) || (b.total - a.total));
  const c = e.cartao || {};
  const pre = e.premiere ? (e.ponte ? 'Premiere aberto' : 'Premiere aberto — feche e abra de novo para ligar a ponte') : 'Premiere fechado';
  const b = (tipo, txt, sub) => `<button class="mac-btn" data-mac="${tipo}"${on ? '' : ' disabled'}><b>${txt}</b><small>${sub}</small></button>`;
  return `<div class="page">
    <div class="hero">
      <div class="mo q">${on ? 'online' : 'offline'}${visto ? ' · visto ' + visto : ''}</div>
      <h1><em>Seu</em><br>Mac.</h1>
      <div class="mo q">${on ? (e.pausado ? 'contagem de tempo pausada' : e.agora ? 'agora: ' + esc(e.agora) : 'contando tempo') : 'ligue o Mac ou abra o OCM Tempo'}</div>
    </div>
    ${c.copiando ? `<div class="mac-card couro"><span class="mo q">Copiando cartão · ${esc(c.arquivos || '')}</span><b class="big">${c.pct}%</b><div class="barra"><div style="width:${c.pct}%"></div></div><small>${esc(c.atual || '')} — não tire o cartão</small></div>` : ''}
    ${!c.copiando && c.ultimo ? `<div class="mac-card"><span class="mo q">Último cartão</span><small>${esc(c.ultimo)}</small></div>` : ''}
    ${e.renders?.length ? `<div class="mac-card marinho"><span class="mo q">Renderizando</span>${e.renders.map((r) => `<small>${esc(r)}</small>`).join('')}<small style="opacity:.7">Aviso no celular quando terminar.</small></div>` : ''}
    <div class="mo q sec">Ações</div>
    <div class="mac-grid">
      ${b('estado', 'Atualizar', 'status agora')}
      ${b('print', 'Print da tela', 'ver o que está aberto')}
      ${b('projetos', 'Abrir projeto', 'Premiere / After')}
      ${b('exportar', 'Exportar', 'sequência aberta · _FINAL')}
      ${b(e.pausado ? 'retomar' : 'pausar', e.pausado ? 'Retomar' : 'Pausar', 'contagem de tempo')}
    </div>
    <div id="macRes">${ui.macRes || ''}</div>
    <div class="mo q sec">Discos</div>
    <div class="hds">${hds.length ? hds.map((h) => { const p = Math.round((1 - h.livre / h.total) * 100); return `<div class="hd${h.cartao ? ' cartao' : ''}"><div class="hd-t"><b>${esc(h.nome)}</b>${h.cartao ? '<span class="mo q">cartão</span>' : ''}<span class="mo">${tam(h.livre)} livres de ${tam(h.total)}</span></div><div class="barra${p > 90 ? ' cheio' : ''}"><div style="width:${p}%"></div></div></div>`; }).join('') : '<div class="ag vazio">Sem informação ainda.</div>'}</div>
    <div class="mo q sec">Premiere</div>
    <div class="agenda"><div class="ag"><span class="ag-h">${e.premiere ? '●' : '○'}</span><span class="ag-t">${pre}</span></div>
      ${(e.ultimos_renders || []).slice().reverse().map((r) => `<div class="ag"><span class="ag-h">${new Date(r.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span class="ag-t">✓ ${esc(r.nome)}</span><span class="ag-m">render</span></div>`).join('')}</div>
    ${(e.hoje || []).length ? `<div class="mo q sec">Tempo hoje</div><div class="agenda">${e.hoje.map((h) => `<div class="ag"><span class="ag-h">${duracao(h.seg)}</span><span class="ag-t">${esc(h.titulo)}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

async function macAcao(tipo, extra = {}) {
  const msgs = { estado: 'Perguntando ao Mac…', print: 'Tirando print…', projetos: 'Buscando projetos…', exportar: 'Mandando exportar…', pausar: 'Pausando…', retomar: 'Retomando…', abrir: 'Abrindo…' };
  if (tipo === 'exportar' && !confirm('Exportar a sequência aberta no Premiere em H.264, com _FINAL no nome?')) return;
  const mostrar = (h) => { ui.macRes = h; const el = $('#macRes'); if (el) el.innerHTML = h; };
  mostrar(`<div class="mac-res mo q">${msgs[tipo] || 'Enviando…'}</div>`);
  const r = await macCmd(tipo, extra, tipo === 'print' ? 45 : 60);
  if (r.status !== 'ok') return mostrar(`<div class="mac-res erro">${esc(respTxt(r))}</div>`);
  const d = r.resposta || {};
  if (tipo === 'estado') { macEstado = d; macVisto = new Date().toISOString(); ui.macRes = ''; return render(); }
  if (tipo === 'pausar' || tipo === 'retomar') { if (macEstado) macEstado.pausado = !!d.pausado; ui.macRes = `<div class="mac-res">${d.pausado ? 'Contagem pausada.' : 'Contagem retomada.'}</div>`; return render(); }
  if (tipo === 'print') return mostrar(`<div class="mac-res"><img class="print" src="${d.img}" alt="Tela do Mac"><small class="mut">${agoraHHMM()} · toque e segure para salvar</small></div>`);
  if (tipo === 'projetos') {
    const ps = d.projetos || [];
    return mostrar(`<div class="mac-res"><div class="agenda">${ps.length ? ps.map((p) => `<button class="ag" data-abrir="${esc(p.caminho)}"><span class="ag-h">${p.caminho.endsWith('.aep') ? 'AE' : 'PR'}</span><span class="ag-t">${esc(p.nome)}</span><span class="ag-m">${new Date(p.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span></button>`).join('') : '<div class="ag vazio">Nenhum projeto nos últimos 90 dias.</div>'}</div></div>`);
  }
  mostrar(`<div class="mac-res ok">${esc(respTxt(r))}</div>`);
}

/* Aprovação do cliente, dentro do cartão */
function aprovacaoHTML(c) {
  const a = aprovs.find((x) => x.card_id === c.id);
  if (!a) return '';
  const link = new URL('aprovar.html?t=' + a.token, location.href).href;
  const st = { enviando: 'Enviando o vídeo…', aguardando: 'Aguardando o cliente', aprovado: '✓ Aprovado', ajustes: 'Ajustes pedidos', expirado: 'Vídeo expirado (45 dias)' }[a.status] || a.status;
  return `<div class="field"><span>Aprovação do cliente</span><div class="aprov ${a.status}">
    <div class="aprov-top"><b>${st}</b><span class="mo q">${esc(a.titulo)}${a.decidido_por ? ' · ' + esc(a.decidido_por) : ''}</span></div>
    ${a.mensagem ? `<p class="aprov-msg">${esc(a.mensagem)}</p>` : ''}
    <div id="aprovComs"><span class="mo q">Carregando comentários…</span></div>
    <div class="actions">
      <button type="button" class="btn sm" data-act="aprov-copiar" data-link="${esc(link)}">Copiar link</button>
      <a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">Abrir ↗</a>
      <button type="button" class="btn sm" data-act="aprov-premiere">Levar ao Premiere</button>
    </div></div></div>`;
}
async function carregarComentarios(c) {
  const a = aprovs.find((x) => x.card_id === c.id);
  const el = $('#aprovComs', sheetForm);
  if (!a || !el) return;
  const { data } = await sb.from('aprovacao_comentarios').select('tempo,texto,autor').eq('aprovacao_id', a.id).order('tempo');
  const mmss = (t) => `${Math.floor(t / 60)}:${pad(Math.floor(t % 60))}`;
  el.innerHTML = data?.length
    ? data.map((k) => `<div class="aprov-com"><span class="mo">${mmss(k.tempo)}</span><span>${esc(k.texto)}${k.autor ? `<small> — ${esc(k.autor)}</small>` : ''}</span></div>`).join('')
    : '<span class="mo q">Sem comentários ainda.</span>';
}

/* =========================================================
   Abertura animada (uma vez por sessão do app)
   ========================================================= */
function boasVindas() {
  try { if (sessionStorage.getItem('ocm-oi')) return; sessionStorage.setItem('ocm-oi', '1'); } catch { /* sem storage: mostra mesmo assim */ }
  const t = today(), h = new Date().getHours();
  const abertos = db.cards.filter((c) => c.prazo && !concluido(c));
  const hoje = abertos.filter((c) => c.prazo === t).sort((a, b) => quando(a).localeCompare(quando(b)));
  const atras = abertos.filter((c) => c.prazo < t).length;
  const receber = db.lancamentos.filter((l) => l.tipo === 'Entrada' && !l.pago).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const prox = hoje.find((c) => c.hora && c.hora >= agoraHHMM());
  const e = macEstado || {};
  const linhas = [
    [hoje.length ? `${hoje.length} ${hoje.length === 1 ? 'coisa' : 'coisas'} para hoje` : 'Nada marcado para hoje', prox ? `próximo às ${prox.hora.replace(':', 'h')} · ${prox.titulo}` : ''],
    atras ? [`${atras} ${atras === 1 ? 'atrasada' : 'atrasadas'}`, 'vale olhar primeiro'] : null,
    receber ? [`${money(receber).replace(',00', '')} a receber`, 'no financeiro'] : null,
    e.cartao?.copiando ? [`Cartão copiando · ${e.cartao.pct}%`, 'não tire do leitor'] : null,
    e.renders?.length ? ['Render rodando no Mac', 'aviso quando terminar'] : null,
    resumos[0] && Date.now() - new Date(resumos[0].criado_em) < 12 * 3600e3 ? ['Resumo do WhatsApp', resumos[0].titulo.replace(/^📲\s*/, '').replace(/^WhatsApp\s*·\s*/i, '')] : null,
  ].filter(Boolean).slice(0, 5);
  const ola = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const dt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  abertura({ dt, ola, linhas });
}

function rota() {
  const [r, arg] = (location.hash.slice(1) || 'inicio').split('/');
  return ['inicio', 'quadros', 'quadro', 'financeiro', 'ajustes', 'mac'].includes(r) ? { r, arg } : { r: 'inicio' };
}

function render() {
  if (drag) return;
  const { r, arg } = rota();
  const main = $('#view');
  document.body.classList.toggle('deslogado', !sessao);
  if (!sessao || !carregado) {
    main.className = '';
    main.dataset.rota = '';
    main.innerHTML = !sessao ? viewLogin() : '<div class="page"><div class="empty" style="text-align:center;margin-top:30vh">Carregando seus quadros…</div></div>';
    $('#topbar').innerHTML = ''; $('#tabbar').innerHTML = ''; $('#side').innerHTML = '';
    $('#fab').hidden = true;
    return;
  }
  if (r === 'ajustes' && !equipe) carregarEquipe();
  const q = r === 'quadro' ? quadro(arg) : null;
  const scrollBoard = $('#board')?.scrollLeft || 0;
  const mesmaTela = main.dataset.rota === location.hash;

  main.className = q && (ui.modo[q.id] || 'quadro') ? 'board-mode' : '';
  main.style.setProperty('--b', q?.cor || 'transparent');
  main.innerHTML = { inicio: viewInicio, quadros: viewQuadros, quadro: () => viewQuadro(arg), financeiro: viewFinanceiro, ajustes: viewAjustes, mac: viewMac }[r]();
  main.dataset.rota = location.hash;
  if (mesmaTela && $('#board')) $('#board').scrollLeft = scrollBoard;

  // topo
  $('#topbar').innerHTML = q
    ? `<a class="iconbtn" href="#quadros" aria-label="Voltar">${ICON.back}</a><div class="t"><div class="brand"><span class="wm">OCM <em>Filmes</em></span></div><div class="sub">Quadro · ${esc(q.nome)}</div></div>`
    : `<div class="t"><div class="brand"><span class="wm">OCM <em>Filmes</em></span></div></div>`;
  $('#topbar').insertAdjacentHTML('beforeend', '<span id="sync" class="sync"></span>');
  marcarSync(syncEstado);

  // abas (celular)
  const tab = r === 'quadro' ? 'quadros' : r;
  const tabs = [['inicio', 'Início', ICON.home], ['quadros', 'Quadros', ICON.boards], ['financeiro', 'Financeiro', ICON.money], ['mac', 'Mac', ICON.mac], ['ajustes', 'Ajustes', ICON.gear]];
  $('#tabbar').innerHTML = tabs.map(([k, l, i]) => `<a href="#${k}" class="${tab === k ? 'active' : ''}">${i}${l}</a>`).join('');

  // barra lateral (computador)
  $('#side').innerHTML = `<div class="logo"><span class="wm">OCM <em>Filmes</em></span></div>
    ${tabs.filter(([k]) => k !== 'quadros').map(([k, l, i]) => `<a href="#${k}" class="${r === k ? 'active' : ''}">${i}${l}</a>`).join('')}
    <div class="sh">Quadros</div>
    ${db.quadros.map((x) => `<a href="#quadro/${x.id}" class="${q?.id === x.id ? 'active' : ''}"><span class="sq" style="background:${x.cor}"></span>${esc(x.nome)}</a>`).join('')}
    <button class="sl" data-novo-quadro style="color:var(--muted)">+ Novo quadro</button>`;

  $('#fab').hidden = r === 'quadros' || r === 'mac';
  $('#board')?.addEventListener('pointerdown', onCardPointerDown);
}

$('#fab').onclick = () => {
  const { r, arg } = rota();
  if (r === 'financeiro') return editarLancamento(null, { data: ui.mes === today().slice(0, 7) ? today() : ui.mes + '-01' });
  if (r === 'ajustes') return editarCliente(null);
  const criarEm = (q) => { const c = criarCard(q, q.colunas[0].id, ''); openCard(c.id); };
  if (r === 'quadro' && quadro(arg)) return criarEm(quadro(arg));
  openChooser('Novo cartão em…', db.quadros.map((q) => ({ label: q.nome, cor: q.cor, run: () => criarEm(q) })));
};

document.addEventListener('click', (e) => {
  const el = (s) => e.target.closest(s);
  let x;
  if (el('[data-novo-quadro]')) return novoQuadro();
  if ((x = el('[data-mac]')) && !x.disabled) return macAcao(x.dataset.mac);
  if ((x = el('[data-abrir]'))) return macAcao('abrir', { caminho: x.dataset.abrir });
  if ((x = el('.kcard[data-card]')) && Date.now() - ultimoDrop > 400) return openCard(x.dataset.card);
  if ((x = el('[data-open-card]')) && !el('select')) return openCard(x.dataset.openCard);
  const { r, arg } = rota();
  const q = r === 'quadro' ? quadro(arg) : null;
  if ((x = el('[data-modo]')) && q) { ui.modo[q.id] = x.dataset.modo; return render(); }
  if ((x = el('[data-fcli]')) && q) { ui.filtroCli[q.id] = x.dataset.fcli; return render(); }
  if (el('[data-board-menu]') && q) {
    return openChooser(q.nome, [
      { label: 'Renomear / mudar cor', run: () => editarQuadro(q) },
      { label: '+ Nova coluna', run: () => editarColuna(q) },
      ...q.colunas.map((k) => ({ label: `Editar coluna “${k.nome}”`, cor: k.cor, run: () => editarColuna(q, k.id) })),
    ]);
  }
  if ((x = el('[data-edit-col]')) && q) return editarColuna(q, x.dataset.editCol);
  if (el('[data-add-col]') && q) return editarColuna(q);
  if ((x = el('[data-pago]'))) { const l = db.lancamentos.find((t) => t.id === x.dataset.pago); l.pago = true; save(); return render(); }
  if ((x = el('[data-lanc]'))) return editarLancamento(x.dataset.lanc);
  if ((x = el('[data-mes]'))) { ui.mes = shiftMonth(ui.mes, Number(x.dataset.mes)); return render(); }
  if ((x = el('[data-cli]'))) return editarCliente(x.dataset.cli);
  if (el('[data-novo-cli]')) return editarCliente(null);
  if (el('[data-notif-ativar]')) return ativarNotif();
  if (el('[data-notif-teste]')) return testarNotif();
  if (el('[data-notif-desativar]')) return desativarNotif();
  if (el('[data-sair]') && confirm('Sair da conta neste aparelho?')) return sb.auth.signOut();
  if (el('[data-convidar]')) {
    const email = (prompt('E-mail da pessoa que você quer convidar') || '').trim().toLowerCase();
    if (!email) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return alert('E-mail inválido.');
    sb.from('convites').insert({ email, workspace_id: ws }).then(({ error }) => {
      if (error && error.code !== '23505') return alert('Não consegui convidar: ' + error.message);
      alert(`Convite criado. Mande o link do app para ${email} e peça para tocar em "Criar conta" com esse e-mail.`);
      carregarEquipe();
    });
    return;
  }
  if ((x = el('[data-desconvidar]'))) {
    sb.from('convites').delete().eq('workspace_id', ws).eq('email', x.dataset.desconvidar).then(() => carregarEquipe());
    return;
  }
  if (el('[data-esqueci]')) {
    const email = $('#loginForm')?.elements.email.value.trim() || (prompt('Seu e-mail') || '').trim();
    if (!email) return;
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(({ error }) => {
      $('#loginMsg').textContent = error ? 'Erro: ' + error.message : 'Enviamos um link para criar uma senha nova. Veja seu e-mail.';
    });
    return;
  }
  if (el('[data-export]')) {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ocm-backup-${today()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'loginForm') {
    e.preventDefault();
    const f = e.target, msg = $('#loginMsg');
    const email = f.elements.email.value.trim(), senha = f.elements.senha.value;
    const acao = e.submitter?.value || 'entrar';
    msg.textContent = 'Aguarde…';
    if (acao === 'criar') {
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) { msg.textContent = traduzErro(error); return; }
      if (!data.session) msg.textContent = 'Conta criada! Abra o e-mail que enviamos, toque no link de confirmação e depois volte aqui e toque em Entrar.';
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) msg.textContent = traduzErro(error);
    }
    return;
  }
  const f = e.target.closest('[data-quick]');
  if (!f) return;
  e.preventDefault();
  const t = f.elements.t.value.trim();
  if (!t) return;
  const q = quadro(rota().arg);
  const fcli = ui.filtroCli[q.id];
  criarCard(q, f.dataset.quick, t, fcli ? { clienteId: fcli } : {});
  render();
  const novo = $(`[data-quick="${f.dataset.quick}"] input`);
  novo?.focus();
  const lista = $(`[data-col-cards="${f.dataset.quick}"]`);
  if (lista) lista.scrollTop = lista.scrollHeight;
});

document.addEventListener('change', async (e) => {
  const s = e.target.closest('[data-status]');
  if (s) {
    const c = db.cards.find((x) => x.id === s.dataset.status);
    c.colunaId = s.value;
    c.ordem = Math.max(-1, ...cardsDe(s.value).filter((x) => x.id !== c.id).map((x) => x.ordem)) + 1;
    save(); return render();
  }
});

function traduzErro(e) {
  const m = String(e.message || e);
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar o e-mail: abra o link que enviamos e tente de novo.';
  if (/already registered/i.test(m)) return 'Esse e-mail já tem conta. Toque em Entrar.';
  if (/at least 6/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  return 'Erro: ' + m;
}

window.addEventListener('hashchange', () => { $('#view').scrollTop = 0; render(); });
document.addEventListener('visibilitychange', async () => {
  if (document.hidden || !ws || sheet.open || drag || temPendente()) return;
  try { await carregarTudo(); render(); } catch { /* sem conexão: fica com o que já tem */ }
});
window.addEventListener('online', () => save());

sb.auth.onAuthStateChange((evento, s) => {
  const antes = sessao?.user.id;
  sessao = s;
  if (evento === 'PASSWORD_RECOVERY') {
    setTimeout(async () => {
      const nova = prompt('Digite sua senha nova (mínimo 6 caracteres)');
      if (nova) { const { error } = await sb.auth.updateUser({ password: nova }); alert(error ? traduzErro(error) : 'Senha alterada!'); }
    }, 300);
  }
  if (!s) { ws = null; carregado = false; equipe = null; canal?.unsubscribe(); db = { clientes: [], quadros: [], cards: [], lancamentos: [] }; render(); return; }
  if (s.user.id !== antes) { carregado = false; render(); setTimeout(iniciarSessao, 0); }
});
render();

if ('serviceWorker' in navigator && window.isSecureContext) {
  // quando sai versão nova do app, recarrega sozinho uma vez
  const tinhaVersao = !!navigator.serviceWorker.controller;
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinhaVersao && !recarregou && !sheet.open) { recarregou = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
}
