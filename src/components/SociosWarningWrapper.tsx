'use client';

import React from 'react';
import { useSociosWarning } from '@/contexts/SociosWarningContext';
import { SociosWalletTopWarning } from './SociosWalletTopWarning';

export function SociosWarningWrapper({ children }: { children: React.ReactNode }) {
  const { showSociosWarning, setShowSociosWarning } = useSociosWarning();

  return (
    <>
      <SociosWalletTopWarning 
        isVisible={showSociosWarning} 
        onClose={() => setShowSociosWarning(false)} 
      />
      {children}
    </>
  );
}