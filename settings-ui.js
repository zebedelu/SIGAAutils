/* =========================================================
   Interface e boot do SIGAA utils.
   Último script listado no manifest.json: consome os módulos
   dark-mode.js, wallpaper.js e fire.js via SIGAAUtils (já
   carregados). Constrói o botão ⚙ e o painel de
   configurações e restaura as preferências salvas em
   localStorage (sigaa_utils_*). Botão e painel são anexados
   ao document.documentElement — o filter do modo escuro no
   body quebraria o position: fixed deles.
   ========================================================= */
(function () {
  'use strict';

  const LS_DARK = 'sigaa_utils_modo_escuro'; // lido no boot (quem grava é o dark-mode.js)
  const LS_PAPEL_ENABLED = 'sigaa_utils_papel_enabled';
  const LS_PAPEL_URL = 'sigaa_utils_papel_url';
  const S = window.SIGAAUtils; // objeto compartilhado entre os módulos

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

    // Opção: Alterar Modo Escuro/Claro
    const itemModo = document.createElement('div');
    itemModo.className = 'settings-item';
    itemModo.textContent = 'Alterar Modo Escuro/Claro';
    itemModo.onclick = () => S.setDarkMode(!S.isDarkMode());
    painel.appendChild(itemModo);

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

    // ---- Comportamento do papel de parede ----
    function mostrarInput(visible) {
      inputUrl.style.display = visible ? '' : 'none';
    }

    check.onchange = () => {
      if (check.checked) {
        localStorage.setItem(LS_PAPEL_ENABLED, 'true');
        mostrarInput(true);
        const salvo = localStorage.getItem(LS_PAPEL_URL) || '';
        inputUrl.value = salvo;
        if (S.urlValida(salvo)) S.aplicarPapelDeParede(salvo);
        S.updateFire();
      } else {
        mostrarInput(false);
        S.removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_ENABLED, 'false');
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

    check.checked = localStorage.getItem(LS_PAPEL_ENABLED) === 'true';
    const papelSalvo = localStorage.getItem(LS_PAPEL_URL) || '';
    inputUrl.value = papelSalvo;
    if (check.checked) {
      mostrarInput(true);
      if (S.urlValida(papelSalvo)) S.aplicarPapelDeParede(papelSalvo);
    }

    // Reconcilia o fogo (escuro + sem papel de parede) com o estado restaurado
    S.updateFire();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();