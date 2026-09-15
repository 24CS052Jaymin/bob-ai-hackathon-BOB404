"""
Mode 2 API server — single Uvicorn process, two route groups.

  /api/official-evidence/*  →  official_evidence routes  (Mode2.CTD)
  /api/user-evidence/*      →  user_evidence routes      (Mode2v2.UserCTD)
  /api/submissions/*        →  submissions routes

Run:
    python main.py
or:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

NOTE: Do NOT use app.mount() for both sub-apps on "/".  Mounting two ASGI
apps on the same prefix causes the first mount to shadow all routes of the
second (404 for every user-evidence request).  Instead, include each app's
router directly so all routes live in one routing table.
"""
from __future__ import annotations

import logging
import threading

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from official_evidence.api import app as official_app, repository as official_repo
from user_evidence.api import app as user_app, _repository as user_repo
from submissions.api import router as submissions_router, _sub_repo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)-42s %(levelname)-8s %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(title="Mode 2 API Gateway", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def _validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Log all request validation failures so 422 causes are always visible in the server log."""
    logger.error(
        "Request validation error %s %s — %s",
        request.method, request.url.path, exc.errors(),
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# Include routes from all sub-apps directly — no mount shadowing
app.include_router(official_app.router)
app.include_router(user_app.router)
app.include_router(submissions_router)


def _run_indexes_in_background() -> None:
    """Run all ensure_indexes() calls in a daemon thread.

    MongoDB serverSelection can take up to 3 s per repo when Atlas is cold.
    Running this off the event loop means uvicorn starts serving requests
    immediately — the first few reads may land before indexes exist, but
    PyMongo creates them quickly in the background without any user impact.
    """
    def _work() -> None:
        for name, fn in [
            ("official_evidence", official_repo.ensure_indexes),
            ("user_evidence",     user_repo.ensure_indexes),
            ("submissions",       _sub_repo.ensure_indexes),
        ]:
            try:
                fn()
                logger.info("ensure_indexes OK: %s", name)
            except Exception as exc:  # noqa: BLE001
                logger.warning("ensure_indexes failed (%s): %s", name, exc)

    t = threading.Thread(target=_work, daemon=True, name="ensure-indexes")
    t.start()


@app.on_event("startup")
async def _startup() -> None:
    logger.info("Mode 2 API Gateway ready — spawning index maintenance thread")
    _run_indexes_in_background()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
