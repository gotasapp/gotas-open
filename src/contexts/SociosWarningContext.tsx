'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SociosWarningContextType {
  showSociosWarning: boolean;
  setShowSociosWarning: (show: boolean) => void;
}

const SociosWarningContext = createContext<SociosWarningContextType | undefined>(undefined);

export function SociosWarningProvider({ children }: { children: ReactNode }) {
  const [showSociosWarning, setShowSociosWarning] = useState(false);

  return (
    <SociosWarningContext.Provider value={{ showSociosWarning, setShowSociosWarning }}>
      {children}
    </SociosWarningContext.Provider>
  );
}

export function useSociosWarning() {
  const context = useContext(SociosWarningContext);
  if (context === undefined) {
    throw new Error('useSociosWarning must be used within a SociosWarningProvider');
  }
  return context;
}