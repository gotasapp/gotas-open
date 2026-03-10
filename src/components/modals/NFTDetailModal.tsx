"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Share2, User, Gavel, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Asset } from '@/lib/types';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NFTDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  fromPage?: string;
}

export default function NFTDetailModal({ isOpen, onClose, asset, fromPage }: NFTDetailModalProps) {
  const router = useRouter();
  const { authenticated, user } = useUnifiedAuth();
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  
  // Touch gesture tracking
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isSwipeClosing, setIsSwipeClosing] = useState(false);
  const [swipeTransform, setSwipeTransform] = useState(0);
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  // Gesture thresholds
  const MIN_SWIPE_DISTANCE = 100; // Minimum distance for swipe to be recognized
  const MAX_TAP_DISTANCE = 10; // Maximum movement to still count as tap
  const SWIPE_DOWN_THRESHOLD = 150; // Distance to trigger close on swipe down
  const SAFE_ZONE_HEIGHT = 120; // Height of the safe zone at the top (in pixels)

  // Ensure modal opens in fullscreen by default each time it opens
  useEffect(() => {
    if (isOpen) {
      setIsFullscreen(true);
      setIsSwipeClosing(false);
      setTouchStart(null);
      setTouchEnd(null);
      setSwipeTransform(0);
    }
  }, [isOpen]);

  // Close on ESC key (desktop)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    if (fromPage) {
      router.replace(fromPage, { scroll: false });
    }
  };

  // Touch event handlers for gesture control
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd(null); // Reset touch end
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
    
    // Add visual feedback for swipe down
    if (touchStart && touchStart.y > SAFE_ZONE_HEIGHT) {
      const deltaY = touch.clientY - touchStart.y;
      if (deltaY > 0) {
        // Only show transform when swiping down
        setSwipeTransform(Math.min(deltaY * 0.3, 100)); // Limit max transform
      } else {
        setSwipeTransform(0);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) {
      // If no touch movement, treat as tap on overlay
      const target = e.target as HTMLElement;
      if (target.dataset.overlay === 'true') {
        handleClose();
      }
      return;
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Check if touch started in safe zone (header area)
    const isInSafeZone = touchStart.y < SAFE_ZONE_HEIGHT;
    
    // If it's a tap (very small movement) on overlay
    if (distance < MAX_TAP_DISTANCE) {
      const target = e.target as HTMLElement;
      if (target.dataset.overlay === 'true') {
        handleClose();
      }
      return;
    }
    
    // If in safe zone, don't close on any swipe
    if (isInSafeZone) {
      return;
    }
    
    // Check for swipe down to close (only outside safe zone)
    if (deltaY > SWIPE_DOWN_THRESHOLD && Math.abs(deltaX) < deltaY * 0.5) {
      // Swipe down detected and is more vertical than horizontal
      setIsSwipeClosing(true);
      setTimeout(() => {
        handleClose();
      }, 200);
    }
    
    // Reset touch tracking
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeTransform(0);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close on direct click, not on touch events
    if (e.type === 'click' && !touchStart && !touchEnd) {
      const target = e.target as HTMLElement;
      if (target.dataset.overlay === 'true') {
        handleClose();
      }
    }
  };

  const handleMintClick = () => {
    if (asset?.nftId) {
      router.push(`/mint/${asset.nftId}`);
      onClose();
    }
  };

  const handleViewProfile = () => {
    const claimedBy = asset?.claimedBy;
    if (!claimedBy) {
      return;
    }

    let profilePath = '';
    if (claimedBy.username) {
      profilePath = claimedBy.username;
    } else if (claimedBy.displayName) {
      profilePath = claimedBy.displayName;
    } else if (claimedBy.walletAddress) {
      profilePath = claimedBy.walletAddress;
    }

    if (profilePath) {
      onClose();
      setTimeout(() => {
        router.push(`/${profilePath}`);
      }, 100);
    }
  };

  const handleCategoryClick = () => {
    if (asset?.categoryName) {
      router.push(`/cards?category=${encodeURIComponent(asset.categoryName.toLowerCase())}`);
      onClose();
    }
  };

  const handleMakeOffer = () => {
    toast.info('As negociações vão estar liberadas em breve. Acompanhe nas nossas redes sociais.');
  };

  const toggleFullscreen = () => setIsFullscreen(v => !v);

  const handleShare = async () => {
    const shareData = {
      title: asset?.title || 'NFT',
      text: `Confira este NFT: ${asset?.title}`,
      url: window.location.href
    };

    // Verifica se o navegador suporta Web Share API (principalmente mobile)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Compartilhamento cancelado - não precisa fazer nada
      }
    } else {
      // Fallback para desktop - copia o link para a área de transferência
      try {
        await navigator.clipboard.writeText(window.location.href);
        // Você pode adicionar um toast aqui para mostrar que foi copiado
        alert('Link copiado para a área de transferência!');
      } catch (error) {
        // Fallback ainda mais básico
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link copiado para a área de transferência!');
      }
    }
  };

  const rarityColorMap = {
    common: 'bg-gray-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500'
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDisplayName = () => {
    const claimedBy = asset?.claimedBy;
    if (!claimedBy) return 'Colecionador';
    
    // Prioridade: username > displayName > email (parte antes do @) > wallet address
    if (claimedBy.username) return claimedBy.username;
    if (claimedBy.displayName) return claimedBy.displayName;
    if (claimedBy.email) return claimedBy.email.split('@')[0];
    if (claimedBy.walletAddress) return claimedBy.walletAddress.slice(0, 8) + '...';
    
    return 'Colecionador';
  };

  const isOwner = () => {
    if (!authenticated || !user?.wallet?.address || !asset?.claimedBy?.walletAddress) {
      return false;
    }
    return user.wallet.address.toLowerCase() === asset.claimedBy.walletAddress.toLowerCase();
  };

  if (!isOpen || !asset) return null;

  const rarityInfo = getRarityDetails(asset.rarity);
  const Icon = rarityInfo.icon;
  const players = (() => {
    const text = asset.description || '';
    const match = text.match(/(?:Jogadores?|Players?):?\s*([^\n]+)/i);
    if (match && match[1]) {
      return match[1]
        .split(/[;,]/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 20);
    }
    return [] as string[];
  })();

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex ${isFullscreen ? 'items-stretch justify-center pt-0' : 'items-start justify-center pt-4'} transition-all duration-300 ease-in-out`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOverlayClick}
        data-overlay="true"
      />
      
      {/* Modal Content */}
      <div 
        ref={modalContentRef}
        className={`relative bg-white shadow-2xl overflow-hidden transition-all ${swipeTransform > 0 ? 'duration-0' : 'duration-300'} ease-in-out ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none mx-0'
            : 'w-full max-h-[calc(100vh-2rem)] rounded-3xl mx-4 md:max-w-4xl md:mx-auto'
        } ${isSwipeClosing ? 'animate-out slide-out-to-bottom-full duration-300' : 'animate-in slide-in-from-bottom-full duration-500 ease-out'}`}
        style={{
          transform: swipeTransform > 0 ? `translateY(${swipeTransform}px)` : undefined,
          opacity: swipeTransform > 0 ? 1 - (swipeTransform / 300) : 1
        }}
      >
        <div className={`h-full flex flex-col ${isFullscreen ? 'h-screen max-h-none' : 'max-h-[calc(100vh-2rem)]'}`}>
          {/* Swipe Indicator - Only visible on mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">{asset.categoryName || 'NFT'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleFullscreen}
                className="rounded-full hover:bg-gray-100"
                aria-label={isFullscreen ? 'Restaurar' : 'Maximizar'}
                title={isFullscreen ? 'Restaurar' : 'Maximizar'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
              {authenticated && !isOwner() && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleMakeOffer}
                  className="rounded-full bg-white hover:bg-gray-50 text-black border border-black px-4"
                >
                  <Gavel className="w-4 h-4 mr-2 hidden md:inline-block" />
                  <span className="md:hidden">Proposta</span>
                  <span className="hidden md:inline">Fazer proposta</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShare}
                className="rounded-full hover:bg-gray-100"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className={`flex-1 overflow-y-auto min-h-0 ${isFullscreen ? '' : ''}`}>
            <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-[80vh] flex items-center">
              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              
              {/* 1. Imagem Principal */}
              <div className="flex justify-center lg:justify-start">
                <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
                  <div className="w-full">
                    <OptimizedImage
                      src={asset.imageUrl || '/placeholder-card.svg'}
                      alt={asset.title}
                      className="w-full h-auto shadow-2xl rounded-lg"
                      aspectRatio="min-square"
                      placeholder="skeleton"
                      priority
                    />
                  </div>
                  {/* Rarity Badge */}
                  {asset.rarity && (
                    <div className="absolute -top-3 -right-3">
                      <Badge className={`${rarityInfo.className} px-4 py-2 text-sm font-medium shadow-lg`}>
                        <Icon className="w-4 h-4 mr-2" />
                        {rarityInfo.label}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Título e Descrição (coluna direita) */}
              <div className="space-y-4 text-left w-full">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">{asset.title}</h1>
                {asset.description && (
                  <p className="text-sm sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
                    {asset.description}
                  </p>
                )}
                {/* Meta: data + coleção */}
                <div className="text-sm text-gray-500">
                  Resgatado em {formatDate(asset.claimedAt || asset.createdAt)} •{' '}
                  <button onClick={handleCategoryClick} className="underline hover:text-gray-700">
                    Coleção: {asset.categoryName || 'digital'}
                  </button>
                </div>
                {/* Jogadores (se houver no texto) */}
                {players.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {players.map(p => (
                      <span key={p} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Proprietário (compacto) - abaixo do título/descrição e antes dos detalhes */}
                <div className="flex items-center gap-4 mt-4">
                  <div 
                    className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewProfile(); }}
                  >
                    {asset.claimedBy?.profileImageUrl ? (
                      <OptimizedImage
                        src={asset.claimedBy.profileImageUrl}
                        alt={getDisplayName()}
                        className="w-full h-full object-cover"
                        aspectRatio="square"
                        placeholder="skeleton"
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div>
                    <div 
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleViewProfile(); }}
                    >
                      @{getDisplayName()}
                    </div>
                    {asset.claimedBy?.walletAddress && (
                      <div className="text-sm text-gray-500 font-mono">
                        {asset.claimedBy.walletAddress.slice(0, 6)}...{asset.claimedBy.walletAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                {/* Botão para abrir Drawer de Detalhes */}
                <div className="pt-2">
                  <button
                    onClick={() => setDetailsSheetOpen(true)}
                    className="inline-flex items-center text-sm font-semibold text-gray-900 hover:text-blue-700"
                    title="Ver detalhes do NFT"
                  >
                    <span>Detalhes do NFT</span>
                    <ChevronDown className="w-4 h-4 ml-1.5" />
                  </button>
                </div>
              </div>


              {/* 5. Ações */}
              <div className="flex flex-col sm:flex-row items-start justify-start gap-4 pt-4">
                {asset.nftId && (
                  <Button 
                    onClick={handleMintClick}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-medium rounded-full hidden"
                  >
                    Ver NFT
                  </Button>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6 flex-shrink-0 hidden">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-xs md:text-sm text-gray-500">
                Este NFT foi reivindicado em {formatDate(asset.claimedAt || asset.createdAt)} e faz parte da coleção{' '}
                <button
                  onClick={handleCategoryClick}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  {asset.categoryName || 'digital'}
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Drawer de Detalhes */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent side="bottom" className="sm:max-w-2xl sm:left-1/2 sm:-translate-x-1/2 z-[10001]">
          <SheetHeader>
            <SheetTitle>Detalhes do NFT</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Coleção</span>
              <span className="font-medium">{asset.nftName || asset.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Raridade</span>
              <span className="font-medium capitalize">{rarityInfo.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Categoria</span>
              <span className="font-medium">{asset.categoryName || 'Digital'}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 

 
