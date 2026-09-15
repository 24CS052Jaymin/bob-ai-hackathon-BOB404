"""
database.py — PostgreSQL persistence layer for analysis runs.

Uses `psycopg2` to connect to a PostgreSQL database.
Connection is configured via the DATABASE_URL environment variable:

    DATABASE_URL=postgresql://user:password@host:5432/dbname

Schema
------
    analysis_runs
        id            SERIAL  PRIMARY KEY
        created_at    TEXT    (ISO-8601 UTC timestamp)
        total_reports INTEGER
        total_signals INTEGER
        top_n         INTEGER
        n_clusters    INTEGER
        top_signals   TEXT    (JSON array of TopSignal dicts)

Public API
----------
    init_db()                        — create tables if they don't exist
    save_run(run: AnalysisRunCreate) — insert a run, return its id
    get_runs(limit)                  — list recent runs
    get_run(id)                      — fetch one run by id
"""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator

import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Connection URL — set DATABASE_URL in your .env file.
# Example: postgresql://postgres:secret@localhost:5432/regulens
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Add it to your .env file, e.g.:\n"
        "  DATABASE_URL=postgresql://user:password@localhost:5432/regulens"
    )

# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------
_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS analysis_runs (
    id            SERIAL  PRIMARY KEY,
    created_at    TEXT    NOT NULL,
    total_reports INTEGER NOT NULL,
    total_signals INTEGER NOT NULL,
    top_n         INTEGER NOT NULL,
    n_clusters    INTEGER NOT NULL,
    top_signals   TEXT    NOT NULL
);
"""


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------
@contextmanager
def _conn() -> Generator[psycopg2.extensions.connection, None, None]:
    """Yield a PostgreSQL connection with dict-like row access."""
    con = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


# ---------------------------------------------------------------------------
# Initialise
# ---------------------------------------------------------------------------
def init_db() -> None:
    """Create the database tables if they don't already exist."""
    with _conn() as con:
        with con.cursor() as cur:
            cur.execute(_CREATE_TABLE)


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------
def save_run(
    *,
    total_reports: int,
    total_signals: int,
    top_n: int,
    n_clusters: int,
    top_signals: list[dict[str, Any]],
) -> int:
    """Insert a new analysis run and return its auto-incremented id."""
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as con:
        with con.cursor() as cur:
            cur.execute(
                """
                INSERT INTO analysis_runs
                    (created_at, total_reports, total_signals, top_n, n_clusters, top_signals)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (now, total_reports, total_signals, top_n, n_clusters,
                 json.dumps(top_signals)),
            )
            row = cur.fetchone()
            return row["id"]  # type: ignore[index]


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------
def get_runs(limit: int = 50) -> list[dict[str, Any]]:
    """Return the most recent *limit* analysis runs, newest first."""
    with _conn() as con:
        with con.cursor() as cur:
            cur.execute(
                "SELECT * FROM analysis_runs ORDER BY id DESC LIMIT %s", (limit,)
            )
            rows = cur.fetchall()
    return [_row_to_dict(r) for r in rows]


def get_run(run_id: int) -> dict[str, Any] | None:
    """Return one analysis run by id, or None if not found."""
    with _conn() as con:
        with con.cursor() as cur:
            cur.execute(
                "SELECT * FROM analysis_runs WHERE id = %s", (run_id,)
            )
            row = cur.fetchone()
    return _row_to_dict(row) if row else None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    d = dict(row)
    d["top_signals"] = json.loads(d["top_signals"])
    return d
