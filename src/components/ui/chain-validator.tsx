'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Wifi,
  WifiOff,
  ArrowRightLeft
} from 'lucide-react';
import { useChainValidation } from '@/hooks/useChainValidation';
import { cn } from '@/lib/utils';

interface ChainValidatorProps {
  /**
   * Se deve tentar conectar automaticamente quando o componente monta
   */
  autoConnect?: boolean;
  
  /**
   * Se deve mostrar informações detalhadas da chain
   */
  showDetails?: boolean;
  
  /**
   * Se deve mostrar apenas um indicador compacto
   */
  compact?: boolean;
  
  /**
   * Callback quando a chain é validada com sucesso
   */
  onValidated?: () => void;
  
  /**
   * Callback quando há erro na validação
   */
  onError?: (error: string) => void;
  
  /**
   * Classe CSS customizada
   */
  className?: string;
}

/**
 * Componente para validar e trocar automaticamente para a Chiliz Chain
 * Funciona com Privy e Socios Wallet
 */
export function ChainValidator({
  autoConnect = false,
  showDetails = true,
  compact = false,
  onValidated,
  onError,
  className
}: ChainValidatorProps) {
  const {
    isValidChain,
    isSwitching,
    error,
    currentChain,
    requiredChain,
    chainInfo,
    ensureCorrectChain,
    isConnected,
    address
  } = useChainValidation();

  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

  // Auto-connect quando o componente monta
  useEffect(() => {
    if (autoConnect && !hasAttemptedAutoConnect && isConnected && !isValidChain) {
      setHasAttemptedAutoConnect(true);
      handleSwitchChain();
    }
  }, [autoConnect, hasAttemptedAutoConnect, isConnected, isValidChain]);

  // Callbacks para parent components
  useEffect(() => {
    if (isValidChain) {
      onValidated?.();
    }
  }, [isValidChain, onValidated]);

  useEffect(() => {
    if (error) {
      onError?.(error.message);
    }
  }, [error, onError]);

  const handleSwitchChain = async () => {
    const success = await ensureCorrectChain();
    if (success) {
      setHasAttemptedAutoConnect(false); // Reset para permitir nova tentativa
    }
  };

  // Se não está conectado, mostrar estado disconnected
  if (!isConnected) {
    if (compact) {
      return (
        <Badge variant="secondary" className={cn("flex items-center gap-1", className)}>
          <WifiOff className="w-3 h-3" />
          <span className="text-xs">Desconectado</span>
        </Badge>
      );
    }

    return (
      <Alert className={cn("border-gray-200", className)}>
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Carteira não conectada</span>
            <Badge variant="secondary" className="ml-2">
              Desconectado
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Renderização compacta
  if (compact) {
    if (isValidChain) {
      return (
        <Badge variant="default" className={cn("flex items-center gap-1 bg-green-100 text-green-800 border-green-200", className)}>
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs">Chiliz Chain</span>
        </Badge>
      );
    }

    return (
      <Badge 
        variant="destructive" 
        className={cn("flex items-center gap-1 cursor-pointer hover:bg-red-700", className)}
        onClick={handleSwitchChain}
      >
        {isSwitching ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <AlertCircle className="w-3 h-3" />
        )}
        <span className="text-xs">Chain Incorreta</span>
      </Badge>
    );
  }

  // Renderização completa - Chain correta
  if (isValidChain) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Conectado à Chiliz Chain</div>
              {showDetails && (
                <div className="text-sm text-green-700 mt-1">
                  Chain ID: {requiredChain.id} • RPC: Conectado
                </div>
              )}
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Wifi className="w-3 h-3 mr-1" />
              Ativo
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Renderização completa - Chain incorreta ou erro
  return (
    <Alert className={cn("border-red-200 bg-red-50", className)}>
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {error ? error.message : `Conectado à ${currentChain?.name || 'rede desconhecida'}`}
              </div>
              {showDetails && !error && (
                <div className="text-sm text-red-700 mt-1">
                  Chain atual: {currentChain?.id} • Necessária: {requiredChain.id}
                </div>
              )}
            </div>
            <Badge variant="destructive">
              Incorreta
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSwitchChain}
              disabled={isSwitching}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Trocando...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3 h-3 mr-2" />
                  Trocar para Chiliz Chain
                </>
              )}
            </Button>

            {error && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Recarregar
              </Button>
            )}
          </div>

          {showDetails && error?.details && (
            <div className="text-xs text-red-600 bg-red-100 p-2 rounded border">
              <strong>Detalhes:</strong> {JSON.stringify(error.details, null, 2)}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook para usar o ChainValidator como um estado simples
 */
export function useChainValidator(autoValidate = false) {
  const {
    isValidChain,
    isSwitching,
    error,
    ensureCorrectChain,
    isConnected
  } = useChainValidation();

  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (autoValidate && isConnected && !isValidChain && !isValidating) {
      setIsValidating(true);
      ensureCorrectChain().finally(() => {
        setIsValidating(false);
      });
    }
  }, [autoValidate, isConnected, isValidChain, isValidating]);

  return {
    isValidChain,
    isValidating: isValidating || isSwitching,
    error,
    validate: ensureCorrectChain,
    canProceed: isValidChain && isConnected,
  };
}

/**
 * Componente HOC para proteger páginas/componentes que precisam da Chiliz Chain
 */
export function withChainValidation<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    showValidator?: boolean;
    autoConnect?: boolean;
    fallback?: React.ComponentType;
  } = {}
) {
  const { showValidator = true, autoConnect = true, fallback: Fallback } = options;

  return function ChainValidatedComponent(props: T) {
    const { isValidChain, isConnected } = useChainValidation();

    if (!isConnected || !isValidChain) {
      if (Fallback) {
        return <Fallback />;
      }

      if (showValidator) {
        return (
          <div className="space-y-4">
            <ChainValidator 
              autoConnect={autoConnect}
              showDetails={true}
            />
            {!isValidChain && isConnected && (
              <div className="text-center text-gray-500 text-sm">
                Conecte-se à Chiliz Chain para continuar
              </div>
            )}
          </div>
        );
      }

      return null;
    }

    return <Component {...props} />;
  };
}