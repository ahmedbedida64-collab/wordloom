import pytest
from etl.transformers.cleaner import TextCleaner
from etl.transformers.paginator import Paginator

def test_cleaner():
    cleaner = TextCleaner()
    # Test hyphenation join
    text = "This is a hyphen-\nated word."
    assert cleaner.clean(text) == "This is a hyphenated word."
    
def test_paginator():
    paginator = Paginator(target_words=10, min_words=5, max_words=15)
    
    # 25 paragraphs, each 1 word -> 25 words total
    # If target is 10, it should group them into ~3 pages
    text = "\n\n".join([f"Word{i}" for i in range(25)])
    
    # Need to bypass the 20-100 page rule for this unit test
    class TestPaginator(Paginator):
        def paginate(self, text):
            try:
                return super().paginate(text)
            except ValueError:
                # We expect a value error because pages < 20 in this tiny test
                pass
                
    # Wait, better to just generate 200 paragraphs of 10 words each
    long_text = "\n\n".join([" ".join(["word"] * 10)] * 250)
    
    # Target 250 words -> 10 words per p -> 25 paragraphs per page
    # 250 paragraphs -> 10 pages. Wait, 20-100 range.
    # 250 paragraphs * 10 words = 2500 words. Target 250 = 10 pages. Fails 20-100 check.
    # Let's generate 500 paragraphs * 10 words = 5000 words -> 20 pages.
    very_long_text = "\n\n".join([" ".join(["word"] * 10)] * 500)
    
    real_paginator = Paginator()
    pages = real_paginator.paginate(very_long_text)
    
    assert 20 <= len(pages) <= 100
    assert "content_html" in pages[0]
    assert "<p>" in pages[0]["content_html"]
    
def test_paginator_rejects_short_books():
    paginator = Paginator()
    with pytest.raises(ValueError, match="outside the 20-100 allowed range"):
        paginator.paginate("Too short book.")
