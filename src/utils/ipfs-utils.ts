/**
 * Utilitários para trabalhar com IPFS e resolução de URLs de metadata
 * 
 * Este módulo fornece funções para converter URLs IPFS em URLs HTTP acessíveis
 * usando gateways públicos confiáveis.
 */

// Lista de gateways IPFS públicos confiáveis (atualizados em 2025 - ordenados por confiabilidade)
const IPFS_GATEWAYS = [
  'https://w3s.link/ipfs/',             // Web3.Storage - muito confiável
  'https://dweb.link/ipfs/',            // Protocol Labs - oficial e estável
  'https://ipfs.io/ipfs/',              // Gateway oficial do IPFS
  'https://gateway.ipfs.io/ipfs/',      // Gateway oficial alternativo
  'https://cf-ipfs.com/ipfs/',          // Cloudflare atualizado
  'https://gateway.pinata.cloud/ipfs/', // Pinata - especializado em NFTs
  'https://nftstorage.link/ipfs/',      // NFT.Storage - para NFTs
  'https://ipfs.fleek.co/ipfs/',        // Fleek - focado em web3
  'https://ipfs.infura.io/ipfs/',       // Infura - enterprise grade
] as const;

/**
 * Converte uma URL IPFS para uma URL HTTP usando um gateway público
 */
export function resolveIpfsUrl(ipfsUrl: string, gatewayIndex = 0): string {
  if (!ipfsUrl) return '';
  
  // Se já é uma URL HTTP, retornar como está
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl;
  }
  
  // Extrair hash IPFS da URL
  let ipfsHash = '';
  
  if (ipfsUrl.startsWith('ipfs://')) {
    ipfsHash = ipfsUrl.replace('ipfs://', '');
  } else if (ipfsUrl.startsWith('Qm') || ipfsUrl.startsWith('bafy')) {
    // Hash IPFS direto
    ipfsHash = ipfsUrl;
  } else {
    console.warn('URL IPFS inválida:', ipfsUrl);
    return ipfsUrl; // Retornar URL original se não conseguir processar
  }
  
  // Remover barra inicial se existir
  if (ipfsHash.startsWith('/')) {
    ipfsHash = ipfsHash.substring(1);
  }
  
  // Selecionar gateway (com fallback para o primeiro se índice inválido)
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  
  return `${gateway}${ipfsHash}`;
}

/**
 * Busca metadata IPFS com fallback automático entre gateways
 */
export async function fetchIpfsMetadata(ipfsUrl: string, options: {
  timeout?: number;
  maxRetries?: number;
} = {}): Promise<any> {
  const { timeout = 8000, maxRetries = 6 } = options;
  
  if (!ipfsUrl) {
    throw new Error('URL IPFS não fornecida');
  }
  
  let lastError: Error | null = null;
  
  // Tentar diferentes gateways
  for (let gatewayIndex = 0; gatewayIndex < Math.min(IPFS_GATEWAYS.length, maxRetries); gatewayIndex++) {
    const resolvedUrl = resolveIpfsUrl(ipfsUrl, gatewayIndex);
    
    try {
      console.log(`🌐 Tentando gateway ${gatewayIndex + 1}/${maxRetries}: ${IPFS_GATEWAYS[gatewayIndex]}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(resolvedUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log(`✅ Metadata carregada via gateway ${gatewayIndex + 1}: ${IPFS_GATEWAYS[gatewayIndex]}`);
      
      // Processar URLs de imagem no metadata se necessário
      if (metadata.image && metadata.image.startsWith('ipfs://')) {
        metadata.image = resolveIpfsUrl(metadata.image, gatewayIndex);
      }
      
      return metadata;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Gateway ${gatewayIndex + 1} falhou:`, error);
      
      // Se não é o último gateway, continuar tentando
      if (gatewayIndex < Math.min(IPFS_GATEWAYS.length, maxRetries) - 1) {
        continue;
      }
    }
  }
  
  // Se chegou aqui, todos os gateways falharam
  throw new Error(`Falha ao carregar metadata IPFS após ${maxRetries} tentativas. Último erro: ${lastError?.message}`);
}

/**
 * Converte uma URL de imagem IPFS para HTTP com fallback de gateway
 */
export function resolveIpfsImageUrl(imageUrl: string, preferredGateway = 0): string {
  if (!imageUrl) return '';
  
  // Se já é HTTP, retornar como está
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  return resolveIpfsUrl(imageUrl, preferredGateway);
}

/**
 * Verifica se uma URL é uma URL IPFS
 */
export function isIpfsUrl(url: string): boolean {
  if (!url) return false;
  
  return url.startsWith('ipfs://') || 
         url.startsWith('Qm') || 
         url.startsWith('bafy') ||
         url.includes('/ipfs/');
}

/**
 * Extrai hash IPFS de uma URL
 */
export function extractIpfsHash(url: string): string | null {
  if (!url) return null;
  
  // URL ipfs://
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '').split('/')[0];
  }
  
  // Gateway URL
  const ipfsMatch = url.match(/\/ipfs\/([^\/\?]+)/);
  if (ipfsMatch) {
    return ipfsMatch[1];
  }
  
  // Hash direto
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return url.split('/')[0];
  }
  
  return null;
}

/**
 * Configuração para otimizar carregamento de imagens IPFS
 */
export const IPFS_CONFIG = {
  // Gateway preferido para imagens (Web3.Storage é muito confiável)
  PREFERRED_IMAGE_GATEWAY: 0, // Web3.Storage
  
  // Gateway preferido para metadata (dweb.link oficial)
  PREFERRED_METADATA_GATEWAY: 1, // dweb.link
  
  // Timeout padrão para requests (mais agressivo)
  DEFAULT_TIMEOUT: 8000, // 8s para ser mais rápido
  
  // Máximo de tentativas de gateway (aumentado)
  MAX_GATEWAY_RETRIES: 6, // Tentar mais gateways
  
  // Lista de gateways disponíveis
  AVAILABLE_GATEWAYS: IPFS_GATEWAYS,
  
  // Timeout específico para imagens
  IMAGE_TIMEOUT: 12000, // 12s para imagens
} as const;

/**
 * Hook personalizado para resolver URLs IPFS de forma otimizada
 */
export function getOptimizedIpfsUrl(url: string, type: 'image' | 'metadata' = 'image'): string {
  if (!isIpfsUrl(url)) {
    return url;
  }
  
  const gatewayIndex = type === 'image' 
    ? IPFS_CONFIG.PREFERRED_IMAGE_GATEWAY 
    : IPFS_CONFIG.PREFERRED_METADATA_GATEWAY;
    
  return resolveIpfsUrl(url, gatewayIndex);
}