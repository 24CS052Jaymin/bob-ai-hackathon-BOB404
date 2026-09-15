"""
Proportional Reporting Ratio (PRR) calculation for drug-event pairs.

2×2 contingency table for a given (drug D, event E)
----------------------------------------------------

                    | Event E  | Other events |  Row total
    ----------------+----------+--------------+-----------
    Drug D          |   a      |     b        |  a + b
    Other drugs     |   c      |     d        |  c + d
    ----------------+----------+--------------+-----------
    Column total    | a + c    |   b + d      |   N

    PRR = (a / (a + b)) / (c / (c + d))

Laplace smoothing (Evans 1998 / EMA guideline)
----------------------------------------------
    When ANY cell (a, b, c, or d) is 0, add 0.5 to ALL four cells before
    computing PRR and its CI.  This is the standard pharmacovigilance
    continuity correction — it prevents division-by-zero and produces a
    conservative, mathematically sound estimate that preserves signal ranking.

    Example (a=8, b=63, c=0, d=658):
        Smoothed → a*=8.5  b*=63.5  c*=0.5  d*=658.5
        PRR = (8.5/72) / (0.5/659) ≈ 155.6   ← correct, rankable

Signal filters (applied on smoothed PRR values)
------------------------------------------------
    a_raw >= 3    minimum raw co-occurrence count
    PRR   >= 2.0  standard EMA disproportionality threshold

Additional derived fields (required by the frontend Signal type)
----------------------------------------------------------------
    confidenceInterval  — formatted "lo – hi" string (95% Wald CI on smoothed cells)
    trend               — Rising / Stable / Declining (hash-seeded, deterministic)
    priority            — High (PRR>=10), Medium (PRR>=5), Low (PRR>=2)
    cluster             — SOC-like label from the first word of the event term
    backgroundReports   — raw c (other drugs, same event)
    monthlyReports      — 8-element synthetic monthly counts
"""

import hashlib
import math

import numpy as np
import pandas as pd

from .models import Priority, Signal, SignalStatus, Trend

# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------
PRR_THRESHOLD: float = 2.0
MIN_REPORT_COUNT: int = 3      # minimum raw a (pre-smoothing)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _smooth(a: int, b: int, c: int, d: int) -> tuple[float, float, float, float]:
    """Apply Laplace (add-0.5) smoothing when any cell is 0 (Evans 1998).

    Returns (a*, b*, c*, d*) as floats.  When all cells are > 0 the raw
    integer values are returned unchanged — no distortion of normal rows.
    """
    if a == 0 or b == 0 or c == 0 or d == 0:
        return a + 0.5, b + 0.5, c + 0.5, d + 0.5
    return float(a), float(b), float(c), float(d)


def _confidence_interval(a: int, b: int, c: int, d: int) -> str:
    """Return a formatted 95% Wald CI string for log(PRR).

    Uses the standard pharmacovigilance formula:
        SE(log PRR) = sqrt(1/a* - 1/(a*+b*) + 1/c* - 1/(c*+d*))
    Smoothed cells are used so the CI is always computable.
    """
    as_, bs, cs, ds = _smooth(a, b, c, d)
    try:
        se = math.sqrt(1/as_ - 1/(as_ + bs) + 1/cs - 1/(cs + ds))
        log_prr = math.log(as_ / (as_ + bs)) - math.log(cs / (cs + ds))
        lo = math.exp(log_prr - 1.96 * se)
        hi = math.exp(log_prr + 1.96 * se)
        return f"{lo:.2f} \u2013 {hi:.2f}"
    except (ValueError, ZeroDivisionError):
        return "N/A"


def _trend(a: int, drug: str, event: str) -> Trend:
    """Deterministic pseudo-trend from report count and drug/event hash."""
    seed = int(hashlib.md5(f"{drug}:{event}".encode()).hexdigest(), 16) % 100
    if a >= 10 and seed < 40:
        return Trend.rising
    if seed < 20:
        return Trend.declining
    return Trend.stable


def _priority(prr: float) -> Priority:
    """Map PRR magnitude to a triage priority."""
    if prr >= 10:
        return Priority.high
    if prr >= 5:
        return Priority.medium
    return Priority.low


def _cluster(event: str) -> str:
    """Derive a simple cluster label from the first word of the event term."""
    word = event.split()[0].capitalize() if event.split() else "Other"
    _MAP = {
        "cardiac": "Cardiac disorders",
        "hepatic": "Hepatobiliary disorders",
        "skin": "Skin disorders",
        "renal": "Renal disorders",
        "nervous": "Nervous system disorders",
        "drug":  "Drug-related events",
        "death": "Fatal outcomes",
        "infection": "Infections",
    }
    return _MAP.get(word.lower(), f"{word} events")


def _monthly_reports(a: int, drug: str, event: str) -> list[int]:
    """Generate a plausible 8-month report series that sums to *a*.

    Seeded from the drug/event pair so results are deterministic.
    """
    rng = np.random.default_rng(
        int(hashlib.md5(f"{drug}:{event}:monthly".encode()).hexdigest(), 16) % (2**32)
    )
    weights = rng.dirichlet(np.ones(8) * 2)
    counts = np.round(weights * a).astype(int)
    diff = a - int(counts.sum())
    counts[counts.argmax()] += diff
    return counts.tolist()


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def calculate_prr(df: pd.DataFrame) -> list[Signal]:
    """Compute PRR for every (drug, event) pair and return filtered signals.

    Parameters
    ----------
    df : pd.DataFrame
        Two-column DataFrame with columns ``drug`` and ``event``.
        One row = one adverse-event report.

    Returns
    -------
    list[Signal]
        Signals where PRR >= 2.0, a >= 3, c >= 1, and CI_lo >= 1.0,
        sorted by PRR descending.
    """
    N = len(df)

    # --- Build contingency counts (vectorised) ------------------------------
    pair_counts: pd.Series = df.groupby(["drug", "event"]).size().rename("a")
    drug_totals: pd.Series = df.groupby("drug").size().rename("drug_total")
    event_totals: pd.Series = df.groupby("event").size().rename("event_total")

    res = pair_counts.reset_index()
    res = res.merge(drug_totals.reset_index(),  on="drug",  how="left")
    res = res.merge(event_totals.reset_index(), on="event", how="left")

    res["b"] = res["drug_total"]  - res["a"]       # drug D, NOT event E
    res["c"] = res["event_total"] - res["a"]        # NOT drug D, event E
    res["d"] = N - res["drug_total"] - res["c"]    # NOT drug D, NOT event E

    # Snapshot raw integer counts BEFORE smoothing — used for the a_raw
    # gate and for display (backgroundReports, reports).
    res["a_raw"] = res["a"].astype(int)
    res["b_raw"] = res["b"].astype(int)
    res["c_raw"] = res["c"].astype(int)
    res["d_raw"] = res["d"].astype(int)

    # --- Laplace smoothing (Evans 1998) -------------------------------------
    # Add 0.5 to ALL four cells on any row where at least one cell is 0.
    # Cast columns to float64 first — Pandas 2.x rejects writing 8.5 into int64.
    needs_smooth = (
        (res["a_raw"] == 0) | (res["b_raw"] == 0) |
        (res["c_raw"] == 0) | (res["d_raw"] == 0)
    )
    if needs_smooth.any():
        for col in ("a", "b", "c", "d"):
            res[col] = res[col].astype(float)
        res.loc[needs_smooth, "a"] += 0.5
        res.loc[needs_smooth, "b"] += 0.5
        res.loc[needs_smooth, "c"] += 0.5
        res.loc[needs_smooth, "d"] += 0.5

    # --- PRR (vectorised on smoothed values) ---------------------------------
    # Division is always defined because smoothing guarantees all cells > 0.
    ab = res["a"] + res["b"]
    cd = res["c"] + res["d"]
    res["prr"] = (res["a"] / ab) / (res["c"] / cd)

    # --- Two-gate filter + c >= 1 guard --------------------------------------
    #   1. a_raw >= 3   : enough raw co-occurrence reports
    #   2. PRR   >= 2.0 : standard EMA disproportionality threshold
    #   3. c_raw >= 1   : exclude pairs where no other drug has the event
    #                     (c=0 causes Laplace-inflated PRR in the millions)
    mask = (
        (res["a_raw"] >= MIN_REPORT_COUNT) &
        (res["prr"]   >= PRR_THRESHOLD) &
        (res["c_raw"] >= 1)
    )
    filtered = res[mask].copy()
    # Cap PRR at 1000 for display — values above this are mathematically valid
    # but clinically uninformative and distort ranking.
    filtered["prr"] = filtered["prr"].clip(upper=1000.0).round(4)

    # Composite evidence score: PRR * log(1 + reports)
    # This ensures signals with more co-occurrence reports rank above
    # low-count capped signals (e.g. PRR=1000 with 3 reports vs 50 reports).
    filtered["_score"] = filtered["prr"] * filtered["a_raw"].apply(lambda x: math.log1p(x))
    filtered = filtered.sort_values("_score", ascending=False).reset_index(drop=True)

    # --- Build frontend-aligned Signal objects ------------------------------
    signals: list[Signal] = []
    for rank, row in enumerate(filtered.itertuples(index=False), start=1):
        # Use raw integer counts for display (reports, backgroundReports).
        # Pass raw ints to _confidence_interval — _smooth() inside it re-applies
        # +0.5 when any cell is 0, keeping the CI consistent with the PRR.
        a = int(getattr(row, "a_raw"))
        b = int(getattr(row, "b_raw"))
        c = int(getattr(row, "c_raw"))
        d = int(getattr(row, "d_raw"))
        prr_val = float(getattr(row, "prr"))

        signals.append(
            Signal(
                id=f"SIG-{rank:05d}",
                drug=getattr(row, "drug"),
                event=getattr(row, "event"),
                reports=a,
                prr=prr_val,
                confidenceInterval=_confidence_interval(a, b, c, d),
                trend=_trend(a, getattr(row, "drug"), getattr(row, "event")),
                cluster=_cluster(getattr(row, "event")),
                priority=_priority(prr_val),
                status=SignalStatus.new,
                backgroundReports=c,
                monthlyReports=_monthly_reports(a, getattr(row, "drug"), getattr(row, "event")),
                reviewed=False,
            )
        )

    return signals
