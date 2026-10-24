"""Transforma um lead em evidências explícitas e rastreáveis."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from .models import CampaignConfig


def _add(evidence: dict[str, dict[str, str]], key: str, label: str, value: Any) -> None:
    if value is None or value == "" or value == [] or value == {}:
        return
    evidence[key] = {"label": label, "value": str(value)}


def build_evidence(lead: dict[str, Any]) -> dict[str, dict[str, str]]:
    """Cria a lista branca de fatos que uma mensagem pode mencionar."""

    evidence: dict[str, dict[str, str]] = {}
    instagram = lead.get("instagram") or {}
    _add(evidence, "company_name", "Empresa", lead.get("nome"))
    _add(evidence, "owner_name", "Responsável", lead.get("dono"))
    _add(evidence, "city", "Cidade", lead.get("cidade"))
    _add(evidence, "neighborhood", "Bairro", lead.get("bairro"))
    _add(evidence, "maps_rating", "Nota no Google Maps", lead.get("maps_nota"))
    _add(evidence, "maps_reviews", "Avaliações no Google Maps", lead.get("maps_avaliacoes"))
    _add(evidence, "years_in_business", "Tempo de mercado", lead.get("tempo_mercado") or lead.get("tempo_mercado_anos"))
    _add(evidence, "advertises_meta", "Anuncia na Meta", lead.get("anuncia_meta"))
    _add(evidence, "advertises_google", "Anuncia no Google", lead.get("anuncia_google"))
    _add(evidence, "instagram_bio", "Bio do Instagram", instagram.get("bio"))

    for index, item in enumerate(lead.get("rapport_humano") or [], start=1):
        _add(evidence, f"rapport_{index}", f"Sinal de rapport {index}", item)
    for index, item in enumerate(lead.get("gancho_dor") or [], start=1):
        _add(evidence, f"opportunity_{index}", f"Oportunidade observada {index}", item)
    return evidence


def context_hash(lead: dict[str, Any], campaign: CampaignConfig) -> str:
    """Identifica quando fatos ou campanha mudaram desde a geração."""

    payload = {
        "evidence": build_evidence(lead),
        "campaign": campaign.model_dump(mode="json"),
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
