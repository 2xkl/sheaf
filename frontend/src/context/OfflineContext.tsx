import { createContext, useContext, type ReactNode } from 'react';
import { useOffline, type UseOfflineReturn } from '../hooks/useOffline';

const OfflineContext = createContext<UseOfflineReturn | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const offline = useOffline();

  return <OfflineContext.Provider value={offline}>{children}</OfflineContext.Provider>;
}

export function useOfflineContext(): UseOfflineReturn {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within OfflineProvider');
  }
  return context;
}
