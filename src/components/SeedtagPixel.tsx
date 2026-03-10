'use client';

import { useEffect } from 'react';
import { trackSeedtagVisit } from '@/lib/seedtag';

export default function SeedtagPixel() {
  useEffect(() => {
    // Dispara o pixel de visita em todas as páginas
    trackSeedtagVisit();
  }, []);

  return null;
}