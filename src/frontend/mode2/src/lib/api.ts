/**
 * Typed API client for Mode 2 backend.
 *
 * All fetch calls go to VITE_API_URL. When it is not configured, use the
 * current browser host on port 8000, which also works when the UI is opened
 * from another device on the local network.
 * Every function throws an Error with a human-readable message on non-2xx responses.
 */

const fallbackApiUrl =
  typeof window === 'undefined'
    ? 'http://localhost:8000'
    : `${window.location.protocol}//${window.location.hostname}:8001`;

export const API_BASE = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 12_000;
const LONG_RUNNING_TIMEOUT_MS = 120_000;

// ── Types ──────────────────────────────────────────────────────────────────

export interface SubmissionRecord {
  submission_id: string;
  product_name: string;
  sponsor: string;
  region: string;
  submission_type: string;
  target_date: string;
  status: 'Draft' | 'Processing' | 'In review' | 'Ready to submit';
  created_at: string;
  updated_at: string;
  readiness_score?: number;
  critical_gaps?: number;
}

export interface RequirementResult {
  requirement_id: string;
  module: string;
  section_number: string;
  section_title: string;
  status: 'PRESENT' | 'PARTIAL' | 'MISSING' | 'NOT_APPLICABLE';
  confidence: number;
  matched_chunk_ids: string[];
  missing_items: string[];
  explanation: string;
  official_chunk_ids: string[];
}

export interface GapRecord {
  gap_id: string;
  requirement_id: string;
  module: string;
  section_number: string;
  section_title: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'Open' | 'In progress' | 'Resolved';
  finding: string;
  missing_items: string[];
  user_evidence_refs: string[];
  official_evidence_refs: string[];
}

export interface ModuleScore {
  module: string;
  label: string;
  score: number;
  total: number;
  present: number;
  partial: number;
  missing: number;
  not_applicable: number;
  status: 'Ready' | 'Attention' | 'Not started';
}

export interface EvidenceStats {
  total_chunks: number;
  total_documents: number;
  total_matched_chunks: number;
  requirements_with_evidence: number;
}

export interface EvidenceDocument {
  submission_id: string;
  document_id: string;
  source_file: string;
  pages_extracted?: number;
  sections_detected?: number;
  chunks_created?: number;
  embedding_dimensions?: number;
  ingestion_timestamp?: string;
  is_current?: boolean;
}

export interface SubmissionReport {
  submission_id: string;
  overall_score: number;
  overall_status: 'Ready' | 'Attention' | 'Not started';
  module_scores: ModuleScore[];
  summary: string;
  requirements: RequirementResult[];
  gaps: GapRecord[];
  evidence_stats: EvidenceStats;
  analysis_timestamp: string;
  pipeline_version: string;
}

export interface UploadResult {
  submission_id: string;
  documents: Array<{
    document_id: string;
    source_file: string;
    duplicate: boolean;
    ingestion?: {
      pages_extracted: number;
      sections_detected: number;
      chunks_created: number;
      embedding_dimensions: number;
    };
  }>;
  validation: {
    current_chunks: number;
    current_submissions: number;
  };
}

export interface Recommendation {
  problem: string;
  what_is_missing: string[];
  recommended_action: string;
  why_it_matters: string;
  reference_evidence: string;
  current_evidence_summary: string;
}

export interface ApiRequirement {
  requirement_id: string;
  module: string;
  section_number: string;
  section_title: string;
  requirement_text: string;
  requirement_type: string;
  mandatory_status: string;
  applicability: string;
  region: string;
}

// ── HTTP helper ────────────────────────────────────────────────────────────

/** Make an API request that always settles instead of leaving the UI loading forever. */
export async function apiRequest(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`The API did not respond within ${timeoutMs / 1000} seconds. Check that the backend is running.`);
    }
    throw new Error('Unable to reach the API. Check that the backend is running and VITE_API_URL is correct.');
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const res = await apiRequest(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  }, timeoutMs);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { detail?: string }).detail ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// ── Submissions ────────────────────────────────────────────────────────────

export interface CreateSubmissionInput {
  product_name: string;
  sponsor?: string;
  region?: string;
  submission_type?: string;
  target_date?: string;
  submission_id?: string;
}

export function createSubmission(data: CreateSubmissionInput): Promise<SubmissionRecord> {
  return apiFetch<SubmissionRecord>('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listSubmissions(): Promise<SubmissionRecord[]> {
  return apiFetch<SubmissionRecord[]>('/api/submissions');
}

export function getSubmission(id: string): Promise<SubmissionRecord> {
  return apiFetch<SubmissionRecord>(`/api/submissions/${encodeURIComponent(id)}`);
}

export async function uploadDocuments(submissionId: string, files: File[]): Promise<UploadResult> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const res = await apiRequest(`/api/submissions/${encodeURIComponent(submissionId)}/documents`, {
    method: 'POST',
    body: form,
  }, LONG_RUNNING_TIMEOUT_MS);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  return body as UploadResult;
}

export function runAnalysis(submissionId: string): Promise<SubmissionReport> {
  return apiFetch<SubmissionReport>(
    `/api/submissions/${encodeURIComponent(submissionId)}/analyze`,
    { method: 'POST', body: '{}' },
    LONG_RUNNING_TIMEOUT_MS,
  );
}

export function getReport(submissionId: string): Promise<SubmissionReport> {
  return apiFetch<SubmissionReport>(`/api/submissions/${encodeURIComponent(submissionId)}/report`);
}

export function getModules(submissionId: string): Promise<ModuleScore[]> {
  return apiFetch<ModuleScore[]>(`/api/submissions/${encodeURIComponent(submissionId)}/modules`);
}

export function getGaps(
  submissionId: string,
  filters?: { severity?: string; status?: string },
): Promise<GapRecord[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch<GapRecord[]>(`/api/submissions/${encodeURIComponent(submissionId)}/gaps${qs}`);
}

export interface RequirementTrace {
  requirement_id: string;
  section_number: string;
  section_title: string;
  module: string;
  status: 'PRESENT' | 'PARTIAL' | 'MISSING' | 'NOT_APPLICABLE';
  confidence: number;
  matched_chunk_count: number;
  matched_chunk_ids: string[];
}

export interface EvidenceResponse {
  submission_id: string;
  documents: EvidenceDocument[];
  counts: Record<string, number>;
  evidence_stats: EvidenceStats;
  requirement_trace?: RequirementTrace[];
}

export function getEvidence(submissionId: string): Promise<EvidenceResponse> {
  return apiFetch<EvidenceResponse>(`/api/submissions/${encodeURIComponent(submissionId)}/evidence`);
}

export function getGapRecommendation(
  submissionId: string,
  gapId: string,
): Promise<{ gap_id: string; submission_id: string; recommendation: Recommendation }> {
  return apiFetch(`/api/submissions/${encodeURIComponent(submissionId)}/gaps/${encodeURIComponent(gapId)}/recommendation`, {
    method: 'POST',
    body: '{}',
  });
}

// ── Requirements (official) ────────────────────────────────────────────────

export function listRequirements(): Promise<ApiRequirement[]> {
  return apiFetch<ApiRequirement[]>('/api/official-evidence/requirements');
}

// ── Delete submission ──────────────────────────────────────────────────────

export interface DeleteResult {
  submission_id: string;
  deleted: boolean;
  chunks_deleted: number;
  evidence_documents_deleted: number;
  reports_deleted: number;
}

export function deleteSubmission(submissionId: string): Promise<DeleteResult> {
  return apiFetch<DeleteResult>(`/api/submissions/${encodeURIComponent(submissionId)}`, {
    method: 'DELETE',
  });
}
