// ============================================================
//  SIGAA utils — content script (sig.ifc.edu.br)
//
//  Botão de engrenagem que abre um menu com as opções:
//   - Alterar Modo Escuro/Claro
//   - Papel de Parede personalizado (URL salva no localStorage)
// ============================================================

(function () {
  "use strict";

  // ===================== Constantes ==========================
  const STYLE_ID = "my-dark-mode";
  const LAYER_ID = "wallpaper-layer";
  const LS_DARK = "sigaa_utils_modo_escuro";
  const LS_PAPEL_ENABLED = "sigaa_utils_papel_enabled";
  const LS_PAPEL_URL = "sigaa_utils_papel_url";

  // ===================== Modo Escuro =========================
  function setModoEscuro(ativo) {
    const styleAtual = document.getElementById(STYLE_ID);

    // Já está no estado desejado
    if (ativo === modoEscuroAtivo()) return;

    if (!ativo) {
      styleAtual.remove();
    } else {
      const style = document.createElement("style");
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
      `;
      document.documentElement.appendChild(style);
    }

    localStorage.setItem(LS_DARK, ativo ? "true" : "false");
  }

  function modoEscuroAtivo() {
    return !!document.getElementById(STYLE_ID);
  }

  // =================== Papel de Parede =======================
  function aplicarPapelDeParede(url) {
    // Escapa aspas e barras invertidas para não quebrar o CSS
    const limpa = url.replace(/["\\]/g, "\\$&");
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = LAYER_ID;
      Object.assign(layer.style, {
        position: "fixed",
        inset: "0",
        zIndex: "-1",
        pointerEvents: "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      });
      // ponytail: fora do body filtrado p/ manter viewport-fixed e cores naturais
      document.documentElement.appendChild(layer);
    }
    layer.style.backgroundImage = `url("${limpa}")`;
    // camada pinta atrás do body — deixa o fundo do body transparente p/ ela aparecer
    document.body.classList.add("wallpaper-active");
  }

  function removerPapelDeParede() {
    const layer = document.getElementById(LAYER_ID);
    if (layer) layer.remove();
    document.body.classList.remove("wallpaper-active");
  }

  function urlValida(url) {
    return /^https?:\/\/.+/.test(url);
  }

  // ==================== Interface ============================
  function anexarNoRoot(el) {
    // ponytail: botão/painel/camada fora do body — o filter do modo escuro
    // quebraria o position: fixed deles (containing block = body)
    document.documentElement.appendChild(el);
  }

  function main() {
    // ---- Botão de engrenagem (estilo em style.css) ----
    const botao = document.createElement("button");
    botao.id = "button-mode";
    botao.textContent = "⚙";
    botao.title = "Configurações";
    anexarNoRoot(botao);

    // ---- Painel de configurações ----
    const painel = document.createElement("div");
    painel.id = "settings-panel";
    painel.style.display = "none";
    anexarNoRoot(painel);

    // Opção: Alterar Modo Escuro/Claro
    const itemModo = document.createElement("div");
    itemModo.className = "settings-item";
    itemModo.textContent = "Alterar Modo Escuro/Claro";
    itemModo.onclick = () => setModoEscuro(!modoEscuroAtivo());
    painel.appendChild(itemModo);

    // Opção: Papel de Parede personalizado
    const labelPapel = document.createElement("label");
    labelPapel.className = "settings-item";

    const check = document.createElement("input");
    check.type = "checkbox";

    const spanPapel = document.createElement("span");
    spanPapel.textContent = "Papel de Parede personalizado";

    labelPapel.appendChild(check);
    labelPapel.appendChild(spanPapel);
    painel.appendChild(labelPapel);

    // Campo para digitar a URL do papel de parede
    const inputUrl = document.createElement("input");
    inputUrl.type = "text";
    inputUrl.placeholder = "Digite a URL do seu papel de parede";
    inputUrl.className = "url-input";
    painel.appendChild(inputUrl);

    // ---- Comportamento do papel de parede ----
    function mostrarInput(visible) {
      inputUrl.style.display = visible ? "" : "none";
    }

    check.onchange = () => {
      if (check.checked) {
        localStorage.setItem(LS_PAPEL_ENABLED, "true");
        mostrarInput(true);
        const salvo = localStorage.getItem(LS_PAPEL_URL) || "";
        inputUrl.value = salvo;
        if (urlValida(salvo)) aplicarPapelDeParede(salvo);
      } else {
        mostrarInput(false);
        removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_ENABLED, "false");
      }
    };

    function tratarUrl() {
      const url = inputUrl.value.trim();
      if (urlValida(url)) {
        aplicarPapelDeParede(url);
        localStorage.setItem(LS_PAPEL_URL, url);
      } else {
        // URL inválida ou vazia: remove o papel de parede
        removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_URL, "");
      }
    }

    inputUrl.addEventListener("change", tratarUrl);
    inputUrl.addEventListener("blur", tratarUrl); // salva mesmo sem Enter
    inputUrl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tratarUrl();
    });

    // ---- Abrir/fechar o painel ----
    botao.onclick = () => {
      painel.style.display = painel.style.display === "none" ? "" : "none";
    };

    document.addEventListener("click", (e) => {
      if (!painel.contains(e.target) && e.target !== botao) {
        painel.style.display = "none";
      }
    });

    // ---- Brilho que segue o mouse (efeito do style.css) ----
    document.addEventListener("mousemove", (e) => {
      document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
    });

    // ---- Restaura as configurações salvas ----
    if (localStorage.getItem(LS_DARK) === "true") setModoEscuro(true);

    check.checked = localStorage.getItem(LS_PAPEL_ENABLED) === "true";
    const papelSalvo = localStorage.getItem(LS_PAPEL_URL) || "";
    inputUrl.value = papelSalvo;
    if (check.checked) {
      mostrarInput(true);
      if (urlValida(papelSalvo)) aplicarPapelDeParede(papelSalvo);
    }

    let AllNotas = document.querySelectorAll(".nota");
    AllNotas.forEach(element => {
      let cor = "lime";
      let nota = Number(element.textContent);
      
      if (nota < 6) {
        cor = "tomato";
      } else if (nota < 8) {
        cor = "orange";
      } else if (nota == 10) {
        cor = "plum";
      }

      element.style.color = cor;
    });

    // Faltas: penúltima nota de cada linha (classe .nota por engano do SIGAA).
    // Gradiente RGB verde (0 faltas) → vermelho (FALTAS_MAX faltas).
    const FALTAS_MAX = 25; // ponytail: ~25% de faltas numa disciplina de 80 aulas; ajuste se precisar
    document.querySelectorAll("tr").forEach(tr => {
      const notas = tr.querySelectorAll(".nota");
      if (notas.length < 2) return;
      const faltas = Number(notas[notas.length - 2].textContent);
      if (Number.isNaN(faltas)) return;
      const t = Math.min(faltas / FALTAS_MAX, 1);
      notas[notas.length - 2].style.color =
        `rgb(${Math.round(255 * t)}, ${Math.round(255 * (1 - t))}, 0)`;
    });

    // Situação (última nota da linha): primeiro caractere "R" (REP/REC/REPF...)
    // → vermelho; qualquer outra (APR, APRN, APC...) → verde.
    document.querySelectorAll("tr").forEach(tr => {
      const notas = tr.querySelectorAll(".nota");
      if (notas.length < 1) return;
      const situacao = notas[notas.length - 1];
      const s = situacao.textContent.trim();
      situacao.style.color = s.charAt(0) === "R" ? "tomato" : "lime";
    });
  }

  // ============ Inicialização (DOM pronto) ===================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();