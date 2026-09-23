/* =========================================================
   Calendário de avaliações — transforma a lista do painel
   #avaliacao-portal em um calendário dos próximos 30 dias.
   Registrado no manifest.json; roda automaticamente em
   https://sig.ifc.edu.br/* (document_idle).
   ========================================================= */
(function () {
  'use strict';

  const JANELA_DIAS = 30;

  const PALETA = [
    ['#1d4ed8', '#e6edfd'], ['#b45309', '#fdf1de'], ['#0f766e', '#ddf4ef'],
    ['#be185d', '#fde8f1'], ['#6d28d9', '#ece6fd'], ['#b91c1c', '#fde6e3'],
    ['#15803d', '#e3f5e7'], ['#a16207', '#faf0cf'], ['#0369a1', '#e0f2fc'],
    ['#7c3aed', '#efe8fe']
  ];
  const MESES  = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const DIAS_C = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  function init() {
    const painel = document.getElementById('avaliacao-portal');
    if (!painel || painel.dataset.avCal) return;
    painel.dataset.avCal = '1';

    const tabela = painel.querySelector('table');
    if (!tabela) return;

    /* ---------- 1. Lê as avaliações da tabela existente ---------- */
    const avaliacoes = [];
    tabela.querySelectorAll('tbody tr').forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length < 3) return; // linha de ano / cabeçalho
      const m = tds[1].textContent.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return;
      const data  = new Date(+m[3], +m[2] - 1, +m[1]); // dd/mm/aaaa
      const texto = tds[2].textContent.replace(/\s+/g, ' ').trim();
      const [disc, aval] = texto.split(/Avaliação\s*:/i);
      avaliacoes.push({
        data,
        disciplina: (disc || 'Atividade').trim(),
        nome: (aval || 'Avaliação').trim()
      });
    });
    if (!avaliacoes.length) return;

    /* ---------- 2. Janela dos próximos 30 dias ---------- */
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let inicio = new Date(hoje);
    let fim = new Date(hoje); fim.setDate(fim.getDate() + JANELA_DIAS - 1);
    let aviso = '';

    const naJanela = avaliacoes.filter(a => a.data >= inicio && a.data <= fim);
    if (!naJanela.length) {
      // fallback: desloca o período até a 1ª avaliação, para o calendário não ficar vazio
      inicio = new Date(Math.min(...avaliacoes.map(a => +a.data)));
      fim = new Date(inicio); fim.setDate(fim.getDate() + JANELA_DIAS - 1);
      aviso = 'Nenhuma avaliação nos próximos 30 dias — o período foi deslocado para exibir as datas encontradas.';
    }

    const porDia = new Map();
    avaliacoes.forEach(a => {
      if (a.data < inicio || a.data > fim) return;
      const k = a.data.toDateString();
      if (!porDia.has(k)) porDia.set(k, []);
      porDia.get(k).push(a);
    });

    // contagem segura (sempre resulta em número)
    let total = 0;
    porDia.forEach(lista => { total += lista.length; });

    const disciplinas = [...new Set([...porDia.values()].flat().map(a => a.disciplina))];
    const corDe = {};
    disciplinas.forEach((d, i) => { corDe[d] = PALETA[i % PALETA.length]; });

    /* ---------- 3. CSS + fonte (injetados via JS) ---------- */
    if (!document.getElementById('av-cal-css')) {
      const css = document.createElement('style');
      css.id = 'av-cal-css';
      css.textContent = `
        #avaliacao-portal .av-cal{--ink:#182338;margin:10px 0 14px;font-family:'Archivo','Segoe UI',system-ui,sans-serif;color:var(--ink);cursor:default}
        .av-cal *{box-sizing:border-box}
        .av-cal .av-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:3px solid var(--ink);padding-bottom:10px;margin-bottom:12px}
        .av-cal .av-titulo{font-size:26px;font-weight:800;letter-spacing:-.5px;text-transform:capitalize;line-height:1}
        .av-cal .av-contagem{background:var(--ink);color:#fff;font-size:11px;font-weight:700;letter-spacing:.4px;padding:6px 12px;border-radius:999px}
        .av-cal .av-grade{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
        .av-cal .av-semana{font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#66738f;text-align:center;padding:4px 0 6px}
        .av-cal .av-vazio{min-height:96px}
        .av-cal .av-dia{position:relative;min-height:96px;background:#fff;border:1px solid #dbe2ef;border-radius:10px;padding:8px 6px 6px;display:flex;flex-direction:column;gap:4px;animation:avPop .5s cubic-bezier(.2,.7,.3,1) both;animation-delay:calc(var(--i)*16ms)}
        .av-cal .av-fds{background:repeating-linear-gradient(-45deg,#f3f6fc 0 7px,#edf2fb 7px 14px)}
        .av-cal .av-mes{position:absolute;top:7px;right:8px;font-size:9px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#93a0bd}
        .av-cal .av-num{font-size:16px;font-weight:800;line-height:1}
        .av-cal .av-hoje{background:#fff7da;border-color:#e6b80f;box-shadow:0 0 0 3px rgba(230,184,15,.22)}
        .av-cal .av-hoje .av-num::after{content:'hoje';margin-left:6px;font-size:8px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:#e6b80f;color:#fff;padding:2px 6px;border-radius:99px;vertical-align:2px}
        .av-cal .av-livre{margin-top:auto;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#b6c0d4}
        .av-cal .av-chip{border-left:3px solid var(--c);background:var(--ct);color:var(--c);border-radius:5px;padding:3px 5px;font-size:10px;line-height:1.3;width:100%;overflow-wrap:anywhere}
        .av-cal .av-chip b{display:block;font-size:10px;font-weight:800;letter-spacing:.3px}
        .av-cal .av-chip span{display:block;font-size:9px;opacity:.8;font-weight:600}
        .av-cal .av-legenda{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px}
        .av-cal .av-leg{display:inline-flex;align-items:center;gap:6px;border:1px solid #d3dbeb;background:#fff;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:700}
        .av-cal .av-leg span{color:#3a4864;font-weight:600}
        .av-cal .av-ponto{width:8px;height:8px;border-radius:50%;display:inline-block}
        .av-cal .av-aviso{margin:10px 0 0;font-size:11px;color:#7d6a14;background:#fdf6d8;border:1px dashed #dfc25c;border-radius:8px;padding:7px 10px}
        @keyframes avPop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
        @media (max-width:620px){
          .av-cal .av-dia,.av-cal .av-vazio{min-height:70px}
          .av-cal .av-dia{padding:6px 4px 4px}
          .av-cal .av-chip span,.av-cal .av-livre{display:none}
          .av-cal .av-titulo{font-size:20px}
        }
        @media (prefers-reduced-motion:reduce){.av-cal .av-dia{animation:none}}
      `;
      document.head.appendChild(css);
    }

    if (!document.getElementById('av-font')) {
      const link = document.createElement('link');
      link.id = 'av-font'; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&display=swap';
      document.head.appendChild(link);
    }

    /* ---------- 4. Monta o calendário ---------- */
    const cal = el('div', 'av-cal');

    // Cabeçalho: mês(es) do período + contagem
    const rotulo = inicio.getMonth() === fim.getMonth()
      ? `${MESES[inicio.getMonth()]} · ${inicio.getFullYear()}`
      : `${MESES[inicio.getMonth()].slice(0, 3)} – ${MESES[fim.getMonth()].slice(0, 3)} · ${fim.getFullYear()}`;
    const cab = el('header', 'av-cab');
    const tit = el('span', 'av-titulo'); tit.textContent = rotulo;
    const cont = el('span', 'av-contagem');
    cont.textContent = total === 1 ? '1 avaliação no período' : `${total} avaliações no período`;
    cab.append(tit, cont);
    cal.appendChild(cab);

    // Grade de dias
    const grade = el('div', 'av-grade');
    DIAS_C.forEach(d => { const c = el('div', 'av-semana'); c.textContent = d; grade.appendChild(c); });

    const cursor = new Date(inicio);
    for (let i = 0; i < cursor.getDay(); i++) grade.appendChild(el('div', 'av-vazio'));

    let idx = 0;
    while (cursor <= fim) {
      const cel = el('div', 'av-dia');
      cel.style.setProperty('--i', idx++);
      if (cursor.getDay() === 0 || cursor.getDay() === 6) cel.classList.add('av-fds');
      if (cursor.toDateString() === hoje.toDateString()) cel.classList.add('av-hoje');

      if (cursor.getDate() === 1 || cursor.toDateString() === inicio.toDateString()) {
        const mes = el('span', 'av-mes');
        mes.textContent = MESES[cursor.getMonth()];
        cel.appendChild(mes);
      }

      const num = el('span', 'av-num');
      num.textContent = cursor.getDate();
      cel.appendChild(num);

      const lista = porDia.get(cursor.toDateString());
      if (lista && lista.length) {
        lista.forEach(a => {
          const [ink, tint] = corDe[a.disciplina];
          const chip = el('div', 'av-chip');
          chip.style.setProperty('--c', ink);
          chip.style.setProperty('--ct', tint);
          const b = document.createElement('b'); b.textContent = a.disciplina;
          const s = document.createElement('span'); s.textContent = a.nome;
          chip.append(b, s);
          cel.appendChild(chip);
        });
      } else {
        const livre = el('span', 'av-livre');
        livre.textContent = 'livre';
        cel.appendChild(livre);
      }

      grade.appendChild(cel);
      cursor.setDate(cursor.getDate() + 1);
    }
    cal.appendChild(grade);

    // Legenda de disciplinas (somente informativo)
    const legenda = el('div', 'av-legenda');
    disciplinas.forEach(d => {
      const [ink] = corDe[d];
      let n = 0;
      avaliacoes.forEach(a => {
        if (a.disciplina === d && a.data >= inicio && a.data <= fim) n++;
      });
      const item = el('span', 'av-leg');
      const ponto = el('i', 'av-ponto'); ponto.style.background = ink;
      const rot = document.createElement('span'); rot.textContent = `${d} (${n})`;
      item.append(ponto, rot);
      legenda.appendChild(item);
    });
    cal.appendChild(legenda);

    if (aviso) {
      const av = el('p', 'av-aviso');
      av.textContent = aviso;
      cal.appendChild(av);
    }

    /* ---------- 5. Substitui a lista pelo calendário ---------- */
    tabela.style.display = 'none'; // mantém o DOM original (e o link .mais) intactos
    const h4 = painel.querySelector('h4');
    if (h4) h4.insertAdjacentElement('afterend', cal);
    else painel.prepend(cal);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();