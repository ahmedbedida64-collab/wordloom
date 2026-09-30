# PHASE 1: EXECUTION PLAN

## 1. Page Formula and Word Limits
- **App Definition:** The Wordloom app relies on pre-chunked data; it renders exactly 1 page per item in the JSON `chapters` array. It does not mathematically paginate text.
- **Resolution:** Since `words_per_page_override` is `null`, we will standardize **250 words = 1 page**. 
- **Limits:** 20 to 100 pages = **5,000 to 25,000 words per book**. 
- **Processing:** During ingestion, scripts will divide complete texts into ~250-word chunks (respecting paragraph boundaries) to populate the `chapters` array, ensuring the app renders 20-100 pages per book.

## 2. Source Decisions & Verdicts
Based on Phase 0 `robots.txt` and licence checks:
- **Project Gutenberg / Standard Ebooks:** `COPY-OK` (Tier 1). Will use these for classic texts (Author death <= 1955).
- **StoryWeaver:** `COPY-OK` (Tier 2). Will use for A1/A2 levels (CC BY 4.0), logging full attribution.
- **User Suggested Sites (Fabulang, WooEnglish, etc.):** `DISCOVERY-ONLY`. These sites host copyrighted publisher adaptations or their own proprietary rewrites. We will use them only to discover *what* titles fit *which* levels, then source the original texts from Tier 1.

## 3. Level-Threshold Plan
To place books into the app's exact scale (A1, A2, B1, B2, C1), we will calculate the following via script:
- **A1:** Flesch-Kincaid < 4.0 | Avg Sentence < 8 words
- **A2:** Flesch-Kincaid 4.0 - 6.0 | Avg Sentence 8 - 12 words
- **B1:** Flesch-Kincaid 6.0 - 8.0 | Avg Sentence 12 - 16 words
- **B2:** Flesch-Kincaid 8.0 - 10.0 | Avg Sentence 16 - 20 words
- **C1:** Flesch-Kincaid 10.0+ | Avg Sentence 20+ words
*Note: Script levels will be cross-referenced with a secondary LLM reading 3 excerpts. Discrepancies go to `level_review.md`.*

## 4. Expected Candidate Counts
- We aim to match the current library size: **96 books** distributed across the existing topic/level cells.
- We expect to fetch metadata for ~5,000 candidates from Gutenberg/Standard Ebooks to filter down to the exact 96 perfect matches.

## 5. Open Questions for User (Gate 1)
1. **Compilation Policy:** `allow_compilations` is currently set to `ask_at_gate_1`. Original, unadapted texts at the A1/A2 level that are 5,000+ words long are extremely rare. Do you approve using compilations (e.g., "25 Aesop's Fables") as a single "book" to hit the 20-page minimum for low levels?
2. **Page Standardization:** Do you approve the 250-word-per-page mathematical standard to solve the app's lack of dynamic pagination?
