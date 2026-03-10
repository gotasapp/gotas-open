import { Suspense } from 'react';
import { BuyPixPage } from '@/components/buy-pix';

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <BuyPixPage />
    </Suspense>
  );
} 