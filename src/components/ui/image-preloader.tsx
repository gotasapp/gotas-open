'use client';

import { useEffect } from 'react';

interface ImagePreloaderProps {
  images: string[];
  priority?: boolean;
}

export function ImagePreloader({ images, priority = false }: ImagePreloaderProps) {
  useEffect(() => {
    if (!images.length) return;

    const preloadImages = () => {
      images.forEach((src) => {
        if (!src) return;
        
        const img = new Image();
        img.src = src;
        
        // Para imagens prioritárias, forçar o carregamento
        if (priority) {
          img.loading = 'eager';
          img.decoding = 'sync';
        }
      });
    };

    // Se for prioritário, carregar imediatamente
    if (priority) {
      preloadImages();
    } else {
      // Caso contrário, aguardar um pouco para não bloquear o carregamento inicial
      const timer = setTimeout(preloadImages, 100);
      return () => clearTimeout(timer);
    }
  }, [images, priority]);

  return null;
}

// Hook para preload de imagens
export function useImagePreload(src: string, priority = false) {
  useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    img.src = src;
    
    if (priority) {
      img.loading = 'eager';
      img.decoding = 'sync';
    }
  }, [src, priority]);
}

// Hook para preload de múltiplas imagens
export function useImagesPreload(srcs: string[], priority = false) {
  useEffect(() => {
    if (!srcs.length) return;
    
    srcs.forEach((src) => {
      if (!src) return;
      
      const img = new Image();
      img.src = src;
      
      if (priority) {
        img.loading = 'eager';
        img.decoding = 'sync';
      }
    });
  }, [srcs, priority]);
} 