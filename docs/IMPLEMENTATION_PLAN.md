# Implementation Plan

This document maps the project requirements to their respective implementation phases, following the exact structure mandated in Part K.

## Phase 0: Setup, Backup, Audit, and Protection (K1)
**Requirements Covered**: A2, A3, B1-B7, C1-C8, K1
**Target Files**:
- `docs/MASTER_PROMPT.md`, `docs/REQUIREMENTS_CHECKLIST.md`, `docs/IMPLEMENTATION_PLAN.md`
- `GEMINI.md`
- `.env`, `.env.example`, `.gitignore`
- Database initialization (Docker Compose setup for PostgreSQL 16 + pgvector)
- `backups/` directory (pg_dump output and covers backup)
- `scripts/audit_existing.py` and `etl/cli.py` (for `audit-existing` command)
- `docs/EXISTING_AUDIT.md`, `docs/GAP_TARGETS.md`
- Database legacy protection trigger (initial setup)

## Phase 1: Database Schema and Migrations (K2)
**Requirements Covered**: F1-F5, K2
**Target Files**:
- `db/models.py` (SQLAlchemy 2.x declarative base and tables)
- `db/session.py` (Database connection and engine setup)
- Alembic configuration (`alembic.ini`, `migrations/env.py`)
- Initial Alembic migration scripts
- `docs/SCHEMA.md`

*Note: Execution pauses for [STOP FOR REVIEW] before applying the migration (C7).*

## Phase 2: Source Extractors (K3)
**Requirements Covered**: D1-D7, K3
**Target Files**:
- `etl/extractors/gutendex.py`
- `etl/extractors/standard_ebooks.py`
- `etl/extractors/storyweaver.py`
- `etl/extractors/gdl.py`
- `etl/extractors/african_storybook.py`
- `etl/extractors/simplewiki.py`
- `etl/extractors/wikibooks.py`
- `etl/extractors/librivox.py` (Optional / stubs for now)
- `tests/test_extractors.py` (with mocked HTTP calls via `respx`)
- `docs/SOURCES.md`

## Phase 3: Text Processing - Cleaning and Pagination (K4)
**Requirements Covered**: E1-E4, G1, G2, G4, K4
**Target Files**:
- `etl/transformers/cleaner.py`
- `etl/transformers/paginator.py`
- `etl/transformers/anthology.py`
- `tests/test_transformers.py`

## Phase 4: Enrichment - CEFR, Topics, Vocab, Safety (K5)
**Requirements Covered**: E5.1-E5.5, E6, E7, E8, E9, G3, K5
**Target Files**:
- `etl/enrichment/cefr_analyzer.py`
- `etl/enrichment/topic_classifier.py`
- `etl/enrichment/vocab.py`
- `etl/enrichment/safety_checker.py`
- `tests/test_enrichment.py`

## Phase 5: Deduplication and Quality Control (K6)
**Requirements Covered**: H1-H5, K6
**Target Files**:
- `etl/transformers/deduplicator.py` (SHA-256 and MinHash logic)
- Language detection checks
- Validation filters against legacy books

## Phase 6: Cover Generation (K7)
**Requirements Covered**: I1-I9, K7
**Target Files**:
- `assets/style_refs/` (Wait for user upload or choose from existing)
- `docs/COVER_STYLE.md`
- `etl/enrichment/cover_generator.py`
- `docs/contact_sheet.png`

*Note: Execution pauses for [STOP FOR REVIEW] on reference selection (I1), style guide (I2), and first 10 covers (I4).*

## Phase 7: Loading, Validation, Reporting, and Scaling (K8)
**Requirements Covered**: J1-J6, A7, L1-L4, K8
**Target Files**:
- `etl/loaders/postgres_loader.py`
- `tests/test_data_integrity.py` (CLI: `validate`)
- `docs/FINAL_REPORT.md` (CLI: `report`)
- `docs/API_USAGE.md`
- `README.md`

*Note: Execution pauses for [STOP FOR REVIEW] at 20-book run and 300-book run (J5).*

## Phase 8: Audio Sync (Optional) (K9)
**Requirements Covered**: G5, K9
**Target Files**:
- LibriVox linking logic
- WhisperX alignment scripts
