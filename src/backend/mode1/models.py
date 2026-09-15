"""
Pydantic response models for the Drug Safety Signal Detection API (Mode 1).

The Signal schema is designed to match the frontend TypeScript type exactly:

  type Signal = {
    id: string;
    drug: string;
    event: string;
    reports: number;
    prr: number;
    confidenceInterval: string;
    trend: 'Rising' | 'Stable' | 'Declining';
    cluster: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'New' | 'In review' | 'Monitoring' | 'Closed';
    backgroundReports: number;
    monthlyReports: number[];
    reviewed: boolean;
  };
"""

from enum import Enum
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums — kept in sync with the frontend union literals
# ---------------------------------------------------------------------------

class Trend(str, Enum):
    rising   = "Rising"
    stable   = "Stable"
    declining = "Declining"


class Priority(str, Enum):
    high   = "High"
    medium = "Medium"
    low    = "Low"


class SignalStatus(str, Enum):
    new        = "New"
    in_review  = "In review"
    monitoring = "Monitoring"
    closed     = "Closed"


# ---------------------------------------------------------------------------
# Per-signal payload
# ---------------------------------------------------------------------------

class Signal(BaseModel):
    """A single drug-event safety signal — mirrors the frontend Signal type."""

    id: str = Field(..., description="Unique signal ID, e.g. SIG-00001")
    drug: str = Field(..., description="Standardised drug name (lowercase)")
    event: str = Field(..., description="Standardised adverse event / reaction (lowercase)")
    reports: int = Field(..., description="Co-occurrence report count (a in PRR table)")
    prr: float = Field(..., description="Proportional Reporting Ratio, rounded to 4 dp")
    confidenceInterval: str = Field(..., description="95% CI string, e.g. '3.21 – 8.47'")
    trend: Trend = Field(..., description="Reporting trend over last 8 months")
    cluster: str = Field(..., description="Thematic cluster label for grouping related signals")
    priority: Priority = Field(..., description="Triage priority derived from PRR magnitude")
    status: SignalStatus = Field(default=SignalStatus.new, description="Review workflow status")
    backgroundReports: int = Field(..., description="Other-drug reports for this event (c in PRR table)")
    monthlyReports: list[int] = Field(..., description="8-element array of monthly report counts")
    reviewed: bool = Field(default=False, description="Whether the signal has been reviewed")


# ---------------------------------------------------------------------------
# Process-FAERS endpoint — request summary + signal list
# ---------------------------------------------------------------------------

class ProcessingStats(BaseModel):
    """Metadata about the CSV processing run."""

    total_reports: int = Field(..., description="Total rows after cleaning")
    unique_drugs: int = Field(..., description="Distinct drug names")
    unique_events: int = Field(..., description="Distinct event terms")
    total_pairs: int = Field(..., description="Total (drug, event) pairs evaluated")
    signals_detected: int = Field(..., description="Pairs passing PRR/count thresholds")


class ProcessFaersResponse(BaseModel):
    """Top-level response from POST /api/v1/process-faers."""

    status: str = Field(default="success")
    stats: ProcessingStats
    signals: list[Signal]


# ---------------------------------------------------------------------------
# POST /api/v1/analyze-signals — ML + AI enhanced response
# Exact shape required by the frontend and specified in the task brief.
# ---------------------------------------------------------------------------

class SummaryMetrics(BaseModel):
    """High-level run statistics returned by /api/v1/analyze-signals."""

    total_reports_analyzed: int = Field(
        ..., description="Total (drug, event) rows after cleaning"
    )
    total_signals_detected: int = Field(
        ..., description="Signals passing PRR ≥ 2.0 and report_count ≥ 3"
    )


class TopSignal(BaseModel):
    """One ML + AI enriched signal — exact field names consumed by the frontend."""

    drug_name: str = Field(..., description="Standardised drug name")
    reaction: str = Field(..., description="Standardised adverse reaction term")
    prr_score: float = Field(..., description="Proportional Reporting Ratio (4 dp)")
    report_count: int = Field(..., description="Co-occurrence report count (a)")
    cluster_id: int = Field(..., description="Integer cluster ID from MiniBatchKMeans")
    cluster_label: str = Field(..., description="Human-readable SOC-level cluster label")
    ai_summary: str = Field(
        ...,
        description=(
            "2–3 sentence Gemini-generated pharmacovigilance summary. "
            "Always notes that PRR is a screening metric, not proof of causation."
        ),
    )


class AnalyzeSignalsResponse(BaseModel):
    """Top-level response from POST /api/v1/analyze-signals."""

    summary_metrics: SummaryMetrics
    top_signals: list[TopSignal]


# ---------------------------------------------------------------------------
# GET /api/v1/runs — persisted analysis run
# ---------------------------------------------------------------------------

class AnalysisRunResponse(BaseModel):
    """One row from the analysis_runs PostgreSQL table."""

    id: int = Field(..., description="Auto-incremented run ID")
    created_at: str = Field(..., description="ISO-8601 UTC timestamp")
    total_reports: int
    total_signals: int
    top_n: int
    n_clusters: int
    top_signals: list[TopSignal]
