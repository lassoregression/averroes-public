# Averroes

## Overview

Averroes evaluates your prompts as you work and helps rewrite weaker prompts so the underlying model can answer at higher quality.

You write in a main conversation. A coaching panel, the Commentator, responds to each exchange with observations and a refined version of your prompt when it helps. A guided workshop mode shapes an early idea into a clearer prompt before you send it to the main chat.

Responses stream in real time. The server uses FastAPI and SQLite with full text search. Language requests go to DeepSeek through an OpenAI compatible HTTP API. Your API key stays on the server only.

**Important.** Running this software requires your own [DeepSeek](https://platform.deepseek.com/) API key in backend configuration. The web app never receives that secret.

## Try Averroes

Open the live demo: [averroes-llm.vercel.app](https://averroes-llm.vercel.app)

The demo connects to a hosted backend maintained with the deployment. This repository contains source code so you can run or extend your own copy.

## What you need

- Python 3.11 or later recommended  
- Node.js 20 or later  
- A DeepSeek API key  

You do not need FFmpeg or LaTeX.

## Install the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `DEEPSEEK_API_KEY` at minimum.

On Windows, activate the virtual environment with `.venv\Scripts\activate`.

## Install the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` using the frontend variables below.

## Configure the backend

Variables live in `backend/.env`. See `backend/.env.example` for optional model, rate limit, and upload settings.

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | Authenticates the server to DeepSeek |
| `FRONTEND_URL` | For deployment | Browser origin allowed to call the API, such as `http://localhost:3000` or your production site URL |
| `DB_PATH` | No | Path to the SQLite file. Default is `averroes.db` |
| `DEBUG` | No | Set to `true` for verbose logs |

## Configure the frontend

Variables live in `frontend/.env.local`. See `frontend/.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | When the UI does not share an origin with the API | Base URL of the FastAPI server with no trailing slash. Example: `http://localhost:8000`. The browser uses this for streaming over SSE |

## Run locally

Start the API in one terminal:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Start the UI in another:

```bash
cd frontend
npm run dev
```

Open the app at [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health).

## Where things live

| Location | Role |
|----------|------|
| `backend/app/routers/` | Routes for chat, coaching and workshop, conversations, files, spaces |
| `backend/app/prompts/` | System prompts for the assistant and the Commentator |
| `backend/app/services/llm.py` | Streaming client for DeepSeek |
| `frontend/lib/api.ts` | Typed HTTP helpers and SSE handling |
| `frontend/components/` | Chat, Commentator panel, sidebar |

## API explorer and OpenAPI

By default, FastAPI serves Swagger UI at `/docs` and the OpenAPI description at `/openapi.json`.

Both help during development. Anyone who can reach your server can see route shapes and try requests.

On a public production host, some teams disable those URLs so the schema is not a ready map for automated probing. That choice is optional. To turn them off or tie them to an environment flag, adjust how `FastAPI` is constructed in `backend/app/main.py`.

## Deploy your own copy

1. Run the backend where long lived connections and SSE are supported.
2. Set `DEEPSEEK_API_KEY` and `FRONTEND_URL` to match your real web origin.
3. Deploy the frontend and set `NEXT_PUBLIC_API_URL` to your public API base URL.

Files such as `backend/railway.json` and `frontend/vercel.json` are minimal starter configuration. They contain no secrets.

## Contribute

Issues and pull requests are welcome. Commit `.env.example` only. Do not commit API keys or personal environment files.

## License

[MIT](LICENSE)
