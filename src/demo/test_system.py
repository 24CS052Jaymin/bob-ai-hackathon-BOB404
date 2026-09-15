"""
test_system.py - Full system test for the Drug Safety Signal Detection API.

Tests all endpoints:
  [1] GET  /api/v1/runs            - list persisted runs (PostgreSQL)
  [2] GET  /api/v1/runs/{id}       - fetch one run by id
  [3] POST /api/v1/process-faers   - PRR calculation (file upload)
  [4] POST /api/v1/analyze-signals - ML clustering + AI summarization
  [5] Auth - 401 on bad credentials
  [6] PostgreSQL persistence check

Run from src/ directory:
    python demo/test_system.py

Requirements:
    pip install requests
    uvicorn must be running on http://127.0.0.1:8000
"""

import io
import sys
import time
from pathlib import Path

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "http://127.0.0.1:8000"
USERNAME = "admin"
PASSWORD = "regulens2024"
AUTH     = (USERNAME, PASSWORD)
DEMO_CSV = Path(__file__).parent / "faers_demo_1_cardio.csv"
TIMEOUT  = 120  # seconds (analyze-signals calls Gemini AI)

passed = 0
failed = 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def ok(label: str, detail: str = ""):
    global passed
    passed += 1
    suffix = f"  ({detail})" if detail else ""
    print(f"  [PASS]  {label}{suffix}")


def fail(label: str, reason: str = ""):
    global failed
    failed += 1
    print(f"  [FAIL]  {label}")
    if reason:
        print(f"          --> {reason}")


def section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
section("PRE-FLIGHT")

if DEMO_CSV.exists():
    ok("Demo CSV found", DEMO_CSV.name)
else:
    fail("Demo CSV not found", str(DEMO_CSV))
    sys.exit(1)

try:
    r = requests.get(f"{BASE_URL}/docs", timeout=5)
    ok("Server reachable", f"HTTP {r.status_code}")
except requests.ConnectionError:
    fail("Server not reachable", f"{BASE_URL} -- is uvicorn running?")
    print("\nStart the server:  uvicorn backend.mode1.main:app --reload --port 8000")
    sys.exit(1)


# ---------------------------------------------------------------------------
# TEST 1 -- Authentication
# ---------------------------------------------------------------------------
section("TEST 1 -- Authentication")

r = requests.get(f"{BASE_URL}/api/v1/runs", auth=("wrong", "creds"), timeout=10)
if r.status_code == 401:
    ok("Rejects bad credentials -> 401")
else:
    fail("Should return 401 for bad creds", f"got HTTP {r.status_code}")

r = requests.get(f"{BASE_URL}/api/v1/runs", auth=AUTH, timeout=10)
if r.status_code == 200:
    ok("Accepts correct credentials -> 200")
else:
    fail("Should return 200 for correct creds", f"got HTTP {r.status_code}")


# ---------------------------------------------------------------------------
# TEST 2 -- GET /api/v1/runs
# ---------------------------------------------------------------------------
section("TEST 2 -- GET /api/v1/runs  (list all runs)")

r = requests.get(f"{BASE_URL}/api/v1/runs", auth=AUTH, timeout=10)
if r.status_code == 200:
    ok("Status 200")
else:
    fail("Status 200", f"got {r.status_code}: {r.text[:200]}")

try:
    data = r.json()
    if isinstance(data, list):
        ok("Response is a JSON array", f"{len(data)} run(s) in DB")
    else:
        fail("Response should be a list", f"got {type(data).__name__}")
except Exception as e:
    fail("Valid JSON response", str(e))


# ---------------------------------------------------------------------------
# TEST 3 -- POST /api/v1/process-faers
# ---------------------------------------------------------------------------
section("TEST 3 -- POST /api/v1/process-faers  (PRR calculation)")

print(f"  Uploading {DEMO_CSV.name} ...")
t0 = time.time()
with open(DEMO_CSV, "rb") as f:
    r = requests.post(
        f"{BASE_URL}/api/v1/process-faers",
        auth=AUTH,
        files={"file": (DEMO_CSV.name, f, "text/csv")},
        timeout=TIMEOUT,
    )
elapsed = time.time() - t0

if r.status_code == 200:
    ok("Status 200", f"{elapsed:.1f}s")
else:
    fail("Status 200", f"got {r.status_code}: {r.text[:300]}")

try:
    data = r.json()

    if data.get("status") == "success":
        ok("status == 'success'")
    else:
        fail("status == 'success'", f"got {data.get('status')!r}")

    stats = data.get("stats", {})
    for field in ("total_reports", "unique_drugs", "unique_events", "total_pairs", "signals_detected"):
        if field in stats:
            ok(f"stats.{field} present", str(stats[field]))
        else:
            fail(f"stats.{field} missing")

    signals = data.get("signals", [])
    if isinstance(signals, list) and len(signals) > 0:
        ok("signals list non-empty", f"{len(signals)} signal(s)")
    else:
        fail("signals list non-empty", repr(signals))

    if signals:
        sig = signals[0]
        required = [
            "id", "drug", "event", "reports", "prr",
            "confidenceInterval", "trend", "cluster",
            "priority", "status", "backgroundReports",
            "monthlyReports", "reviewed"
        ]
        missing = [f for f in required if f not in sig]
        if not missing:
            ok("First signal has all required fields")
        else:
            fail("First signal fields", f"missing: {missing}")

        prr = sig.get("prr", 0)
        if 2.0 <= prr <= 1000.0:
            ok("PRR in sane range [2, 1000]", f"PRR = {prr}")
        else:
            fail("PRR in sane range [2, 1000]", f"PRR = {prr}")

        monthly = sig.get("monthlyReports", [])
        if isinstance(monthly, list) and len(monthly) == 8:
            ok("monthlyReports has 8 elements")
        else:
            fail("monthlyReports has 8 elements", f"got {monthly}")

except Exception as e:
    fail("Parsing process-faers response", str(e))


# ---------------------------------------------------------------------------
# TEST 4 -- POST /api/v1/analyze-signals
# ---------------------------------------------------------------------------
section("TEST 4 -- POST /api/v1/analyze-signals  (ML + AI)")

print("  Running ML clustering + Gemini AI -- may take 30-60s ...")
t0 = time.time()
with open(DEMO_CSV, "rb") as f:
    r = requests.post(
        f"{BASE_URL}/api/v1/analyze-signals",
        auth=AUTH,
        files={"file": (DEMO_CSV.name, f, "text/csv")},
        timeout=TIMEOUT,
    )
elapsed = time.time() - t0

if r.status_code == 200:
    ok("Status 200", f"{elapsed:.1f}s")
else:
    fail("Status 200", f"got {r.status_code}: {r.text[:300]}")

try:
    data = r.json()

    metrics = data.get("summary_metrics", {})
    for field in ("total_reports_analyzed", "total_signals_detected"):
        if field in metrics:
            ok(f"summary_metrics.{field} present", str(metrics[field]))
        else:
            fail(f"summary_metrics.{field} missing")

    top = data.get("top_signals", [])
    if isinstance(top, list) and len(top) > 0:
        ok("top_signals non-empty", f"{len(top)} signal(s)")
    else:
        fail("top_signals non-empty", repr(top))

    if top:
        ts = top[0]
        ts_fields = [
            "drug_name", "reaction", "prr_score", "report_count",
            "cluster_id", "cluster_label", "ai_summary"
        ]
        missing = [f for f in ts_fields if f not in ts]
        if not missing:
            ok("First top_signal has all required fields")
        else:
            fail("First top_signal fields", f"missing: {missing}")

        summary = ts.get("ai_summary", "")
        if isinstance(summary, str) and len(summary) > 20:
            ok("ai_summary is non-empty string", f"{len(summary)} chars")
        else:
            fail("ai_summary non-empty", repr(summary))

        prr = ts.get("prr_score", 0)
        if prr >= 2.0:
            ok("prr_score >= 2.0", str(prr))
        else:
            fail("prr_score >= 2.0", f"got {prr}")

except Exception as e:
    fail("Parsing analyze-signals response", str(e))


# ---------------------------------------------------------------------------
# TEST 5 -- GET /api/v1/runs/{id}
# ---------------------------------------------------------------------------
section("TEST 5 -- GET /api/v1/runs/{id}  (fetch one run)")

runs_r = requests.get(f"{BASE_URL}/api/v1/runs", auth=AUTH, timeout=10)
runs = runs_r.json() if runs_r.status_code == 200 else []

if runs:
    run_id = runs[0]["id"]
    r = requests.get(f"{BASE_URL}/api/v1/runs/{run_id}", auth=AUTH, timeout=10)
    if r.status_code == 200:
        ok(f"GET /api/v1/runs/{run_id} -> 200")
        run = r.json()
        for field in ("id", "created_at", "total_reports", "total_signals", "top_signals"):
            if field in run:
                ok(f"run.{field} present")
            else:
                fail(f"run.{field} missing")
    else:
        fail(f"GET /api/v1/runs/{run_id}", f"got {r.status_code}")

    r404 = requests.get(f"{BASE_URL}/api/v1/runs/999999", auth=AUTH, timeout=10)
    if r404.status_code == 404:
        ok("Non-existent run -> 404")
    else:
        fail("Non-existent run -> 404", f"got {r404.status_code}")
else:
    fail("No runs in DB to test")


# ---------------------------------------------------------------------------
# TEST 6 -- PostgreSQL persistence
# ---------------------------------------------------------------------------
section("TEST 6 -- PostgreSQL persistence")

runs_r = requests.get(f"{BASE_URL}/api/v1/runs", auth=AUTH, timeout=10)
if runs_r.status_code == 200:
    runs = runs_r.json()
    if len(runs) >= 1:
        ok("At least 1 run persisted in PostgreSQL", f"{len(runs)} total run(s)")
        r0 = runs[0]
        if isinstance(r0.get("top_signals"), list):
            ok("top_signals deserialised from JSON column", f"{len(r0['top_signals'])} signals")
        else:
            fail("top_signals deserialised")
    else:
        fail("At least 1 run in DB", "0 runs found")
else:
    fail("Runs endpoint reachable", f"HTTP {runs_r.status_code}")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
total = passed + failed
section("RESULTS")
print(f"\n  Total  : {total}")
print(f"  Passed : {passed}")
print(f"  Failed : {failed}")

if failed == 0:
    print("\n  ALL TESTS PASSED -- system is fully operational!\n")
    sys.exit(0)
else:
    print(f"\n  {failed} test(s) failed -- check output above.\n")
    sys.exit(1)
