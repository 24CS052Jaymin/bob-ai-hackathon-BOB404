"""
Data-cleaning utilities for the local Kaggle FAERS CSV.

Actual columns used from FAERS_data.csv
----------------------------------------
    report_id      – unique report identifier
    suspect_drug   – reported drug name
    reactions      – semicolon-separated list of adverse reactions

Cleaning steps
--------------
1. Load only the three columns needed (path mode) OR rename columns (DataFrame mode).
2. Drop rows where suspect_drug or reactions is null / blank.
3. Explode multi-reaction rows so each (drug, reaction) is one row.
4. Standardise both text columns: lowercase + strip whitespace.

Public API
----------
    clean_df(df)         — clean a DataFrame that already has the right columns
    load_and_clean(path) — load from a CSV path, then clean
"""

import io

import pandas as pd

# Exact column names as they appear in FAERS_data.csv
_COL_REPORT = "report_id"
_COL_DRUG   = "suspect_drug"
_COL_REACT  = "reactions"

REQUIRED_COLUMNS = {_COL_REPORT, _COL_DRUG, _COL_REACT}


# ---------------------------------------------------------------------------
# Core cleaning logic (operates on an already-loaded DataFrame)
# ---------------------------------------------------------------------------

def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Clean a FAERS DataFrame and return a normalised two-column frame.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain columns ``report_id``, ``suspect_drug``, ``reactions``.

    Returns
    -------
    pd.DataFrame
        Columns: ``drug`` (str), ``event`` (str).
        Each row is one (drug, reaction) pair — multi-reaction rows are exploded.

    Raises
    ------
    ValueError
        If required columns are missing from *df*.
    """
    # Validate required columns
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required column(s): {sorted(missing)}. "
            f"Found: {list(df.columns)}"
        )

    # Keep only what we need
    out = df[[_COL_DRUG, _COL_REACT]].copy()
    out.columns = ["drug", "event"]

    # --- Drop nulls / blank strings -----------------------------------------
    out.replace(r"^\s*$", pd.NA, regex=True, inplace=True)
    out.dropna(subset=["drug", "event"], inplace=True)

    # --- Explode semicolon-separated reactions into individual rows ----------
    # e.g. "Breast pain; Asthma; Cough"  →  three rows
    out["event"] = out["event"].str.split(";")
    out = out.explode("event")

    # --- Standardise text: lowercase + strip whitespace ---------------------
    out["drug"]  = out["drug"].astype(str).str.strip().str.lower()
    out["event"] = out["event"].astype(str).str.strip().str.lower()

    # Drop empty strings that survived splitting / stripping
    out = out[(out["drug"] != "") & (out["event"] != "") & (out["event"] != "nan")]

    return out.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_and_clean(csv_path: str) -> pd.DataFrame:
    """Load the FAERS CSV from *csv_path* and return a clean DataFrame.

    Only the three required columns are read from disk; all others are skipped
    to keep memory usage low on large FAERS exports.

    Raises
    ------
    FileNotFoundError
        If *csv_path* does not exist.
    ValueError
        If the CSV is missing required columns.
    """
    df = pd.read_csv(csv_path, usecols=[_COL_REPORT, _COL_DRUG, _COL_REACT], low_memory=False)
    return clean_df(df)


def load_and_clean_bytes(raw_bytes: bytes) -> pd.DataFrame:
    """Parse CSV from an in-memory byte string and return a clean DataFrame.

    Used by the file-upload path of the API endpoint.

    Raises
    ------
    ValueError
        If the bytes cannot be parsed as CSV or required columns are missing.
    """
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes), low_memory=False)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Could not parse uploaded file as CSV: {exc}") from exc
    return clean_df(df)
