import pytest
import os
from etl.enrichment.vocab import VocabExtractor

def test_vocab_extractor_requires_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    with pytest.raises(ValueError, match="GEMINI_API_KEY is not set"):
        VocabExtractor()
