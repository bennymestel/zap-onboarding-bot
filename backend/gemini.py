import os
import re
import json
from typing import Optional

import google.genai as genai
from google.genai import types

SYSTEM_PROMPT = """אתה נציג זאפ גרופ שמקליד עסקים חדשים למערכת.
השיחה כבר התחילה – אל תציג את עצמך ואל תברך מחדש.

כללים:
- שאל שאלה אחת בכל פעם, קצרה וישירה.
- אחרי כל תשובה: אמור תודה במשפט קצר ושאל את השאלה הבאה. לא יותר.
- אל תוסיף הסברים, פרסומת לזאפ, או משפטי מבוא.

סדר השאלות:
1. שם העסק
2. טלפון
3. אימייל
4. כתובת (רחוב ועיר)
5. קטגוריה (לדוגמה: טכנאי מזגנים, חשמלאי)
6. 3–5 שירותים עיקריים

כשכל השדות נאספו:
א. פלוט בלוק JSON בדיוק כך:
```json
{"business_name": "...", "phone": "...", "email": "...", "address": "...", "category": "...", "services": ["...", "..."]}
```
ב. אחרי הבלוק – פלוט הודעת סיום בעברית עם כל הסעיפים האלה:
- ברכה חמה אישית עם שם העסק
- אישור שהמידע נשמר במערכת זאפ
- הסבר על הצעדים הבאים: צוות זאפ יצור קשר תוך 24 שעות, תקבל גישה לפאנל הניהול, תוכל להתחיל לקבל לידים
- הזמנה לפנות בכל שאלה

אל תפלוט JSON בשום שלב אחר."""

REQUIRED_FIELDS = {"business_name", "phone", "email", "address", "category", "services"}
MODEL_ID = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def extract_json_block(text: str) -> Optional[dict]:
    pattern = r"```json\s*(\{.*?\})\s*```"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    for field in REQUIRED_FIELDS:
        value = data.get(field)
        if not value:
            return None
        if field == "services" and (not isinstance(value, list) or len(value) == 0):
            return None
    return data


def strip_json_block(text: str) -> str:
    pattern = r"```json\s*\{.*?\}\s*```\s*"
    return re.sub(pattern, "", text, flags=re.DOTALL | re.IGNORECASE).strip()


async def chat_with_gemini(history: list[dict]) -> str:
    client = _get_client()

    contents = [
        types.Content(
            role=msg["role"],
            parts=[types.Part.from_text(text=msg["text"])],
        )
        for msg in history
    ]

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.7,
        max_output_tokens=2048,
    )

    response = await client.aio.models.generate_content(
        model=MODEL_ID,
        contents=contents,
        config=config,
    )

    return response.text
