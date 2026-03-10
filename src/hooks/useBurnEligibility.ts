/**
 * useBurnEligibility Hook
 *
 * React hook to check if the current user meets the minimum fan token balance
 * requirement to access the burn feature. Automatically refreshes when wallet changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import type { EligibilityResult } from '@/utils/burn-eligibility';
import { checkBurnEligibility } from '@/utils/burn-eligibility';

interface UseBurnEligibilityReturn {
  isEligible: boolean;
  isLoading: boolean;
  error: string | null;
  eligibilityResult: EligibilityResult | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to check burn eligibility for the connected wallet
 *
 * @returns UseBurnEligibilityReturn object with eligibility status and utilities
 *
 * @example
 * ```tsx
 * const { isEligible, isLoading, eligibilityResult } = useBurnEligibility();
 *
 * if (isLoading) return <div>Checking eligibility...</div>;
 * if (!isEligible) return <div>Not eligible to burn</div>;
 * return <BurnInterface />;
 * ```
 */
export function useBurnEligibility(): UseBurnEligibilityReturn {
  const { authenticated, user: unifiedUser } = useUnifiedAuth();

  const address = unifiedUser?.wallet?.address as `0x${string}` | undefined;
  const isConnected = authenticated && !!address;

  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  /**
   * Fetch eligibility status from API
   */
  const checkEligibility = useCallback(async () => {
    if (!address || !isConnected) {
      setIsEligible(false);
      setIsLoading(false);
      setError(null);
      setEligibilityResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useBurnEligibility] Verificando elegibilidade para endereço: ${address}`);
      const result = await checkBurnEligibility(address);
      console.log(`[useBurnEligibility] Resultado:`, result);

      setIsEligible(result.eligible);
      setEligibilityResult(result);

      if (!result.eligible) {
        setError(result.reason || 'Você não atende aos requisitos para queimar NFTs');
      }
    } catch (err) {
      console.error('Error checking burn eligibility:', err);
      setIsEligible(false);
      setError('Erro ao verificar elegibilidade. Tente novamente.');
      setEligibilityResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  /**
   * Refresh eligibility status (exposed to consumers)
   */
  const refresh = useCallback(async () => {
    await checkEligibility();
  }, [checkEligibility]);

  /**
   * Auto-check eligibility when wallet address changes
   */
  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  return {
    isEligible,
    isLoading,
    error,
    eligibilityResult,
    refresh
  };
}

/**
 * Hook variant that returns only boolean eligibility status
 * Useful when you only need to know if user is eligible
 */
export function useIsBurnEligible(): boolean {
  const { isEligible } = useBurnEligibility();
  return isEligible;
}
