'use client';

import React, { useState, useEffect } from 'react';
import { getOptimizedIpfsUrl, isIpfsUrl, IPFS_CONFIG, resolveIpfsUrl } from '@/utils/ipfs-utils';

interface IPFSImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  onError?: (error: string) => void;
  onLoad?: () => void;
  showLoadingSpinner?: boolean;
  maxRetries?: number;
}

/**
 * Componente otimizado para carregar imagens IPFS com fallback automático entre gateways
 */
export function IPFSImage({
  src,
  alt,
  fallbackSrc,
  onError,
  onLoad,
  showLoadingSpinner = true,
  maxRetries = IPFS_CONFIG.MAX_GATEWAY_RETRIES,
  className = '',
  ...props
}: IPFSImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Processar URL inicial
  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Reset states when src changes
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
    setGatewayIndex(0);

    // Se é URL IPFS, usar gateway otimizado
    if (isIpfsUrl(src)) {
      const optimizedUrl = getOptimizedIpfsUrl(src, 'image');
      setCurrentSrc(optimizedUrl);
      
      console.log(`🖼️ Carregando imagem IPFS:`, {
        original: src,
        optimized: optimizedUrl,
        gateway: IPFS_CONFIG.AVAILABLE_GATEWAYS[IPFS_CONFIG.PREFERRED_IMAGE_GATEWAY]
      });
    } else {
      setCurrentSrc(src);
    }
  }, [src]);

  // Tentar próximo gateway em caso de erro
  const tryNextGateway = () => {
    if (!isIpfsUrl(src) || retryCount >= maxRetries) {
      // Se não é IPFS ou excedeu tentativas, usar fallback
      if (fallbackSrc) {
        console.log(`🔄 Usando imagem fallback:`, fallbackSrc);
        setCurrentSrc(fallbackSrc);
        setRetryCount(0); // Reset para permitir retry do fallback
      } else {
        setHasError(true);
        setIsLoading(false);
        onError?.(`Falha ao carregar imagem após ${maxRetries} tentativas`);
      }
      return;
    }

    const nextGatewayIndex = (gatewayIndex + 1) % IPFS_CONFIG.AVAILABLE_GATEWAYS.length;
    const nextRetryCount = retryCount + 1;
    
    console.log(`🔄 Tentando próximo gateway (tentativa ${nextRetryCount}/${maxRetries}):`, {
      gateway: IPFS_CONFIG.AVAILABLE_GATEWAYS[nextGatewayIndex],
      originalSrc: src
    });

    const newUrl = resolveIpfsUrl(src, nextGatewayIndex);
    setCurrentSrc(newUrl);
    
    setGatewayIndex(nextGatewayIndex);
    setRetryCount(nextRetryCount);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    if (isIpfsUrl(src) && gatewayIndex > 0) {
      console.log(`✅ Imagem IPFS carregada com gateway alternativo:`, {
        gateway: IPFS_CONFIG.AVAILABLE_GATEWAYS[gatewayIndex],
        attempts: retryCount
      });
    }
    
    onLoad?.();
  };

  const handleImageError = () => {
    console.warn(`⚠️ Erro ao carregar imagem:`, {
      src: currentSrc,
      gateway: isIpfsUrl(src) ? IPFS_CONFIG.AVAILABLE_GATEWAYS[gatewayIndex] : 'N/A',
      attempt: retryCount + 1
    });

    tryNextGateway();
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full bg-gray-100 animate-pulse">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  const ErrorFallback = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400 p-4">
      <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-xs text-center">Imagem indisponível</span>
    </div>
  );

  if (hasError) {
    return <ErrorFallback />;
  }

  if (isLoading && showLoadingSpinner) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {currentSrc && (
        <img
          {...props}
          src={currentSrc}
          alt={alt}
          className={className}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            ...props.style,
            display: isLoading ? 'none' : 'block'
          }}
        />
      )}
      
      {isLoading && showLoadingSpinner && <LoadingSpinner />}
    </>
  );
}

/**
 * Hook para usar imagem IPFS com fallback
 */
export function useIPFSImage(src: string) {
  const [processedSrc, setProcessedSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setProcessedSrc('');
      return;
    }

    if (isIpfsUrl(src)) {
      setIsLoading(true);
      const optimizedUrl = getOptimizedIpfsUrl(src, 'image');
      
      // Testar se a imagem carrega
      const testImage = new Image();
      testImage.onload = () => {
        setProcessedSrc(optimizedUrl);
        setIsLoading(false);
        setError(null);
      };
      testImage.onerror = () => {
        setError('Falha ao carregar imagem IPFS');
        setIsLoading(false);
      };
      testImage.src = optimizedUrl;
    } else {
      setProcessedSrc(src);
    }
  }, [src]);

  return {
    src: processedSrc,
    isLoading,
    error,
    isIPFS: isIpfsUrl(src)
  };
}