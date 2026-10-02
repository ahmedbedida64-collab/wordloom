# MASTER PROMPT: English Learning App Book Database Upgrade

You are a Senior Database Engineer and Data Pipeline Engineer working inside this project folder. Your job is to upgrade the book content of an existing English-learning app, end to end, by writing and running code yourself. You will build a legal data pipeline that collects new English books, filters them to 20–100 pages, assigns a CEFR level (A1–C2) and topics, splits them into pages, extracts vocabulary, generates covers that match the app's existing cover style, and loads everything into PostgreSQL without damaging any existing data.

## PART A: COMPLETION CONTRACT (read this first, obey it all the way through)

A1. This prompt has numbered requirements (A1, B1, C1, ...). Every one is mandatory. Do not skip, merge, shorten, simplify or postpone any of them, and do not mark any as "optional" unless this prompt explicitly says OPTIONAL.
A2. Before writing any code, create `docs/REQUIREMENTS_CHECKLIST.md`. It must list EVERY numbered requirement ID from this prompt, each with its full text, as a markdown table with these columns: ID | Requirement | Status (TODO / IN PROGRESS / DONE / BLOCKED) | Evidence (file path, test name or command output).
A3. Then create `docs/IMPLEMENTATION_PLAN.md`, mapping every requirement ID to the phase and files that will satisfy it. Show me the plan and wait for my approval before Phase 1. After that, continue phase by phase. Stop only at the review points marked [STOP FOR REVIEW].
A4. A requirement is DONE only when (a) the code exists, (b) a test or a command proves it works, and (c) the evidence is written in the checklist. "Code written but not run" is NOT done.
A5. Never leave `TODO`, `pass`, `...`, mock data, placeholder functions or "implement later" comments in final code. If you can't finish something, mark it BLOCKED with the exact reason, and tell me what you need from me.
A6. Only ask me for: credentials (database URL, API key), the existing cover reference files, and approvals at [STOP FOR REVIEW] points. Decide everything else yourself using this prompt.
A7. At the end of EVERY phase, re-read this whole prompt, update the checklist, and print a short phase report with three parts: done IDs, blocked IDs with reasons, and next steps. Before declaring the project finished, run a final audit: open the checklist and confirm every single ID is DONE or justified BLOCKED. If anything is still TODO, go back and do it.
A8. If your context gets long, re-read `docs/REQUIREMENTS_CHECKLIST.md` and this file (save this prompt as `docs/MASTER_PROMPT.md` in your first step) before continuing. Never rely on memory of earlier steps.
A9. Work in small, testable steps. Run tests after every change. When a test fails, fix the root cause. Never delete or weaken a test to make it pass.
A10. Never run destructive commands (DROP, TRUNCATE, DELETE without a WHERE clause, `rm -rf` on data/ or assets/) without my explicit approval.

## PART B: PROJECT RULES (also write these into `GEMINI.md` in the project root)

B1. Stack: Python 3.11+, PostgreSQL 16 + pgvector (via Docker Compose), SQLAlchemy 2.x + Alembic, httpx (async), BeautifulSoup4, ebooklib, spaCy (`en_core_web_sm`), textstat, datasketch (MinHash), Pillow, google-genai SDK, pytest + respx, python-dotenv.
B2. Secrets live only in `.env` (`DATABASE_URL`, `EXISTING_DATABASE_URL`, `GEMINI_API_KEY`). `.env` must be in `.gitignore`. Also create `.env.example` with no real values.
B3. Folder structure: `etl/extractors/`, `etl/transformers/`, `etl/enrichment/`, `etl/loaders/`, `db/`, `migrations/`, `scripts/`, `tests/`, `data/raw/`, `data/cache/`, `data/existing/`, `data/processed/`, `assets/style_refs/`, `assets/covers/`, `docs/`.
B4. Every module has type hints, docstrings, logging (no bare `print` in library code) and pytest tests.
B5. One CLI entry point: `python -m etl.cli <command>`, with commands `audit-existing`, `collect --source X --limit N`, `process`, `covers --limit N`, `load`, `validate`, `report`, `run-all --limit N`.
B6. Every step is idempotent: re-running a step never creates duplicates or re-downloads cached files.
B7. Initialize Git and commit after each phase with a clear message.

## PART C: PROTECT THE EXISTING APP DATA (Phase 0, before anything else)

C1. The app ALREADY has books, and each existing book has an AI-generated cover. All covers share ONE matching visual style. Existing books and covers must never be modified, deleted, re-leveled or regenerated.
C2. Before touching anything, create a full backup. Run `pg_dump` of the existing database to `backups/existing_YYYYMMDD.sql`, and copy all existing cover images to `backups/covers_YYYYMMDD/`. Verify that the backup file is not empty, and that the number of copied covers matches the number of covers referenced in the database.
C3. Connect to the existing database with a read-only role or connection. Write `scripts/audit_existing.py` (CLI: `audit-existing`). It exports every existing book to `data/existing/books.jsonl` (id, title, author, level, topic(s), word count or page count if available, cover path/URL), and exports cover metadata to `data/existing/covers.csv`: file path, width, height, aspect ratio, file format, file size.
C4. The audit prints and saves to `docs/EXISTING_AUDIT.md`: total books, count per CEFR level, count per topic, a level × topic matrix, books without covers, the most common cover dimensions, and the most common cover format.
C5. Using the C4 matrix, write `docs/GAP_TARGETS.md`, which says how many NEW books to collect for each level × topic cell. The goal is the final distribution in J4, so prioritize the weakest cells first.
C6. Schema protection: add an `origin` column (`legacy` / `pipeline`) to books. Mark all existing rows `legacy`. The pipeline may only INSERT or UPDATE rows where `origin = 'pipeline'`. Enforce this in code AND with a database trigger that raises an error if any UPDATE or DELETE targets a `legacy` row.
C7. If the existing schema differs from the target schema in Part F, write a non-destructive Alembic migration that only ADDS tables and columns, and never renames or drops existing ones. Show me the migration and wait for approval before applying it. [STOP FOR REVIEW]
C8. Save a normalized key (lowercased title + author, with punctuation and articles removed) for every legacy book. These keys are used for duplicate blocking in H5.

## PART D: LEGAL SOURCES AND COLLECTION METHODS

D1. Only use public-domain, CC-BY or CC-BY-SA content. Never collect copyrighted commercial books or graded readers (for example Oxford Bookworms, Penguin Readers or Cambridge Readers).
D2. Collection order of preference: official API > official feed (OPDS) > official bulk dump or mirror > polite HTML parsing (only if no other option exists AND robots.txt allows it).
D3. Every HTTP client must:
- send a User-Agent with project name and contact email;
- read and respect robots.txt;
- wait at least 1.5 seconds between requests to the same host (1 request per second maximum for Internet Archive / Open Library);
- retry with exponential backoff (5 tries maximum) on 429 or 5xx errors;
- respect `Retry-After`;
- cache every raw response in `data/raw/<source>/`, and never re-download a cached file.
D4. Implement one extractor module per source, each with tests that mock the HTTP calls:
- D4.1 `gutendex.py`: Project Gutenberg metadata via `https://gutendex.com/books?languages=en` (paginate through `next`). Download plain text (UTF-8) from the format links. Public domain in the US. Remove the Project Gutenberg header and footer (the `*** START OF ...` and `*** END OF ...` markers) and all license and trademark text.
- D4.2 `standard_ebooks.py`: OPDS feed `https://standardebooks.org/feeds/opds`. Download the EPUB, then parse chapters with ebooklib + BeautifulSoup. Public domain texts. Prefer this source over Gutenberg when the same book exists in both.
- D4.3 `storyweaver.py`: StoryWeaver (Pratham Books), English, CC-BY 4.0. Store author, illustrator, translator and publisher for attribution. Mainly A1–B1.
- D4.4 `gdl.py`: Global Digital Library API (`https://content.digitallibrary.io/wp-json/content-api/v1/`), English. CC-BY / CC-BY-SA. Mainly A1–A2.
- D4.5 `african_storybook.py`: African Storybook, English, CC-BY 4.0, reading levels 1–5. Use the official download options.
- D4.6 `simplewiki.py`: Simple English Wikipedia XML dump from `dumps.wikimedia.org/simplewiki/`, CC-BY-SA 4.0. Use it only to build non-fiction topic collections (A2–B1). Never query the live site in bulk.
- D4.7 `wikibooks.py`: English Wikibooks dump from `dumps.wikimedia.org/enwikibooks/`, CC-BY-SA 4.0. Non-fiction and educational books (B1–C1).
- D4.8 `librivox.py`: LibriVox API `https://librivox.org/api/feed/audiobooks?format=json`. Public-domain audio, matched to Gutenberg book IDs. Used only by the OPTIONAL audio requirement (G5).
D5. Every collected item stores: `source_name`, `source_id`, `source_url`, `license` (SPDX-style: `PD`, `CC-BY-4.0`, `CC-BY-SA-4.0`), `author`, `illustrator`, `translator`, `publisher`, and a ready-to-display `attribution_text`.
D6. CC-BY-SA content is flagged as such in the database, and is never mixed into the same book as content under other licenses.
D7. Write `docs/SOURCES.md` with: each source, its license, its access method, the rate limit used, and the number of items collected.

## PART E: PAGE RULE, LEVELS, TOPICS

E1. PAGE RULE (single source of truth): `estimated_pages = ceil(word_count / 250)`. Accept a book only if it has 20 to 100 pages, which means 5,000 to 25,000 words. Use this exact rule everywhere: in the filters, the database CHECK constraint, the paginator and the tests. Never use a different words-per-page number anywhere.
E2. Count words after cleaning, excluding boilerplate, front matter and back matter.
E3. Short stories (common at A1–A2): group 5 to 15 stories with the same level, topic and license into an anthology of 5,000–8,000 words (20–32 pages). Keep each story's title and attribution. Module: `etl/transformers/anthology.py`.
E4. Long works (over 25,000 words): split them into self-contained parts of 5,000–25,000 words, breaking only at chapter boundaries. Title the parts "Part 1", "Part 2" and so on, and link them with `series_id` and `part_number`. If the work can't be split cleanly at chapters, reject it.
E5. CEFR level engine, `etl/enrichment/cefr_analyzer.py`. Combine 4 signals:
- E5.1 Lexical profile. Lemmatize with spaCy, excluding proper nouns, numbers and punctuation. Map lemmas to CEFR levels using the CEFR-J / Open Language Profiles word lists (`github.com/openlanguageprofiles/olp-en-cefrj`). Check their license file and record it in `docs/SOURCES.md`. Do NOT bulk-download the Cambridge English Vocabulary Profile. The lexical level is the lowest level at which cumulative coverage reaches at least 95% of tokens.
- E5.2 Readability: Flesch-Kincaid Grade, Flesch Reading Ease and ARI via textstat. Map them to levels with this table: A1 FKGL 0–2, A2 2.1–4, B1 4.1–6.5, B2 6.6–9, C1 9.1–12, C2 above 12.
- E5.3 Gemini check. Send 3 random samples of about 400 words each to a Gemini Flash model with JSON output `{"cefr":"A1|A2|B1|B2|C1|C2","confidence":0-1,"reason":"..."}`. Cache the responses.
- E5.4 Final level = weighted vote (lexical 0.45, readability 0.25, Gemini 0.30), stored with `cefr_confidence`. If any two signals differ by 2 or more levels, set `needs_review = true`.
- E5.5 Tests: 6 reference texts, one per level. Each must be classified within ±1 level, and both A1 and C2 must be exact.
E6. Topics: use exactly these 10 slugs: `adventure_mystery`, `science_nature`, `history_biography`, `folktales_fables`, `daily_life_culture`, `philosophy_thought`, `literature_classics`, `business_economics`, `arts_music`, `science_fiction_fantasy`. Gemini Flash (JSON) assigns 1–3 topics with scores of 0–1, based on title + summary + the first 2 pages. Module: `etl/enrichment/topic_classifier.py`.
E7. Summary: Gemini writes a 2–3 sentence summary for each book, at or below the book's own CEFR level. Save it to `books.summary`.
E8. Embedding: `gemini-embedding-2` with `output_dimensionality=1536`, from title + summary + the first 2 pages. Save it to `books.embedding vector(1536)`. Never mix embedding models.
E9. Content safety. Flag (do not silently delete) slurs, graphic violence and adult content using a word list plus a Gemini check. Flagged books get `needs_review = true`. Nothing flagged goes to A1–A2 without my approval.

## PART F: DATABASE SCHEMA (PostgreSQL 16)

F1. Extensions: `uuid-ossp` (or `gen_random_uuid`), `pg_trgm`, `vector`.
F2. Tables, all created through Alembic migrations, all ADDITIVE to the existing schema (C7):
- `cefr_levels` (code PK A1–C2, name, description, target_vocab_size, min_fkgl, max_fkgl), seeded with all 6 levels;
- `topics` (id, slug UNIQUE, title, description), seeded with all 10 topics;
- `books`, with these columns:
  - identity and content: id UUID, title, slug UNIQUE, author, illustrator, translator, publisher, summary;
  - level and length: cefr_level_code FK, cefr_confidence, needs_review, total_words, estimated_pages, reading_time_minutes = ceil(words/150), fkgl_score, flesch_reading_ease;
  - license and source: license, source_name, source_id, source_url, attribution_text;
  - parts and ownership: series_id, part_number, origin, content_hash;
  - covers: cover_image_url, cover_status (pending/generated/approved/rejected), cover_prompt, cover_model, cover_style_version, cover_style_score;
  - search and housekeeping: embedding vector(1536), is_active, created_at, updated_at;
- `book_topics` (book_id, topic_id, relevance_score, PK on both);
- `chapters` (id, book_id, chapter_index, title, word_count, UNIQUE(book_id, chapter_index));
- `pages` (id, chapter_id, book_id, page_number, content_html, content_plain, word_count, UNIQUE(book_id, page_number));
- `vocabulary_items` (id, lemma, part_of_speech, cefr_level_code, definition_en, simple_definition_en, ipa_phonetic, example_sentence, UNIQUE(lemma, part_of_speech));
- `book_vocabulary_map` (book_id, vocabulary_item_id, frequency_in_book, first_page_appeared, is_key_learning_target);
- `audio_tracks` and `audio_sync_cues` (only used by the OPTIONAL G5).
F3. Constraints:
- `CHECK (estimated_pages BETWEEN 20 AND 100)` applies to `origin = 'pipeline'` rows only (legacy rows are exempt);
- the legacy-protection trigger from C6;
- UNIQUE(source_name, source_id);
- UNIQUE(content_hash) for pipeline rows.
F4. Indexes: (cefr_level_code, estimated_pages), (book_id, page_number), (book_id, chapter_index), GIN trigram index on title, and IVFFlat or HNSW index on embedding (cosine).
F5. Write `docs/SCHEMA.md` with an ER diagram (mermaid) and an explanation of every table.

## PART G: TEXT PROCESSING

G1. Cleaning (`etl/transformers/cleaner.py`):
- fix the encoding;
- normalize quotes and dashes;
- join words hyphenated across line breaks;
- remove long-s and OCR junk;
- remove boilerplate, tables of contents, indexes and footnote markers.

Keep the chapter headings.
G2. Paginator (`etl/transformers/paginator.py`):
- about 250 words per page (allowed range 200–300);
- never split a sentence, a quoted passage of dialogue, or a heading from the text that follows it;
- produce both sanitized `content_html` and `content_plain`;
- after pagination, the page count must still be 20–100, otherwise raise an error and reject the book.
G3. Vocabulary (`etl/enrichment/vocab.py`):
- choose the top 20 key words per book: words at the book's level or one level above, frequency at least 2, excluding proper nouns;
- Gemini provides a simple definition (A2-level English), IPA, part of speech and one example sentence;
- re-use existing `vocabulary_items` rows, never duplicate them;
- record `first_page_appeared`.
G4. Chapter detection works for all source formats (EPUB, plain text, wiki XML, story API JSON), and every book has at least 1 chapter.
G5. OPTIONAL (do it only after everything else is DONE): link LibriVox audio by Gutenberg ID into `audio_tracks`, then align sentences with WhisperX into `audio_sync_cues`.

## PART H: DEDUPLICATION AND QUALITY

H1. Exact duplicates: compute the SHA-256 of the normalized text. If the hash already exists, skip the book.
H2. Near-duplicates: MinHash (datasketch) with Jaccard ≥ 0.85, compared across all sources. Keep the best edition in this order: Standard Ebooks > Gutenberg > others.
H3. Every text must be English (use a language-detection check), with less than 0.5% unresolved OCR or junk characters.
H4. Every page has at least 50 words, except the last page of a chapter.
H5. Block any new book whose normalized key (C8) matches a legacy book or a book already in the pipeline. Parts of one series (E4) are not duplicates, because their keys include the part number.

## PART I: COVERS IN THE SAME STYLE AS THE EXISTING ONES

I1. Ask me to place 3–6 of the best existing covers into `assets/style_refs/`, or choose them yourself from `data/existing/covers.csv` and show me your choice. [STOP FOR REVIEW]
I2. Analyze the reference covers with Gemini vision and write `docs/COVER_STYLE.md`. It must cover:
- art style, medium and rendering;
- color palette (hex codes);
- lighting and mood;
- composition and framing;
- border and shape;
- the exact positions of the title, author and level badge;
- font family, weight, size, color and alignment (identify the closest available font file and put it in `assets/fonts/`);
- level badge colors per CEFR level, copied from the existing covers if present;
- a list of things that never appear.

Then write ONE fixed prompt template with the slots {title}, {topic}, {main_scene}, {level_color}. Show me the style guide. [STOP FOR REVIEW]
I3. Write the generator, `etl/enrichment/cover_generator.py` (CLI: `covers`). For each book with `origin = 'pipeline'` and `cover_status = 'pending'`:
- I3.1 Gemini Flash (JSON) writes `{main_scene}`: one concrete, safe, non-violent visual idea taken from the summary. It must contain no text, no real people and no logos.
- I3.2 Fill the template from I2 exactly. Never paraphrase the fixed style wording.
- I3.3 Call the Gemini image model `gemini-3.1-flash-image` (Nano Banana 2), sending the same 3 style-reference images every time.
- I3.4 Use exactly the same aspect ratio and pixel size as the most common existing cover (from C4). Resize or crop as needed.
- I3.5 If the existing covers have text overlaid, generate the artwork WITHOUT text, then draw the title, author and level badge with Pillow using the font and positions from I2. If the existing covers have text inside the artwork, put the exact title in quotes in the prompt, and spell-check the result with Gemini vision.
- I3.6 Save the cover as `assets/covers/{book_id}.<same format as existing covers>`, and save `cover_image_url`, `cover_prompt`, `cover_model` and `cover_style_version` to the database.
- I3.7 Style score: embed the new cover and the reference covers with `gemini-embedding-2`, and store the mean cosine similarity in `cover_style_score`. If the score is below the threshold, retry up to 2 times with a new `{main_scene}`. If it still fails, set `cover_status = 'rejected'` for manual review.
- I3.8 Cache every request and response, and never regenerate an approved cover.
- I3.9 If quality is still inconsistent after the first batch, switch to `gemini-3-pro-image` (Nano Banana Pro, which supports up to 3 style references). Record the switch by bumping `cover_style_version`.
I4. First run on 10 books only. Create `docs/contact_sheet.png` showing the reference covers on the left and the new covers on the right, with their scores. [STOP FOR REVIEW] Set the threshold to the lowest score among the covers I approve.
I5. After my approval, generate covers in batches of 50, with a contact sheet for each batch. Never touch legacy covers.

## PART J: LOADING, VALIDATION, REPORTING

J1. Loader (`etl/loaders/postgres_loader.py`): upsert each book together with its chapters, pages, topics and vocabulary in ONE transaction per book. If any step fails, the whole book is rolled back and logged in `data/processed/failed.jsonl` with the reason.
J2. Validation suite (`tests/test_data_integrity.py`, CLI `validate`) must assert all of these:
- every pipeline book has 20–100 pages, and its actual page rows match `estimated_pages` within ±2;
- every book has a valid CEFR level and 1–3 topics;
- every page has non-empty content;
- every CC-BY or CC-BY-SA book has `attribution_text` and `source_url`;
- there are no duplicate `content_hash` values and no title + author keys that collide with legacy books;
- the legacy rows are byte-identical to `data/existing/books.jsonl` (compared by checksum);
- the legacy cover files are unchanged (compared by checksum against the backup);
- every approved pipeline book has a cover file that exists, with the correct size and format;
- no Project Gutenberg boilerplate remains in any text.
J3. Report (CLI `report`, saved as `docs/FINAL_REPORT.md`), covering:
- books per level, per topic, and the level × topic matrix, with legacy and new books shown separately;
- minimum, maximum and average page counts;
- counts of `needs_review`, rejected covers and failed items;
- totals per source and license;
- the average cover style score;
- a list of all BLOCKED checklist items.
J4. Target distribution of NEW books (adjusted using C5):
- by level: A1 15%, A2 20%, B1 25%, B2 20%, C1 15%, C2 5%;
- by topic: every level must cover at least 5 of the 10 topics.
J5. Scale in stages: first a 20-book test run through the whole pipeline [STOP FOR REVIEW], then 300 books [STOP FOR REVIEW], then the full target (default 2,500 books, unless I say otherwise).
J6. Cost and quota control. Use Gemini Flash models for all text calls. Send only text samples, never whole books. Cache everything in `data/cache/`. Log each run's API call count to `docs/API_USAGE.md`. If you hit a quota limit, pause and resume from the cache. Never restart from zero.

## PART K: PHASE ORDER

K1. Phase 0: A2, A3 and B (setup), then C (backup, audit, protection).
K2. Phase 1: F (schema and migrations).
K3. Phase 2: D (all source extractors, each tested with `--limit 20`).
K4. Phase 3: E1 to E4 and G1, G2 and G4 (cleaning, page rule, anthologies, splitting, pagination).
K5. Phase 4: E5 to E9 and G3 (CEFR level, topics, summary, embedding, safety, vocabulary).
K6. Phase 5: H (deduplication and quality).
K7. Phase 6: I (covers).
K8. Phase 7: J (load, validate, report, scaling). Then the final audit from A7.
K9. Phase 8, OPTIONAL: G5 (audio).

## PART L: FINAL DELIVERABLES (all of them must exist at the end)

L1. Working code in the structure from B3, with every test passing (`pytest -q` output pasted into `docs/FINAL_REPORT.md`).
L2. Documents:
- `GEMINI.md`;
- in `docs/`: `MASTER_PROMPT.md`, `REQUIREMENTS_CHECKLIST.md` (all IDs DONE or justified BLOCKED), `IMPLEMENTATION_PLAN.md`, `EXISTING_AUDIT.md`, `GAP_TARGETS.md`, `SOURCES.md`, `SCHEMA.md`, `COVER_STYLE.md`, `API_USAGE.md`, `FINAL_REPORT.md`, and the contact sheets.
L3. A `README.md` that explains how to re-run every step from a clean machine (setup, `.env`, Docker, migrations, every CLI command).
L4. The backups from C2, untouched.
