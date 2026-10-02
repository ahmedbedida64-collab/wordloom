import json
import re
from pathlib import Path

def normalize(text):
    if not text: return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\b(a|an|the)\b', '', text)
    return " ".join(text.split())

in_file = Path('data/existing/books.jsonl')
out_file = Path('data/existing/legacy_keys.json')
keys = []

if in_file.exists():
    with open(in_file, 'r', encoding='utf-8') as f:
        for line in f:
            b = json.loads(line)
            key = normalize(f"{b.get('title','')} {b.get('author','')} {b.get('level','')}")
            keys.append({"id": b.get('title'), "key": key})

with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(keys, f, indent=2)

print(f"Normalized {len(keys)} legacy keys to {out_file}")
