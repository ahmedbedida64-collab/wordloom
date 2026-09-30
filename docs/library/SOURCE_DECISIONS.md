# SOURCE DECISIONS

## 1. Suggested Sources Evaluation

1. **Fabulang (`https://www.fabulang.com`)**
   - **Robots.txt:** HTTP 200 (Accessible, 1 Disallow rule).
   - **Terms/Licence:** Offers original and adapted short stories for language learners. Custom proprietary terms.
   - **Verdict:** `DISCOVERY-ONLY` or `BLOCKED` unless explicitly added to `allowed_extra_sources`.

2. **LearnEnglish-New (`https://learnenglish-new.com`)**
   - **Robots.txt:** HTTP 200 (Accessible, 1 Disallow rule).
   - **Terms/Licence:** Hosts graded reader PDFs (often copyrighted publisher materials like Penguin Readers or OUP). 
   - **Verdict:** `BLOCKED` / `DISCOVERY-ONLY`. Unsafe for direct copying due to third-party publisher copyrights.

3. **WooEnglish (`https://wooenglish.com`)**
   - **Robots.txt:** HTTP 200 (Accessible, 1 Disallow rule).
   - **Terms/Licence:** Custom adapted stories and public domain rewrites. Proprietary site content.
   - **Verdict:** `DISCOVERY-ONLY`.

4. **Inklingo (`https://www.inklingo.app`)**
   - **Robots.txt:** Timed out / Inaccessible.
   - **Verdict:** `BLOCKED` (Cannot verify terms automatically; robots unverified).

5. **Readlang (`https://readlang.com`)**
   - **Robots.txt:** HTTP 200 (37 Disallow rules).
   - **Terms/Licence:** User-uploaded texts and imported content. Impossible to guarantee copyright clearance or original (unadapted) status.
   - **Verdict:** `DISCOVERY-ONLY` / `BLOCKED`.

6. **English E-Reader (`https://english-e-reader.net`)**
   - **Robots.txt:** HTTP 200 (30 Disallow rules).
   - **Terms/Licence:** Hosts graded readers from commercial publishers. High copyright risk.
   - **Verdict:** `DISCOVERY-ONLY`.

## 2. Tier 1 & 2 Approvals

- **Project Gutenberg:** `COPY-OK` for works where author died <= 1955. Will use catalog feed.
- **Standard Ebooks:** `COPY-OK` for works where author died <= 1955.
- **StoryWeaver:** `COPY-OK` (CC BY 4.0), requires strict attribution.

*All verdicts await final confirmation at Gate 1.*
