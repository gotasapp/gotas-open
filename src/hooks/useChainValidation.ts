'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { chiliz } from '@/lib/chains';
import { useEffect, useState } from 'react';
import { ChainValidationResult, MarketplaceError, MarketplaceErrorType } from '@/types/marketplace';

export function useChainValidation() {
  const { chain, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const { user, connectWallet } = usePrivy();
  const [isValidChain, setIsValidChain] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<MarketplaceError | null>(null);

  useEffect(() => {
    const valid = chain?.id === chiliz.id;
    setIsValidChain(valid);
    
    if (!valid && chain) {
      setError({
        type: MarketplaceErrorType.CHAIN_MISMATCH,
        message: `Conecte-se à ${chiliz.name} para usar o marketplace`,
        details: { currentChain: chain.name, requiredChain: chiliz.name }
      });
    } else {
      setError(null);
    }
  }, [chain]);

  const ensureCorrectChain = async (): Promise<boolean> => {
    setError(null);
    
    // Verificar se há carteira conectada
    if (!address) {
      try {
        await connectWallet();
        return false; // Precisa esperar a conexão
      } catch (err) {
        setError({
          type: MarketplaceErrorType.CHAIN_MISMATCH,
          message: 'Conecte uma carteira para continuar',
          details: err
        });
        return false;
      }
    }

    // Se já está na chain correta
    if (chain?.id === chiliz.id) {
      return true;
    }

    setIsSwitching(true);
    try {
      await switchChain({ chainId: chiliz.id });
      
      // Aguardar um momento para a chain ser atualizada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (err: any) {
      console.error('Erro ao trocar de rede:', err);
      
      // Diferentes tipos de erro de switch
      if (err.code === 4902) {
        setError({
          type: MarketplaceErrorType.CHAIN_MISMATCH,
          message: `Adicione a ${chiliz.name} à sua carteira`,
          details: { ...err, chainConfig: chiliz }
        });
      } else if (err.code === 4001) {
        setError({
          type: MarketplaceErrorType.CHAIN_MISMATCH,
          message: 'Troca de rede rejeitada pelo usuário',
          details: err
        });
      } else {
        setError({
          type: MarketplaceErrorType.CHAIN_MISMATCH,
          message: `Falha ao conectar na ${chiliz.name}`,
          details: err
        });
      }
      
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  const getChainValidationResult = (): ChainValidationResult => {
    return {
      isValidChain,
      currentChainId: chain?.id,
      requiredChainId: chiliz.id,
      chainName: chiliz.name,
    };
  };

  const getChainDisplayInfo = () => {
    if (!chain) {
      return {
        status: 'disconnected' as const,
        message: 'Carteira desconectada',
        color: 'gray'
      };
    }

    if (chain.id === chiliz.id) {
      return {
        status: 'correct' as const,
        message: `Conectado à ${chiliz.name}`,
        color: 'green'
      };
    }

    return {
      status: 'wrong' as const,
      message: `Conectado à ${chain.name} (incorreta)`,
      color: 'red'
    };
  };

  return {
    // Estados
    isValidChain,
    isSwitching,
    error,
    
    // Chain info
    currentChain: chain,
    requiredChain: chiliz,
    chainInfo: getChainDisplayInfo(),
    
    // Funções
    ensureCorrectChain,
    getChainValidationResult,
    
    // Utilitários
    isConnected: !!address,
    address,
  };
}

/**
 * Hook simplificado para componentes que apenas precisam validar a chain
 */
export function useRequireChilizChain() {
  const { isValidChain, ensureCorrectChain, error, isSwitching } = useChainValidation();

  return {
    isValidChain,
    ensureCorrectChain,
    error,
    isSwitching,
  };
}