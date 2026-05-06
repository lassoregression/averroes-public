# Averroes

Averroes is a small **prompt-coaching** workspace: a main chat plus **The Commentator**, a side panel that reacts to each exchange and can help refine how you prompt. It also includes a **0→1 workshop** flow for turning a rough idea into a sharper prompt before you commit it to the main thread.

The UI streams responses with **Server-Sent Events (SSE)**. The backend is **FastAPI** + **SQLite** (with full-text search). The LLM layer uses **DeepSeek** via an OpenAI-compatible API — you supply your own API key.

> **Note:** This repository is the application source. To run it yourself you need a [DeepSeek](https://platform.deepseek.com/) API key in backend environment variables. The frontend never sees that key.

---

## Try it

**Live demo:** [averroes-llm.vercel.app](https://averroes-llm.vercel.app)

*(Demo uses a hosted backend configured by the deployer; source in this repo is for running or extending your own instance.)*

---

## Prerequisites

- **Python** 3.11+ recommended  
- **Node.js** 20+  
- A **DeepSeek API key**  

Optional: **FFmpeg** / **LaTeX** are *not* required for this project (unlike some video pipelines).

---

## Installation

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set DEEPSEEK_API_KEY at minimum
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local — see Environment variables below
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | Yes | Server-side LLM authentication |
| `FRONTEND_URL` | For prod / CORS | Origin allowed to call the API (e.g. `http://localhost:3000` or your deployed site) |
| `DB_PATH` | No | SQLite file path (default: `averroes.db`) |
| `DEBUG` | No | Verbose logging when `true` |

See `backend/.env.example` for optional tuning (models, rate limits, uploads).

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | For remote backend | Base URL of the FastAPI server **without** trailing slash (e.g. `http://localhost:8000`). Used so the browser can stream SSE directly to the API. |

See `frontend/.env.example`.

---

## Running locally

**Terminal 1 — API**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — UI**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API health check: [http://localhost:8000/api/health](http://localhost:8000/api/health).

---

## Project layout

| Area | Role |
|------|------|
| `backend/app/routers/` | HTTP routes: chat, coach/workshop, conversations, files, spaces |
| `backend/app/prompts/` | System prompts for assistant + commentator / workshop |
| `backend/app/services/llm.py` | Streaming DeepSeek client |
| `frontend/lib/api.ts` | Typed client + SSE helpers |
| `frontend/components/` | Chat, commentator panel, sidebar |

---

## API documentation (`/docs` and `/openapi.json`)

FastAPI exposes interactive **Swagger UI** at `/docs` and the machine-readable **OpenAPI schema** at `/openapi.json` by default.

That is convenient for **development**: anyone who can reach your server can see every endpoint, parameter, and response shape — which helps contributors and debugging.

For a **production** deployment on the public internet, some teams turn those endpoints off so casual visitors cannot use them as a roadmap for probing uploads, chat, or rate limits. That is optional hardening, not a requirement for open-sourcing the code. If you self-host and want them disabled, set `FastAPI(..., docs_url=None, openapi_url=None)` (or gate on an environment flag) in `backend/app/main.py`.

---

## Deploying your own instance

Typical pattern:

1. Run the backend on any host that supports long-lived processes and SSE (e.g. Railway, Fly.io, a VPS).
2. Set backend secrets there: `DEEPSEEK_API_KEY`, `FRONTEND_URL` matching your real UI origin.
3. Deploy the frontend (e.g. Vercel) and set `NEXT_PUBLIC_API_URL` to your **public** API base URL.

`backend/railway.json` and `frontend/vercel.json` are minimal starter configs only; they contain no secrets.

---

## Contributing

Issues and pull requests are welcome. Please avoid committing `.env` files or API keys — use `.env.example` only.

---

## License

[MIT](LICENSE)
