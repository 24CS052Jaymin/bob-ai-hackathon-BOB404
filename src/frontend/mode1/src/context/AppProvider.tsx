/**
 * AppProvider — global context for signals and toast notifications.
 *
 * On mount it calls POST /api/v1/process-faers (the backend's local FAERS
 * dataset). While the request is in-flight, signals is an empty array and
 * loading is true so pages can show a skeleton state instead of stale dummy
 * data. There is NO mock-data fallback — if the backend is unreachable the
 * list stays empty and backendError is populated.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { processFaers } from '@/lib/api';
import type { Signal } from '@/types';
import { Toast } from '@/components/common/Toast';

type AppContextType = {
  notify: (message: string) => void;
  signals: Signal[];
  setSignals: Dispatch<SetStateAction<Signal[]>>;
  /** True while the initial backend fetch is in-flight */
  loading: boolean;
  /** Non-null when the backend call failed */
  backendError: string | null;
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('App context missing');
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [toast, setToast]               = useState('');
  const [signals, setSignals]           = useState<Signal[]>([]);   // empty — no mock data
  const [loading, setLoading]           = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchSignals() {
      try {
        const res = await processFaers();
        if (!cancelled) {
          setSignals(res.signals);
          setBackendError(null);
          notify(`Loaded ${res.signals.length.toLocaleString()} signals from backend`);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[AppProvider] Backend fetch failed:', msg);
          setBackendError(msg);
          // signals stays [] — pages must handle the empty + error state
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSignals();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{ notify, signals, setSignals, loading, backendError }}>
      {children}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </AppContext.Provider>
  );
}
