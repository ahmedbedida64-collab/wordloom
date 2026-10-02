from typing import AsyncGenerator, Dict, Any
from .base import BaseExtractor

class AfricanStorybookExtractor(BaseExtractor):
    def __init__(self):
        super().__init__('african_storybook', 1.5)

    async def extract(self, limit: int = 10) -> AsyncGenerator[Dict[str, Any], None]:
        # Implementation for african_storybook
        yielded = 0
        while yielded < limit:
            yield {
                'source_name': 'african_storybook',
                'source_id': f"stub_{yielded}",
                'source_url': 'https://example.com',
                'license': 'CC-BY-4.0',
                'author': 'Unknown',
                'title': 'Stub Book',
                'attribution_text': 'Stub attribution',
                'content': 'Stub content'
            }
            yielded += 1
