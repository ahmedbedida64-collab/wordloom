import json
import re
import os
import csv
from collections import Counter
from pathlib import Path
from PIL import Image

def extract_books_from_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract WORDLOOM_CATALOG array
    match = re.search(r'const WORDLOOM_CATALOG = (\[\s*\{.*?\}\s*\]);', content, re.DOTALL | re.MULTILINE)
    if not match:
        raise ValueError("Could not find WORDLOOM_CATALOG in index.html")
    
    json_str = match.group(1)
    
    # Clean up trailing commas and comments if any (simple JSON parsing)
    # The JSON inside index.html is well-formed enough for json.loads in this project
    try:
        books = json.loads(json_str)
    except json.JSONDecodeError as e:
        # If it fails, fallback to basic dict parsing
        print(f"JSON decode failed, attempting fallback. Error: {e}")
        books = []
    
    return books

def run_audit():
    html_path = 'index.html'
    covers_dir = Path('covers')
    out_books = Path('data/existing/books.jsonl')
    out_covers = Path('data/existing/covers.csv')
    out_audit = Path('docs/EXISTING_AUDIT.md')
    out_gaps = Path('docs/GAP_TARGETS.md')
    
    out_books.parent.mkdir(parents=True, exist_ok=True)
    out_audit.parent.mkdir(parents=True, exist_ok=True)
    
    books = extract_books_from_html(html_path)
    
    # Write books.jsonl
    with open(out_books, 'w', encoding='utf-8') as f:
        for book in books:
            f.write(json.dumps(book) + '\n')
            
    # Process covers
    cover_stats = []
    formats = Counter()
    dimensions = Counter()
    
    with open(out_covers, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['file_path', 'width', 'height', 'aspect_ratio', 'file_format', 'file_size'])
        
        if covers_dir.exists():
            for cover_file in covers_dir.iterdir():
                if cover_file.is_file() and not cover_file.name.startswith('.'):
                    try:
                        with Image.open(cover_file) as img:
                            width, height = img.size
                            aspect_ratio = round(width / height, 2) if height > 0 else 0
                            fmt = img.format
                            size = cover_file.stat().st_size
                            writer.writerow([str(cover_file), width, height, aspect_ratio, fmt, size])
                            formats[fmt] += 1
                            dimensions[f"{width}x{height}"] += 1
                    except Exception as e:
                        print(f"Error reading {cover_file}: {e}")

    # Generate Audit Report (C4)
    level_counts = Counter(b.get('level') for b in books)
    topic_counts = Counter(b.get('topic') for b in books)
    
    matrix = {}
    for b in books:
        lvl = b.get('level', 'Unknown')
        top = b.get('topic', 'Unknown')
        matrix.setdefault(lvl, Counter())[top] += 1
        
    audit_md = [
        "# Existing Data Audit",
        f"**Total Books:** {len(books)}",
        f"**Books without covers:** {sum(1 for b in books if not b.get('cover'))}",
        "\n## CEFR Levels",
        *[f"- {lvl}: {count}" for lvl, count in sorted(level_counts.items())],
        "\n## Topics",
        *[f"- {top}: {count}" for top, count in sorted(topic_counts.items())],
        "\n## Level × Topic Matrix"
    ]
    
    levels = sorted(matrix.keys())
    topics = sorted(set(top for b in books for top in [b.get('topic', 'Unknown')]))
    
    header = "| Level | " + " | ".join(topics) + " |"
    sep = "|---|---" + "|---" * (len(topics)-1) + "|"
    audit_md.append(header)
    audit_md.append(sep)
    for lvl in levels:
        row = f"| {lvl} | " + " | ".join(str(matrix[lvl].get(t, 0)) for t in topics) + " |"
        audit_md.append(row)
        
    audit_md.extend([
        "\n## Cover Stats",
        f"Most common dimensions: {dimensions.most_common(1)[0][0] if dimensions else 'N/A'}",
        f"Most common format: {formats.most_common(1)[0][0] if formats else 'N/A'}"
    ])
    
    with open(out_audit, 'w', encoding='utf-8') as f:
        f.write("\n".join(audit_md))
        
    # Generate GAP Targets (C5)
    # Target distribution of NEW books:
    # A1 15%, A2 20%, B1 25%, B2 20%, C1 15%, C2 5%
    # Topics: every level must cover at least 5 of the 10 topics.
    # We will compute the gap for a theoretical total of 2500 books.
    
    target_total = 2500
    targets = {
        'A1': int(target_total * 0.15),
        'A2': int(target_total * 0.20),
        'B1': int(target_total * 0.25),
        'B2': int(target_total * 0.20),
        'C1': int(target_total * 0.15),
        'C2': int(target_total * 0.05),
    }
    
    gaps_md = [
        "# Gap Targets (Target = 2500 books)",
        "This details the number of books needed to hit the target distribution.",
        "\n| Level | Current | Target | Gap |",
        "|---|---|---|---|"
    ]
    
    for lvl in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
        curr = level_counts.get(lvl, 0)
        targ = targets[lvl]
        gap = max(0, targ - curr)
        gaps_md.append(f"| {lvl} | {curr} | {targ} | {gap} |")
        
    with open(out_gaps, 'w', encoding='utf-8') as f:
        f.write("\n".join(gaps_md))

if __name__ == '__main__':
    run_audit()
