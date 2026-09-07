/* Check de wiring do notas-home.js — NÃO é carregado pela extensão.
   Roda com:  node notas-home-check.js
   Fixture sintética (sem dados pessoais): form com onclick jsfcljs
   + hidden ViewState, resposta 1 com ViewState + link "Ver Notas",
   resposta 2 com
   div.notas > table.tabelaRelatorio (1 avaliação, 3 células de nota). */
'use strict';

// --- stubs mínimos de DOM (base de progresso-check.js) ---
const registry = [];

function mkEl(tag) {
  const el = {
    tag, id: null, className: '', children: [], parentNode: null,
    style: {}, attrs: {}, dataset: {}, colSpan: 0, type: '',
    _handlers: {}, _texto: '',
    classList: {
      contains(c) { return el.className.split(/\s+/).includes(c); },
    },
    appendChild(k) { this.children.push(k); k.parentNode = this; return k; },
    append(...ks) { ks.forEach((k) => this.appendChild(k)); },
    insertAdjacentElement(pos, k) {
      if (this.parentNode) {
        const sibs = this.parentNode.children;
        sibs.splice(sibs.indexOf(this) + 1, 0, k);
        k.parentNode = this.parentNode;
      }
      return k;
    },
    insertBefore(k, ref) {
      const i = this.children.indexOf(ref);
      if (i < 0) this.children.push(k); else this.children.splice(i, 0, k);
      k.parentNode = this;
      return k;
    },
    addEventListener(ev, fn) { (this._handlers[ev] = this._handlers[ev] || []).push(fn); },
    click() { (this._handlers.click || []).forEach((fn) => fn({})); },
    closest(sel) {
      let e = this;
      while (e) { if (match(e, sel)) return e; e = e.parentNode; }
      return null;
    },
    get nextElementSibling() {
      if (!this.parentNode) return null;
      const sibs = this.parentNode.children;
      return sibs[sibs.indexOf(this) + 1] || null;
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; },
    querySelector(s) { return collect(this, s, [])[0] || null; },
    querySelectorAll(s) { return collect(this, s, []); },
  };
  // textContent como no DOM real: set limpa filhos; get concatena descendentes
  Object.defineProperty(el, 'textContent', {
    get() {
      return el.children.length
        ? el.children.map((c) => c.textContent).join('')
        : el._texto;
    },
    set(v) { el._texto = String(v); el.children = []; },
  });
  registry.push(el);
  return el;
}

function match(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.className.split(/\s+/).includes(sel.slice(1));
  if (sel.startsWith('input[type="hidden"]')) return el.tag === 'input' && el.attrs.type === 'hidden';
  if (sel.startsWith('input[name="javax.faces.ViewState"]')) return el.tag === 'input' && el.attrs.name === 'javax.faces.ViewState';
  if (sel.startsWith('tbody tr td')) return el.tag === 'td';
  if (sel.startsWith('form[id^=')) return el.tag === 'form' && (el.id || '').startsWith('form_acessarTurmaVirtual');
  return el.tag === sel;
}
function collect(el, sel, out) {
  for (const c of el.children || []) {
    if (match(c, sel)) out.push(c);
    collect(c, sel, out);
  }
  return out;
}
function setQuery(el) {
  el.querySelector = (s) => collect(el, s, [])[0] || null;
  el.querySelectorAll = (s) => collect(el, s, []);
}

function assert(cond, msg) {
  if (!cond) { console.error('FALHOU:', msg); process.exitCode = 1; }
  else console.log('ok —', msg);
}

// --- nós-moke para os docs do DOMParser (objetos pré-montados) ---
function mkNode(over) {
  const n = {
    textContent: '', attrs: {}, children: [],
    getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; },
    querySelector: (s) => { throw new Error('querySelector inesperado: ' + s); },
    querySelectorAll: (s) => { throw new Error('querySelectorAll inesperado: ' + s); },
  };
  Object.assign(n, over);
  return n;
}

// resposta 1: Turma Virtual com ViewState + link "Ver Notas"
const vsNode = mkNode({ attrs: { value: 'j_idViewState1' } });
const linkNode = mkNode({
  textContent: 'Ver Notas',
  attrs: { onclick: "jsfcljs(document.getElementById('formMenu'),{'formMenu:j_id2':'formMenu:j_id2'},''); return false;" },
});
const docTurmaVirtual = {
  querySelector(s) {
    if (s === 'input[name="javax.faces.ViewState"]') return vsNode;
    return null;
  },
  querySelectorAll(s) {
    if (s === 'a') return [linkNode];
    return [];
  },
};

// resposta 2: página de notas com div.notas > table.tabelaRelatorio
function mkTabelaNotasDoc() {
  const ths = ['Matrícula', 'Nome', 'P1', 'Média', 'Sit.'].map((t) => mkNode({ textContent: t }));
  const hidden = [
    mkNode({ attrs: { id: 'abrevAval_1', value: 'P1' } }),
    mkNode({ attrs: { id: 'denAval_1', value: 'Prova 1' } }),
    mkNode({ attrs: { id: 'pesoAval_1', value: '25' } }),
  ];
  const tds = ['123', 'Fulano de Teste', '9,0', '5,0', '10,0'].map((t) => mkNode({ textContent: t }));
  const trHead = mkNode({ children: ths });
  trHead.querySelectorAll = (s) => (s === 'th' ? ths : []);
  const trSub = mkNode({ children: hidden });
  trSub.querySelectorAll = (s) => (s === 'input[type="hidden"]' ? hidden : []);
  const trData = mkNode({ children: tds });
  trData.querySelectorAll = () => [];
  const tabela = mkNode({ children: [trHead, trSub, trData] });
  tabela.querySelectorAll = (s) => {
    if (s === 'tr') return [trHead, trSub, trData];
    if (s === 'th') return ths;
    if (s === 'input[type="hidden"]') return hidden;
    if (s === 'tbody tr td') return tds; // ponytail: stub trata toda tr como tbody
    return [];
  };
  return { querySelector(s) { return s === 'div.notas > table.tabelaRelatorio' ? tabela : null; } };
}
const docNotas = mkTabelaNotasDoc();
const docSemTabela = { querySelector: () => null };

global.DOMParser = class {
  parseFromString(html) {
    if (html.includes('tabelaRelatorio')) return docNotas;
    if (html.includes('Ver Notas')) return docTurmaVirtual;
    return docSemTabela;
  }
};

// fetch stub: roteia pelo conteúdo do body (POST1 = frontEndIdTurma; POST2 = ViewState)
let chamadas = 0;
global.fetch = (url, opts) => {
  chamadas++;
  const body = opts.body;
  if (body.includes('frontEndIdTurma')) {
    if (!body.includes('vsHome123')) return Promise.reject(new Error('body1 sem ViewState do form'));
    return Promise.resolve({ ok: true, text: () => Promise.resolve('HTML_TURMA_VIRTUAL com Ver Notas') });
  }
  if (!body.includes('javax.faces.ViewState')) return Promise.reject(new Error('body2 sem ViewState'));
  if (!body.includes('j_idViewState1')) return Promise.reject(new Error('body2 com ViewState errado'));
  return Promise.resolve({ ok: true, text: () => Promise.resolve('HTML_NOTAS com tabelaRelatorio') });
};

global.window = global;

// --- fixture de DOM fake: tr.odd > td.descricao > form ---
const document = {
  readyState: 'complete',
  head: mkEl('head'),
  body: mkEl('body'),
  createElement: (t) => mkEl(t),
  getElementById(id) { return registry.find((e) => e.id === id) || null; },
};

const tdDescricao = mkEl('td');
tdDescricao.className = 'descricao';
const trOdd = mkEl('tr');
trOdd.className = 'odd';
const form = mkEl('form');
form.id = 'form_acessarTurmaVirtual:99';
form.attrs.action = '/sigaa/portais/discente/turmas.jsf';
const linkForm = mkEl('a');
linkForm.attrs.onclick = "jsfcljs(document.getElementById('form_acessarTurmaVirtual:99'),{'frontEndIdTurma':'987654'},''); return false;";
form.appendChild(linkForm);
const vsHome = mkEl('input');
vsHome.setAttribute('type', 'hidden');
vsHome.setAttribute('name', 'javax.faces.ViewState');
vsHome.setAttribute('value', 'vsHome123');
form.appendChild(vsHome);
setQuery(form);
tdDescricao.appendChild(form);
trOdd.appendChild(tdDescricao);
document.body.appendChild(trOdd);
setQuery(document.body);
document.querySelectorAll = (s) => collect(document.body, s, []);
document.createElement('style'); // warm-up do registry p/ getElementById

global.document = document;

require('./notas-home.js');
// init roda no load (readyState !== 'loading'); carregar depois do DOM fake

// --- asserts: núcleo ---
const m = global.window.SIGAAUtilsNotasHome;
assert(!!m, 'window.SIGAAUtilsNotasHome exposto (modo Node)');

const mapa = m.extrairMapaOnclick(form);
assert(mapa && mapa.frontEndIdTurma === '987654', 'extrairMapaOnclick pega frontEndIdTurma do onclick');
const formSemOnclick = mkEl('form');
setQuery(formSemOnclick);
assert(m.extrairMapaOnclick(formSemOnclick) === null, 'extrairMapaOnclick retorna null sem onclick');

let resultado = null;
m.buscarNotas(form).then((res) => {
  resultado = res;
  assert(resultado && resultado.ok === true, 'buscarNotas ok (2 POSTs, ViewState propagado)');

  // --- asserts: parse ---
  const parsed = m.parsearTabelaNotas(docNotas);
  assert(parsed && parsed.cabecalhos[0] === 'Matrícula', "parse: cabeçalho 0 = 'Matrícula'");
  assert(parsed && parsed.avaliacoes[0] && parsed.avaliacoes[0].abrev === 'P1', "parse: avaliação abrev = 'P1'");
  assert(parsed && parsed.linha && parsed.linha.matricula === '123', "parse: matrícula = '123'");
  assert(parsed && parsed.linha.celulas.length === 5, 'parse: 5 células na linha');
  assert(m.parsearTabelaNotas(docSemTabela) === null, 'parse: null sem div.notas > tabelaRelatorio');

  // --- asserts: classificarNota ---
  assert(m.classificarNota('9,0') === 'nh-nok', "classificarNota('9,0') = nh-nok");
  assert(m.classificarNota('5,0') === 'nh-n6', "classificarNota('5,0') = nh-n6");
  assert(m.classificarNota('10,0') === 'nh-n10', "classificarNota('10,0') = nh-n10");
  assert(m.classificarNota('--') === '', "classificarNota('--') = ''");

  // --- asserts: wiring da UI ---
  const botao = collect(document.body, '.nh-btn', [])[0];
  assert(!!botao, 'botão Ver notas criado');
  assert(botao && botao.parentNode === tdDescricao && botao.type === 'button',
    'botão dentro do td.descricao, depois do form, type=button');
  assert(collect(document.body, 'form[id^="form_acessarTurmaVirtual"]', []).length === 1,
    'init achou o form da matéria');

  if (botao) {
    chamadas = 0; // o assert direto de buscarNotas já consumiu chamadas; mede só o fluxo do clique
    botao.click();
    const painel = collect(document.body, '.nh-painel', [])[0];
    assert(!!painel, 'clique cria tr.nh-painel após a linha da matéria');
    const tdP = painel && painel.children[0];
    assert(tdP && tdP.colSpan === 4, 'painel com td colSpan=4');
    assert(tdP && tdP.textContent === 'Carregando notas...', 'painel inicia com Carregando notas...');

    setTimeout(() => {
      if (process.env.NH_DEBUG) {
        console.log('DIAG chamadas=', chamadas, 'tdP=', tdP.textContent);
      }
      assert(chamadas === 2, '2 POSTs feitos (1 clique)');
      const tabelaUI = collect(document.body, '.nh-table', [])[0];
      assert(!!tabelaUI, 'painel mostra table.nh-table');
      const tdsUI = collect(tabelaUI || {}, 'td', []);
      const cls = (i) => (tdsUI[i] ? tdsUI[i].className : '');
      assert(cls(2) === 'nh-nok', "nota '9,0' com classe nh-nok");
      assert(cls(3) === 'nh-n6', "nota '5,0' com classe nh-n6");
      assert(cls(4) === 'nh-n10', "nota '10,0' com classe nh-n10");

      // 2º clique: cache — sem novas chamadas
      botao.click();
      setTimeout(() => {
        assert(chamadas === 2, '2º clique usa cache (sem novos POSTs)');
        assert(collect(document.body, '.nh-painel', []).length === 1, '2º clique reusa o mesmo painel');
        assert(!!document.getElementById('notas-home-css'), '<style id="notas-home-css"> injetado');
        console.log(process.exitCode ? '\nFALHAS DETECTADAS' : '\nTudo certo — notas-home.js OK.');
      }, 0);
    }, 0);
  }
}).catch((e) => { console.error('FALHOU: promise rejeitada', e); process.exitCode = 1; });
