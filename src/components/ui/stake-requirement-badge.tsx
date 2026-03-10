'use client';

import { useState, useEffect } from 'react';
import { StakeVerificationResult } from '@/lib/types';
import { verifyStakeRequirement } from '@/utils/stake-verification';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

interface StakeRequirementBadgeProps {
  stakeRequired?: boolean;
  stakeTokenAddress?: string;
  stakeTokenAmount?: number;
  stakeTokenSymbol?: string;
  className?: string;
}

export function StakeRequirementBadge({
  stakeRequired = false,
  stakeTokenAddress = '',
  stakeTokenAmount = 0,
  stakeTokenSymbol = '',
  className = ''
}: StakeRequirementBadgeProps) {
  const { user, authenticated } = useUnifiedAuth();
  const [verificationResult, setVerificationResult] = useState<StakeVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasMetRequirement, setHasMetRequirement] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'verified' | 'error'>('verifying');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Se não houver requisito de stake ou usuário não estiver autenticado, não verifica
    if (!stakeRequired || !authenticated || !user?.wallet || !user.wallet.address) {
      return;
    }

    const verifyStake = async () => {
      setIsVerifying(true);
      setVerificationStatus('verifying');
      setHasError(false);
      try {
        if (!user.wallet?.address) {
          setHasMetRequirement(false);
          setVerificationStatus('error');
          setHasError(true);
          return;
        }
        const result = await verifyStakeRequirement(
          user.wallet.address,
          {
            required: stakeRequired,
            tokenAddress: stakeTokenAddress,
            tokenAmount: stakeTokenAmount,
            tokenSymbol: stakeTokenSymbol
          }
        );
        setVerificationResult(result);
        setVerificationStatus('verified');
      } catch (error) {
        console.error('Erro ao verificar stake:', error);
        setVerificationResult({
          success: false,
          message: 'Erro ao verificar requisitos de stake',
        });
        setVerificationStatus('error');
        setHasError(true);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyStake();
  }, [stakeRequired, stakeTokenAddress, stakeTokenAmount, stakeTokenSymbol, authenticated, user?.wallet?.address]);

  // Se não houver requisito de stake, não renderiza nada
  if (!stakeRequired) {
    return null;
  }

  return (
    <div className={`rounded-md p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-blue-500"
          >
            <path d="M12 2L7 7C4 10 4 15 7 18C9 20 11 21 13 21C15 21 17 20 19 18C22 15 22 10 19 7L14 2C13.5 1.5 12.5 1.5 12 2Z" />
          </svg>
          <h3 className="font-medium">Requisito</h3>
        </div>
        
        <div className="text-sm font-medium">
          {stakeTokenAmount} {stakeTokenSymbol}
        </div>
      </div>

      {isVerifying ? (
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span>Verificando...</span>
        </div>
      ) : verificationResult ? (
        <div className={`mt-2 p-2 rounded ${verificationResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <div className="flex items-center">
            {verificationResult.success ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className='text-sm'>Você tem {verificationResult.currentAmount} {verificationResult.tokenSymbol} em stake</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Você tem {verificationResult.currentAmount} {verificationResult.tokenSymbol} em stake</span>
              </>
            )}
          </div>
        </div>
      ) : authenticated ? (
        <div className="text-gray-500">Não foi possível verificar os requisitos de stake.</div>
      ) : (
        <div className="text-gray-500">Conecte sua carteira para verificar os requisitos de stake.</div>
      )}
    </div>
  );
}