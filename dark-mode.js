/* =========================================================
   Modo Escuro/Claro do SIGAA utils.
   Injeta um <style id="my-dark-mode"> que aplica
   filter: invert(1) hue-rotate(180deg) no body (não em
   html > *: botão, painel e camadas vivem fora do body
   filtrado) e regras próprias de tema escuro para esses
   elementos. Estado salvo em sigaa_utils_modo_escuro.
   Registrado no manifest.json. Expõe SIGAAUtils.setDarkMode
   e SIGAAUtils.isDarkMode (usados pelo settings-ui.js).
   ========================================================= */
(function () {
  'use strict';

  const STYLE_ID = 'my-dark-mode';
  const LS_DARK = 'sigaa_utils_modo_escuro';

  function aplicarEstilo() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* ponytail: filtra só o body — botão/painel/camada vivem fora dele
         (html > * casaria com eles agora que são filhos do documentElement) */
      body {
          background: #111 !important;
          filter: invert(1) hue-rotate(180deg) !important;
      }

      img,
      video,
      picture,
      canvas,
      svg,
      .nota {
          filter: invert(1) hue-rotate(180deg) !important;
      }

      /* Painel e botão vivem fora do body filtrado — estiliza para o escuro */
      #button-mode,
      #settings-panel {
          background: #222 !important;
          color: #eee !important;
          border-color: #555 !important;
      }
      #settings-panel {
          box-shadow: none !important;
      }
      #settings-panel .settings-item:hover {
          background: #333 !important;
      }

      /* Fogo roxo (vive fora do body) — sem re-inversão */
      #fire-layer,
      #fire-layer canvas {
          filter: none !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function isDarkMode() {
    return !!document.getElementById(STYLE_ID);
  }

  function setDarkMode(ativo) {
    // Já está no estado desejado
    if (ativo === isDarkMode()) return;

    if (ativo) aplicarEstilo();
    else document.getElementById(STYLE_ID).remove();

    localStorage.setItem(LS_DARK, ativo ? 'true' : 'false');
    // Reconcilia o fogo roxo. Só roda depois de todos os módulos
    // carregados (settings-ui.js é o último do manifest).
    SIGAAUtils.updateFire();
  }

  window.SIGAAUtils = window.SIGAAUtils || {};
  Object.assign(window.SIGAAUtils, { setDarkMode, isDarkMode });
})();