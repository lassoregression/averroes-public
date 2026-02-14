"""File parsing for PDF, DOCX, and TXT uploads."""
from io import BytesIO
from pypdf import PdfReader
from docx import Document

MAX_CONTENT_LENGTH = 100_000  # ~100K chars max


def parse_file(filename: str, file_bytes: bytes) -> dict:
    """Parse uploaded file bytes and extract text content.

    Returns dict with name, file_type, content, size_bytes.
    Raises ValueError for unsupported types or parsing errors.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content = ""

    if ext == "pdf":
        reader = PdfReader(BytesIO(file_bytes))
        content = "\n".join(
            page.extract_text() or "" for page in reader.pages
        )
    elif ext == "docx":
        doc = Document(BytesIO(file_bytes))
        content = "\n".join(para.text for para in doc.paragraphs)
    elif ext == "txt":
        content = file_bytes.decode("utf-8")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    content = content.strip()
    if len(content) > MAX_CONTENT_LENGTH:
        content = content[:MAX_CONTENT_LENGTH]

    return {
        "name": filename,
        "file_type": ext,
        "content": content,
        "size_bytes": len(file_bytes),
    }
