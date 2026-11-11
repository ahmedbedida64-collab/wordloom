# Project: Wordloom Production Hardening & E2E Validation

## Architecture
Wordloom is a zero-dependency standalone browser application packaged in a single `index.html` file (containing DOM markup, scoped `<style>` themes, embedded literature catalog `WORDLOOM_CATALOG`, and runtime `<script>` logic), accompanied by service worker `sw.js`, `manifest.json`, `icon.svg`, and book cover assets in `covers/`.

### Core Subsystems:
1. **Catalog & Library Subsystem**:
   - `WORDLOOM_CATALOG`: Embedded 21-book graded literature catalog with chapters, paragraphs, CEFR levels, and fine-art cover paths.
   - `WORDLOOM_GUTENBERG_EXTENDED`: 135 additional extended titles.
   - Library shelf organizer: Real-time search, CEFR difficulty filter (A1–C2), thematic topic filter, favorites, and reading history tabs.
   - Book preview modal and cover art framing.
2. **Reader & Typography Subsystem**:
   - Single paper parchment sheet with antique ornate frame.
   - Distraction-free title isolation (title header rendered exclusively on Page 1; hidden on Page 2+).
   - Chapter/page pagination with forward/back navigation.
   - Interactive word tokenization (`<button class="word">`) with multi-lingual dictionary lookup, offline fallback translations, and vocabulary bookmarking.
   - Typography rhythms (`cozy`, `standard`, `roomy`).
   - Interactive Reading Ruler focus guide.
   - Reading bookmark persistence and completion celebration.
3. **Audio Engine Subsystem (`SoundReader`)**:
   - Multi-profile narrator archetypes (`natural-female`, `natural-male`, `british-classic`, `studio-human`) plus Arabic speech priority.
   - 6-tier fallback voice resolution and robotic speech engine blacklist (`_VOICE_REJECT`).
   - Browser garbage collection protection (`activeUtterances: new Set()`) and concurrency token counter (`currentId`).
   - Dictionary audio MP3 playback with seamless speech synthesis fallback.
4. **Spaced Repetition & Review Games Subsystem**:
   - SuperMemo SM-2 interval calculations (`reviewWord`) persisted in `wordloom-vocabulary-records`.
   - Flashcards recall mode (4-choice quiz with Fisher-Yates distractors, word and sentence audio).
   - Match It speed pairing mode (two-column matching, live score/mistakes HUD, completion overlay).
   - Type What You Hear (TTW) spelling mode (pure keyboard entry, progressive letter hints, acoustic audio replay, mastery scorecard).
5. **Authentication & Custom Books Subsystem**:
   - `WordloomAuth`: Pure client-side salted FNV-1a hashing, seeded demo accounts, user registration, social SSO simulation, and guest mode.
   - Session locking (`.auth-locked`) and profile badge in Settings.
   - Custom book import (TXT parser, Gutenberg header/footer stripper, paragraph chunking, local persistence in `wordloom-custom-books`).
   - IndexedDB catalog offline storage (`downloadLibrary()`).
6. **Navigation, Viewport & Design Guardrails**:
   - 4-item floating gradient menu dock (Library, Review, Custom Book, Settings), auto-hiding during active reading and games.
   - Brown Natural Frame design standard: `1.5px solid #8B5A2B`, background `#FAF4EB`, color `#5C4033`, radius `6px`, with zero arrow glyphs (`←`, `→`).
   - Responsive multi-viewport layouts (390×844 mobile and 1440×900 desktop) with zero horizontal overflow (`scrollWidth <= clientWidth`).
   - Service Worker (`sw.js`) network-first offline caching and cache lifecycle.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Single Photo-Cover Cards | Cards with fine-art covers, overlaid title/author/level/length badges | M3 | survey:spec_miner_3 |
| 2 | Level Filter Toolbar | Filters shelf by CEFR band (All, A1, A2, B1, B2, C1, C2) | M3 | survey:spec_miner_3 |
| 3 | Topic Filter Toolbar | Filters catalog by thematic category (Everyday Life, Travel, Science, etc.) | M3 | survey:spec_miner_3 |
| 4 | Real-Time Search Bar | Case-insensitive title, author, topic, level, source search with 160ms debounce | M3 | survey:spec_miner_3 |
| 5 | Library Tabs | Toggles view between all books, favorites, and reading history | M1 | survey:spec_miner_3 |
| 6 | Read / Continue Action Button | Card button: shows "Continue" if in-progress, "Read" otherwise | M1 | survey:explorer_1 |
| 7 | Favorite Heart Toggle | Toggles favorite status in `wordloom-favorites` with heart glyph | M3 | survey:spec_miner_3 |
| 8 | Book Preview Modal | Modal showing enlarged cover, kicker, CEFR level, length, description | M3 | survey:spec_miner_3 |
| 9 | Category Shelves Grouping | Organizes catalog into thematic shelves with horizontal tracks | M3 | survey:spec_miner_3 |
| 10 | 21-Book Core Catalog | Embedded literature catalog with 21 curated titles | M1 | survey:explorer_1 |
| 11 | Catalog Text Authenticity | Verify and correct text mismatches for Chekhov, Hardy, Irving, Kipling, London, Maupassant | M1 | survey:explorer_1 |
| 12 | Gutenberg Ingestion Sanitization | Strip transcriber notes, TOC dumps, and ASCII image placeholders from stories | M1 | survey:explorer_1 |
| 13 | HTML Tag Sanitization | Clean unescaped HTML tags in paragraphs to prevent word tokenization corruption | M1 | survey:explorer_1 |
| 14 | Distraction-Free Single Paper | Antique parchment sheet layout with ornate frame | M1 | survey:spec_miner_3 |
| 15 | First-Page Title Isolation | Displays book title header exclusively on page 1 of every book | M1 | survey:spec_miner_3 |
| 16 | Previous Page Navigation | Navigates to previous chapter without arrows (Brown Natural Frame) | M1 | survey:spec_miner_3 |
| 17 | Next Page Navigation | Navigates to next chapter without arrows (Brown Natural Frame) | M1 | survey:spec_miner_3 |
| 18 | Reading Status Indicator | Shows current progress in header chrome (e.g. "Page 1 of 100") | M1 | survey:spec_miner_3 |
| 19 | Back to Library Navigation | Returns to library from reader; Brown Natural Frame, no arrows | M3 | survey:spec_miner_3 |
| 20 | Interactive Word Tokens | Wraps every word in interactive clickable button with context | M1 | survey:explorer_1 |
| 21 | Dictionary & Translation Modal | Pops up word translation, speech audio, and context in mother language | M1 | survey:explorer_1 |
| 22 | Dictionary Race Condition Fix | Add active request-token to prevent rapid word clicks overwriting popups | M1 | survey:explorer_1 |
| 23 | Reading Ruler Feature | Implement interactive horizontal focus guide line in reader with toggle | M1 | survey:explorer_1 |
| 24 | Reading Bookmark Resumption | Resume reader at last saved page from reading history in `openReader()` | M1 | survey:explorer_1 |
| 25 | Active Reading Progress Tracking | Calculate and persist `book.progress` percentage across sessions | M1 | survey:explorer_1 |
| 26 | Book Completion Celebration | Handle final page "Finished ✓" with completion recording and milestone UI | M1 | survey:explorer_1 |
| 27 | Typography Rhythm Scaling | Configures line height and spacing (cozy, standard, roomy) | M1 | survey:spec_miner_3 |
| 28 | Multi-Profile Audio Engine | SoundReader with 4 narrator archetypes and Arabic priorities | M2 | survey:explorer_2 |
| 29 | 6-Tier Voice Fallback Resolution | Hierarchical voice resolution with low-grade synthesizer blacklist | M2 | survey:explorer_2 |
| 30 | Audio Lifecycle & GC Protection | Prevents utterance GC drops via activeUtterances Set and currentId counter | M2 | survey:explorer_2 |
| 31 | Dictionary Audio MP3 Fetch & Fallback | Plays Google static MP3 with automatic speech synthesis fallback | M2 | survey:explorer_2 |
| 32 | Match It Voice Consistency Fix | Call SoundReader.speakWord() instead of hardcoded British MP3 | M2 | survey:explorer_2 |
| 33 | Spaced Repetition (SuperMemo SM-2) | Computes review intervals and repetition counts in vocabulary records | M2 | survey:explorer_2 |
| 34 | Review Hub 3-Card Method Stack | Review dashboard displaying Flashcards, Match It, Type What You Hear | M2 | survey:spec_miner_3 |
| 35 | Review Empty State & Sample Practice | Empty state with browse library and sample word generation buttons | M2 | survey:spec_miner_3 |
| 36 | Review Back Button | Return action from game view to review hub (Brown Natural Frame) | M3 | survey:spec_miner_3 |
| 37 | Flashcards Recall Mode | 4-choice translation quiz with Fisher-Yates distractors and audio cues | M2 | survey:explorer_2 |
| 38 | Flashcards Sentence Audio | Speaks full sentence context with natural clear prosody | M2 | survey:explorer_2 |
| 39 | Match It Speed Pairing Mode | 6-word round pairing matching English terms to translations | M2 | survey:explorer_2 |
| 40 | Match It Live HUD & Completion | Live score, mistake counter, elapsed timer, and completion victory modal | M2 | survey:explorer_2 |
| 41 | Type What You Hear Mode | Pure keyboard spelling from audio memory with blanked sentence | M2 | survey:explorer_2 |
| 42 | Natural Audio Replay & Acoustic Waves | Hero audio replay with speaker acoustic animation | M2 | survey:explorer_2 |
| 43 | TTW Full Phrase Audio | Plays full sentence context audio during spelling exercise | M2 | survey:explorer_2 |
| 44 | Progressive Letter Hints in TTW | Incrementally reveals letters one by one while keeping input open | M2 | survey:explorer_2 |
| 45 | Case-Insensitive Spelling Check | Validates user spelling against target word regardless of casing | M2 | survey:explorer_2 |
| 46 | TTW Results Summary Scorecard | Displays mastery score and summary cards with first-try badges | M2 | survey:explorer_2 |
| 47 | Review Hub Translation Throttling | Batch/throttle outbound translation requests to prevent network storms | M2 | survey:explorer_2 |
| 48 | Vocabulary Meaning Fallback | Ensure immediate fallback meaning if saved before async translation completes | M2 | survey:explorer_1 |
| 49 | Remove Orphaned Popover | Eliminate dead `#quick-word-popover` element from DOM | M2 | survey:explorer_2 |
| 50 | Client-Side Auth (WordloomAuth) | Pure client-side salted FNV-1a hashing and session management | M2 | survey:explorer_2 |
| 51 | 21st-Auth Dark Modal Card | Dark aesthetic auth card with ambient radial glow | M3 | survey:spec_miner_3 |
| 52 | Auth Mode Switcher & Password Toggle | Pill toggle for sign-in/sign-up and eyeball password reveal | M3 | survey:spec_miner_3 |
| 53 | Demo Quick-Fill Pill | One-click button filling demo credentials in sign-in form | M3 | survey:spec_miner_3 |
| 54 | Social SSO Simulation & Guest Mode | Simulated Google/GitHub logins and frictionless guest access | M2 | survey:explorer_2 |
| 55 | Custom Books TXT Import & Paging | Reads TXT, strips Gutenberg headers/footers, paginates by word count | M2 | survey:explorer_2 |
| 56 | Custom Books Persistence | Persist imported books to `localStorage` and reload into `books` on startup | M2 | survey:explorer_2 |
| 57 | Custom Books UI Clarity | Clarify PDF/TXT messaging or add text extraction handling | M2 | survey:explorer_2 |
| 58 | IndexedDB Catalog Download | Pre-downloads catalog into browser IndexedDB for 100% offline access | M2 | survey:spec_miner_3 |
| 59 | Curated Literature Directory | Outbound literature source links with rel="noopener", arrow-free | M3 | survey:spec_miner_3 |
| 60 | Fluid 1360px Settings Dashboard | Full-screen settings dashboard constrained to 1360px canvas | M3 | survey:spec_miner_3 |
| 61 | Settings Voice Selector & Audio Preview | Dropdown with 4 archetypes and audible preview button | M3 | survey:spec_miner_3 |
| 62 | Settings Typography & Rhythm Controls | Selectors for reading line height and mother language | M3 | survey:spec_miner_3 |
| 63 | Settings Account Profile & Sign Out | Monogram avatar, name, email, and Brown Natural Frame sign-out button | M3 | survey:spec_miner_3 |
| 64 | CEFR Learning Benchmark & Goals | Level selection (A1–C2) and learning goal customization | M3 | survey:spec_miner_3 |
| 65 | Ambient Color Mood Swatches | 5 palette chips (Parchment, Fern, Coral, Sky, Amber) | M3 | survey:spec_miner_3 |
| 66 | Brown Natural Frame Design Standard | 1.5px solid #8B5A2B, bg #FAF4EB, color #5C4033, radius 6px on all buttons | M3 | survey:spec_miner_3 |
| 67 | Zero Arrow Glyphs Policy | Complete prohibition of ←, → on all buttons; fix book preview modal violation | M3 | survey:spec_miner_3 |
| 68 | Floating Gradient Menu Dock | 4-item gradient dock, auto-hiding during reading and games | M3 | survey:spec_miner_3 |
| 69 | Multi-Viewport Responsive Layout | 390x844 mobile and 1440x900 desktop zero horizontal overflow | M3 | survey:spec_miner_3 |
| 70 | Cross-Session Storage Persistence | Persistence across all 7 specified storage keys | M2 | survey:explorer_2 |
| 71 | Service Worker App Shell Caching | sw.js pre-caches core assets and handles network-first offline strategy | M3 | survey:spec_miner_3 |
| 72 | Fix Standalone Translation Test | Fix "Fox" locator bug in `tools/library/verify_translation_fix.js` | M4 | survey:spec_miner_3 |
| 73 | Unified Test Runner Integration | Integrate all test suites into `tools/run_all_tests.js` | M4 | survey:spec_miner_3 |
| 74 | Comprehensive 4-Tier E2E Test Suite | Opaque-box test suite across Tiers 1-4 with TEST_READY.md | M4 | test_track |
| 75 | Adversarial Coverage Hardening (Tier 5) | White-box adversarial testing and forensic integrity verification | M5 | test_track |

Every one of the 75 features discovered in the Survey phase is explicitly assigned to a milestone above.

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Catalog Data & Reader Mechanics Remediation | Correct 6 mismatched books in `WORDLOOM_CATALOG`, sanitize Gutenberg prefaces/TOCs, strip 25 ASCII placeholders, clean HTML tags in Wessex Tales, implement Reading Ruler, enable bookmark resumption in `openReader()`, update/persist `book.progress`, implement book completion flow on "Finished ✓", fix dictionary popup race condition. | None | DONE (`worker_m1`: `cbe3e311-fa2b-4b97-8b43-734d08bacd6e`) |
| M2 | Audio Engine, Review Games, Auth & Custom Books Remediation | Fix Match It audio to use `SoundReader.speakWord()`, throttle Review Hub translation requests, ensure immediate fallback meaning on rapid save, persist custom books to `localStorage` and reload on startup, clarify PDF/TXT UI, remove dead `#quick-word-popover`. | None | IN_PROGRESS (`worker_m2_3`: `c2f0505b-dc8d-48cb-af28-275a6085a48d`) |
| M3 | UI Views, Responsive Layout, Design Guardrails & Service Worker | Fix arrow glyph violation in `#book-preview-modal`, enforce Brown Natural Frame styling on preview modal buttons and all action buttons, ensure 390x844 and 1440x900 zero overflow, ensure `sw.js` cache handling and offline cover resilience. | M1, M2 | IN_PROGRESS (`worker_m2_3`: `c2f0505b-dc8d-48cb-af28-275a6085a48d`) |
| M4 | E2E Testing Suite (Tiers 1-4) & Test Runner Integration | Fix `verify_translation_fix.js`, build comprehensive 4-tier opaque-box E2E test suite, integrate suites into `tools/run_all_tests.js`, publish `TEST_READY.md`. | M1, M2, M3 | DONE (`test_writer_track`: `78dccfbd-b4df-4a0e-9017-7dacb746e33e`, 11/11 passing) |
| M5 | 100% E2E Test Pass, Tier 5 Adversarial Hardening & Forensic Audit | Pass 100% of E2E test suite, run Challenger Tier 5 adversarial stress tests, perform Forensic Auditor integrity verification, final quality gate pass. | M4 | PLANNED |

---

## Interface Contracts

### Reader ↔ Catalog & Storage
- `openReader(title)`:
  - Input: `title: string`
  - Reads `localStorage.getItem('wordloom-reading-history')` for existing bookmark.
  - If bookmark exists for `title`, sets `readerState.page = bookmark.page`; otherwise `0`.
  - Calls `renderReaderState()`.
- `recordReadingPage(title, page, totalPages)`:
  - Updates `book.progress = Math.round(((page + 1) / totalPages) * 100)`.
  - Persists `readingHistory[title] = { page, progress: book.progress, lastRead: Date.now() }`.
  - Persists to `localStorage['wordloom-reading-history']`.
  - Updates library card button text `${book.progress ? 'Continue' : 'Read'}`.

### Reader ↔ Reading Ruler
- `toggleReadingRuler()`:
  - Toggles `.reading-ruler-active` on `#reading-view`.
  - Creates or updates `#reading-ruler-guide` element position following pointer/touch or centered on active line.
  - Button `#reader-ruler-btn` in reader chrome toggles active state.

### Reader / Review Games ↔ SoundReader
- `SoundReader.speakWord(word, options)`:
  - Input: `word: string`, `options?: { rate, pitch, timeoutMs }`
  - Resolves voice archetype from `localStorage['wordloom-voice'] || 'natural-female'`.
  - Plays Google static dictionary MP3 if available and profile is not male; falls back gracefully to `SpeechSynthesisUtterance`.
  - Returns `Promise<void>`.
- In Match It (`matchOnTileClick`): Replace direct `https://ssl.gstatic.com/...` with `SoundReader.speakWord(el.dataset.text)`.

### Custom Books ↔ Local Storage
- Custom Book schema:
  `{ title, author, level: 'B1', topic: 'life', cover: 'cover-amber', photo, progress: 0, source: 'Imported Text', length, chapters }`
- On file import:
  - Add to in-memory `books.unshift(customBook)`.
  - Append to `localStorage['wordloom-custom-books']`.
- On application boot:
  - Read `localStorage.getItem('wordloom-custom-books')`.
  - If present, parse and unshift existing custom books into `books` array before rendering library.

### Book Preview Modal ↔ Design Guardrails
- `#book-preview-modal .book-preview-actions`:
  - Primary button: `<button class="brown-button" data-book-preview-start="${activeBook.title}" type="button">Start reading</button>` (strictly NO arrow `<span>→</span>`).
  - Secondary button: `<button class="brown-button-secondary" data-book-preview-close type="button">Not now</button>`.
  - Both strictly conform to: `1.5px solid #8B5A2B`, background `#FAF4EB`, color `#5C4033`, radius `6px`.

---

## Code Layout
- `index.html`: Standalone browser application containing DOM markup, `<style>`, catalog data, and `<script>`.
- `sw.js`: Service Worker caching app shell and runtime GET requests.
- `manifest.json`: Web application manifest.
- `icon.svg`: Application icon.
- `covers/`: JPEG fine-art book cover art images (`cover_*.jpg`).
- `tools/run_all_tests.js`: Canonical test runner script executing all verification suites.
- `tools/library/`: Automated Playwright/Puppeteer test scripts and builder tools.
- `.agents/teamwork/`: Orchestrator and agent metadata, plans, and reports (NO source code here).
