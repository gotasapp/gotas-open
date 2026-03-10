'use client';

import { useEffect, useState } from 'react';
import { useBrlaOrder } from '@/hooks/useBrlaOrder';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function ActiveOrderNotification() {
  const { hasActiveOrder, getTimeRemaining, order } = useBrlaOrder();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (hasActiveOrder) {
      setTimeLeft(getTimeRemaining());
      
      const interval = setInterval(() => {
        const remaining = getTimeRemaining();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [hasActiveOrder, getTimeRemaining]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!hasActiveOrder || !order) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <CreditCard className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-medium text-orange-800">
            Você tem um pagamento PIX pendente
          </p>
          <p className="text-sm text-orange-600">
            Tempo restante: {formatTime(timeLeft)}
          </p>
        </div>
        <Link href="/buy-pix">
          <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
            Finalizar Pagamento
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
} 