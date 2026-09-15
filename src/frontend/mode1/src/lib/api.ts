/**
 * api.ts — Typed API client for the Drug Safety Signal Detection backend.
 *
 * All calls go through the Vite dev-server proxy (/api/* → http://localhost:8000)
 * so no CORS headers are needed during development.
 *
 * Auth: HTTP Basic Auth credentials are read from Vite env vars:
 *   VITE_API_USERNAME  (default: "admin")
 *   VITE_API_PASSWORD  (default: "regulens2024")
 * These must match API_USERNAME / API_PASSWORD in the backend .env file.
 *
 * In production, set VITE_API_BASE_URL to your deployed backend origin.
 */

import type { Signal } from '@/types';

// ---------------------------------------------------------------------------
// Base URL
// ─ dev:  empty string  → relative paths → Vite proxy forwards to :8000
// ─ prod: VITE_API_BASE_URL env var, e.g. "https://api.yourdomain.com"
// ---------------------------------------------------------------------------
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

// ---------------------------------------------------------------------------
// Basic Auth header — built once from Vite env vars
// ---------------------------------------------------------------------------
const _user = (import.meta.env.VITE_API_USERNAME as string | undefined) ?? 'admin';
const _pass = (import.meta.env.VITE_API_PASSWORD as string | undefined) ?? 'regulens2024';
const _AUTH_HEADER = `Basic ${btoa(`${_user}:${_pass}`)}`;

// ---------------------------------------------------------------------------
// Response shapes from the backend
// ---------------------------------------------------------------------------

export interface ProcessingStats {
  total_reports: number;
  unique_drugs: number;
  unique_events: number;
  total_pairs: number;
  signals_detected: number;
}

export interface ProcessFaersResponse {
  status: string;
  stats: ProcessingStats;
  signals: Signal[];
}

export interface TopSignal {
  drug_name: string;
  reaction: string;
  prr_score: number;
  report_count: number;
  cluster_id: number;
  cluster_label: string;
  ai_summary: string;
}

export interface SummaryMetrics {
  total_reports_analyzed: number;
  total_signals_detected: number;
}

export interface AnalyzeSignalsResponse {
  summary_metrics: SummaryMetrics;
  top_signals: TopSignal[];
}

// Persisted analysis run returned by the database endpoints
export interface AnalysisRun {
  id: number;
  created_at: string;           // ISO timestamp
  total_reports: number;
  total_signals: number;
  top_n: number;
  n_clusters: number;
  top_signals: TopSignal[];
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: _AUTH_HEADER,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status} — ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Phase 1 — PRR signal detection
// POST /api/v1/process-faers
// Pass `file` to upload a CSV; omit to use the server's local dataset.
// ---------------------------------------------------------------------------
export async function processFaers(file?: File): Promise<ProcessFaersResponse> {
  const body = new FormData();
  if (file) body.append('file', file);
  return apiFetch<ProcessFaersResponse>('/api/v1/process-faers', {
    method: 'POST',
    body,
  });
}

// ---------------------------------------------------------------------------
// Phase 2 — ML clustering + AI summarization
// POST /api/v1/analyze-signals
// ---------------------------------------------------------------------------
export async function analyzeSignals(
  opts: { file?: File; topN?: number; nClusters?: number } = {},
): Promise<AnalyzeSignalsResponse> {
  const { file, topN = 20, nClusters = 20 } = opts;
  const body = new FormData();
  if (file) body.append('file', file);
  const params = new URLSearchParams({
    top_n: String(topN),
    n_clusters: String(nClusters),
  });
  return apiFetch<AnalyzeSignalsResponse>(
    `/api/v1/analyze-signals?${params}`,
    { method: 'POST', body },
  );
}

// ---------------------------------------------------------------------------
// Database — list saved analysis runs
// GET /api/v1/runs
// ---------------------------------------------------------------------------
export async function listRuns(): Promise<AnalysisRun[]> {
  return apiFetch<AnalysisRun[]>('/api/v1/runs');
}

// ---------------------------------------------------------------------------
// Database — get one analysis run by ID
// GET /api/v1/runs/:id
// ---------------------------------------------------------------------------
export async function getRun(id: number): Promise<AnalysisRun> {
  return apiFetch<AnalysisRun>(`/api/v1/runs/${id}`);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health');
}
