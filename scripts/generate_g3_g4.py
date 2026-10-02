import os
from pathlib import Path

VOCAB = '''\
import os
import json
import spacy
from collections import Counter
from typing import List, Dict, Any
from google import genai
from pydantic import BaseModel, Field

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
            import spacy.cli
            spacy.cli.download("en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")

    def extract_candidates(self, text: str) -> list[tuple[str, int]]:
        doc = self.nlp(text)
        candidates = []
        for token in doc:
            if token.is_alpha and not token.is_stop and token.pos_ not in ['PROPN', 'PUNCT', 'SPACE']:
                candidates.append(token.lemma_.lower())
                
        freq = Counter(candidates)
        # Filter frequency >= 2
        valid = [(lemma, count) for lemma, count in freq.items() if count >= 2]
        # Sort by frequency descending
        valid.sort(key=lambda x: x[1], reverse=True)
        return valid[:100]  # Take top 100 to send to Gemini

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
        
        # In a real run, this hits the API. We will mock the client in tests.
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
'''

CHAPTER = '''\
import re
from typing import List, Dict

class ChapterDetector:
    def detect(self, text: str) -> List[Dict[str, str]]:
        # Common chapter patterns: Chapter 1, CHAPTER I, Book 1, etc.
        # We will split the text based on these headings.
        
        pattern = re.compile(
            r'^(?:Chapter|Book|Part)\s+[A-Za-z0-9]+.*$', 
            re.MULTILINE | re.IGNORECASE
        )
        
        matches = list(pattern.finditer(text))
        chapters = []
        
        if not matches:
            # G4: "every book has at least 1 chapter."
            return [{"title": "Chapter 1", "content": text.strip()}]
            
        for i, match in enumerate(matches):
            title = match.group().strip()
            start_idx = match.end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            content = text[start_idx:end_idx].strip()
            # If there's content before the first chapter, we can append it as Prologue or just ignore if it's boilerplate
            if i == 0 and match.start() > 50:
                pre_content = text[:match.start()].strip()
                if pre_content:
                    chapters.append({"title": "Prologue", "content": pre_content})
            
            if content:
                chapters.append({"title": title, "content": content})
                
        # Fallback if somehow empty
        if not chapters:
            chapters.append({"title": "Chapter 1", "content": text.strip()})
            
        return chapters
'''

TESTS = '''\
import pytest
from unittest.mock import MagicMock
from etl.enrichment.vocab import VocabExtractor
from etl.transformers.chapter_detector import ChapterDetector

def test_chapter_detector():
    detector = ChapterDetector()
    
    # Test single chapter fallback
    text1 = "Just some text without chapter markers."
    chaps1 = detector.detect(text1)
    assert len(chaps1) == 1
    assert chaps1[0]['title'] == "Chapter 1"
    
    # Test multiple chapters
    text2 = "Preface text\\n\\nChapter 1\\nOnce upon a time...\\n\\nCHAPTER II The Next Day\\nThey woke up."
    chaps2 = detector.detect(text2)
    assert len(chaps2) == 3
    assert chaps2[0]['title'] == "Prologue"
    assert "Preface text" in chaps2[0]['content']
    assert chaps2[1]['title'] == "Chapter 1"
    assert "Once upon a time..." in chaps2[1]['content']
    assert chaps2[2]['title'] == "CHAPTER II The Next Day"
    assert "They woke up." in chaps2[2]['content']

def test_vocab_extractor(monkeypatch):
    extractor = VocabExtractor(api_key="test")
    
    # Mock spaCy behavior
    text = "The quick brown fox jumps over the lazy dog. The fox is very quick."
    candidates = extractor.extract_candidates(text)
    # 'quick' and 'fox' appear twice
    assert ('fox', 2) in candidates
    assert ('quick', 2) in candidates
    
    # Mock Gemini response
    mock_response = MagicMock()
    mock_response.text = \'\'\'
    {
      "items": [
        {
          "lemma": "fox",
          "part_of_speech": "noun",
          "cefr_level": "A2",
          "definition_en": "a wild animal with a bushy tail",
          "simple_definition_en": "a small wild animal like a dog",
          "ipa_phonetic": "/fɒks/",
          "example_sentence": "The fox ran away."
        }
      ]
    }
    \'\'\'
    
    extractor.client.models.generate_content = MagicMock(return_value=mock_response)
    
    result = extractor.extract_key_words(text, "A1")
    assert len(result) == 1
    assert result[0]['lemma'] == 'fox'
    assert result[0]['cefr_level'] == 'A2'
'''

def main():
    with open('etl/enrichment/vocab.py', 'w') as f: f.write(VOCAB)
    with open('etl/transformers/chapter_detector.py', 'w') as f: f.write(CHAPTER)
    with open('tests/test_g3_g4.py', 'w') as f: f.write(TESTS)
    print("Generated G3 and G4")

if __name__ == '__main__':
    main()
