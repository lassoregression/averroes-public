"""DeepSeek LLM service with retry, timeout, and streaming."""
import asyncio
import logging
from collections.abc import AsyncGenerator
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.deepseek_api_key,
    base_url=settings.llm_base_url,
    timeout=settings.llm_timeout,
    max_retries=settings.llm_max_retries,
)


async def stream_chat(
    messages: list[dict],
    system_prompt: str,
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat completion tokens from DeepSeek.

    Accepts an optional model override — defaults to settings.llm_model.
    For deepseek-reasoner, the API also returns reasoning_content (thinking tokens)
    in each delta. We only yield delta.content so thinking is hidden from the UI.
    Yields content chunks as they arrive.
    """
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    resolved_model = model or settings.llm_model

    try:
        stream = await client.chat.completions.create(
            model=resolved_model,
            messages=full_messages,
            stream=True,
        )

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            # delta.content holds the actual response; delta.reasoning_content holds
            # R1's chain-of-thought. We explicitly check content only — reasoning is
            # billed but intentionally hidden (user sees final output, not scratchpad).
            if delta.content:
                yield delta.content

    except Exception as e:
        logger.error(f"LLM stream error (model={resolved_model}): {e}")
        raise


async def chat(
    messages: list[dict],
    system_prompt: str,
    model: str | None = None,
) -> str:
    """Non-streaming chat completion from DeepSeek.

    Accepts an optional model override — defaults to settings.llm_model.
    """
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    resolved_model = model or settings.llm_model

    try:
        response = await client.chat.completions.create(
            model=resolved_model,
            messages=full_messages,
        )
        return response.choices[0].message.content or ""

    except Exception as e:
        logger.error(f"LLM chat error (model={resolved_model}): {e}")
        raise
