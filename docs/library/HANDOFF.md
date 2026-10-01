# WORDLOOM PROJECT HANDOFF & RESUMPTION STATE

## 1. Current Project Status
- **Active Branch:** `library-rebuild`
- **Catalog State:** `index.html` (`WORDLOOM_CATALOG`) has been replaced with 17 verified, complete, public-domain books from Project Gutenberg.
- **Page Constraint:** 100% of books contain between 20 and 100 pages (`chapters.length >= 20 && <= 100`). All legacy books under 20 pages have been completely removed.
- **Integrity Status:** 17/17 books pass `tools/library/verify_book_integrity.js` with 0 failures.
- **Cover Assets:**
  - 6 bespoke AI fine-art photographic covers generated and saved in `covers/` (*The Yellow Wallpaper*, *The Canterville Ghost*, *Aesop's Fables*, *Grimm's Fairy Tales*, *Oscar Wilde's Fairy Tales*, *Edgar Allan Poe Stories*).
  - 11 curated high-resolution editorial photographic covers matching the identical 2:3 aspect ratio and warm 35mm film aesthetic.
  - Image generation API rate limit resets around **10:32 AM UTC** (approx. 4h 45m from last generation).
  - Visual contact sheet verified at `docs/library/CONTACT_SHEET.html`.
- **Scope Compliance:** Strict zero-modification lock preserved across HTML structure, CSS, and reader application logic. Validated by `tools/library/check_scope.sh`.

---

## 2. On Trigger: User Types "go"
When the user submits `"go"`, immediately initiate the **Senior ADHD Dev & Design Ensemble Protocol**:
- **Persona & Dynamic:** Act as a tight-knit, hyper-focused syndicate of senior frontend engineers, systems architects, and UI/UX designers treating this as the magnum opus of their careers.
- **Collaborative Deliberation:** Whenever a technical, architectural, or design question arises, the members of the team debate, question, and scrutinize each other's assumptions with intense care, deep creative precision, and obsessive attention to detail.
- **Immediate Priorities Upon Resume:**
  1. Audit reader experience in `index.html` across all 17 books.
  2. If image quota has elapsed, generate additional bespoke AI covers for the remaining 11 books (*The Secret Sharer*, *Tales from the Alhambra*, *O. Henry*, etc.).
  3. Ensure seamless visual rendering and flawless UX within Wordloom's established boundaries.

---

## 3. Quick Rollback & Verification Commands
- Check git scope: `./tools/library/check_scope.sh`
- Verify book integrity: `node tools/library/verify_book_integrity.js docs/library/books_staging/<book>.json`
- Emergency Rollback: `git checkout pre-library-rebuild -- index.html`
