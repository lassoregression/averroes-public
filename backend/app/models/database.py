"""
SQLite Database Setup with FTS5 Full-Text Search

This module manages:
1. Database connection (async via aiosqlite)
2. Schema creation (tables + FTS5 virtual tables)
3. WAL mode for better concurrent read performance

Tables:
- spaces: Project folders for organizing conversations (Arc-style)
- conversations: Chat sessions, each with a mode (regular or zero_to_one)
- messages: Individual chat messages within conversations
- coach_messages: Coaching feedback from The Commentator
- ratings: User ratings (thumbs up/down) on coaching quality
- files: Uploaded documents attached to conversations

FTS5 virtual tables enable fast full-text search across
conversation titles and message content.

Note: SQLite is chosen for zero-infrastructure demo deployment.
The repository pattern makes swapping to Postgres straightforward.
"""
import aiosqlite
from app.config import settings

# Database file path — loaded from validated settings
DB_PATH = settings.db_path

# ============================================================
# Schema Definition
#
# All tables use TEXT primary keys (UUIDs) for portability.
# Timestamps use SQLite's datetime() function for consistency.
# Foreign keys enforce referential integrity.
# ============================================================
SCHEMA = """
-- Spaces: Project folders for organizing conversations (Arc-style)
-- Users can create spaces manually or the system auto-suggests them
CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,              -- Owner (for access control)
    auto_generated INTEGER DEFAULT 0,   -- 1 if system-suggested, 0 if user-created
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Conversations: Individual chat sessions
-- Each conversation has a mode: 'regular' (live coaching) or 'zero_to_one' (workshop)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New conversation',
    space_id TEXT,                       -- Optional: which space this belongs to
    user_id TEXT NOT NULL,               -- Owner (for access control)
    mode TEXT NOT NULL DEFAULT 'regular', -- 'regular' or 'zero_to_one'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL
);

-- Messages: Individual chat messages within a conversation
-- role is constrained to 'user', 'assistant', or 'system'
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Coach Messages: Feedback from The Commentator
-- coach_type tracks how this coaching was triggered:
--   'auto' = after each main assistant reply (regular chat); UI triggers coach SSE on stream done
--   'manual' = user opened the panel and sent a message to the coach
--   'workshop' = 0-to-1 workshop exchange via /api/coach/workshop
CREATE TABLE IF NOT EXISTS coach_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    message_id TEXT,                     -- Optional: which user message triggered this
    coach_type TEXT NOT NULL CHECK (coach_type IN ('auto', 'manual', 'workshop')),
    user_prompt TEXT,                    -- What the user said to The Commentator
    coach_response TEXT NOT NULL,        -- The Commentator's feedback
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Ratings: User feedback on coaching quality
-- rating: 1 = thumbs up, -1 = thumbs down
-- Used to measure coaching effectiveness and improve prompts over time
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    coach_message_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    feedback TEXT,                       -- Optional text feedback
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_message_id) REFERENCES coach_messages(id) ON DELETE CASCADE
);

-- Files: Uploaded documents attached to conversations
-- Content is stored as extracted text (not raw binary)
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    name TEXT NOT NULL,                  -- Original filename
    file_type TEXT NOT NULL,             -- Extension (pdf, docx, txt)
    content TEXT NOT NULL,               -- Extracted text content
    size_bytes INTEGER NOT NULL,         -- Original file size
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- FTS5 Virtual Tables for full-text search
-- These enable fast search across conversation titles and message content
CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
    title,
    content=conversations,
    content_rowid=rowid
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=rowid
);
"""


async def get_db() -> aiosqlite.Connection:
    """
    Get an async database connection.

    Configures:
    - Row factory: Returns rows as dict-like objects (access by column name)
    - WAL mode: Allows concurrent reads while writing (better performance)
    - Foreign keys: Enforces referential integrity
    """
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """
    Initialize the database schema.

    Called once at application startup (via FastAPI lifespan).
    Safe to call multiple times — all statements use IF NOT EXISTS.
    """
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()
