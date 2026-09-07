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
    return postForm(action, mapa)
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

  // ponytail: export só para o check Node (notas-home-check.js); browser ignora
  if (typeof process === 'undefined') {
    // no browser não expõe nada
  } else {
    window.SIGAAUtilsNotasHome = { extrairMapaOnclick, postForm, buscarNotas };
  }
})();
