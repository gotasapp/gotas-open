/**
 * NFT Staking Panel Component
 *
 * Main UI component for NFT staking operations
 * Uses the useNFTStakingHook for blockchain interactions
 */

'use client';

import { useState, useEffect } from 'react';
import { useNFTStakingHook } from '@/hooks/useNFTStakingHook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Coins, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatUnits } from 'viem';

export function NFTStakingPanel() {
  const {
    stakeInfo,
    rewards,
    isApproved,
    isActive,
    totalStaked,
    userBalance,
    loading,
    error,
    stake,
    stakeBatch,
    withdraw,
    withdrawBatch,
    claim,
    approve,
    refresh,
    calculatePendingRewards,
  } = useNFTStakingHook();

  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([]);
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate pending rewards periodically
  useEffect(() => {
    const updateRewards = async () => {
      if (stakeInfo?.stakedTokenIds.length) {
        const rewards = await calculatePendingRewards();
        setPendingRewards(rewards);
      }
    };

    updateRewards();
    const interval = setInterval(updateRewards, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [stakeInfo, calculatePendingRewards]);

  const handleStake = async () => {
    if (selectedNFTs.length === 0) return;

    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (selectedNFTs.length === 1) {
        await stake(selectedNFTs[0]);
      } else {
        await stakeBatch(selectedNFTs);
      }

      setSuccessMessage(`Successfully staked ${selectedNFTs.length} NFT(s)`);
      setSelectedNFTs([]);
    } catch (err) {
      console.error('Staking error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (tokenId: number) => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      await withdraw(tokenId);
      setSuccessMessage(`Successfully withdrew NFT #${tokenId}`);
    } catch (err) {
      console.error('Withdrawal error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimRewards = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      await claim();
      setSuccessMessage('Successfully claimed rewards!');
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);

    try {
      await approve();
      setSuccessMessage('Successfully approved staking contract!');
    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading staking data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Staked NFTs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userBalance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Coins className="h-5 w-5 mr-1" />
              {pendingRewards.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pool Staked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {!isApproved && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You need to approve the staking contract to stake NFTs</span>
            <Button
              onClick={handleApprove}
              size="sm"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Contract'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Staking Interface */}
      <Card>
        <CardHeader>
          <CardTitle>NFT Staking</CardTitle>
          <CardDescription>
            Stake your NFTs to earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stake" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stake">Stake</TabsTrigger>
              <TabsTrigger value="staked">My Staked</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value="stake" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Select NFTs to stake from your wallet
              </div>

              {/* NFT selection would go here - integrate with your NFT listing */}
              <div className="border rounded-lg p-4 min-h-[200px] flex items-center justify-center text-muted-foreground">
                NFT selection interface - integrate with existing NFT components
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedNFTs.length} NFT(s) selected
                </span>
                <Button
                  onClick={handleStake}
                  disabled={!isApproved || selectedNFTs.length === 0 || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Staking...
                    </>
                  ) : (
                    `Stake ${selectedNFTs.length > 0 ? selectedNFTs.length : ''} NFT${selectedNFTs.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="staked" className="space-y-4">
              {stakeInfo?.stakedTokenIds.length ? (
                <div className="space-y-2">
                  {stakeInfo.stakedTokenIds.map((tokenId) => (
                    <div
                      key={tokenId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">NFT #{tokenId}</div>
                          <div className="text-sm text-muted-foreground">
                            Earning rewards
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdraw(tokenId)}
                        disabled={isProcessing}
                      >
                        Withdraw
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  You haven't staked any NFTs yet
                </div>
              )}
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current Rewards</span>
                    <span className="text-2xl font-bold flex items-center">
                      <Coins className="h-5 w-5 mr-1" />
                      {pendingRewards.toFixed(4)}
                    </span>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleClaimRewards}
                    disabled={pendingRewards === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      'Claim Rewards'
                    )}
                  </Button>

                  <div className="text-xs text-muted-foreground text-center">
                    Rewards update every 10 seconds
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isProcessing}
        >
          <Loader2 className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}