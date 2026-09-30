# GATE 2 AUDIT PACKET
> Hand this to a Claude agent for independent audit.

## What Was Done (Phase 2)
1. Queried Gutendex API (gutenberg.com JSON catalog) via targeted topic searches.
2. Deduplicated by download URL. Produced `candidates.csv` (56 unique entries).
3. Excluded Agatha Christie (death 1976 > 1955 cutoff). All other candidates confirmed author death ≤ 1955.
4. Downloaded 8 representative texts, stripped Gutenberg boilerplate, measured exact word counts.
5. Wrote `LICENCE_REVIEW.md`, `GAP_REPORT.md`.

## Ledger Numbers
- Searches executed: 30 targeted topic queries
- Books discovered across searches: ~400 (many duplicates)
- Unique candidates (death ≤ 1955, has plain text): 56
- Spot-checked with actual downloads: 8
- Passed 2,420–12,100 word range: 1/8 (12.5%)

## Critical Finding
Most famous PG works are full novels (25,000–200,000 words), which are all
TOO LONG for the 20–100 page / 2,420–12,100 word range.
Only short stories and short novellas fit. These require compilation approach
(already approved at Gate 1) or a word-range relaxation.

## Sample Rows from candidates.csv
```
11,"Alice's Adventures in Wonderland","Carroll, Lewis",1898,A2,culture,...
46,"A Christmas Carol","Dickens, Charles",1870,B1,culture,...
1952,"The Yellow Wallpaper","Gilman, Charlotte Perkins",1935,B2,life,... ← IN RANGE
19994,"Aesop's Fables","Aesop",-420,A1,culture,... ← compilation candidate
5200,"The Metamorphosis","Kafka, Franz",1924,B1,life,...
```

## Files for Audit
- `docs/library/candidates.csv` — full candidate list
- `docs/library/LICENCE_REVIEW.md` — copyright verdicts
- `docs/library/GAP_REPORT.md` — honest gap analysis
- `docs/library/PLAN.md` — thresholds and decisions
- `docs/library/cache/text_*.txt` — downloaded raw texts

## Open Questions for User at Gate 2
1. Approve Option X (relax word range to allow chunking full novels into 20-100 chapters)?
2. Or keep Option Y (strict 2,420–12,100 words, accept gaps in A1/technology)?
