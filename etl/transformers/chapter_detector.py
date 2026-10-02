import re
from typing import List, Dict

class ChapterDetector:
    def detect(self, text: str) -> List[Dict[str, str]]:
        pattern = re.compile(
            r'^(?:Chapter|Book|Part)\s+[A-Za-z0-9]+.*$', 
            re.MULTILINE | re.IGNORECASE
        )
        
        matches = list(pattern.finditer(text))
        chapters = []
        
        if not matches:
            return [{"title": "Chapter 1", "content": text.strip()}]
            
        for i, match in enumerate(matches):
            title = match.group().strip()
            start_idx = match.end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(text)
            
            content = text[start_idx:end_idx].strip()
            if i == 0 and match.start() > 0:
                pre_content = text[:match.start()].strip()
                if pre_content:
                    chapters.append({"title": "Prologue", "content": pre_content})
            
            if content:
                chapters.append({"title": title, "content": content})
                
        if not chapters:
            chapters.append({"title": "Chapter 1", "content": text.strip()})
            
        return chapters
