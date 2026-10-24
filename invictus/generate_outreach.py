#!/usr/bin/env python3
"""Gera rascunhos auditáveis e nunca envia mensagens."""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from outreach.context import context_hash
from outreach.generator import generate_for_lead
from outreach.models import CampaignConfig


if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = Path(__file__).parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--leads", type=Path, default=BASE / "leads_final.json")
    parser.add_argument("--campaign", type=Path, default=BASE / "outreach_campaign.json")
    parser.add_argument("--output", type=Path, default=BASE / "outreach_drafts.json")
    parser.add_argument("--model", default=None, help="Sobrescreve OPENAI_MODEL")
    parser.add_argument("--limit", type=int, default=None, help="Limita a quantidade de leads")
    parser.add_argument("--force", action="store_true", help="Regenera contextos inalterados")
    parser.add_argument("--dry-run", action="store_true", help="Valida arquivos sem chamar a API")
    return parser.parse_args()


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_existing(path: Path) -> dict[object, dict]:
    if not path.exists():
        return {}
    payload = read_json(path)
    return {item.get("lead_id"): item for item in payload.get("leads", [])}


def main() -> int:
    args = parse_args()
    load_dotenv(BASE / ".env")
    if not args.leads.exists():
        print(f"[erro] arquivo de leads não encontrado: {args.leads}")
        return 1
    if not args.campaign.exists():
        print(f"[erro] copie outreach_campaign.example.json para {args.campaign.name} e personalize.")
        return 1

    leads = read_json(args.leads).get("leads", [])
    campaign = CampaignConfig.model_validate(read_json(args.campaign))
    if not campaign.draft_only:
        print("[erro] esta versão exige draft_only=true.")
        return 1
    if args.limit is not None:
        leads = leads[: max(0, args.limit)]

    existing = load_existing(args.output)
    pending_ids = {
        lead.get("id") for lead in leads
        if args.force
        or lead.get("id") not in existing
        or existing[lead.get("id")].get("context_hash") != context_hash(lead, campaign)
    }
    print(f"Leads: {len(leads)} | pendentes: {len(pending_ids)} | preservados: {len(leads) - len(pending_ids)}")
    if args.dry_run:
        print("Dry-run concluído. Nenhuma chamada de API foi feita.")
        return 0
    if not os.getenv("OPENAI_API_KEY"):
        print("[erro] OPENAI_API_KEY não configurada no .env ou no ambiente.")
        return 1

    from outreach.openai_adapter import OpenAIResponsesAdapter

    adapter = OpenAIResponsesAdapter(args.model)
    results: list[dict] = []
    for index, lead in enumerate(leads, start=1):
        previous = existing.get(lead.get("id"))
        if lead.get("id") not in pending_ids and previous:
            results.append(previous)
            continue
        print(f"[{index}/{len(leads)}] {lead.get('nome', lead.get('id'))}")
        results.append(generate_for_lead(lead, campaign, adapter))

    payload = {"version": 1, "draft_only": True, "model": adapter.model, "leads": results}
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    valid = sum(draft["valid"] for item in results for draft in item["drafts"])
    total = sum(len(item["drafts"]) for item in results)
    print(f"Rascunhos salvos: {args.output} | válidos: {valid}/{total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
