# Wordloom Workflow & Engineering Guide

This document defines the architecture, development guardrails, verification protocols, and release workflows for Wordloom.

---

## 1. Project Philosophy & Architecture

Wordloom is designed as an **autonomous, zero-build standalone application**:
- **Zero Tooling Requirement:** The entire product runs directly in any modern browser without requiring compilation, bundling, or node runtimes in production.
- **Standalone Runtime ([`index.html`](../index.html)):** Unifies markup, styling (`<style>`), the 21-book literature catalog (`WORDLOOM_CATALOG`), offline dictionary caches, client-side authentication (`WordloomAuth`), and interactive reading engines into a single file.
- **PWA & Offline Capability:** Caches the shell and books locally via [`sw.js`](../sw.js), [`manifest.json`](../manifest.json), and client `IndexedDB` / `localStorage`.

---

## 2. Directory Hierarchy

```text
├── index.html                  # Unified standalone application (markup, CSS, catalog, scripts)
├── manifest.json               # Web App Manifest for PWA installation
├── sw.js                       # Service Worker caching offline shell & assets
├── icon.svg                    # Brand emblem icon
├── package.json                # Standard npm scripts for local testing & serving
├── .gitignore                  # Git hygiene rules
├── covers/                     # 21 authentic 19th-century fine art photographic book covers
│   ├── cover_aesop_fables.jpg
│   └── ... (21 verified covers)
├── tools/                      # Engineering, verification, and compilation toolchain
│   ├── run_all_tests.js        # Canonical unified test runner CLI
│   ├── test.sh                 # Quick executable shell test runner
│   └── library/                # Domain-specific verification scripts
│       ├── verify_brown_frame_buttons.js
│       ├── verify_browser_reader.js
│       ├── verify_recreated_auth_and_custom_books.js
│       ├── screenshot_settings_fullscreen.js
│       └── build_full_screen_index.py
└── docs/                       # Project documentation, audits, and visual artifacts
    ├── WORKFLOW.md             # This workflow & engineering guide
    ├── screenshots/            # Automated multi-viewport test screenshots
    └── library/                # Ingest ledgers, task tracking, and milestone reports
        ├── TASKS.md            # Master phase task tracker (Phases 0 through 11)
        └── FINAL_REPORT.md     # Phase 5 catalog verification sign-off
```

---

## 3. Product & Design Conventions

### A. Navigation & Shell
* **Modern Floating Menu Dock:** A balanced 4-item floating gradient dock rendering `Library`, `Review`, `Custom Book`, and `Settings`.
* **Reader Isolation:** When reading view (`#reading-view`) or active game view is open, the floating dock automatically hides (`display: none !important`), preserving an unobstructed, distraction-free reading sheet.

### B. Brown Natural Frame Button Standard
All back, forward, and action buttons strictly adhere to the unified Brown Natural Frame system:
* **Border:** `1.5px solid #8B5A2B` (warm natural brown)
* **Background:** `#FAF4EB` (natural parchment)
* **Text Color:** `#5C4033` (warm deep chestnut)
* **Border Radius:** `6px` (clean natural rectangular frame)
* **Hover State:** Background `#F0E5D5`, text `#3E271F`, subtle tactile 1px lift.
* **No Directional Arrows:** Back and forward buttons must **never** contain arrows (`←`, `→`, or arrow icon fonts). Clean text labels (`Library`, `Previous`, `Next`, `Back to Library`, `All methods`) are used exclusively.

### C. Full-Screen Settings Dashboard
* Settings page spans a fluid **1360px** wide canvas (`max-width: 1360px; min-height: calc(100vh - 80px)`).
* Organized into a responsive 12-column grid:
  1. *Reading Typography & Rhythm (Span 7):* Line size/shape, mother language, and live typography excerpt preview.
  2. *Reader Profile & Security (Span 5):* Account monogram avatar, user email, session status, and Sign Out.
  3. *Learning Benchmark (Span 6):* CEFR level selector and guidance.
  4. *Color Mood & Canvas (Span 6):* Interactive swatches for Parchment, Fern, Coral, Sky, Amber.

### D. Client-Side Authentication (`WordloomAuth`)
* **Dark Aesthetic Modal Card:** 21st-auth style with ambient radial glow, gold/amber beam, pill mode switcher (`Sign In` vs `Create Account`), and inline SVGs.
* **Local Crypto Engine:** Salted FNV-1a hashing with demo seeds (`demo@wordloom.com` / `wordloom123`), local registration, and Google/GitHub/Guest SSO simulators.

---

## 4. Development & Editing Guardrails

When working with [`index.html`](../index.html):

1. **Syntax Pre-Check:**
   Always run a syntax verification before and after major edits:
   ```bash
   node -e "const fs = require('fs'); const html = fs.readFileSync('index.html', 'utf8'); const s = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi); s.forEach((b, i) => { try { new Function(b.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')); console.log('Script', i, 'OK'); } catch (e) { console.error('Script', i, 'ERR:', e.message); } });"
   ```
2. **Prevent Truncation:**
   Because `index.html` contains the full 21-book catalog (~2.2MB), avoid blind full-file overwrites. Target precise line ranges when editing, or use targeted python scripts in `tools/library/`.
3. **Preserve Storage Contracts:**
   Do not rename or modify the shapes of existing browser storage keys:
   * `wordloom-session`: JSON object `{ token, userId, email, name, language, provider }`
   * `wordloom-language`: Active mother language code (`ar`, `en`, `fr`, `es`, `tr`, `de`)
   * `wordloom-level`: Current CEFR level (`A1` - `C2`)
   * `wordloom-line-size`: Line height setting (`cozy`, `standard`, `roomy`)
   * `wordloom-mood`: Color palette theme (`purple`, `fern`, `coral`, `sky`, `amber`)
   * `wordloom-vocabulary-records`: Vocabulary records mapping

---

## 5. Verification & Testing Workflow

A single command executes the entire verification pipeline:

```bash
npm test
# OR
node tools/run_all_tests.js
# OR
./tools/test.sh
```

### The 4 Verification Pillars:

| Suite | File | What it Validates |
| :--- | :--- | :--- |
| **1. Button Standard** | [`verify_brown_frame_buttons.js`](../tools/library/verify_brown_frame_buttons.js) | Brown natural frame colors (`#8B5A2B`), 6px radius, arrow absence on `#reader-prev-btn`, `#reader-next-btn`, `#back-to-library`, etc. |
| **2. Reader & Catalog** | [`verify_browser_reader.js`](../tools/library/verify_browser_reader.js) | All 21 books in catalog, cover existence, chapter bounds (20-100 pgs), opening/closing paragraphs. |
| **3. Auth & Custom Books** | [`verify_recreated_auth_and_custom_books.js`](../tools/library/verify_recreated_auth_and_custom_books.js) | Sign-in, sign-up, password visibility toggle, SSO, guest access, sign out, and custom book imports. |
| **4. Full-Screen Layout** | [`screenshot_settings_fullscreen.js`](../tools/library/screenshot_settings_fullscreen.js) | Responsive layout at 1440x900 (desktop 1360px), 1024x768 (tablet), and 390x844 (mobile) with zero horizontal overflow. |

### Running Individual Tests:
```bash
npm run test:buttons   # Verify button styling & arrow absence
npm run test:reader    # Verify 21-book catalog integrity & reader pagination
npm run test:auth      # Verify authentication & custom books flow
npm run test:settings  # Capture & verify full-screen settings screenshots
```

---

## 6. Local Server & Deployment Workflow

### Running Locally:
```bash
npm run serve
# Server will start on http://localhost:8765
```

### Deployment:
Wordloom deploys directly to static edge networks with **zero build step**:
- **Netlify:** Drag and drop the repo folder into Netlify Drop, or link git with an empty build command.
- **GitHub Pages:** Set Pages source to the root branch (`library-rebuild` or `master`).
- **Cloudflare Pages:** Connect repository with no build command and output directory left empty.

### Pre-Deployment Checklist:
- [ ] Run `npm test` and verify that all 4 test suites pass (100%).
- [ ] Verify `index.html` file integrity (> 2MB, all 21 books present).
- [ ] Confirm no horizontal scrollbar or overflow at 390px mobile viewport.
- [ ] Clear service worker cache if updating production assets.
