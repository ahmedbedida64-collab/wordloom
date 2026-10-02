"""initial_schema

Revision ID: 001
Revises: 
Create Date: 2026-10-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Ensure extensions exist
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    # cefr_levels
    op.create_table(
        'cefr_levels',
        sa.Column('code', sa.String(length=2), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('target_vocab_size', sa.Integer(), nullable=False),
        sa.Column('min_fkgl', sa.Float(), nullable=False),
        sa.Column('max_fkgl', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('code')
    )

    # topics
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )

    # books
    op.create_table(
        'books',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('illustrator', sa.String(length=255), nullable=True),
        sa.Column('translator', sa.String(length=255), nullable=True),
        sa.Column('publisher', sa.String(length=255), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('cefr_level_code', sa.String(length=2), nullable=True),
        sa.Column('cefr_confidence', sa.Float(), nullable=True),
        sa.Column('needs_review', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('total_words', sa.Integer(), nullable=True),
        sa.Column('estimated_pages', sa.Integer(), nullable=True),
        sa.Column('reading_time_minutes', sa.Integer(), nullable=True),
        sa.Column('fkgl_score', sa.Float(), nullable=True),
        sa.Column('flesch_reading_ease', sa.Float(), nullable=True),
        sa.Column('license', sa.String(length=50), nullable=True),
        sa.Column('source_name', sa.String(length=100), nullable=True),
        sa.Column('source_id', sa.String(length=255), nullable=True),
        sa.Column('source_url', sa.String(length=1024), nullable=True),
        sa.Column('attribution_text', sa.Text(), nullable=True),
        sa.Column('series_id', sa.String(length=255), nullable=True),
        sa.Column('part_number', sa.Integer(), nullable=True),
        sa.Column('origin', sa.String(length=20), nullable=False, server_default='pipeline'),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('cover_image_url', sa.String(length=1024), nullable=True),
        sa.Column('cover_status', sa.String(length=20), nullable=True),
        sa.Column('cover_prompt', sa.Text(), nullable=True),
        sa.Column('cover_model', sa.String(length=100), nullable=True),
        sa.Column('cover_style_version', sa.Integer(), nullable=True),
        sa.Column('cover_style_score', sa.Float(), nullable=True),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(1536), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text("TIMEZONE('utc', CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(['cefr_level_code'], ['cefr_levels.code'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.UniqueConstraint('source_name', 'source_id', name='uq_books_source'),
    )

    # Create partial unique index for content_hash
    op.execute("CREATE UNIQUE INDEX ix_books_content_hash ON books (content_hash) WHERE origin = 'pipeline' AND content_hash IS NOT NULL;")

    # Constraints and Indexes for books
    op.create_check_constraint(
        'check_pipeline_pages',
        'books',
        "(origin != 'pipeline') OR (estimated_pages BETWEEN 20 AND 100)"
    )
    op.create_index('ix_books_cefr_pages', 'books', ['cefr_level_code', 'estimated_pages'])
    op.execute("CREATE INDEX ix_books_title_trgm ON books USING gin (title gin_trgm_ops);")
    op.execute("CREATE INDEX ix_books_embedding ON books USING ivfflat (embedding vector_cosine_ops);")

    # book_topics
    op.create_table(
        'book_topics',
        sa.Column('book_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('relevance_score', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('book_id', 'topic_id')
    )

    # chapters
    op.create_table(
        'chapters',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('book_id', 'chapter_index')
    )
    op.create_index('ix_chapters_book_idx', 'chapters', ['book_id', 'chapter_index'])

    # pages
    op.create_table(
        'pages',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('content_html', sa.Text(), nullable=False),
        sa.Column('content_plain', sa.Text(), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('book_id', 'page_number')
    )
    op.create_index('ix_pages_book_num', 'pages', ['book_id', 'page_number'])

    # vocabulary_items
    op.create_table(
        'vocabulary_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('lemma', sa.String(length=100), nullable=False),
        sa.Column('part_of_speech', sa.String(length=50), nullable=False),
        sa.Column('cefr_level_code', sa.String(length=2), nullable=True),
        sa.Column('definition_en', sa.Text(), nullable=True),
        sa.Column('simple_definition_en', sa.Text(), nullable=True),
        sa.Column('ipa_phonetic', sa.String(length=100), nullable=True),
        sa.Column('example_sentence', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['cefr_level_code'], ['cefr_levels.code'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lemma', 'part_of_speech')
    )

    # book_vocabulary_map
    op.create_table(
        'book_vocabulary_map',
        sa.Column('book_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vocabulary_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('frequency_in_book', sa.Integer(), nullable=False),
        sa.Column('first_page_appeared', sa.Integer(), nullable=True),
        sa.Column('is_key_learning_target', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.ForeignKeyConstraint(['vocabulary_item_id'], ['vocabulary_items.id'], ),
        sa.PrimaryKeyConstraint('book_id', 'vocabulary_item_id')
    )

    # audio_tracks
    op.create_table(
        'audio_tracks',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_url', sa.String(length=1024), nullable=False),
        sa.ForeignKeyConstraint(['book_id'], ['books.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # audio_sync_cues
    op.create_table(
        'audio_sync_cues',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('audio_track_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('page_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_time_ms', sa.Integer(), nullable=False),
        sa.Column('end_time_ms', sa.Integer(), nullable=False),
        sa.Column('text_content', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['audio_track_id'], ['audio_tracks.id'], ),
        sa.ForeignKeyConstraint(['page_id'], ['pages.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # C6: Add legacy protection trigger
    op.execute("""
    CREATE OR REPLACE FUNCTION protect_legacy_books()
    RETURNS trigger AS $$
    BEGIN
        IF OLD.origin = 'legacy' THEN
            RAISE EXCEPTION 'Cannot modify or delete legacy books';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE TRIGGER trg_protect_legacy_books
    BEFORE UPDATE OR DELETE ON books
    FOR EACH ROW
    EXECUTE FUNCTION protect_legacy_books();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_protect_legacy_books ON books;")
    op.execute("DROP FUNCTION IF EXISTS protect_legacy_books();")
    op.drop_table('audio_sync_cues')
    op.drop_table('audio_tracks')
    op.drop_table('book_vocabulary_map')
    op.drop_table('vocabulary_items')
    op.drop_table('pages')
    op.drop_table('chapters')
    op.drop_table('book_topics')
    op.drop_table('books')
    op.drop_table('topics')
    op.drop_table('cefr_levels')
