'use client';

import { useState, useEffect } from 'react';
import { QuoteData, KycData } from '@/components/buy-pix/BuyPixPage';

interface BrlaOrder extends QuoteData {
  createdAt: number;
  walletAddress: string;
  kycData: KycData;
}

export function useBrlaOrder() {
  const [order, setOrder] = useState<BrlaOrder | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkOrder = () => {
      const savedOrder = localStorage.getItem('brla-order');
      if (savedOrder) {
        try {
          const orderData: BrlaOrder = JSON.parse(savedOrder);
          const elapsed = Date.now() - orderData.createdAt;
          const tenMinutes = 10 * 60 * 1000; // 10 minutos em ms

          if (elapsed < tenMinutes) {
            setOrder(orderData);
            setIsExpired(false);
          } else {
            localStorage.removeItem('brla-order');
            setOrder(null);
            setIsExpired(true);
          }
        } catch (error) {
          console.error('Erro ao carregar ordem salva:', error);
          localStorage.removeItem('brla-order');
        }
      }
    };

    checkOrder();
    
    const interval = setInterval(checkOrder, 30000); // Verifica a cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  const saveOrder = (orderData: Omit<BrlaOrder, 'createdAt'>) => {
    const order: BrlaOrder = {
      ...orderData,
      createdAt: Date.now()
    };
    
    localStorage.setItem('brla-order', JSON.stringify(order));
    setOrder(order);
    setIsExpired(false);
  };

  const clearOrder = () => {
    localStorage.removeItem('brla-order');
    setOrder(null);
    setIsExpired(false);
  };

  const getTimeRemaining = () => {
    if (!order) return 0;
    
    const elapsed = Date.now() - order.createdAt;
    const tenMinutes = 10 * 60 * 1000;
    const remaining = Math.max(0, tenMinutes - elapsed);
    
    return Math.floor(remaining / 1000); // Retorna em segundos
  };

  return {
    order,
    isExpired,
    saveOrder,
    clearOrder,
    getTimeRemaining,
    hasActiveOrder: !!order && !isExpired
  };
} 