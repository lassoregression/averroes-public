# Averroes: AI Prompt Coach

Averroes is a small web app for chatting with an LLM while a separate coach model reads each exchange, critiques weak prompting, and suggests tighter wording so the main model gets better instructions.

The main thread works like ordinary chat. After each assistant reply, **the Commentator** runs automatically on the same conversation: it reacts to what was actually said and proposes a refined prompt you can paste back. **Workshop mode** is for bootstrapping a task from scratch: a short dialogue whose aim is one solid prompt before you settle into normal chat. You can attach **PDF, DOCX, or plain text** files; text is extracted on the server and folded into context for both the assistant and the coach.

The UI streams tokens over **SSE**. The backend is **FastAPI** with **SQLite** (including full-text search). Outbound completions use **DeepSeek** through an OpenAI-compatible HTTP API.

> [!Warning]
> Self-hosted runs need your own **DeepSeek API key** on the server. Keep keys out of git and out of frontend env vars that ship to the browser. There is **no login** yet: the API uses a single demo user id for every caller. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before you expose this on a public URL.

> [!Note]
> **Hosted demo:** [averroes-llm.vercel.app](https://averroes-llm.vercel.app). That build is the same stack as this repo: **Next.js on Vercel** calling a **hosted FastAPI API** elsewhere. The API holds the DeepSeek key and database for that deployment; neither ships in git. Fork or clone the repo when you want your own backend, keys, and data.

## Requirements

* Python 3.11 or newer  
* Node.js 20 or newer  

FFmpeg and LaTeX are not used unless you extend the project.

## Installation

### Backend

```sh
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `DEEPSEEK_API_KEY` before you start the API.

### Frontend

```sh
cd frontend
npm install
cp .env.example .env.local
```

If your API is not at `http://localhost:8000`, set `NEXT_PUBLIC_API_URL` in `.env.local`.

## Running locally

API:

```sh
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Web:

```sh
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health).

## Configuration

Backend (`.env` in `backend/`):

* `DEEPSEEK_API_KEY` (required): outbound LLM auth  
* `FRONTEND_URL` (required in production): browser origin for CORS (your Next URL or `http://localhost:3000`)  
* `DB_PATH` (optional): SQLite file; default `averroes.db`  
* `DEBUG` (optional): more logging when `true`  

Other knobs (models, timeouts, uploads, rate limits) are listed in `backend/.env.example`.

Frontend (`.env.local` in `frontend/`):

* `NEXT_PUBLIC_API_URL`: FastAPI base URL **without** a trailing slash. The browser calls this directly so SSE is not cut off by short serverless timeouts.

## Where to look in the code

* `backend/app/routers/` … chat, coach, workshop, conversations, files, spaces  
* `backend/app/prompts/` … assistant and coach system prompts  
* `backend/app/services/llm.py` … streaming DeepSeek client  
* `frontend/lib/api.ts` … HTTP helpers and SSE parsing  
* `frontend/components/` … chat shell, commentator panel, sidebar  

SSE event shapes and routing: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## OpenAPI

With the API running, FastAPI serves `/docs` and `/openapi.json` like any stock FastAPI app. Handy for development. On a public host you may turn those off in `backend/app/main.py` if you do not want the route list readable.

## Deploying your own copy

1. Run FastAPI somewhere that tolerates long-lived SSE connections.  
2. Set `DEEPSEEK_API_KEY` and `FRONTEND_URL` to the real browser origin of your UI.  
3. Deploy Next.js with `NEXT_PUBLIC_API_URL` pointing at the public API base URL.

`backend/railway.json` and `frontend/vercel.json` are examples only (no secrets).

## Repository metadata (GitHub)

Use **Settings → General** if you want browse/search to classify the repo:

* **About:** Averroes: AI prompt coach for LLM chat. Critique and rewritten prompts after each turn, workshop mode, file context. Next.js, FastAPI, DeepSeek, SSE.  
* **Topics:** `prompt-engineering` `llm` `generative-ai` `ai-chatbot` `deepseek` `fastapi` `nextjs` `server-sent-events` `sqlite` `typescript` `python` `self-hosted` `prompt-improvement`

## Contributing

Pull requests are welcome. Say what you changed and how to see it. Do not commit `.env`, `.env.local`, or live keys; extend the `*.example` files when you add settings.

## License

This project is released under the [MIT License](LICENSE).
