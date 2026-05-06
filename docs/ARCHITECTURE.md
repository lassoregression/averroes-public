# Architecture

Skim this before you rip out a feature or trace a bug. The code is split in predictable places; the sharp edges are SSE payloads and workshop completion rules.

## What talks to what

The browser loads Next.js. API calls do **not** go through Next rewrites in this tree: `frontend/lib/api.ts` uses `NEXT_PUBLIC_API_URL` and hits FastAPI at `/api/...` on that host. Long SSE streams stay off serverless timeouts that way.

FastAPI owns SQLite (`DB_PATH`), prompts, and `DEEPSEEK_API_KEY`. CORS allows `FRONTEND_URL` and `http://localhost:3000` (`backend/app/main.py`).

`redirect_slashes=False` on FastAPI is deliberate. Some proxies strip trailing slashes; FastAPI’s default redirects pointed browsers at `localhost` and broke tunnel setups. Collection routes use `""` instead of `"/"` where it matters.

## Flows (behavioral, not line-by-line)

**Freestyle:** User posts to chat SSE. Assistant tokens stream. After the stream ends the UI fires coach SSE (`coach_type` auto) so the commentator reacts to the latest exchange without the main model seeing that side channel.

**Workshop:** Early turns post to `/api/coach/workshop` instead of main chat. History rows use `coach_type=workshop`. When the server decides the workshop is done (`workshop_ready` on the `done` event, see below), the client moves on; sending the refined prompt to main chat goes through `/api/coach/workshop/send`, which flips the conversation mode back to `regular`.

**Files:** Upload router plus `file_parser.py`; repositories attach extracted text into prompts for chat and coach paths.

## SSE wire format

Bodies are standard SSE lines: `data: {"type":"...", ...}\n\n`. JSON always includes `type`.

### `POST /api/chat/stream` (`backend/app/routers/chat.py`)

| `type` | Payload | When |
|--------|---------|------|
| `chunk` | `content`: assistant token string | Many times until completion |
| `done` | `message_id`: saved assistant row id | Once, after tokens finish and DB write |
| `title` | `title`: short string | Optional; only after the **first** full exchange (exactly two messages in thread). Generation failures are swallowed server-side |
| `error` | `message`: user-facing string | On failure |

### `POST /api/coach/respond` (commentator, freestyle + manual)

| `type` | Payload | When |
|--------|---------|------|
| `chunk` | `content`: coach token string | Until completion |
| `done` | `coach_message_id`, `refined_prompt` (string or null after delimiter extraction) | Once |
| `error` | `message` | On failure |

Auto vs manual only changes the trigger text sent as the user message to the model; the SSE shape is the same.

### `POST /api/coach/workshop`

| `type` | Payload | When |
|--------|---------|------|
| `chunk` | `content`: workshop token string | Until completion |
| `done` | `coach_message_id`, `workshop_ready` (bool), `refined_prompt` (string or null) | Once. `workshop_ready` is true if `"[WORKSHOP_READY]"` appears in the raw model output **or** `_extract_refined_prompt` found something (`backend/app/routers/coach.py`) |
| `title` | `title` | Optional; first workshop exchange only (when there was no prior workshop row) |
| `error` | `message` | On failure |

Refined prompt extraction tolerates messy delimiters; see `_extract_refined_prompt` in the same file.

## Where to edit

Rough map:

- Routes and streaming: `backend/app/routers/`
- Instructions to the models: `backend/app/prompts/assistant.py`, `coach.py`
- DeepSeek client: `backend/app/services/llm.py`
- Tables and init: `backend/app/models/database.py`, `schemas.py`
- CRUD-ish glue: `backend/app/repositories/`
- Fetch + SSE parsing in the UI: `frontend/lib/api.ts`
- Layout of chat vs panel vs workshop state: `frontend/components/chat/`, `frontend/components/commentator/`, `frontend/lib/commentator-context.tsx`

Live OpenAPI: hit `/docs` on your running API unless someone disabled it.

## Forking

Nothing in this repo auto-deploys **your** fork. Copy env vars from `README.md`, point `NEXT_PUBLIC_API_URL` at wherever FastAPI lives, and treat SQLite as local state unless you swap storage yourself.
