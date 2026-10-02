import os
import json
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any
from pathlib import Path

class CoverGenerator:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY', 'mock_key')
        # In a real scenario we'd instantiate genai client here
        self.template = (
            "A classic vintage watercolor book cover illustration of {main_scene}, related to {topic}. "
            "Muted earthy tones and sepia, delicate brushstrokes, nostalgic storybook feel. "
            "Central focal point leaving massive empty negative space at the top third of the image for text. "
            "No text, no letters, no logos. 8k resolution, masterpiece."
        )

    def _generate_main_scene(self, summary: str) -> str:
        # Mocking the Gemini flash text call to extract a scene from summary
        return "a quiet woodland path"

    def _generate_image(self, prompt: str) -> Image.Image:
        # Mocking gemini-3.1-flash-image (Nano Banana 2)
        # Returns a blank dummy image 800x1200
        return Image.new('RGB', (800, 1200), color='#FAF4EB')
        
    def _draw_text(self, img: Image.Image, title: str, author: str, cefr: str) -> Image.Image:
        # Mocking Pillow text overlay
        draw = ImageDraw.Draw(img)
        draw.text((100, 120), title, fill='#5C4033')
        draw.text((100, 240), author, fill='#8B5A2B')
        draw.text((700, 1100), cefr, fill='#4CAF50')
        return img

    def process_book(self, book: Dict[str, Any]) -> Dict[str, Any]:
        if book.get('cover_image_url'):
            return book
            
        scene = self._generate_main_scene(book.get('summary', ''))
        prompt = self.template.format(
            main_scene=scene, 
            topic=book.get('topics', ['general'])[0]
        )
        
        img = self._generate_image(prompt)
        img = self._draw_text(img, book.get('title', ''), book.get('author', ''), book.get('cefr_level_code', 'A1'))
        
        # Save
        book_id = book.get('id', 'temp_id')
        out_path = Path(f"assets/covers/{book_id}.jpg")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path)
        
        book['cover_image_url'] = str(out_path)
        book['cover_prompt'] = prompt
        book['cover_model'] = 'gemini-3.1-flash-image'
        book['cover_style_version'] = 1
        book['cover_style_score'] = 0.95 # Mocked score
        book['cover_status'] = 'approved'
        
        return book
