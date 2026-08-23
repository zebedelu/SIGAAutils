/* =========================================================
   Check de wiring do SIGAA utils — NÃO é carregado pela
   extensão (o manifest.json é a fonte de verdade). Roda com:
       node smoke-test.js
   Usa um stub mínimo de DOM/localStorage para carregar os
   módulos na ordem do manifest e verificar que o namespace
   SIGAAUtils conecta e que as transições de estado
   (escuro / papel de parede / fogo) se reconciliam via
   updateFire. Não testa o shader WebGL (sem gl no stub o
   fogo só não inicia, comportamento idêntico ao navegador
   sem WebGL).
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

// ---------- Stub de DOM mínimo ----------
const registry = [];
const toggles = []; // registra body.classList.toggle(classe, força)

function mkEl() {
  return {
    id: null,
    tag: null,
    style: {},
    textContent: '',
    className: '',
    type: '',
    value: '',
    parent: null,
    children: [],
    append(...kids) { this.children.push(...kids); kids.forEach(k => { k.parent = this; }); },
    appendChild(k) { this.children.push(k); k.parent = this; },
    remove() {
      const i = registry.indexOf(this);
      if (i >= 0) registry.splice(i, 1);
      if (this.parent) {
        const j = this.parent.children.indexOf(this);
        if (j >= 0) this.parent.children.splice(j, 1);
      }
    },
    addEventListener() {}, // ignorado no smoke
    contains() { return false; },
    getContext() { return null; }, // sem WebGL/2D no stub
    classList: {
      add() {}, remove() {},
      toggle(cls, force) { toggles.push([cls, force]); return !!force; },
    },
    querySelectorAll() { return []; },
  };
}

const documentStub = {
  readyState: 'complete',
  documentElement: mkEl(),
  body: mkEl(),
  getElementById(id) { return registry.find(el => el.id === id) || null; },
  createElement(tag) { const el = mkEl(); el.tag = tag; registry.push(el); return el; },
  addEventListener() {},
  querySelectorAll() { return []; },
  querySelector() { return null; }, // login-auto.js não acha inputs no stub
};

const store = {};
const localStorageStub = {
  getItem(k) { return k in store ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
};

global.location = { pathname: '/sigaa/index.do' }; // fora da tela de login
global.window = global;
global.document = documentStub;
global.localStorage = localStorageStub;
global.devicePixelRatio = 1;
global.addEventListener = () => {};

// ---------- Carrega os módulos na ordem do manifest ----------
const files = ['dark-mode.js', 'wallpaper.js', 'fire.js', 'notas.js', 'settings-ui.js', 'login-auto.js'];
for (const f of files) {
  const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
  new Function(src + `\n//# sourceURL=${f}`)();
}

// ---------- Asserts ----------
function ok(cond, msg) {
  if (!cond) { console.error('FALHOU:', msg); process.exit(1); }
  console.log('ok —', msg);
}

const S = global.SIGAAUtils;
// 1. Namespace completo (todos os módulos exportaram)
for (const fn of ['setDarkMode', 'isDarkMode', 'aplicarPapelDeParede',
  'removerPapelDeParede', 'hasWallpaper', 'urlValida', 'updateFire',
  'getPreset', 'setPreset', 'getLoginAuto']) {
  ok(typeof S[fn] === 'function', `SIGAAUtils.${fn} exposto`);
}

// 2. Estado inicial: claro, sem papel de parede, sem fogo
ok(S.isDarkMode() === false, 'começa no claro (sem <style>)');
ok(S.hasWallpaper() === false, 'começa sem papel de parede');

// 3. urlValida
ok(S.urlValida('https://exemplo.com/a.jpg'), 'url https válida');
ok(!S.urlValida('javascript:alert(1)'), 'url javascript inválida');
ok(!S.urlValida(''), 'url vazia inválida');

// 4. Modo escuro liga (style injetado + persistência), updateFire reconcilia sem wallpaper → sem fogo (sem gl)
S.setDarkMode(true);
ok(S.isDarkMode() === true, 'modo escuro liga (style no DOM)');
ok(documentStub.getElementById('my-dark-mode') !== null, '<style id="my-dark-mode"> injetado');
ok(store['sigaa_utils_modo_escuro'] === 'true', 'sigaa_utils_modo_escuro gravado');
ok(JSON.stringify(toggles[toggles.length - 1]) === JSON.stringify(['wallpaper-active', false]),
  'sem wallpaper: wallpaper-active = false');

// 5. Papel de parede liga atrás do escuro → wallpaper-active = true (body transparente)
S.aplicarPapelDeParede('https://exemplo.com/fundo.png');
ok(S.hasWallpaper() === true, '#wallpaper-layer criado');
S.updateFire();
ok(JSON.stringify(toggles[toggles.length - 1]) === JSON.stringify(['wallpaper-active', true]),
  'com wallpaper: wallpaper-active = true (o fogo não inicia)');

// 6. Apagar o escuro mantém o papel de parede
S.setDarkMode(false);
ok(S.isDarkMode() === false, 'modo escuro desliga (style removido)');
ok(store['sigaa_utils_modo_escuro'] === 'false', 'sigaa_utils_modo_escuro = false');
ok(S.hasWallpaper() === true, 'papel de parede continua');
S.updateFire();
ok(JSON.stringify(toggles[toggles.length - 1]) === JSON.stringify(['wallpaper-active', true]),
  'continua wallpaper-active = true');

// 7. Remove o papel de parede → wallpaper-active = false
S.removerPapelDeParede();
ok(S.hasWallpaper() === false, 'papel de parede removido');
S.updateFire();
ok(JSON.stringify(toggles[toggles.length - 1]) === JSON.stringify(['wallpaper-active', false]),
  'sem wallpaper nem fogo: wallpaper-active = false');

// 8. settings-ui.js construiu botão e painel no boot
ok(documentStub.getElementById('button-mode') !== null, 'botão ⚙ criado no boot');
ok(documentStub.getElementById('settings-panel') !== null, 'painel criado no boot');

// 9. Boot restaura preferências salvas (simula reload com escuro salvo;
//    recarrega TODOS os módulos na ordem do manifest)
store['sigaa_utils_modo_escuro'] = 'true';
S.setDarkMode(false); // garante estado limpo no stub
delete global.SIGAAUtils;
for (const f of files) {
  const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
  new Function(src + `\n//# sourceURL=${f}-reload.js`)();
}
ok(global.SIGAAUtils.isDarkMode() === true, 'boot restaura modo escuro salvo');

// 10. Papeis de parede pré-definidos (rádios): o preset controla o fogo
const S2 = global.SIGAAUtils;
ok(S2.getPreset() === 'nenhum', 'preset padrão é Nenhum');
S2.setPreset('fogo_roxo');
ok(S2.getPreset() === 'fogo_roxo', 'setPreset grava fogo_roxo');
ok(store['sigaa_utils_papel_preset'] === 'fogo_roxo', 'sigaa_utils_papel_preset gravado');
S2.updateFire();
ok(JSON.stringify(toggles[toggles.length - 1]) === JSON.stringify(['wallpaper-active', false]),
  'preset fogo_roxo sem WebGL no stub: fogo não inicia, wallpaper-active = false');
S2.setPreset('nenhum');
ok(S2.getPreset() === 'nenhum', 'setPreset volta p/ Nenhum');

// 11. Login automático: opção criada no painel + getLoginAuto reflete o localStorage
ok(S2.getLoginAuto() === false, 'login automático começa desligado');
ok(registry.some(el => el.textContent === 'Login Automático'), 'opção "Login Automático" criada no painel');
store['sigaa_utils_login_auto'] = 'true';
ok(S2.getLoginAuto() === true, 'getLoginAuto reflete sigaa_utils_login_auto');

console.log('\nTudo certo — wiring OK.');