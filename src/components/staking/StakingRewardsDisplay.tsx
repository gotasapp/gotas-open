/**
 * Staking Rewards Display Component
 *
 * Shows current rewards, APR, and claim functionality
 * Can be used standalone or embedded in other components
 */

'use client';

import { useState, useEffect } from 'react';
import { useNFTStakingHook, useNFTStakingPool } from '@/hooks/useNFTStakingHook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Clock, Award, Info, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StakingRewardsDisplay() {
  const {
    rewards,
    userBalance,
    claim,
    calculatePendingRewards,
    refresh,
  } = useNFTStakingHook();

  const poolStats = useNFTStakingPool();

  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [rewardProgress, setRewardProgress] = useState(0);

  // Calculate rewards and update progress
  useEffect(() => {
    const updateRewards = async () => {
      if (userBalance > 0) {
        const pending = await calculatePendingRewards();
        setPendingRewards(pending);

        // Calculate progress to next reward milestone (example: every 100 tokens)
        const progressToNextMilestone = (pending % 100) / 100 * 100;
        setRewardProgress(progressToNextMilestone);
      }
    };

    updateRewards();
    const interval = setInterval(updateRewards, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [userBalance, calculatePendingRewards]);

  const handleClaimRewards = async () => {
    setIsClaimingRewards(true);

    try {
      await claim();
      setPendingRewards(0);
      setRewardProgress(0);
      await refresh();
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    } finally {
      setIsClaimingRewards(false);
    }
  };

  // Calculate estimated daily rewards
  const estimatedDailyRewards = userBalance > 0 && poolStats.rewardsPerUnit > 0
    ? (userBalance * poolStats.rewardsPerUnit * (86400 / poolStats.timeUnit))
    : 0;

  // Calculate APR (simplified example)
  const estimatedAPR = userBalance > 0
    ? (estimatedDailyRewards * 365 / userBalance) * 100
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Rewards Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Available Rewards
          </CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingRewards.toFixed(4)}</div>
          <p className="text-xs text-muted-foreground">
            Ready to claim
          </p>

          <Progress value={rewardProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {(100 - rewardProgress).toFixed(0)} to next milestone
          </p>
        </CardContent>
      </Card>

      {/* Estimated Daily Rewards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Daily Rewards
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ~{estimatedDailyRewards.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated per day
          </p>

          <div className="mt-2 flex items-center text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center cursor-help">
                    <Info className="h-3 w-3 mr-1" />
                    <span>Based on {userBalance} NFTs staked</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rewards may vary based on pool size and reward rate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* APR Display */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Estimated APR
          </CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {estimatedAPR.toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Annual percentage rate
          </p>

          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pool rate:</span>
              <span>{poolStats.rewardsPerUnit}/unit</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Time unit:</span>
              <span>{poolStats.timeUnit}s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Claim Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Last Claim
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rewards?.lastRewardTime ? (
              <>
                <div className="text-sm">
                  {new Date(rewards.lastRewardTime * 1000).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(rewards.lastRewardTime * 1000).toLocaleTimeString()}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Never claimed
              </div>
            )}

            <Button
              size="sm"
              className="w-full"
              onClick={handleClaimRewards}
              disabled={pendingRewards === 0 || isClaimingRewards}
            >
              {isClaimingRewards ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-3 w-3" />
                  Claim Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified version for embedding in other components
export function StakingRewardsWidget() {
  const { calculatePendingRewards, claim } = useNFTStakingHook();
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const loadRewards = async () => {
      const rewards = await calculatePendingRewards();
      setPendingRewards(rewards);
    };

    loadRewards();
    const interval = setInterval(loadRewards, 10000);
    return () => clearInterval(interval);
  }, [calculatePendingRewards]);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await claim();
      setPendingRewards(0);
    } catch (error) {
      console.error('Claim failed:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Rewards Available</p>
            <p className="text-2xl font-bold flex items-center mt-1">
              <Coins className="h-5 w-5 mr-1 text-yellow-500" />
              {pendingRewards.toFixed(4)}
            </p>
          </div>

          <Button
            size="sm"
            variant={pendingRewards > 0 ? 'default' : 'outline'}
            onClick={handleClaim}
            disabled={pendingRewards === 0 || isClaiming}
          >
            {isClaiming ? 'Claiming...' : 'Claim'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}