"""
summarizer.py — Async AI signal summarization via Google Gemini.

Responsibility
--------------
Given a TopSignal (drug, reaction, PRR, report count, cluster label),
this module generates a concise, clinically-toned pharmacovigilance summary
using the Google Gemini API.

Key design decisions
---------------------
- Async:      Uses asyncio.to_thread() to run the synchronous google-genai SDK
              call in a thread-pool executor so it never blocks FastAPI's event loop.
- Prompt:     Enforces clinical tone — summary must state that PRR is a screening
              metric, not proof of causation, and recommend further review.
- Graceful:   If the API key is missing or the call fails, returns a safe fallback
              message instead of raising an error that would fail the entire endpoint.
- Configurable: Model name and generation parameters are module-level constants.

Environment variables
---------------------
    GEMINI_API_KEY   — Required. Google AI Studio API key.
    GEMINI_MODEL     — Optional. Defaults to "gemini-2.0-flash".
"""

from __future__ import annotations

import asyncio
import logging
import os

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
# These are read at import time. refresh_api_key() is called from the FastAPI
# lifespan hook AFTER load_dotenv() so the values are always up to date.
_GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL: str   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Lazily initialised Gemini client (None = key absent or init failed)
_client = None


def refresh_api_key() -> None:
    """Re-read GEMINI_API_KEY / GEMINI_MODEL from the environment and reset
    the cached client so the next call picks up the new values.

    Called from the FastAPI lifespan hook after load_dotenv() has run.
    """
    global _GEMINI_API_KEY, _GEMINI_MODEL, _client  # noqa: PLW0603
    _GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    _GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    _client = None   # force re-initialisation on next call


def _get_client():
    """Return a cached Gemini GenerativeModel, or None if the key is missing."""
    global _client  # noqa: PLW0603
    if _client is not None:
        return _client
    if not _GEMINI_API_KEY:
        logger.warning(
            "GEMINI_API_KEY is not set — AI summaries will use the fallback message."
        )
        return None
    try:
        import google.generativeai as genai  # imported lazily so the module
        genai.configure(api_key=_GEMINI_API_KEY)  # works without the SDK
        _client = genai.GenerativeModel(_GEMINI_MODEL)
        return _client
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to initialise Gemini client: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------
_SYSTEM_TONE = (
    "You are a clinical pharmacovigilance specialist. "
    "Write a concise, factual, and professionally cautious signal summary. "
    "Always emphasise that a disproportionate reporting signal is a statistical "
    "screening metric — it is NOT proof of causation. "
    "Always recommend further clinical and epidemiological review. "
    "Keep the summary to 2–3 sentences."
)


def _build_prompt(
    drug_name: str,
    reaction: str,
    prr_score: float,
    report_count: int,
    cluster_label: str,
) -> str:
    """Construct the user-facing part of the Gemini prompt."""
    return (
        f"{_SYSTEM_TONE}\n\n"
        f"Generate a pharmacovigilance signal summary for the following finding:\n"
        f"  Drug:          {drug_name}\n"
        f"  Reaction:      {reaction}\n"
        f"  PRR score:     {prr_score:.2f}\n"
        f"  Report count:  {report_count}\n"
        f"  Cluster:       {cluster_label}\n\n"
        f"Begin the summary with 'Potential {cluster_label.lower()} safety signal detected.'"
    )


def _fallback_summary(drug_name: str, reaction: str, prr_score: float) -> str:
    """Return a generic clinical summary when the Gemini call is unavailable."""
    return (
        f"Potential safety signal detected. "
        f"{reaction.capitalize()} reports are disproportionately represented for "
        f"{drug_name} compared with the background dataset (PRR {prr_score:.2f}). "
        f"This finding is a statistical screening result and requires further "
        f"clinical and pharmacovigilance review before any causal inference can be made."
    )


# ---------------------------------------------------------------------------
# Sync worker (runs inside a thread)
# ---------------------------------------------------------------------------
def _generate_sync(
    drug_name: str,
    reaction: str,
    prr_score: float,
    report_count: int,
    cluster_label: str,
) -> str:
    """Call the Gemini API synchronously. Intended to run in a thread pool."""
    client = _get_client()
    if client is None:
        return _fallback_summary(drug_name, reaction, prr_score)

    prompt = _build_prompt(drug_name, reaction, prr_score, report_count, cluster_label)
    try:
        response = client.generate_content(prompt)
        text = response.text.strip()
        return text if text else _fallback_summary(drug_name, reaction, prr_score)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Gemini generation failed for (%s, %s): %s", drug_name, reaction, exc
        )
        return _fallback_summary(drug_name, reaction, prr_score)


# ---------------------------------------------------------------------------
# Public async interface
# ---------------------------------------------------------------------------
async def summarize_signal(
    drug_name: str,
    reaction: str,
    prr_score: float,
    report_count: int,
    cluster_label: str,
) -> str:
    """Asynchronously generate an AI pharmacovigilance summary for one signal.

    Offloads the blocking Gemini SDK call to a thread so FastAPI's event loop
    is never blocked.

    Parameters
    ----------
    drug_name : str
    reaction : str
    prr_score : float
    report_count : int
    cluster_label : str

    Returns
    -------
    str
        A 2–3 sentence clinical summary, or a safe fallback string on failure.
    """
    return await asyncio.to_thread(
        _generate_sync,
        drug_name,
        reaction,
        prr_score,
        report_count,
        cluster_label,
    )


async def summarize_signals_batch(
    signals: list[dict],
    *,
    concurrency: int = 5,
) -> list[str]:
    """Generate AI summaries for a batch of signals with bounded concurrency.

    Parameters
    ----------
    signals : list[dict]
        Each dict must have keys: drug_name, reaction, prr_score, report_count,
        cluster_label.
    concurrency : int
        Maximum simultaneous Gemini calls (default 5 to respect rate limits).

    Returns
    -------
    list[str]
        Summaries in the same order as *signals*.
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def _bounded(sig: dict) -> str:
        async with semaphore:
            return await summarize_signal(
                drug_name=sig["drug_name"],
                reaction=sig["reaction"],
                prr_score=sig["prr_score"],
                report_count=sig["report_count"],
                cluster_label=sig["cluster_label"],
            )

    return await asyncio.gather(*[_bounded(s) for s in signals])
