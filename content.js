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
  const FIRE_LAYER_ID = "fire-layer";
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

        /* Fogo roxo (vive fora do body) — sem re-inversão */
        #fire-layer,
        #fire-layer canvas {
            filter: none !important;
        }
      `;
      document.documentElement.appendChild(style);
    }

    localStorage.setItem(LS_DARK, ativo ? "true" : "false");
    atualizarFogo();
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

  // ============== Fogo roxo (fallback do modo escuro) ==============
  // Ativo quando o modo escuro está ligado e não há papel de parede do
  // usuário. Vive fora do body (mesma razão da camada do papel de parede:
  // o filter do modo escuro viraria containing block / inverteria as cores).
  let fogo = null; // { cancela() }

  function fogoDeveEstarAtivo() {
    return modoEscuroAtivo() && !document.getElementById(LAYER_ID);
  }

  function atualizarFogo() {
    const temLayer = !!document.getElementById(LAYER_ID);
    const ativo = modoEscuroAtivo() && !temLayer;
    if (ativo && !fogo) {
      iniciarFogo();
    } else if (!ativo && fogo) {
      fogo.cancela();
      fogo = null;
    }
    document.body.classList.toggle(
      "wallpaper-active",
      temLayer || !!fogo
    );
  }

  function iniciarFogo() {
    const layer = document.createElement("div");
    layer.id = FIRE_LAYER_ID;
    Object.assign(layer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "-1",
      overflow: "hidden",
      pointerEvents: "none",
      // ponytail: a página não pinta nada atrás do body — fundo escuro p/ o fogo
      background: "#0a0114",
    });
    const canvasFogo = document.createElement("canvas");
    const canvasFagulhas = document.createElement("canvas");
    for (const c of [canvasFogo, canvasFagulhas]) {
      Object.assign(c.style, { width: "100%", height: "100%", display: "block" });
    }
    Object.assign(canvasFagulhas.style, { position: "absolute", inset: "0" });
    layer.append(canvasFogo, canvasFagulhas);
    document.documentElement.appendChild(layer);

    const CONFIG = { speed: 0.55, intensity: 0.5, scale: 3.0, sparks: 50 };

    const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

    const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_scale;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                  hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.0 + vec2(3.7, 7.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time;

  // coordenada rolando p/ cima => chamas sobem
  vec2 fp = vec2(p.x * u_scale, p.y * u_scale - t * 1.6);

  // domain warp => visual de plasma/fumaça
  vec2 q = vec2(fbm(fp), fbm(fp + vec2(5.2, 1.3)));
  float f = fbm(fp + q * 2.2);

  // filamentos finos (ridge noise) => a "teia" da referência
  float ridge = 1.0 - abs(2.0 * fbm(fp * 1.4 + q * 2.0) - 1.0);
  ridge = pow(ridge, 3.5);

  // máscara vertical com borda ruidosa
  float mask = 1.0 - smoothstep(0.05, 1.60, uv.y + (f - 0.5) * 0.90);

  // base mais intensa, como na imagem
  float base = 1.0 - smoothstep(0.0, 0.35, uv.y);

  float fire = (f * 0.75 + ridge * 0.85) * mask + base * (0.35 + 0.65 * ridge);
  fire *= u_intensity;

  // paleta 100% roxa — o núcleo quente agora é violeta, não branco
  vec3 col = vec3(0.0);
  col += vec3(0.08, 0.01, 0.18) * smoothstep(0.03, 0.45, fire);
  col += vec3(0.25, 0.05, 0.55) * smoothstep(0.30, 0.70, fire);
  col += vec3(0.55, 0.18, 0.95) * smoothstep(0.55, 0.90, fire);
  col += vec3(0.80, 0.35, 1.00) * smoothstep(0.85, 1.15, fire);

  // alpha: onde não há fogo, é 100% transparente
  float alpha = clamp(fire, 0.0, 1.0);
  alpha = alpha * alpha * (3.0 - 2.3 * alpha); // bordas suaves

  gl_FragColor = vec4(col * alpha, alpha); // premultiplied alpha
}
`;

    const gl = canvasFogo.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });

    if (!gl) {
      // ponytail: sem WebGL não há fogo — só remove a camada, página intacta
      layer.remove();
      return;
    }

    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("SIGAA utils — shader:", gl.getShaderInfoLog(s));
      }
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uInt = gl.getUniformLocation(prog, "u_intensity");
    const uScl = gl.getUniformLocation(prog, "u_scale");
    gl.uniform1f(uInt, CONFIG.intensity);
    gl.uniform1f(uScl, CONFIG.scale);

    const ctx = canvasFagulhas.getContext("2d");
    let W, H, DPR;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvasFogo.width = canvasFagulhas.width = Math.floor(window.innerWidth * DPR);
      H = canvasFogo.height = canvasFagulhas.height = Math.floor(window.innerHeight * DPR);
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uRes, W, H);
    }
    addEventListener("resize", resize);
    resize();

    function makeSpark(init) {
      const star = Math.random() < 0.5;
      const max = star ? 600 + Math.random() * 600 : 200 + Math.random() * 250;
      return {
        star,
        x: Math.random() * W,
        y: star ? Math.random() * H * 0.85 : H * (0.5 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.15 * DPR,
        vy: -(0.15 + Math.random() * 0.5) * DPR,
        size: (star ? 0.5 + Math.random() : 0.6 + Math.random() * 1.6) * DPR,
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.5 + Math.random() * 2,
        life: init ? Math.random() * max : 0,
        max,
        bright: Math.random() < 0.6,
      };
    }
    const fagulhas = Array.from({ length: CONFIG.sparks }, () => makeSpark(true));

    let last = performance.now();
    function drawSparks(now) {
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < fagulhas.length; i++) {
        const s = fagulhas[i];
        s.life += dt;
        if (!s.star) {
          s.x += (s.vx + Math.sin((s.life + s.tw) * 0.05) * 0.1 * DPR) * dt;
          s.y += s.vy * dt;
        }
        if (s.life > s.max || s.y < -10) { fagulhas[i] = makeSpark(false); continue; }
        const flicker = 0.5 + 0.5 * Math.sin(s.life * 0.1 * s.twSpeed + s.tw);
        const fade = 1 - s.life / s.max;
        ctx.globalAlpha = (s.star ? 0.35 : 0.5) * flicker * fade;
        ctx.fillStyle = s.bright ? "#d2a8ff" : "#9a4dff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const start = performance.now();
    let raf;
    function frame(now) {
      gl.uniform1f(uTime, ((now - start) / 1000) * CONFIG.speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawSparks(now);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    fogo = {
      cancela() {
        cancelAnimationFrame(raf);
        removeEventListener("resize", resize);
        layer.remove();
      },
    };
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
        atualizarFogo();
      } else {
        mostrarInput(false);
        removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_ENABLED, "false");
        atualizarFogo();
      }
    };

    function tratarUrl() {
      const url = inputUrl.value.trim();
      if (urlValida(url)) {
        aplicarPapelDeParede(url);
        localStorage.setItem(LS_PAPEL_URL, url);
        atualizarFogo();
      } else {
        // URL inválida ou vazia: remove o papel de parede
        removerPapelDeParede();
        localStorage.setItem(LS_PAPEL_URL, "");
        atualizarFogo();
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

    // Reconcilia o fogo (escuro + sem papel de parede) com o estado restaurado
    atualizarFogo();

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