# Wordloom Agent Guide

This project is a dependency-free browser app unified into a single standalone [index.html](index.html) file containing markup, styling (`<style>`), catalog data, and application logic (`<script>`).

See [README.md](README.md) for the user-facing feature summary and hosting guidance.

## Current product conventions

- The navigation uses a balanced 4-item floating gradient menu dock: Library, Review, Custom Book, and Settings. It automatically hides during active reading and game views for a distraction-free experience.
- Book cards in the library are styled as a single photo-cover frame with details (title, author, level badge, length) overlaid directly on the photo. Directly beneath the frame sit only two controls: one reading button ("Read" / "Continue") and the favorite heart toggle.
- Reader flow is a distraction-free "single paper" sheet with the book title featured atop the first page only, and two simple navigation buttons ("Previous" and "Next") without directional arrows.
- Back and forward buttons strictly follow the Brown Natural Frame design standard: `1.5px solid #8B5A2B`, background `#FAF4EB`, color `#5C4033`, radius `6px`, with zero arrow glyphs (`←`, `→`).
- Settings page is an expansive full-screen 1360px dashboard with typography rhythm, narration voice controls, and reader profile.
- The reading plan, reading history, vocabulary review, favorites, color mood, level, and learning goal are browser-local product state; preserve their existing storage keys and object shapes.

## Project shape

- [index.html](index.html): unified standalone app containing app shell, views, modals, full stylesheets in `<style>`, story catalog (`WORDLOOM_CATALOG` 21 books), and logic in `<script>`.
- [sw.js](sw.js): caches the standalone app shell (`index.html`, `manifest.json`, `icon.svg`) and runtime GET requests.
- [manifest.json](manifest.json): web application manifest.
- [icon.svg](icon.svg): app icon.
- [package.json](package.json): standard npm workflow scripts (`test`, `serve`, etc.).
- [docs/WORKFLOW.md](docs/WORKFLOW.md): comprehensive engineering guide, architecture, and verification protocol.
- [tools/run_all_tests.js](tools/run_all_tests.js): canonical automated test runner executing all 4 validation suites.

## Development and validation

- No build step or package compilation is required for production.
- Run locally with `npm run serve` (or `python3 -m http.server 8765`), then open the page in a browser.
- Run automated verification with `npm test` (or `node tools/run_all_tests.js`).
- Validate at minimum 390x844 (mobile) and 1440x900 (desktop).
- Check for: no horizontal overflow, correct brown natural frame button styling, single pair of reader buttons without arrows, and full-screen settings responsiveness.
- If stale CSS or JS is suspected, unregister or clear the service worker before re-testing.

## Editing guardrails

- `index.html` is a 2.2MB standalone file containing the complete 21-book catalog. Always target precise ranges or use verified builder scripts in `tools/library/` to prevent accidental file truncation.
- Always run syntax verification on the script blocks after editing (`node tools/run_all_tests.js`).
- Inspect real DOM selectors before changing handlers; the app has legacy event paths.
- Keep CSS cascade behavior predictable: final overrides belong in the last-loaded stylesheet only when necessary.
- Preserve localStorage keys: `wordloom-session`, `wordloom-language`, `wordloom-level`, `wordloom-line-size`, `wordloom-mood`, `wordloom-vocabulary-records`.

## Useful prompts for future agents

- "Run npm test to verify all 4 quality gates pass."
- "Validate the full-screen settings page across desktop and mobile viewports."
- "Check reader controls in #reading-view to ensure exactly one Previous and Next button appears."

