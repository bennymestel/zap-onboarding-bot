# זאפ – בוט הצטרפות עסקים

A Hebrew RTL chatbot that onboards new businesses onto the Zap Group platform through a natural conversation.

---

## Why a Chatbot Instead of a Form?

A traditional onboarding form feels cold and transactional. A conversational bot:

- **Feels personal** — the user is guided step-by-step, not confronted with a wall of fields
- **Reduces drop-off** — one question at a time is less intimidating than a full form
- **Handles ambiguity** — Gemini can ask follow-up questions if an answer is unclear
- **Produces richer data** — the model can extract structured data from natural Hebrew input (e.g. "אנחנו עושים התקנות, תיקונים ותחזוקה" → three distinct services)
- **Matches the brand** — Zap is a modern, customer-focused platform; a warm bot reflects that

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Python 3.9+ · FastAPI · SQLite      |
| AI       | Google Gemini 3.1 Flash Lite Preview (`google-genai` SDK) |
| Frontend | React 18 · Vite · RTL Hebrew UI     |
| Deploy   | Railway (backend) · Vercel (frontend) |

---

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Environment Variables

```bash
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API starts at `http://localhost:8000`.  
SQLite database (`backend/onboarding.db`) is created automatically on first run.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

---

## Deployment

### Backend → Railway

1. Push this repo to GitHub.
2. Create a new Railway project → **Deploy from GitHub repo** → select the repo.
3. Set **Root Directory** to `backend/`.
4. Railway reads `railway.json` and `Procfile` automatically.
5. In the Railway **Variables** tab, set:
   ```
   GEMINI_API_KEY=<your key>
   FRONTEND_URL=https://<your-vercel-app>.vercel.app
   ```
6. (Optional) Add a Railway **Volume** mounted at `/data` and set `DATABASE_URL=/data/onboarding.db` for persistent SQLite across deploys. Without a volume, data resets on each deploy.

### Frontend → Vercel

1. Create a new Vercel project → **Import Git Repository**.
2. Set **Root Directory** to `frontend/`.
3. Vercel auto-detects Vite. Build command: `npm run build`, output: `dist/`.
4. In Vercel **Environment Variables**, set:
   ```
   VITE_API_URL=https://<your-railway-app>.railway.app
   ```
5. Deploy. The `vercel.json` rewrites handle client-side routing.

---

## Environment Variables

| Variable       | Where set         | Description                                      |
|----------------|-------------------|--------------------------------------------------|
| `GEMINI_API_KEY` | `.env` / Railway  | Google Gemini API key                           |
| `GEMINI_MODEL`   | `.env` / Railway  | Model override (default: `gemini-3.1-flash-lite-preview`) |
| `DATABASE_URL`   | Railway           | SQLite file path (default: `backend/onboarding.db`) |
| `FRONTEND_URL`   | Railway           | Vercel app URL, added to CORS allowed origins   |
| `VITE_API_URL`   | Vercel            | Railway backend base URL (empty = use Vite proxy locally) |

---

## API

### `POST /chat`

**Request**
```json
{ "session_id": "uuid-string", "message": "text from user" }
```

**Response**
```json
{ "session_id": "uuid-string", "reply": "bot message", "onboarding_complete": false }
```

When `onboarding_complete` is `true`, the customer has been saved to SQLite.

### `GET /health`
Returns `{"status": "ok"}` — used by Railway for health checks.

---

## Database

```bash
sqlite3 backend/onboarding.db "SELECT * FROM customers;"
```

Schema:
```sql
CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  category      TEXT,
  services      TEXT,   -- JSON array, e.g. '["התקנות","תיקונים"]'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Example Output

### Conversation Excerpt

```
בוט:   שלום! אני כאן לעזור לך להצטרף לזאפ. איך קוראים לעסק שלך?
משתמש: קירור ישראל בע"מ
בוט:   תודה! מה מספר הטלפון של העסק?
משתמש: 050-1234567
...
```

### Saved Customer Card

```json
{
  "id": 1,
  "business_name": "קירור ישראל בע\"מ",
  "phone": "050-1234567",
  "email": "info@cooling-il.co.il",
  "address": "רחוב הרצל 12, תל אביב",
  "category": "טכנאי מזגנים",
  "services": ["התקנת מזגנים", "תיקון מזגנים", "תחזוקה שנתית", "ניקוי פילטרים"],
  "created_at": "2026-04-06 10:32:14"
}
```

### Onboarding Script (bot's final message)

> ברוכים הבאים לזאפ, קירור ישראל! 🎉
>
> המידע שלכם נשמר בהצלחה במערכת שלנו.
>
> הצעדים הבאים:
> 1. צוות זאפ יצור אתכם קשר בתוך 24 שעות לאישור הפרופיל
> 2. תקבלו גישה לפאנל הניהול שלכם
> 3. תוכלו להתחיל לקבל לידים מלקוחות באזורכם
>
> יש שאלות? אנחנו כאן בשבילכם. ברוכים הבאים למשפחת זאפ! 💪

---

## Project Structure

```
zap-onboarding-bot/
├── backend/
│   ├── main.py          # FastAPI app + /chat endpoint
│   ├── database.py      # SQLite init + save_customer()
│   ├── gemini.py        # Gemini client, JSON parser, system prompt
│   ├── requirements.txt
│   ├── Procfile         # Railway process definition
│   └── railway.json     # Railway deployment config
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Chat UI component
│   │   ├── App.css      # RTL Hebrew styles
│   │   └── main.jsx     # React entry point
│   ├── index.html       # lang="he" dir="rtl"
│   ├── package.json
│   ├── vite.config.js   # Dev proxy + build config
│   └── vercel.json      # SPA rewrite rule
├── .env.example
├── .gitignore
└── README.md
```
