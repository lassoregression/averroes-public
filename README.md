# Averroes

Averroes is a system that evaluates a user's prompts as they write them and rewrites weak prompts so the underlying model gets clearer instructions and produces better answers.

The interface is a standard chat plus **The Commentator**, a second model call after each exchange: it reads what you and the assistant did, says what was vague or missing, and emits a tightened prompt you can paste back into the thread. A separate **0→1 workshop** mode runs a short structured dialogue (still LLM-driven) whose goal is a single polished prompt before you switch to normal chat. Uploaded PDF, DOCX, and plain text files can be attached so both the main model and the coach see extracted text in context.

Streaming uses **Server-Sent Events**. The server is **FastAPI**, persistence is **SQLite** with FTS5 for search, and completion traffic goes to **DeepSeek** through an OpenAI-compatible HTTP API.

> **Warning:** Running your own instance requires a DeepSeek API key on the server. Never put that key in the frontend or in git. Use environment variables and your host's secret store.

---

## Live demo

Try the deployed build: **[averroes-llm.vercel.app](https://averroes-llm.vercel.app)**

The demo talks to a backend maintained by the deployer. This repo is what you run or fork when you want full control.

---

## Requirements

- Python 3.11 or newer (older 3.x may work but is untested here)
- Node.js 20 or newer
- [FFmpeg](https://ffmpeg.org/) and LaTeX: not used; ignore unless you add features that need them

---

## Install

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `DEEPSEEK_API_KEY` before first launch.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` if your API is not on `http://localhost:8000` (see below).

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Meaning |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | Yes | Authenticates outbound calls to DeepSeek |
| `FRONTEND_URL` | Production | Origin allowed by CORS (your Next.js URL, or `http://localhost:3000` locally) |
| `DB_PATH` | No | SQLite path; default `averroes.db` |
| `DEBUG` | No | Sets log verbosity when `true` |

Optional knobs (models, timeouts, rate limits, upload caps) are documented inline in `backend/.env.example`.

### Frontend (`frontend/.env.local`)

| Variable | Required | Meaning |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | When the UI is not served alongside the API | Base URL of FastAPI **without** a trailing slash. The browser calls this directly so SSE is not cut off by short serverless timeouts. |

---

## Run locally

Terminal 1 (API):

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2 (web):

```bash
cd frontend
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Repository layout

| Path | Responsibility |
|------|----------------|
| `backend/app/routers/` | HTTP: chat, coach and workshop, conversations, files, spaces |
| `backend/app/prompts/` | System prompts for the assistant and for the coach |
| `backend/app/services/llm.py` | Streaming client to DeepSeek |
| `frontend/lib/api.ts` | Fetch wrappers and SSE parsing |
| `frontend/components/` | Chat UI, commentator panel, sidebar |

---

## OpenAPI and `/docs`

FastAPI serves interactive docs at `/docs` and the schema at `/openapi.json`. Anyone who can reach the host can read the full route list. That helps local development and contributors; on an exposed production host it also helps strangers map your surface area. To hide both, pass `docs_url=None` and `openapi_url=None` into `FastAPI(...)` in `backend/app/main.py` (or tie visibility to an env flag).

---

## Deploy

1. Run the API somewhere that keeps long-lived HTTP connections (SSE). Container platforms and small VMs both work.
2. Inject `DEEPSEEK_API_KEY` and set `FRONTEND_URL` to the exact browser origin of your UI.
3. Build and host the Next app; set `NEXT_PUBLIC_API_URL` to the public API base URL.

`backend/railway.json` and `frontend/vercel.json` are reference configs only. They contain no secrets.

---

## Contributing

Pull requests are welcome. Do not commit `.env`, `.env.local`, or real keys. Extend `*.example` files when you add new settings.

---

## License

[MIT](LICENSE)
