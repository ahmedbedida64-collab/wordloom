from typing import AsyncGenerator, Dict, Any
from .base import BaseExtractor
import re

class GutendexExtractor(BaseExtractor):
    def __init__(self):
        super().__init__('gutendex', 1.5)
        self.base_url = 'https://gutendex.com/books?languages=en'

    def clean_text(self, text: str) -> str:
        # D4.1: Remove Gutenberg boilerplate
        start_match = re.search(r'\*\*\* START OF THIS PROJECT GUTENBERG.*?\*\*\*', text, re.IGNORECASE)
        end_match = re.search(r'\*\*\* END OF THIS PROJECT GUTENBERG.*?\*\*\*', text, re.IGNORECASE)
        
        if start_match:
            text = text[start_match.end():]
        if end_match:
            text = text[:end_match.start()]
            
        return text.strip()

    async def extract(self, limit: int = 10) -> AsyncGenerator[Dict[str, Any], None]:
        url = self.base_url
        yielded = 0
        
        while url and yielded < limit:
            data = await self.fetch(url, as_json=True)
            if not data or 'results' not in data:
                break
                
            for book in data['results']:
                if yielded >= limit:
                    break
                    
                formats = book.get('formats', {})
                txt_url = formats.get('text/plain; charset=us-ascii') or formats.get('text/plain; charset=utf-8')
                
                if txt_url:
                    raw_text = await self.fetch(txt_url, as_json=False)
                    if raw_text:
                        authors = ", ".join([a.get('name', '') for a in book.get('authors', [])])
                        yield {
                            'source_name': 'gutendex',
                            'source_id': str(book['id']),
                            'source_url': txt_url,
                            'license': 'PD',
                            'author': authors,
                            'title': book.get('title', ''),
                            'attribution_text': f"{book.get('title')} by {authors} (Public Domain)",
                            'content': self.clean_text(raw_text)
                        }
                        yielded += 1
            url = data.get('next')
