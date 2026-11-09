from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Koi")


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve the built React app; must be mounted last so /api routes win.
app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "frontend" / "dist", html=True), name="frontend")
