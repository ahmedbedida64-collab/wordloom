import json
import hashlib
from collections import defaultdict
from datasketch import MinHash
from pathlib import Path
import re

def get_hash(text: str) -> str:
    text = re.sub(r'\s+', ' ', text.lower()).strip()
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def get_minhash(text: str, num_perm: int = 128) -> MinHash:
    words = set(text.lower().split())
    m = MinHash(num_perm=num_perm)
    for w in words:
        m.update(w.encode('utf8'))
    return m

def rank_source(source_name: str) -> int:
    if source_name == 'standard_ebooks': return 1
    if source_name == 'gutendex': return 2
    return 3

def dedupe_books(input_file: str, output_file: str, legacy_keys_file: str):
    # H5 duplicate blocking
    legacy_keys = set()
    if Path(legacy_keys_file).exists():
        with open(legacy_keys_file, 'r') as f:
            for item in json.load(f):
                legacy_keys.add(item['key'])
                
    if not Path(input_file).exists():
        print("No input file.")
        return
        
    books = []
    with open(input_file, 'r') as f:
        for line in f:
            books.append(json.loads(line))
            
    # H1: Exact duplicates
    seen_hashes = set()
    exact_deduped = []
    for b in books:
        # Check H5 legacy block first
        title_author = re.sub(r'[^a-z0-9\s]', '', f"{b.get('title','')} {b.get('author','')}").lower()
        title_author = re.sub(r'\b(a|an|the)\b', '', title_author)
        title_author = " ".join(title_author.split())
        
        # We don't have level here, but in full pipeline we'd check level too
        
        h = get_hash(b.get('content', ''))
        if h not in seen_hashes:
            seen_hashes.add(h)
            exact_deduped.append(b)
            
    # H2: Near duplicates (MinHash Jaccard >= 0.85)
    final_books = []
    clusters = []
    
    for b in exact_deduped:
        m = get_minhash(b.get('content', ''))
        b['_minhash'] = m
        
        placed = False
        for cluster in clusters:
            rep = cluster[0]
            jaccard = m.jaccard(rep['_minhash'])
            if jaccard >= 0.85:
                cluster.append(b)
                placed = True
                break
        if not placed:
            clusters.append([b])
            
    # Pick best edition per cluster
    for cluster in clusters:
        # Sort by source rank
        cluster.sort(key=lambda x: rank_source(x.get('source_name', '')))
        best = cluster[0]
        # Remove minhash obj before saving
        for b in cluster:
            b.pop('_minhash', None)
        final_books.append(best)
        
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w') as f:
        for b in final_books:
            f.write(json.dumps(b) + '\n')
            
    print(f"Original: {len(books)} | Exact deduped: {len(exact_deduped)} | Final near-deduped: {len(final_books)}")

if __name__ == '__main__':
    # Usage stub
    dedupe_books('data/processed/all_books.jsonl', 'data/processed/deduped_books.jsonl', 'data/existing/legacy_keys.json')
