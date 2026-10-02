from typing import AsyncGenerator, Dict, Any
from .base import BaseExtractor
from bs4 import BeautifulSoup
import ebooklib
from ebooklib import epub
import io
import httpx

class StandardEbooksExtractor(BaseExtractor):
    def __init__(self):
        super().__init__('standard_ebooks', 1.5)
        self.feed_url = 'https://standardebooks.org/feeds/opds'

    async def extract(self, limit: int = 10) -> AsyncGenerator[Dict[str, Any], None]:
        # D4.2 implementation stub for standard ebooks OPDS
        # For full parsing, ebooklib is used locally on downloaded EPUBs
        xml_data = await self.fetch(self.feed_url, as_json=False)
        if not xml_data:
            return
            
        soup = BeautifulSoup(xml_data, 'xml')
        entries = soup.find_all('entry')
        
        yielded = 0
        for entry in entries:
            if yielded >= limit:
                break
                
            title = entry.title.text if entry.title else ''
            author = entry.author.name.text if entry.author and entry.author.name else ''
            # Find epub link
            epub_link = None
            for link in entry.find_all('link'):
                if 'application/epub+zip' in link.get('type', ''):
                    epub_link = link.get('href')
                    break
                    
            if epub_link:
                url = epub_link
                if url.startswith('/'):
                    url = 'https://standardebooks.org' + url
                    
                yield {
                    'source_name': 'standard_ebooks',
                    'source_id': entry.id.text if entry.id else url,
                    'source_url': url,
                    'license': 'PD',
                    'author': author,
                    'title': title,
                    'attribution_text': f"{title} by {author} (Public Domain via Standard Ebooks)",
                    'content': "EPUB content requires parsing" # Will be parsed by transformers
                }
                yielded += 1
