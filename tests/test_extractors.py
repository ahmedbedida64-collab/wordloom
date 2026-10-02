import pytest
import respx
import httpx
from etl.extractors.gutendex import GutendexExtractor
from etl.extractors.standard_ebooks import StandardEbooksExtractor

@pytest.mark.asyncio
async def test_gutendex_extractor():
    with respx.mock(assert_all_called=False) as respx_mock:
        # Mock the list endpoint
        respx_mock.get('https://gutendex.com/books?languages=en').respond(
            status_code=200,
            json={
                "next": None,
                "results": [
                    {
                        "id": 1,
                        "title": "Test Book",
                        "authors": [{"name": "Test Author"}],
                        "formats": {"text/plain; charset=utf-8": "https://test.com/book1.txt"}
                    }
                ]
            }
        )
        # Mock the text download
        respx_mock.get('https://test.com/book1.txt').respond(
            status_code=200,
            text="*** START OF THIS PROJECT GUTENBERG EBOOK ***\nReal book content\n*** END OF THIS PROJECT GUTENBERG EBOOK ***"
        )
        
        extractor = GutendexExtractor()
        books = [b async for b in extractor.extract(limit=1)]
        
        assert len(books) == 1
        assert books[0]['title'] == 'Test Book'
        assert books[0]['author'] == 'Test Author'
        assert 'Real book content' in books[0]['content']
        assert 'START OF' not in books[0]['content']

@pytest.mark.asyncio
async def test_rate_limit_and_retry():
    with respx.mock(assert_all_called=False) as respx_mock:
        route = respx_mock.get('https://test.retry.com').mock(
            side_effect=[
                httpx.Response(429, headers={"Retry-After": "0"}),
                httpx.Response(200, text="Success")
            ]
        )
        from etl.extractors.base import BaseExtractor
        extractor = BaseExtractor('test', 0.1)
        res = await extractor.fetch('https://test.retry.com', use_cache=False)
        assert res == "Success"
        assert route.call_count == 2
