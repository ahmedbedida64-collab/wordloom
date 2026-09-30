# PHASE 1: EXECUTION PLAN (Updated with Live Audit)

## 1. CRITICAL FINDING: Page Definition Conflict (Requires User Decision)

The live script audit of the existing `WORDLOOM_CATALOG` revealed:
- Books currently have **2 to 6 chapters** each (average 4.8).
- Each chapter contains **~121 words** on average.
- This means the app currently renders books as **2–6 pages**, not 20–100.

The prompt's requirement of "20 to 100 pages" using the **app's own definition** (1 chapter = 1 page) would require every replacement book to have **20 to 100 items** in its `chapters` array, each containing ~121 words. That equals **2,420 to 12,100 words per book**.

**This is achievable from Project Gutenberg short stories.** However, the current app uses ~535 words total per book (4–5 chapters × ~121 words). Replacing with 20–100 chapter books is a **100× increase in text**. This is technically fine (it's just more data), but I am flagging it because:
1. It fundamentally changes the reading experience length.
2. The `words_per_page_override: null` means we must use the app's live measurement.

**Open Question 1 (Critical):** Do you approve 20–100 **chapters** per book, each containing ~121 words (~2,400–12,100 words total per book), OR do you want to keep books at the same scale as existing (2–6 chapters, ~500–1000 words) and interpret "20 to 100 pages" differently?

## 2. Page Formula (Derived from Live Data)
- **Measured:** 1 page = 1 chapter object = ~121 words (median from current catalog).
- **Word limits under the prompt's rule:** min = 20 × 121 = **2,420 words**, max = 100 × 121 = **12,100 words**.
- **If user approves override:** We will use 250 words/page = min 5,000 / max 25,000 words.

## 3. Source Verdicts (from SOURCE_DECISIONS.md)
- **Project Gutenberg:** `COPY-OK` — Tier 1. Catalog feed + mirror downloads.
- **Standard Ebooks:** `COPY-OK` — Tier 1.
- **StoryWeaver (Pratham Books):** `COPY-OK` — Tier 2, CC BY 4.0. Use for A1/A2 slots.
- **All user-suggested sites:** `DISCOVERY-ONLY` or `BLOCKED` (documented in SOURCE_DECISIONS.md).

## 4. Level Thresholds (Documented)
Mapped to the app's levels using Flesch-Kincaid (FK) grade and average sentence length (ASL):
| Level | FK Grade | ASL (words) | % CEFR A1-A2 vocab |
|-------|----------|-------------|---------------------|
| A1    | < 3.0    | < 7         | > 90%               |
| A2    | 3.0–5.0  | 7–11        | 80–90%              |
| B1    | 5.0–7.5  | 11–15       | 70–80%              |
| B2    | 7.5–10.0 | 15–19       | 60–70%              |
| C1    | > 10.0   | > 19        | < 60%               |

Calibration references: Aesop's Fables (A2), Orwell's Animal Farm (B2), Oscar Wilde's The Importance of Being Earnest (C1).

## 5. Compilation Policy (allow_compilations: ask_at_gate_1)
**Open Question 2:** Real unadapted A1-level English texts of 2,400+ words are extremely scarce. Compilations (e.g., 25 Aesop's Fables as one book entry) solve this cleanly. Do you approve compilations for A1/A2 slots where no single text fits?

## 6. Expected Candidate Counts
- Gutenberg catalog: ~70,000 English texts. After filtering for: author death ≤ 1955, English, public domain, word count within range → expect ~500–2,000 viable candidates.
- Target: 96 books across 34 cells.

## 7. HANDOFF.md Status
Phase 0: DONE. Phase 1: DONE (pending Gate 1 approval). Phase 2: WAITING.


## 8. USER DECISIONS (Gate 1 — 2026-09-30)
- **Page length:** Option A. 20–100 chapters per book, ~121 words per chapter. Min words: 2,420. Max words: 12,100.
- **Compilations:** YES. Approved for A1/A2 slots where no single text fits.
- **words_per_page:** 121 (measured from live catalog). Chapters must contain ~100–150 words each.
- **Gate 1 status: APPROVED. Phase 2 is now unlocked.**
