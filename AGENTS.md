# Wordloom Agent Guide

This project is a dependency-free browser app unified into a single standalone [index.html](index.html) file containing markup, styling (`<style>`), catalog data, and application logic (`<script>`).

See [README.md](README.md) for the user-facing feature summary and hosting guidance.

## Current product conventions

- The navigation is intentionally two-item: Library and Review. It renders as a sidebar on wider screens and a balanced compact dock on smaller screens.
- Book cards in the library are styled as a single photo-cover frame with details (title, author, level badge, length) overlaid directly on the photo. Directly beneath the frame sit only two controls: one reading button ("Read" / "Continue") and the favorite heart toggle.
- Reader flow is a distraction-free "single paper" sheet with the book title featured atop the first page only, and two simple navigation buttons ("← Previous" and "Next →").
- Topbar settings and search controls are cleanly sized icon buttons that maintain their dimensions and alignments across all screen sizes.
- The reading plan, reading history, vocabulary review, favorites, color mood, level, and learning goal are browser-local product state; preserve their existing storage keys and object shapes.

## Project shape

- [index.html](index.html): unified standalone app containing app shell, views, modals, full stylesheets in `<style>`, story catalog, and logic in `<script>`.
- [sw.js](sw.js): caches the standalone app shell (`index.html`, `manifest.json`, `icon.svg`) and runtime GET requests.
- [manifest.json](manifest.json): web application manifest.
- [icon.svg](icon.svg): app icon.
- [archive.tar.gz](archive.tar.gz): compressed archive of historical assets and separate modular source files.

## Development and validation

- No build step, package install, or framework tooling is required.
- Run locally with a static server such as `python3 -m http.server 8765` from the repo root, then open the page in a browser.
- Validate at minimum 390x844 and 1440x900.
- Check for: no horizontal overflow, no nav gaps or dead slots, correct active states, modal hidden states, and keyboard focus on new controls.
- For game changes, distinguish the legacy UI handlers in [app.js](app.js) from the reusable engines in [game-module.js](game-module.js), and run the QA harness when the domain behavior changes.
- If stale CSS or JS is suspected, unregister or clear the service worker before re-testing.

## Editing guardrails

- Inspect the real DOM selectors before changing handlers; the app has legacy and duplicate event paths.
- Prefer delegated clicks over adding ad hoc listeners to each rerendered card.
- Keep CSS cascade behavior predictable: final overrides belong in the last-loaded stylesheet only when necessary.
- Preserve localStorage and IndexedDB keys unless a migration is intentional. Important localStorage contracts include `wordloom-session`, `wordloom-welcome-complete`, `wordloom-language`, `wordloom-level`, `wordloom-goal`, `wordloom-mood`, favorites/history/metrics, vocabulary records/saved words, and offline-library status. IndexedDB `wordloom-library` stores explicitly downloaded generated pages; it is not a general fallback.
- Do not describe authentication as production security; this is a front-end demo gate.
- Imported PDF/text files are acknowledged but not fully parsed; do not imply support beyond the current implementation.
- Reader pages are generated in memory and reader position is not currently persisted. Do not promise full EPUB/PDF import, account sync, or server-backed dictionary behavior.
- Keep the navigation compact and aligned with the current app state: no empty notes placeholder, no hidden dead column, and no extra spacing from stale note-era styling.

## Current implementation boundaries

- There is no notes view or notes persistence in the current app, even if older copy or README text mentions notes.
- `app.js` owns the browser-facing game cards and event delegation; `game-module.js` owns reusable game-domain behavior and schemas. Fix the owner of the behavior under test rather than duplicating logic.
- The optional download-library path uses IndexedDB for generated book pages and localStorage for its ready flag. Imported local files currently produce an acknowledgement toast only.
- The service worker can serve stale JavaScript/CSS during browser checks. Bump its cache name or unregister/clear it when validating asset changes.

## Useful prompts for future agents

- "Fix the three-item nav spacing and active states on mobile and desktop."
- "Debug the library tab/favorite/history flow after rerendering cards."
- "Add a focused visual fix without reintroducing the stale notes layout."
- "Validate the reader preview + back button flow and ensure no horizontal overflow."
