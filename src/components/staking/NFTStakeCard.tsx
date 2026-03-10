/**
 * NFT Stake Card Component
 *
 * Individual NFT card with staking functionality
 * Can be used in NFT galleries and collection views
 */

'use client';

import { useState } from 'react';
import { useNFTStakingHook, useNFTStakingStatus } from '@/hooks/useNFTStakingHook';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Unlock, Coins } from 'lucide-react';
import Image from 'next/image';

interface NFTStakeCardProps {
  tokenId: number;
  name?: string;
  image?: string;
  description?: string;
  onStakeSuccess?: () => void;
  onWithdrawSuccess?: () => void;
}

export function NFTStakeCard({
  tokenId,
  name = `NFT #${tokenId}`,
  image = '/placeholder-nft.png',
  description,
  onStakeSuccess,
  onWithdrawSuccess,
}: NFTStakeCardProps) {
  const { stake, withdraw, isApproved, approve } = useNFTStakingHook();
  const { statuses, loading: statusLoading } = useNFTStakingStatus([tokenId]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStaked = statuses[tokenId] || false;

  const handleStake = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Auto-approve if needed
      if (!isApproved) {
        await approve();
      }

      await stake(tokenId);
      onStakeSuccess?.();
    } catch (err) {
      console.error('Staking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to stake NFT');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await withdraw(tokenId);
      onWithdrawSuccess?.();
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw NFT');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-square">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />

        {/* Staking Status Badge */}
        <div className="absolute top-2 right-2">
          {statusLoading ? (
            <Badge variant="secondary" className="bg-white/90">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Loading
            </Badge>
          ) : isStaked ? (
            <Badge variant="default" className="bg-green-500 text-white">
              <Lock className="h-3 w-3 mr-1" />
              Staked
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-white/90">
              <Unlock className="h-3 w-3 mr-1" />
              Available
            </Badge>
          )}
        </div>

        {/* Earning Indicator */}
        {isStaked && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-yellow-500 text-white animate-pulse">
              <Coins className="h-3 w-3 mr-1" />
              Earning
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          variant={isStaked ? 'outline' : 'default'}
          onClick={isStaked ? handleWithdraw : handleStake}
          disabled={isProcessing || statusLoading}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isStaked ? 'Withdrawing...' : 'Staking...'}
            </>
          ) : (
            <>
              {isStaked ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Withdraw NFT
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Stake NFT
                </>
              )}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}