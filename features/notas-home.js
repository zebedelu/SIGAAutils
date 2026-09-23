/* =========================================================
   Notas na home do discente: botão "Ver notas" por matéria.
   Reescreve a navegação JSF da home em 2 POSTs (fetch
   same-origin): abrir Turma Virtual -> Ver Notas, e injeta
   a tabela de notas abaixo da linha da matéria.
   Módulo independente: não usa SIGAAUtils, roda sozinho.
   Registrado no manifest.json (document_idle).
   ========================================================= */
(function () {
  'use strict';

  // Um POST por vez: o POST1 muda a "turma selecionada" da sessão
  // no servidor; flows paralelos misturariam as respostas.
  // ponytail: fila global simples; se um flow travar, o próximo
  // espera — aceitável, são 16 matérias no máximo.
  let fila = Promise.resolve();
  const cache = new Map(); // frontEndIdTurma -> resultado (2º clique não refaz os POSTs)

  function extrairMapaOnclick(form) {
    const a = form.querySelector('a');
    const onclick = a && a.getAttribute('onclick');
    if (!onclick) return null;
    const mapa = {};
    const re = /'([^']+)':'([^']+)'/g;
    let m;
    while ((m = re.exec(onclick)) !== null) mapa[m[1]] = m[2];
    return Object.keys(mapa).length ? mapa : null;
  }

  function postForm(url, params) {
    const body = new URLSearchParams();
    Object.keys(params).forEach((k) => body.append(k, params[k]));
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function buscarNotas(form) {
    const mapa = extrairMapaOnclick(form);
    if (!mapa) return Promise.resolve({ ok: false, motivo: 'link_turma_nao_encontrado' });
    const action = form.getAttribute('action') || '';
    // O jsfcljs real submete o form inteiro + os params do onclick.
    // Sem o javax.faces.ViewState o JSF não processa o comando e só
    // re-renderiza a home — por isso os hidden inputs vão junto.
    const params = Object.assign({}, mapa);
    form.querySelectorAll('input[type="hidden"]').forEach((inp) => {
      const nome = inp.getAttribute('name');
      if (nome) params[nome] = inp.getAttribute('value') || '';
    });
    return postForm(action, params)
      .then((html1) => {
        const doc1 = new DOMParser().parseFromString(html1, 'text/html');
        const vs1 = doc1.querySelector('input[name="javax.faces.ViewState"]');
        if (!vs1) throw { motivo: 'viewstate_nao_encontrado' };
        const links = Array.from(doc1.querySelectorAll('a'));
        const verNotas = links.find((l) => /Ver\s+Notas/i.test(l.textContent || ''));
        if (!verNotas) throw { motivo: 'ver_notas_nao_encontrado' };
        // O link "Ver Notas" carrega jsfcljs com o formMenu: extrai
        // os params do onclick (ex.: formMenu:j_id_...=formMenu:j_id_...)
        const onclick2 = verNotas.getAttribute('onclick') || '';
        const params2 = {};
        const re2 = /'([^']+)':'([^']+)'/g;
        let m2;
        while ((m2 = re2.exec(onclick2)) !== null) params2[m2[1]] = m2[2];
        if (!params2['formMenu']) params2['formMenu'] = 'formMenu';
        params2['javax.faces.ViewState'] = vs1.getAttribute('value');
        return postForm('/sigaa/ava/index.jsf', params2);
      })
      .then((html2) => ({ ok: true, html: html2 }))
      .catch((e) => ({ ok: false, motivo: (e && e.motivo) || 'fetch_erro' }));
  }

  function parsearTabelaNotas(doc) {
    const tabela = doc.querySelector('div.notas > table.tabelaRelatorio');
    if (!tabela) return null;
    const trs = tabela.querySelectorAll('tr');
    if (!trs.length) return null;

    const ths = trs[0].querySelectorAll('th');
    const cabecalhos = Array.from(ths).map((th) => (th.textContent || '').trim());

    // 2ª tr: sub-cabeçalhos com hidden inputs abrevAval_<id>/denAval_<id>/pesoAval_<id>
    const avaliacoes = [];
    if (trs.length > 1) {
      const inputs = trs[1].querySelectorAll('input[type="hidden"]');
      const porId = {};
      Array.from(inputs).forEach((inp) => {
        const m = /^(abrevAval|denAval|pesoAval)_(.+)$/.exec(inp.getAttribute('id') || '');
        if (m) {
          porId[m[2]] = porId[m[2]] || {};
          porId[m[2]][m[1] === 'abrevAval' ? 'abrev' : m[1] === 'denAval' ? 'den' : 'peso'] =
            inp.getAttribute('value') || '';
        }
      });
      Object.keys(porId).forEach((id) => avaliacoes.push(porId[id]));
    }

    // 1ª tr do tbody: célula 0 = matrícula, 1 = nome, restante = notas etc.
    const tds = tabela.querySelectorAll('tbody tr td');
    const celulas = Array.from(tds).map((td) => (td.textContent || '').trim());
    const linha = celulas.length
      ? { matricula: celulas[0], nome: celulas[1] || '', celulas }
      : null;

    return { cabecalhos, avaliacoes, linha };
  }

  // --- UI ---

  function classificarNota(texto) {
    const t = (texto || '').trim();
    if (!t || t === '--' || t === '-') return '';
    const n = Number(t.replace(',', '.'));
    if (Number.isNaN(n)) return '';
    if (n === 10) return 'nh-n10';
    if (n < 6) return 'nh-n6';
    if (n < 8) return 'nh-n8';
    return 'nh-nok';
  }

  function montarTabela(parsed) {
    const wrap = document.createElement('div');
    wrap.className = 'notas-home-tabela';
    const table = document.createElement('table');
    table.className = 'nh-table';

    // Notas exibidas: descarta média/faltas/situação (3 últimas células).
    const todas = parsed.linha.celulas.slice(2);
    const notas = todas.length > 3 ? todas.slice(0, -3) : todas;

    // Cabeçalho: só as abreviações das avaliações (Matrícula/Nome ficam de fora)
    const trh = document.createElement('tr');
    notas.forEach((_, i) => {
      const th = document.createElement('th');
      th.textContent = (parsed.avaliacoes[i] && parsed.avaliacoes[i].abrev) || '—';
      trh.appendChild(th);
    });
    table.appendChild(trh);

    // Linha de notas do discente (sem Matrícula/Nome). As notas do
    // fechamento do trimestre são as 3 últimas exibidas — só elas recebem cor.
    const trd = document.createElement('tr');
    notas.forEach((txt, i) => {
      const td = document.createElement('td');
      td.textContent = txt;
      // 6ª-última contando as ocultas (média/faltas/situação) = 1ª do fechamento
      if (i === notas.length - 3) td.style.paddingLeft = '20px';
      if (i >= notas.length - 3) {
        const cls = classificarNota(txt);
        if (cls) td.className = cls;
      }
      trd.appendChild(td);
    });
    table.appendChild(trd);
    wrap.appendChild(table);
    return wrap;
  }

  function setStatus(tdPainel, texto) {
    tdPainel.textContent = '';
    const span = document.createElement('span');
    span.className = 'nh-status';
    span.textContent = texto;
    tdPainel.appendChild(span);
  }

  function addBotaoOcultar(tdPainel, btnVer) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nh-btn nh-ocultar';
    btn.textContent = 'Ocultar';
    btn.addEventListener('click', () => {
      if (btnVer) btnVer.style.display = ''; // "Ver notas" volta
      const tr = tdPainel.closest('tr');
      if (tr) tr.remove();
    });
    tdPainel.appendChild(btn);
  }

  function mostrarResultado(tdPainel, res, btnVer) {
    if (!res.ok) {
      setStatus(tdPainel, res.motivo === 'ver_notas_nao_encontrado'
        ? 'Notas indisponíveis para esta matéria.' : 'Não foi possível carregar as notas.');
      addBotaoOcultar(tdPainel, btnVer);
      return;
    }
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    const parsed = parsearTabelaNotas(doc);
    if (!parsed || !parsed.linha) {
      setStatus(tdPainel, 'Nenhuma nota publicada.');
      addBotaoOcultar(tdPainel, btnVer);
      return;
    }
    tdPainel.textContent = '';
    addBotaoOcultar(tdPainel, btnVer); // Ocultar em cima das notas
    tdPainel.appendChild(montarTabela(parsed));
  }

  function criarBotao(form) {
    const mapa = extrairMapaOnclick(form);
    if (!mapa || !mapa.frontEndIdTurma) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nh-btn';
    btn.textContent = 'Ver notas';

    btn.addEventListener('click', () => {
      btn.style.display = 'none'; // some até o usuário clicar em Ocultar
      // painel já existe (2º clique): reusa
      let trPainel = form.closest('tr').nextElementSibling;
      const jaTem = trPainel && trPainel.classList.contains('nh-painel');
      if (!jaTem) {
        trPainel = document.createElement('tr');
        trPainel.className = 'nh-painel';
        const td = document.createElement('td');
        td.colSpan = 4;
        trPainel.appendChild(td);
        form.closest('tr').insertAdjacentElement('afterend', trPainel);
      }
      const tdPainel = trPainel.querySelector('td');

      const chave = mapa.frontEndIdTurma;
      if (cache.has(chave)) {
        mostrarResultado(tdPainel, cache.get(chave), btn);
        return;
      }
      setStatus(tdPainel, 'Carregando notas...');
      fila = fila.then(() =>
        buscarNotas(form).then((res) => {
          cache.set(chave, res);
          mostrarResultado(tdPainel, res, btn);
        })
      );
    });
    return btn;
  }

  function init() {
    if (document.body.dataset.nhInit) return;
    document.body.dataset.nhInit = '1';

    const style = document.createElement('style');
    style.id = 'notas-home-css';
    style.textContent = [
      '.nh-btn { margin-top: 4px; font-size: 12px; padding: 2px 10px; cursor: pointer; }',
      '.nh-painel > td { background: #f7f7f7; padding: 8px 12px; }',
      '.nh-status { color: #666; font-size: 13px; }',
      '.nh-table { border-collapse: collapse; margin: 4px 0; }',
      '.nh-table th, .nh-table td { border: 1px solid #ccc; padding: 3px 8px; font-size: 13px; text-align: right; }',
      '.nh-table th { background: #eef; }',
      '.nh-table td:nth-child(2) { text-align: left; }',
      '.nh-n6 { color: tomato; } .nh-n8 { color: orange; } .nh-nok { color: lime; } .nh-n10 { color: plum; }',
      '.nh-ocultar { margin-bottom: 4px; }',
    ].join(' ');
    document.head.appendChild(style);

    const forms = document.querySelectorAll('form[id^="form_acessarTurmaVirtual"]');
    Array.from(forms).forEach((form) => {
      const btn = criarBotao(form);
      if (btn) form.insertAdjacentElement('afterend', btn);
    });
  }

  // ponytail: export só para o check Node (notas-home-check.js); browser ignora
  if (typeof process === 'undefined') {
    // no browser não expõe nada
  } else {
    window.SIGAAUtilsNotasHome = {
      extrairMapaOnclick, postForm, buscarNotas, parsearTabelaNotas, classificarNota,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
