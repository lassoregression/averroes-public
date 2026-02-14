"""Database repository for spaces."""
import uuid
from app.models.database import get_db


def _id() -> str:
    return str(uuid.uuid4())


class SpaceRepository:

    async def create(self, user_id: str, name: str, auto_generated: bool = False) -> dict:
        db = await get_db()
        try:
            sid = _id()
            await db.execute(
                "INSERT INTO spaces (id, name, user_id, auto_generated) VALUES (?, ?, ?, ?)",
                (sid, name, user_id, int(auto_generated)),
            )
            await db.commit()
            rows = await db.execute_fetchall(
                "SELECT * FROM spaces WHERE id = ?", (sid,)
            )
            return dict(rows[0])
        finally:
            await db.close()

    async def get(self, space_id: str, user_id: str) -> dict | None:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                "SELECT * FROM spaces WHERE id = ? AND user_id = ?",
                (space_id, user_id),
            )
            return dict(rows[0]) if rows else None
        finally:
            await db.close()

    async def list_for_user(self, user_id: str) -> list[dict]:
        db = await get_db()
        try:
            rows = await db.execute_fetchall(
                """SELECT s.*, COUNT(c.id) as conversation_count
                   FROM spaces s
                   LEFT JOIN conversations c ON c.space_id = s.id
                   WHERE s.user_id = ?
                   GROUP BY s.id ORDER BY s.name ASC""",
                (user_id,),
            )
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def update(self, space_id: str, user_id: str, name: str) -> dict | None:
        db = await get_db()
        try:
            await db.execute(
                "UPDATE spaces SET name = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
                (name, space_id, user_id),
            )
            await db.commit()
            return await self.get(space_id, user_id)
        finally:
            await db.close()

    async def delete(self, space_id: str, user_id: str) -> bool:
        db = await get_db()
        try:
            # Unlink conversations first (set space_id to NULL)
            await db.execute(
                "UPDATE conversations SET space_id = NULL WHERE space_id = ? AND user_id = ?",
                (space_id, user_id),
            )
            cursor = await db.execute(
                "DELETE FROM spaces WHERE id = ? AND user_id = ?",
                (space_id, user_id),
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()


space_repo = SpaceRepository()
