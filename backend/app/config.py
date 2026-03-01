"""
Application Settings — Loaded from Environment Variables

Uses pydantic-settings to:
1. Validate all required env vars exist at startup (fail fast if missing)
2. Provide type-safe access to configuration values
3. Set sensible defaults for optional settings

Required environment variables:
- DEEPSEEK_API_KEY: Your DeepSeek API key (from platform.deepseek.com)

Optional overrides (with defaults):
- DEBUG, FRONTEND_URL, LLM_MODEL, LLM_BASE_URL, etc.

The .env file is loaded automatically in development.
In production, use platform-level secrets (Railway, Vercel, etc.)
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Required: DeepSeek API key (no default, must be provided) ---
    deepseek_api_key: str

    # --- Database: SQLite file path (relative or absolute) ---
    db_path: str = "averroes.db"

    # --- CORS: Frontend origin allowed to call this API ---
    frontend_url: str = "http://localhost:3000"

    # --- Debug mode: Enables verbose logging ---
    debug: bool = False

    # --- LLM Configuration ---
    llm_model: str = "deepseek-chat"            # Main chat model (DeepSeek V3)
    coach_model: str = "deepseek-chat"          # Commentator model (DeepSeek V3 — fast, format-reliable)
    llm_base_url: str = "https://api.deepseek.com"  # OpenAI-compatible endpoint
    llm_timeout: int = 30                         # Seconds before API call times out
    llm_max_retries: int = 2                      # Automatic retries on transient failures

    # --- Rate Limiting: Protect against abuse ---
    rate_limit_requests: int = 30     # Max requests per window per user/IP
    rate_limit_window_seconds: int = 60  # Rolling window size in seconds

    # --- File Upload Constraints ---
    max_file_size_mb: int = 10                    # Reject files larger than this
    allowed_file_types: list[str] = ["pdf", "docx", "txt"]  # Whitelist of extensions

    # --- Pydantic settings config ---
    # Tells pydantic-settings to read from .env file in the working directory
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# Singleton settings instance — imported by other modules
# If any required env var is missing, this will throw a clear error at import time
settings = Settings()
