"""Validações determinísticas aplicadas depois da geração."""

from __future__ import annotations

import re

from .models import CampaignConfig, DraftCandidate


URL_RE = re.compile(r"(?:https?://|www\.|\b[a-z0-9-]+\.(?:com|com\.br|net|org)\b)", re.I)
EMOJI_RE = re.compile("[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF\u2600-\u27BF]")
GUARANTEE_RE = re.compile(r"\b(garant\w*|resultado certo|sem risco|vai aumentar|crescimento certo)\b", re.I)


def validate_candidate(
    candidate: DraftCandidate,
    allowed_evidence_ids: set[str],
    campaign: CampaignConfig,
) -> list[str]:
    """Retorna violações. Lista vazia significa que o rascunho passou."""

    message = candidate.message.strip()
    violations: list[str] = []
    if not message:
        violations.append("mensagem vazia")
    if len(message.split()) > campaign.max_words:
        violations.append(f"mais de {campaign.max_words} palavras")
    if message.count("?") > 1:
        violations.append("mais de uma pergunta")
    if URL_RE.search(message):
        violations.append("link na primeira abordagem")
    if "—" in message or "–" in message:
        violations.append("travessão")
    if EMOJI_RE.search(message):
        violations.append("emoji")
    if GUARANTEE_RE.search(message):
        violations.append("promessa ou garantia")

    unsupported = sorted(set(candidate.evidence_ids) - allowed_evidence_ids)
    if unsupported:
        violations.append("evidência não fornecida: " + ", ".join(unsupported))

    normalized = message.casefold()
    for item in campaign.banned_claims + campaign.banned_terms:
        if item.strip() and item.casefold() in normalized:
            violations.append(f"termo bloqueado: {item}")
    return violations
