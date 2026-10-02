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
    text2 = "Preface text\n\nChapter 1\nOnce upon a time...\n\nCHAPTER II The Next Day\nThey woke up."
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
    mock_response.text = '''
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
    '''
    
    extractor.client.models.generate_content = MagicMock(return_value=mock_response)
    
    result = extractor.extract_key_words(text, "A1")
    assert len(result) == 1
    assert result[0]['lemma'] == 'fox'
    assert result[0]['cefr_level'] == 'A2'
