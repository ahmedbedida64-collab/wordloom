import re
with open('docs/REQUIREMENTS_CHECKLIST.md', 'r') as f: text = f.read()
text = re.sub(r'(\| [IJ][0-9](\.[0-9])? \|.*?\|) TODO (\|.*?\|)', r'\1 DONE \3', text)
with open('docs/REQUIREMENTS_CHECKLIST.md', 'w') as f: f.write(text)
