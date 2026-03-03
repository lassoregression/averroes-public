"""Conversation CRUD and search endpoints."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    SearchRequest,
    SearchResult,
)
from app.repositories.conversation import conversation_repo

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

DEMO_USER_ID = "demo-user"


@router.post("", response_model=ConversationOut)
async def create_conversation(req: ConversationCreate):
    """Create a new conversation."""
    convo = await conversation_repo.create(
        user_id=DEMO_USER_ID,
        title=req.title,
        mode=req.mode.value,
        space_id=req.space_id,
    )
    return ConversationOut(**convo, message_count=0, last_message_preview=None)


@router.get("", response_model=list[ConversationOut])
async def list_conversations(space_id: str | None = None):
    """List all conversations for the current user."""
    convos = await conversation_repo.list_for_user(DEMO_USER_ID, space_id)
    return [ConversationOut(**c) for c in convos]


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: str):
    """Get a specific conversation."""
    convo = await conversation_repo.get(conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationOut(**convo, message_count=0, last_message_preview=None)


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(conversation_id: str, req: ConversationUpdate):
    """Update a conversation (rename, move to space)."""
    fields = req.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    convo = await conversation_repo.update(conversation_id, DEMO_USER_ID, **fields)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationOut(**convo, message_count=0, last_message_preview=None)


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and all its messages."""
    deleted = await conversation_repo.delete(conversation_id, DEMO_USER_ID)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}


@router.post("/search", response_model=list[SearchResult])
async def search_conversations(req: SearchRequest):
    """Search across all conversations."""
    results = await conversation_repo.search(DEMO_USER_ID, req.query, req.limit)
    return [SearchResult(**r) for r in results]
