#!/usr/bin/env python3
"""Pesquisa no Cérebro de YouTube: procura palavras em todas as transcrições já baixadas.
Não acessa a internet.

    python buscar.py                 pergunta o que procurar
    python buscar.py "marketing digital"
"""

import os
import platform
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
MAX_RESULTADOS = 20


def sem_acento(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn")


def ler_nota(arq):
    texto = arq.read_text(encoding="utf-8", errors="replace")
    cab = {}
    if texto.startswith("---"):
        for linha in texto.split("---", 2)[1].splitlines():
            if ":" in linha:
                k, v = linha.split(":", 1)
                cab[k.strip()] = v.strip().strip('"')
    return cab, texto


def trecho(texto, termos, largura=160):
    plano = sem_acento(texto)
    pos = min((plano.find(t) for t in termos if plano.find(t) >= 0), default=0)
    ini = max(0, pos - largura // 2)
    pedaco = re.sub(r"\s+", " ", texto[ini:ini + largura]).strip()
    return ("…" if ini else "") + pedaco + "…"


def buscar(consulta):
    termos = [sem_acento(t) for t in re.findall(r'"[^"]+"|\S+', consulta)]
    termos = [t.strip('"') for t in termos if t.strip('"')]
    resultados = []
    for arq in RAIZ.glob("*/videos/*.md"):
        cab, texto = ler_nota(arq)
        plano = sem_acento(texto)
        if all(t in plano for t in termos):
            vezes = sum(plano.count(t) for t in termos)
            resultados.append((vezes, cab, arq, texto))
    resultados.sort(key=lambda r: r[0], reverse=True)
    return termos, resultados


def abrir(arq):
    try:
        if platform.system() == "Windows":
            os.startfile(str(arq))
        elif platform.system() == "Darwin":
            subprocess.call(["open", str(arq)])
        else:
            subprocess.call(["xdg-open", str(arq)])
    except Exception as e:
        print(f"Não consegui abrir: {e}")


def main(args):
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(errors="replace")
        except Exception:
            pass
    total = len(list(RAIZ.glob("*/videos/*.md")))
    print(f"Cérebro de YouTube: {total} vídeos transcritos para pesquisar.")
    if not total:
        print("Ainda não há nada baixado. Rode primeiro o '2 - RODAR O CEREBRO'.")
        return
    consulta = " ".join(args)
    while True:
        if not consulta:
            consulta = input("\nO que você quer procurar? (Enter vazio para sair) ").strip()
            if not consulta:
                return
        termos, resultados = buscar(consulta)
        if not resultados:
            print(f"Nenhum vídeo fala de '{consulta}'. Tente outras palavras.")
        else:
            print(f"\n{len(resultados)} vídeo(s) falam de '{consulta}'"
                  + (f" (mostrando os {MAX_RESULTADOS} com mais menções)" if len(resultados) > MAX_RESULTADOS else "") + ":")
            mostrados = resultados[:MAX_RESULTADOS]
            for i, (vezes, cab, arq, texto) in enumerate(mostrados, 1):
                print(f"\n {i:>2}. {cab.get('titulo', arq.stem)}")
                print(f"     {cab.get('data', '?')} · {cab.get('canal', arq.parent.parent.name)} · {vezes} menção(ões)")
                print(f"     {cab.get('url', '')}")
                print(f"     {trecho(texto.split('## Transcrição', 1)[-1], termos)}")
            escolha = input("\nDigite o número para abrir o arquivo, ou Enter para nova pesquisa: ").strip()
            if escolha.isdigit() and 1 <= int(escolha) <= len(mostrados):
                abrir(mostrados[int(escolha) - 1][2])
        consulta = ""


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (KeyboardInterrupt, EOFError):
        print()
