# Averroes: prompt coaching for LLM chat

**Category:** self-hosted **AI chat + prompt-quality layer** (not a general agent framework, not a model trainer). Stack: **Next.js**, **FastAPI**, **SQLite**, **DeepSeek** via an OpenAI-compatible HTTP API, **SSE** streaming.

## What it does

Every time the main assistant answers, a **second model pass** (the Commentator) reads the same thread, notes what was fuzzy or under-specified in your prompt, and returns a **cleaned-up prompt** you can drop back into the box. That loop runs in the UI as you work, not as a separate lint tool run offline.

There is also a **0→1 workshop** mode: a short back-and-forth whose goal is one solid prompt before you rely on normal chat. **PDF, DOCX, and TXT** uploads get parsed server-side; both the main assistant and the coach see that text when building context.

## Who it's for

- People who already use **chat-style LLMs** for real work and want **feedback on how they ask**, without switching to a different product category (IDE plugins, CLI-only tools, batch eval pipelines).
- Teams or individuals willing to **self-host** and bring a **DeepSeek API key** (swap another OpenAI-compatible endpoint in code if you fork).
- Developers who want a **reference implementation**: SSE wiring, coach prompts, SQLite schema for conversations + coach history + files.

## Why it's different

| Typical chat UI | Here |
|-----------------|------|
| One model, one thread | Main answer **plus** automatic coaching on **that** exchange |
| You guess prompt fixes yourself | Coach proposes a **rewritten prompt** tied to what actually happened |
| Blank canvas for new tasks | **Workshop** mode structures the first prompt before long chats |
| Prompt tips in docs only | **In-session** critique + optional file-grounded context |

It is **not** trying to be the smallest possible ChatGPT clone: the extra coach call and workshop path are the point (with the tradeoff: **more tokens per user turn**).

> **Warning:** Self-hosting requires a DeepSeek API key on the server only. Never commit keys or put them in frontend env vars exposed to the browser.

There is still **no login**: the API trusts a single demo user id for every caller. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before you hang this on a public URL.

---

## Live demo

**[averroes-llm.vercel.app](https://averroes-llm.vercel.app)** (hosted demo; backend operated by the deployer). Clone this repo to run your own stack and keys.

---

## Requirements

- Python 3.11+
- Node.js 20+
- FFmpeg / LaTeX: unused here unless you extend the project

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

Set `DEEPSEEK_API_KEY` in `.env` before first launch.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Adjust `.env.local` if the API is not at `http://localhost:8000`.

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Meaning |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | Yes | Outbound LLM auth |
| `FRONTEND_URL` | Production | CORS origin for your Next.js URL (or `http://localhost:3000`) |
| `DB_PATH` | No | SQLite path (default `averroes.db`) |
| `DEBUG` | No | Verbose logs when `true` |

More options: `backend/.env.example`.

### Frontend (`frontend/.env.local`)

| Variable | Required | Meaning |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | If UI and API differ | FastAPI base URL **without** trailing slash (browser talks here for SSE). |

---

## Run locally

API:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Web:

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
| `backend/app/routers/` | Chat, coach, workshop, conversations, files, spaces |
| `backend/app/prompts/` | Assistant + coach system prompts |
| `backend/app/services/llm.py` | Streaming DeepSeek client |
| `frontend/lib/api.ts` | Fetch + SSE parsing |
| `frontend/components/` | Chat, commentator panel, sidebar |

Flows and SSE event shapes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## OpenAPI and `/docs`

FastAPI exposes `/docs` and `/openapi.json` by default. Fine for dev; on a public API some teams disable them in `backend/app/main.py` (`docs_url` / `openapi_url`).

---

## Deploy

1. Run the API where **long-lived SSE** is OK.
2. Set `DEEPSEEK_API_KEY` and `FRONTEND_URL` to your real UI origin.
3. Deploy Next.js with `NEXT_PUBLIC_API_URL` pointing at that API.

`backend/railway.json` and `frontend/vercel.json` are examples only (no secrets).

---

## GitHub metadata (for repo admins)

Paste under **Settings → General** so search and browse classify the project clearly.

**Short description (About box):**

```text
Prompt-coaching web app for LLM chat: post-reply critique, rewritten prompts, workshop mode, file context. Next.js, FastAPI, DeepSeek, SSE.
```

**Topics (suggested):**

`prompt-engineering` `llm` `generative-ai` `ai-chatbot` `deepseek` `fastapi` `nextjs` `server-sent-events` `sqlite` `typescript` `python` `self-hosted` `prompt-improvement`

(Add `nextjs15` or similar only if you want version-specific browse; GitHub topic naming varies.)

---

## Contributing

Do not commit `.env`, `.env.local`, or live keys. Extend `*.example` when you add settings.

---

## License

[MIT](LICENSE)
