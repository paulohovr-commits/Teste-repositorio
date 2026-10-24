"""Interface pequena que concentra contexto, geração e auditoria."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

from .context import build_evidence, context_hash
from .guardrails import validate_candidate
from .models import CampaignConfig, DraftBatch, DraftCandidate


EXPECTED_VARIANTS = ("direta", "gancho_real", "diagnostica")
PROMPT_VERSION = "outreach-v1"


class DraftAdapter(Protocol):
    """Seam do provedor. Testes usam fake, produção usa OpenAI."""

    model: str

    def generate(
        self,
        evidence: dict[str, dict[str, str]],
        campaign: CampaignConfig,
    ) -> DraftBatch:
        ...


def _invalid_placeholder(variant: str, reason: str, model: str) -> dict[str, Any]:
    return {
        "variant": variant,
        "message": "",
        "evidence_ids": [],
        "evidence": {},
        "rationale": "",
        "valid": False,
        "violations": [reason],
        "model": model,
        "prompt_version": PROMPT_VERSION,
    }


def generate_for_lead(
    lead: dict[str, Any],
    campaign: CampaignConfig,
    adapter: DraftAdapter,
) -> dict[str, Any]:
    """Gera três rascunhos auditados sem executar nenhum envio."""

    if not campaign.draft_only:
        raise ValueError("Esta versão só opera com draft_only=true.")
    evidence = build_evidence(lead)
    batch = adapter.generate(evidence, campaign)
    by_variant: dict[str, DraftCandidate] = {item.variant: item for item in batch.candidates}
    drafts: list[dict[str, Any]] = []

    for variant in EXPECTED_VARIANTS:
        candidate = by_variant.get(variant)
        if candidate is None:
            drafts.append(_invalid_placeholder(variant, "variante ausente", adapter.model))
            continue
        violations = validate_candidate(candidate, set(evidence), campaign)
        drafts.append(
            {
                **candidate.model_dump(mode="json"),
                "evidence": {key: evidence[key] for key in candidate.evidence_ids if key in evidence},
                "valid": not violations,
                "violations": violations,
                "model": adapter.model,
                "prompt_version": PROMPT_VERSION,
            }
        )

    return {
        "lead_id": lead.get("id"),
        "lead_name": lead.get("nome", ""),
        "context_hash": context_hash(lead, campaign),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "draft_only": True,
        "drafts": drafts,
    }
