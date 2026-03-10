'use client';

import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useLazyLoading(options: UseLazyLoadingOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Se já foi acionado e triggerOnce está ativo, não fazer nada
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && triggerOnce) {
          setHasTriggered(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return {
    ref,
    isIntersecting: triggerOnce ? (hasTriggered || isIntersecting) : isIntersecting,
    hasTriggered
  };
}

// Hook específico para imagens
export function useImageLazyLoading(src: string, options?: UseLazyLoadingOptions) {
  const { ref, isIntersecting } = useLazyLoading(options);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isIntersecting && src && !imageSrc) {
      setImageSrc(src);
    }
  }, [isIntersecting, src, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  return {
    ref,
    imageSrc,
    isLoaded,
    hasError,
    isIntersecting,
    handleLoad,
    handleError
  };
}

// Hook para lista de imagens
export function useImagesLazyLoading(images: string[], options?: UseLazyLoadingOptions) {
  const { ref, isIntersecting } = useLazyLoading(options);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isIntersecting || !images.length) return;

    images.forEach((src) => {
      if (!src || loadedImages.has(src) || errorImages.has(src)) return;

      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(Array.from(prev).concat(src)));
      };
      img.onerror = () => {
        setErrorImages(prev => new Set(Array.from(prev).concat(src)));
      };
      img.src = src;
    });
  }, [isIntersecting, images, loadedImages, errorImages]);

  return {
    ref,
    isIntersecting,
    loadedImages,
    errorImages,
    isImageLoaded: (src: string) => loadedImages.has(src),
    hasImageError: (src: string) => errorImages.has(src)
  };
} 