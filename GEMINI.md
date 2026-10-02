# Project Rules (Wordloom Database Upgrade)

These rules dictate the constraints and structure of the ETL pipeline.

B1. Stack: Python 3.11+, PostgreSQL 16 + pgvector (via Docker Compose), SQLAlchemy 2.x + Alembic, httpx (async), BeautifulSoup4, ebooklib, spaCy (`en_core_web_sm`), textstat, datasketch (MinHash), Pillow, google-genai SDK, pytest + respx, python-dotenv.

B2. Secrets live only in `.env` (`DATABASE_URL`, `EXISTING_DATABASE_URL`, `GEMINI_API_KEY`). `.env` must be in `.gitignore`. Also create `.env.example` with no real values.

B3. Folder structure:
- `etl/extractors/`
- `etl/transformers/`
- `etl/enrichment/`
- `etl/loaders/`
- `db/`
- `migrations/`
- `scripts/`
- `tests/`
- `data/raw/`
- `data/cache/`
- `data/existing/`
- `data/processed/`
- `assets/style_refs/`
- `assets/covers/`
- `docs/`

B4. Every module has type hints, docstrings, logging (no bare `print` in library code) and pytest tests.

B5. One CLI entry point: `python -m etl.cli <command>`, with commands `audit-existing`, `collect --source X --limit N`, `process`, `covers --limit N`, `load`, `validate`, `report`, `run-all --limit N`.

B6. Every step is idempotent: re-running a step never creates duplicates or re-downloads cached files.

B7. Initialize Git and commit after each phase with a clear message.
