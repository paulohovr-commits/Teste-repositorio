"""Adapter de produção para Structured Outputs na Responses API."""

from __future__ import annotations

import json
import os

from .models import CampaignConfig, DraftBatch


SYSTEM_PROMPT = """Você escreve rascunhos curtos de primeira abordagem B2B em português do Brasil.
Use somente os fatos identificados na lista de evidências. Cada afirmação factual precisa apontar os
evidence_ids usados. Não invente pesquisa, resultado, intimidade, urgência nem autoridade. Não use
link, emoji, travessão, garantia ou jargão de método. Faça no máximo uma pergunta por mensagem.
Crie exatamente três variantes: direta, gancho_real e diagnostica. O resultado é apenas rascunho
para revisão humana e nunca deve sugerir que foi enviado automaticamente."""


class OpenAIResponsesAdapter:
    """Mantém SDK, chave e prompt fora do gerador e do CRM estático."""

    def __init__(self, model: str | None = None) -> None:
        from openai import OpenAI

        self.model = model or os.getenv("OPENAI_MODEL", "gpt-5.6-luna")
        self._client = OpenAI()

    def generate(
        self,
        evidence: dict[str, dict[str, str]],
        campaign: CampaignConfig,
    ) -> DraftBatch:
        payload = {
            "campaign": campaign.model_dump(mode="json"),
            "evidence": evidence,
            "variant_guidance": {
                "direta": "apresentação objetiva e pergunta simples",
                "gancho_real": "abre por um único fato relevante da empresa",
                "diagnostica": "levanta uma hipótese cuidadosa, sem afirmar o que não sabe",
            },
        }
        response = self._client.responses.parse(
            model=self.model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            text_format=DraftBatch,
        )
        if response.output_parsed is None:
            raise RuntimeError("A resposta não trouxe saída estruturada.")
        return response.output_parsed
