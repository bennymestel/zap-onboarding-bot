import os
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import init_db, save_customer, get_all_customers, delete_customer
from gemini import chat_with_gemini, extract_json_block, strip_json_block

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("zap")

# session_id -> list of {"role": "user"|"model", "text": str}
sessions: dict[str, list[dict]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — initialising database")
    await init_db()
    log.info("Database ready")
    yield
    log.info("Shutting down")


app = FastAPI(title="Zap Onboarding Bot", lifespan=lifespan)

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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

    history = sessions.setdefault(req.session_id, [])

    # Prime history with the welcome message the frontend already displayed,
    # so Gemini knows the greeting happened and doesn't repeat it.
    if not history:
        history.append({
            "role": "model",
            "text": "שלום וברוכים הבאים לזאפ! אני כאן כדי לעזור לך להצטרף לפלטפורמה שלנו. איך קוראים לעסק שלך?",
        })

    turn = len(history) // 2 + 1
    log.info("[%s] turn %d — user: %r", req.session_id[:8], turn, req.message.strip()[:80])

    history.append({"role": "user", "text": req.message.strip()})

    log.info("[%s] calling Gemini (%d messages in history)...", req.session_id[:8], len(history))
    try:
        raw_reply = await chat_with_gemini(history)
    except Exception as e:
        history.pop()
        log.error("[%s] Gemini error: %s", req.session_id[:8], e)
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    log.info("[%s] Gemini replied (%d chars)", req.session_id[:8], len(raw_reply))
    history.append({"role": "model", "text": raw_reply})

    customer_data = extract_json_block(raw_reply)
    onboarding_complete = False
    saved_customer = None

    if customer_data:
        log.info("[%s] JSON block detected — saving customer: %s", req.session_id[:8], customer_data.get("business_name"))
        try:
            saved_customer = await save_customer(customer_data)
            log.info("[%s] customer saved to DB", req.session_id[:8])
        except Exception as e:
            log.error("[%s] DB save failed: %s", req.session_id[:8], e)
        display_reply = strip_json_block(raw_reply)
        onboarding_complete = True
    else:
        display_reply = raw_reply

    return ChatResponse(
        session_id=req.session_id,
        reply=display_reply,
        onboarding_complete=onboarding_complete,
        customer=saved_customer,
    )


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
