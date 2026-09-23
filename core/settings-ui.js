/* =========================================================
   Interface e boot do SIGAA utils.
   Último script listado no manifest.json: consome os módulos
   dark-mode.js, wallpaper.js e fire.js via SIGAAUtils (já
   carregados). Constrói o botão ⚙, o painel de
   configurações e os rádios de papeis de parede
   pré-definidos (array PRESETS, visíveis só sem papel
   personalizado), e restaura as preferências salvas em
   localStorage (sigaa_utils_*). Botão e painel são anexados
   ao document.documentElement — o filter do modo escuro no
   body quebraria o position: fixed deles.
   ========================================================= */
(function () {
  'use strict';

  const LS_DARK = 'sigaa_utils_modo_escuro'; // lido no boot (quem grava é o dark-mode.js)
  const LS_PAPEL_ENABLED = 'sigaa_utils_papel_enabled';
  const LS_PAPEL_URL = 'sigaa_utils_papel_url';
  const LS_PRESET = 'sigaa_utils_papel_preset';
  const LS_LOGIN_AUTO = 'sigaa_utils_login_auto';
  const S = window.SIGAAUtils; // objeto compartilhado entre os módulos

  // Papeis de parede pré-definidos (rádios do painel). Aparecem só quando o
  // papel personalizado está desligado. Adicione { id, label } p/ crescer a lista.
  const PRESETS = [
    { id: 'nenhum', label: 'Nenhum' },
    { id: 'fogo_roxo', label: 'Fogo Roxo' },
  ];

  // Preset selecionado — lido pelo fire.js via updateFire. Nenhum é o padrão.
  function getPreset() {
    const v = localStorage.getItem(LS_PRESET);
    return PRESETS.some((p) => p.id === v) ? v : 'nenhum';
  }

  // Seleciona um preset: persiste e reconcilia o fogo (updateFire)
  function setPreset(id) {
    localStorage.setItem(LS_PRESET, id);
    S.updateFire();
  }

  // Login Automático — lido pelo login-auto.js na tela de login
  function getLoginAuto() {
    return localStorage.getItem(LS_LOGIN_AUTO) === 'true';
  }

  window.SIGAAUtils = window.SIGAAUtils || {};
  Object.assign(window.SIGAAUtils, { setPreset, getPreset, getLoginAuto });

  function anexarNoRoot(el) {
    // ponytail: botão/painel/camada fora do body — o filter do modo escuro
    // quebraria o position: fixed deles (containing block = body)
    document.documentElement.appendChild(el);
  }

  function main() {
    // ---- Botão de engrenagem (estilo em style.css) ----
    const botao = document.createElement('button');
    botao.id = 'button-mode';
    botao.textContent = '⚙';
    botao.title = 'Configurações';
    anexarNoRoot(botao);

    // ---- Painel de configurações ----
    const painel = document.createElement('div');
    painel.id = 'settings-panel';
    painel.style.display = 'none';
    anexarNoRoot(painel);

    // Opção: Alterar Modo Escuro/Claro (checkbox mostra o estado ativo)
    const labelModo = document.createElement('label');
    labelModo.className = 'settings-item';
    const checkModo = document.createElement('input');
    checkModo.type = 'checkbox';
    const spanModo = document.createElement('span');
    spanModo.textContent = 'Modo Escuro';
    labelModo.appendChild(checkModo);
    labelModo.appendChild(spanModo);
    painel.appendChild(labelModo);

    checkModo.onchange = () => {
      S.setDarkMode(checkModo.checked);
    };

    // Opção: Papel de Parede personalizado
    const labelPapel = document.createElement('label');
    labelPapel.className = 'settings-item';

    const check = document.createElement('input');
    check.type = 'checkbox';

    const spanPapel = document.createElement('span');
    spanPapel.textContent = 'Papel de Parede personalizado';

    labelPapel.appendChild(check);
    labelPapel.appendChild(spanPapel);
    painel.appendChild(labelPapel);

    // Campo para digitar a URL do papel de parede
    const inputUrl = document.createElement('input');
    inputUrl.type = 'text';
    inputUrl.placeholder = 'Digite a URL do seu papel de parede';
    inputUrl.className = 'url-input';
    painel.appendChild(inputUrl);

    // Papeis de parede pré-definidos (rádios) — visíveis só sem papel personalizado
    const grupoPresets = document.createElement('div');
    grupoPresets.id = 'preset-wallpapers';
    const radios = {};
    for (const p of PRESETS) {
      const label = document.createElement('label');
      label.className = 'settings-item';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'preset-papel'; // um só escolhido por vez
      radio.value = p.id;
      radio.addEventListener('change', () => setPreset(p.id));
      radios[p.id] = radio;
      const span = document.createElement('span');
      span.textContent = p.label;
      label.appendChild(radio);
      label.appendChild(span);
      grupoPresets.appendChild(label);
    }
    painel.appendChild(grupoPresets);

    // Opção: Login Automático (consumido pelo login-auto.js)
    const labelLogin = document.createElement('label');
    labelLogin.className = 'settings-item';
    const checkLogin = document.createElement('input');
    checkLogin.type = 'checkbox';
    const spanLogin = document.createElement('span');
    spanLogin.textContent = 'Login Automático';
    labelLogin.appendChild(checkLogin);
    labelLogin.appendChild(spanLogin);
    painel.appendChild(labelLogin);

    checkLogin.onchange = () => {
      localStorage.setItem(LS_LOGIN_AUTO, checkLogin.checked ? 'true' : 'false');
    };

    // ---- Comportamento do papel de parede ----
    function mostrarInput(visible) {
      inputUrl.style.display = visible ? '' : 'none';
    }

    // Sincroniza os rádios com o estado: custom ativo esconde/desativa e garante
    // Nenhum marcado; custom desligado restaura a seleção salva.
    function sincronizarPresets(customAtivo) {
      grupoPresets.style.display = customAtivo ? 'none' : '';
      for (const id in radios) radios[id].disabled = customAtivo;
      const atual = getPreset();
      if (radios[atual]) radios[atual].checked = true;
    }

    function definirPreset(id) {
      if (radios[id]) radios[id].checked = true;
      setPreset(id);
    }

    check.onchange = () => {
      if (check.checked) {
        localStorage.setItem(LS_PAPEL_ENABLED, 'true');
        mostrarInput(true);
        definirPreset('nenhum'); // rádios somem e voltam ao padrão Nenhum
        sincronizarPresets(true);
        const salvo = localStorage.getItem(LS_PAPEL_URL) || '';
        inputUrl.value = salvo;
        if (S.urlValida(salvo)) S.aplicarPapelDeParede(salvo);
        S.updateFire();
      } else {
        mostrarInput(false);
        S.removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_ENABLED, 'false');
        sincronizarPresets(false); // rádios voltam com a seleção salva
        S.updateFire();
      }
    };

    function tratarUrl() {
      const url = inputUrl.value.trim();
      if (S.urlValida(url)) {
        S.aplicarPapelDeParede(url);
        localStorage.setItem(LS_PAPEL_URL, url);
      } else {
        // URL inválida ou vazia: remove o papel de parede
        S.removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_URL, '');
      }
      S.updateFire();
    }

    inputUrl.addEventListener('change', tratarUrl);
    inputUrl.addEventListener('blur', tratarUrl); // salva mesmo sem Enter
    inputUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tratarUrl();
    });

    // ---- Abrir/fechar o painel ----
    botao.onclick = () => {
      painel.style.display = painel.style.display === 'none' ? '' : 'none';
    };

    document.addEventListener('click', (e) => {
      if (!painel.contains(e.target) && e.target !== botao) {
        painel.style.display = 'none';
      }
    });

    // ---- Brilho que segue o mouse (efeito do style.css) ----
    document.addEventListener('mousemove', (e) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    // ---- Restaura as configurações salvas ----
    if (localStorage.getItem(LS_DARK) === 'true') S.setDarkMode(true);
    checkModo.checked = S.isDarkMode(); // checkbox reflete o estado real

    check.checked = localStorage.getItem(LS_PAPEL_ENABLED) === 'true';
    checkLogin.checked = getLoginAuto(); // restaura o estado do checkbox
    const papelSalvo = localStorage.getItem(LS_PAPEL_URL) || '';
    inputUrl.value = papelSalvo;
    if (check.checked) {
      mostrarInput(true);
      definirPreset('nenhum'); // custom ativo força Nenhum nos pré-definidos
      sincronizarPresets(true);
      if (S.urlValida(papelSalvo)) S.aplicarPapelDeParede(papelSalvo);
    } else {
      sincronizarPresets(false); // restaura o rádio salvo (fogo inicia se for fogo_roxo)
    }

    // Reconcilia o fogo (preset fogo_roxo + sem papel personalizado) com o estado restaurado
    S.updateFire();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();