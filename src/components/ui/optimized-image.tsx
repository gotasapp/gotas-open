'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImageLazyLoading } from '@/hooks/use-lazy-loading';
import { getOptimizedIpfsUrl, isIpfsUrl } from '@/utils/ipfs-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'video' | 'auto' | 'min-square';
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'skeleton' | 'none';
  onLoad?: () => void;
  onError?: () => void;
  transparent?: boolean; // Se true, remove o background cinza
}

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]", className)}>
    <div className="w-full h-full bg-gray-200 rounded-lg animate-[shimmer_1.5s_ease-in-out_infinite]" />
  </div>
);

export function OptimizedImage({
  src,
  alt,
  className,
  fallbackSrc = '/placeholder-card.svg',
  aspectRatio = 'auto',
  priority = false,
  quality = 75,
  placeholder = 'skeleton',
  transparent = false,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for smooth height animation (min-square)
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial measure
    const measure = () => {
      const w = containerRef.current?.clientWidth || 0;
      if (w !== containerWidth) setContainerWidth(w);
    };
    measure();

    // Observe resizes
    const ro = new ResizeObserver(() => measure());
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [containerWidth]);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Atualizar src quando prop mudar e resolver IPFS se necessário
  useEffect(() => {
    let resolvedSrc = src;
    
    // Resolver URL IPFS automaticamente
    if (isIpfsUrl(src)) {
      resolvedSrc = getOptimizedIpfsUrl(src, 'image');
      console.log(`🖼️ [OptimizedImage] IPFS resolvida: ${src} → ${resolvedSrc}`);
    }
    
    setCurrentSrc(resolvedSrc);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth && naturalHeight) {
        setIsPortrait(naturalHeight > naturalWidth);
      }
    }
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onError?.();
  };

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
    // min-square handled specially via animated height. While unmeasured, keep square to avoid layout shift.
    'min-square': containerWidth > 0 ? '' : 'aspect-square',
  } as const;

  // Compute animated height for min-square
  const targetHeight = React.useMemo(() => {
    if (aspectRatio !== 'min-square' || containerWidth === 0) return undefined as number | undefined;
    if (isPortrait && imgRef.current?.naturalWidth && imgRef.current?.naturalHeight) {
      const ratio = imgRef.current.naturalHeight / imgRef.current.naturalWidth;
      return Math.max(containerWidth, Math.round(containerWidth * ratio));
    }
    // Landscape or unknown: keep it square
    return containerWidth;
  }, [aspectRatio, containerWidth, isPortrait]);

  // When we just measured width but image hasn't loaded yet, keep square height to reserve space
  const initialHeight = containerWidth || undefined;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        !transparent && 'bg-gray-100',
        aspectRatioClasses[aspectRatio],
        className
      )}
      // Animate only height changes for min-square. For others, let CSS/aspect handle.
      style={
        aspectRatio === 'min-square' && containerWidth > 0
          ? { height: initialHeight }
          : undefined
      }
      animate={
        aspectRatio === 'min-square' && typeof targetHeight === 'number'
          ? { height: targetHeight }
          : undefined
      }
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.35 }}
      {...props}
    >
      {/* Skeleton Loader */}
      {isLoading && placeholder === 'skeleton' && (
        <div className="absolute inset-0">
          <SkeletonLoader className="w-full h-full" />
        </div>
      )}

      {/* Blur Placeholder */}
      {isLoading && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Imagem Principal */}
      {isInView && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            // For min-square portrait, let the image define height naturally
            aspectRatio === 'min-square' && isPortrait
              ? 'w-full h-auto object-contain'
              : 'w-full h-full ' + (aspectRatio === 'auto' ? 'object-contain' : 'object-cover'),
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Overlay de erro */}
      {hasError && currentSrc === fallbackSrc && (
        <div className={`absolute inset-0 flex items-center justify-center ${!transparent ? 'bg-gray-100' : ''}`}>
          <div className="text-center text-gray-400">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Imagem não disponível</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Hook para preload de imagens
export function useImagePreload(src: string) {
  useEffect(() => {
    const img = new Image();
    img.src = src;
  }, [src]);
}

// Componente para preload de múltiplas imagens
export function ImagePreloader({ srcs }: { srcs: string[] }) {
  useEffect(() => {
    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [srcs]);

  return null;
} 
