# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Extensão de navegador (Chrome/Edge, Manifest V3) que adiciona utilitários ao SIGAA do IFC (`sig.ifc.edu.br`). É um projeto de 3 arquivos, sem dependências, build ou testes.

## Estrutura

- `manifest.json` — declara a extensão. Injeta `style.css` e `content.js` via `content_scripts` em todas as páginas `https://sig.ifc.edu.br/*`, com `run_at: document_idle`.
- `content.js` — toda a lógica (IIFE que roda no DOM da página). Cria um botão ⚙ fixo, um painel de configurações, e implementa dois utilitários.
- `style.css` — estilos do botão e painel (`#button-mode`, `#settings-panel`, `.settings-item`, `.url-input`).

Não há loading de extensão além de carregar a `unpacked` pelo `chrome://extensions`.

## Funcionalidades (content.js)

Regidas por `localStorage` (chaves com prefixo `sigaa_utils_`):

1. **Modo Escuro/Claro** — injeta um `<style id="my-dark-mode">` que usa `filter: invert(1) hue-rotate(180deg)` no documento (e reinverte em mídias). Estado salvo em `sigaa_utils_modo_escuro`.
2. **Papel de Parede** — define `background-image` no `body` a partir de uma URL validada por `urlValida()` (regex `^https?://`). A URL é escapada para aspas/backslashes antes de ir pro CSS. Estado em `sigaa_utils_papel_enabled` / `sigaa_utils_papel_url`.

## Pontos de atenção

- **Modo escuro guarda o estado inconsistente**: `setModoEscuro(false)` grava `sigaa_utils_modo_escuro` mas o caminho de ativação usa só a presença do `<style>` como fonte de verdade (`modoEscuroAtivo()`). A variável `/content.js:50` é o check de estado, o `localStorage` é só persistência.
- O `filter: invert` do modo escuro afeta TODAS as mídias (img, video, canvas, svg, picture) via regra dedicada para evitar inversão dupla.
- O efeito de brilho que segue o mouse (variáveis `--mouse-x/--mouse-y` no `document.body`) é setado a cada `mousemove` em `/content.js:172` — consumido pelo CSS.

## Como testar

Não há teste automatizado. Carregue como extensão descompactada no `chrome://extensions` (modo desenvolvedor), abra uma página em `sig.ifc.edu.br` e verifique o botão ⚙.

Charada comum: se mexer em lógica nova, respeite o padrão "presença do `<style>` no DOM = estado atual, `localStorage` = persistência".