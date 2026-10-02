import os
import json
import spacy
from collections import Counter
from typing import List, Dict, Any
from google import genai
from pydantic import BaseModel, Field
import spacy.cli

class VocabItem(BaseModel):
    lemma: str
    part_of_speech: str
    cefr_level: str
    definition_en: str
    simple_definition_en: str
    ipa_phonetic: str
    example_sentence: str

class VocabList(BaseModel):
    items: list[VocabItem]

class VocabExtractor:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        if not self.api_key or self.api_key == 'pending':
            self.api_key = "mock_key" # Bypass for testing
        self.client = genai.Client(api_key=self.api_key)
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            spacy.cli.download("en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")

    def extract_candidates(self, text: str) -> list[tuple[str, int]]:
        doc = self.nlp(text)
        candidates = []
        for token in doc:
            if token.is_alpha and not token.is_stop and token.pos_ not in ['PROPN', 'PUNCT', 'SPACE']:
                candidates.append(token.lemma_.lower())
                
        freq = Counter(candidates)
        valid = [(lemma, count) for lemma, count in freq.items() if count >= 2]
        valid.sort(key=lambda x: x[1], reverse=True)
        return valid[:100]

    def extract_key_words(self, text: str, book_level: str, target_count: int = 20) -> List[Dict[str, Any]]:
        candidates = self.extract_candidates(text)
        if not candidates:
            return []
            
        candidate_words = [c[0] for c in candidates]
        
        prompt = f"""
        Here is a list of frequent words from a text: {', '.join(candidate_words)}.
        The book is at CEFR level {book_level}.
        Select up to {target_count} words that are EXACTLY at level {book_level} or one level above.
        Do NOT include proper nouns.
        For each word, provide:
        - lemma
        - part_of_speech
        - cefr_level
        - definition_en (standard dictionary definition)
        - simple_definition_en (explained in very simple A2-level English)
        - ipa_phonetic (International Phonetic Alphabet)
        - example_sentence (a clear example using the word)
        """
        
        response = self.client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': VocabList,
                'temperature': 0.1
            }
        )
        
        try:
            data = json.loads(response.text)
            return data.get('items', [])
        except Exception:
            return []
