"""Bancada opcional para criar rascunhos de primeira abordagem."""

from .generator import generate_for_lead
from .models import CampaignConfig, DraftBatch, DraftCandidate

__all__ = ["CampaignConfig", "DraftBatch", "DraftCandidate", "generate_for_lead"]
