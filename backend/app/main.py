"""Averroes FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.database import init_db
from app.routers import chat, coach, conversations, spaces, files

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    logging.info("Database initialized")
    yield


app = FastAPI(
    title="Averroes",
    description="The Commentator — AI prompt coaching engine",
    version="0.1.0",
    lifespan=lifespan,
    # Disable automatic trailing-slash redirects. Without this, FastAPI sends a
    # 307 to http://localhost:8000/... which external browsers (via ngrok) can't
    # reach. Routes are defined without trailing slash instead.
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router)
app.include_router(coach.router)
app.include_router(conversations.router)
app.include_router(spaces.router)
app.include_router(files.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "averroes"}
