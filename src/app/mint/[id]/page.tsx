'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from "@/components/header";
import { StackedCardsInteraction } from "@/components/ui/stacked-cards-interaction";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { StakeRequirementBadge } from "@/components/ui/stake-requirement-badge";
import { verifyStakeRequirement } from "@/utils/stake-verification";
import { useEnsureWalletConsistency } from '@/hooks/useEnsureWalletConsistency';
import { Button } from "@/components/ui/button";
import { List, Grid3X3 } from 'lucide-react';

import { NFTRarity, NFT, StakeVerificationResult } from '@/lib/types';
import { StakingToken } from '@/lib/tokens';
import { fetchNFTById, fetchNFTs, getAvailableNFTs } from '@/lib/db-utils';
import { usePrivy } from '@privy-io/react-auth';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import {
  trackNftClaimInitiated,
  trackNftClaimSuccessful,
  trackNftClaimFailed,
  trackNftClaimBlockedByStake,
} from '@/lib/gtag';

// Importar os novos modais
import { MintSuccessModal } from '@/components/modals/MintSuccessModal';
import { LottieAnimationModal } from '@/components/modals/LottieAnimationModal';
import { StakeRequiredModal } from '@/components/modals/StakeRequiredModal';
import { ConnectionChoiceModal } from '@/components/modals/ConnectionChoiceModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { getRarityDetails } from '@/lib/rarity-helpers';
import { NFTModalSkeleton } from '@/components/ui/card-skeleton';

// Mapeamento de raridade para cor
const rarityColorMap = {
  [NFTRarity.COMMON]: 'bg-gray-400',
  [NFTRarity.EPIC]: 'bg-purple-400',
  [NFTRarity.LEGENDARY]: 'bg-yellow-400',
};

export default function NFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, authenticated, login } = usePrivy();
  const { user: unifiedUser, authenticated: unifiedAuthenticated } = useUnifiedAuth();
  const [activeNFT, setActiveNFT] = useState<NFT | null>(null);
  const [availableNFTs, setAvailableNFTs] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stakeVerification, setStakeVerification] = useState<StakeVerificationResult | null>(null);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'failed' | 'stake_required'>('idle');
  const [claimErrorMessage, setClaimErrorMessage] = useState<string | null>(null);
  
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [stakeModalData, setStakeModalData] = useState<{
    nftTitle: string;
    requiredToken: StakingToken | null;
    requiredAmount: number;
    currentAmount: string;
    tokenSymbol: string;
  } | null>(null);
  const [showLottieModal, setShowLottieModal] = useState(false);
  const [showSuccessMintModal, setShowSuccessMintModal] = useState(false);
  const [claimedAssetData, setClaimedAssetData] = useState<{
    title: string;
    imageUrl: string;
    rarity: string;
  } | null>(null);
  const { ensureWalletIsConsistent } = useEnsureWalletConsistency();
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [waterDropAnimation, setWaterDropAnimation] = useState<any>(null);
  
  // Extração mais segura do ID dos parâmetros da rota
  const nftIdFromParams = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;

  // Carregar animação Lottie
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/water-drop.json');
        const animationData = await response.json();
        setWaterDropAnimation(animationData);
      } catch (error) {
        console.error('Erro ao carregar animação:', error);
      }
    };
    loadAnimation();
  }, []);

  // Adicionar novos estados para o Dialog de erro
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title: string;
    message: string;
    type: 'limit_reached' | 'cooldown' | 'stake_required' | 'generic';
    actionButton?: {
      text: string;
      action: () => void;
    };
  } | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!nftIdFromParams) {
      setIsLoading(false);
      return;
    }

    const loadNFT = async () => {
      setIsLoading(true);
      try {
        const id = Number(nftIdFromParams);
        if (isNaN(id)) {
          console.error('ID de NFT inválido:', nftIdFromParams);
          router.push('/mint');
          return;
        }
        
        console.log('Tentando carregar NFT com ID:', id);
        
        // Carregar o NFT específico
        const nft = await fetchNFTById(id);
        
        if (nft) {
          console.log('NFT carregado com sucesso:', nft.title);
          setActiveNFT(nft);
          
          // Carregar todos os NFTs disponíveis
          const allNFTs = await fetchNFTs();
          setAvailableNFTs(allNFTs);
        } else {
          console.warn('NFT não encontrado com ID:', id);
          // Tentar carregar todos os NFTs e redirecionar para o primeiro disponível
          const allNFTs = await fetchNFTs();
          if (allNFTs.length > 0) {
            console.log('Redirecionando para o primeiro NFT disponível:', allNFTs[0].id);
            router.push(`/mint/${allNFTs[0].id}`);
          } else {
            console.log('Nenhum NFT disponível, redirecionando para página principal');
            router.push('/mint');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar NFT:', error);
        // Em caso de erro, tentar carregar a página principal de mint
        router.push('/mint');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNFT();
  }, [nftIdFromParams, router]);
  
  if (isLoading || !activeNFT) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <div className="w-full max-w-4xl">
            <NFTModalSkeleton />
          </div>
        </main>
      </div>
    );
  }
  
  const claimPercentage = Math.round((activeNFT.claimedSupply / activeNFT.totalSupply) * 100);
  const remainingSupply = activeNFT.totalSupply - activeNFT.claimedSupply;
  const daysUntilExpiration = activeNFT.expirationDate 
    ? Math.ceil((new Date(activeNFT.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
    : null;
    
  // Formatar data
  const formatDate = (date?: Date | string | null) => {
    if (!date) {
      return 'N/D'; // Retorna 'Não disponível' ou similar se a data for nula/undefined
    }
    try {
      // Tentar criar a data. Se for inválida, new Date() retorna um objeto Date inválido.
      const d = new Date(date);
      // Verificar se a data é válida. getTime() para datas inválidas retorna NaN.
      if (isNaN(d.getTime())) {
        console.warn("Tentativa de formatar data inválida:", date);
        return 'Data Inválida';
      }
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short',
      }).format(d);
    } catch (e) {
      console.error("Erro ao formatar data:", date, e);
      return 'Erro na Data';
    }
  };
  
  // Processar NFTs disponíveis com informações extras
  const processedAvailableNFTs = getAvailableNFTs(availableNFTs);
  
  // Montar os cards para StackedCardsInteraction
  const cardsForInteraction = [];
  if (activeNFT) {
    cardsForInteraction.push({
      image: activeNFT.mainImageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      title: activeNFT.title,
      description: activeNFT.description || '',
    });
    if (activeNFT.secondaryImageUrl1) {
      cardsForInteraction.push({
        image: activeNFT.secondaryImageUrl1,
        title: activeNFT.title, // Mantém o título para consistência ou pode ser adaptado
        description: 'Imagem Secundária 1', // Descrição adaptada
      });
    }
    if (activeNFT.secondaryImageUrl2) {
      cardsForInteraction.push({
        image: activeNFT.secondaryImageUrl2,
        title: activeNFT.title, // Mantém o título para consistência ou pode ser adaptado
        description: 'Imagem Secundária 2', // Descrição adaptada
      });
    }
  }
  
  const handleClaim = async () => {
    if (!unifiedAuthenticated) {
      setShowConnectionModal(true);
      return;
    }

    if (!activeNFT || !unifiedUser?.wallet?.address) return;

    // Verificar consistência da carteira
    const walletsAreConsistent = await ensureWalletIsConsistent();
    if (!walletsAreConsistent) {
      return; // Interrompe se as carteiras não forem consistentes
    }

    setIsClaimLoading(true);
    setClaimStatus('idle');
    setClaimErrorMessage(null);

    try {
      let proceedToMint = false;

      if (activeNFT.stakeRequired && activeNFT.stakeTokenAddress && activeNFT.stakeTokenAmount !== undefined) {
        const verificationResult = await verifyStakeRequirement(
          unifiedUser?.wallet?.address || '',
          {
            required: activeNFT.stakeRequired, // Booleano já está correto
            tokenAddress: activeNFT.stakeTokenAddress,
            tokenAmount: parseFloat(activeNFT.stakeTokenAmount || '0'),
            tokenSymbol: activeNFT.stakeTokenSymbol || ''
          }
        );

        setStakeVerification(verificationResult); // Mantém para debug ou UI futura

        if (!verificationResult.success) {
          // Buscar detalhes do token para o modal
          try {
            const response = await fetch('/api/staking-tokens');
            if (!response.ok) throw new Error('Falha ao buscar tokens de stake');
            const allStakingTokens: StakingToken[] = await response.json();
            const requiredTokenDetails = allStakingTokens.find(
              token => token.address.toLowerCase() === activeNFT.stakeTokenAddress!.toLowerCase()
            );

            setStakeModalData({
              nftTitle: activeNFT.title,
              requiredToken: requiredTokenDetails || null,
              requiredAmount: parseFloat(activeNFT.stakeTokenAmount || '0'),
              currentAmount: verificationResult.currentAmount || '0',
              tokenSymbol: verificationResult.tokenSymbol || activeNFT.stakeTokenSymbol || ''
            });
            setShowStakeModal(true);
            setClaimStatus('stake_required'); 
            try {
              trackNftClaimBlockedByStake({
                nftId: activeNFT.id,
                nftTitle: activeNFT.title,
                requiredTokenSymbol: verificationResult.tokenSymbol || activeNFT.stakeTokenSymbol || '',
                requiredTokenAddress: activeNFT.stakeTokenAddress || undefined,
                requiredAmount: parseFloat(activeNFT.stakeTokenAmount || '0'),
                wallet: unifiedUser?.wallet?.address,
              });
            } catch {}
          } catch (fetchTokenError) {
            console.error("Erro ao buscar detalhes do token para modal de stake:", fetchTokenError);
            setClaimStatus('failed'); // Falha geral se não conseguir dados pro modal
          }
          setIsClaimLoading(false);
          return; // Interrompe aqui, pois o modal de stake será exibido
        } else {
          proceedToMint = true; // Requisitos de stake atendidos
        }
      } else {
        // Não há requisitos de stake ou estão incompletos no NFT, considera como "sem requisitos"
        proceedToMint = true;
      }

      if (proceedToMint) {
        // Lógica de Mint (agora chama a API)
        console.log("Procedendo para o mint do NFT e reivindicação do asset:", activeNFT.title);
        setClaimErrorMessage(null);

        // Adicionar logs aqui
        console.log('[DEBUG] Tentando resgatar NFT ID:', activeNFT.id, 'para User ID:', unifiedUser?.id);
        console.log('[DEBUG] Detalhes do activeNFT sendo enviado:', JSON.stringify(activeNFT, null, 2));

        try {
          try {
            trackNftClaimInitiated({
              nftId: activeNFT.id,
              nftTitle: activeNFT.title,
              userId: unifiedUser?.id,
              wallet: unifiedUser?.wallet?.address,
            });
          } catch {}
          const response = await fetch('/api/mint/claim-asset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nftId: activeNFT.id,
              privyUserId: unifiedUser?.id, // User ID (UUID)
              userWalletAddress: unifiedUser?.wallet?.address, // Endereço da carteira principal
              userEmail: unifiedUser?.email?.address, // Email do usuário, se disponível
              userName: unifiedUser?.email?.address?.split('@')[0] || // Usa parte do email antes do @
                        unifiedUser?.wallet?.address?.substring(0,8) || // Fallback para parte do endereço da carteira
                        'User'+unifiedUser?.wallet?.address?.substring(0,4) || // Outro fallback
                        'AnonUser', // Fallback final
            }),
          });

          const result = await response.json();

          if (response.ok) {
            console.log("Asset reivindicado com sucesso:", result);
            setClaimStatus('success');
            setActiveNFT(prev => prev ? { ...prev, claimedSupply: prev.claimedSupply + 1 } : null);
            
            // Usar os dados do asset específico que foi claimado
            if (result.claimedAsset) {
              setClaimedAssetData({
                title: result.claimedAsset.title,
                imageUrl: result.claimedAsset.imageUrl || activeNFT.mainImageUrl || '',
                rarity: result.claimedAsset.rarity?.toLowerCase() || 'common',
              });
            } else {
              // Fallback para os dados do NFT genérico (caso não tenha o asset)
              setClaimedAssetData({
                title: activeNFT.title,
                imageUrl: activeNFT.mainImageUrl || '',
                rarity: activeNFT.rarity?.toLowerCase() || 'common',
              });
            }
            setShowLottieModal(true);
            try {
              const rarity = (result.claimedAsset?.rarity || activeNFT.rarity || '').toString().toLowerCase();
              trackNftClaimSuccessful({
                nftId: activeNFT.id,
                nftTitle: result.claimedAsset?.title || activeNFT.title,
                rarity,
                userId: unifiedUser?.id,
                wallet: unifiedUser?.wallet?.address,
              });
            } catch {}
          } else {
            setClaimErrorMessage(null); // Limpa a mensagem de erro por padrão
            setClaimStatus('idle'); // Define o status para idle por padrão

            if (result.error && typeof result.error === 'string') {
              if (result.cooldownActive) {
                const endsAt = result.cooldownEndsAt ? new Date(result.cooldownEndsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' }) : '' ;
                setErrorDialogData({
                  title: 'Aguarde para resgatar novamente',
                  message: `Você já resgatou este item recentemente. Próximo resgate disponível às ${endsAt}.`,
                  type: 'cooldown'
                });
                setShowErrorDialog(true);
                try {
                  trackNftClaimFailed({
                    nftId: activeNFT.id,
                    nftTitle: activeNFT.title,
                    reason: 'cooldown',
                    userId: unifiedUser?.id,
                    wallet: unifiedUser?.wallet?.address,
                  });
                } catch {}
              } else if (result.error.includes('Limite de claims por usuário atingido')) {
                setErrorDialogData({
                  title: 'Limite atingido',
                  message: 'Você já resgatou o máximo permitido deste item. Veja seus NFTs na sua coleção.',
                  type: 'limit_reached',
                  actionButton: {
                    text: 'Ver Meus Cards',
                    action: () => router.push('/meus-cards')
                  }
                });
                setShowErrorDialog(true);
                try {
                  trackNftClaimFailed({
                    nftId: activeNFT.id,
                    nftTitle: activeNFT.title,
                    reason: 'limit_reached',
                    userId: unifiedUser?.id,
                    wallet: unifiedUser?.wallet?.address,
                  });
                } catch {}
              } else if (result.error.includes('Nenhum asset disponível para este NFT ou NFT não encontrado')) {
                setErrorDialogData({
                  title: 'Item esgotado',
                  message: 'Este item não está mais disponível.',
                  type: 'generic'
                });
                setShowErrorDialog(true);
                try {
                  trackNftClaimFailed({
                    nftId: activeNFT.id,
                    nftTitle: activeNFT.title,
                    reason: 'sold_out',
                    userId: unifiedUser?.id,
                    wallet: unifiedUser?.wallet?.address,
                  });
                } catch {}
              } else {
                setErrorDialogData({
                  title: 'Não foi possível resgatar',
                  message: 'Verifique se você atende aos requisitos ou tente novamente.',
                  type: 'generic'
                });
                setShowErrorDialog(true);
                try {
                  trackNftClaimFailed({
                    nftId: activeNFT.id,
                    nftTitle: activeNFT.title,
                    reason: 'generic_error',
                    userId: unifiedUser?.id,
                    wallet: unifiedUser?.wallet?.address,
                  });
                } catch {}
              }
            } else {
              setErrorDialogData({
                title: 'Erro no resgate',
                message: 'Ocorreu um erro inesperado. Tente novamente.',
                type: 'generic'
              });
              setShowErrorDialog(true);
              try {
                trackNftClaimFailed({
                  nftId: activeNFT.id,
                  nftTitle: activeNFT.title,
                  reason: 'unexpected_error',
                  userId: unifiedUser?.id,
                  wallet: unifiedUser?.wallet?.address,
                });
              } catch {}
            }
          }
        } catch (apiError) {
          console.error('Erro ao chamar API de reivindicação de asset:', apiError);
          setClaimStatus('failed');
          try {
            trackNftClaimFailed({
              nftId: activeNFT.id,
              nftTitle: activeNFT.title,
              reason: 'api_error',
              userId: unifiedUser?.id,
              wallet: unifiedUser?.wallet?.address,
            });
          } catch {}
        }
      }
    } catch (error) {
      console.error('Erro ao resgatar NFT:', error);
      setClaimStatus('failed');
      try {
        if (activeNFT) {
          trackNftClaimFailed({
            nftId: activeNFT.id,
            nftTitle: activeNFT.title,
            reason: 'client_error',
            userId: unifiedUser?.id,
            wallet: unifiedUser?.wallet?.address,
          });
        }
      } catch {}
    } finally {
      setIsClaimLoading(false);
    }
  };

  const handleLottieComplete = () => {
    setShowLottieModal(false);
    setShowSuccessMintModal(true);
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      
      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <VisuallyHidden.Root>
              <AlertDialogTitle>
                {errorDialogData?.title || 'Erro'}
              </AlertDialogTitle>
            </VisuallyHidden.Root>
            <div className="text-lg font-semibold mb-2">
              {errorDialogData?.title}
            </div>
            <AlertDialogDescription className="text-sm text-gray-600">
              {errorDialogData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            {errorDialogData?.actionButton && (
              <AlertDialogAction 
                onClick={() => {
                  errorDialogData.actionButton?.action();
                  setShowErrorDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {errorDialogData.actionButton.text}
              </AlertDialogAction>
            )}
            <AlertDialogAction 
              onClick={() => setShowErrorDialog(false)}
              className={errorDialogData?.actionButton ? "bg-gray-100 text-gray-900 hover:bg-gray-200" : ""}
            >
              {errorDialogData?.actionButton ? 'Fechar' : 'Entendi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 w-full">
        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-28">
          {/* NFT Detail Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Card Image */}
            <div className="w-full flex justify-center lg:justify-start py-6 lg:py-0">
              <div className="aspect-square w-[70%] max-w-[280px] lg:max-w-lg lg:w-full">
                <StackedCardsInteraction
                  cards={cardsForInteraction}
                />
              </div>
            </div>
            
            {/* Right Column - NFT Info */}
            <div className="w-full space-y-2">
              {/* Category Badge */}
              <Link 
                href={`/cards${activeNFT.categoryName ? `?category=${encodeURIComponent(activeNFT.categoryName.toLowerCase())}` : ''}`}
                className="inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              >
                <span className="text-xs font-medium text-gray-600">
                  {activeNFT.categoryName?.toLowerCase() || activeNFT.category?.toLowerCase() || 'art'}
                </span>
              </Link>
              
              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-5">
                {activeNFT.title}
              </h1>
              
              {/* Stats Card - Only show if showStatistics is true */}
              {activeNFT.showStatistics === true && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="text-2xl font-bold">{activeNFT.totalSupply}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Resgatados</div>
                      <div className="text-2xl font-bold">{activeNFT.claimedSupply}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Disponíveis</div>
                      <div className="text-2xl font-bold">{remainingSupply}</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${claimPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>{claimPercentage}% resgatados</span>
                      <span>{remainingSupply} restantes</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Details Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <button 
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="w-full flex items-center justify-between font-semibold text-lg mb-4 hover:text-gray-700 transition-colors"
                >
                  <span>Detalhes</span>
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${isDetailsExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDetailsExpanded && (
                  <div className="space-y-4">
                    <div className="text-sm sm:text-base text-gray-600 pb-4 border-b border-gray-100">
                      {activeNFT.description}
                    </div>
                    <div className="space-y-3">
                      {activeNFT.cooldownMinutes && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Frequência de resgate</span>
                          <span className="font-medium">
                            {(() => {
                              const minutes = activeNFT.cooldownMinutes;
                              
                              if (minutes >= 1440 && minutes % 1440 === 0) {
                                const days = minutes / 1440;
                                return `A cada ${days} dia${days > 1 ? 's' : ''}`;
                              } else if (minutes >= 60 && minutes % 60 === 0) {
                                const hours = minutes / 60;
                                return `A cada ${hours} hora${hours > 1 ? 's' : ''}`;
                              } else {
                                return `A cada ${minutes} minuto${minutes > 1 ? 's' : ''}`;
                              }
                            })()}
                          </span>
                        </div>
                      )}
                      {activeNFT.expirationDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Expira em</span>
                          <span className="font-medium">{Math.ceil((new Date(activeNFT.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias</span>
                        </div>
                      )}
                      {activeNFT.showStatistics === true && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Suprimento</span>
                          <span className="font-medium">{activeNFT.claimedSupply}/{activeNFT.totalSupply}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Countdown Timer */}
                {activeNFT.cooldownMinutes && (
                  <div className={`${isDetailsExpanded ? 'pt-6 border-t border-gray-100 mt-6' : ''}`}>
                    <CountdownTimer
                      cooldownMinutes={activeNFT.cooldownMinutes}
                      nftId={activeNFT.id.toString()}
                      privyUserId={unifiedUser?.id}
                      totalSupply={remainingSupply}
                    />
                  </div>
                )}
              </div>

              {/* Stake Requirements */}
              {activeNFT.stakeRequired && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <StakeRequirementBadge
                    stakeRequired={activeNFT.stakeRequired}
                    stakeTokenAddress={activeNFT.stakeTokenAddress || undefined}
                    stakeTokenAmount={activeNFT.stakeTokenAmount ? parseFloat(activeNFT.stakeTokenAmount) : undefined}
                    stakeTokenSymbol={activeNFT.stakeTokenSymbol || undefined}
                    className="bg-gray-50"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4">
                {!unifiedAuthenticated ? (
                  <Button
                    className="w-full h-14 text-lg font-semibold"
                    onClick={() => setShowConnectionModal(true)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15V12M12 9H12.01M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Conectar Carteira
                  </Button>
                ) : isClaimLoading ? (
                  <Button
                    className="w-full h-14 text-lg font-semibold opacity-70 cursor-not-allowed"
                    disabled
                  >
                    <div className="animate-spin h-5 w-5 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
                    Processando...
                  </Button>
                ) : remainingSupply <= 0 ? (
                  <Button
                    className="w-full h-14 text-lg font-semibold bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                    disabled
                  >
                    Esgotado
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 text-lg font-semibold"
                    onClick={handleClaim}
                    disabled={isClaimLoading}
                  >
                    {isClaimLoading ? 'Processando...' : 'Resgatar NFT'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Available NFTs Section */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                {activeNFT.categoryName ? `${activeNFT.categoryName} NFTs` : 'NFTs Disponíveis'} 
                <span className="text-lg text-gray-400 font-normal">
                  {processedAvailableNFTs.filter(nft => 
                    (nft.categoryName === activeNFT.categoryName || 
                    (!nft.categoryName && !activeNFT.categoryName)) &&
                    nft.id !== activeNFT.id
                  ).length}
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Visualização em lista"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Visualização em grade"
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* NFT Grid/List responsivo */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'overflow-x-auto w-full'
            }>
              {viewMode === 'grid' ? (
                processedAvailableNFTs
                  .filter(nft => 
                    (nft.categoryName === activeNFT.categoryName || 
                    (!nft.categoryName && !activeNFT.categoryName)) &&
                    nft.id !== activeNFT.id
                  )
                  .map((nft) => {
                    const rarityInfo = getRarityDetails(nft.rarity);
                    return (
                      <Link 
                        key={nft.id}
                        href={`/mint/${nft.id}`}
                        className="group"
                      >
                        <div 
                          className={`aspect-square relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 hover:scale-105 ${nft.id === activeNFT.id ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-200'}`}
                        >
                          <img 
                            src={nft.mainImageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}
                            alt={nft.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Badge de raridade */}
                          {nft.rarity && (
                            <div className="absolute top-3 right-3">
                              <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${rarityInfo.className}`}> 
                                {rarityInfo.icon && <rarityInfo.icon className="w-3 h-3 mr-1" />} 
                                {rarityInfo.label}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })
              ) : (
                <div className="min-w-[600px]">
                  {processedAvailableNFTs
                    .filter(nft => 
                      (nft.categoryName === activeNFT.categoryName || 
                      (!nft.categoryName && !activeNFT.categoryName)) &&
                      nft.id !== activeNFT.id
                    )
                    .map((nft) => {
                      const rarityInfo = getRarityDetails(nft.rarity);
                      return (
                        <Link 
                          key={nft.id}
                          href={`/mint/${nft.id}`}
                          className={`group flex items-center gap-4 border rounded-2xl p-4 mb-4 bg-white transition-all duration-200 hover:scale-[1.01] ${nft.id === activeNFT.id ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                            <img 
                              src={nft.mainImageUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}
                              alt={nft.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {nft.rarity && (
                                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${rarityInfo.className}`}> 
                                  {rarityInfo.icon && <rarityInfo.icon className="w-3 h-3 mr-1" />} 
                                  {rarityInfo.label}
                                </div>
                              )}
                            </div>
                            <h3 className="font-bold text-lg mb-1 truncate">{nft.title}</h3>
                            {nft.rarity && (
                              <span className="text-sm text-gray-600 capitalize font-medium">{nft.title} - {rarityInfo.label}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      {waterDropAnimation && (
        <LottieAnimationModal
          isOpen={showLottieModal}
          onAnimationComplete={handleLottieComplete}
          animationData={waterDropAnimation}
          duration={5000}
        />
      )}

      {activeNFT && claimedAssetData && (
        <MintSuccessModal
          isOpen={showSuccessMintModal}
          onClose={() => setShowSuccessMintModal(false)}
          nftTitle={claimedAssetData.title}
          imageUrl={claimedAssetData.imageUrl}
          rarity={claimedAssetData.rarity}
        />
      )}

      <StakeRequiredModal
        isOpen={showStakeModal}
        onClose={() => {
          setShowStakeModal(false);
        }}
        data={stakeModalData}
      />

      <ConnectionChoiceModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onPrivyLogin={async () => {
          await login();
        }}
      />

      {claimStatus === 'failed' && claimErrorMessage && (
        <div className="fixed bottom-5 right-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50" role="alert">
          <strong className="font-bold">Ops!</strong>
          <span className="block sm:inline"> {claimErrorMessage}</span>
        </div>
      )}
    </div>
  );
}
