"""Database repository for conversations, messages, and search."""
import uuid
from app.models.database import get_db


def _id() -> str:
    return str(uuid.uuid4())


class ConversationRepository:

    async def create(self, user_id: str, title: str, mode: str, space_id: str | None = None) -> dict:
        db = await get_db()
        try:
            cid = _id()
            await db.execute(
                "INSERT INTO conversations (id, title, space_id, user_id, mode) VALUES (?, ?, ?, ?, ?)",
                (cid, title, space_id, user_id, mode),
            )
            await db.commit()
            row = await db.execute_fetchall(
                "SELECT * FROM conversations WHERE id = ?", (cid,)
            )
            return dict(row[0])
        finally:
            await db.close()

    async def get(self, conversation_id: str, user_id: str) -> dict | None:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
                (conversation_id, user_id),
            )
            return dict(rows[0]) if rows else None
        finally:
            await db.close()

    async def list_for_user(self, user_id: str, space_id: str | None = None) -> list[dict]:
        db = await get_db()
        try:
            if space_id:
                rows = await db.execute_fetchall(
                    """SELECT c.*, COUNT(m.id) as message_count,
                       (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
                       FROM conversations c
                       LEFT JOIN messages m ON m.conversation_id = c.id
                       WHERE c.user_id = ? AND c.space_id = ?
                       GROUP BY c.id ORDER BY c.updated_at DESC""",
                    (user_id, space_id),
                )
            else:
                rows = await db.execute_fetchall(
                    """SELECT c.*, COUNT(m.id) as message_count,
                       (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
                       FROM conversations c
                       LEFT JOIN messages m ON m.conversation_id = c.id
                       WHERE c.user_id = ?
                       GROUP BY c.id ORDER BY c.updated_at DESC""",
                    (user_id,),
                )
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def update(self, conversation_id: str, user_id: str, **fields) -> dict | None:
        db = await get_db()
        try:
            sets = ", ".join(f"{k} = ?" for k in fields)
            values = list(fields.values()) + [conversation_id, user_id]
            await db.execute(
                f"UPDATE conversations SET {sets}, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
                values,
            )
            await db.commit()
            return await self.get(conversation_id, user_id)
        finally:
            await db.close()

    async def delete(self, conversation_id: str, user_id: str) -> bool:
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM conversations WHERE id = ? AND user_id = ?",
                (conversation_id, user_id),
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def search(self, user_id: str, query: str, limit: int = 20) -> list[dict]:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                """SELECT DISTINCT c.id as conversation_id, c.title as conversation_title,
                   c.space_id, m.content as snippet, m.created_at
                   FROM messages m
                   JOIN conversations c ON c.id = m.conversation_id
                   WHERE c.user_id = ? AND m.content LIKE ?
                   ORDER BY m.created_at DESC LIMIT ?""",
                (user_id, f"%{query}%", limit),
            )
            return [dict(r) for r in rows]
        finally:
            await db.close()


class MessageRepository:

    async def create(self, conversation_id: str, role: str, content: str) -> dict:
        db = await get_db()
        try:
            mid = _id()
            await db.execute(
                "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                (mid, conversation_id, role, content),
            )
            await db.execute(
                "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
                (conversation_id,),
            )
            await db.commit()
            rows = await db.execute_fetchall(
                "SELECT * FROM messages WHERE id = ?", (mid,)
            )
            return dict(rows[0])
        finally:
            await db.close()

    async def list_for_conversation(self, conversation_id: str) -> list[dict]:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (conversation_id,),
            )
            return [dict(r) for r in rows]
        finally:
            await db.close()


class CoachMessageRepository:

    async def create(
        self,
        conversation_id: str,
        coach_type: str,
        coach_response: str,
        user_prompt: str | None = None,
        message_id: str | None = None,
    ) -> dict:
        db = await get_db()
        try:
            cid = _id()
            await db.execute(
                """INSERT INTO coach_messages
                   (id, conversation_id, message_id, coach_type, user_prompt, coach_response)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (cid, conversation_id, message_id, coach_type, user_prompt, coach_response),
            )
            await db.commit()
            rows = await db.execute_fetchall(
                "SELECT * FROM coach_messages WHERE id = ?", (cid,)
            )
            return dict(rows[0])
        finally:
            await db.close()

    async def list_for_conversation(self, conversation_id: str) -> list[dict]:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                "SELECT * FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (conversation_id,),
            )
            return [dict(r) for r in rows]
        finally:
            await db.close()


class RatingRepository:

    async def create(
        self, conversation_id: str, coach_message_id: str, rating: int, feedback: str | None = None
    ) -> dict:
        db = await get_db()
        try:
            rid = _id()
            await db.execute(
                "INSERT INTO ratings (id, conversation_id, coach_message_id, rating, feedback) VALUES (?, ?, ?, ?, ?)",
                (rid, conversation_id, coach_message_id, rating, feedback),
            )
            await db.commit()
            rows = await db.execute_fetchall(
                "SELECT * FROM ratings WHERE id = ?", (rid,)
            )
            return dict(rows[0])
        finally:
            await db.close()


# Singleton instances
conversation_repo = ConversationRepository()
message_repo = MessageRepository()
coach_message_repo = CoachMessageRepository()
rating_repo = RatingRepository()
