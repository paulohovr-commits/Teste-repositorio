#!/usr/bin/env python3
"""Cérebro de YouTube: guarda a transcrição de todos os vídeos de um canal,
um arquivo Markdown por vídeo, sem tomar bloqueio.

Um script só, para qualquer canal. Cada canal é uma pasta com um canal.json.

    python3 cerebro.py novo @fulano "Nome do Canal" --idioma pt [--desde 2026-01-01]
    python3 cerebro.py listar   "Nome do Canal"          # só lista e mostra os totais
    python3 cerebro.py lote     "Nome do Canal" [--tamanho 1] [--listar]
    python3 cerebro.py conferir "Nome do Canal"          # números finais, sem acessar o YouTube

Quem chama `lote` repetidas vezes é a fila (fila.sh). Códigos de saída de `lote`:
    0  lote feito, ainda há pendentes
    10 canal concluído (nada pendente agora)
    20 BLOQUEIO: pare tudo, retome só depois de 24 horas
    30 outra execução já está rodando
    1  erro genérico (rede, script): a fila espera 10 minutos
"""

import argparse
import datetime as dt
import html
import http.cookiejar
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# --------------------------------------------------------------------------
# Regras de ritmo. Não reduza estes números para "otimizar": a lentidão e a
# aleatoriedade são a proteção contra bloqueio.
# --------------------------------------------------------------------------
PAUSA_ENTRE_VIDEOS = (25, 40)      # segundos, depois de TODA tentativa
PAUSA_RENOVACAO = (60, 90)         # a cada 10 vídeos, junto com cookies novos
VIDEOS_POR_SESSAO = 10
TAMANHO_LOTE = 20
MAX_TENTATIVAS = 3                 # sem legenda 3 vezes: parqueado para sempre
HORAS_APOS_BLOQUEIO = 24
HORAS_LIVE_FUTURA = 6              # live agendada: tirar da fila por algumas horas
HORAS_LIVE_ENCERRADA = 1           # live recém-terminada: legenda ainda sendo gerada
HORAS_VIDEO_SEM_LEGENDA = 12       # intervalo entre tentativas de um vídeo comum

SAIDA_OK = 0
SAIDA_ERRO = 1
SAIDA_CONCLUIDO = 10
SAIDA_BLOQUEIO = 20
SAIDA_OCUPADO = 30
SAIDA_INTERROMPIDO = 130

RAIZ = Path(__file__).resolve().parent
ARQ_BLOQUEIO = RAIZ / "BLOQUEIO.json"
ARQ_CANAIS = RAIZ / "canais.txt"
CONFIG_DIR = Path(os.environ.get("CEREBRO_CONFIG_DIR", Path.home() / ".config" / "cerebro"))

ABAS = (("videos", "vídeo"), ("streams", "live"), ("shorts", "short"))
TITULOS_IGNORADOS = {"[private video]", "[deleted video]", "private video", "deleted video"}

# Sinais de que o YouTube está barrando o acesso. "Sign in to confirm your age"
# é restrição de idade, não bloqueio, por isso a frase aqui é "not a bot".
SINAIS_BLOQUEIO = ("http error 429", "too many requests", "not a bot",
                   "unusual traffic", "ip has been blocked", "ipblocked", "requestblocked")
SINAIS_LIVE_FUTURA = ("live event will begin", "premieres in", "premiere will begin",
                      "is_upcoming", "this live event has not started")
SINAIS_REDE = ("getaddrinfo", "name or service not known", "nodename nor servname",
               "network is unreachable", "connection refused", "connection reset",
               "timed out", "temporary failure in name resolution", "no route to host")

UA_PADRAO = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
             "(KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36")


class Bloqueado(Exception):
    """O YouTube barrou o acesso. Para tudo, na hora."""


class ErroRede(Exception):
    """A rede caiu. Não é culpa do vídeo, então não conta tentativa."""


class Ocupado(Exception):
    """Outra execução já está rodando."""


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def log(msg):
    print(f"[{dt.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}", flush=True)


def agora():
    return dt.datetime.now(dt.timezone.utc)


def iso(momento):
    return momento.astimezone(dt.timezone.utc).isoformat(timespec="seconds")


def de_iso(texto):
    return dt.datetime.fromisoformat(texto)


def pausa(intervalo, motivo):
    segundos = random.uniform(*intervalo)
    log(f"   pausa de {segundos:.0f}s ({motivo})")
    time.sleep(segundos)


def gravar_atomico(caminho, conteudo):
    """Grava num arquivo temporário e troca de uma vez: quem lê nunca vê o arquivo pela metade."""
    caminho = Path(caminho)
    fd, tmp = tempfile.mkstemp(dir=caminho.parent, prefix=".tmp-", suffix=caminho.suffix)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(conteudo)
        os.replace(tmp, caminho)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def comando_ytdlp():
    # Prefere o yt-dlp instalado neste mesmo Python (é o que o instalador mantém atualizado).
    try:
        import yt_dlp  # noqa: F401
        return [sys.executable, "-m", "yt_dlp"]
    except ImportError:
        exe = shutil.which("yt-dlp")
        if not exe:
            raise RuntimeError("yt-dlp não está instalado: rode o instalador de novo")
        return [exe]


def tem_sinal(texto, sinais):
    t = (texto or "").lower()
    return any(s in t for s in sinais)


def rodar(cmd, timeout=180):
    """Roda um comando (yt-dlp). Bloqueio vira exceção Bloqueado, sempre."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                       encoding="utf-8", errors="replace", env={**os.environ, "PYTHONUTF8": "1"})
    except subprocess.TimeoutExpired:
        raise ErroRede(f"o comando passou de {timeout}s sem responder")
    # Só o stderr: o stdout traz títulos e descrições, que podem conter qualquer frase.
    if tem_sinal(r.stderr, SINAIS_BLOQUEIO):
        raise Bloqueado(ultima_linha(r.stderr) or "bloqueio detectado na resposta do yt-dlp")
    return r


def ultima_linha(texto):
    linhas = [l.strip() for l in (texto or "").splitlines() if l.strip()]
    return linhas[-1][:300] if linhas else ""


def data_de_timestamp(valor):
    try:
        return dt.datetime.fromtimestamp(int(float(valor)), dt.timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def data_de_upload(valor):
    """'20260314' -> '2026-03-14'."""
    if valor and re.fullmatch(r"\d{8}", str(valor)):
        v = str(valor)
        return f"{v[:4]}-{v[4:6]}-{v[6:]}"
    return None


# --------------------------------------------------------------------------
# Configuração: chaves e cookies ficam FORA do projeto (~/.config/cerebro/)
# --------------------------------------------------------------------------
def carregar_config():
    cfg = {}
    arq = CONFIG_DIR / "config.json"
    if arq.exists():
        cfg = json.loads(arq.read_text(encoding="utf-8"))
    return {
        "navegador": os.environ.get("CEREBRO_NAVEGADOR") or cfg.get("navegador") or "chrome",
        "user_agent": os.environ.get("CEREBRO_USER_AGENT") or cfg.get("user_agent") or UA_PADRAO,
        "api_key": os.environ.get("YOUTUBE_API_KEY") or cfg.get("youtube_api_key") or None,
        "cookies": Path(os.environ.get("CEREBRO_COOKIES") or cfg.get("cookies")
                        or CONFIG_DIR / "yt_cookies.txt").expanduser(),
    }


def renovar_cookies(cfg):
    """Extrai os cookies do navegador onde a pessoa está logada no YouTube.
    O arquivo é credencial da conta Google: nunca imprima o conteúdo."""
    destino = cfg["cookies"]
    destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(destino.parent, 0o700)
    except OSError:
        pass
    antes = destino.stat().st_mtime if destino.exists() else 0
    cmd = comando_ytdlp() + ["--cookies-from-browser", cfg["navegador"], "--cookies", str(destino),
                             "--skip-download", "--no-warnings", "--flat-playlist",
                             "https://www.youtube.com"]
    r = rodar(cmd, timeout=180)
    if destino.exists() and destino.stat().st_mtime > antes:
        try:
            os.chmod(destino, 0o600)
        except OSError:
            pass
        log(f"   cookies renovados a partir do {cfg['navegador']}")
        return
    if destino.exists():
        log(f"   AVISO: não consegui renovar os cookies ({ultima_linha(r.stderr)}). Sigo com os anteriores.")
        return
    raise RuntimeError(
        f"não consegui extrair os cookies do {cfg['navegador']}: {ultima_linha(r.stderr)}\n"
        "   No macOS, clique em 'Permitir sempre' no pedido das Chaves (Keychain).\n"
        "   No Windows, se o Chrome falhar, entre no YouTube pelo Firefox e use CEREBRO_NAVEGADOR=firefox.")


def criar_sessao_com_cookies(cfg):
    import requests
    s = requests.Session()
    s.headers.update({
        "User-Agent": cfg["user_agent"],
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    })
    if cfg["cookies"].exists():
        jar = http.cookiejar.MozillaCookieJar(str(cfg["cookies"]))
        jar.load(ignore_discard=True, ignore_expires=True)
        s.cookies = jar
    return s


# --------------------------------------------------------------------------
# Canal e estado
# --------------------------------------------------------------------------
def carregar_canal(pasta):
    pasta = Path(pasta)
    if not pasta.is_absolute():
        pasta = (RAIZ / pasta) if (RAIZ / pasta).exists() else pasta.resolve()
    arq = pasta / "canal.json"
    if not arq.exists():
        raise SystemExit(f"Não achei {arq}. Crie o canal com: python3 cerebro.py novo @handle \"Nome\"")
    canal = json.loads(arq.read_text(encoding="utf-8"))
    canal["pasta"] = pasta
    canal.setdefault("nome", pasta.name)
    canal.setdefault("idioma", "pt")
    if canal.get("desde"):
        dt.date.fromisoformat(canal["desde"])  # falha cedo se a data estiver escrita errado
    return canal


def idiomas_legenda(idioma):
    base = idioma.split("-")[0].lower()
    if base == "pt":
        prefs = ["pt", "pt-BR", "pt-PT", "en"]
    else:
        prefs = [idioma, base, "en"]
    vistos = []
    for p in prefs:
        if p not in vistos:
            vistos.append(p)
    return vistos


def idioma_listagem(idioma):
    # NUNCA "pt-BR": o yt-dlp rejeita e a listagem volta vazia, sem erro.
    return idioma.split("-")[0].lower() or "pt"


def estado_vazio():
    return {"todos_ids": {}, "processados": {}, "sem_transcricao": {}, "agendado_ate": {},
            "fora_do_corte": [], "ultima_listagem": None}


def carregar_estado(canal):
    arq = canal["pasta"] / "estado.json"
    if not arq.exists():
        return estado_vazio()
    for tentativa in range(3):
        try:
            estado = json.loads(arq.read_text(encoding="utf-8"))
            break
        except json.JSONDecodeError:
            if tentativa == 2:
                raise
            log("estado.json ilegível neste instante; tento de novo em 30s")
            time.sleep(30)
    base = estado_vazio()
    base.update(estado)
    return base


def salvar_estado(canal, estado):
    gravar_atomico(canal["pasta"] / "estado.json", json.dumps(estado, ensure_ascii=False, indent=1))


def classificar(vid, estado, momento=None):
    """Cada vídeo listado cai em exatamente uma categoria (a ordem importa)."""
    momento = momento or agora()
    if vid in estado["processados"]:
        return "processado"
    if estado["sem_transcricao"].get(vid, 0) >= MAX_TENTATIVAS:
        return "parqueado"
    if vid in estado["fora_do_corte"]:
        return "fora_do_corte"
    ate = estado["agendado_ate"].get(vid)
    if ate and de_iso(ate) > momento:
        return "aguardando"
    return "pendente"


def pendentes(estado):
    momento = agora()
    return [v for v in estado["todos_ids"] if classificar(v, estado, momento) == "pendente"]


def limpar_orfaos(canal, estado):
    """Se alguém apagou um .md, o vídeo volta para a fila."""
    pasta = canal["pasta"] / "videos"
    for vid, p in list(estado["processados"].items()):
        if not (pasta / p["arquivo"]).exists():
            log(f"   nota apagada, o vídeo volta para a fila: {p['arquivo']}")
            del estado["processados"][vid]


# --------------------------------------------------------------------------
# Etapa 1: listar o canal
# --------------------------------------------------------------------------
def url_canal(handle):
    h = handle.strip().rstrip("/")
    if h.startswith("http"):
        return re.sub(r"/(videos|streams|shorts|featured)$", "", h)
    if h.startswith("UC") and not h.startswith("@"):
        return f"https://www.youtube.com/channel/{h}"
    if not h.startswith("@"):
        h = "@" + h
    return f"https://www.youtube.com/{h}"


def listar_aba(canal, aba):
    """Lista uma aba. Devolve lista de (id, titulo, data|None), [] se a aba não existe,
    ou None se deu erro (aí o que já se sabia dessa aba é preservado)."""
    cmd = comando_ytdlp() + ["--flat-playlist", "--no-warnings",
                             "--extractor-args", f"youtube:lang={idioma_listagem(canal['idioma'])}",
                             "--print", "%(id)s\t%(title)s\t%(timestamp)s",
                             f"{url_canal(canal['handle'])}/{aba}"]
    r = rodar(cmd, timeout=900)
    itens = []
    for linha in r.stdout.splitlines():
        partes = linha.split("\t")
        if len(partes) < 3 or not re.fullmatch(r"[\w-]{11}", partes[0]):
            continue
        vid, titulo, ts = partes[0], "\t".join(partes[1:-1]).strip(), partes[-1].strip()
        if titulo.lower() in TITULOS_IGNORADOS:
            continue
        itens.append((vid, titulo, data_de_timestamp(ts) if ts not in ("NA", "None", "") else None))
    if r.returncode != 0 and not itens:
        erro = r.stderr.lower()
        if "does not have a" in erro or "this channel does not have" in erro:
            return []
        if tem_sinal(erro, SINAIS_REDE):
            raise ErroRede(ultima_linha(r.stderr))
        log(f"   AVISO: a aba /{aba} falhou: {ultima_linha(r.stderr)}")
        return None
    return itens


def buscar_meta_api(estado, cfg, ids):
    """Datas e descrições pela YouTube Data API oficial, 50 vídeos por chamada.
    Caminho do Google, com cota gratuita e sem risco de bloqueio."""
    import requests
    ids = list(ids)
    obtidos = 0
    for i in range(0, len(ids), 50):
        grupo = ids[i:i + 50]
        try:
            r = requests.get("https://www.googleapis.com/youtube/v3/videos",
                             params={"part": "snippet", "id": ",".join(grupo),
                                     "key": cfg["api_key"], "maxResults": 50}, timeout=30)
        except requests.RequestException as e:
            # A mensagem de erro do requests traz a URL com a chave: não imprimir.
            log(f"   AVISO: Data API sem resposta ({type(e).__name__}); sigo sem as datas da API")
            return obtidos
        if r.status_code != 200:
            try:
                motivo = r.json()["error"]["errors"][0]["reason"]
            except Exception:
                motivo = f"HTTP {r.status_code}"
            log(f"   AVISO: Data API recusou o pedido ({motivo}); sigo sem as datas da API")
            return obtidos
        for item in r.json().get("items", []):
            info = estado["todos_ids"].get(item["id"])
            if info is None:
                continue
            sn = item.get("snippet", {})
            if sn.get("publishedAt"):
                info["data"] = sn["publishedAt"][:10]
            info["descricao"] = sn.get("description", "")
            info["live_api"] = sn.get("liveBroadcastContent", "none")
            info["fonte_meta"] = "api"
            obtidos += 1
    return obtidos


def aplicar_corte(canal, estado):
    """Corte por data. Vídeo SEM data nunca é descartado: entra na fila com aviso."""
    desde = canal.get("desde")
    if not desde:
        return 0
    fora = set(estado["fora_do_corte"])
    sem_data = 0
    for vid, info in estado["todos_ids"].items():
        if vid in estado["processados"]:
            continue
        if info.get("data"):
            if info["data"] < desde:
                fora.add(vid)
            else:
                fora.discard(vid)
        else:
            sem_data += 1
    estado["fora_do_corte"] = sorted(fora)
    return sem_data


def atualizar_listagem(canal, estado, cfg):
    log(f"Listando {canal['nome']} ({url_canal(canal['handle'])})")
    antigos = estado["todos_ids"]
    novos, por_aba, abas_ok = {}, {}, 0
    for aba, tipo in ABAS:
        itens = listar_aba(canal, aba)
        if itens is None:
            for vid, info in antigos.items():
                if info.get("tipo") == tipo:
                    novos.setdefault(vid, info)
            por_aba[aba] = "erro (mantive a listagem anterior desta aba)"
            continue
        abas_ok += 1
        por_aba[aba] = len(itens)
        for vid, titulo, data in itens:
            if vid in novos:
                continue
            info = dict(antigos.get(vid, {}))
            info.update({"titulo": titulo, "tipo": tipo})
            if data and info.get("fonte_meta") != "api":
                info["data"] = data
            novos[vid] = info
        pausa((3, 8), "entre abas")
    if abas_ok == 0 or not novos:
        raise RuntimeError("a listagem voltou vazia; não mexi no estado. "
                           "Confira o handle no canal.json e atualize o yt-dlp (pip install -U yt-dlp).")
    descobertos = [v for v in novos if v not in antigos]
    estado["todos_ids"] = novos
    estado["ultima_listagem"] = iso(agora())

    if cfg["api_key"]:
        faltam = [v for v, i in novos.items()
                  if v not in estado["processados"]
                  and (i.get("fonte_meta") != "api" or i.get("live_api") in ("upcoming", "live"))]
        if faltam:
            n = buscar_meta_api(estado, cfg, faltam)
            log(f"   Data API: datas e descrições de {n} vídeos")

    sem_data = aplicar_corte(canal, estado)
    resumo = ", ".join(f"/{a}: {n}" for a, n in por_aba.items())
    log(f"   {len(novos)} vídeos listados ({resumo}); {len(descobertos)} novos desde a última listagem")
    if canal.get("desde") and sem_data:
        log(f"   AVISO: {sem_data} vídeos sem data na listagem. Eles ENTRAM na fila e o corte "
            f"'desde {canal['desde']}' é aplicado quando cada um é aberto."
            + ("" if cfg["api_key"] else " Com uma chave da Data API, o corte acontece antes, sem gastar pedidos."))
    return por_aba


# --------------------------------------------------------------------------
# Etapa 2: buscar a transcrição
# --------------------------------------------------------------------------
def metadados_ytdlp(vid, cfg):
    """Data exata, descrição e live_status, abrindo o vídeo uma vez pelo yt-dlp."""
    cmd = comando_ytdlp() + ["--no-warnings", "--skip-download", "--ignore-no-formats-error",
                             "--print", "%(.{upload_date,live_status,description})j"]
    if cfg["cookies"].exists():
        cmd += ["--cookies", str(cfg["cookies"])]
    r = rodar(cmd + [f"https://www.youtube.com/watch?v={vid}"], timeout=180)
    for linha in r.stdout.splitlines():
        try:
            return json.loads(linha)
        except json.JSONDecodeError:
            continue
    if tem_sinal(r.stderr, SINAIS_LIVE_FUTURA):
        return {"live_status": "is_upcoming"}
    if tem_sinal(r.stderr, SINAIS_REDE):
        raise ErroRede(ultima_linha(r.stderr))
    log(f"   não consegui os metadados: {ultima_linha(r.stderr)}")
    return None


def consultar_live_status(vid, cfg):
    cmd = comando_ytdlp() + ["--no-warnings", "--skip-download", "--ignore-no-formats-error",
                             "--print", "%(live_status)s"]
    if cfg["cookies"].exists():
        cmd += ["--cookies", str(cfg["cookies"])]
    r = rodar(cmd + [f"https://www.youtube.com/watch?v={vid}"], timeout=180)
    if tem_sinal(r.stderr, SINAIS_LIVE_FUTURA):
        return "is_upcoming"
    status = r.stdout.strip().splitlines()
    return status[-1].strip() if status else None


def obter_transcricao(vid, cfg, idiomas):
    """Primeiro a biblioteca com a sessão de cookies; se falhar por outro motivo que não
    'não tem legenda', uma tentativa pelo yt-dlp. Devolve (texto|None, mensagem de erro)."""
    import requests
    from youtube_transcript_api import (YouTubeTranscriptApi, NoTranscriptFound,
                                        TranscriptsDisabled, IpBlocked, RequestBlocked)
    try:
        api = YouTubeTranscriptApi(http_client=criar_sessao_com_cookies(cfg))
        lista = api.list(vid)
        try:
            t = lista.find_transcript(list(idiomas))
        except NoTranscriptFound:
            t = next(iter(lista))  # qualquer legenda que exista, de preferência a do idioma original
        trechos = t.fetch()
        texto = " ".join(tr.text.replace("\n", " ").strip() for tr in trechos if tr.text.strip())
        return (texto or None), ("" if texto else "legenda vazia")
    except (IpBlocked, RequestBlocked) as e:
        raise Bloqueado(str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__)
    except (NoTranscriptFound, TranscriptsDisabled, StopIteration) as e:
        return None, f"sem legenda ({type(e).__name__})"
    except (requests.ConnectionError, requests.Timeout) as e:
        raise ErroRede(type(e).__name__)
    except Exception as e:
        log(f"   a biblioteca falhou ({type(e).__name__}); tentando uma vez pelo yt-dlp")
        texto, erro = obter_transcricao_via_ytdlp(vid, cfg, idiomas)
        return texto, (erro or str(e)[:300])


def obter_transcricao_via_ytdlp(vid, cfg, idiomas):
    with tempfile.TemporaryDirectory(prefix="cerebro-sub-") as tmp:
        cmd = comando_ytdlp() + ["--no-warnings", "--write-auto-sub", "--write-sub", "--skip-download",
                                 "--sub-lang", ",".join(idiomas), "--sub-format", "vtt",
                                 "-o", f"{tmp}/sub.%(ext)s"]
        if cfg["cookies"].exists():
            cmd += ["--cookies", str(cfg["cookies"])]
        r = rodar(cmd + [f"https://www.youtube.com/watch?v={vid}"], timeout=300)
        arquivos = {p.name: p for p in Path(tmp).glob("*.vtt")}
        escolhido = None
        for lang in idiomas:
            if f"sub.{lang}.vtt" in arquivos:
                escolhido = arquivos[f"sub.{lang}.vtt"]
                break
        if escolhido is None and arquivos:
            escolhido = sorted(arquivos.values())[0]
        if escolhido is None:
            if tem_sinal(r.stderr, SINAIS_REDE):
                raise ErroRede(ultima_linha(r.stderr))
            return None, ultima_linha(r.stderr) or "o yt-dlp não encontrou legenda"
        texto = vtt_para_texto(escolhido.read_text(encoding="utf-8", errors="replace"))
        return (texto or None), ("" if texto else "legenda vazia")


def vtt_para_texto(conteudo):
    """A legenda automática repete cada linha duas ou três vezes e traz tempos no meio."""
    linhas = conteudo.splitlines()
    saida, anterior = [], None
    for i, bruta in enumerate(linhas):
        l = bruta.strip()
        if not l or l == "WEBVTT" or l.startswith(("Kind:", "Language:", "NOTE", "STYLE", "REGION")):
            continue
        if "-->" in l:
            continue
        proxima = linhas[i + 1] if i + 1 < len(linhas) else ""
        if l.isdigit() and "-->" in proxima:  # número da legenda
            continue
        l = html.unescape(re.sub(r"<[^>]+>", "", l)).strip()
        if not l or l == anterior:
            continue
        saida.append(l)
        anterior = l
    return " ".join(saida)


# --------------------------------------------------------------------------
# Etapa 3: salvar a nota
# --------------------------------------------------------------------------
def limpar_nome(texto):
    t = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", texto)
    t = re.sub(r"\s+", " ", t).strip().strip(".").strip()
    return t or "sem titulo"


def nome_arquivo(vid, info, estado, pasta_videos):
    """Único por VÍDEO, não por título. O disco do macOS e do Windows não diferencia
    maiúsculas: 'Is Finally Here' e 'is Finally Here' seriam o mesmo arquivo."""
    atual = estado["processados"].get(vid, {}).get("arquivo")
    if atual:
        return atual
    base = f"{info.get('data') or 'sem-data'} {limpar_nome(info.get('titulo', vid))}"
    nome = base[:100].rstrip(" .") + ".md"
    de_outros = {p["arquivo"].lower() for v, p in estado["processados"].items() if v != vid}
    no_disco = {p.name.lower() for p in pasta_videos.glob("*.md")} if pasta_videos.exists() else set()
    if nome.lower() in de_outros or nome.lower() in no_disco:
        nome = f"{base[:85].rstrip(' .')} [{vid}].md"
    return nome


def paragrafos(texto, palavras=120):
    p = texto.split()
    return "\n\n".join(" ".join(p[i:i + palavras]) for i in range(0, len(p), palavras))


def montar_nota(canal, vid, info, transcricao):
    url = f"https://www.youtube.com/watch?v={vid}"
    titulo = info.get("titulo", vid)
    descricao = (info.get("descricao") or "").strip() or "_(sem descrição)_"
    return (
        "---\n"
        f"titulo: {json.dumps(titulo, ensure_ascii=False)}\n"
        f"data: {info.get('data') or 'desconhecida'}\n"
        f"url: {url}\n"
        f"canal: {json.dumps(canal['nome'], ensure_ascii=False)}\n"
        f"tipo: {info.get('tipo', 'vídeo')}\n"
        f"id: {vid}\n"
        "---\n\n"
        f"# {titulo}\n\n"
        f"**Canal:** {canal['nome']} · **Data:** {info.get('data') or 'desconhecida'} · "
        f"**Tipo:** {info.get('tipo', 'vídeo')} · [Assistir no YouTube]({url})\n\n"
        "## Descrição\n\n"
        f"{descricao}\n\n"
        "## Transcrição\n\n"
        f"{paragrafos(transcricao)}\n"
    )


def gerar_indice(canal, estado):
    linhas = []
    for vid, p in estado["processados"].items():
        info = estado["todos_ids"].get(vid, {})
        titulo = p.get("titulo") or info.get("titulo") or vid
        linhas.append((p.get("data") or "", p.get("tipo") or info.get("tipo", ""), titulo, p["arquivo"], vid))
    linhas.sort(key=lambda x: (x[0], x[2]), reverse=True)
    n = contar(estado)
    corpo = [
        f"# {canal['nome']}\n",
        f"{len(linhas)} vídeos transcritos. Listados: {n['listados']} · pendentes: {n['pendente']} · "
        f"aguardando nova tentativa: {n['aguardando']} · sem legenda (parqueados): {n['parqueado']} · "
        f"fora do corte de data: {n['fora_do_corte']}.\n",
        f"Atualizado em {dt.datetime.now():%Y-%m-%d %H:%M}.\n",
        "| Data | Tipo | Título | YouTube |",
        "|---|---|---|---|",
    ]
    for data, tipo, titulo, arquivo, vid in linhas:
        t = titulo.replace("|", "\\|").replace("[", "\\[").replace("]", "\\]")
        corpo.append(f"| {data or '?'} | {tipo} | [{t}](<videos/{arquivo}>) | "
                     f"[abrir](https://www.youtube.com/watch?v={vid}) |")
    gravar_atomico(canal["pasta"] / "_INDEX.md", "\n".join(corpo) + "\n")


def contar(estado):
    momento = agora()
    n = {"listados": len(estado["todos_ids"]), "processado": 0, "parqueado": 0,
         "fora_do_corte": 0, "aguardando": 0, "pendente": 0}
    for vid in estado["todos_ids"]:
        n[classificar(vid, estado, momento)] += 1
    return n


# --------------------------------------------------------------------------
# Um vídeo
# --------------------------------------------------------------------------
def agendar(estado, vid, horas):
    estado["agendado_ate"][vid] = iso(agora() + dt.timedelta(hours=horas))


def processar_video(canal, estado, cfg, vid):
    info = estado["todos_ids"][vid]
    log(f"→ {vid} · {info.get('tipo')} · {info.get('titulo', '')[:80]}")
    live_status = None
    abriu_video = False

    if info.get("fonte_meta") == "api" and info.get("data"):
        if info.get("live_api") == "upcoming":
            live_status = "is_upcoming"
        elif info.get("live_api") == "live":
            live_status = "is_live"
    else:
        meta = metadados_ytdlp(vid, cfg)
        abriu_video = True
        if meta:
            live_status = meta.get("live_status")
            data = data_de_upload(meta.get("upload_date"))
            if data:
                info["data"] = data
            if meta.get("description") is not None:
                info["descricao"] = meta["description"]

    if live_status in ("is_upcoming", "is_live"):
        agendar(estado, vid, HORAS_LIVE_FUTURA)
        log(f"   live que ainda não aconteceu ({live_status}): volta em {HORAS_LIVE_FUTURA}h, sem contar tentativa")
        return "aguardando"

    desde = canal.get("desde")
    if desde and info.get("data") and info["data"] < desde:
        if vid not in estado["fora_do_corte"]:
            estado["fora_do_corte"].append(vid)
        log(f"   publicado em {info['data']}, antes de {desde}: fora do corte")
        return "fora_do_corte"
    if desde and not info.get("data"):
        log("   AVISO: vídeo sem data; transcrevo mesmo assim para não perder vídeo novo")

    if abriu_video:
        time.sleep(random.uniform(3, 8))  # uma pessoa não abre a legenda no mesmo milissegundo

    texto, erro = obter_transcricao(vid, cfg, idiomas_legenda(canal["idioma"]))
    if texto:
        pasta = canal["pasta"] / "videos"
        pasta.mkdir(parents=True, exist_ok=True)
        nome = nome_arquivo(vid, info, estado, pasta)
        gravar_atomico(pasta / nome, montar_nota(canal, vid, info, texto))
        estado["processados"][vid] = {"titulo": info.get("titulo"), "data": info.get("data"),
                                      "tipo": info.get("tipo"), "arquivo": nome}
        estado["sem_transcricao"].pop(vid, None)
        estado["agendado_ate"].pop(vid, None)
        log(f"   ✓ salvo: videos/{nome} ({len(texto.split())} palavras)")
        return "processado"

    # Falhou. Antes de contar tentativa, confere se não é uma live que ainda não foi ao ar.
    if tem_sinal(erro, SINAIS_LIVE_FUTURA):
        live_status = "is_upcoming"
    elif live_status is None:
        live_status = consultar_live_status(vid, cfg)
    if live_status in ("is_upcoming", "is_live"):
        agendar(estado, vid, HORAS_LIVE_FUTURA)
        log(f"   live que ainda não aconteceu ({live_status}): volta em {HORAS_LIVE_FUTURA}h, sem contar tentativa")
        return "aguardando"

    n = estado["sem_transcricao"].get(vid, 0) + 1
    estado["sem_transcricao"][vid] = n
    if n >= MAX_TENTATIVAS:
        estado["agendado_ate"].pop(vid, None)
        log(f"   sem legenda pela {n}ª vez: parqueado, sai da fila para sempre ({erro})")
        return "parqueado"
    horas = HORAS_LIVE_ENCERRADA if (live_status in ("was_live", "post_live") or info.get("tipo") == "live") \
        else HORAS_VIDEO_SEM_LEGENDA
    agendar(estado, vid, horas)
    log(f"   sem legenda (tentativa {n} de {MAX_TENTATIVAS}): nova tentativa daqui a {horas}h ({erro})")
    return "sem_legenda"


# --------------------------------------------------------------------------
# Travas e bloqueio
# --------------------------------------------------------------------------
class Trava:
    """Trava de arquivo de verdade: duas execuções ao mesmo tempo desfazem todo o ritmo."""

    def __init__(self, caminho):
        self.caminho = Path(caminho)
        self.f = None

    def __enter__(self):
        self.f = open(self.caminho, "a+")
        try:
            import fcntl
            try:
                fcntl.flock(self.f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                self.f.close()
                raise Ocupado(str(self.caminho))
        except ImportError:  # Windows
            import msvcrt
            try:
                msvcrt.locking(self.f.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                self.f.close()
                raise Ocupado(str(self.caminho))
        return self

    def __exit__(self, *exc):
        if self.f and not self.f.closed:
            self.f.close()  # fechar o arquivo solta a trava


def checar_bloqueio():
    """Devolve None se pode rodar normal, 'teste' se já passou o prazo (lote de 1),
    ou levanta Bloqueado se ainda está dentro das 24 horas."""
    if not ARQ_BLOQUEIO.exists():
        return None
    try:
        dados = json.loads(ARQ_BLOQUEIO.read_text(encoding="utf-8"))
        quando = de_iso(dados["quando"])
    except Exception:
        quando = dt.datetime.fromtimestamp(ARQ_BLOQUEIO.stat().st_mtime, dt.timezone.utc)
        dados = {}
    libera = quando + dt.timedelta(hours=HORAS_APOS_BLOQUEIO)
    if agora() < libera:
        raise Bloqueado(f"bloqueio registrado em {quando.astimezone():%d/%m %H:%M} "
                        f"({dados.get('motivo', '')}). Só retome depois de {libera.astimezone():%d/%m %H:%M}.")
    return "teste"


def registrar_bloqueio(motivo, canal_nome):
    # Sempre regrava: um bloqueio novo (inclusive no lote de teste) reinicia o prazo.
    gravar_atomico(ARQ_BLOQUEIO, json.dumps({"quando": iso(agora()), "motivo": motivo,
                                            "canal": canal_nome}, ensure_ascii=False, indent=1))
    log("=" * 70)
    log("BLOQUEIO DO YOUTUBE. A fila parou inteira, de propósito.")
    log(f"Motivo: {motivo}")
    log(f"Não tente de novo antes de {HORAS_APOS_BLOQUEIO} horas. Depois disso o próximo")
    log("lote roda com 1 vídeo só, como teste. Insistir agora é o que prolonga o bloqueio.")
    log("Não use VPN, proxy nem outro método para contornar.")
    log("=" * 70)


# --------------------------------------------------------------------------
# Comandos
# --------------------------------------------------------------------------
def estimativa(qtd):
    horas = qtd / 65
    if horas < 1:
        return f"cerca de {max(1, round(horas * 60))} minutos"
    return f"cerca de {horas:.1f} horas (umas {qtd} transcrições a ~60-70 por hora)"


def cmd_novo(args):
    nome = limpar_nome(args.nome)
    pasta = RAIZ / nome
    pasta.mkdir(exist_ok=True)
    arq = pasta / "canal.json"
    if arq.exists():
        raise SystemExit(f"{arq} já existe; edite o arquivo se quiser mudar algo.")
    if args.desde:
        dt.date.fromisoformat(args.desde)
    canal = {"handle": args.handle, "nome": args.nome, "idioma": args.idioma}
    if args.desde:
        canal["desde"] = args.desde
    arq.write_text(json.dumps(canal, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    existentes = ARQ_CANAIS.read_text(encoding="utf-8").splitlines() if ARQ_CANAIS.exists() else []
    if nome not in [l.strip() for l in existentes]:
        with open(ARQ_CANAIS, "a", encoding="utf-8") as f:
            f.write(nome + "\n")
    print(f"Canal criado na pasta '{nome}'.")
    return SAIDA_OK


def cmd_listar(args):
    canal = carregar_canal(args.pasta)
    cfg = carregar_config()
    with Trava(RAIZ / ".cerebro-global.lock"), Trava(canal["pasta"] / ".cerebro.lock"):
        try:
            checar_bloqueio()
        except Bloqueado as e:
            log(f"Ainda dentro do prazo do bloqueio: {e}")
            return SAIDA_BLOQUEIO
        estado = carregar_estado(canal)
        limpar_orfaos(canal, estado)
        atualizar_listagem(canal, estado, cfg)
        salvar_estado(canal, estado)
    n = contar(estado)
    tipos = {}
    for info in estado["todos_ids"].values():
        tipos[info.get("tipo")] = tipos.get(info.get("tipo"), 0) + 1
    print()
    print(f"Canal: {canal['nome']}")
    print("Por aba: " + ", ".join(f"{t}: {q}" for t, q in tipos.items()))
    print(f"Total listado: {n['listados']}")
    if canal.get("desde"):
        sem_data = sum(1 for i in estado["todos_ids"].values() if not i.get("data"))
        print(f"Corte 'desde {canal['desde']}': {n['fora_do_corte']} ficam fora, "
              f"{n['listados'] - n['fora_do_corte']} ficam dentro ({sem_data} sem data, que entram)")
    print(f"Já transcritos: {n['processado']} · a transcrever: {n['pendente']}")
    print(f"Tempo previsto: {estimativa(n['pendente'])}")
    print("Nada foi transcrito ainda.")
    return SAIDA_OK


def cmd_lote(args):
    canal = carregar_canal(args.pasta)
    cfg = carregar_config()
    with Trava(RAIZ / ".cerebro-global.lock"), Trava(canal["pasta"] / ".cerebro.lock"):
        try:
            modo = checar_bloqueio()
        except Bloqueado as e:
            log(f"Ainda dentro do prazo do bloqueio: {e}")
            return SAIDA_BLOQUEIO
        tamanho = args.tamanho
        if modo == "teste":
            log("Passaram 24h do bloqueio: rodando um lote de teste de 1 vídeo.")
            tamanho = 1

        estado = carregar_estado(canal)
        try:
            limpar_orfaos(canal, estado)
            if args.listar or not estado["todos_ids"]:
                atualizar_listagem(canal, estado, cfg)
                salvar_estado(canal, estado)

            fila = pendentes(estado)
            if not fila:
                gerar_indice(canal, estado)
                salvar_estado(canal, estado)
                n = contar(estado)
                log(f"{canal['nome']}: nada pendente. {n['processado']} transcritos, "
                    f"{n['aguardando']} aguardando nova tentativa, {n['parqueado']} sem legenda.")
                if modo == "teste":
                    ARQ_BLOQUEIO.unlink(missing_ok=True)
                return SAIDA_CONCLUIDO

            lote = fila[:tamanho]
            log(f"{canal['nome']}: lote de {len(lote)} vídeos ({len(fila)} pendentes)")
            renovar_cookies(cfg)
            resultados = {}
            for i, vid in enumerate(lote):
                if i > 0 and i % VIDEOS_POR_SESSAO == 0:
                    renovar_cookies(cfg)
                    pausa(PAUSA_RENOVACAO, f"{VIDEOS_POR_SESSAO} vídeos, sessão renovada")
                try:
                    r = processar_video(canal, estado, cfg, vid)
                finally:
                    salvar_estado(canal, estado)  # depois de CADA vídeo
                resultados[r] = resultados.get(r, 0) + 1
                pausa(PAUSA_ENTRE_VIDEOS, "entre vídeos")
            if modo == "teste":
                ARQ_BLOQUEIO.unlink(missing_ok=True)
                log("Lote de teste passou sem bloqueio. A fila pode voltar ao ritmo normal.")
        except Bloqueado as e:
            salvar_estado(canal, estado)
            registrar_bloqueio(str(e), canal["nome"])
            return SAIDA_BLOQUEIO
        finally:
            try:
                gerar_indice(canal, estado)
            except Exception as e:
                log(f"AVISO: não consegui atualizar o _INDEX.md ({e})")

        restam = len(pendentes(estado))
        log(f"Lote concluído: {resultados}. Restam {restam} pendentes"
            + (f" ({estimativa(restam)})." if restam else "."))
        return SAIDA_OK if restam else SAIDA_CONCLUIDO


def cmd_conferir(args):
    """Conferência de fim de carga. Não acessa o YouTube."""
    canal = carregar_canal(args.pasta)
    estado = carregar_estado(canal)
    pasta = canal["pasta"] / "videos"
    arquivos = list(pasta.glob("*.md")) if pasta.exists() else []
    n = contar(estado)
    fora_da_listagem = [v for v in estado["processados"] if v not in estado["todos_ids"]]
    soma = n["processado"] + n["parqueado"] + n["fora_do_corte"] + n["aguardando"] + n["pendente"]

    print(f"Canal: {canal['nome']}  (última listagem: {estado.get('ultima_listagem') or 'nunca'})")
    print(f"  listados ............................. {n['listados']}")
    print(f"  transcritos .......................... {n['processado']}")
    print(f"  parqueados sem legenda ............... {n['parqueado']}")
    print(f"  fora do corte de data ................ {n['fora_do_corte']}")
    print(f"  aguardando nova tentativa ............ {n['aguardando']}")
    print(f"  pendentes ............................ {n['pendente']}")
    print(f"  soma ................................. {soma} {'✓ fecha com o total' if soma == n['listados'] else '✗ NÃO FECHA'}")
    if fora_da_listagem:
        print(f"  (+{len(fora_da_listagem)} transcritos que sumiram da listagem atual: privados ou apagados depois)")
    ok = len(arquivos) == len(estado["processados"])
    print(f"\n  entradas em processados: {len(estado['processados'])} · arquivos .md em videos/: {len(arquivos)} "
          f"{'✓' if ok else '✗ DIFERENTES'}")
    if not ok:
        registrados = {p["arquivo"].lower() for p in estado["processados"].values()}
        sobrando = [a.name for a in arquivos if a.name.lower() not in registrados]
        faltando = [p["arquivo"] for p in estado["processados"].values() if not (pasta / p["arquivo"]).exists()]
        if sobrando:
            print(f"    arquivos sem registro no estado: {sobrando[:10]}")
        if faltando:
            print(f"    registros sem arquivo (voltam para a fila na próxima rodada): {faltando[:10]}")

    amostra = random.sample(arquivos, min(3, len(arquivos)))
    if amostra:
        print("\nAmostra para conferir se a transcrição é do vídeo do título:")
    for a in amostra:
        texto = a.read_text(encoding="utf-8")
        trecho = texto.split("## Transcrição", 1)[-1].strip()[:300].replace("\n", " ")
        print(f"\n  ▸ {a.name}\n    {trecho}…")
    return SAIDA_OK if ok and soma == n["listados"] else SAIDA_ERRO


def main():
    for fluxo in (sys.stdout, sys.stderr):
        try:
            fluxo.reconfigure(errors="replace")  # console do Windows sem algum símbolo não derruba nada
        except Exception:
            pass
    p = argparse.ArgumentParser(description="Cérebro de YouTube")
    sub = p.add_subparsers(dest="comando", required=True)

    s = sub.add_parser("novo", help="cria a pasta de um canal")
    s.add_argument("handle", help="@fulano, o id UC... ou a URL do canal")
    s.add_argument("nome", help="nome do canal (vira o nome da pasta)")
    s.add_argument("--idioma", default="pt", help="pt, en, es... (nunca pt-BR)")
    s.add_argument("--desde", help="AAAA-MM-DD: só vídeos publicados a partir desta data")
    s.set_defaults(f=cmd_novo)

    s = sub.add_parser("listar", help="lista o canal e mostra os totais, sem transcrever")
    s.add_argument("pasta")
    s.set_defaults(f=cmd_listar)

    s = sub.add_parser("lote", help="transcreve um lote de vídeos e termina")
    s.add_argument("pasta")
    s.add_argument("--tamanho", type=int, default=TAMANHO_LOTE)
    s.add_argument("--listar", action="store_true", help="refaz a listagem antes (descobre vídeo novo)")
    s.set_defaults(f=cmd_lote)

    s = sub.add_parser("conferir", help="confere os números do canal (não acessa o YouTube)")
    s.add_argument("pasta")
    s.set_defaults(f=cmd_conferir)

    args = p.parse_args()
    if getattr(args, "tamanho", 1) < 1:
        p.error("--tamanho precisa ser 1 ou mais")
    try:
        return args.f(args)
    except Ocupado as e:
        log(f"Outra execução já está rodando ({e}). Saindo sem fazer nada.")
        return SAIDA_OCUPADO
    except Bloqueado as e:
        registrar_bloqueio(str(e), getattr(args, "pasta", ""))
        return SAIDA_BLOQUEIO
    except KeyboardInterrupt:
        log("Interrompido. O estado foi gravado depois do último vídeo; rode de novo para continuar.")
        return SAIDA_INTERROMPIDO
    except ErroRede as e:
        log(f"Erro de rede: {e}")
        return SAIDA_ERRO
    except Exception as e:
        log(f"Erro: {type(e).__name__}: {e}")
        return SAIDA_ERRO


if __name__ == "__main__":
    sys.exit(main())
