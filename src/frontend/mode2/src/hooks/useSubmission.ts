/**
 * React hooks for fetching submission data from the backend.
 *
 * Every hook returns { data, loading, error, refetch }.
 * Data is null while loading or on error.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getEvidence,
  getGaps,
  getModules,
  getReport,
  getSubmission,
  listRequirements,
  listSubmissions,
} from '@/lib/api';
import type {
  EvidenceResponse,
  GapRecord,
  ModuleScore,
  SubmissionRecord,
  SubmissionReport,
  ApiRequirement,
} from '@/lib/api';

// ── Generic fetch hook ─────────────────────────────────────────────────────

function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (currentRequest !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (currentRequest === requestId.current) setError(err.message ?? 'An error occurred');
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return { data, loading, error, refetch: load };
}

// ── Public hooks ───────────────────────────────────────────────────────────

export function useSubmissions() {
  const { data, loading, error, refetch } = useFetch(listSubmissions, []);
  return { submissions: data ?? [], loading, error, refetch };
}

export function useSubmission(id: string | undefined) {
  const {
    data: submission,
    loading: subLoading,
    error: subError,
    refetch: refetchSub,
  } = useFetch(() => (id ? getSubmission(id) : Promise.resolve(null as unknown as SubmissionRecord)), [id]);

  const {
    data: report,
    loading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useFetch(
    () =>
      id
        ? getReport(id).catch((err: Error) => {
            // A new submission legitimately has no report. The backend detail
            // is "No analysis report found…", which does not contain the
            // exact phrase "not found", so handle it explicitly.
            const message = err.message.toLowerCase();
            if (
              message.includes('404') ||
              message.includes('not found') ||
              message.includes('no analysis report')
            ) {
              return null as unknown as SubmissionReport;
            }
            throw err;
          })
        : Promise.resolve(null as unknown as SubmissionReport),
    [id],
  );

  return {
    submission,
    report,
    loading: subLoading || reportLoading,
    error: subError ?? reportError,
    refetch: () => { refetchSub(); refetchReport(); },
  };
}

export function useModules(id: string | undefined) {
  const { data, loading, error, refetch } = useFetch<ModuleScore[]>(
    () =>
      id
        ? getModules(id).catch((err: Error) => {
            if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
              return [] as ModuleScore[];
            }
            throw err;
          })
        : Promise.resolve([] as ModuleScore[]),
    [id],
  );
  return { modules: data ?? [], loading, error, refetch };
}

export function useGaps(id: string | undefined, filters?: { severity?: string; status?: string }) {
  const severityKey = filters?.severity ?? '';
  const statusKey = filters?.status ?? '';
  const { data, loading, error, refetch } = useFetch<GapRecord[]>(
    () =>
      id
        ? getGaps(id, filters).catch((err: Error) => {
            if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
              return [] as GapRecord[];
            }
            throw err;
          })
        : Promise.resolve([] as GapRecord[]),
    [id, severityKey, statusKey],
  );
  return { gaps: data ?? [], loading, error, refetch };
}

export function useEvidence(id: string | undefined) {
  const { data, loading, error, refetch } = useFetch<EvidenceResponse>(
    () =>
      id
        ? getEvidence(id)
        : Promise.resolve({ submission_id: '', documents: [], counts: {}, evidence_stats: {} as EvidenceResponse['evidence_stats'] }),
    [id],
  );
  return { evidence: data, loading, error, refetch };
}

export function useRequirements() {
  const { data, loading, error, refetch } = useFetch<ApiRequirement[]>(listRequirements, []);
  return { requirements: data ?? [], loading, error, refetch };
}
