#!/usr/bin/env python3
"""Gera o site estático da Caçapava Locações e Vendas a partir de catalogo.json.

Uso:
    python3 _fonte/gerar.py            # gera as páginas para publicar (links limpos: /concretagem/)
    python3 _fonte/gerar.py --preview  # links com index.html explícito (para abrir sem servidor)

Para editar produtos, preços, textos ou fotos: altere catalogo.json (ou as
constantes abaixo) e rode o script de novo.
"""
import json
import os
import re
import sys
from html import escape
from urllib.parse import quote

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.dirname(AQUI)
PREVIEW = "--preview" in sys.argv

DADOS = json.load(open(os.path.join(AQUI, "catalogo.json"), encoding="utf-8"))
CATS = {c["slug"]: c for c in DADOS["cats"]}
HOME = DADOS["home"]

# ---------------------------------------------------------------- empresa
EMPRESA = "Caçapava Locações e Vendas"
DOMINIO = "https://cacapavalocacoesevendas.com.br"
WHATS = "5512997991337"
WHATS_TXT = "(12) 99799-1337"
FIXO = "(12) 3224-7581"
FIXO_TEL = "+551232247581"
EMAIL = "contato@cacapavalocacoes.com.br"
INSTA = "https://www.instagram.com/cacapava_locacoes/"
INSTA_TXT = "@cacapava_locacoes"
ENDERECO = "Rua São Francisco, nº 1020 – Vila Antônio Augusto – Caçapava/SP"
MAPA = ("https://maps.google.com/maps?q=" + quote("Rua São Francisco nº 1020 - Vila Antônio Augusto - Caçapava - SP")
        + "&t=m&z=15&output=embed&iwloc=near")
MAPA_LINK = "https://www.google.com/maps/search/?api=1&query=" + quote("Rua São Francisco 1020 Vila Antônio Augusto Caçapava SP")
VERSAO = "4"  # aumente sempre que mudar style.css ou main.js (força o navegador a baixar de novo)
MSG_PADRAO = "Olá, vim do site gostaria de mais informações."

LOCACAO = ["concretagem", "compactacao", "furacao-e-demolicao", "acesso-a-elevacao", "andaimes",
           "ferramentas-eletricas", "motores", "jardinagem", "limpeza", "outros"]
CURTO = {"furacao-e-demolicao": "Demolição", "acesso-a-elevacao": "Elevação", "ferramentas-eletricas": "Ferramentas"}

DEPOIMENTOS = [
    ("Guto Medeiros", "Preço excelente! Oficina especializada em várias marcas e modelos de Roçadeiras."),
    ("Danilo Figueira", "Os caras são especialistas no que fazem, Recomendo"),
    ("Flávio Augusto", "Ótimo atendimento e qualidade dos materiais"),
    ("Tiago Borsoi", "Atendimento nota 10! Preço justo, maquinários novos, excelência e qualidade! Recomendo!"),
    ("Antônio Moretti", "Mandei consertar minha motosserra e fiquei muito satisfeito!"),
    ("Marcio Augusto", "Comprei uma Roçadeira na Caçapava Locações e Vendas e fiquei muito contente com o atendimento e "
                       "qualidade dos equipamentos ofertados! Fiz uma excelente escolha!"),
]


def wa(msg=MSG_PADRAO):
    return f"https://wa.me/{WHATS}?text={quote(msg)}"


def e(s):
    return escape(s or "", quote=True)


def link(root, alvo):
    """alvo '' = home; senão slug de pasta."""
    p = root if alvo == "" else f"{root}{alvo}/"
    if PREVIEW:
        p += "index.html"
    return p or "./"


# ---------------------------------------------------------------- ícones (svg inline)
I = {
    "whats": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.47A11.3 11.3 0 0 0 12.05.7C5.79.7.7 5.79.7 12.04c0 2 .52 3.95 1.52 5.67L.6 23.3l5.72-1.5a11.3 11.3 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.35-11.34 0-3.03-1.18-5.88-3.32-8.02"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6"/></svg>',
    "insta": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/></g></svg>',
    "pin": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></g></svg>',
    "arrow": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "doc": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></g></svg>',
    "star": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    "play": '<svg viewBox="0 0 68 48" aria-hidden="true"><path fill="#FFB800" d="M66.5 7.7A8.5 8.5 0 0 0 60.5 1.7C55.2.3 34 .3 34 .3S12.8.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3z"/><path fill="#0B0F14" d="M45 24 27 14v20z"/></svg>',
    "search": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g></svg>',
    "tool": '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/></svg>',
    "key": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></g></svg>',
    "cart": '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></g></svg>',
}


# ---------------------------------------------------------------- layout
def head(root, titulo, descricao, caminho, extra_ld=""):
    canon = DOMINIO + "/" + (caminho + "/" if caminho else "")
    tit = f"{titulo} | {EMPRESA}" if titulo else f"{EMPRESA} – Equipamentos para locação, venda e manutenção"
    ld = {
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        "name": EMPRESA,
        "url": DOMINIO,
        "image": DOMINIO + "/assets/img/" + os.path.basename(HOME["hero"][0]),
        "logo": DOMINIO + "/" + HOME["logo"],
        "telephone": "+55 12 99799-1337",
        "email": EMAIL,
        "address": {"@type": "PostalAddress", "streetAddress": "Rua São Francisco, 1020 – Vila Antônio Augusto",
                    "addressLocality": "Caçapava", "addressRegion": "SP", "addressCountry": "BR"},
        "areaServed": ["Caçapava", "Vale do Paraíba", "Litoral Norte"],
        "sameAs": [INSTA],
        "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5", "reviewCount": str(len(DEPOIMENTOS))},
    }
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(tit)}</title>
<meta name="description" content="{e(descricao)}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#0B0F14">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{e(tit)}">
<meta property="og:description" content="{e(descricao)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{DOMINIO}/{HOME['hero'][0]}">
<link rel="icon" href="{root}assets/img/favicon.png">
<link rel="apple-touch-icon" href="{root}assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}assets/css/style.css?v={VERSAO}">
<script>document.documentElement.classList.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('anim');setTimeout(function(){{if(!window.gsap)document.documentElement.classList.remove('anim')}},3500)</script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{extra_ld}
</head>
<body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
"""


def header(root, ativo):
    def item(alvo, nome):
        cur = ' aria-current="page"' if ativo == alvo else ""
        return f'<a href="{link(root, alvo)}"{cur}>{nome}</a>'

    subs = "".join(
        f'<a href="{link(root, CATS[s]["url"])}"><img src="{root}{HOME["icons"][s]}" alt="" width="28" height="28">{e(CATS[s]["name"])}</a>'
        for s in LOCACAO)
    return f"""<div class="preloader" aria-hidden="true"><img src="{root}{HOME['logo']}" alt=""><span class="preloader-bar"><i></i></span></div>
<header class="site-header" data-header>
  <div class="topbar">
    <div class="wrap topbar-in">
      <span class="topbar-txt">{I['pin']}Atendemos todo o Vale do Paraíba e Litoral Norte</span>
      <span class="topbar-links">
        <a href="tel:{FIXO_TEL}">{I['phone']}{FIXO}</a>
        <a href="{wa()}" target="_blank" rel="noopener">{I['whats']}{WHATS_TXT}</a>
      </span>
    </div>
  </div>
  <div class="wrap nav-in">
    <a class="brand" href="{link(root, '')}" aria-label="{EMPRESA} – início">
      <img src="{root}{HOME['logo']}" alt="{EMPRESA}" width="291" height="90">
    </a>
    <nav class="nav" aria-label="Principal">
      {item('', 'Início')}
      <div class="nav-drop">
        {item('locacao', 'Locação')}
        <div class="drop-panel"><div class="drop-grid">{subs}</div></div>
      </div>
      {item('vendas', 'Vendas')}
      {item('manutencao', 'Manutenção')}
      {item('contato', 'Contato')}
    </nav>
    <a class="btn btn-primary nav-cta" href="{wa()}" target="_blank" rel="noopener" data-magnetic>{I['whats']}<span>Orçamento</span></a>
    <button class="burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile" data-burger><span></span><span></span></button>
  </div>
  <div class="mobile-menu" id="menu-mobile" data-mobile-menu>
    <nav aria-label="Menu móvel">
      {item('', 'Início')}{item('locacao', 'Locação')}{item('vendas', 'Vendas')}{item('manutencao', 'Manutenção')}{item('contato', 'Contato')}
      <div class="mobile-cats">{subs}</div>
      <a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">{I['whats']}Falar no WhatsApp</a>
    </nav>
  </div>
</header>
<main id="conteudo">
"""


def footer(root):
    return f"""</main>
<section class="cta-band">
  <div class="wrap cta-in">
    <h2 data-split>Precisa de um equipamento <em>hoje?</em></h2>
    <p data-reveal>Fale com a nossa equipe e receba um orçamento sem compromisso.</p>
    <div class="cta-actions" data-reveal>
      <a class="btn btn-dark" href="{wa()}" target="_blank" rel="noopener" data-magnetic>{I['whats']}<span>Chamar no WhatsApp</span></a>
      <a class="btn btn-outline-dark" href="tel:{FIXO_TEL}">{I['phone']}<span>{FIXO}</span></a>
    </div>
  </div>
</section>
<footer class="site-footer">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <img src="{root}{HOME['logo']}" alt="{EMPRESA}" width="291" height="90" loading="lazy">
      <p>A melhor e mais completa loja da cidade. Locação, venda e manutenção de máquinas e equipamentos.</p>
      <p class="foot-badges"><span>Revenda autorizada Husqvarna</span><span>Branco Motores</span></p>
    </div>
    <div>
      <h3>Navegação</h3>
      <a href="{link(root, '')}">Início</a>
      <a href="{link(root, 'locacao')}">Locação</a>
      <a href="{link(root, 'vendas')}">Vendas</a>
      <a href="{link(root, 'manutencao')}">Manutenção</a>
      <a href="{link(root, 'contato')}">Contato</a>
    </div>
    <div>
      <h3>Fale conosco</h3>
      <a href="{wa()}" target="_blank" rel="noopener">{I['whats']}{WHATS_TXT}</a>
      <a href="tel:{FIXO_TEL}">{I['phone']}{FIXO}</a>
      <a href="mailto:{EMAIL}">{I['mail']}{EMAIL}</a>
      <a href="{INSTA}" target="_blank" rel="noopener">{I['insta']}{INSTA_TXT}</a>
    </div>
    <div>
      <h3>Localização</h3>
      <a href="{MAPA_LINK}" target="_blank" rel="noopener">{I['pin']}{ENDERECO}</a>
    </div>
  </div>
  <div class="wrap foot-bottom">
    <span>© <span data-year>2026</span> {EMPRESA} · Todos os direitos reservados</span>
    <a href="{link(root, 'politica-de-privacidade')}">Política de Privacidade</a>
  </div>
</footer>
<a class="wa-float" href="{wa()}" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">{I['whats']}</a>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="{root}assets/js/main.js?v={VERSAO}" defer></script>
</body>
</html>
"""


def marquee(palavras, classe=""):
    linha = "".join(f"<span>{e(p)}</span><i aria-hidden=\"true\">✦</i>" for p in palavras)
    return f'<div class="marquee {classe}" aria-hidden="true"><div class="marquee-track">{linha}{linha}{linha}</div></div>'


def page_hero(root, kicker, titulo, texto, img=None, migalhas=None):
    bg = f'<div class="ph-bg" data-parallax="18"><img src="{root}{img}" alt="" fetchpriority="high"></div>' if img else ""
    mig = ""
    if migalhas:
        partes = [f'<a href="{link(root, "")}">Início</a>'] + [
            (f'<a href="{link(root, a)}">{e(n)}</a>' if a is not None else f"<span>{e(n)}</span>") for n, a in migalhas]
        mig = f'<nav class="crumbs" aria-label="Você está em">{" / ".join(partes)}</nav>'
    return f"""<section class="page-hero">
  {bg}
  <div class="wrap ph-in">
    {mig}
    <p class="kicker" data-reveal>{e(kicker)}</p>
    <h1 data-split>{titulo}</h1>
    {f'<p class="ph-txt" data-reveal>{texto}</p>' if texto else ''}
  </div>
</section>
"""


def cat_chips(root, atual):
    chips = "".join(
        f'<a class="chip{" is-active" if s == atual else ""}" href="{link(root, CATS[s]["url"])}"'
        f'{" aria-current=page" if s == atual else ""}><img src="{root}{HOME["icons"][s]}" alt="" width="22" height="22">'
        f'{e(CURTO.get(s, CATS[s]["name"]))}</a>'
        for s in LOCACAO)
    return f'<div class="chips-scroll" data-reveal><div class="chips">{chips}</div></div>'


TAGS_VENDAS = [("motosserra", "Motosserras", ["motosserra", "sabre", "corrente", "óleo de corrente"]),
               ("rocadeira", "Roçadeiras", ["roçadeira", "fio de corte", "trimmy", "lâmina"]),
               ("soprador", "Sopradores", ["soprador"]),
               ("grama", "Cortadores e aparadores", ["cortador de grama", "aparador"]),
               ("pulverizador", "Pulverizadores", ["pulverizador"]),
               ("motor", "Motores, geradores e bombas", ["motor a", "gerador", "motobomba", "motocultivador", "perfurador", "lavadora"]),
               ("acessorio", "Acessórios e óleos", ["óleo", "misturador", "fio de corte", "trimmy", "corrente x", "sabres", "lâmina"])]


def tags_de(titulo):
    t = titulo.lower()
    return [k for k, _, chaves in TAGS_VENDAS if any(c in t for c in chaves)]


def card(root, it, cat, idx):
    titulo = it["title"]
    cta = it.get("cta") or "Consultar"
    verbo = {"Alugar": "alugar", "Comprar": "comprar"}.get(cta, "saber mais sobre")
    msg = f"Olá, vim do site e gostaria de {verbo}: {titulo}."
    if cta == "Alugar":
        ico = I["key"]
    elif cta == "Comprar":
        ico = I["cart"]
    else:
        ico = I["whats"]
    tags = " ".join(tags_de(titulo)) if cat["slug"] == "vendas" else ""
    pdf = (f'<a class="card-link" href="{root}{it["pdf"]}" target="_blank" rel="noopener">{I["doc"]}Ficha técnica</a>'
           if it.get("pdf") else "")
    desc = f'<p>{e(it["desc"])}</p>' if it.get("desc") else ""
    img = (f'<img src="{root}{it["img"]}" alt="{e(titulo)}" loading="lazy" decoding="async">' if it.get("img") else "")
    return f"""<article class="card" data-tilt data-card data-tags="{tags}" data-name="{e(titulo.lower())}">
  <div class="card-media">{img}<span class="card-badge">{e(cta if cta in ('Alugar', 'Comprar') else 'Consulte')}</span></div>
  <div class="card-body">
    <h3>{e(titulo)}</h3>
    {desc}
    <div class="card-actions">
      <a class="btn btn-primary btn-sm" href="{wa(msg)}" target="_blank" rel="noopener">{ico}<span>{e(cta if cta != 'Contato' else 'Consultar')}</span></a>
      {pdf}
    </div>
  </div>
</article>"""


def yt_id(url):
    m = re.search(r"(?:youtu\.be/|v=|shorts/)([\w-]{11})", url)
    return m.group(1) if m else None


def videos(lista, titulo="Veja em ação"):
    ids = [yt_id(u) for u in lista if yt_id(u)]
    if not ids:
        return ""
    blocos = "".join(
        f'<button class="yt" data-yt="{v}" aria-label="Reproduzir vídeo"><img src="https://i.ytimg.com/vi/{v}/hqdefault.jpg" alt="" loading="lazy">{I["play"]}</button>'
        for v in ids)
    return f"""<section class="section section-videos">
  <div class="wrap">
    <div class="sec-head"><p class="kicker" data-reveal>Vídeos</p><h2 data-split>{titulo}</h2></div>
    <div class="video-grid{' one' if len(ids) == 1 else ''}" data-stagger>{blocos}</div>
  </div>
</section>"""


def grid_section(root, cat, titulo_sec=None, filtro=False):
    cards = "\n".join(card(root, it, cat, i) for i, it in enumerate(cat["items"]))
    filtros = ""
    if filtro:
        chips = '<button class="chip is-active" data-filter="*">Todos</button>' + "".join(
            f'<button class="chip" data-filter="{k}">{e(n)}</button>' for k, n, _ in TAGS_VENDAS
            if any(k in tags_de(it["title"]) for it in cat["items"]))
        filtros = f"""<div class="filters" data-reveal>
      <label class="search">{I['search']}<input type="search" placeholder="Buscar produto…" data-search aria-label="Buscar produto"></label>
      <div class="chips-scroll"><div class="chips">{chips}</div></div>
    </div>"""
    head_ = f'<div class="sec-head"><p class="kicker" data-reveal>{len(cat["items"])} itens</p><h2 data-split>{titulo_sec}</h2></div>' if titulo_sec else ""
    return f"""<section class="section">
  <div class="wrap">
    {head_}
    {filtros}
    <div class="grid" data-grid>{cards}</div>
    <p class="empty" data-empty hidden>Nenhum produto encontrado. <a href="{wa()}" target="_blank" rel="noopener">Pergunte no WhatsApp</a> — temos muito mais na loja!</p>
  </div>
</section>"""


def escrever(caminho, html):
    destino = os.path.join(SAIDA, caminho, "index.html") if caminho else os.path.join(SAIDA, "index.html")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        f.write(html)
    print("ok ", os.path.relpath(destino, SAIDA))


# ---------------------------------------------------------------- páginas
def pagina_home():
    root = ""
    slides = "".join(
        f'<div class="hero-slide{" is-active" if i == 0 else ""}"><img src="{src}" alt="Fachada e interior da loja Caçapava Locações e Vendas" {"fetchpriority=high" if i == 0 else "loading=lazy"}></div>'
        for i, src in enumerate(HOME["hero"]))
    cats = "".join(
        f'<a class="cat" href="{link(root, CATS[s]["url"])}" data-tilt><span class="cat-ico"><img src="{HOME["icons"][s]}" alt="" width="72" height="72" loading="lazy"></span>'
        f'<span class="cat-name">{e(CURTO.get(s, CATS[s]["name"]))}</span><span class="cat-count">{len(CATS[s]["items"])} itens</span>{I["arrow"]}</a>'
        for s in LOCACAO)
    pop = "".join(
        f"""<article class="pop" data-tilt>
  <div class="pop-media"><img src="{src}" alt="{e(nome)}" loading="lazy"></div>
  <div class="pop-body"><span class="pop-tag">{e(tipo)}</span><h3>{e(nome)}</h3>
  <a class="btn btn-primary btn-sm" href="{wa(f'Olá, vim do site e gostaria de informações sobre: {nome}.')}" target="_blank" rel="noopener">{I['whats']}<span>{'Alugar' if tipo == 'Locação' else 'Comprar'}</span></a></div>
</article>""" for tipo, nome, src in HOME["popular"])
    nomes_marcas = HOME.get("brand_names") or ["Marca parceira"] * len(HOME["brands"])
    marcas = "".join(f'<span class="brand-logo"><img src="{b}" alt="{e(n)}" width="600" height="240" loading="lazy"></span>'
                     for b, n in zip(HOME["brands"], nomes_marcas))
    fotos = HOME["hero"]
    slides_sobre = "".join(
        f'<figure class="gal-slide{" is-active" if i == 0 else ""}" aria-hidden="{"false" if i == 0 else "true"}">'
        f'<img src="{src}" alt="Foto {i + 1} da loja Caçapava Locações e Vendas" loading="lazy" decoding="async"></figure>'
        for i, src in enumerate(fotos))
    thumbs_sobre = "".join(
        f'<button class="gal-thumb{" is-active" if i == 0 else ""}" aria-label="Ver foto {i + 1}"><img src="{src}" alt="" loading="lazy"></button>'
        for i, src in enumerate(fotos))
    deps = "".join(
        f"""<figure class="review" data-tilt><div class="stars" aria-label="5 de 5 estrelas">{I['star'] * 5}</div>
<blockquote>“{e(t)}”</blockquote><figcaption><span class="avatar">{e(n[0])}</span>{e(n)}</figcaption></figure>""" for n, t in DEPOIMENTOS)

    html = head(root, "", "Locação, venda e manutenção de máquinas e equipamentos em Caçapava/SP. Revenda e assistência "
                          "técnica autorizada Husqvarna e Branco Motores. Atendemos todo o Vale do Paraíba e Litoral Norte.", "")
    html += header(root, "")
    html += f"""
<section class="hero" data-hero>
  <div class="hero-media" data-parallax="12">{slides}</div>
  <div class="hero-shade"></div>
  <div class="wrap hero-in">
    <p class="kicker hero-kicker" data-reveal><span class="dot"></span>Revenda autorizada Husqvarna &amp; Branco Motores</p>
    <h1 class="hero-title" data-split>A melhor e mais <em>completa</em> loja da cidade</h1>
    <p class="hero-sub" data-reveal>Locação, venda e manutenção de máquinas e equipamentos para a sua obra, jardim ou oficina — em Caçapava, Vale do Paraíba e Litoral Norte.</p>
    <div class="hero-ctas" data-stagger>
      <a class="hero-cta" href="{link(root, 'vendas')}" data-magnetic><span class="hc-ico">{I['cart']}</span><span><small>Clique aqui</small>Vendas</span>{I['arrow']}</a>
      <a class="hero-cta" href="{link(root, 'locacao')}" data-magnetic><span class="hc-ico">{I['key']}</span><span><small>Clique aqui</small>Locação</span>{I['arrow']}</a>
      <a class="hero-cta" href="{link(root, 'manutencao')}" data-magnetic><span class="hc-ico">{I['tool']}</span><span><small>Clique aqui</small>Manutenção</span>{I['arrow']}</a>
    </div>
  </div>
  <div class="hero-dots" data-hero-dots>{''.join(f'<button aria-label="Foto {i + 1}"{" class=is-active" if i == 0 else ""}></button>' for i in range(len(HOME['hero'])))}</div>
  <div class="scroll-hint" aria-hidden="true"><span></span>Role</div>
</section>

{marquee(['Locação', 'Vendas', 'Manutenção', 'Husqvarna', 'Branco Motores', 'Peças e acessórios', 'Orçamento sem compromisso'])}

<section class="section" id="categorias">
  <div class="wrap">
    <div class="sec-head split-head">
      <div><p class="kicker" data-reveal>Locação de equipamentos</p><h2 data-split>Tudo para sua obra, num só lugar</h2></div>
      <a class="btn btn-ghost" href="{link(root, 'locacao')}" data-reveal>Ver todas as categorias{I['arrow']}</a>
    </div>
    <div class="cats" data-stagger>{cats}</div>
  </div>
</section>

<section class="section about">
  <div class="wrap about-grid">
    <div class="about-media">
      <div class="gallery" data-gallery aria-roledescription="carrossel" aria-label="Fotos da loja">
        <div class="gal-stage">
          {slides_sobre}
          <div class="gal-ui">
            <span class="gal-count"><b data-gal-cur>01</b> / {len(fotos):02d}</span>
            <span class="gal-nav">
              <button class="gal-btn" data-gal-prev aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
              <button class="gal-btn" data-gal-next aria-label="Próxima foto">{I['arrow']}</button>
            </span>
          </div>
          <span class="gal-progress"><i data-gal-bar></i></span>
        </div>
        <div class="gal-thumbs">{thumbs_sobre}</div>
      </div>
      <div class="about-badge" data-reveal><strong data-count="5" data-suffix="+">5+</strong><span>anos no mercado</span></div>
    </div>
    <div class="about-txt">
      <p class="kicker" data-reveal>Quem somos</p>
      <h2 data-split>Estamos no mercado há mais de <em>5 anos</em></h2>
      <p class="lead" data-highlight>Trabalhando em busca de melhor atendimento e qualidade de serviços para a população de Caçapava e região. Somos a loja mais completa da cidade, oferecendo locação, venda e manutenção de máquinas.</p>
      <p data-reveal>Com grande variedade de produtos das melhores marcas do mercado, temos o melhor preço para atendê-lo, seja para alugar seu maquinário, comprar sua máquina de jardinagem ou consertar seu equipamento.</p>
      <p data-reveal>Somos <strong>revenda autorizada Husqvarna e Branco Motores</strong>, e assistência técnica autorizada de ambas as marcas, tendo mecânicos especializados com o intuito de atender a necessidade de nossos clientes. Nossa missão é prestar serviço de qualidade, com atendimento especializado e variedade para nossa cidade e região. Venha nos conhecer!</p>
      <ul class="checks" data-stagger>
        <li>Atendemos todo o Vale do Paraíba e Litoral Norte</li>
        <li>Mecânicos certificados em diversas marcas</li>
        <li>Orçamento sem compromisso</li>
      </ul>
    </div>
  </div>
</section>

<section class="section pop-section" data-hscroll>
  <div class="wrap">
    <div class="sec-head"><p class="kicker" data-reveal>Os favoritos dos clientes</p><h2 data-split>Mais procurados</h2></div>
  </div>
  <div class="pop-viewport"><div class="pop-track" data-hscroll-track>{pop}</div></div>
</section>

<section class="stats">
  <div class="wrap stats-grid" data-stagger>
    <div class="stat"><strong data-count="5" data-suffix="+">5+</strong><span>Anos servindo você</span></div>
    <div class="stat"><strong data-count="3000" data-suffix="+">3000+</strong><span>Clientes</span></div>
    <div class="stat"><strong data-count="500" data-suffix="+">500+</strong><span>Equipamentos</span></div>
  </div>
</section>

<section class="section brands">
  <div class="wrap"><div class="sec-head center"><p class="kicker" data-reveal>Trabalhamos com os melhores</p><h2 data-split>Marcas parceiras</h2></div></div>
  <div class="logo-marquee"><div class="logo-track">{marcas}{marcas}</div></div>
</section>

<section class="section reviews">
  <div class="wrap">
    <div class="sec-head center"><p class="kicker" data-reveal><span class="stars inline">{I['star'] * 5}</span> Nota 5,0</p><h2 data-split>O que falam sobre nós</h2></div>
    <div class="review-grid" data-stagger>{deps}</div>
  </div>
</section>

<section class="section map-section">
  <div class="wrap map-grid">
    <div>
      <p class="kicker" data-reveal>Venha nos visitar</p>
      <h2 data-split>Estamos em Caçapava</h2>
      <ul class="contact-list" data-stagger>
        <li><a href="{MAPA_LINK}" target="_blank" rel="noopener">{I['pin']}<span><small>Endereço</small>{ENDERECO}</span></a></li>
        <li><a href="{wa()}" target="_blank" rel="noopener">{I['whats']}<span><small>WhatsApp</small>{WHATS_TXT}</span></a></li>
        <li><a href="tel:{FIXO_TEL}">{I['phone']}<span><small>Telefone</small>{FIXO}</span></a></li>
        <li><a href="{INSTA}" target="_blank" rel="noopener">{I['insta']}<span><small>Instagram</small>{INSTA_TXT}</span></a></li>
      </ul>
    </div>
    <div class="map" data-reveal><iframe src="{MAPA}" title="Mapa: {e(ENDERECO)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div>
</section>
"""
    html += footer(root)
    escrever("", html)


def pagina_locacao():
    root = "../"
    cats = []
    for s in LOCACAO:
        c = CATS[s]
        thumbs = "".join(f'<img src="{root}{it["img"]}" alt="" loading="lazy">' for it in c["items"][:3] if it.get("img"))
        nomes = ", ".join(it["title"] for it in c["items"][:3])
        cats.append(f"""<a class="cat-card" href="{link(root, c['url'])}" data-tilt>
  <span class="cat-card-ico"><img src="{root}{HOME['icons'][s]}" alt="" width="64" height="64"></span>
  <span class="cat-card-thumbs">{thumbs}</span>
  <span class="cat-card-body"><strong>{e(c['name'])}</strong><small>{e(nomes)}{'…' if len(c['items']) > 3 else ''}</small></span>
  <span class="cat-card-foot">{len(c['items'])} equipamentos {I['arrow']}</span>
</a>""")
    html = head(root, "Locação", "Locação de equipamentos em Caçapava/SP: concretagem, compactação, demolição, elevação, "
                                 "andaimes, ferramentas elétricas, motores, jardinagem e limpeza.", "locacao")
    html += header(root, "locacao")
    html += page_hero(root, "Locação de equipamentos", "Alugue o equipamento <em>certo</em> para cada etapa",
                      "Escolha uma categoria e solicite seu orçamento direto pelo WhatsApp.", HOME["hero"][3],
                      [("Locação", None)])
    html += f"""<section class="section"><div class="wrap"><div class="cat-cards" data-stagger>{''.join(cats)}</div></div></section>"""
    html += footer(root)
    escrever("locacao", html)


def pagina_categoria(s):
    c = CATS[s]
    root = "../"
    nomes = ", ".join(it["title"] for it in c["items"][:4])
    html = head(root, f"Locação de {c['name']}", f"Locação de equipamentos de {c['name'].lower()} em Caçapava/SP: {nomes}. "
                                                f"Peça seu orçamento pelo WhatsApp.", c["url"])
    html += header(root, "locacao")
    img = next((it["img"] for it in c["items"] if it.get("img")), None)
    html += page_hero(root, "Locação", e(c["name"]),
                      f'{len(c["items"])} equipamentos disponíveis para locação. Consulte disponibilidade e valores.',
                      None, [("Locação", "locacao"), (c["name"], None)])
    html += f'<div class="wrap chips-wrap">{cat_chips(root, s)}</div>'
    html += grid_section(root, c)
    html += videos(c["videos"])
    html += footer(root)
    escrever(c["url"], html)


def pagina_vendas():
    c = CATS["vendas"]
    root = "../"
    html = head(root, "Vendas", "Venda de motosserras, roçadeiras, sopradores, cortadores de grama, pulverizadores, geradores "
                                "e acessórios Husqvarna e Branco Motores em Caçapava/SP.", "vendas")
    html += header(root, "vendas")
    html += page_hero(root, "Revenda autorizada Husqvarna & Branco", "Máquinas para quem <em>trabalha de verdade</em>",
                      "Motosserras, roçadeiras, sopradores, cortadores de grama, geradores e muito mais. "
                      "Parcelamos em até 12x no cartão — consulte condições.", HOME["hero"][2], [("Vendas", None)])
    html += grid_section(root, c, "Nossos produtos", filtro=True)
    html += videos(c["videos"])
    html += footer(root)
    escrever("vendas", html)


def pagina_manutencao():
    c = CATS["manutencao"]
    root = "../"
    texto = c["intro"]
    html = head(root, "Manutenção", "Assistência técnica autorizada Husqvarna e Branco Motores em Caçapava/SP. Conserto de "
                                    "máquinas de jardinagem de todas as marcas, peças, acessórios e EPIs.", "manutencao")
    html += header(root, "manutencao")
    html += page_hero(root, "Assistência técnica autorizada", "Manutenção com <em>quem entende</em>",
                      "Conserto de máquinas de todas as marcas com eficiência e rapidez.", None, [("Manutenção", None)])
    html += f"""<section class="section about">
  <div class="wrap about-grid">
    <div class="about-media">
      <div class="about-img" data-parallax="-10"><img src="{root}{c['intro_img']}" alt="Oficina da Caçapava Locações e Vendas" loading="lazy"></div>
      <div class="about-badge" data-reveal><strong>Orçamento</strong><span>sem compromisso</span></div>
    </div>
    <div class="about-txt">
      <p class="kicker" data-reveal>Nossa oficina</p>
      <h2 data-split>Autorizada <em>Husqvarna</em> e <em>Branco Motores</em></h2>
      <p class="lead" data-highlight>Nossa oficina é equipada com aparelhos e mão de obra qualificada para atender nossos clientes com maestria.</p>
      <p data-reveal>Nossos mecânicos são certificados em diversas marcas, realizando assim não só o conserto das que representamos, mas de todas as marcas do mercado com eficiência e rapidez.</p>
      <p data-reveal>Possuímos diversos tipos de peças, acessórios e EPIs. Traga já sua máquina de jardinagem para conserto. Entre em contato com um de nossos colaboradores.</p>
      <div data-reveal><a class="btn btn-primary" href="{wa('Olá, vim do site e gostaria de um orçamento de manutenção.')}" target="_blank" rel="noopener" data-magnetic>{I['tool']}<span>Solicitar manutenção</span></a></div>
    </div>
  </div>
</section>"""
    html += grid_section(root, c, "Peças e acessórios")
    html += footer(root)
    escrever("manutencao", html)


def pagina_contato():
    root = "../"
    html = head(root, "Contato", "Fale com a Caçapava Locações e Vendas: WhatsApp (12) 99799-1337, telefone (12) 3224-7581. "
                                 "Rua São Francisco, 1020 – Caçapava/SP.", "contato")
    html += header(root, "contato")
    html += page_hero(root, "Fale conosco", "Vamos tirar sua obra do <em>papel?</em>",
                      "Solicite um orçamento agora mesmo e descubra como podemos te ajudar em sua construção ou reforma!",
                      None, [("Contato", None)])
    html += f"""<section class="section">
  <div class="wrap contact-grid">
    <div>
      <h2 class="h3" data-reveal>Nossos contatos</h2>
      <ul class="contact-list" data-stagger>
        <li><a href="{wa()}" target="_blank" rel="noopener">{I['whats']}<span><small>WhatsApp</small>{WHATS_TXT}</span></a></li>
        <li><a href="tel:{FIXO_TEL}">{I['phone']}<span><small>Telefone</small>{FIXO}</span></a></li>
        <li><a href="mailto:{EMAIL}">{I['mail']}<span><small>E-mail</small>{EMAIL}</span></a></li>
        <li><a href="{INSTA}" target="_blank" rel="noopener">{I['insta']}<span><small>Instagram</small>{INSTA_TXT}</span></a></li>
        <li><a href="{MAPA_LINK}" target="_blank" rel="noopener">{I['pin']}<span><small>Endereço</small>{ENDERECO}</span></a></li>
      </ul>
    </div>
    <form class="form" data-form data-whats="{WHATS}" data-email="{EMAIL}" data-reveal>
      <h2 class="h3">Envie sua mensagem</h2>
      <div class="field"><label for="f-nome">Nome</label><input id="f-nome" name="nome" required autocomplete="name"></div>
      <div class="row">
        <div class="field"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" autocomplete="email"></div>
        <div class="field"><label for="f-tel">Telefone</label><input id="f-tel" name="telefone" type="tel" autocomplete="tel" inputmode="tel"></div>
      </div>
      <fieldset class="field"><legend>Tipo de serviço</legend>
        <div class="seg">
          <label><input type="radio" name="servico" value="Locação" checked><span>Locação</span></label>
          <label><input type="radio" name="servico" value="Vendas"><span>Vendas</span></label>
          <label><input type="radio" name="servico" value="Manutenção"><span>Manutenção</span></label>
        </div>
      </fieldset>
      <div class="field"><label for="f-msg">Mensagem</label><textarea id="f-msg" name="mensagem" rows="5" required></textarea></div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" data-magnetic>{I['whats']}<span>Enviar pelo WhatsApp</span></button>
        <button class="btn btn-ghost" type="submit" data-via="email">{I['mail']}<span>Enviar por e-mail</span></button>
      </div>
      <p class="form-note">Ao enviar, você concorda com nossa <a href="{link(root, 'politica-de-privacidade')}">Política de Privacidade</a>.</p>
    </form>
  </div>
</section>
<section class="section map-section"><div class="wrap"><div class="map wide" data-reveal><iframe src="{MAPA}" title="Mapa: {e(ENDERECO)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div></section>
"""
    html += footer(root)
    escrever("contato", html)


POLITICA = [
    ("", [f"A sua privacidade é importante para nós. É política da {EMPRESA} respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site {EMPRESA}, e outros sites que possuímos e operamos.",
          "Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.",
          "Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.",
          "Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.",
          "O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.",
          "Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.",
          "O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco."]),
    ("Formulário de contato e WhatsApp", ["As mensagens enviadas pelo formulário de contato são encaminhadas diretamente para o nosso WhatsApp ou e-mail, a partir do seu próprio aplicativo. Este site não armazena os dados digitados no formulário.",
                                          "Vídeos do YouTube só são carregados quando você clica para assisti-los, e o mapa é fornecido pelo Google Maps, que possui política de privacidade própria."]),
    ("Compromisso do Usuário", [f"O usuário se compromete a fazer uso adequado dos conteúdos e da informação que a {EMPRESA} oferece no site e com caráter enunciativo, mas não limitativo:",
                                "A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;",
                                "B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, jogos de sorte ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;",
                                f"C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) da {EMPRESA}, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar danos anteriormente mencionados."]),
    ("Mais informações", ["Esperamos que esteja esclarecido. Em caso de dúvidas, fale conosco pelos canais informados na página de contato.",
                          "Esta política é efetiva a partir de 24 de novembro de 2020."]),
]


def pagina_politica():
    root = "../"
    corpo = ""
    for tit, pars in POLITICA:
        if tit:
            corpo += f"<h2>{e(tit)}</h2>"
        corpo += "".join(f"<p>{e(p)}</p>" for p in pars)
    html = head(root, "Política de Privacidade", f"Política de privacidade do site {EMPRESA}.", "politica-de-privacidade")
    html += header(root, "")
    html += page_hero(root, "Institucional", "Política de Privacidade", "", None, [("Política de Privacidade", None)])
    html += f'<section class="section"><div class="wrap prose" data-reveal>{corpo}</div></section>'
    html += footer(root)
    escrever("politica-de-privacidade", html)


if __name__ == "__main__":
    pagina_home()
    pagina_locacao()
    for s in LOCACAO:
        pagina_categoria(s)
    pagina_vendas()
    pagina_manutencao()
    pagina_contato()
    pagina_politica()
