'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Lottie from 'lottie-react';

interface LottieAnimationModalProps {
  isOpen: boolean;
  onAnimationComplete: () => void;
  animationData: any;
  duration?: number;
}

export function LottieAnimationModal({ 
  isOpen, 
  onAnimationComplete, 
  animationData,
  duration = 7000 
}: LottieAnimationModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onAnimationComplete();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onAnimationComplete]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isVisible} onOpenChange={() => {}} modal={true}>
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <DialogContent 
          className="sm:max-w-md border-0 bg-black shadow-none p-8 rounded-2xl [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-64 h-64 aspect-square">
              <Lottie
                animationData={animationData}
                loop={false}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
} 