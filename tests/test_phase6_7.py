import pytest
from etl.enrichment.covers import CoverGenerator
from etl.loaders.db_loader import DBLoader

def test_cover_generator():
    cg = CoverGenerator(api_key="mock")
    b = {"id": "test1", "title": "Test Book", "summary": "A test book"}
    out = cg.process_book(b)
    assert 'cover_image_url' in out
    assert out['cover_status'] == 'approved'
    assert 'test1.jpg' in out['cover_image_url']
