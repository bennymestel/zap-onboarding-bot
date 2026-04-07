# Zap Onboarding Bot

A Hebrew RTL chatbot that onboards new businesses onto the Zap Group platform through a natural conversation — one question at a time, instead of a cold form.

**Live demo:** https://zap-onboarding-bot.onrender.com
> First load may take ~30 seconds.

---

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Backend  | Python · FastAPI · SQLite                       |
| AI       | Google Gemini Flash (`google-genai` SDK)        |
| Frontend | React 18 · Vite · RTL Hebrew UI                 |
| Deploy   | Render.com                                      |

---

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### Setup

```bash
cp .env.example .env
# Set GEMINI_API_KEY in .env
```

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:8000`

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | Send a message, get the next bot reply |
| `GET` | `/admin/customers` | List all saved customers |
| `DELETE` | `/admin/customers/:id` | Delete a customer |
| `GET` | `/health` | Health check |

---

## Project Structure

```
zap-onboarding-bot/
├── backend/
│   ├── main.py          # FastAPI app + API routes
│   ├── database.py      # SQLite init + queries
│   ├── gemini.py        # Gemini client + closing message
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatBot.jsx
│       │   ├── AdminPage.jsx
│       │   └── CustomerCard.jsx
│       └── App.jsx
├── render.yaml
└── .env.example
```
