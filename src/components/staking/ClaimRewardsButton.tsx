'use client';

import { useNFTStakingActions } from '@/hooks/useNFTStakingActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Loader2, CheckCircle2 } from 'lucide-react';
import { formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ClaimRewardsButtonProps {
  variant?: 'default' | 'card';
  showBalance?: boolean;
}

export function ClaimRewardsButton({
  variant = 'default',
  showBalance = true
}: ClaimRewardsButtonProps) {
  const {
    rewardTokenBalance,
    hasRewardsToClaim,
    claimRewards,
    isClaiming,
    isOperationConfirming,
    isOperationConfirmed,
    writeError,
  } = useNFTStakingActions();

  const [showSuccess, setShowSuccess] = useState(false);

  // Show success message after claim confirmation
  useEffect(() => {
    if (isOperationConfirmed && !isClaiming) {
      setShowSuccess(true);
      const timeout = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOperationConfirmed, isClaiming]);

  const handleClaim = async () => {
    try {
      await claimRewards();
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  // Format reward balance (assuming 18 decimals like most ERC20 tokens)
  const formattedBalance = rewardTokenBalance
    ? parseFloat(formatUnits(rewardTokenBalance, 18)).toFixed(4)
    : '0.0000';

  // Card variant - more detailed display
  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recompensas Disponíveis</p>
                {showBalance && (
                  <p className="text-2xl font-bold flex items-center mt-1">
                    <Coins className="h-5 w-5 mr-2 text-yellow-500" />
                    {formattedBalance}
                  </p>
                )}
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleClaim}
                      disabled={!hasRewardsToClaim || isClaiming || isOperationConfirming}
                      variant={hasRewardsToClaim ? 'default' : 'outline'}
                    >
                      {isClaiming || isOperationConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isOperationConfirming ? 'Confirmando...' : 'Processando...'}
                        </>
                      ) : showSuccess ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Resgatado!
                        </>
                      ) : (
                        <>
                          <Coins className="mr-2 h-4 w-4" />
                          Resgatar
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {!hasRewardsToClaim
                        ? 'Nenhuma recompensa disponível no momento'
                        : 'Resgatar tokens de recompensa para sua carteira'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {writeError && (
              <div className="text-xs text-red-500">
                Erro ao resgatar recompensas. Tente novamente.
              </div>
            )}

            {showSuccess && (
              <div className="text-xs text-green-600 flex items-center">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Recompensas resgatadas com sucesso!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant - simple button
  return (
    <div className="flex flex-col gap-2">
      {showBalance && hasRewardsToClaim && (
        <div className="flex items-center text-sm">
          <Coins className="h-4 w-4 mr-1 text-yellow-500" />
          <span className="font-medium">{formattedBalance} tokens disponíveis</span>
        </div>
      )}

      <Button
        onClick={handleClaim}
        disabled={!hasRewardsToClaim || isClaiming || isOperationConfirming}
        size="sm"
        className="w-full"
      >
        {isClaiming || isOperationConfirming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isOperationConfirming ? 'Confirmando...' : 'Processando...'}
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Resgatado!
          </>
        ) : (
          <>
            <Coins className="mr-2 h-4 w-4" />
            Resgatar Recompensas
          </>
        )}
      </Button>

      {writeError && (
        <p className="text-xs text-red-500 text-center">
          Erro ao resgatar. Tente novamente.
        </p>
      )}
    </div>
  );
}
