"""Commentator coaching endpoints — regular mode and 0-to-1 workshop."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import CoachRequest, WorkshopSendRequest, CoachMessageOut, RatingCreate, RatingOut
from app.services.llm import stream_chat, chat
from app.prompts.coach import build_coach_prompt, build_workshop_prompt
from app.config import settings
from app.routers.chat import _generate_title
from app.repositories.conversation import (
    conversation_repo,
    message_repo,
    coach_message_repo,
    rating_repo,
    file_repo,
)
from app.middleware.rate_limit import rate_limiter
from app.middleware.sanitize import sanitize_llm_output

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coach", tags=["coach"])


def _extract_refined_prompt(text: str) -> str | None:
    """Extract refined prompt from model output.

    Tries multiple patterns in order of specificity because the model doesn't
    always use exact ---PROMPT---/---END--- delimiters despite being instructed to.
    """
    import re
    # Primary: exact delimiters (strict)
    match = re.search(r'---PROMPT---\s*([\s\S]*?)\s*---END---', text)
    if match:
        return match.group(1).strip()
    # Variant: allows spaces around keywords and case differences
    # e.g. "--- PROMPT ---" / "--- End ---"
    match = re.search(
        r'---\s*PROMPT\s*---\s*([\s\S]*?)\s*---\s*END\s*---',
        text,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()
    # Fallback: "Refined Prompt:" / "REFINED PROMPT:" header — capture until
    # double newline, [WORKSHOP_READY] marker, or end of string
    match = re.search(
        r'\*{0,2}[Rr]efined\s+[Pp]rompt\*{0,2}[:\s]*\n([\s\S]+?)(?:\n\n|\[WORKSHOP_READY\]|$)',
        text
    )
    if match:
        return match.group(1).strip()
    return None

def _build_rated_examples(
    ratings: list[dict], coach_messages: list[dict]
) -> list[dict]:
    """Join ratings with their coach messages to produce rated example dicts.

    Returns a list of {"observation": str, "rating": int} dicts, capped at
    3 liked (+1) and 2 disliked (-1) to keep prompt overhead small.
    Observations are truncated to 300 chars — enough for the model to pattern-match
    without bloating the context.
    """
    # Index coach messages by ID for O(1) lookup
    msg_by_id = {cm["id"]: cm for cm in coach_messages}

    liked, disliked = [], []
    for r in ratings:
        cm = msg_by_id.get(r["coach_message_id"])
        if not cm:
            continue
        entry = {
            "observation": cm["coach_response"][:300],
            "rating": r["rating"],
        }
        if r["rating"] > 0:
            liked.append(entry)
        elif r["rating"] < 0:
            disliked.append(entry)

    return liked[-3:] + disliked[-2:]


DEMO_USER_ID = "demo-user"


@router.post("/respond")
async def coach_respond(req: CoachRequest):
    """Get coaching feedback from The Commentator (streaming)."""
    rate_limiter.check(DEMO_USER_ID)

    convo = await conversation_repo.get(req.conversation_id, DEMO_USER_ID)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Build full context for the commentator's "mind":
    # 1. Main conversation (user ↔ main LLM) — commentator observes but main LLM never sees this
    # 2. Workshop history (0→1 refinement session, if any)
    # 3. Commentator's own prior outputs (auto-observations + manual exchanges)
    #    — gives it continuity and prevents repetition across the conversation
    messages = await message_repo.list_for_conversation(req.conversation_id)
    conv_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    all_coach = await coach_message_repo.list_for_conversation(req.conversation_id)
    workshop_messages = [c for c in all_coach if c["coach_type"] == "workshop"]

    # Separate commentator's own history (auto + manual) from workshop.
    # Cost control: for auto-triggered calls (high frequency), cap to last 4 entries
    # so the context doesn't balloon over long conversations. Manual engagement (user-
    # initiated) gets more history since they're actively conversing with the commentator.
    is_auto = req.coach_type.value == "auto"
    prior_coach = [c for c in all_coach if c["coach_type"] in ("auto", "manual")]
    commentator_messages = prior_coach[-4:] if is_auto else prior_coach[-10:]

    files = await file_repo.list_for_conversation(req.conversation_id)

    # Session learning loop: fetch ratings for this conversation and join with
    # their coach messages so the prompt can show the model what this user has
    # liked/disliked in the current session.
    # TODO (post-auth): scope to user_id and query across all conversations so
    # the learning persists across sessions, not just the current one.
    ratings = await rating_repo.list_for_conversation(req.conversation_id)
    rated_examples = _build_rated_examples(ratings, all_coach) if ratings else []

    system_prompt = build_coach_prompt(
        files=files or None,
        conversation_messages=conv_messages,
        workshop_messages=workshop_messages,
        commentator_messages=commentator_messages,
        rated_examples=rated_examples,
    )

    # For auto-triggered coaching, send a generic trigger so the LLM analyzes the
    # conversation context in the system prompt rather than responding to the prompt directly.
    # For manual coaching (user types in panel), send their actual message.
    trigger = (
        "Analyze the latest exchange in the conversation and provide your observation and refined prompt."
        if is_auto
        else req.message
    )
    coach_messages = [{"role": "user", "content": trigger}]

    async def event_stream():
        full_response = ""
        try:
            # Model comes from settings.coach_model (default deepseek-chat).
            # stream_chat strips reasoning_content when present so thinking tokens never reach the client.
            async for chunk in stream_chat(coach_messages, system_prompt, model=settings.coach_model):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            sanitized = sanitize_llm_output(full_response)
            refined_prompt_text = _extract_refined_prompt(full_response)
            saved = await coach_message_repo.create(
                conversation_id=req.conversation_id,
                coach_type=req.coach_type.value,
                coach_response=sanitized,
                user_prompt=req.message,
            )
            yield f"data: {json.dumps({'type': 'done', 'coach_message_id': saved['id'], 'refined_prompt': refined_prompt_text})}\n\n"

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

    files = await file_repo.list_for_conversation(req.conversation_id)
    system_prompt = build_workshop_prompt(files=files or None)

    async def event_stream():
        full_response = ""
        try:
            async for chunk in stream_chat(ws_messages, system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            sanitized = sanitize_llm_output(full_response)
            refined_prompt_text = _extract_refined_prompt(full_response)
            # Consider workshop ready if [WORKSHOP_READY] marker present OR a prompt was extracted
            is_ready = "[WORKSHOP_READY]" in full_response or refined_prompt_text is not None

            saved = await coach_message_repo.create(
                conversation_id=req.conversation_id,
                coach_type="workshop",
                coach_response=sanitized,
                user_prompt=req.message,
            )

            yield f"data: {json.dumps({'type': 'done', 'coach_message_id': saved['id'], 'workshop_ready': is_ready, 'refined_prompt': refined_prompt_text})}\n\n"

            # Generate title after first workshop exchange
            if len(workshop_history) == 0:
                try:
                    title = await _generate_title(req.message, sanitized)
                    await conversation_repo.update(
                        req.conversation_id, DEMO_USER_ID, title=title
                    )
                    yield f"data: {json.dumps({'type': 'title', 'title': title})}\n\n"
                except Exception as e:
                    logger.warning(f"Workshop title generation failed: {e}")

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
    """Rate a coaching message (thumbs up/down).

    Resolves conversation_id from the coach_message record so the frontend
    only needs to send coach_message_id — it doesn't need to track conversation
    context separately.
    """
    coach_msg = await coach_message_repo.get(req.coach_message_id)
    if not coach_msg:
        raise HTTPException(status_code=404, detail="Coach message not found")

    saved = await rating_repo.create(
        conversation_id=coach_msg["conversation_id"],
        coach_message_id=req.coach_message_id,
        rating=req.rating,
        feedback=req.feedback,
    )
    return RatingOut(**saved)
