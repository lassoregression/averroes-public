"""Commentator coaching endpoints — regular mode and 0-to-1 workshop."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import CoachRequest, WorkshopSendRequest, CoachMessageOut, RatingCreate, RatingOut
from app.services.llm import stream_chat, chat
from app.prompts.coach import build_coach_prompt, build_workshop_prompt
from app.repositories.conversation import (
    conversation_repo,
    message_repo,
    coach_message_repo,
    rating_repo,
)
from app.middleware.rate_limit import rate_limiter
from app.middleware.sanitize import sanitize_llm_output

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coach", tags=["coach"])

DEMO_USER_ID = "demo-user"


@router.post("/respond")
async def coach_respond(req: CoachRequest):
    """Get coaching feedback from The Commentator (streaming)."""
    rate_limiter.check(DEMO_USER_ID)

    convo = await conversation_repo.get(req.conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Build context from conversation history
    messages = await message_repo.list_for_conversation(req.conversation_id)
    conv_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    system_prompt = build_coach_prompt(conversation_messages=conv_messages)

    coach_messages = [{"role": "user", "content": req.message}]

    async def event_stream():
        full_response = ""
        try:
            async for chunk in stream_chat(coach_messages, system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            sanitized = sanitize_llm_output(full_response)
            saved = await coach_message_repo.create(
                conversation_id=req.conversation_id,
                coach_type=req.coach_type.value,
                coach_response=sanitized,
                user_prompt=req.message,
            )
            yield f"data: {json.dumps({'type': 'done', 'coach_message_id': saved['id']})}\n\n"

        except Exception as e:
            logger.error(f"Coach stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Coaching unavailable right now.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/workshop")
async def workshop_respond(req: CoachRequest):
    """Workshop mode (0-to-1): The Commentator helps refine a prompt."""
    rate_limiter.check(DEMO_USER_ID)

    convo = await conversation_repo.get(req.conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get existing workshop exchanges for this conversation
    coach_history = await coach_message_repo.list_for_conversation(req.conversation_id)
    workshop_history = [c for c in coach_history if c["coach_type"] == "workshop"]

    # Build messages from workshop history
    ws_messages = []
    for wm in workshop_history:
        if wm["user_prompt"]:
            ws_messages.append({"role": "user", "content": wm["user_prompt"]})
        ws_messages.append({"role": "assistant", "content": wm["coach_response"]})

    ws_messages.append({"role": "user", "content": req.message})

    system_prompt = build_workshop_prompt()

    async def event_stream():
        full_response = ""
        try:
            async for chunk in stream_chat(ws_messages, system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            sanitized = sanitize_llm_output(full_response)
            is_ready = "[WORKSHOP_READY]" in full_response

            saved = await coach_message_repo.create(
                conversation_id=req.conversation_id,
                coach_type="workshop",
                coach_response=sanitized,
                user_prompt=req.message,
            )

            yield f"data: {json.dumps({'type': 'done', 'coach_message_id': saved['id'], 'workshop_ready': is_ready})}\n\n"

        except Exception as e:
            logger.error(f"Workshop stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Workshop unavailable right now.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/workshop/send")
async def workshop_send_to_chat(req: WorkshopSendRequest):
    """Send the refined prompt from workshop to the main chat.

    This triggers the main chat flow with the refined prompt.
    """
    rate_limiter.check(DEMO_USER_ID)

    convo = await conversation_repo.get(req.conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Update conversation mode to regular (workshop phase is done)
    await conversation_repo.update(req.conversation_id, DEMO_USER_ID, mode="regular")

    return {"status": "ok", "refined_prompt": req.refined_prompt}


@router.get("/{conversation_id}/messages")
async def get_coach_messages(conversation_id: str) -> list[CoachMessageOut]:
    """Get all coaching messages for a conversation."""
    convo = await conversation_repo.get(conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await coach_message_repo.list_for_conversation(conversation_id)
    return [CoachMessageOut(**m) for m in messages]


@router.post("/rate")
async def rate_coaching(req: RatingCreate) -> RatingOut:
    """Rate a coaching message (thumbs up/down)."""
    saved = await rating_repo.create(
        conversation_id="",  # TODO: get from coach_message
        coach_message_id=req.coach_message_id,
        rating=req.rating,
        feedback=req.feedback,
    )
    return RatingOut(**saved)
