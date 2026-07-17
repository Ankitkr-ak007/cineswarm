# CineSwarm

CineSwarm is an AI-powered movie recommendation system where four specialized agents (Critic, Vibes, Hidden Gems, Data) debate a candidate movie in real time. A Consensus agent then synthesizes a personalized score shown alongside the movie's actual public rating, providing cinephiles with a deep, multi-faceted analysis before they watch.

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Orchestration | LangGraph |
| LLMs | Groq (Llama 3.3 70B) + Gemini 2.5 Flash |
| Data | TMDB API |
| Database | Supabase (Postgres + pgvector) |
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui |
| Deploy | Vercel (frontend) + Render/Fly.io (backend) |

## How to Run and Test Locally

### 🔧 Prerequisites
* **Python**: `3.12` or higher
* **Node.js**: `18.x` or higher (with `npm`)

---

### 🐍 Backend Setup & Testing
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment (create it first if not present: `python -m venv .venv`):
   * **Windows (PowerShell)**: `.\.venv\Scripts\Activate.ps1`
   * **macOS/Linux**: `source .venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the unit and integration tests:
   ```bash
   python -m pytest
   ```
5. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

---

### 🎨 Frontend Setup & Testing
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Jest component tests:
   ```bash
   npx jest
   ```
4. Run Playwright End-to-End tests (ensure backend server is running on port `8000` first):
   ```bash
   npx playwright test
   ```
5. Start the Next.js development server:
   ```bash
   npm run dev
   ```

