from __future__ import annotations

import unittest

from build_html_v2 import merge_outreach


class BuildTests(unittest.TestCase):
    def test_merge_outreach_matches_lead_id(self):
        data = {"leads": [{"id": 1, "nome": "A"}, {"id": 2, "nome": "B"}]}
        outreach = {
            "leads": [
                {
                    "lead_id": 2,
                    "context_hash": "abc",
                    "generated_at": "2026-09-17T00:00:00Z",
                    "drafts": [{"variant": "direta", "message": "Olá"}],
                }
            ]
        }
        self.assertEqual(merge_outreach(data, outreach), 1)
        self.assertNotIn("outreach_drafts", data["leads"][0])
        self.assertEqual(data["leads"][1]["outreach_context_hash"], "abc")

    def test_merge_without_file_is_noop(self):
        data = {"leads": [{"id": 1}]}
        self.assertEqual(merge_outreach(data, None), 0)
        self.assertEqual(data, {"leads": [{"id": 1}]})


if __name__ == "__main__":
    unittest.main()
