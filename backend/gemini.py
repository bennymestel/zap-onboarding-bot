import os

import google.genai as genai
from google.genai import types

CLOSING_PROMPT = """כתוב הודעת סיום קצרה ואישית בעברית ללקוח שסיים להירשם לזאפ.
כלול:
- ברכה חמה עם שם העסק
- אישור שהמידע נשמר במערכת זאפ
- הצעדים הבאים: צוות זאפ יצור קשר תוך 24 שעות, תקבל גישה לפאנל הניהול, תוכל להתחיל לקבל לידים
- הזמנה לפנות בכל שאלה
שמור על טון חם ומקצועי. אל תוסיף JSON או כותרות."""

MODEL_ID = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


async def generate_closing_message(customer: dict) -> str:
    client = _get_client()

    prompt = f"{CLOSING_PROMPT}\n\nשם העסק: {customer['business_name']}"

    config = types.GenerateContentConfig(
        temperature=0.8,
        max_output_tokens=512,
    )

    response = await client.aio.models.generate_content(
        model=MODEL_ID,
        contents=prompt,
        config=config,
    )

    return response.text
