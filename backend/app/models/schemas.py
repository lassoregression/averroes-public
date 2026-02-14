"""Pydantic models for API request/response contracts."""
from pydantic import BaseModel, Field
from enum import Enum


class ConversationMode(str, Enum):
    regular = "regular"
    zero_to_one = "zero_to_one"


class CoachType(str, Enum):
    auto = "auto"
    manual = "manual"
    workshop = "workshop"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


# --- Chat ---

class ChatRequest(BaseModel):
    conversation_id: str
    message: str = Field(max_length=4000)


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    created_at: str


# --- Coach ---

class CoachRequest(BaseModel):
    conversation_id: str
    message: str = Field(max_length=4000)
    coach_type: CoachType = CoachType.manual


class WorkshopSendRequest(BaseModel):
    conversation_id: str
    refined_prompt: str = Field(max_length=4000)


class CoachMessageOut(BaseModel):
    id: str
    conversation_id: str
    coach_type: CoachType
    user_prompt: str | None
    coach_response: str
    created_at: str


# --- Conversations ---

class ConversationCreate(BaseModel):
    mode: ConversationMode = ConversationMode.regular
    space_id: str | None = None
    title: str = Field(default="New conversation", max_length=200)


class ConversationOut(BaseModel):
    id: str
    title: str
    space_id: str | None
    user_id: str
    mode: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message_preview: str | None = None


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    space_id: str | None = None


# --- Spaces ---

class SpaceCreate(BaseModel):
    name: str = Field(max_length=100)


class SpaceOut(BaseModel):
    id: str
    name: str
    user_id: str
    auto_generated: bool
    created_at: str
    conversation_count: int = 0


class SpaceUpdate(BaseModel):
    name: str = Field(max_length=100)


# --- Files ---

class FileOut(BaseModel):
    id: str
    conversation_id: str
    name: str
    file_type: str
    size_bytes: int
    created_at: str


# --- Ratings ---

class RatingCreate(BaseModel):
    coach_message_id: str
    rating: int = Field(ge=-1, le=1)
    feedback: str | None = Field(default=None, max_length=500)


class RatingOut(BaseModel):
    id: str
    conversation_id: str
    coach_message_id: str
    rating: int
    feedback: str | None
    created_at: str


# --- Search ---

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)


class SearchResult(BaseModel):
    conversation_id: str
    conversation_title: str
    space_id: str | None
    snippet: str
    created_at: str
