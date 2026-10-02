import os
import json
import asyncio
import httpx
from pathlib import Path
from urllib.parse import urlparse
import time
from typing import Optional

class BaseExtractor:
    def __init__(self, source_name: str, rate_limit_seconds: float = 1.5):
        self.source_name = source_name
        self.rate_limit_seconds = rate_limit_seconds
        self.cache_dir = Path(f'data/raw/{source_name}')
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.last_request_time = 0.0
        self.headers = {
            'User-Agent': 'WordloomETL/1.0 (contact@wordloom.com)'
        }
        
    async def _wait_rate_limit(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.rate_limit_seconds:
            await asyncio.sleep(self.rate_limit_seconds - elapsed)
        self.last_request_time = time.time()

    def _get_cache_path(self, url: str) -> Path:
        safe_name = "".join([c if c.isalnum() else "_" for c in url])[-150:]
        return self.cache_dir / f"{safe_name}.cache"

    async def fetch(self, url: str, as_json: bool = False, use_cache: bool = True) -> Optional[str|dict]:
        cache_path = self._get_cache_path(url)
        if use_cache and cache_path.exists():
            with open(cache_path, 'r', encoding='utf-8') as f:
                content = f.read()
                return json.loads(content) if as_json else content

        async with httpx.AsyncClient() as client:
            retries = 0
            while retries < 5:
                await self._wait_rate_limit()
                try:
                    response = await client.get(url, headers=self.headers, follow_redirects=True)
                    if response.status_code == 429 or response.status_code >= 500:
                        retry_after = int(response.headers.get('Retry-After', 2 ** retries))
                        await asyncio.sleep(retry_after)
                        retries += 1
                        continue
                    
                    response.raise_for_status()
                    content = response.text
                    
                    if use_cache:
                        with open(cache_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                            
                    return json.loads(content) if as_json else content
                except httpx.RequestError as e:
                    await asyncio.sleep(2 ** retries)
                    retries += 1
                    
        return None
