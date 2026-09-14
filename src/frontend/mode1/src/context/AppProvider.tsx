import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { signals as initialSignals } from '@/data/mock-data';
import type { Signal } from '@/types';
import { Toast } from '@/components/common/Toast';

type AppContextType = {
  notify: (message: string) => void;
  signals: Signal[];
  setSignals: Dispatch<SetStateAction<Signal[]>>;
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('App context missing');
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState('');
  const [signals, setSignals] = useState<Signal[]>(initialSignals);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  return (
    <AppContext.Provider value={{ notify, signals, setSignals }}>
      {children}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </AppContext.Provider>
  );
}
