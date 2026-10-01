/* =========================================================
   Progresso do ano letivo — dentro do #perfil-docente mostra
   o período letivo (datas lidas de #turmas-portal) e uma
   barra verde com o percentual de tempo decorrido (branco,
   dentro da barra). O <h4> recebe o mesmo CSS do
   #agenda-docente h4 (confirmado com o usuário: é o padrão
   visual que ele quer).
   Independente (não usa SIGAAUtils). Só age se existirem
   #turmas-portal (com <center> contendo intervalos
   "xx/xx/xxxx - xx/xx/xxxx") e #perfil-docente.
   ========================================================= */
(() => {
  'use strict';

  const portal = document.getElementById('turmas-portal');
  const alvo = document.getElementById('perfil-docente');
  if (!portal || !alvo || alvo.querySelector('#progresso-ano-letivo')) return;

  // ponytail: varre todos os <center> de #turmas-portal e coleta TODOS os
  // intervalos "dd/mm/aaaa - dd/mm/aaaa" (1 linha por turma, vários períodos
  // na mesma célula); o ano letivo = menor início e maior fim do conjunto.
  const re = /(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/g;
  let inicio = null, fim = null;
  for (const center of portal.querySelectorAll('center')) {
    const texto = center.textContent.replace(/\s+/g, ' ');
    for (const m of texto.matchAll(re)) {
      const i = new Date(+m[3], +m[2] - 1, +m[1]); // dd/mm/aaaa
      const f = new Date(+m[6], +m[5] - 1, +m[4]);
      if (f <= i) continue;
      if (!inicio || i < inicio) inicio = i;
      if (!fim || f > fim) fim = f;
    }
  }
  if (!inicio || !fim) return;

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let pct = Math.round(((hoje - inicio) / (fim - inicio)) * 100);
  pct = Math.min(100, Math.max(0, pct));

  const fmt = d =>
    String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

  if (!document.getElementById('progresso-ano-letivo-css')) {
    const css = document.createElement('style');
    css.id = 'progresso-ano-letivo-css';
    css.textContent = `
      #progresso-ano-letivo { margin: 4px 0 18px; text-align: center; }
      #progresso-ano-letivo .pal-titulo { margin: 0; font-size: 12px;
        font-weight: 600; color: #4b5563; }
      #progresso-ano-letivo h4 { margin: 0 0 16px; padding-bottom: 12px;
        font-size: 14px; font-weight: 600; color: #111827;
        border-bottom: 1px solid #e5e7eb; }
      #progresso-ano-letivo .pal-track { position: relative; height: 20px;
        margin: 0 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
      #progresso-ano-letivo .pal-fill { height: 100%; width: 0;
        background: #22c55e; border-radius: 999px; }
      #progresso-ano-letivo .pal-pct { position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 12px; font-weight: 700;
        text-shadow: 0 1px 2px rgba(0,0,0,.25); }`;
    document.head.appendChild(css);
  }

  const div = document.createElement('div');
  div.id = 'progresso-ano-letivo';

  const titulo = document.createElement('p');
  titulo.className = 'pal-titulo';
  titulo.textContent = 'Datas do início e fim do ano letivo';

  const h4 = document.createElement('h4'); // mesmo CSS do #agenda-docente h4
  h4.textContent = fmt(inicio) + ' <-> ' + fmt(fim);

  const track = document.createElement('div');
  track.className = 'pal-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(pct));
  const fill = document.createElement('div');
  fill.className = 'pal-fill';
  fill.style.width = pct + '%';
  const pctEl = document.createElement('span'); // % branca, dentro da barra
  pctEl.className = 'pal-pct';
  pctEl.textContent = pct + '%';
  track.append(fill, pctEl);

  div.append(titulo, h4, track);
  alvo.prepend(div);
})();