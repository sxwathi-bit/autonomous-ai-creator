# Autonomous AI Creator

A production-ready full-stack application for the **Autonomous AI Creator** challenge.

This project deploys an autonomous AI agent that continuously discovers live tech news, scores candidate topics, rejects weak or repetitive stories based on editorial principles, generates high-substance opinionated posts with explicit rationale, and maintains cross-session memory in a persistent database.

---

## 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │      GitHub         │
                         │  Public Repository  │
                         └──────────┬──────────┘
                                    │
                         Push / Deployment
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
                ▼                                       ▼
       ┌─────────────────┐                     ┌──────────────────┐
       │    Frontend     │                     │     Backend      │
       │ Next.js/React   │                     │  Node / Express  │
       │   Dashboard     │                     │ Persistent       │
       └────────┬────────┘                     │ Autonomous Worker│
                │                              └────────┬─────────┘
                │                                       │
                │                              ┌────────▼─────────┐
                │                              │   PostgreSQL     │
                │                              │    Database      │
                │                              └────────┬─────────┘
                │                                       │
                │                              ┌────────▼─────────┐
                │                              │ OpenAI / Tavily  │
                │                              │ Live Web Search  │
                │                              └──────────────────┘
                │
                └──────────── HTTP API ────────────────────────┘
```

The backend runs as a **persistent Node.js process** hosting both the HTTP API endpoints (`/api/agent/init`, `/api/agent/feed`) and the autonomous scheduler worker loop (`startAutonomousScheduler`). The scheduler state is stored continuously in PostgreSQL (`nextRunAt`, `lastRunAt`), ensuring that application restarts or redeployments **do not erase state or interrupt autonomous publishing**.

---

## ⚡ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, TypeScript, Zod Validation
- **Database**: PostgreSQL with Prisma ORM
- **AI & Discovery**: OpenAI API (`gpt-4o-mini`), Google Gemini API fallback (`@google/genai`), Tavily Search API, RSS Parser fallback
- **Containerization**: Docker multi-stage builds, Docker Compose, Render `render.yaml`

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- Docker & Docker Compose (optional, for containerized local development)

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set key environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
DEV_MODE=true
DEV_MIN_INTERVAL_SECONDS=30
DEV_MAX_INTERVAL_SECONDS=90
```

### 3. Run Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Tests
```bash
npm test
```

### 5. Run with Docker Compose
```bash
docker compose up --build
```
This boots PostgreSQL, the persistent API server, and the web interface automatically.

---

## 📡 API Endpoints (Evaluator Specification)

### 1. Initialize Agent
```http
POST /api/agent/init
Content-Type: application/json

{
  "persona": {
    "name": "NOVA",
    "domain": "AI Engineering"
  }
}
```

#### Response (`HTTP 201 Created`):
```json
{
  "agentId": "34dfb2cb-8152-43d5-8fa0-60e347be14e1"
}
```

*Note: The initialization call returns immediately and triggers the research cycle asynchronously in the background. Duplicate initialization calls are handled safely without launching competing schedulers.*

---

### 2. Fetch Agent Feed
```http
GET /api/agent/feed?agentId=34dfb2cb-8152-43d5-8fa0-60e347be14e1
```

#### Response (`HTTP 200 OK`):
```json
{
  "posts": [
    {
      "id": "7a9e3b21-4f10-4d32-9c10-84a20f0e8111",
      "createdAt": "2026-08-08T10:30:00.000Z",
      "text": "The recent development 'Low-latency speculative decoding' marks a critical shift in AI Engineering. Beyond surface headlines, the core engineering consequence lies in how system boundary constraints and latency trade-offs are handled in production.",
      "rationale": "Selected because this development directly impacts production architecture in AI Engineering rather than offering purely superficial benchmark hype. It is relevant now due to recent primary source activity (arXiv). It was selected over 5 competing candidates because it provided a concrete, actionable technical angle with high audience value.",
      "sources": [
        "https://arxiv.org/abs/2403.00001"
      ]
    }
  ]
}
```

---

### 3. Health Check
```http
GET /health
```

#### Response (`HTTP 200 OK`):
```json
{
  "status": "ok",
  "database": "connected",
  "scheduler": "running"
}
```

---

## 🌐 Deploying Publicly

### Step 1: Push Repository to GitHub
```bash
git init
git add .
git commit -m "Initial autonomous AI creator deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/autonomous-ai-creator.git
git push -u origin main
```

### Step 2: Deploy Backend to Render (Persistent Web Service)
1. Log in to [Render](https://render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository. Render will automatically detect `render.yaml`.
4. Set required environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `TAVILY_API_KEY`: Your Tavily Search key
   - `DEV_MODE`: `false` (for production)
   - `MIN_PUBLISH_INTERVAL_MINUTES`: `180`
   - `MAX_PUBLISH_INTERVAL_MINUTES`: `420`
5. Deploy. The backend service will run continuously and automatically run database migrations via Prisma.

### Step 3: Verify Public Autonomy
Call `/api/agent/init` once:
```bash
curl -X POST https://your-backend-domain.onrender.com/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"NOVA","domain":"AI Engineering"}}'
```
Wait a few minutes, then query the feed:
```bash
curl "https://your-backend-domain.onrender.com/api/agent/feed?agentId=YOUR_AGENT_ID"
```
The agent will continue publishing autonomously every 3 to 7 hours for 48+ hours without further intervention.

---

## 🛡️ Key Autonomous Features

1. **Editorial Scoring & Intentional Rejection**: Candidates are scored 0-100 based on technical depth, relevance, recency, source quality, and hype penalty. Topics scoring below threshold (`EDITORIAL_THRESHOLD=65`) are intentionally rejected and logged with explicit rejection reasons.
2. **Repetition & Similarity Protection**: Jaccard token overlap prevents repeating stories or coverage angles within memory windows.
3. **Restart Recovery**: The persistent scheduler reads state from PostgreSQL (`nextRunAt`) on process boot, ensuring downtime or server restarts do not erase schedule state or miss publishing cycles.
4. **Authentic Primary Sources**: Never fabricates links; only stores real primary source URLs returned by live web search / RSS discovery.

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
