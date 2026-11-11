#!/usr/bin/env python3
"""Fila do Cérebro de YouTube: um canal por vez, lote após lote, até não haver pendentes.
Funciona no Windows, no Mac e no Linux.

    python fila.py                      roda os canais de canais.txt, na ordem do arquivo
    python fila.py "Canal A" "Canal B"  roda só estes
    python fila.py status               diz se a fila está viva e mostra o fim do log
"""

import datetime as dt
import os
import platform
import random
import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
LOG = RAIZ / "fila.log"
TRAVA = RAIZ / "fila.lock"
CEREBRO = RAIZ / "cerebro.py"

CONCLUIDO, BLOQUEIO, OCUPADO, INTERROMPIDO = 10, 20, 30, 130


def log(msg):
    linha = f"[{dt.datetime.now():%Y-%m-%d %H:%M:%S}] [fila] {msg}"
    print(linha, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(linha + "\n")


def pausa(minimo, maximo, motivo):
    s = random.randint(minimo, maximo)
    log(f"pausa de {s}s ({motivo})")
    time.sleep(s)


def travar():
    """Uma fila por máquina. A trava é do sistema operacional: se a fila morrer,
    a trava some junto. Não depende de PID nem de procurar processo pelo nome."""
    f = open(TRAVA, "a+")
    try:
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return None
    return f


def manter_acordado():
    """O computador não pode dormir no meio de uma carga de horas."""
    sistema = platform.system()
    if sistema == "Windows":
        import ctypes
        ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
        log("o Windows não vai suspender enquanto esta janela estiver aberta")
    elif sistema == "Darwin":
        # caffeinate -w vigia esta própria fila e morre junto com ela.
        subprocess.Popen(["caffeinate", "-dimsu", "-w", str(os.getpid())])
        log("caffeinate ativo: o Mac não dorme enquanto a fila rodar")
    else:
        log("lembrete: desligue a suspensão automática enquanto a carga roda")


def ler_canais(args):
    if args:
        return list(args)
    arq = RAIZ / "canais.txt"
    if not arq.exists():
        return []
    canais = []
    for linha in arq.read_text(encoding="utf-8").splitlines():
        linha = linha.split("#", 1)[0].strip()
        if linha:
            canais.append(linha)
    return canais


def rodar_lote(canal, listar):
    cmd = [sys.executable, str(CEREBRO), "lote", canal] + (["--listar"] if listar else [])
    env = {**os.environ, "PYTHONUTF8": "1", "PYTHONUNBUFFERED": "1"}
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=RAIZ,
                         env=env, encoding="utf-8", errors="replace")
    with open(LOG, "a", encoding="utf-8") as f:
        for linha in p.stdout:
            print(linha, end="", flush=True)
            f.write(linha)
            f.flush()
    return p.wait()


def status():
    t = travar()
    if t:
        t.close()
        print("A fila está PARADA.")
    else:
        print("A fila está RODANDO.")
    bloqueio = RAIZ / "BLOQUEIO.json"
    if bloqueio.exists():
        print("ATENÇÃO: há um bloqueio registrado:\n" + bloqueio.read_text(encoding="utf-8"))
    print("\n--- últimas linhas do fila.log ---")
    if LOG.exists():
        print("".join(LOG.read_text(encoding="utf-8", errors="replace").splitlines(True)[-15:]))
    env = {**os.environ, "PYTHONUTF8": "1"}
    for canal in ler_canais([]):
        if (RAIZ / canal / "estado.json").exists():
            print("\n" + "-" * 64)
            sys.stdout.flush()
            subprocess.call([sys.executable, str(CEREBRO), "conferir", canal], cwd=RAIZ, env=env)
    return 0


def main(args):
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(errors="replace")
        except Exception:
            pass
    if args[:1] == ["status"]:
        return status()

    trava = travar()
    if trava is None:
        print("Já existe uma fila rodando. Saindo sem fazer nada.")
        return OCUPADO

    canais = ler_canais(args)
    if not canais:
        log("nenhum canal cadastrado: rode o instalador primeiro")
        return 1
    manter_acordado()
    log(f"início da fila: {len(canais)} canal(is): {', '.join(canais)}")

    for n, canal in enumerate(canais, 1):
        if not (RAIZ / canal / "canal.json").exists():
            log(f"pulando '{canal}': não tem canal.json")
            continue
        log(f"=== canal {n} de {len(canais)}: {canal} ===")
        # A primeira chamada em cada canal é obrigatória e refaz a listagem: é ela que
        # descobre vídeo novo. A fila nunca conta pendentes lendo o estado.json sozinha.
        primeira, erros = True, 0
        while True:
            rc = rodar_lote(canal, primeira)
            if rc == 0:
                primeira, erros = False, 0
                pausa(60, 120, "entre lotes")
            elif rc == CONCLUIDO:
                log(f"canal '{canal}' em dia")
                break
            elif rc == BLOQUEIO:
                log("BLOQUEIO: a fila parou inteira. Não rode de novo antes de 24 horas.")
                return BLOQUEIO
            elif rc == OCUPADO:
                log("outra execução do cérebro está rodando; saindo")
                return OCUPADO
            elif rc == INTERROMPIDO:
                log("interrompido")
                return INTERROMPIDO
            else:
                erros += 1
                if erros >= 10:
                    log(f"10 erros seguidos em '{canal}'; parando a fila para alguém olhar o fila.log")
                    return 1
                espera = 1800 if erros >= 5 else 600
                log(f"erro no lote (código {rc}, {erros}º seguido); espera de {espera // 60} minutos")
                time.sleep(espera)
        if n < len(canais):
            pausa(60, 120, "entre canais")

    log("fila concluída: tudo em dia")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        log("fila interrompida. Tudo o que foi feito está salvo; rode de novo para continuar.")
        sys.exit(INTERROMPIDO)
