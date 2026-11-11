#!/usr/bin/env python3
"""Instalador do Cérebro de YouTube, para quem nunca programou.
Instala o que falta, configura o navegador, cadastra os canais e faz o primeiro teste."""

import datetime as dt
import json
import os
import platform
import re
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
CONFIG_DIR = Path(os.environ.get("CEREBRO_CONFIG_DIR", Path.home() / ".config" / "cerebro"))
WINDOWS = platform.system() == "Windows"
MAC = platform.system() == "Darwin"
UA_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:{v}) Gecko/20100101 Firefox/{v}"


def titulo(texto):
    print("\n" + "=" * 64 + f"\n  {texto}\n" + "=" * 64)


def perguntar(texto, padrao=""):
    r = input(f"\n{texto} ").strip()
    return r or padrao


def sim(texto, padrao=True):
    dica = "(S/n)" if padrao else "(s/N)"
    r = input(f"\n{texto} {dica} ").strip().lower()
    return padrao if not r else r.startswith("s")


def esperar_enter(texto="Aperte Enter para continuar..."):
    input(f"\n{texto}")


def rodar_cerebro(*args):
    env = {**os.environ, "PYTHONUTF8": "1"}
    return subprocess.call([sys.executable, str(RAIZ / "cerebro.py"), *args], cwd=RAIZ, env=env)


# ---------------------------------------------------------------------------
def aviso_inicial():
    titulo("Cérebro de YouTube: instalação")
    print("""
Este programa guarda a transcrição de todos os vídeos de um canal do YouTube,
um arquivo de texto por vídeo, para você pesquisar tudo o que o canal já disse.

Antes de seguir, três avisos importantes:

1. É LENTO DE PROPÓSITO: cerca de 60 a 70 vídeos por hora. Um canal de 500
   vídeos leva uma noite. Isso é o que evita o YouTube bloquear a sua internet.

2. TERMOS DO YOUTUBE: os Termos de Serviço do YouTube restringem acesso
   automatizado fora da API oficial. O ritmo lento existe para não sobrecarregar
   o serviço, mas a decisão de usar é sua. Use só para estudo e consulta própria:
   as transcrições são conteúdo dos donos dos canais, não republique.

3. SUA CONTA: o programa usa a sessão do navegador onde você entrou no YouTube.
   O mais seguro é usar uma conta Google secundária, e não a principal.""")
    if not sim("Entendeu e quer continuar?"):
        sys.exit(0)


def instalar_pacotes():
    titulo("Passo 1 de 5: instalando os componentes")
    print("Baixando youtube-transcript-api, requests e yt-dlp (pode levar um minuto)...")
    cmd = [sys.executable, "-m", "pip", "install", "--upgrade", "--disable-pip-version-check",
           "youtube-transcript-api>=1.0,<2", "requests", "yt-dlp"]
    if subprocess.call(cmd) != 0:
        print("\nNão consegui instalar. Confira se a internet está funcionando e rode o instalador de novo.")
        esperar_enter("Aperte Enter para fechar.")
        sys.exit(1)
    print("\n✓ Componentes instalados.")


# ---------------------------------------------------------------------------
def achar_firefox():
    candidatos = [Path(os.environ.get(v, "")) / "Mozilla Firefox" / "firefox.exe"
                  for v in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA") if os.environ.get(v)]
    return next((c for c in candidatos if c.exists()), None)


def versao_firefox():
    try:
        import winreg
        for raiz in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(raiz, r"SOFTWARE\Mozilla\Mozilla Firefox") as k:
                    v = winreg.QueryValueEx(k, "CurrentVersion")[0]   # ex.: "145.0 (x64 pt-BR)"
                    m = re.match(r"(\d+)\.", v)
                    if m:
                        return f"{m.group(1)}.0"
            except OSError:
                continue
    except ImportError:
        pass
    return "145.0"


def preparar_navegador():
    titulo("Passo 2 de 5: navegador")
    if not WINDOWS:
        navegador = "safari" if sim("Você usa o Safari para entrar no YouTube? (responda n se usa o Chrome)", False) else "chrome"
        if MAC:
            print("\nIMPORTANTE: daqui a pouco o Mac vai pedir acesso às Chaves (Keychain).\n"
                  "Digite a senha do Mac e clique em 'PERMITIR SEMPRE'.")
        return navegador, None

    print("""
No Windows, o Google Chrome protege os cookies de um jeito que impede este tipo
de programa de usá-los. Por isso o Cérebro usa o FIREFOX, como recomenda o próprio
manual. Você só precisa entrar no YouTube pelo Firefox UMA VEZ; depois pode
continuar usando o Chrome no dia a dia.""")
    ff = achar_firefox()
    if not ff:
        print("\nO Firefox não está instalado. Instalando agora (pode aparecer uma janela pedindo permissão)...")
        try:
            subprocess.call(["winget", "install", "-e", "--id", "Mozilla.Firefox",
                             "--accept-source-agreements", "--accept-package-agreements"])
        except FileNotFoundError:
            pass
        ff = achar_firefox()
    if not ff:
        print("\nNão consegui instalar o Firefox sozinho. Vou abrir a página de download:\n"
              "baixe, instale com as opções padrão e volte para esta janela.")
        webbrowser.open("https://www.mozilla.org/pt-BR/firefox/new/")
        esperar_enter("Quando o Firefox estiver instalado, aperte Enter...")
        ff = achar_firefox()
        if not ff:
            print("Ainda não encontrei o Firefox. Rode o instalador de novo depois de instalá-lo.")
            esperar_enter("Aperte Enter para fechar.")
            sys.exit(1)
    print("✓ Firefox encontrado.")
    print("\nVou abrir o YouTube no Firefox. Clique em 'Fazer login' (canto de cima, à direita)\n"
          "e entre na conta Google que você quer usar (de preferência uma secundária).")
    esperar_enter("Aperte Enter para abrir o Firefox...")
    subprocess.Popen([str(ff), "https://www.youtube.com"])
    print("\nDepois de entrar e ver a sua foto no canto do YouTube, FECHE o Firefox\n"
          "(isso faz ele salvar o login) e volte para esta janela.")
    esperar_enter("Com o Firefox fechado, aperte Enter...")
    return "firefox", UA_FIREFOX.format(v=versao_firefox())


def gravar_config(navegador, user_agent):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    arq = CONFIG_DIR / "config.json"
    cfg = {}
    if arq.exists():
        try:
            cfg = json.loads(arq.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            cfg = {}
    cfg["navegador"] = navegador
    if user_agent:
        cfg["user_agent"] = user_agent
    elif "user_agent" in cfg and cfg["user_agent"].startswith("COLE AQUI"):
        del cfg["user_agent"]
    cfg.setdefault("youtube_api_key", "")
    arq.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def testar_cookies():
    """Extrai os cookies uma vez e confere se há sessão do YouTube, sem mostrar o conteúdo."""
    sys.path.insert(0, str(RAIZ))
    import cerebro
    while True:
        print("\nTestando o acesso à sua sessão do YouTube...")
        try:
            cfg = cerebro.carregar_config()
            cerebro.renovar_cookies(cfg)
            texto = cfg["cookies"].read_text(encoding="utf-8", errors="replace")
            logado = any(("youtube.com" in l and ("LOGIN_INFO" in l or "SAPISID" in l))
                         for l in texto.splitlines())
            if logado:
                print("✓ Sessão do YouTube encontrada.")
                return
            print("\nConsegui ler o navegador, mas parece que você NÃO está logado no YouTube nele.")
        except cerebro.Bloqueado as e:
            print(f"\nO YouTube recusou o acesso ({e}). Não insista agora: tente de novo amanhã.")
            esperar_enter("Aperte Enter para fechar.")
            sys.exit(1)
        except Exception as e:
            print(f"\nNão consegui ler a sessão do navegador:\n  {e}")
            if WINDOWS:
                print("Dica: feche o Firefox completamente e tente de novo.")
        if not sim("Quer tentar de novo? (entre no YouTube pelo navegador antes)"):
            print("Sem a sessão do navegador o YouTube bloqueia muito mais cedo. Rode o instalador de novo depois.")
            esperar_enter("Aperte Enter para fechar.")
            sys.exit(1)


# ---------------------------------------------------------------------------
def normalizar_canal(texto):
    t = texto.strip().strip("<>").rstrip("/")
    m = re.search(r"youtube\.com/(@[\w.\-]+|channel/UC[\w-]+|c/[\w.\-]+|user/[\w.\-]+)", t)
    if m:
        parte = m.group(1)
        return parte if parte.startswith("@") else f"https://www.youtube.com/{parte}"
    if re.fullmatch(r"UC[\w-]{20,}", t):
        return t
    t = t.lstrip("@")
    return f"@{t}" if re.fullmatch(r"[\w.\-]+", t) else None


def data_br(texto):
    texto = texto.strip()
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%m/%Y"):
        try:
            return dt.datetime.strptime(texto, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def cadastrar_canais():
    titulo("Passo 3 de 5: canais")
    existentes = [l.strip() for l in (RAIZ / "canais.txt").read_text(encoding="utf-8").splitlines()
                  if l.strip()] if (RAIZ / "canais.txt").exists() else []
    if existentes:
        print("Canais já cadastrados: " + ", ".join(existentes))
        if not sim("Quer cadastrar mais algum?", False):
            return existentes
    while True:
        entrada = perguntar("Cole o endereço do canal (ex.: https://www.youtube.com/@fulano) ou só o @fulano:")
        handle = normalizar_canal(entrada) if entrada else None
        if not handle:
            print("Não entendi esse endereço. Abra o canal no navegador e copie o endereço da barra lá em cima.")
            continue
        padrao = handle.lstrip("@").split("/")[-1]
        nome = perguntar(f"Que nome você quer dar para esse canal? (Enter para '{padrao}')", padrao)
        idioma = "pt" if sim("O canal fala em português?") else \
            perguntar("Qual idioma? Digite en (inglês), es (espanhol), fr (francês)...", "en").lower()[:2]
        desde, ultimos = None, None
        while True:
            r = perguntar("Quantos vídeos você quer?\n"
                          "  - digite um número (ex.: 10) para só os últimos vídeos publicados\n"
                          "  - ou aperte Enter para TODOS os vídeos do canal")
            if not r:
                break
            if r.isdigit() and int(r) > 0:
                ultimos = int(r)
                break
            print("Digite só o número, por exemplo 10, ou aperte Enter.")
        while not ultimos:
            r = perguntar("Quer só os vídeos a partir de uma data? Digite a data (ex.: 01/01/2026)\n"
                          "ou aperte Enter para pegar TODOS os vídeos:")
            if not r:
                break
            desde = data_br(r)
            if desde:
                break
            print("Não entendi a data. Use o formato dia/mês/ano, por exemplo 01/01/2026.")
        args = ["novo", handle, nome, "--idioma", idioma] + (["--desde", desde] if desde else []) \
            + (["--ultimos", str(ultimos)] if ultimos else [])
        if rodar_cerebro(*args) not in (0,):
            print("(Esse canal já existia; mantive a configuração anterior.)")
        print(f"✓ Canal '{nome}' cadastrado.")
        if not sim("Quer cadastrar outro canal?", False):
            break
    return [l.strip() for l in (RAIZ / "canais.txt").read_text(encoding="utf-8").splitlines() if l.strip()]


def listar_e_ordenar(canais):
    titulo("Passo 4 de 5: contando os vídeos")
    print("Vou listar os vídeos de cada canal (isso não baixa nada ainda).")
    tamanhos = {}
    for canal in canais:
        print()
        rc = rodar_cerebro("listar", canal)
        estado = RAIZ / canal / "estado.json"
        if rc == 20:
            print("\nO YouTube recusou o acesso. Pare por hoje e tente de novo daqui a 24 horas.")
            esperar_enter("Aperte Enter para fechar.")
            sys.exit(1)
        if estado.exists():
            tamanhos[canal] = len(json.loads(estado.read_text(encoding="utf-8"))["todos_ids"])
        time.sleep(5)
    # O manual: comece pelo menor canal. O cérebro já fica útil nas primeiras horas.
    ordem = sorted(canais, key=lambda c: tamanhos.get(c, 10 ** 9))
    (RAIZ / "canais.txt").write_text("\n".join(ordem) + "\n", encoding="utf-8")
    if len(ordem) > 1:
        print("\nOrdem da fila (do menor para o maior): " + " → ".join(ordem))
    return ordem


def abrir_pasta(pasta):
    try:
        if WINDOWS:
            os.startfile(str(pasta))
        elif MAC:
            subprocess.call(["open", str(pasta)])
    except Exception:
        pass


def primeiro_teste(canal):
    titulo("Passo 5 de 5: primeiro teste")
    print(f"Agora vou baixar a transcrição de 1 vídeo do canal '{canal}' para conferirmos.\n"
          "Leva menos de um minuto (ele faz pausas de propósito).")
    if not sim("Fazer o teste com 1 vídeo agora?"):
        return
    rc = rodar_cerebro("lote", canal, "--tamanho", "1")
    if rc == 20:
        print("\nO YouTube recusou o acesso. Pare por hoje e tente de novo daqui a 24 horas.")
        return
    pasta = RAIZ / canal / "videos"
    if pasta.exists() and any(pasta.glob("*.md")):
        print(f"\n✓ Funcionou! Vou abrir a pasta '{canal}\\videos'. Abra o arquivo com o Bloco de Notas\n"
              "e confira se o texto é mesmo do vídeo do título.")
        abrir_pasta(pasta)
        if sim("O arquivo está certo? Fazer agora um teste com 5 vídeos (uns 4 minutos)?"):
            rodar_cerebro("lote", canal, "--tamanho", "5")
    else:
        print("\nEsse vídeo não tinha legenda ou algo deu errado. Leia a mensagem acima.\n"
              "Se foi só 'sem legenda', está tudo bem: a fila tenta os outros.")


def main():
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(errors="replace")
        except Exception:
            pass
    aviso_inicial()
    instalar_pacotes()
    navegador, ua = preparar_navegador()
    gravar_config(navegador, ua)
    testar_cookies()
    canais = cadastrar_canais()
    ordem = listar_e_ordenar(canais)
    if ordem:
        primeiro_teste(ordem[0])
    titulo("Pronto!")
    print("""
Para baixar TODOS os vídeos, clique duas vezes em:

    2 - RODAR O CEREBRO

Deixe aquela janela aberta (pode minimizar). O computador não vai dormir
enquanto ela estiver aberta. Se fechar ou cair a luz, é só clicar de novo:
ele continua de onde parou.

Para ver quanto já foi:  3 - VER COMO ESTA
Para procurar um assunto: 4 - PESQUISAR NO CEREBRO""")
    esperar_enter("Aperte Enter para fechar o instalador.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInstalação interrompida. Pode rodar de novo quando quiser.")
