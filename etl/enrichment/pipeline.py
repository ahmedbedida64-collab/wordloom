import os
import json
from google import genai
from typing import Dict, Any, List

class EnrichmentPipeline:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY', 'mock_key')
        self.client = genai.Client(api_key=self.api_key)
        self.valid_topics = [
            "adventure", "biography", "business", "culture", "fantasy", 
            "history", "life", "mystery", "science", "travel"
        ]

    def _get_sample(self, text: str, sample_size: int = 1000) -> str:
        words = text.split()
        if len(words) <= sample_size:
            return text
        chunk = sample_size // 3
        start = " ".join(words[:chunk])
        mid_idx = len(words) // 2
        middle = " ".join(words[mid_idx - chunk//2 : mid_idx + chunk//2])
        end = " ".join(words[-chunk:])
        return f"{start}\n...\n{middle}\n...\n{end}"

    def run_gemini_checks(self, text: str, base_cefr: str) -> Dict[str, Any]:
        sample = self._get_sample(text)
        
        prompt = f"""
        Analyze this book sample.
        1. CEFR Level: Predict the CEFR level (A1, A2, B1, B2, C1, C2).
        2. Topics: Assign 1 to 3 topics from this exact list: {', '.join(self.valid_topics)}.
        3. Is Archaic/Translated: Is this an archaic, non-modern English translation (e.g. Victorian translation of classics)? (true/false)
        4. Content Safety: Does it contain graphic violence, slurs, or adult content? (true/false)
        5. Summary: Write a 2-3 sentence summary at or below {base_cefr} level.
        
        Return JSON with keys: cefr_prediction (str), topics (list of str), is_archaic (bool), is_unsafe (bool), summary (str).
        """
        
        response = self.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={'response_mime_type': 'application/json', 'temperature': 0.1}
        )
        
        try:
            data = json.loads(response.text)
        except Exception:
            data = {
                "cefr_prediction": base_cefr,
                "topics": ["culture"],
                "is_archaic": False,
                "is_unsafe": False,
                "summary": "Summary failed."
            }
            
        needs_review = data.get('is_unsafe', False)
        # Check CEFR diff if possible
        levels = ["A1", "A2", "B1", "B2", "C1", "C2"]
        pred = data.get("cefr_prediction", base_cefr)
        if pred in levels and base_cefr in levels:
            if abs(levels.index(pred) - levels.index(base_cefr)) > 1:
                needs_review = True
                
        return {
            "gemini_cefr": pred,
            "topics": [t for t in data.get("topics", []) if t in self.valid_topics][:3],
            "is_archaic": data.get("is_archaic", False),
            "is_unsafe": data.get("is_unsafe", False),
            "summary": data.get("summary", ""),
            "needs_review": needs_review
        }

    def generate_embedding(self, title: str, summary: str, text: str) -> List[float]:
        # Embed title + summary + first 2 pages (~500 words)
        words = text.split()
        content = f"{title}\n{summary}\n{' '.join(words[:500])}"
        response = self.client.models.embed_content(
            model='gemini-embedding-2',
            contents=content,
            config={'output_dimensionality': 1536}
        )
        try:
            return response.embeddings[0].values
        except Exception:
            return [0.0] * 1536
