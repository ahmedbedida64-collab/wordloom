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
- [x] Run `verify_book_integrity` script on all books — 17 passed, 0 failed.

## Phase 4: Covers
- [x] Write `COVER_STYLE.md`.
- [x] Generate concept briefs per book.
- [x] Generate covers in consistent photo pattern with 2:3 aspect ratio.
- [ ] Run automated consistency checks (size, palette).
- [x] Output contact sheet and review table.

## Phase 5: Swap & Verification
- [ ] Build new library in staging using frozen schema.
- [ ] Conduct browser tests (first page, last page).
- [ ] Take before/after layout screenshots.
- [ ] Swap atomically in `index.html`.
- [ ] Generate final report and rollback commands.
