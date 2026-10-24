"""Contratos públicos da bancada de mensagens."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


VariantName = Literal["direta", "gancho_real", "diagnostica"]


class CampaignConfig(BaseModel):
    """Configuração neutra que pode ser versionada sem dados de clientes."""

    sender_name: str = ""
    company_name: str
    offer: str
    audience: str
    goal: str = "abrir uma conversa"
    tone: str = "humano, específico e breve"
    call_to_action: str = "fazer uma pergunta simples"
    max_words: int = Field(default=70, ge=20, le=140)
    banned_claims: list[str] = Field(default_factory=list)
    banned_terms: list[str] = Field(default_factory=list)
    draft_only: bool = True


class DraftCandidate(BaseModel):
    """Rascunho estruturado devolvido pelo provedor de IA."""

    variant: VariantName
    message: str
    evidence_ids: list[str] = Field(min_length=1)
    rationale: str = Field(max_length=240)


class DraftBatch(BaseModel):
    """Uma resposta completa, com uma alternativa por estratégia."""

    candidates: list[DraftCandidate] = Field(min_length=3, max_length=3)
