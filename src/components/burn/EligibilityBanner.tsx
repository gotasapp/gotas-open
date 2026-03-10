'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import type { EligibilityResult } from '@/utils/burn-eligibility';
import { formatEligibilityMessage } from '@/utils/burn-eligibility';
import Link from 'next/link';

interface EligibilityBannerProps {
  isLoading: boolean;
  isEligible: boolean;
  error: string | null;
  eligibilityResult: EligibilityResult | null;
  onRefresh?: () => void;
  isApproved?: boolean;
  isWhitelisted?: boolean;
}

/**
 * Banner component to display burn eligibility status
 *
 * Shows:
 * - Loading state while checking
 * - Success state when eligible
 * - Warning state when not eligible with token balances
 * - Error state on API failure
 */
export function EligibilityBanner({
  isLoading,
  isEligible,
  error,
  eligibilityResult,
  onRefresh,
  isApproved,
  isWhitelisted
}: EligibilityBannerProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4 border-2 border-gray-300 bg-gray-50 shadow-none">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Verificando elegibilidade...
            </p>
            <p className="text-xs text-gray-600">
              Checando saldo de fan tokens em stake na blockchain
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error && !eligibilityResult) {
    return (
      <Card className="p-4 border-2 border-red-300 bg-red-50 shadow-none">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Erro ao verificar elegibilidade</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Success state - Eligible
  if (isEligible && eligibilityResult) {
    return (
      <Card className="p-4 border-2 border-green-300 bg-green-50 shadow-none">
        <div className="flex flex-col gap-3">
          {/* Main eligibility status */}
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Você está apto para queimar Cards
              </p>
              <p className="text-xs text-green-700 mt-1">
                {eligibilityResult.qualifyingTokens.length > 0 && (
                  <>
                    Tokens em stake:{' '}
                    {eligibilityResult.qualifyingTokens.map((t, i) => (
                      <span key={t.symbol}>
                        <strong>{t.symbol}</strong> ({t.formattedBalance})
                        {i < eligibilityResult.qualifyingTokens.length - 1 && ', '}
                      </span>
                    ))}
                  </>
                )}
              </p>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-green-300 hover:bg-green-100"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Requirements and status info */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-green-200">
            {/* Minimum requirement */}
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100/50 px-2 py-1 rounded-full">
              <Info className="w-3 h-3" />
              <span>Mínimo: <strong>{eligibilityResult.minimumRequired}</strong> tokens</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Warning state - Not eligible
  if (!isEligible && eligibilityResult) {
    const hasAnyTokens = eligibilityResult.tokenBalances.some(
      tb => parseFloat(tb.balance) > 0
    );

    return (
      <Card className="p-4 border-2 border-orange-300 bg-orange-50 shadow-none">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">
                Saldo insuficiente de fan tokens em stake
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Você precisa ter pelo menos <strong>{eligibilityResult.minimumRequired}</strong>{' '}
                tokens de qualquer clube brasileiro <strong>em stake</strong> para queimar Cards.
              </p>
            </div>
          </div>

          {/* Token balances display */}
          {hasAnyTokens && (
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">Seus saldos em stake:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {eligibilityResult.tokenBalances
                  .filter(tb => parseFloat(tb.balance) > 0)
                  .map(tb => (
                    <div
                      key={tb.symbol}
                      className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded"
                    >
                      {tb.icon_url && (
                        <img
                          src={tb.icon_url}
                          alt={tb.symbol}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{tb.symbol}</p>
                        <p className="text-gray-600">{tb.formattedBalance}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Link href="/resgates" className="flex-1 min-w-[200px]">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-orange-300 hover:bg-orange-100"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Fazer Stake de Fan Tokens
              </Button>
            </Link>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="border-orange-300 hover:bg-orange-100"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Fallback - should not reach here
  return null;
}

/**
 * Compact version of eligibility banner for use in modals or limited spaces
 */
export function CompactEligibilityBadge({
  isEligible,
  isLoading
}: {
  isEligible: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  if (isEligible) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
        <CheckCircle className="w-3 h-3" />
        Elegível
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 gap-1">
      <AlertCircle className="w-3 h-3" />
      Não elegível
    </Badge>
  );
}
