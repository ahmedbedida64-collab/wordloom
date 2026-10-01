# TASK TRACKER

## Phase 0: Recon & Scope (Completed)
- [x] Check `robots.txt` and terms for suggested sources.
- [x] Write `RECON.md` and `library_spec.json`.
- [x] Write `SOURCE_DECISIONS.md`.
- [x] Establish git branch and `check_scope.sh`.

## Phase 1: Planning (Pending Gate 1)
- [x] Write `PLAN.md` with thresholds, formulas, and expected counts.
- [x] Initialize ledgers (`PROGRESS.json`, `CRAWL_LEDGER.jsonl`).
- [x] Receive `APPROVED` from user at Gate 1.

## Phase 2: Discovery
- [x] Run exhaustive discovery scripts on COPY-OK sources.
- [x] Generate `candidates.csv`.
- [x] Generate `LICENCE_REVIEW.md` and gap report.
- [x] Output Gate 2 Audit Packet and halt.

## Phase 3: Ingest & Integrity
- [x] Download, clean, and verify real texts.
- [x] Compute levels and topics.
- [x] Run `verify_book_integrity` script on all books — 21 passed, 0 failed.

## Phase 4: Covers
- [x] Write `COVER_STYLE.md`.
- [x] Generate concept briefs per book.
- [x] Generate covers in consistent photo pattern with 2:3 aspect ratio.
- [x] Run automated consistency checks (size, palette) — 21 passed, 0 failures.
- [x] Output contact sheet and review table.

## Phase 5: Swap & Verification (Completed)
- [x] Build new library in staging using frozen schema.
- [x] Conduct browser tests (first page, last page).
- [x] Take before/after layout screenshots.
- [x] Swap atomically in `index.html`.
- [x] Generate final report and rollback commands.

## Phase 6: Lexicon Coverage, Fast Translation & Reader Theme Polish (Completed)
- [x] Eliminate neon pink hover styles on reader words, harmonizing with antique parchment theme (`#5C4033` deep ink, subtle amber parchment highlight).
- [x] Build and inject 761 custom Arabic translations and 724 rich dictionary entries (Arabic translations + English definitions + parts of speech) directly into offline cache.
- [x] Pre-warm vocabulary tokens per reader page using `requestIdleCallback` for 0ms lookup latency.
- [x] Wire live English dictionary definitions via Datamuse API into modal `.explanation-box-text`, eliminating `"A useful word from this story."` placeholder.
- [x] Guard Match It game against missing/null DOM elements.
- [x] Validate with end-to-end Playwright test suite (`verify_translation_fix.js`).

## Phase 7: Button Design System Rollback & Bug Fix Preservation (Completed)
- [x] User-directed rollback: Reverted button redesigns across Reader (`← Library`), Settings, Custom Books, and Review cards back to original understated baseline (`45fedf6`).
- [x] Preserved all Phase 6 bug fixes and enhancements:
  - Syntax integrity verified with zero JS parse or execution errors.
  - 761 custom Arabic translations + 724 rich offline dictionary entries intact.
  - Zero-latency vocabulary lookup and Datamuse API definitions in `.explanation-box-text` fully operational.
  - Match It null-guards and review game state stability preserved.
  - Warm antique parchment hover theme (`#5C4033`, subtle amber highlight) preserved; neon pink styling eliminated.
  - Authentic Chapter 1 fable text ("The Fox and the Grapes") for Aesop's Fables preserved.
- [x] Scope validated with `./tools/library/check_scope.sh` (100% passing).
- [x] End-to-end verification passed across all test suites (`verify_translation_fix.js` 6/6 pass, `verify_browser_reader.js` 21/21 pass).

## Phase 8: Brown Natural Frame Button Design & Arrow Removal (Completed)
- [x] Removed all directional arrows (`←`, `→`, and `arrow_forward` icons) from back and forward buttons exclusively:
  - `#back-to-library`: `← Library` -> `Library`
  - `#reader-prev-btn`: `← Previous` -> `Previous`
  - `#reader-next-btn`: `Turn Page [arrow]` / `Next →` -> `Next` (both markup and JS pagination logic)
  - `#review-back-btn`: `← All methods` -> `All methods`
  - `#settings-view .back-link`: `← Back to Library` -> `Back to Library`
  - `#custom-book-view .back-link`: `← Back to Library` -> `Back to Library`
- [x] Applied unified "Brown Natural Frame" button styling across all back & forward buttons:
  - Border: `1.5px solid #8B5A2B` (warm natural brown frame)
  - Background: `#FAF4EB` (subtle parchment)
  - Text color: `#5C4033` (warm chestnut)
  - Border radius: `6px` (clean natural rectangular frame)
  - Subtle tactile hover lift (`#F0E5D5` background, `#3E271F` text)
  - Polished disabled states for pagination controls
  - Dark mode support (`body.theme-dark`)
- [x] Strictly kept all other buttons unchanged (book cards, filters, review cards, modals, form submits).
- [x] Preserved all existing Phase 6 & Phase 7 fixes (custom Arabic translations, offline dictionary, theme hover, Match It guards).
- [x] Fully verified with `verify_brown_frame_buttons.js`, `verify_translation_fix.js`, `verify_browser_reader.js`, and visual screenshots.

## Phase 9: Recreated 21st-Auth System & Custom Books Polish (Completed)
- [x] Built the authentication system from scratch following modern 21st-auth style patterns:
  - Dark aesthetic card (`#181411` background, `#2A221C` border, gold/amber highlights) with ambient top radial glow and top gradient beam.
  - Floating pill mode switcher: `Sign In` vs `Create Account`.
  - Self-contained inline SVG icons for input fields (`person`, `mail`, `lock`, `language/globe`, `info`, and `error`).
  - Interactive password visibility toggle swapping between eye-open and eye-off SVGs with zero text ligature flicker.
  - Demo quick-fill pill (`demo@wordloom.com` / `wordloom123`).
  - Social SSO buttons for Google (branded SVG) and GitHub (SVG) with hover specular feedback.
  - Streamlined guest access flow (`#auth-guest`).
- [x] Active reader account profile section in Settings (`#settings-view`):
  - Reader initials avatar badge, display name, email, and brown natural frame `#auth-signout` button.
- [x] Client-side auth engine (`WordloomAuth`):
  - FNV-1a salted password hashing with seed accounts and local registration.
  - Strict preservation of localStorage contracts (`wordloom-session`, `wordloom-language`).
- [x] Custom Books page action buttons and arrow removal:
  - Applied brown natural frame styling to `#import-local-book`, `#download-full-catalog`, and `#custom-book-view .back-link` (`1.5px solid #8B5A2B`, `#FAF4EB` background, `#5C4033` color, `6px` radius).
  - Replaced font ligature in hero upload icon with inline SVG.
  - Removed all arrows (`→`, `←`) from all buttons and repository cards across Custom Books.
- [x] Automated verification:
  - Complete E2E Playwright test suite in `tools/library/verify_recreated_auth_and_custom_books.js` (100% pass across all 7 test categories).
  - Responsive validation on iPhone (390x844) and desktop (1440x900) confirming 0 horizontal overflow.

## Phase 10: Reader Next/Previous Button Deduplication & Chrome Polish (Completed)
- [x] Resolved duplicate Next/Previous buttons in `.reader-controls`:
  - Removed stale duplicated buttons (`<button id="reader-prev-btn">← Previous</button>` and `<button id="reader-next-btn">Turn Page [arrow]</button>`) introduced during prior arrow-removal pass.
  - Kept exactly one clean pair: `#reader-prev-btn` ("Previous") and `#reader-next-btn` ("Next").
- [x] Removed duplicated `#back-to-library` in `.reader-chrome` and `#review-back-btn` in `#review-inside`.
- [x] Fixed CSS theme-dark selector prefixing in `index.html` lines 8504-8535 so `#back-to-library` maintains proper light-mode brown natural frame styling.
- [x] Hid `#react-nav-root` bottom navigation dock during active reading view (`showView('reading')`) and game views to eliminate overlapping on reader buttons.
- [x] Automated verification:
  - `tools/library/verify_brown_frame_buttons.js`: 100% passed across all 5 checks.
  - `tools/library/verify_browser_reader.js`: 21/21 passed.
  - Visual verification via Playwright screenshots on desktop (1440x900) and mobile (390x844) confirmed exactly 2 reader buttons and distraction-free layout.

## Phase 11: Full Screen Settings Page Design (Completed)
- [x] Transformed Settings view into an expansive, modern Full-Screen layout:
  - Expanded container from narrow 820px strip to full responsive desktop canvas (`max-width: 1360px`, `width: 100%`, `min-height: calc(100vh - 80px)`).
  - Modern full-width header banner with large editorial serif H1, eyebrow, subtitle, and dual action buttons (`Back to Library` and `Save settings`).
  - High-craft 12-column responsive dashboard card grid:
    - **Reading Typography & Rhythm** (Span 7): Full-width line size/shape, mother language, and live typography excerpt preview.
    - **Reader Profile & Security** (Span 5): Monogram avatar, active account badge, session status, and brown frame Sign Out button.
    - **Learning Benchmark** (Span 6): CEFR level selector and target comprehension guidance.
    - **Color Mood & Canvas** (Span 6): Interactive ambient palette chips (Parchment, Fern, Coral, Sky, Amber) with instant live preview.
  - Full-width sticky/bottom footer action bar with autosave notice.
  - Expanded Custom Books page (`#custom-book-view`) to matching 1360px full-screen container with responsive repository card grid.
- [x] Complete preservation of all contracts:
  - 100% intact 21 books in `WORDLOOM_CATALOG` and full dictionary.
  - All original element IDs and event handlers preserved.
- [x] Automated verification:
  - `verify_recreated_auth_and_custom_books.js`: 100% passed across all 7 categories.
  - `verify_brown_frame_buttons.js`: 100% passed across all 5 checks.
  - `verify_browser_reader.js`: 21/21 passed.
  - Multi-viewport screenshots on desktop (1440x900), tablet (1024x768), and mobile (390x844) confirming full-screen immersion and 0 horizontal overflow.
