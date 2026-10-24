#!/usr/bin/env python3
"""
Fase 01: extração via Google Places Text Search (New).

Uso:
    python extrator.py "escritório de advocacia em Campinas SP"   # uma busca
    python extrator.py --estado                                   # todas as cidades do recorte.py

Cada busca vira um CSV em prospects/AAAA-MM-DD_<busca>.csv, com as colunas
que o merge.py espera (nome, categoria, endereco, telefone, whatsapp,
celular, site, nota, avaliacoes, fotos, recencia_dias, score, nrl, maps).

score (0 a 100): quão estabelecido e ativo o escritório parece no Maps.
nrl (0 a 10): força da presença digital. Quanto menor, mais lacunas
(sem site, poucas fotos, reviews antigas), ou seja, mais oportunidade.
"""
from __future__ import annotations

import csv
import io
import os
import re
import sys
import time
import unicodedata
from datetime import date, datetime, timezone

import requests

import recorte

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

URL = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ",".join([
    "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
    "places.websiteUri", "places.rating", "places.userRatingCount", "places.googleMapsUri",
    "places.primaryTypeDisplayName", "places.photos", "places.reviews", "places.businessStatus",
    "nextPageToken",
])
OUT_DIR = recorte.BASE / "prospects"
COLUNAS = ["nome", "categoria", "endereco", "telefone", "whatsapp", "celular", "whatsapp_status",
           "site", "nota", "avaliacoes", "fotos", "recencia_dias", "score", "nrl", "maps", "place_id"]


def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", t.lower()).strip("_")[:60]


def telefone_para_whatsapp(telefone: str) -> tuple[str, bool]:
    """(E.164 sem +, é celular?). Celular no Brasil: DDD + 9 dígitos começando com 9."""
    dig = re.sub(r"\D", "", telefone or "")
    if dig.startswith("0"):
        dig = dig.lstrip("0")
    if len(dig) == 11 and dig[2] == "9":
        return "55" + dig, True
    return "", False


def recencia_dias(reviews: list) -> int | None:
    datas = []
    for r in reviews or []:
        t = r.get("publishTime")
        if not t:
            continue
        try:
            datas.append(datetime.fromisoformat(t.replace("Z", "+00:00")))
        except ValueError:
            continue
    if not datas:
        return None
    return (datetime.now(timezone.utc) - max(datas)).days


def calcular_score(nota: float, avaliacoes: int, recencia: int | None, tem_telefone: bool) -> int:
    s = (nota / 5) * 40 + min(avaliacoes, 200) / 200 * 30
    if recencia is not None:
        s += 20 if recencia <= 90 else 10 if recencia <= 365 else 0
    s += 10 if tem_telefone else 0
    return round(s)


def calcular_nrl(site: str, avaliacoes: int, fotos: int, recencia: int | None) -> float:
    n = 0.0
    n += 3 if site else 0
    n += min(avaliacoes, 100) / 100 * 3
    n += min(fotos, 10) / 10 * 2
    if recencia is not None:
        n += 2 if recencia <= 90 else 1 if recencia <= 365 else 0
    return round(n, 1)


def linha(place: dict) -> dict:
    telefone = place.get("nationalPhoneNumber") or ""
    wa, celular = telefone_para_whatsapp(telefone)
    nota = float(place.get("rating") or 0)
    avaliacoes = int(place.get("userRatingCount") or 0)
    fotos = len(place.get("photos") or [])
    rec = recencia_dias(place.get("reviews"))
    site = place.get("websiteUri") or ""
    return {
        "nome": (place.get("displayName") or {}).get("text", ""),
        "categoria": (place.get("primaryTypeDisplayName") or {}).get("text", ""),
        "endereco": place.get("formattedAddress") or "",
        "telefone": telefone,
        "whatsapp": wa,
        "celular": "Sim" if celular else "Não",
        "whatsapp_status": "provavel" if celular else ("fixo" if telefone else "sem_telefone"),
        "site": site,
        "nota": nota or "",
        "avaliacoes": avaliacoes,
        "fotos": fotos,
        "recencia_dias": "" if rec is None else rec,
        "score": calcular_score(nota, avaliacoes, rec, bool(telefone)),
        "nrl": calcular_nrl(site, avaliacoes, fotos, rec),
        "maps": place.get("googleMapsUri") or "",
        "place_id": place.get("id") or "",
    }


def buscar(consulta: str, chave: str) -> list[dict]:
    headers = {"X-Goog-Api-Key": chave, "X-Goog-FieldMask": FIELDS, "Content-Type": "application/json"}
    corpo = {"textQuery": consulta, "languageCode": "pt-BR", "regionCode": "BR", "pageSize": 20}
    caixa = recorte.CAIXA_UF.get(recorte.UF)
    if caixa:
        corpo["locationRestriction"] = {"rectangle": caixa}
    resultados = []
    for _ in range(recorte.MAX_PAGINAS):
        r = requests.post(URL, headers=headers, json=corpo, timeout=30)
        if r.status_code != 200:
            print(f"  [erro] HTTP {r.status_code}: {r.text[:300]}")
            break
        data = r.json()
        for p in data.get("places", []):
            if p.get("businessStatus", "OPERATIONAL") == "OPERATIONAL":
                resultados.append(linha(p))
        token = data.get("nextPageToken")
        if not token:
            break
        corpo["pageToken"] = token
        time.sleep(1.5)
    return resultados


def salvar(consulta: str, linhas: list[dict]) -> None:
    OUT_DIR.mkdir(exist_ok=True)
    path = OUT_DIR / f"{date.today().isoformat()}_{slug(consulta)}.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUNAS)
        w.writeheader()
        w.writerows(linhas)
    print(f"  {len(linhas):3d} empresas -> {path.name}")


def main(args: list[str]) -> int:
    chave = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
    if not chave:
        print("[erro] GOOGLE_PLACES_API_KEY não definida (no .env ou nas variáveis do ambiente).")
        return 1
    if args == ["--estado"]:
        consultas = [c.format(cidade=cid, uf=recorte.UF) for cid in recorte.CIDADES for c in recorte.CONSULTAS]
    elif args:
        consultas = [" ".join(args)]
    else:
        print(__doc__)
        return 1
    total = 0
    for i, consulta in enumerate(consultas, 1):
        print(f"[{i}/{len(consultas)}] {consulta}")
        linhas = buscar(consulta, chave)
        salvar(consulta, linhas)
        total += len(linhas)
    print(f"\nTotal bruto: {total} empresas em {len(consultas)} buscas.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
