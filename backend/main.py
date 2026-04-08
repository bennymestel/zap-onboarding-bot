import os
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import init_db, save_customer, get_all_customers, delete_customer
from gemini import generate_closing_message

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("zap")

# Questions asked in order
QUESTIONS = [
    "איך קוראים לעסק שלך?",
    "מה מספר הטלפון של העסק?",
    "מה כתובת האימייל של העסק?",
    "מה הכתובת של העסק? (רחוב ועיר)",
    "באיזה קטגוריה העסק שלך? (לדוגמה: טכנאי מזגנים, חשמלאי)",
    "מה 3–5 השירותים העיקריים שאתה מציע?",
]

FIELD_KEYS = ["business_name", "phone", "email", "address", "category", "services"]

# session_id -> {"step": int, "data": dict}
sessions: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — initialising database")
    await init_db()
    log.info("Database ready")
    yield
    log.info("Shutting down")


app = FastAPI(title="Zap Onboarding Bot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    onboarding_complete: bool = False
    customer: Optional[dict[str, Any]] = None


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session = sessions.setdefault(req.session_id, {"step": 0, "data": {}})
    step = session["step"]

    # Save the answer to the current question
    value = req.message.strip()
    key = FIELD_KEYS[step]
    if key == "services":
        # Split comma or newline separated services into a list
        session["data"][key] = [s.strip() for s in value.replace("\n", ",").split(",") if s.strip()]
    else:
        session["data"][key] = value

    log.info("[%s] step %d/%d — %s: %r", req.session_id[:8], step + 1, len(QUESTIONS), key, value[:60])

    session["step"] = step + 1
    next_step = session["step"]

    # More questions to ask
    if next_step < len(QUESTIONS):
        ack = _ack(step)
        reply = f"{ack}{QUESTIONS[next_step]}"
        return ChatResponse(session_id=req.session_id, reply=reply)

    # All answers collected — save and generate closing message
    log.info("[%s] all fields collected, saving customer", req.session_id[:8])
    try:
        saved_customer = await save_customer(session["data"])
    except Exception as e:
        log.error("[%s] DB save failed: %s", req.session_id[:8], e)
        raise HTTPException(status_code=500, detail="Failed to save customer")

    try:
        closing = await generate_closing_message(session["data"])
    except Exception as e:
        log.error("[%s] Gemini closing message failed: %s", req.session_id[:8], e)
        closing = f"תודה רבה! פרטי העסק {session['data'].get('business_name', '')} נשמרו בהצלחה. צוות זאפ יצור איתך קשר תוך 24 שעות."

    del sessions[req.session_id]

    return ChatResponse(
        session_id=req.session_id,
        reply=closing,
        onboarding_complete=True,
        customer=saved_customer,
    )


def _ack(step: int) -> str:
    """Short acknowledgement before the next question."""
    acks = ["תודה! ", "מעולה! ", "מצוין! ", "תודה רבה! ", "נהדר! ", ""]
    return acks[step % len(acks)]


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    sessions.pop(session_id, None)
    return {"ok": True}


@app.get("/admin/customers")
async def admin_list_customers():
    customers = await get_all_customers()
    return {"customers": customers}


@app.delete("/admin/customers/{customer_id}")
async def admin_delete_customer(customer_id: int):
    await delete_customer(customer_id)
    return {"ok": True}


@app.get("/health")
async def health():
    return {"status": "ok"}


# Serve React frontend — must come after all API routes
_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
