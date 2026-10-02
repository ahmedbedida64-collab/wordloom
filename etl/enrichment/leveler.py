import textstat
from typing import Dict, Any

class Leveler:
    def __init__(self):
        pass
        
    def _map_fkgl_to_cefr(self, fkgl: float) -> str:
        if fkgl < 2: return "A1"
        if fkgl < 4: return "A2"
        if fkgl < 6: return "B1"
        if fkgl < 8: return "B2"
        if fkgl < 10: return "C1"
        return "C2"
        
    def analyze(self, text: str) -> Dict[str, Any]:
        fkgl = textstat.flesch_kincaid_grade(text)
        fre = textstat.flesch_reading_ease(text)
        word_count = len(text.split())
        reading_time = max(1, word_count // 150)
        cefr = self._map_fkgl_to_cefr(fkgl)
        
        return {
            "fkgl_score": fkgl,
            "flesch_reading_ease": fre,
            "reading_time_minutes": reading_time,
            "total_words": word_count,
            "cefr_level_code": cefr
        }
