/* =========================================================
   Animação dos submenus da barra do SIGAA (JS Cook Menu).
   O JSCookMenu do portal mostra/esconde os submenus trocando
   style.visibility sem transição; este módulo adiciona um
   fade/slide acelerado por GPU (classe .sm-visible) e uma
   blindagem contra o erro que a lib lança ao passar o mouse
   rápido (try-catch nas funções cm*). Só age se o container
   do menu_discente existir; senão sai em silêncio (página
   intacta). Registrado no manifest.json; independente (não
   usa SIGAAUtils).
   ========================================================= */
(function () {
  'use strict';

  // 1. BLINDAGEM CONTRA ERROS DO JSCOOKMENU (a cura para o erro ao passar rápido)
  // Interceptamos as funções originais e as envolvemos em um try-catch.
  // Se a biblioteca antiga falhar internamente por causa da velocidade do mouse,
  // o erro é suprimido e a interface continua funcionando normalmente.
  const jsCookFunctions = ['cmItemMouseOver', 'cmItemMouseOut', 'cmItemMouseDown', 'cmItemMouseUp'];

  jsCookFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      const originalFunc = window[funcName];
      window[funcName] = function () {
        try {
          return originalFunc.apply(this, arguments);
        } catch (e) {
          // Erro suprimido silenciosamente para não travar a execução.
        }
      };
    }
  });

  // 2. CSS DA ANIMAÇÃO (100% acelerado por GPU e sem conflito de mouse)
  const css = `
    .ThemeOfficeSubMenu {
      opacity: 0 !important;
      transform: translateY(-12px) !important;
      /* Tempo de 0.2s é o ideal para acompanhar a velocidade do mouse sem parecer lento */
      transition: opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .ThemeOfficeSubMenu.sm-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // 3. OBSERVER CIRÚRGICO (altíssima performance)
  const menuContainer = document.getElementById('menu_form_menu_discente_j_id_jsp_1861693203_99_menu');
  if (!menuContainer) return;

  const submenus = menuContainer.querySelectorAll('.ThemeOfficeSubMenu');

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.style.visibility === 'visible') {
          target.classList.add('sm-visible');
        } else {
          target.classList.remove('sm-visible');
        }
      }
    }
  });

  submenus.forEach((submenu) => {
    observer.observe(submenu, {
      attributes: true,
      attributeFilter: ['style']
    });
  });
})();