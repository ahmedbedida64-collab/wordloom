# Wordloom Test Infrastructure & Quality Architecture

## 1. Test Philosophy

Wordloom is engineered as an autonomous, zero-dependency browser application contained within a single standalone `index.html` file, supported by `sw.js`, `manifest.json`, and static assets. Because Wordloom requires no compilation or build pipeline in production, testing must validate runtime observable behavior in real browser execution environments.

### Core Testing Tenets:
1. **Opaque-Box Testing:**
   Tests interact with Wordloom strictly through standard browser interfaces: the DOM, mouse/touch events, keyboard input, Web Storage (`localStorage`), IndexedDB, Web Speech API, and network requests. Internal JavaScript globals are inspected only for non-observable state verification (such as internal token counters or cache structures) when black-box DOM cues are insufficient.
2. **Requirement-Driven Verification:**
   Every test case is tied directly to authoritative requirements in `ORIGINAL_REQUEST.md`, `PROJECT.md`, `AGENTS.md`, and `docs/WORKFLOW.md`. Tests are derived from observable contracts rather than mirroring internal implementation details.
3. **Progressive Testability & Isolation:**
   Every test suite is fully self-contained. It prepares its own state, configures `localStorage` or session prerequisites cleanly via `addInitScript` or setup fixtures, avoids test order coupling, and leaves no residual side effects.
4. **Adversarial & Boundary Rigor:**
   Tests deliberately probe failure modes: corrupted JSON storage, extreme viewport dimensions, rapid click bursts, unhandled regex input, empty review decks, offline network disconnects, and strict design standard violations (including arrow glyph detection and color/radius checks).

---

## 2. The 4-Tier Opaque-Box Methodology

The Wordloom test architecture is organized into four distinct tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     WORDLOOM 4-TIER TEST ARCHITECTURE                  │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 1: Feature Coverage & Application Shell Integrity                │
│  - Core functionality across all 5 views (Library, Reader, Review,     │
│    Custom Books, Settings)                                             │
│  - 21-Book catalog integrity & chapter structures                      │
│  - Client-side auth (WordloomAuth) & Session lifecycle                 │
│  - Audio engine (SoundReader) voice profiles & archetypes              │
│  - Custom book text parsing & IndexedDB offline download               │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 2: Boundary, Corner Cases & Design Guardrails                    │
│  - Boundary page turns (Page 1 prev disabled, Last page 'Finished ✓') │
│  - Zero saved words empty states & practice deck generation            │
│  - Extreme search inputs (regex meta-characters, long queries)         │
│  - Corrupted localStorage JSON recovery & fallback defaults            │
│  - Brown Natural Frame compliance: 1.5px solid #8B5A2B, bg #FAF4EB,   │
│    color #5C4033, radius 6px across ALL buttons (incl. preview modal)  │
│  - Absolute Zero Arrow Glyphs Policy (prohibiting ←, →)                │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 3: Cross-Feature Combinations & State Transitions                │
│  - End-to-end learner journey: Sign in -> Select book -> Reader ->    │
│    Tokenize word -> Lookup translation -> Save to review ->            │
│    Practice across Flashcards, Match It, & Type What You Hear          │
│  - Settings customization sync -> Reader typography & voice update     │
│  - Cross-session persistence across all 7 primary localStorage keys   │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 4: Real-World Scenarios, Responsiveness & Offline Behavior       │
│  - Dual viewport validation: Mobile (390×844) & Desktop (1440×900)    │
│  - Strict zero horizontal overflow (scrollWidth <= clientWidth)        │
│  - Context-sensitive floating dock auto-hiding during reading & games  │
│  - Service Worker (sw.js) app shell caching & offline resilience       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Inventory Mapping against Test Tiers

The 75 features defined in `PROJECT.md` are systematically covered across the test suites:

| # | Feature Name | Primary Tier | Dedicated Test Script | Verification Method |
|---|--------------|--------------|-----------------------|---------------------|
| 1 | Single Photo-Cover Cards | Tier 1 | `tier1_feature_coverage.js` | Inspect `.mini-book` card DOM, cover images, badges |
| 2 | Level Filter Toolbar | Tier 1 | `tier1_feature_coverage.js` | Filter buttons (A1–C2), DOM book count changes |
| 3 | Topic Filter Toolbar | Tier 1 | `tier1_feature_coverage.js` | Topic category chips, shelf re-rendering |
| 4 | Real-Time Search Bar | Tier 1 / 2 | `tier1_feature_coverage.js`, `tier2_boundary_corner.js` | Text input, 160ms debounce, regex special chars |
| 5 | Library Tabs | Tier 1 | `tier1_feature_coverage.js` | Tab switching: All Books, Favorites, Reading History |
| 6 | Read / Continue Action Button | Tier 1 | `tier1_feature_coverage.js` | Button text: 'Read' vs 'Continue' based on progress |
| 7 | Favorite Heart Toggle | Tier 1 | `tier1_feature_coverage.js` | Click toggle, `♥` vs `♡`, `wordloom-favorites` |
| 8 | Book Preview Modal | Tier 1 / 2 | `tier1_feature_coverage.js`, `tier2_boundary_corner.js` | Modal open/close, brown frame button styling |
| 9 | Category Shelves Grouping | Tier 1 | `tier1_feature_coverage.js` | DOM structure of `.shelf-track` containers |
| 10 | 21-Book Core Catalog | Tier 1 | `verify_browser_reader.js` | 21 books, chapter limits, paragraph integrity |
| 11 | Catalog Text Authenticity | Tier 1 | `verify_browser_reader.js` | Verify authentic public-domain texts for all 21 books |
| 12 | Gutenberg Ingestion Sanitization | Tier 1 | `verify_browser_reader.js` | Verify absence of preface TOC dumps and notes |
| 13 | HTML Tag Sanitization | Tier 1 | `verify_browser_reader.js` | Verify unescaped HTML tags stripped from text |
| 14 | Distraction-Free Single Paper | Tier 1 | `tier1_feature_coverage.js` | Inspect `#reading-view`, single parchment sheet |
| 15 | First-Page Title Isolation | Tier 1 | `audit_app_features.js` | Title visible on Page 1; hidden on Page 2+ |
| 16 | Previous Page Navigation | Tier 1 / 2 | `tier1_feature_coverage.js`, `tier2_boundary_corner.js` | Page decrement, disabled state on Page 1 |
| 17 | Next Page Navigation | Tier 1 / 2 | `tier1_feature_coverage.js`, `tier2_boundary_corner.js` | Page increment, 'Finished ✓' on last page |
| 18 | Reading Status Indicator | Tier 1 | `tier1_feature_coverage.js` | `#reader-status` page progress string |
| 19 | Back to Library Navigation | Tier 1 / 2 | `verify_brown_frame_buttons.js` | Reader return button, styling, arrow absence |
| 20 | Interactive Word Tokens | Tier 1 | `tier1_feature_coverage.js` | Clickable `.word` elements with `data-word` |
| 21 | Dictionary & Translation Modal | Tier 1 | `verify_translation_fix.js` | Word popup, definition, multilingual translations |
| 22 | Dictionary Race Condition Fix | Tier 2 | `tier2_boundary_corner.js` | Rapid click bursts across multiple words |
| 23 | Reading Ruler Feature | Tier 1 | `tier1_feature_coverage.js` | Toggle button `#reader-ruler-btn`, guide line DOM |
| 24 | Reading Bookmark Resumption | Tier 3 | `tier3_cross_feature.js` | Resume last saved page upon opening reader |
| 25 | Active Reading Progress Tracking | Tier 3 | `tier3_cross_feature.js` | Verify `book.progress` calculation and persistence |
| 26 | Book Completion Celebration | Tier 2 / 3 | `tier2_boundary_corner.js`, `tier3_cross_feature.js` | Last page 'Finished ✓' completion modal & state |
| 27 | Typography Rhythm Scaling | Tier 1 | `screenshot_settings_fullscreen.js` | `cozy`, `standard`, `roomy` line heights |
| 28 | Multi-Profile Audio Engine | Tier 1 | `verify_voice_profiles.js` | 4 voice archetypes, SoundReader coordinator |
| 29 | 6-Tier Voice Fallback Resolution | Tier 1 | `verify_voice_profiles.js` | Hierarchical fallback resolution and blacklisting |
| 30 | Audio Lifecycle & GC Protection | Tier 1 | `verify_voice_profiles.js` | Utterance GC retention and `currentId` token counter |
| 31 | Dictionary Audio MP3 Fetch & Fallback | Tier 1 | `verify_voice_profiles.js` | Static MP3 playback and speech synthesis fallback |
| 32 | Match It Voice Consistency Fix | Tier 1 | `verify_voice_profiles.js` | Verify `SoundReader.speakWord()` in Match It |
| 33 | Spaced Repetition (SuperMemo SM-2) | Tier 1 / 3 | `tier3_cross_feature.js` | Rating intervals (Again, Hard, Good, Easy) |
| 34 | Review Hub 3-Card Method Stack | Tier 1 | `verify_type_what_you_hear.js` | Flashcards, Match It, Type What You Hear cards |
| 35 | Review Empty State & Sample Practice | Tier 2 | `tier2_boundary_corner.js` | Empty state card and sample word generator |
| 36 | Review Back Button | Tier 1 / 2 | `verify_brown_frame_buttons.js` | Return button from game to hub, brown styling |
| 37 | Flashcards Recall Mode | Tier 1 | `verify_translation_fix.js` | 4-choice quiz with distractors and audio cues |
| 38 | Flashcards Sentence Audio | Tier 1 | `verify_type_what_you_hear.js` | Context phrase audio button in flashcards |
| 39 | Match It Speed Pairing Mode | Tier 1 | `verify_translation_fix.js` | Two-column pairing, term/translation tiles |
| 40 | Match It Live HUD & Completion | Tier 1 | `verify_translation_fix.js` | Score HUD, mistakes, elapsed timer, victory overlay |
| 41 | Type What You Hear Mode | Tier 1 | `verify_type_what_you_hear.js` | Keyboard spelling from audio memory |
| 42 | Natural Audio Replay & Acoustic Waves | Tier 1 | `verify_type_what_you_hear.js` | Audio hero button and acoustic wave animation |
| 43 | TTW Full Phrase Audio | Tier 1 | `verify_type_what_you_hear.js` | Context phrase audio synthesis button |
| 44 | Progressive Letter Hints in TTW | Tier 1 | `verify_type_what_you_hear.js` | Incremental letter hints in input card |
| 45 | Case-Insensitive Spelling Check | Tier 1 | `verify_type_what_you_hear.js` | Upper/lower case verification against expected |
| 46 | TTW Results Summary Scorecard | Tier 1 | `verify_type_what_you_hear.js` | Session completion screen, accuracy metrics |
| 47 | Review Hub Translation Throttling | Tier 2 | `tier2_boundary_corner.js` | Batched/throttled outbound API requests |
| 48 | Vocabulary Meaning Fallback | Tier 2 | `tier2_boundary_corner.js` | Fallback definition if saved before async fetch |
| 49 | Remove Orphaned Popover | Tier 1 | `tier1_feature_coverage.js` | Clean DOM without `#quick-word-popover` |
| 50 | Client-Side Auth (WordloomAuth) | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Salted FNV-1a hashing, credential store |
| 51 | 21st-Auth Dark Modal Card | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Dark modal card with ambient radial glow |
| 52 | Auth Mode Switcher & Password Toggle | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Pill mode toggle, password eyeball toggle |
| 53 | Demo Quick-Fill Pill | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Demo account auto-fill pill button |
| 54 | Social SSO Simulation & Guest Mode | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Google, GitHub, and Guest access flows |
| 55 | Custom Books TXT Import & Paging | Tier 1 | `verify_recreated_auth_and_custom_books.js` | File reading, Gutenberg stripping, pagination |
| 56 | Custom Books Persistence | Tier 3 | `tier3_cross_feature.js` | Stored in `localStorage`, reloaded on startup |
| 57 | Custom Books UI Clarity | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Explicit TXT support messaging in UI |
| 58 | IndexedDB Catalog Download | Tier 1 | `tier1_feature_coverage.js` | Pre-download catalog to IndexedDB `wordloom-library` |
| 59 | Curated Literature Directory | Tier 1 | `tier1_feature_coverage.js` | Outbound links, `rel="noopener"`, arrow-free |
| 60 | Fluid 1360px Settings Dashboard | Tier 1 / 4 | `screenshot_settings_fullscreen.js` | 1360px max width container, responsive 12-col grid |
| 61 | Settings Voice Selector & Audio Preview | Tier 1 | `verify_voice_profiles.js` | Voice dropdown and sample audio preview |
| 62 | Settings Typography & Rhythm Controls | Tier 1 | `screenshot_settings_fullscreen.js` | Line height and language preference selectors |
| 63 | Settings Account Profile & Sign Out | Tier 1 | `verify_recreated_auth_and_custom_books.js` | Monogram avatar, user info, Sign Out action |
| 64 | CEFR Learning Benchmark & Goals | Tier 1 | `screenshot_settings_fullscreen.js` | Target level and reading goal customization |
| 65 | Ambient Color Mood Swatches | Tier 1 | `screenshot_settings_fullscreen.js` | 5 color mood chips (Parchment, Fern, Coral, Sky, Amber) |
| 66 | Brown Natural Frame Design Standard | Tier 2 | `verify_brown_frame_buttons.js`, `tier2_boundary_corner.js` | 1.5px solid #8B5A2B, #FAF4EB bg, 6px radius |
| 67 | Zero Arrow Glyphs Policy | Tier 2 | `verify_brown_frame_buttons.js`, `tier2_boundary_corner.js` | Strict arrow glyph scan across all buttons |
| 68 | Floating Gradient Menu Dock | Tier 1 / 4 | `tier1_feature_coverage.js`, `tier4_real_world.js` | 4-item gradient dock in navigation shell |
| 69 | Multi-Viewport Responsive Layout | Tier 4 | `tier4_real_world.js` | Mobile (390×844) & Desktop (1440×900) no overflow |
| 70 | Cross-Session Storage Persistence | Tier 3 | `tier3_cross_feature.js` | Full roundtrip persistence of all 7 storage keys |
| 71 | Service Worker App Shell Caching | Tier 4 | `tier4_real_world.js` | SW registration, caching of app shell, offline mode |
| 72 | Fix Standalone Translation Test | Tier 1 | `verify_translation_fix.js` | Fixed "Fox" locator bug and genuine translations |
| 73 | Unified Test Runner Integration | All | `run_all_tests.js` | Orchestrates all active test suites and reports scorecard |
| 74 | Comprehensive 4-Tier E2E Test Suite | All | `tools/library/tier[1-4]_*.js` | Complete coverage across feature, boundary, flow, & layout |
| 75 | Adversarial Coverage Hardening | Tier 2 / 4 | `tier2_boundary_corner.js`, `tier4_real_world.js` | Corrupted storage, offline network, burst interactions |

---

## 4. Architecture of Test Runners and Suites

### Directory Organization
```text
tools/
├── run_all_tests.js                     # Unified orchestrator executing all suites
└── library/
    ├── tier1_feature_coverage.js        # Tier 1: Core feature coverage across all 5 views
    ├── tier2_boundary_corner.js         # Tier 2: Boundaries, limits, brown frames & arrow scan
    ├── tier3_cross_feature.js           # Tier 3: Cross-subsystem integration & persistence
    ├── tier4_real_world.js              # Tier 4: Multi-viewport, offline SW & full journey
    ├── verify_translation_fix.js        # Multilingual dictionary & review games verification
    ├── verify_brown_frame_buttons.js    # Button design standard validator
    ├── verify_browser_reader.js         # 21-book catalog integrity validator
    ├── verify_recreated_auth_and_custom_books.js  # Auth & custom books validator
    ├── screenshot_settings_fullscreen.js # Full-screen settings layout validator
    ├── verify_type_what_you_hear.js     # Type What You Hear review mode validator
    └── verify_voice_profiles.js         # SoundReader voice archetypes validator
```

### Unified Runner Execution Pipeline (`tools/run_all_tests.js`)
The unified test runner executes each test suite in an isolated child process via `child_process.spawnSync`. It captures execution time, exit codes, and standard output. Upon completion of all suites, it renders a formatted scorecard summarizing individual suite durations and overall pass/fail status.

```bash
# Run all test suites
npm test
# OR
node tools/run_all_tests.js
```

### Quality Assurance Criteria
1. **Zero Unhandled Exceptions:** Browser console errors and unhandled promise rejections result in immediate test failure.
2. **Strict Design Standards:** Any button failing the Brown Natural Frame specification (`border: 1.5px solid #8B5A2B`, `background: #FAF4EB`, `color: #5C4033`, `border-radius: 6px`) or containing arrow glyphs (`←`, `→`) triggers an assertion error.
3. **Responsive Geometry:** `scrollWidth <= clientWidth` must hold true on all view containers across both Mobile (390×844) and Desktop (1440×900).
4. **Deterministic Exit Codes:** Every suite exits with code `0` on 100% success or code `1` on any assertion failure.
