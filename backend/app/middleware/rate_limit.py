"""Simple in-memory rate limiter."""
import time
from collections import defaultdict
from fastapi import HTTPException, Request
from app.config import settings


class RateLimiter:
    def __init__(self):
        self._requests: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.time()
        window = settings.rate_limit_window_seconds
        max_requests = settings.rate_limit_requests

        # Clean old entries
        self._requests[key] = [
            t for t in self._requests[key] if now - t < window
        ]

        if len(self._requests[key]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please slow down.",
            )

        self._requests[key].append(now)


rate_limiter = RateLimiter()


async def get_rate_limit_key(request: Request) -> str:
    """Extract rate limit key from request (user_id or IP)."""
    # TODO: Use user_id from auth when available
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
