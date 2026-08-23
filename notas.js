/* =========================================================
   Destaque de notas nos boletins do SIGAA utils.
   Pinta as notas (classe .nota), as faltas (penúltima nota
   de cada linha — marcação .nota por engano do SIGAA) e a
   situação (última nota) em cada linha da tabela.
   Módulo independente: não usa SIGAAUtils, roda sozinho.
   Registrado no manifest.json (document_idle).
   ========================================================= */
(function () {
  'use strict';

  function init() {
    // Notas: verde (8 e 9), laranja, tomate, ameixa (10)
    document.querySelectorAll('.nota').forEach((element) => {
      let cor = 'lime';
      const nota = Number(element.textContent);

      if (nota < 6) {
        cor = 'tomato';
      } else if (nota < 8) {
        cor = 'orange';
      } else if (nota === 10) {
        cor = 'plum';
      }

      element.style.color = cor;
    });

    // Faltas: penúltima nota de cada linha (classe .nota por engano do SIGAA).
    // Gradiente RGB verde (0 faltas) → vermelho (FALTAS_MAX faltas).
    const FALTAS_MAX = 25; // ponytail: ~25% de faltas numa disciplina de 80 aulas; ajuste se precisar
    document.querySelectorAll('tr').forEach((tr) => {
      const notas = tr.querySelectorAll('.nota');
      if (notas.length < 2) return;
      const faltas = Number(notas[notas.length - 2].textContent);
      if (Number.isNaN(faltas)) return;
      const t = Math.min(faltas / FALTAS_MAX, 1);
      notas[notas.length - 2].style.color =
        `rgb(${Math.round(255 * t)}, ${Math.round(255 * (1 - t))}, 0)`;
    });

    // Situação (última nota da linha): primeiro caractere "R" (REP/REC/REPF...)
    // → vermelho; qualquer outra (APR, APRN, APC...) → verde.
    document.querySelectorAll('tr').forEach((tr) => {
      const notas = tr.querySelectorAll('.nota');
      if (notas.length < 1) return;
      const situacao = notas[notas.length - 1];
      const s = situacao.textContent.trim();
      situacao.style.color = s.charAt(0) === 'R' ? 'tomato' : 'lime';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();