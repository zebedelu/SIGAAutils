/* =========================================================
   Aviso de atualização do SIGAA utils.
   Módulo independente (não usa SIGAAUtils). Busca um arquivo
   de versão no GitHub e mostra um toast fixo no canto
   superior direito ("Atualização disponível vX.X.X") quando a
   versão remota é mais nova que a instalada. O fetch é
   throttled (no máximo 1x por hora) por causa do limite de
   requisições do raw.githubusercontent; o toast reaparece a
   cada 10 minutos — fechar só agenda a próxima exibição,
   incentivando o usuário a atualizar. Toast é filho do
   document.documentElement (mesma regra do botão/painel: o
   filter do modo escuro no body quebraria o position: fixed).
   Registrado no manifest.json.
   ========================================================= */
(function () {
  'use strict';

  // >>> CONFIGURE AQUI: repositório onde o arquivo de versão vive. <<<
  // versao.txt contém só o número, ex: "1.2.0"
  const RAW_URL = 'https://raw.githubusercontent.com/zebedelu/SIGAAutils/refs/heads/master/versao.txt';
  const REPO_URL = 'https://github.com/zebedelu/SIGAAutils';
  const VERSAO_LOCAL_FALLBACK = '1.2.0'; // só se chrome.runtime estiver ausente

  const TOAST_ID = 'update-toast';
  const INTERVALO_EXIBICAO_MS = 10 * 60 * 1000; // 10 min entre exibições
  const TICK_MS = 60 * 1000; // checagem de tempo a cada 60s
  const FETCH_MAX_AGE_MS = 60 * 60 * 1000; // refaz o fetch no máx 1x por hora

  const LS_VERSAO = 'sigaa_utils_upd_versao'; // última versão remota conhecida
  const LS_PROXIMA = 'sigaa_utils_upd_proxima_exibicao'; // ms da próxima exibição
  const LS_FETCH_EM = 'sigaa_utils_upd_fetch_em'; // ms do último fetch

  // Versão instalada vem do manifest (evita duplicar constante).
  function getVersaoLocal() {
    try {
      return chrome.runtime.getManifest().version;
    } catch (e) {
      return VERSAO_LOCAL_FALLBACK;
    }
  }

  // "1.0.0" / "v1.0" -> [1,0,0]; inválido -> null
  function parseVersao(v) {
    const s = String(v || '').trim().replace(/^v/i, '');
    if (!/^\d+(\.\d+)*$/.test(s)) return null;
    return s.split('.').map((p) => parseInt(p, 10) || 0);
  }

  function ehMaisNova(remota, local) {
    const a = parseVersao(remota);
    const b = parseVersao(local);
    if (!a || !b) return false;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x !== y) return x > y;
    }
    return false; // iguais
  }

  function getVersaoRemota() {
    return localStorage.getItem(LS_VERSAO) || null;
  }

  // Busca a versão remota (throttled). Em qualquer falha a página fica intacta.
  function agendarFetch() {
    if (Date.now() - (Number(localStorage.getItem(LS_FETCH_EM)) || 0) < FETCH_MAX_AGE_MS) return;
    fetch(RAW_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('HTTP ' + res.status))))
      .then((txt) => {
        const versao = txt.trim();
        if (!parseVersao(versao)) return; // arquivo vazio/inválido: ignora
        localStorage.setItem(LS_VERSAO, versao);
        localStorage.setItem(LS_FETCH_EM, String(Date.now()));
        checarExibicao();
      })
      .catch(() => {});
  }

  function checarExibicao() {
    if (document.getElementById(TOAST_ID)) return; // já visível
    if (Date.now() < (Number(localStorage.getItem(LS_PROXIMA)) || 0)) return; // horário bloqueado
    const remota = getVersaoRemota();
    if (!remota || !ehMaisNova(remota, getVersaoLocal())) return;
    mostrarToast(remota);
  }

  function mostrarToast(versao) {
    const toast = document.createElement('div');
    toast.id = TOAST_ID;

    const dot = document.createElement('span');
    dot.className = 'update-toast-dot';

    const texto = document.createElement('span');
    texto.className = 'update-toast-text';
    texto.textContent = 'Atualização disponível v' + versao;

    const link = document.createElement('a');
    link.className = 'update-toast-link';
    link.href = REPO_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Ver no GitHub';

    const fechar = document.createElement('span');
    fechar.className = 'update-toast-fechar';
    fechar.textContent = '\u00D7';
    fechar.title = 'Fechar (volta em 10 min)';
    fechar.onclick = () => {
      localStorage.setItem(LS_PROXIMA, String(Date.now() + INTERVALO_EXIBICAO_MS));
      toast.remove(); // o tick de 60s reapresenta quando o tempo passar
    };

    toast.appendChild(dot);
    toast.appendChild(texto);
    toast.appendChild(link);
    toast.appendChild(fechar);
    document.documentElement.appendChild(toast);
  }

  // Tick de 60s encadeado (setTimeout novo a cada volta, sem sobreposição).
  function agendarTick() {
    setTimeout(() => {
      checarExibicao();
      agendarTick();
    }, TICK_MS);
  }

  function main() {
    checarExibicao(); // se já é devido com versão conhecida, mostra na hora
    agendarFetch();
    agendarTick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();