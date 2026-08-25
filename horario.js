/* =========================================================
   Horários acadêmicos — mostra o horário das aulas na home.
   Independente (não usa SIGAAUtils). Lê horarios/index.json
   (gerado por horarios/fatiar_horarios.py) e injeta, acima de
   #noticias-portal, um bloco com <select> (turma) + <img>
   (imagem fatiada do PDF). A turma escolhida fica salva em
   localStorage (sigaa_utils_horario_turma) e é restaurada na
   próxima carga. Preciso do web_accessible_resources no
   manifest para as imagens e o índice.
   ========================================================= */
(() => {
  const ALVO = document.getElementById('noticias-portal');
  if (!ALVO || document.getElementById('horario-portal')) return;

  const CHAVE_TURMA = 'sigaa_utils_horario_turma';

  const div = document.createElement('div');
  div.id = 'horario-portal';
  const select = document.createElement('select');
  const img = document.createElement('img');
  img.alt = 'Horário das aulas';
  img.loading = 'lazy';

  const css = document.createElement('style');
  css.id = 'horario-css';
  css.textContent = `
    #horario-portal { background: #fff; border: 1px solid #c9c9c9; border-radius: 6px;
      padding: 10px; margin: 15px 0; }
    #horario-portal select { max-width: 100%; font-size: 13px; padding: 4px 6px; }
    #horario-portal img { display: block; max-width: 100%; height: auto; margin-top: 8px; }`;

  document.head.appendChild(css);
  ALVO.parentNode.insertBefore(div, ALVO);
  div.appendChild(select);
  div.appendChild(img);

  let turmas = [];
  fetch(chrome.runtime.getURL('horarios/index.json'))
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(lista => {
      turmas = lista;
      if (!turmas.length) throw new Error('índice vazio');
      const nenhum = document.createElement('option');
      nenhum.value = '';
      nenhum.textContent = '--- Nenhum ---';
      select.appendChild(nenhum);
      for (const t of turmas) {
        const op = document.createElement('option');
        op.value = t.turma;
        op.textContent = t.turma;
        select.appendChild(op);
      }
      const salva = localStorage.getItem(CHAVE_TURMA);
      // '' (Nenhum) é estado válido; turma inexistente (PDF trocado) -> 1ª do índice
      select.value = salva === ''
        ? ''
        : turmas.some(t => t.turma === salva) ? salva : turmas[0].turma;
      aplicar();
    })
    .catch(() => div.parentNode && div.remove()); // sem índice, sem bloco

  function aplicar() {
    if (select.value === '') {
      img.src = '';
      img.style.display = 'none';
    } else {
      const t = turmas.find(x => x.turma === select.value);
      if (!t) return;
      img.src = chrome.runtime.getURL('horarios/fotos/' + t.arquivo);
      img.style.display = 'block';
    }
    localStorage.setItem(CHAVE_TURMA, select.value);
  }

  select.addEventListener('change', aplicar);
})();