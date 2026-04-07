import sqlite3
import asyncio
import json
import os
from pathlib import Path

DB_PATH = Path(os.environ.get("DATABASE_URL", str(Path(__file__).parent / "onboarding.db")))

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS customers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    category      TEXT,
    services      TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def _init_db_sync() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(CREATE_TABLE_SQL)
    conn.commit()
    conn.close()


async def init_db() -> None:
    await asyncio.to_thread(_init_db_sync)


def _row_to_dict(row) -> dict:
    d = dict(row)
    try:
        d["services"] = json.loads(d["services"] or "[]")
    except (json.JSONDecodeError, TypeError):
        d["services"] = []
    return d


def _save_customer_sync(data: dict) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO customers (business_name, phone, email, address, category, services)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("business_name"),
            data.get("phone"),
            data.get("email"),
            data.get("address"),
            data.get("category"),
            json.dumps(data.get("services", []), ensure_ascii=False),
        ),
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.execute(
        "SELECT id, business_name, phone, email, address, category, services, created_at "
        "FROM customers WHERE id = ?",
        (new_id,),
    )
    row = _row_to_dict(cursor.fetchone())
    conn.close()
    return row


async def save_customer(data: dict) -> dict:
    return await asyncio.to_thread(_save_customer_sync, data)


def _get_all_customers_sync() -> list:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, business_name, phone, email, address, category, services, created_at "
        "FROM customers ORDER BY id DESC"
    )
    rows = [_row_to_dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


async def get_all_customers() -> list:
    return await asyncio.to_thread(_get_all_customers_sync)


def _delete_customer_sync(customer_id: int) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    conn.commit()
    conn.close()


async def delete_customer(customer_id: int) -> None:
    await asyncio.to_thread(_delete_customer_sync, customer_id)
