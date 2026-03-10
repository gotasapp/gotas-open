'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Header } from "@/components/header";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Info, Flame, Gift, RefreshCw, Send, Coins, Maximize2, X, Wallet, Lock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { toast } from 'sonner';
import { useNFTStaking } from '@/hooks/useNFTStaking';
import { useBurnStaking } from '@/hooks/useBurnStaking';
import { useBurnEligibility } from '@/hooks/useBurnEligibility';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { EligibilityBanner } from '@/components/burn/EligibilityBanner';
import { TransferNFTModal } from '@/components/burn/TransferNFTModal';
import { WhitelistStepsModal } from '@/components/burn/WhitelistStepsModal';
import { WhitelistErrorModal } from '@/components/burn/WhitelistErrorModal';
import { HowItWorksModal } from '@/components/burn/HowItWorksModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConnectionChoiceModal } from '@/components/modals/ConnectionChoiceModal';

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as Address;
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT as Address;
const ITEMS_PER_PAGE = 10;

// Temporário - desabilita queima durante intervalo entre fases
const BURN_PHASE_DISABLED = true;

const BadgeRarity = ({ rarity }: { rarity: string | null | undefined }) => {
  if (!rarity) return null;
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  return (
    <Badge className={`${rarityInfo.className} border-0 text-xs px-2 py-0.5 rounded-full`}>
      <Icon className="w-3 h-3 mr-1" />
      {rarityInfo.label}
    </Badge>
  );
};

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const firstItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4 text-xs sm:text-sm text-gray-600">
      <span className="text-gray-500">
        Mostrando {firstItem}-{lastItem} de {totalItems}
      </span>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage === totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};

export default function StakePage() {
  const { ready, login } = usePrivy();
  const { authenticated: isAuthenticated, user: unifiedUser, loading: unifiedLoading } = useUnifiedAuth();
  const { address: wagmiAddress } = useAccount();
  const { writeContract, data: hash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const address = (unifiedUser?.wallet?.address as Address | undefined) || wagmiAddress;

  const {
    stakedNFTs,
    unstakedNFTs,
    isLoading: isLoadingNFTs,
    refreshAll,
  } = useNFTStaking();

  // New burn staking hook
  const {
    stats: burnStats,
    rewardBreakdown,
    isApproved: isBurnApproved,
    isWhitelisted: isBurnWhitelisted,
    isPaused: isBurnPaused,
    fixedReward,
    minDuration,
    feePercentage,
    maxStakesPerUser,
    stakeBatch: burnStakeBatch,
    unstake: burnUnstake,
    claim: burnClaim,
    approve: burnApprove,
    addToWhitelist: burnAddToWhitelist,
    checkWhitelist: burnCheckWhitelist,
    refresh: refreshBurnStats,
  } = useBurnStaking();

  // Burn eligibility hook
  const {
    isEligible: isBurnEligible,
    isLoading: isCheckingEligibility,
    error: eligibilityError,
    eligibilityResult,
    refresh: refreshEligibility
  } = useBurnEligibility();

  const [selectedNFTs, setSelectedNFTs] = useState<Set<string>>(new Set());
  const [showStakeConfirm, setShowStakeConfirm] = useState(false);
  const [showSociosWalletInfo, setShowSociosWalletInfo] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
  const [whitelistErrorModalOpen, setWhitelistErrorModalOpen] = useState(false);
  const [whitelistStep, setWhitelistStep] = useState<'pending' | 'processing' | 'success'>('pending');
  const [nftToTransfer, setNftToTransfer] = useState<{
    tokenId: string;
    name?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  } | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [unstakedPage, setUnstakedPage] = useState(1);
  const [stakedPage, setStakedPage] = useState(1);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Detecta se é Socios Wallet (não está autenticado via Privy)
  const isSociosWallet = !ready || (address && !unifiedUser?.id?.startsWith('did:privy:'));

  // Use approval state from burn staking hook
  const isApproved = isBurnApproved;

  const normalizedFeeBps = Math.min(Math.max(feePercentage, 0), 10000);
  const formatRewardValue = (value: number) => {
    if (!Number.isFinite(value)) {
      return '0';
    }
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    if (Number.isInteger(rounded)) {
      return rounded.toFixed(0);
    }
    return rounded.toFixed(2);
  };
  const grossRewardPerNFT = parseFloat(formatEther(fixedReward));
  const formattedGrossRewardPerNFT = formatRewardValue(grossRewardPerNFT);
  const formattedFeePercent = (normalizedFeeBps / 100).toFixed(1);
  const netRewardsValue = parseFloat(formatEther(burnStats.netRewards || BigInt(0)));
  const formattedNetRewards = formatRewardValue(netRewardsValue);

  // Calculate available slots for staking
  const currentStaked = burnStats.userStakedTokens.length;
  const remainingSlots = maxStakesPerUser - currentStaked;
  const totalUnstakedPages = Math.max(1, Math.ceil(unstakedNFTs.length / ITEMS_PER_PAGE));
  const totalStakedPages = Math.max(1, Math.ceil(stakedNFTs.length / ITEMS_PER_PAGE));
  const paginatedUnstakedNFTs = useMemo(() => {
    const start = (unstakedPage - 1) * ITEMS_PER_PAGE;
    return unstakedNFTs.slice(start, start + ITEMS_PER_PAGE);
  }, [unstakedNFTs, unstakedPage]);
  const paginatedStakedNFTs = useMemo(() => {
    const start = (stakedPage - 1) * ITEMS_PER_PAGE;
    return stakedNFTs.slice(start, start + ITEMS_PER_PAGE);
  }, [stakedNFTs, stakedPage]);

  useEffect(() => {
    setUnstakedPage(prev => (prev > totalUnstakedPages ? totalUnstakedPages : prev));
  }, [totalUnstakedPages]);

  useEffect(() => {
    setStakedPage(prev => (prev > totalStakedPages ? totalStakedPages : prev));
  }, [totalStakedPages]);

  const toggleNFT = useCallback((tokenId: string) => {
    setSelectedNFTs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        if (isSociosWallet) {
          newSet.clear();
          newSet.add(tokenId);
        } else {
          if (newSet.size >= remainingSlots) {
            toast.error(`Você só pode queimar mais ${remainingSlots} card${remainingSlots !== 1 ? 's' : ''}. Limite máximo: ${maxStakesPerUser} cards por wallet.`);
            return prev;
          }
          newSet.add(tokenId);
        }
      }
      return newSet;
    });
  }, [remainingSlots, maxStakesPerUser, isSociosWallet]);

  const handleOpenTransferModal = (nft: typeof nftToTransfer) => {
    setNftToTransfer(nft);
    setTransferModalOpen(true);
  };

  const handleTransferSuccess = async () => {
    console.log('Atualizando lista de Cards...');
    await refreshAll();
    await refreshBurnStats();
  };


  // Refresh burn stats when NFTs change
  useEffect(() => {
    if (address) {
      refreshBurnStats();
    }
  }, [address, refreshBurnStats]);

  const handleApprove = async () => {
    if (!address) {
      toast.error('Carteira não conectada');
      return;
    }

    setIsProcessing(true);

    try {
      await burnApprove();
      toast.success('Cards aprovados para queima!');
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      let errorMessage = error.message || 'Erro ao aprovar Cards';
      
      if (errorMessage.includes('DENIED_TRANSACTION') || errorMessage.includes('denied') || errorMessage.includes('rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      } else if (errorMessage.toLowerCase().includes('user rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBurn = () => {
    // Se for Socios Wallet, mostra o toast e depois o modal informativo
    if (isSociosWallet) {
      setShowStakeConfirm(false);
      toast.info('Aprove a transação na sua carteira da socios.com');
      setShowSociosWalletInfo(true);
    } else {
      // Se for Privy, executa direto
      handleStake();
    }
  };

  const handleStake = async () => {
    if (selectedNFTs.size === 0) return;
    if (!address) {
      toast.error('Carteira não conectada');
      return;
    }

    setIsProcessing(true);
    setShowStakeConfirm(false);
    setShowSociosWalletInfo(false);

    try {
      const tokenIds = Array.from(selectedNFTs)
        .map(id => Number(id))
        .filter(id => !Number.isNaN(id));

      if (tokenIds.length === 0) {
        setIsProcessing(false);
        return;
      }

      if (tokenIds.length > 100) {
        toast.error('Você só pode queimar no máximo 100 Cards por vez.');
        setIsProcessing(false);
        return;
      }

      // 1. Verificar whitelist via RPC (PRIMEIRA COISA!)
      console.log('[BURN PAGE] Checking whitelist before burn...');
      const isWhitelisted = await burnCheckWhitelist();
      console.log(`[BURN PAGE] Whitelist check result: ${isWhitelisted}`);

      if (!isWhitelisted) {
        console.log('[BURN PAGE] User not whitelisted, opening whitelist modal');
        setIsProcessing(false);
        setWhitelistStep('pending');
        setWhitelistModalOpen(true);
        return;
      }

      // 2. Verificar approve
      if (!isApproved) {
        toast.info('Aprovando Cards...');
        await burnApprove();
        toast.success('Aprovação concluída!');
      }

      toast.info(`Queimando ${tokenIds.length} Card${tokenIds.length > 1 ? 's' : ''}...`);
      await burnStakeBatch(tokenIds);

      try {
        const syncResponse = await fetch('/api/burn/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            privyUserId: unifiedUser?.id ?? null,
            tokenIds,
          }),
        });

        if (!syncResponse.ok) {
          const syncError = await syncResponse.json().catch(() => ({}));
          console.warn('Falha ao sincronizar status dos cards queimados:', syncError);
          console.log('Não foi possível atualizar o status dos cards no banco. Atualize a página para tentar novamente.');
        }
      } catch (syncErr) {
        console.error('Erro ao atualizar status dos cards queimados:', syncErr);
        console.log('Erro ao atualizar status dos cards no banco. Tente novamente.');
      }

      setSelectedNFTs(new Set());
      toast.success(`Card${tokenIds.length > 1 ? 's' : ''} ${tokenIds.join(', ')} queimado${tokenIds.length > 1 ? 's' : ''} com sucesso!`);

      console.log('Atualizando lista de Cards...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      await refreshAll();
      await refreshBurnStats();
    } catch (error: any) {
      console.error('Erro ao queimar:', error);
      let errorMessage = error?.message || 'Erro ao queimar os Cards';
      
      if (errorMessage.includes('DENIED_TRANSACTION') || errorMessage.includes('denied') || errorMessage.includes('rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      } else if (errorMessage.toLowerCase().includes('user rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleWhitelistRequest = async () => {
    setWhitelistStep('processing');

    try {
      await burnAddToWhitelist();
      setWhitelistStep('success');
      toast.success('Whitelist aprovada!');
      await refreshBurnStats();
    } catch (error: any) {
      console.error('Erro ao adicionar à whitelist:', error);
      setWhitelistStep('pending');
      let errorMessage = error.message || 'Erro ao adicionar à whitelist';
      
      if (errorMessage.includes('DENIED_TRANSACTION') || errorMessage.includes('denied') || errorMessage.includes('rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      } else if (errorMessage.toLowerCase().includes('user rejected')) {
        errorMessage = 'Transação rejeitada pelo usuário';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleWhitelistComplete = () => {
    setWhitelistModalOpen(false);
    setWhitelistStep('pending');
    // Retomar o stake
    handleStake();
  };

  const handleWhitelistRetry = () => {
    // Reexecutar o fluxo completo
    if (selectedNFTs.size > 0) {
      handleStake();
    }
  };

  const handleClaim = async () => {
    if (!address) {
      toast.error('Carteira não conectada');
      return;
    }

    if (!rewardBreakdown || rewardBreakdown.netReward === BigInt(0)) {
      toast.error('Nenhuma recompensa disponível para reivindicar');
      return;
    }

    setIsProcessing(true);

    try {
      // Verificar whitelist via RPC antes de claim
      console.log('[BURN PAGE] Checking whitelist before claim...');
      const isWhitelisted = await burnCheckWhitelist();
      console.log(`[BURN PAGE] Whitelist check result for claim: ${isWhitelisted}`);

      if (!isWhitelisted) {
        console.log('[BURN PAGE] User not whitelisted, opening error modal');
        setIsProcessing(false);
        setWhitelistErrorModalOpen(true);
        return;
      }

      toast.info('Reivindicando recompensas...');
      await burnClaim();
      await refreshAll();
      await refreshBurnStats();

      const netRewardCHZ = parseFloat(formatEther(rewardBreakdown.netReward));
      toast.success(`${netRewardCHZ.toFixed(4)} CHZ reivindicados com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao reivindicar:', error);
      toast.error(error.message || 'Erro ao reivindicar recompensas');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!ready || isLoadingNFTs || unifiedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-lg">Carregando...</div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center px-4">
          <Card className="max-w-md w-full p-8 text-center space-y-4 border-2 border-gray-300 shadow-none">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Flame className="w-8 h-8 text-gray-900" />
            </div>
            <h2 className="text-2xl font-bold">Conecte sua carteira</h2>
            <p className="text-gray-600">Conecte-se para queimar seus Cards</p>
            <Button onClick={() => setIsConnectModalOpen(true)} size="lg" className="w-full border-2 border-gray-900 bg-gray-900 hover:bg-gray-800 text-white">
              Conectar Carteira
            </Button>
          </Card>
        </main>
        <ConnectionChoiceModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onPrivyLogin={async () => {
            await login();
            setIsConnectModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow space-y-8">
        {/* Hero / Header Section */}
        {/* Hero / Header Section - Compact Version */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900 text-white shadow-lg">
          {/* Animated Fire Background - Adjusted for compact size */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-0" />
          <div className="absolute inset-0 overflow-hidden z-0 opacity-60">
            <div className="absolute bottom-[-20%] left-[10%] w-[40%] h-[80%] bg-orange-500/50 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[80%] bg-red-600/50 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
          </div>

          <div className="relative p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 z-10">
            <div className="text-center md:text-left space-y-2 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Queimar Cards
              </h1>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                Transforme seus cards em recompensas exclusivas. Queime seus ativos digitais e receba CHZ.
              </p>
            </div>

            <div className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setHowItWorksOpen(true)}
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white gap-2 backdrop-blur-sm text-sm h-9"
              >
                <Info className="w-4 h-4" />
                <span>Como funciona?</span>
              </Button>
            </div>
          </div>
        </div>

        <HowItWorksModal
          isOpen={howItWorksOpen}
          onClose={() => setHowItWorksOpen(false)}
        />

        {/* Eligibility Banner */}
        <div className="relative">
          <EligibilityBanner
            isLoading={isCheckingEligibility}
            isEligible={isBurnEligible}
            error={eligibilityError}
            eligibilityResult={eligibilityResult}
            onRefresh={refreshEligibility}
            isApproved={isApproved}
            isWhitelisted={isBurnWhitelisted}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* My Cards (Combined) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white group hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-24 h-24 text-gray-400" />
              </div>
              <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-3 mb-4 h-8">
                  <span className="text-sm font-medium text-gray-600">Meus Cards</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Queimados</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{stakedNFTs.length}</span>
                      <span className="text-xs text-gray-500">cards</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Disponíveis</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{unstakedNFTs.length}</span>
                      <span className="text-xs text-gray-500">cards</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-gray-700 to-gray-900 mt-auto" />
            </Card>
          </motion.div>

          {/* Required Fan Tokens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white group hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Lock className={`w-24 h-24 ${isBurnEligible ? 'text-green-200' : 'text-gray-200'}`} />
              </div>
              <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-3 mb-4 h-8">
                  <span className="text-sm font-medium text-gray-600">Fan Tokens Necessários</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-bold ${isBurnEligible ? 'text-green-600' : 'text-gray-900'}`}>
                        {eligibilityResult?.minimumRequired || '50'}
                      </span>
                      <span className="text-sm text-gray-500">tokens</span>
                    </div>
                    {isBurnEligible && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo para participar
                  </p>
                  <div className="h-5 mt-1" />
                </div>
              </div>
              <div className={`h-1 w-full mt-auto ${isBurnEligible ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`} />
            </Card>
          </motion.div>

          {/* Value per Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white group hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Coins className="w-24 h-24 text-gray-200" />
              </div>
              <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-3 mb-4 h-8">
                  <span className="text-sm font-medium text-gray-600">Valor por Card</span>
                </div>
                <div>
                  {burnStats.isLoading ? (
                    <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight">
                        ≈ {formattedGrossRewardPerNFT} <span className="text-lg font-normal text-gray-500">CHZ</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 h-5">Valor atual do contrato</p>
                    </>
                  )}
                </div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-orange-400 mt-auto" />
            </Card>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-lg bg-white group hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Gift className="w-24 h-24 text-gray-200" />
              </div>
              <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4 h-8">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Recompensas</span>
                  </div>
                </div>

                <div className="mb-4">
                  {burnStats.isLoading ? (
                    <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight">
                        {formattedNetRewards} <span className="text-lg font-normal text-gray-500">CHZ</span>
                      </div>
                      {rewardBreakdown && rewardBreakdown.feeAmount > BigInt(0) && (
                        <p className="text-xs text-gray-500 mt-1 h-5">
                          Fee: {parseFloat(formatEther(rewardBreakdown.feeAmount)).toFixed(2)} CHZ
                        </p>
                      )}
                      {(!rewardBreakdown || rewardBreakdown.feeAmount === BigInt(0)) && (
                        <div className="h-5 mt-1" />
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleClaim}
                  disabled={isProcessing || burnStats.isLoading || !rewardBreakdown || rewardBreakdown.netReward === BigInt(0)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white shadow-md transition-all hover:shadow-lg"
                >
                  {isProcessing ? 'Processando...' : 'Resgatar Recompensas'}
                </Button>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-green-500 to-emerald-600 mt-auto" />
            </Card>
          </motion.div>
        </div>

        {/* Alerts Section */}
        {/* Alerts Section - Compact */}
        {(remainingSlots > 0 || remainingSlots <= 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {remainingSlots > 0 ? (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-full shrink-0">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 font-medium">
                      Limite por wallet: <span className="font-bold">{remainingSlots} cards</span>
                      {currentStaked > 0 && <span className="font-normal opacity-80 ml-1">({currentStaked}/{maxStakesPerUser} usados)</span>}
                    </p>
                    <p className="text-xs text-blue-700 mt-1 opacity-80">
                      * O limite pode ser alterado durante a campanha.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-1.5 bg-amber-100 rounded-full shrink-0">
                    <Info className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-amber-900">
                      Atualize a página após a queima para ver resultados.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-1 md:col-span-2 bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3">
                <div className="p-1.5 bg-orange-100 rounded-full shrink-0">
                  <Info className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-orange-900 font-medium">
                    Limite máximo de {maxStakesPerUser} cards atingido.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Your Cards Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Seus Cards</h2>
            {BURN_PHASE_DISABLED ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
                <p className="text-amber-800 font-medium text-sm">
                  Terminou a primeira fase!
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Continue resgatando seus cards para aproveitar novas oportunidades.
                </p>
              </div>
            ) : selectedNFTs.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNFTs(new Set())}
                  size="sm"
                >
                  Limpar
                </Button>
                {!isApproved ? (
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing || !isBurnEligible}
                    size="sm"
                    className="border-2 border-gray-900 bg-white hover:bg-gray-100 text-gray-900"
                    title={!isBurnEligible ? 'Você precisa ter saldo mínimo de fan tokens' : undefined}
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Aprovar ({selectedNFTs.size})
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowStakeConfirm(true)}
                    disabled={isProcessing || !isBurnEligible}
                    size="sm"
                    className="border-2 border-gray-900 bg-gray-900 hover:bg-gray-800 text-white"
                    title={!isBurnEligible ? 'Você precisa ter saldo mínimo de fan tokens' : undefined}
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Queimar ({selectedNFTs.size})
                  </Button>
                )}
              </div>
            )}
          </div>

          {unstakedNFTs.length === 0 ? (
            <Card className="p-12 text-center border-2 border-gray-300 shadow-none">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Flame className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum Card disponível</h3>
              <p className="text-gray-600">Todos os seus Cards foram queimados</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                {paginatedUnstakedNFTs.map((nft) => {
                  const isSelected = selectedNFTs.has(nft.tokenId);

                  return (
                    <div
                      key={nft.tokenId}
                      className={`
                        relative group rounded-lg overflow-hidden transition-all duration-200 border-2
                        ${isSelected
                          ? 'border-gray-900 shadow-xl'
                          : 'border-gray-300 hover:shadow-lg'
                        }
                      `}
                    >
                      <div
                        onClick={() => toggleNFT(nft.tokenId)}
                        className="w-full cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleNFT(nft.tokenId);
                          }
                        }}
                      >
                        {/* Card Image */}
                        <div className="aspect-[2/3] relative bg-gray-100">
                          <img
                            src={nft.image || '/placeholder-card.svg'}
                            alt={nft.name || `NFT #${nft.tokenId}`}
                            className={`w-full h-full object-cover transition-all duration-200 ${isSelected ? 'brightness-75' : 'group-hover:brightness-110'
                              }`}
                          />

                          {/* Selection Overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
                                <Flame className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Transfer Button - Temporariamente escondido */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTransferModal(nft);
                            }}
                            className="hidden absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 rounded-full p-1.5 shadow-lg z-10"
                            title="Transferir Card"
                          >
                            <Send className="w-3 h-3 text-gray-900" />
                          </button>

                          {/* Rarity Badge */}
                          {nft.attributes?.find(attr => attr.trait_type === 'rarity') && (
                            <div className="absolute top-1.5 right-1.5">
                              <BadgeRarity rarity={nft.attributes.find(attr => attr.trait_type === 'rarity')?.value as string} />
                            </div>
                          )}

                          {/* Expand Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenImage(nft.image || '/placeholder-card.svg');
                            }}
                            className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white rounded-full p-1.5 shadow-sm z-20"
                            title="Expandir"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-gray-900" />
                          </button>
                        </div>

                        {/* Card Info */}
                        <div className={`p-1.5 sm:p-2 bg-white transition-colors ${isSelected ? 'bg-gray-100' : ''
                          }`}>
                          <p className="font-semibold text-[10px] sm:text-xs text-gray-900 truncate">
                            {nft.name || `NFT #${nft.tokenId}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                currentPage={unstakedPage}
                totalPages={totalUnstakedPages}
                totalItems={unstakedNFTs.length}
                onPrevious={() => setUnstakedPage(prev => Math.max(1, prev - 1))}
                onNext={() => setUnstakedPage(prev => Math.min(totalUnstakedPages, prev + 1))}
              />
            </>
          )}
        </div>

        {/* Staked Cards Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Cards Queimados</h2>
            <Button
              onClick={() => {
                refreshAll();
                refreshBurnStats();
                console.log('Atualizando Cards queimados...');
              }}
              variant="outline"
              size="sm"
              disabled={isLoadingNFTs}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingNFTs ? 'animate-spin' : ''}`} />
              {isLoadingNFTs ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>

          {isLoadingNFTs ? (
            <Card className="p-12 text-center border-2 border-gray-300 shadow-none">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
                <Flame className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Carregando Cards...</h3>
              <p className="text-gray-600">Buscando seus Cards queimados</p>
            </Card>
          ) : stakedNFTs.length === 0 ? (
            <Card className="p-12 text-center border-2 border-gray-300 shadow-none">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Flame className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum Card queimado</h3>
              <p className="text-gray-600">Queime seus Cards para começar a ganhar recompensas</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
                {paginatedStakedNFTs.map((nft) => {
                  return (
                    <div
                      key={nft.tokenId}
                      className="relative group rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg border-2 border-gray-300"
                    >
                      {/* Card Image */}
                      <div className="aspect-[2/3] relative bg-gray-100">
                        <img
                          src={nft.image || '/placeholder-card.svg'}
                          alt={nft.name || `NFT #${nft.tokenId}`}
                          className="w-full h-full object-cover transition-all duration-200 grayscale"
                        />

                        {/* Burned Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Flame className="w-5 h-5 text-gray-900" />
                          </div>
                        </div>

                        {/* Burned Indicator */}
                        <div className="absolute top-1.5 left-1.5 z-20">
                          <div className="px-1.5 py-0.5 bg-gray-900 rounded-full flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5 text-white" />
                            <span className="text-[9px] text-white font-semibold">Queimado</span>
                          </div>
                        </div>

                        {/* Rarity Badge */}
                        {nft.attributes?.find(attr => attr.trait_type === 'rarity') && (
                          <div className="absolute top-1.5 right-1.5 z-20">
                            <BadgeRarity rarity={nft.attributes.find(attr => attr.trait_type === 'rarity')?.value as string} />
                          </div>
                        )}

                        {/* Expand Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenImage(nft.image || '/placeholder-card.svg');
                          }}
                          className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white rounded-full p-1.5 shadow-sm z-20"
                          title="Expandir"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-gray-900" />
                        </button>
                      </div>

                      {/* Card Info */}
                      <div className="p-1.5 sm:p-2 bg-white">
                        <p className="font-semibold text-[10px] sm:text-xs text-gray-900 truncate">
                          {nft.name || `NFT #${nft.tokenId}`}
                        </p>
                        {nft.claimableRewards && (
                          <p className="text-[9px] sm:text-xs text-amber-600 font-semibold">
                            +{(Number(nft.claimableRewards) / 1e18).toFixed(2)} CHZ
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                currentPage={stakedPage}
                totalPages={totalStakedPages}
                totalItems={stakedNFTs.length}
                onPrevious={() => setStakedPage(prev => Math.max(1, prev - 1))}
                onNext={() => setStakedPage(prev => Math.min(totalStakedPages, prev + 1))}
              />
            </>
          )}
        </div>
      </main>

      {/* Burn Confirmation Dialog */}
      <AlertDialog open={showStakeConfirm} onOpenChange={setShowStakeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-gray-900" />
              Confirmar Queima
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a queimar <strong>{selectedNFTs.size}</strong> Card{selectedNFTs.size > 1 ? 's' : ''}.
            </AlertDialogDescription>
            <div className="p-3 bg-gray-100 border-2 border-gray-300 rounded-lg mt-3">
              <p className="text-sm text-gray-700">
                Seus Cards serão queimados permanentemente e você começará a receber recompensas em CHZ automaticamente.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBurn}
              disabled={isProcessing}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isProcessing ? 'Processando...' : 'Confirmar Queima'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Socios Wallet Info Dialog */}
      <AlertDialog open={showSociosWalletInfo} onOpenChange={setShowSociosWalletInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Aprovação na Socios Wallet
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base text-gray-700">
                Abra sua <strong>Socios Wallet</strong> e aprove as transações solicitadas.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Importante:</strong> Em alguns casos pode ser necessário repetir este processo.
                  Se houver erro, atualize a página e tente novamente. Isso varia por versão e dispositivo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleStake}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              OK, Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer NFT Modal */}
      <TransferNFTModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setNftToTransfer(null);
        }}
        nft={nftToTransfer}
        contractAddress={NFT_CONTRACT_ADDRESS}
        onSuccess={handleTransferSuccess}
      />

      {/* Whitelist Steps Modal */}
      <WhitelistStepsModal
        open={whitelistModalOpen}
        onOpenChange={setWhitelistModalOpen}
        step={whitelistStep}
        isApproved={isApproved}
        onRequestWhitelist={handleWhitelistRequest}
        onContinue={handleWhitelistComplete}
      />

      {/* Whitelist Error Modal */}
      <WhitelistErrorModal
        open={whitelistErrorModalOpen}
        onOpenChange={setWhitelistErrorModalOpen}
        onRetry={handleWhitelistRetry}
      />

      {/* Fullscreen Image Modal */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none sm:max-w-fit">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullscreenImage || ''}
              alt="Fullscreen Card"
              className="max-h-[90vh] max-w-[90vw] w-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
