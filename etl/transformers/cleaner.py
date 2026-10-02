import re
import ftfy

class TextCleaner:
    def __init__(self):
        pass
        
    def clean(self, text: str) -> str:
        text = ftfy.fix_text(text)
        text = text.replace('"', '"').replace('"', '"').replace("'", "'").replace("'", "'")
        text = text.replace('—', '--').replace('–', '-')
        text = re.sub(r'([a-zA-Z])-\s+([a-zA-Z])', r'\1\2', text)
        text = text.replace('ſ', 's')
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
