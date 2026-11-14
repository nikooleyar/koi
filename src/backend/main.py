from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

import psycopg
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from pydantic import BaseModel, Field, StringConstraints

Group = Literal["chest", "arms", "legs", "back"]


class LogIn(BaseModel):
    muscle_group: Group
    exercise: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    weight: float = Field(ge=0, le=2000)
    rest_seconds: int | None = Field(default=None, ge=0, le=3600)


class WeightIn(BaseModel):
    weight: float = Field(gt=0, le=1000)


def db():
    # Peer auth over the unix socket as Linux user koi, so no password.
    # shortcut: one connection per request, add a pool if requests ever get slow.
    return psycopg.connect("dbname=koi", row_factory=dict_row)


@asynccontextmanager
async def lifespan(app: FastAPI):
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS logs (
                id bigserial PRIMARY KEY,
                muscle_group text NOT NULL,
                exercise text NOT NULL,
                weight double precision NOT NULL,
                rest_seconds integer,
                logged_at timestamptz NOT NULL DEFAULT now()
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS body_weight (
                id bigserial PRIMARY KEY,
                weight double precision NOT NULL,
                logged_at timestamptz NOT NULL DEFAULT now()
            )"""
        )
    yield


app = FastAPI(title="Koi", lifespan=lifespan)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/logs")
def list_logs(group: Group):
    with db() as conn:
        # shortcut: newest 200 only, add paging when a group outgrows it.
        return conn.execute(
            "SELECT * FROM logs WHERE muscle_group = %s ORDER BY logged_at DESC LIMIT 200", (group,)
        ).fetchall()


@app.post("/api/logs", status_code=201)
def add_log(log: LogIn):
    with db() as conn:
        return conn.execute(
            "INSERT INTO logs (muscle_group, exercise, weight, rest_seconds) VALUES (%s, %s, %s, %s) RETURNING *",
            (log.muscle_group, log.exercise, log.weight, log.rest_seconds),
        ).fetchone()


@app.get("/api/weight")
def list_weight():
    with db() as conn:
        # shortcut: newest 200 only, add paging or a date range when the history outgrows it.
        return conn.execute("SELECT * FROM body_weight ORDER BY logged_at DESC LIMIT 200").fetchall()


@app.post("/api/weight", status_code=201)
def add_weight(entry: WeightIn):
    with db() as conn:
        return conn.execute(
            "INSERT INTO body_weight (weight) VALUES (%s) RETURNING *", (entry.weight,)
        ).fetchone()


# Serve the built React app; must be mounted last so /api routes win.
app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "frontend" / "dist", html=True), name="frontend")
