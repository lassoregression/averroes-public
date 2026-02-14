"""Main chat endpoints with SSE streaming."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, MessageOut
from app.services.llm import stream_chat
from app.prompts.assistant import build_assistant_prompt
from app.repositories.conversation import conversation_repo, message_repo
from app.middleware.rate_limit import rate_limiter
from app.middleware.sanitize import sanitize_llm_output

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Temporary user ID until auth is implemented
DEMO_USER_ID = "demo-user"


@router.post("/stream")
async def stream_chat_endpoint(req: ChatRequest):
    """Stream a chat response via SSE."""
    rate_limiter.check(DEMO_USER_ID)

    # Verify conversation belongs to user
    convo = await conversation_repo.get(req.conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    await message_repo.create(req.conversation_id, "user", req.message)

    # Build context
    messages = await message_repo.list_for_conversation(req.conversation_id)
    chat_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    system_prompt = build_assistant_prompt()  # TODO: pass files

    async def event_stream():
        full_response = ""
        try:
            async for chunk in stream_chat(chat_messages, system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Sanitize and save complete response
            sanitized = sanitize_llm_output(full_response)
            saved_msg = await message_repo.create(req.conversation_id, "assistant", sanitized)
            yield f"data: {json.dumps({'type': 'done', 'message_id': saved_msg['id']})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'An error occurred generating the response.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{conversation_id}/messages")
async def get_messages(conversation_id: str) -> list[MessageOut]:
    """Get all messages for a conversation."""
    convo = await conversation_repo.get(conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await message_repo.list_for_conversation(conversation_id)
    return [MessageOut(**m) for m in messages]
