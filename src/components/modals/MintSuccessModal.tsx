'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';

// Importar Lottie dinamicamente para evitar problemas de SSR
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="w-32 h-32 bg-gray-100 animate-pulse rounded-lg" />
});

interface MintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftTitle: string;
  imageUrl?: string;
  rarity?: string;
}

export function MintSuccessModal({ isOpen, onClose, nftTitle, imageUrl, rarity }: MintSuccessModalProps) {
  const router = useRouter();
  const { profile } = useUserProfile();
  
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  const handleSellClick = () => {
    toast.info('Esta opção estará disponível em breve!', {
      icon: <ShoppingCart className="w-4 h-4" />,
      duration: 3000,
    });
  };

  const handleViewCollection = () => {
    onClose();
    // Navegar para o perfil do usuário
    if (profile?.username) {
      router.push(`/${profile.username}`);
    } else {
      router.push('/meus-cards');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <DialogTitle className="text-2xl font-bold mb-2">Resgate Concluído!</DialogTitle>
            <p className="text-sm text-gray-600 mb-4">
              Esse é o seu card:
            </p>
            
            {/* Card do Asset Resgatado */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto mb-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200">
                <div className="w-full">
                  <OptimizedImage
                    src={imageUrl || '/placeholder-card.svg'}
                    alt={nftTitle}
                    className="w-full h-auto rounded-xl"
                    aspectRatio="auto"
                    placeholder="skeleton"
                    priority
                  />
                </div>
                {/* Rarity Badge */}
                {rarity && (
                  <div className="absolute top-3 right-3">
                    <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${rarityInfo.className}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {rarityInfo.label}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Título e Raridade */}
              <div className="mt-3 text-center">
                <h3 className="font-bold text-lg text-gray-900 mb-1">{nftTitle}</h3>
                {rarity && (
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${rarityInfo.className.split(' ')[0]}`}></div>
                    <span className="text-sm text-gray-600 capitalize font-medium">{rarityInfo.label}</span>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              Ele agora está disponível na sua coleção.
            </p>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center border-t pt-4">
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSellClick}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Vender
            </Button>
            <Button 
              type="button" 
              variant="default" 
              onClick={handleViewCollection}
            >
              Ver Minha Coleção
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 