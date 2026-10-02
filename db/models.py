import uuid
from typing import List, Optional
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, CheckConstraint, DateTime
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql import expression
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class UTCNow(expression.FunctionElement):
    type = DateTime()
    inherit_cache = True

@compiles(UTCNow, 'postgresql')
def pg_utcnow(element, compiler, **kw):
    return "TIMEZONE('utc', CURRENT_TIMESTAMP)"

class CEFRLevel(Base):
    __tablename__ = "cefr_levels"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    target_vocab_size: Mapped[int] = mapped_column(Integer)
    min_fkgl: Mapped[float] = mapped_column(Float)
    max_fkgl: Mapped[float] = mapped_column(Float)

class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text)

class Book(Base):
    __tablename__ = "books"
    
    # identity and content
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(255))
    illustrator: Mapped[Optional[str]] = mapped_column(String(255))
    translator: Mapped[Optional[str]] = mapped_column(String(255))
    publisher: Mapped[Optional[str]] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text)
    
    # level and length
    cefr_level_code: Mapped[Optional[str]] = mapped_column(ForeignKey("cefr_levels.code"))
    cefr_confidence: Mapped[Optional[float]] = mapped_column(Float)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    total_words: Mapped[Optional[int]] = mapped_column(Integer)
    estimated_pages: Mapped[Optional[int]] = mapped_column(Integer)
    reading_time_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    fkgl_score: Mapped[Optional[float]] = mapped_column(Float)
    flesch_reading_ease: Mapped[Optional[float]] = mapped_column(Float)
    
    # license and source
    license: Mapped[Optional[str]] = mapped_column(String(50))
    source_name: Mapped[Optional[str]] = mapped_column(String(100))
    source_id: Mapped[Optional[str]] = mapped_column(String(255))
    source_url: Mapped[Optional[str]] = mapped_column(String(1024))
    attribution_text: Mapped[Optional[str]] = mapped_column(Text)
    
    # parts and ownership
    series_id: Mapped[Optional[str]] = mapped_column(String(255))
    part_number: Mapped[Optional[int]] = mapped_column(Integer)
    origin: Mapped[str] = mapped_column(String(20), nullable=False, default="pipeline")
    content_hash: Mapped[Optional[str]] = mapped_column(String(64))
    
    # covers
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(1024))
    cover_status: Mapped[Optional[str]] = mapped_column(String(20)) # pending/generated/approved/rejected
    cover_prompt: Mapped[Optional[str]] = mapped_column(Text)
    cover_model: Mapped[Optional[str]] = mapped_column(String(100))
    cover_style_version: Mapped[Optional[int]] = mapped_column(Integer)
    cover_style_score: Mapped[Optional[float]] = mapped_column(Float)
    
    # search and housekeeping
    embedding = mapped_column(Vector(1536))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=UTCNow(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=UTCNow(), onupdate=UTCNow(), nullable=False)

    __table_args__ = (
        # Constraint F3: CHECK (estimated_pages BETWEEN 20 AND 100) applies to origin = 'pipeline' only
        CheckConstraint(
            "(origin != 'pipeline') OR (estimated_pages BETWEEN 20 AND 100)",
            name="check_pipeline_pages"
        ),
        # UNIQUE(source_name, source_id)
        # UNIQUE(content_hash) for pipeline rows
    )

class BookTopic(Base):
    __tablename__ = "book_topics"
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), primary_key=True)
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False)

class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), nullable=False)
    chapter_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    word_count: Mapped[Optional[int]] = mapped_column(Integer)

class Page(Base):
    __tablename__ = "pages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chapters.id"), nullable=False)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    content_plain: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[Optional[int]] = mapped_column(Integer)

class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lemma: Mapped[str] = mapped_column(String(100), nullable=False)
    part_of_speech: Mapped[str] = mapped_column(String(50), nullable=False)
    cefr_level_code: Mapped[Optional[str]] = mapped_column(ForeignKey("cefr_levels.code"))
    definition_en: Mapped[Optional[str]] = mapped_column(Text)
    simple_definition_en: Mapped[Optional[str]] = mapped_column(Text)
    ipa_phonetic: Mapped[Optional[str]] = mapped_column(String(100))
    example_sentence: Mapped[Optional[str]] = mapped_column(Text)

class BookVocabularyMap(Base):
    __tablename__ = "book_vocabulary_map"
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), primary_key=True)
    vocabulary_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vocabulary_items.id"), primary_key=True)
    frequency_in_book: Mapped[int] = mapped_column(Integer, nullable=False)
    first_page_appeared: Mapped[Optional[int]] = mapped_column(Integer)
    is_key_learning_target: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

class AudioTrack(Base):
    __tablename__ = "audio_tracks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)

class AudioSyncCue(Base):
    __tablename__ = "audio_sync_cues"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    audio_track_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("audio_tracks.id"), nullable=False)
    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pages.id"), nullable=False)
    start_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    text_content: Mapped[str] = mapped_column(Text, nullable=False)
