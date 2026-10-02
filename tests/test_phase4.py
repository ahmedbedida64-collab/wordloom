import pytest
from unittest.mock import MagicMock
from etl.enrichment.leveler import Leveler
from etl.enrichment.pipeline import EnrichmentPipeline

def test_leveler():
    leveler = Leveler()
    text = "The cat sat on the mat. " * 30 # 180 words
    res = leveler.analyze(text)
    assert res['total_words'] == 180
    assert res['reading_time_minutes'] == 1
    assert res['cefr_level_code'] in ["A1", "A2"] # Simple text

def test_enrichment_pipeline():
    pipeline = EnrichmentPipeline(api_key="mock")
    
    # Mock text gen
    mock_res = MagicMock()
    mock_res.text = '{"cefr_prediction": "B2", "topics": ["history"], "is_archaic": false, "is_unsafe": false, "summary": "A history book."}'
    pipeline.client.models.generate_content = MagicMock(return_value=mock_res)
    
    # Base A1 vs Pred B2 -> difference > 1 -> needs_review
    res = pipeline.run_gemini_checks("Some text...", "A1")
    assert res['needs_review'] is True
    assert "history" in res['topics']
    
    # Mock embedding
    mock_embed = MagicMock()
    mock_embed.embeddings = [MagicMock(values=[0.1, 0.2, 0.3])]
    pipeline.client.models.embed_content = MagicMock(return_value=mock_embed)
    
    emb = pipeline.generate_embedding("Title", "Sum", "Text")
    assert emb == [0.1, 0.2, 0.3]
