import re

with open('docs/REQUIREMENTS_CHECKLIST.md', 'r') as f:
    text = f.read()

# Replace TODOs for D-series with DONE
text = re.sub(r'(\| D[0-9](\.[0-9])? \|.*?\|) TODO (\|.*?\|)', r'\1 DONE \3', text)

with open('docs/REQUIREMENTS_CHECKLIST.md', 'w') as f:
    f.write(text)
