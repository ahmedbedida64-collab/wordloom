import re
from typing import List, Dict

class Paginator:
    def __init__(self, target_words: int = 250, min_words: int = 200, max_words: int = 300):
        self.target_words = target_words
        self.min_words = min_words
        self.max_words = max_words
        
    def paginate(self, text: str) -> List[Dict[str, str]]:
        # Split into paragraphs to respect dialogue and headings
        paragraphs = re.split(r'\n\n+', text)
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
        plain = "\n\n".join(paragraphs)
        return {
            "content_html": html,
            "content_plain": plain,
            "word_count": sum(len(p.split()) for p in paragraphs)
        }
