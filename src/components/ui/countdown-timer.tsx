'use client';

import { useEffect, useState } from 'react';
import { SlidingNumber } from './sliding-number';

interface CountdownTimerProps {
  targetDate?: Date;
  cooldownMinutes?: number;
  nftId?: string;
  privyUserId?: string;
  onComplete?: () => void;
  compact?: boolean;
  className?: string;
  totalSupply?: number;
}

export function CountdownTimer({
  targetDate,
  cooldownMinutes,
  nftId,
  privyUserId,
  onComplete,
  compact = false,
  className = '',
  totalSupply,
}: CountdownTimerProps) {
  // Verifica se está esgotado (totalSupply === 0)
  const isSoldOut = totalSupply === 0;
  // Estado para os componentes do tempo
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [apiTarget, setApiTarget] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar cooldown da API se temos nftId e privyUserId
  useEffect(() => {
    if (nftId && privyUserId && !targetDate) {
      setIsLoading(true);
      
      fetch(`/api/rescue-cooldown/${nftId}?privyUserId=${privyUserId}`)
        .then(response => response.json())
        .then(data => {
          if (data.cooldownActive && data.cooldownEndsAt) {
            setApiTarget(new Date(data.cooldownEndsAt));
          } else {
            setIsCompleted(true);
          }
        })
        .catch(error => {
          console.error('Erro ao buscar cooldown:', error);
          // Fallback para cooldownMinutes se API falhar
          if (cooldownMinutes) {
            const fallbackTarget = new Date();
            fallbackTarget.setMinutes(fallbackTarget.getMinutes() + cooldownMinutes);
            setApiTarget(fallbackTarget);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [nftId, privyUserId, cooldownMinutes, targetDate]);

  useEffect(() => {
    let target: Date;
    
    // Prioridade: API target > targetDate prop > cooldownMinutes > default
    if (apiTarget) {
      target = apiTarget;
    }
    // Se foi fornecida uma data alvo específica, usar ela
    else if (targetDate) {
      target = new Date(targetDate);
    } 
    // Se temos um cooldownMinutes, criar um alvo a partir de agora + os minutos de cooldown
    else if (cooldownMinutes) {
      target = new Date();
      target.setMinutes(target.getMinutes() + cooldownMinutes);
    }
    // Caso padrão: 24 horas a partir de agora
    else {
      target = new Date();
      target.setHours(target.getHours() + 24);
    }

    const updateCountdown = () => {
      const now = new Date();
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        // Tempo esgotado
        setDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        setIsCompleted(true);
        
        if (onComplete) {
          onComplete();
        }
        
        return;
      }
      
      // Cálculos de tempo
      const d = Math.floor(difference / (1000 * 60 * 60 * 24));
      const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((difference % (1000 * 60)) / 1000);
      
      setDays(d);
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    };
    
    // Atualiza imediatamente
    updateCountdown();
    
    // Configura o intervalo
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [targetDate, cooldownMinutes, apiTarget, onComplete]);

  if (compact) {
    // Versão compacta mostra apenas horas e minutos
    return (
      <div className={`flex items-center font-mono ${className}`}>
        <SlidingNumber value={hours} padStart={true} />
        <span className="px-0.5">:</span>
        <SlidingNumber value={minutes} padStart={true} />
        <span className="px-0.5">:</span>
        <SlidingNumber value={seconds} padStart={true} />
      </div>
    );
  }

  // Determina quais componentes de tempo mostrar
  const showDays = days > 0;
  const showHours = showDays || hours > 0;

  // Mostrar loading se estamos buscando da API
  if (isLoading) {
    return (
      <div className={`flex items-center justify-between w-full ${className}`}>
        <span className="text-sm font-medium">Disponível em</span>
        <div className="flex items-center gap-1 text-sm">
          <span className="animate-pulse">Verificando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      <span className="text-sm font-medium">{isSoldOut ? 'Disponível' : (isCompleted ? 'Disponível' : 'Disponível em')}</span>
      <div className="flex items-center gap-1 text-sm font-mono">
        {isSoldOut ? (
          <span className="text-red-500 font-medium">Esgotado</span>
        ) : isCompleted ? (
          <span className="text-green-500 font-medium">Liberado</span>
        ) : (
          <>
            {showDays && (
              <>
                <SlidingNumber value={days} padStart={false} />
                <span>d</span>
              </>
            )}
            
            {showDays && <span className="text-gray-400 mx-0.5">:</span>}
            
            <SlidingNumber value={hours} padStart={true} />
            <span>h</span>
            
            <span className="text-gray-400 mx-0.5">:</span>
            
            <SlidingNumber value={minutes} padStart={true} />
            <span>m</span>
            
            <span className="text-gray-400 mx-0.5">:</span>
            
            <SlidingNumber value={seconds} padStart={true} />
            <span>s</span>
          </>
        )}
      </div>
    </div>
  );
}