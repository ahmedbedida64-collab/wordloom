import os
from pathlib import Path

CLEANER = '''\
import re
import ftfy

class TextCleaner:
    def __init__(self):
        pass
        
    def clean(self, text: str) -> str:
        # Fix encoding issues (mojibake)
        text = ftfy.fix_text(text)
        
        # Normalize quotes and dashes
        text = text.replace('"', '"').replace('"', '"').replace("'", "'").replace("'", "'")
        text = text.replace('—', '--').replace('–', '-')
        
        # Join words hyphenated across line breaks
        text = re.sub(r'([a-zA-Z])-[\r\n]+([a-zA-Z])', r'\\1\\2', text)
        
        # Remove long-s and OCR junk (basic pass)
        text = text.replace('ſ', 's')
        
        # Remove multiple newlines
        text = re.sub(r'\\n{3,}', '\\n\\n', text)
        return text.strip()
'''

PAGINATOR = '''\
import re
from typing import List, Dict

class Paginator:
    def __init__(self, target_words: int = 250, min_words: int = 200, max_words: int = 300):
        self.target_words = target_words
        self.min_words = min_words
        self.max_words = max_words
        
    def paginate(self, text: str) -> List[Dict[str, str]]:
        # Split into paragraphs to respect dialogue and headings
        paragraphs = re.split(r'\\n\\n+', text)
        pages = []
        current_page_paragraphs = []
        current_word_count = 0
        
        for p in paragraphs:
            p = p.strip()
            if not p: continue
            
            p_words = len(p.split())
            
            # If adding this paragraph exceeds max and we already have at least min, flush page
            if current_word_count + p_words > self.max_words and current_word_count >= self.min_words:
                pages.append(self._build_page(current_page_paragraphs))
                current_page_paragraphs = [p]
                current_word_count = p_words
            else:
                current_page_paragraphs.append(p)
                current_word_count += p_words
                
            # If we hit the absolute target, we can flush if next is a good boundary
            if current_word_count >= self.target_words:
                pages.append(self._build_page(current_page_paragraphs))
                current_page_paragraphs = []
                current_word_count = 0
                
        # Flush remaining
        if current_page_paragraphs:
            pages.append(self._build_page(current_page_paragraphs))
            
        page_count = len(pages)
        if not (20 <= page_count <= 100):
            raise ValueError(f"Book rejected: {page_count} pages is outside the 20-100 allowed range.")
            
        return pages
        
    def _build_page(self, paragraphs: List[str]) -> Dict[str, str]:
        html = "".join([f"<p>{p}</p>" for p in paragraphs])
        plain = "\\n\\n".join(paragraphs)
        return {
            "content_html": html,
            "content_plain": plain,
            "word_count": sum(len(p.split()) for p in paragraphs)
        }
'''

TEST_TRANSFORMERS = '''\
import pytest
from etl.transformers.cleaner import TextCleaner
from etl.transformers.paginator import Paginator

def test_cleaner():
    cleaner = TextCleaner()
    # Test hyphenation join
    text = "This is a hyphen-\\nated word."
    assert cleaner.clean(text) == "This is a hyphenated word."
    
def test_paginator():
    paginator = Paginator(target_words=10, min_words=5, max_words=15)
    
    # 25 paragraphs, each 1 word -> 25 words total
    # If target is 10, it should group them into ~3 pages
    text = "\\n\\n".join([f"Word{i}" for i in range(25)])
    
    # Need to bypass the 20-100 page rule for this unit test
    class TestPaginator(Paginator):
        def paginate(self, text):
            try:
                return super().paginate(text)
            except ValueError:
                # We expect a value error because pages < 20 in this tiny test
                pass
                
    # Wait, better to just generate 200 paragraphs of 10 words each
    long_text = "\\n\\n".join([" ".join(["word"] * 10)] * 250)
    
    # Target 250 words -> 10 words per p -> 25 paragraphs per page
    # 250 paragraphs -> 10 pages. Wait, 20-100 range.
    # 250 paragraphs * 10 words = 2500 words. Target 250 = 10 pages. Fails 20-100 check.
    # Let's generate 500 paragraphs * 10 words = 5000 words -> 20 pages.
    very_long_text = "\\n\\n".join([" ".join(["word"] * 10)] * 500)
    
    real_paginator = Paginator()
    pages = real_paginator.paginate(very_long_text)
    
    assert 20 <= len(pages) <= 100
    assert "content_html" in pages[0]
    assert "<p>" in pages[0]["content_html"]
    
def test_paginator_rejects_short_books():
    paginator = Paginator()
    with pytest.raises(ValueError, match="outside the 20-100 allowed range"):
        paginator.paginate("Too short book.")
'''

def main():
    Path('etl/transformers').mkdir(parents=True, exist_ok=True)
    Path('etl/transformers/__init__.py').touch()
    
    with open('etl/transformers/cleaner.py', 'w') as f: f.write(CLEANER)
    with open('etl/transformers/paginator.py', 'w') as f: f.write(PAGINATOR)
    with open('tests/test_transformers.py', 'w') as f: f.write(TEST_TRANSFORMERS)
    
    print("Generated Transformers")

if __name__ == '__main__':
    main()
