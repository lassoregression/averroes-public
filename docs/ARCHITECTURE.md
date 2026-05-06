# How the pieces fit

Next.js serves pages. FastAPI serves `/api` and SQLite. Keys stay in Python env, not in the bundle.

Client code prefixes every call with `NEXT_PUBLIC_API_URL` and hits `/api/...` there (`frontend/lib/api.ts`). The API reads `FRONTEND_URL` for CORS plus hard-coded localhost for dev (`backend/app/main.py`).

## SSE payloads

Streams are newline-delimited `data: {json}` lines (standard SSE). Three endpoints emit them.

### `POST /api/chat/stream`

| `type`     | Extra fields | When |
|------------|--------------|------|
| `chunk`    | `content` (string, append for assistant text) | Once per model token batch |
| `done`     | `message_id` | Assistant message persisted |
| `title`    | `title` | Only after the very first exchange (two rows in DB), title generation best-effort |
| `error`    | `message` | Failure mid-stream |

### `POST /api/coach/respond`

Commentator (auto after a chat reply, or manual message from the panel).

| `type`  | Extra fields | When |
|---------|--------------|------|
| `chunk` | `content` | Coach text streaming |
| `done`  | `coach_message_id`, `refined_prompt` (string or null if extraction missed) | Row saved in `coach_messages` |
| `error` | `message` | Failure |

### `POST /api/coach/workshop`

0→1 workshop turns; same transport shape with different `done` semantics.

| `type`  | Extra fields | When |
|---------|--------------|------|
| `chunk` | `content` | Workshop reply streaming |
| `done`  | `coach_message_id`, `workshop_ready` (bool), `refined_prompt` (string or null) | `workshop_ready` is true if `[WORKSHOP_READY]` appears in raw output or a refined prompt was extracted |
| `title` | `title` | Only on the first workshop round-trip for that conversation |
| `error` | `message` | Failure |

Non-streaming: `POST /api/coach/workshop/send` flips the conversation back to `regular` mode and echoes `refined_prompt` JSON.

## FastAPI and trailing slashes

Collection routes are registered with `""`, not `"/"`, and `redirect_slashes=False` on the app. Otherwise FastAPI can answer `GET /api/foo` with a redirect to the slash variant using an absolute URL pointing at `localhost`, which looks fine in a browser on your laptop but breaks when the user sits behind ngrok or another hostname. If you add routers, keep that pattern or expect redirect surprises.

## Where to change behavior

- Routes and streaming glue: `backend/app/routers/` (`chat.py`, `coach.py`, plus conversations, files, spaces).
- Instructions to the models: `backend/app/prompts/assistant.py`, `backend/app/prompts/coach.py`.
- DeepSeek calls: `backend/app/services/llm.py`.
- Tables and init: `backend/app/models/database.py`.
- Client typings + SSE parsing: `frontend/lib/api.ts`.
- Layout of chat vs coach panel vs workshop state: `frontend/components/` and `frontend/lib/commentator-context.tsx`.

Run the API locally and open `/docs` if you want every path listed interactively.

## Hosting

This repo does not auto-wire CI. Clone/fork means your SQLite path, secrets, and dashboard buttons on Railway/Vercel (if you use them). Nobody else's production picks up your Git remote edits by accident.
