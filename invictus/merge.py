#!/usr/bin/env python3
"""Fase 02: merge + dedup dos CSVs do extrator, filtro de nicho e de estado.

Lê prospects/<DATA>_*.csv (DATA = hoje, ou a variável DATA=AAAA-MM-DD),
aplica os termos e o estado do recorte.py e salva o top em leads_merged.csv.
"""
import csv
import glob
import io
import os
import re
import sys
from collections import Counter
from datetime import date

import recorte

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SRC = recorte.BASE / "prospects"
DATE = os.getenv("DATA", "").strip() or date.today().isoformat()
OUT_CSV = recorte.BASE / "leads_merged.csv"

pattern = os.path.join(SRC, f"{DATE}_*.csv")
files = [f for f in glob.glob(pattern) if "_agente" not in f]
print(f"Lendo {len(files)} CSVs de {DATE}:")
for f in files:
    print(f"  {os.path.basename(f)}")
if not files:
    print("[erro] Nenhum CSV encontrado. Rode o extrator.py antes (ou defina DATA=AAAA-MM-DD).")
    sys.exit(1)

all_rows = []
seen_phone = set()
seen_name = set()
dup_count = 0

for f in sorted(files):
    origem = os.path.basename(f).replace(f"{DATE}_", "").replace(".csv", "")
    with open(f, "r", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            phone = re.sub(r"\D", "", row.get("telefone") or "")
            name_key = (row.get("nome") or "").strip().lower()
            if phone and phone in seen_phone:
                dup_count += 1
                continue
            if name_key and name_key in seen_name:
                dup_count += 1
                continue
            if phone:
                seen_phone.add(phone)
            if name_key:
                seen_name.add(name_key)
            row["query_origem"] = origem
            all_rows.append(row)

print(f"\nTotal únicos: {len(all_rows)} (duplicados removidos: {dup_count})")
print(f"Celular (WhatsApp provável): {sum(1 for r in all_rows if r.get('celular') == 'Sim')}")
print(f"Com site: {sum(1 for r in all_rows if (r.get('site') or '').strip())}")

UF_TOKENS = [f" {recorte.UF}", recorte.NOME_UF.get(recorte.UF, "")]
EVITAR = [c.lower() for c in recorte.REGIAO_EVITAR]


def is_valid(row):
    nome = (row.get("nome") or "").lower()
    cat = (row.get("categoria") or "").lower()
    endereco = (row.get("endereco") or "").upper()
    telefone = row.get("telefone") or ""
    for term in recorte.BLACKLIST_TERMS:
        if term in nome or term in cat:
            return False
    if not any(t and t in endereco for t in UF_TOKENS):
        return False
    if EVITAR and recorte.cidade_de(row.get("endereco") or "").lower() in EVITAR:
        return False
    ddd_match = re.search(r"\((\d{2})\)", telefone)
    if recorte.DDDS and ddd_match and ddd_match.group(1) not in recorte.DDDS:
        return False
    return any(t in nome or t in cat for t in recorte.NICHE_TERMS)


# Aceitar leads com telefone OU com site (sem nenhum dos dois não há como abordar)
candidatos = [r for r in all_rows if (r.get("telefone") or "").strip() or (r.get("site") or "").strip()]
filtrados = [r for r in candidatos if is_valid(r)]
print(f"Após filtro de nicho e estado: {len(filtrados)}")


def num(v, padrao):
    try:
        return float(v)
    except (TypeError, ValueError):
        return padrao


def rank_key(row):
    # score desc, NRL asc (presença digital frágil = mais oportunidade), avaliações desc
    return (-num(row.get("score"), 0), num(row.get("nrl"), 10), -num(row.get("avaliacoes"), 0))


filtrados.sort(key=rank_key)

# Teto por cidade, para o recorte estadual não virar só a capital
por_cidade = Counter()
selecionados = []
for r in filtrados:
    cidade = recorte.cidade_de(r.get("endereco") or "") or "?"
    if por_cidade[cidade] >= recorte.MAX_POR_CIDADE:
        continue
    por_cidade[cidade] += 1
    selecionados.append(r)
    if len(selecionados) >= recorte.LEADS_ALVO:
        break

if selecionados:
    fieldnames = list(selecionados[0].keys())
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(selecionados)
    print(f"\nCSV merged salvo: {OUT_CSV}")
    print(f"Selecionados: {len(selecionados)} de {len(filtrados)}, em {len(por_cidade)} cidades")
    for cidade, n in por_cidade.most_common():
        print(f"  {cidade}: {n}")
    for i, r in enumerate(selecionados, 1):
        print(f"  {i:3d}. {r['nome'][:55]:55s} | score {r.get('score'):>3} | NRL {r.get('nrl'):>4} | {r.get('whatsapp_status')}")
else:
    print("[aviso] Nenhum lead passou no filtro. Revise NICHE_TERMS/BLACKLIST_TERMS no recorte.py.")
