'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MintPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirecionar para a home
    router.replace('/');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-2xl">Redirecionando...</div>
    </div>
  );
}