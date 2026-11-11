// OCM Filmes — quadros estilo Trello / ClickUp / Monday (fase 1: dados no aparelho)

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

function prazoBadge(iso, done) {
  if (!iso) return '';
  if (done) return `<span class="badge ok">✓ ${fmtDate(iso)}</span>`;
  const n = diffDays(iso);
  if (n < 0) return `<span class="badge danger">${fmtDate(iso)} · atrasado</span>`;
  if (n === 0) return `<span class="badge warn">Hoje</span>`;
  if (n === 1) return `<span class="badge warn">Amanhã</span>`;
  if (n <= 7) return `<span class="badge info">${fmtDate(iso)}</span>`;
  return `<span class="badge">${fmtDate(iso)}</span>`;
}

/* =========================================================
   Cores e ícones
   ========================================================= */
const CORES = [
  { nome: 'Cinza', v: '#7c818c' }, { nome: 'Roxo', v: '#8a5cf5' }, { nome: 'Azul', v: '#2f7cf6' },
  { nome: 'Ciano', v: '#0ea5b7' }, { nome: 'Verde', v: '#1fa56a' }, { nome: 'Amarelo', v: '#d9a400' },
  { nome: 'Laranja', v: '#f07c12' }, { nome: 'Rosa', v: '#e2489a' }, { nome: 'Vermelho', v: '#e2483d' },
];
const COR = Object.fromEntries(CORES.map((c) => [c.nome, c.v]));
const PRIO = { Urgente: COR.Vermelho, Alta: COR.Laranja, Média: COR.Azul, Baixa: COR.Cinza };
const corDe = (s) => CORES[1 + (hash(s) % (CORES.length - 1))].v;

const ICON = {
  home: '<svg class="i" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  boards: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7v8M12 7v4M16 7v10"/></svg>',
  money: '<svg class="i" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  gear: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  text: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
};

/* =========================================================
   Dados
   ========================================================= */
const KEY = 'ocm-quadros-v1';
const col = (nome, cor, extra = {}) => ({ id: uid(), nome, cor: COR[cor], ...extra });
const MODELOS = {
  simples: { nome: 'Simples (A fazer · Fazendo · Feito)', tipo: 'livre', cols: () => [col('A fazer', 'Cinza'), col('Fazendo', 'Azul'), col('Feito', 'Verde', { concluida: true })] },
  producao: { nome: 'Produção de vídeo', tipo: 'livre', cols: () => [col('A iniciar', 'Cinza'), col('Pré-produção', 'Roxo'), col('Captação', 'Azul'), col('Edição', 'Ciano'), col('Aprovação', 'Laranja'), col('Ajustes', 'Rosa'), col('Entregue', 'Verde', { concluida: true })] },
  orcamentos: { nome: 'Orçamentos', tipo: 'orcamentos', cols: () => [col('Rascunho', 'Cinza'), col('Enviado', 'Azul'), col('Negociando', 'Laranja'), col('Aprovado', 'Verde', { concluida: true }), col('Recusado', 'Vermelho', { concluida: true })] },
};

function seed() {
  const producao = { id: uid(), nome: 'Produção', cor: COR.Roxo, tipo: 'livre', colunas: MODELOS.producao.cols() };
  const tarefas = { id: uid(), nome: 'Tarefas', cor: COR.Azul, tipo: 'livre', colunas: [col('A fazer', 'Cinza'), col('Fazendo', 'Azul'), col('Esperando retorno', 'Amarelo'), col('Feito', 'Verde', { concluida: true })] };
  const orcamentos = { id: uid(), nome: 'Orçamentos', cor: COR.Verde, tipo: 'orcamentos', colunas: MODELOS.orcamentos.cols() };
  return {
    v: 1,
    clientes: [],
    quadros: [producao, tarefas, orcamentos],
    cards: [],
    lancamentos: [],
    seq: { orcamento: 0 },
  };
}
function novoCard(quadro, colunaId, titulo, extra = {}, ordem = 0) {
  return {
    id: uid(), quadroId: quadro.id, colunaId, ordem, titulo,
    descricao: '', clienteId: '', prazo: '', prioridade: '', responsavel: '', link: '',
    checklist: [], criadoEm: new Date().toISOString(), ...extra,
  };
}
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert('Não consegui salvar: ' + e.message); } }
let db = load() || seed();
save();

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
  if (q.tipo === 'orcamentos') Object.assign(c, { numero: `${new Date().getFullYear()}-${String(++db.seq.orcamento).padStart(3, '0')}`, itens: [], desconto: 0, data: today(), validade: addDays(today(), 15), condicoes: '' });
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
      ${onDelete ? `<button type="button" class="btn danger block" data-act="delete" style="margin-top:18px">${esc(deleteLabel)}</button>` : ''}</div>`;
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
      <span class="chipc" style="--c:${q.cor}">${esc(q.nome)}${c.numero ? ` · nº ${esc(c.numero)}` : ''}</span>
      <span></span>
      <button type="button" class="link strong" data-act="close">Fechar</button>
    </div>
    <div class="sheet-body">
      <textarea class="card-title" name="titulo" rows="1" placeholder="Título do cartão">${esc(c.titulo)}</textarea>
      <label class="field status-big" style="--c:${colAtual?.cor}"><span>Status</span>
        <select name="colunaId">${q.colunas.map((k) => `<option value="${k.id}"${k.id === c.colunaId ? ' selected' : ''}>${esc(k.nome)}</option>`).join('')}</select></label>
      <div class="grid2">
        ${fieldHTML({ name: 'clienteId', label: 'Cliente', type: 'select', options: clienteOpts }, c.clienteId)}
        ${fieldHTML({ name: 'prazo', label: isOrc ? 'Retorno até' : 'Prazo', type: 'date' }, c.prazo)}
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
      ${fieldHTML({ name: 'link', label: 'Link (Drive, Frame.io…)', type: 'url', placeholder: 'https://' }, c.link)}
      ${c.link ? `<p style="margin:-6px 2px 14px"><a href="${esc(c.link)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">Abrir link ↗</a></p>` : ''}
      <button type="button" class="btn danger block" data-act="delete" style="margin-top:12px">Excluir cartão</button>
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
    Object.assign(c, { clienteId: f.clienteId.value, prazo: f.prazo.value, prioridade: f.prioridade.value, responsavel: f.responsavel.value.trim(), descricao: f.descricao.value, link: f.link.value.trim() });
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
      const q = { id: uid(), nome: d.nome, cor: d.cor || COR.Azul, tipo: m.tipo, colunas: m.cols() };
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
  return `<article class="kcard${done ? ' done' : ''}" data-card="${c.id}">
    ${c.prioridade ? `<div class="labels"><span class="label" style="--c:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span></div>` : ''}
    <div class="kt">${esc(c.titulo)}</div>
    <div class="km">${[
      prazoBadge(c.prazo, done),
      ck.length ? `<span class="badge${feitos === ck.length ? ' ok' : ''}">${ICON.check} ${feitos}/${ck.length}</span>` : '',
      c.descricao ? `<span class="badge" title="Tem descrição">${ICON.text}</span>` : '',
      q.tipo === 'orcamentos' && orcTotal(c) ? `<span class="badge num">${money(orcTotal(c))}</span>` : '',
      cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : '',
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
      <div class="meta"><span class="pill" style="--c:${k?.cor}">${esc(k?.nome)}</span>${prazoBadge(c.prazo, k?.concluida)}${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}<span>${esc(q.nome)}</span></div>
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
  const abertos = db.cards.filter((c) => c.prazo && !concluido(c)).sort((a, b) => a.prazo.localeCompare(b.prazo));
  const atrasados = abertos.filter((c) => c.prazo < t);
  const hoje = abertos.filter((c) => c.prazo === t);
  const prox = abertos.filter((c) => c.prazo > t && c.prazo <= semana);
  const aReceber = db.lancamentos.filter((l) => l.tipo === 'Entrada' && !l.pago).reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const h = new Date().getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `<div class="page">
    <div class="hello"><h1>${saud}!</h1><div class="sub">${cap(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div></div>
    <div class="stats four" style="margin-top:14px">
      <div class="stat"><div class="k">Atrasados</div><div class="v${atrasados.length ? ' neg' : ''}">${atrasados.length}</div></div>
      <div class="stat"><div class="k">Para hoje</div><div class="v">${hoje.length}</div></div>
      <div class="stat"><div class="k">Próximos 7 dias</div><div class="v">${prox.length}</div></div>
      <a class="stat" href="#financeiro"><div class="k">A receber</div><div class="v">${money(aReceber)}</div></a>
    </div>
    ${atrasados.length ? sec('Atrasados', atrasados.length) + box(atrasados.map(rowCardHTML)) : ''}
    ${sec('Hoje', hoje.length)}${box(hoje.map(rowCardHTML), 'Nada com prazo para hoje.')}
    ${sec('Próximos 7 dias', prox.length)}${box(prox.map(rowCardHTML), 'Nada nos próximos 7 dias.')}
    ${sec('Seus quadros')}${tilesHTML()}
  </div>`;
}
function tilesHTML() {
  return `<div class="tiles">${db.quadros.map((q) => {
    const n = db.cards.filter((c) => c.quadroId === q.id && !concluido(c)).length;
    return `<a class="tile" href="#quadro/${q.id}" style="--c:${q.cor}">${esc(q.nome)}<small>${n} ${n === 1 ? 'cartão aberto' : 'cartões abertos'}</small></a>`;
  }).join('')}<button class="tile new" data-novo-quadro>+ Criar quadro</button></div>`;
}
function viewQuadros() {
  return `<div class="page"><h1 style="margin:14px 0 14px">Quadros</h1>${tilesHTML()}</div>`;
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
      <h1>${esc(q.nome)}</h1>
      <div class="seg"><button class="${modo === 'quadro' ? 'on' : ''}" data-modo="quadro">Quadro</button><button class="${modo === 'lista' ? 'on' : ''}" data-modo="lista">Lista</button></div>
      <button class="iconbtn" data-board-menu aria-label="Opções do quadro">${ICON.more}</button>
    </div>
    ${clis.length ? `<div class="board-filters chips"><button class="chip${!fcli ? ' on' : ''}" data-fcli="">Todos</button>${clis.map((c) => `<button class="chip${fcli === c.id ? ' on' : ''}" data-fcli="${c.id}">${esc(c.nome)}</button>`).join('')}</div>` : ''}`;

  if (modo === 'lista') {
    return head + `<div class="lista">${q.colunas.map((k) => {
      const cs = cardsDe(k.id).filter(passa);
      return `<div class="group" style="--c:${k.cor}">
        <div class="group-head">${esc(k.nome)} <span class="count">${cs.length} ${cs.length === 1 ? 'item' : 'itens'}${isOrc && cs.length ? ' · ' + money(cs.reduce((s, c) => s + orcTotal(c), 0)) : ''}</span></div>
        <div class="table">
          <div class="trow head${isOrc ? ' has-val' : ''}"><div>Item</div><div class="tc-center">Status</div><div>Cliente</div><div>Prazo</div><div class="tc-center">Prioridade</div>${isOrc ? '<div>Valor</div>' : ''}</div>
          ${cs.map((c) => { const cli = cliente(c.clienteId); return `<div class="trow${isOrc ? ' has-val' : ''}" data-open-card="${c.id}">
            <div>${esc(c.titulo)}</div>
            <div><select class="status-sel" style="--c:${k.cor}" data-status="${c.id}">${q.colunas.map((x) => `<option value="${x.id}"${x.id === k.id ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>
            <div class="tc-cli">${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}</div>
            <div class="tc-prazo">${prazoBadge(c.prazo, k.concluida)}</div>
            <div class="tc-prio">${c.prioridade ? `<span class="prio" style="--c:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span>` : ''}</div>
            ${isOrc ? `<div class="tc-val num">${money(orcTotal(c))}</div>` : ''}
            <div class="tc-meta">${prazoBadge(c.prazo, k.concluida)}${c.prioridade ? `<span class="badge" style="color:${PRIO[c.prioridade]}">${esc(c.prioridade)}</span>` : ''}${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}${isOrc ? `<span class="num">${money(orcTotal(c))}</span>` : ''}</div>
          </div>`; }).join('')}
          <form class="quick-add" data-quick="${k.id}"><input name="t" placeholder="+ Adicionar item" enterkeyhint="done"></form>
        </div></div>`;
    }).join('')}</div>`;
  }

  return head + `<div class="board" id="board">${q.colunas.map((k) => {
    const cs = cardsDe(k.id).filter(passa);
    return `<section class="col" data-col="${k.id}">
      <header class="col-head" data-edit-col="${k.id}"><span class="pill" style="--c:${k.cor}">${esc(k.nome)}</span><span class="count">${cs.length}</span>${isOrc && cs.length ? `<span class="sum">${money(cs.reduce((s, c) => s + orcTotal(c), 0))}</span>` : ''}</header>
      <div class="col-cards" data-col-cards="${k.id}">${cs.map((c) => kcardHTML(c, q)).join('')}</div>
      <form class="quick-add" data-quick="${k.id}"><input name="t" placeholder="+ Adicionar cartão" enterkeyhint="done"></form>
    </section>`;
  }).join('')}<button class="add-col" data-add-col>+ Nova coluna</button></div>`;
}

function viewFinanceiro() {
  const ym = ui.mes, r = resumoMes(ym);
  const ls = [...r.ls].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const row = (l) => {
    const ent = l.tipo === 'Entrada';
    const atras = !l.pago && l.data && l.data < today();
    const cli = cliente(l.clienteId);
    return `<div class="row" data-lanc="${l.id}">
      <span class="bar" style="background:${ent ? COR.Verde : COR.Vermelho}"></span>
      <div class="main"><div class="title">${esc(l.descricao)}</div>
        <div class="meta"><span>${fmtDate(l.data)}</span><span>${esc(l.categoria || '')}</span>${cli ? `<span class="chipc" style="--c:${corDe(cli.id)}">${esc(cli.nome)}</span>` : ''}
        ${l.pago ? `<span class="badge ok">${ent ? 'Recebido' : 'Pago'}</span>` : `<button class="badge${atras ? ' danger' : ''}" data-pago="${l.id}" style="border:0">${ent ? 'A receber' : 'A pagar'}${atras ? ' · atrasado' : ''} — marcar ✓</button>`}</div></div>
      <div class="right num ${ent ? 'pos' : 'neg'}">${ent ? '+' : '−'} ${money(l.valor)}</div></div>`;
  };
  return `<div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0">
      <button class="iconbtn" data-mes="-1" aria-label="Mês anterior">‹</button><h1 style="font-size:20px">${monthLabel(ym)}</h1><button class="iconbtn" data-mes="1" aria-label="Próximo mês">›</button>
    </div>
    <div class="stats four">
      <div class="stat"><div class="k">Entradas</div><div class="v pos">${money(r.entRec)}</div><div class="s">previsto ${money(r.entPrev)}</div></div>
      <div class="stat"><div class="k">Saídas</div><div class="v neg">${money(r.saiPag)}</div><div class="s">previsto ${money(r.saiPrev)}</div></div>
      <div class="stat"><div class="k">Saldo realizado</div><div class="v">${money(r.entRec - r.saiPag)}</div></div>
      <div class="stat"><div class="k">Saldo previsto</div><div class="v">${money(r.entPrev - r.saiPrev)}</div></div>
    </div>
    ${sec('Lançamentos', ls.length)}${box(ls.map(row), 'Nenhum lançamento neste mês. Toque em + para adicionar.')}
  </div>`;
}

function viewAjustes() {
  const cls = [...db.clientes].sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="page"><h1 style="margin:14px 0 4px">Ajustes</h1>
    ${sec('Clientes', cls.length)}
    ${box(cls.map((c) => `<div class="row" data-cli="${c.id}"><span class="avatar" style="--c:${corDe(c.id)}">${esc(iniciais(c.nome))}</span><div class="main"><div class="title">${esc(c.nome)}</div>${c.contato || c.telefone ? `<div class="meta">${esc([c.contato, c.telefone].filter(Boolean).join(' · '))}</div>` : ''}</div></div>`), 'Nenhum cliente.')}
    <div class="actions"><button class="btn" data-novo-cli>+ Novo cliente</button></div>
    ${sec('Notificações')}
    <div class="card"><div class="settings-note">Os avisos de prazo no iPhone entram na fase 2, quando o app for publicado online.</div></div>
    ${sec('Backup')}
    <div class="card"><div class="settings-note">Nesta fase os dados ficam só neste aparelho. Exporte um backup de vez em quando.</div></div>
    <div class="actions"><button class="btn" data-export>Exportar backup</button><label class="btn">Importar backup<input type="file" accept="application/json,.json" data-import hidden></label></div>
  </div>`;
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
function rota() {
  const [r, arg] = (location.hash.slice(1) || 'inicio').split('/');
  return ['inicio', 'quadros', 'quadro', 'financeiro', 'ajustes'].includes(r) ? { r, arg } : { r: 'inicio' };
}

function render() {
  if (drag) return;
  const { r, arg } = rota();
  const main = $('#view');
  const q = r === 'quadro' ? quadro(arg) : null;
  const scrollBoard = $('#board')?.scrollLeft || 0;
  const mesmaTela = main.dataset.rota === location.hash;

  main.className = q && (ui.modo[q.id] || 'quadro') ? 'board-mode' : '';
  main.style.setProperty('--b', q?.cor || 'transparent');
  main.innerHTML = { inicio: viewInicio, quadros: viewQuadros, quadro: () => viewQuadro(arg), financeiro: viewFinanceiro, ajustes: viewAjustes }[r]();
  main.dataset.rota = location.hash;
  if (mesmaTela && $('#board')) $('#board').scrollLeft = scrollBoard;

  // topo
  $('#topbar').innerHTML = q
    ? `<a class="iconbtn" href="#quadros" aria-label="Voltar">${ICON.back}</a><div class="t"><div class="brand">OCM Filmes</div><div class="sub">Quadro · ${esc(q.nome)}</div></div>`
    : `<div class="t"><div class="brand">OCM Filmes</div></div>`;

  // abas (celular)
  const tab = r === 'quadro' ? 'quadros' : r;
  const tabs = [['inicio', 'Início', ICON.home], ['quadros', 'Quadros', ICON.boards], ['financeiro', 'Financeiro', ICON.money], ['ajustes', 'Ajustes', ICON.gear]];
  $('#tabbar').innerHTML = tabs.map(([k, l, i]) => `<a href="#${k}" class="${tab === k ? 'active' : ''}">${i}${l}</a>`).join('');

  // barra lateral (computador)
  $('#side').innerHTML = `<div class="logo">OCM Filmes</div>
    ${tabs.filter(([k]) => k !== 'quadros').map(([k, l, i]) => `<a href="#${k}" class="${r === k ? 'active' : ''}">${i}${l}</a>`).join('')}
    <div class="sh">Quadros</div>
    ${db.quadros.map((x) => `<a href="#quadro/${x.id}" class="${q?.id === x.id ? 'active' : ''}"><span class="sq" style="background:${x.cor}"></span>${esc(x.nome)}</a>`).join('')}
    <button class="sl" data-novo-quadro style="color:var(--muted)">+ Novo quadro</button>`;

  $('#fab').hidden = r === 'quadros';
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
  if (el('[data-export]')) {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ocm-backup-${today()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
  }
});

document.addEventListener('submit', (e) => {
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
  const imp = e.target.closest('[data-import]');
  if (imp?.files[0]) {
    try {
      const novo = JSON.parse(await imp.files[0].text());
      if (!Array.isArray(novo.quadros) || !Array.isArray(novo.cards)) throw new Error('arquivo não parece um backup deste app');
      if (confirm('Substituir todos os dados deste aparelho pelo backup?')) { db = novo; save(); render(); }
    } catch (err) { alert('Não consegui importar: ' + err.message); }
  }
});

window.addEventListener('hashchange', () => { $('#view').scrollTop = 0; render(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !sheet.open) render(); });
render();

if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
