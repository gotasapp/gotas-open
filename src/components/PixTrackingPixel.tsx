'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SLISE_ADV_ID = process.env.NEXT_PUBLIC_SLISE_ADV_ID;
const SLISE_KEY = process.env.NEXT_PUBLIC_SLISE_KEY;
const PIX_TRACKING_URL = SLISE_ADV_ID && SLISE_KEY
  ? `https://app.slise.xyz/adv/pix3l?adv=${SLISE_ADV_ID}&key=${SLISE_KEY}`
  : null;

export default function PixTrackingPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined' || !PIX_TRACKING_URL) {
      return undefined;
    }

    const img = document.createElement('img');
    img.src = PIX_TRACKING_URL;
    img.width = 1;
    img.height = 1;
    img.alt = '';
    img.decoding = 'async';
    img.style.position = 'absolute';
    img.style.width = '1px';
    img.style.height = '1px';
    img.style.pointerEvents = 'none';
    img.style.opacity = '0';
    img.style.top = '0';
    img.style.left = '0';

    document.body.appendChild(img);

    const cleanup = () => {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    };

    img.addEventListener('load', () => {
      window.setTimeout(cleanup, 100);
    });
    img.addEventListener('error', () => {
      window.setTimeout(cleanup, 100);
    });

    return cleanup;
  }, [pathname]);

  return null;
}
