#!/usr/bin/env python3
"""Fatia um PDF de horários acadêmicos do IFC em imagens webp por turma.

Padrão do documento (todas as páginas):
    linha 1: "HORÁRIO DAS AULAS <semestre>"   (ex: HORÁRIO DAS AULAS 2026-1)
    linha 2: nome da turma                    (ex: 1A AGROPECUÁRIA)

Cada página vira horarios/fotos/<turma-sanitizada>.webp e um índice
horarios/index.json (turma -> arquivo) é regravado. A extensão lê esse
índice para montar o select. Uso padrão:

    python fatiar_horarios.py <pdf> [--escala 2.5]
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf  # pip install pymupdf
from PIL import Image

PASTA_IMAGENS = Path(__file__).parent / "fotos"
ARQUIVO_INDICE = Path(__file__).parent / "index.json"
QUALIDADE = 82

PADRAO_CABECALHO = re.compile(r"^HOR[ÁA]RIO\s+DAS\s+AULAS\s*(\S*)", re.IGNORECASE)
PADRAO_TURMA = re.compile(r"^\d+[A-Za-z]")


def turma_arquivo(turma):
    """'1A AGROPECUÁRIA' -> '1a-agropecuaria' (ASCII, seguro p/ nome de arquivo e URL)."""
    nome = unicodedata.normalize("NFKD", turma).encode("ascii", "ignore").decode()
    nome = re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")
    return nome or "pagina"


def extrai_cabecalho_e_turma(page):
    linhas = [l.strip() for l in page.get_text().splitlines() if l.strip()]
    if len(linhas) < 2:
        return None, None, None
    semestre = PADRAO_CABECALHO.match(linhas[0]).group(1) if PADRAO_CABECALHO.match(linhas[0]) else ""
    # A turma é a 2ª linha (padrão visto em todos os PDFs de horário)
    turma = linhas[1] if PADRAO_TURMA.match(linhas[1]) else ""
    return semestre, turma, linhas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", help="caminho do PDF de horários")
    parser.add_argument("--escala", type=float, default=2.5,
                        help="fator de zoom do render (padrão 2.5 ~ 2100px de largura)")
    args = parser.parse_args()

    doc = pymupdf.open(args.pdf)
    if not doc:
        sys.exit("PDF vazio: " + args.pdf)

    PASTA_IMAGENS.mkdir(parents=True, exist_ok=True)
    # Regeneração limpa imagens antigas (PDF novo substitui o antigo)
    for antiga in PASTA_IMAGENS.glob("*.webp"):
        antiga.unlink()

    indice, usados = [], set()
    matriz = pymupdf.Matrix(args.escala, args.escala)
    for pagina in doc:
        semestre, turma, _ = extrai_cabecalho_e_turma(pagina)
        if not turma:
            print(f"AVISO: página {pagina.number} sem turma reconhecida — salvando como pagina-{pagina.number:02d}")
            turma = f"Página {pagina.number + 1}"

        arquivo = turma_arquivo(turma)
        # colisão de nome sanitizado (ex.: duas turmas só diferindo em acento)
        while arquivo in usados:
            arquivo += f"-p{pagina.number:02d}"
        usados.add(arquivo)
        destino = PASTA_IMAGENS / f"{arquivo}.webp"

        pix = pagina.get_pixmap(matrix=matriz, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img.save(destino, "WEBP", quality=QUALIDADE, method=6)

        indice.append({"turma": turma, "arquivo": f"{arquivo}.webp", "semestre": semestre})
        print(f"página {pagina.number + 1:2d}: {turma} -> {destino.name} ({img.width}x{img.height})")

    ARQUIVO_INDICE.write_text(json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(indice)} turmas em {PASTA_IMAGENS}")
    print(f"índice: {ARQUIVO_INDICE}")


if __name__ == "__main__":
    main()