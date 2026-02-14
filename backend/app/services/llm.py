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
) -> AsyncGenerator[str, None]:
    """Stream chat completion tokens from DeepSeek.

    Yields content chunks as they arrive.
    """
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        stream = await client.chat.completions.create(
            model=settings.llm_model,
            messages=full_messages,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"LLM stream error: {e}")
        raise


async def chat(
    messages: list[dict],
    system_prompt: str,
) -> str:
    """Non-streaming chat completion from DeepSeek."""
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=full_messages,
        )
        return response.choices[0].message.content or ""

    except Exception as e:
        logger.error(f"LLM chat error: {e}")
        raise
