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
        html > * {
            background: #111 !important;
            filter: invert(1) hue-rotate(180deg) !important;
        }

        img,
        video,
        picture,
        canvas,
        svg {
            filter: invert(1) hue-rotate(180deg) !important;
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
    const body = document.body;
    body.style.setProperty("background-image", `url("${limpa}")`, "important");
    body.style.setProperty("background-size", "cover", "important");
    body.style.setProperty("background-position", "center", "important");
    body.style.setProperty("background-repeat", "no-repeat", "important");
  }

  function removerPapelDeParede() {
    const props = [
      "background-image",
      "background-size",
      "background-position",
      "background-repeat",
    ];
    props.forEach((p) => document.body.style.removeProperty(p));
  }

  function urlValida(url) {
    return /^https?:\/\/.+/.test(url);
  }

  // ==================== Interface ============================
  function main() {
    // ---- Botão de engrenagem (estilo em style.css) ----
    const botao = document.createElement("button");
    botao.id = "button-mode";
    botao.textContent = "⚙";
    botao.title = "Configurações";
    document.body.appendChild(botao);

    // ---- Painel de configurações ----
    const painel = document.createElement("div");
    painel.id = "settings-panel";
    painel.style.display = "none";
    document.body.appendChild(painel);

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
        localStorage.setItem(LS_PAPEL_ENABLED, "true");
        check.checked = true;
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
  }

  // ============ Inicialização (DOM pronto) ===================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();