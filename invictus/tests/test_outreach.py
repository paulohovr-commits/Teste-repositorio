from __future__ import annotations

import unittest

from outreach.context import build_evidence, context_hash
from outreach.generator import generate_for_lead
from outreach.guardrails import validate_candidate
from outreach.models import CampaignConfig, DraftBatch, DraftCandidate


def campaign() -> CampaignConfig:
    return CampaignConfig(
        company_name="Estúdio Horizonte",
        offer="diagnóstico de presença digital",
        audience="negócios locais",
        banned_terms=["imperdível"],
    )


class FakeAdapter:
    model = "fake-model"

    def generate(self, evidence, config):
        return DraftBatch(
            candidates=[
                DraftCandidate(
                    variant="direta",
                    message="Olá, vi a Clínica Aurora em Recife. Posso fazer uma pergunta rápida?",
                    evidence_ids=["company_name", "city"],
                    rationale="Abordagem objetiva.",
                ),
                DraftCandidate(
                    variant="gancho_real",
                    message="Olá, notei a avaliação 4.8 da Clínica Aurora. Como vocês atraem novos pacientes hoje?",
                    evidence_ids=["company_name", "maps_rating"],
                    rationale="Usa um sinal público.",
                ),
                DraftCandidate(
                    variant="diagnostica",
                    message="Olá, vi que a Clínica Aurora atende em Recife. Captação digital é uma prioridade agora?",
                    evidence_ids=["company_name", "city"],
                    rationale="Hipótese cuidadosa.",
                ),
            ]
        )


class OutreachTests(unittest.TestCase):
    def setUp(self):
        self.lead = {
            "id": 7,
            "nome": "Clínica Aurora",
            "cidade": "Recife",
            "maps_nota": "4.8",
            "rapport_humano": ["Atendimento familiar citado nas avaliações"],
        }

    def test_context_builds_whitelisted_evidence(self):
        evidence = build_evidence(self.lead)
        self.assertEqual(evidence["company_name"]["value"], "Clínica Aurora")
        self.assertEqual(evidence["rapport_1"]["label"], "Sinal de rapport 1")
        self.assertNotIn("owner_name", evidence)

    def test_hash_changes_when_evidence_changes(self):
        first = context_hash(self.lead, campaign())
        changed = {**self.lead, "maps_nota": "4.9"}
        self.assertNotEqual(first, context_hash(changed, campaign()))

    def test_guardrails_block_unsafe_content(self):
        candidate = DraftCandidate(
            variant="direta",
            message="Resultado garantido 🚀 em https://example.com. Posso explicar? Quer agora?",
            evidence_ids=["invented"],
            rationale="Teste",
        )
        violations = validate_candidate(candidate, {"company_name"}, campaign())
        joined = " | ".join(violations)
        self.assertIn("mais de uma pergunta", joined)
        self.assertIn("link", joined)
        self.assertIn("emoji", joined)
        self.assertIn("garantia", joined)
        self.assertIn("evidência não fornecida", joined)

    def test_generator_returns_three_audited_drafts(self):
        result = generate_for_lead(self.lead, campaign(), FakeAdapter())
        self.assertTrue(result["draft_only"])
        self.assertEqual(len(result["drafts"]), 3)
        self.assertTrue(all(item["valid"] for item in result["drafts"]))
        self.assertEqual(result["drafts"][0]["model"], "fake-model")

    def test_generator_refuses_non_draft_mode(self):
        unsafe = campaign().model_copy(update={"draft_only": False})
        with self.assertRaisesRegex(ValueError, "draft_only"):
            generate_for_lead(self.lead, unsafe, FakeAdapter())


if __name__ == "__main__":
    unittest.main()
