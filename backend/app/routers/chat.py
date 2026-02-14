"""Main chat endpoints with SSE streaming."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, MessageOut
from app.services.llm import stream_chat, chat
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

            # Generate title after first exchange (2 messages = first user + first assistant)
            all_msgs = await message_repo.list_for_conversation(req.conversation_id)
            if len(all_msgs) == 2:
                try:
                    title = await _generate_title(req.message, sanitized)
                    await conversation_repo.update(
                        req.conversation_id, DEMO_USER_ID, title=title
                    )
                    yield f"data: {json.dumps({'type': 'title', 'title': title})}\n\n"
                except Exception as e:
                    logger.warning(f"Title generation failed: {e}")

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


# Title generation prompt — short, cheap, focused
_TITLE_SYSTEM_PROMPT = (
    "Generate a short conversation title (3-6 words) based on the user's message "
    "and the AI's response. Return ONLY the title, no quotes, no punctuation at the end, "
    "no explanation. Examples: 'Python Quicksort Implementation', 'Email Draft for Team', "
    "'React Auth Best Practices'."
)


async def _generate_title(user_message: str, assistant_response: str) -> str:
    """Generate a short title from the first exchange using the LLM."""
    messages = [
        {"role": "user", "content": user_message},
        {"role": "assistant", "content": assistant_response[:500]},
        {"role": "user", "content": "Generate a title for this conversation."},
    ]
    title = await chat(messages, _TITLE_SYSTEM_PROMPT)
    # Clean up — strip quotes, limit length
    title = title.strip().strip('"').strip("'")
    if len(title) > 60:
        title = title[:57] + "..."
    return title
