/* =========================================================
   Papel de Parede personalizado do SIGAA utils.
   Cria uma div fixa #wallpaper-layer (filha do
   documentElement, fora do filtro do modo escuro; atrás do
   conteúdo, pointer-events: none) com a imagem de fundo.
   Estados salvo em sigaa_utils_papel_enabled /
   sigaa_utils_papel_url (persistência via settings-ui.js).
   Registrado no manifest.json. Expõe via SIGAAUtils:
   aplicarPapelDeParede, removerPapelDeParede, urlValida
   (usados pelo settings-ui.js) e hasWallpaper (usado pelo
   fire.js). A classe wallpaper-active do body é controlada
   exclusivamente pelo SIGAAUtils.updateFire (fire.js).
   ========================================================= */
(function () {
  'use strict';

  const LAYER_ID = 'wallpaper-layer';

  function aplicarPapelDeParede(url) {
    // Escapa aspas e barras invertidas para não quebrar o CSS
    const limpa = url.replace(/["\\]/g, '\\$&');
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      Object.assign(layer.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '-1',
        pointerEvents: 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      });
      // ponytail: fora do body filtrado p/ manter viewport-fixed e cores naturais
      document.documentElement.appendChild(layer);
    }
    layer.style.backgroundImage = `url("${limpa}")`;
  }

  function removerPapelDeParede() {
    const layer = document.getElementById(LAYER_ID);
    if (layer) layer.remove();
  }

  function hasWallpaper() {
    return !!document.getElementById(LAYER_ID);
  }

  function urlValida(url) {
    return /^https?:\/\/.+/.test(url);
  }

  window.SIGAAUtils = window.SIGAAUtils || {};
  Object.assign(window.SIGAAUtils, {
    aplicarPapelDeParede,
    removerPapelDeParede,
    hasWallpaper,
    urlValida,
  });
})();