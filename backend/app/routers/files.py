"""File upload and parsing endpoints."""
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.models.schemas import FileOut
from app.services.file_parser import parse_file
from app.config import settings
from app.models.database import get_db

router = APIRouter(prefix="/api/files", tags=["files"])

DEMO_USER_ID = "demo-user"


@router.post("/upload", response_model=FileOut)
async def upload_file(conversation_id: str, file: UploadFile = File(...)):
    """Upload and parse a file for a conversation."""
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_file_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(settings.allowed_file_types)}",
        )

    # Read and validate size
    file_bytes = await file.read()
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB.",
        )

    # Parse
    try:
        parsed = parse_file(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save to DB
    file_id = str(uuid.uuid4())
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO files (id, conversation_id, name, file_type, content, size_bytes) VALUES (?, ?, ?, ?, ?, ?)",
            (file_id, conversation_id, parsed["name"], parsed["file_type"], parsed["content"], parsed["size_bytes"]),
        )
        await db.commit()
    finally:
        await db.close()

    return FileOut(
        id=file_id,
        conversation_id=conversation_id,
        name=parsed["name"],
        file_type=parsed["file_type"],
        size_bytes=parsed["size_bytes"],
        created_at="",
    )


@router.get("/{conversation_id}")
async def list_files(conversation_id: str) -> list[FileOut]:
    """List files for a conversation."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT id, conversation_id, name, file_type, size_bytes, created_at FROM files WHERE conversation_id = ?",
            (conversation_id,),
        )
        return [FileOut(**dict(r)) for r in rows]
    finally:
        await db.close()
