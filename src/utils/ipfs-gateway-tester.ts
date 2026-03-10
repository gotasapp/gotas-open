'use client';

import { IPFS_CONFIG, resolveIpfsUrl } from './ipfs-utils';

/**
 * Testa todos os gateways IPFS disponíveis e retorna o primeiro que funciona
 */
export async function findWorkingGateway(ipfsHash: string): Promise<{
  gatewayUrl: string;
  gatewayIndex: number;
  responseTime: number;
} | null> {
  console.log(`🔍 Testando gateways IPFS para hash: ${ipfsHash}`);
  
  const testPromises = IPFS_CONFIG.AVAILABLE_GATEWAYS.map(async (gateway, index) => {
    const startTime = Date.now();
    const testUrl = resolveIpfsUrl(ipfsHash, index);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout rápido para teste
      
      const response = await fetch(testUrl, {
        method: 'HEAD', // Usar HEAD para ser mais rápido
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        console.log(`✅ Gateway ${index + 1} funcionando: ${gateway} (${responseTime}ms)`);
        return {
          gatewayUrl: testUrl,
          gatewayIndex: index,
          responseTime
        };
      } else {
        console.log(`❌ Gateway ${index + 1} retornou ${response.status}: ${gateway}`);
        return null;
      }
    } catch (error) {
      console.log(`❌ Gateway ${index + 1} falhou: ${gateway} - ${error}`);
      return null;
    }
  });
  
  // Aguarda o primeiro gateway que funcionar
  const results = await Promise.allSettled(testPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  
  console.error(`❌ Nenhum gateway IPFS funcionando para hash: ${ipfsHash}`);
  return null;
}

/**
 * Testa a conectividade de todos os gateways e retorna um relatório
 * Otimizado para não bloquear o thread principal
 */
export async function testAllGateways(): Promise<{
  working: Array<{ index: number; gateway: string; responseTime: number }>;
  failing: Array<{ index: number; gateway: string; error: string }>;
}> {
  console.log(`🧪 Testando conectividade de todos os ${IPFS_CONFIG.AVAILABLE_GATEWAYS.length} gateways IPFS...`);
  
  // Usar um hash IPFS conhecido que deve existir (logo do IPFS)
  const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  
  // Retornar uma Promise que se resolve de forma assíncrona
  return new Promise((resolve) => {
    // Usar requestIdleCallback se disponível para não bloquear a UI
    const executeTests = async () => {
        const results = await Promise.allSettled(
          IPFS_CONFIG.AVAILABLE_GATEWAYS.map(async (gateway, index) => {
            const startTime = Date.now();
            const testUrl = resolveIpfsUrl(testHash, index);
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000); // Reduzir timeout para 6s
              
              const response = await fetch(testUrl, {
                method: 'HEAD',
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              const responseTime = Date.now() - startTime;
              
              if (response.ok) {
                return {
                  index,
                  gateway,
                  responseTime,
                  status: 'working' as const
                };
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (error) {
              return {
                index,
                gateway,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                status: 'failing' as const
              };
            }
          })
        );
        
        const working: Array<{ index: number; gateway: string; responseTime: number }> = [];
        const failing: Array<{ index: number; gateway: string; error: string }> = [];
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.status === 'working') {
              working.push({
                index: result.value.index,
                gateway: result.value.gateway,
                responseTime: result.value.responseTime
              });
            } else {
              failing.push({
                index: result.value.index,
                gateway: result.value.gateway,
                error: result.value.error
              });
            }
          } else {
            failing.push({
              index,
              gateway: IPFS_CONFIG.AVAILABLE_GATEWAYS[index],
              error: result.reason?.message || 'Promise rejeitada'
            });
          }
        });
        
        // Ordenar por tempo de resposta
        working.sort((a, b) => a.responseTime - b.responseTime);
        
        console.log(`📊 Resultado do teste de gateways:`);
        console.log(`✅ Funcionando: ${working.length}/${IPFS_CONFIG.AVAILABLE_GATEWAYS.length}`);
        console.log(`❌ Falhando: ${failing.length}/${IPFS_CONFIG.AVAILABLE_GATEWAYS.length}`);
        
        if (working.length > 0) {
          console.log(`🏆 Gateway mais rápido: ${working[0].gateway} (${working[0].responseTime}ms)`);
        }
        
        resolve({ working, failing });
      };

      // Usar requestIdleCallback se disponível, senão setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => executeTests());
      } else {
        setTimeout(() => executeTests(), 50);
      }
    });
}

/**
 * Reordena a lista de gateways com base nos testes de conectividade
 */
export function reorderGatewaysByPerformance(
  workingGateways: Array<{ index: number; gateway: string; responseTime: number }>
): string[] {
  // Manter gateways funcionais ordenados por velocidade, depois os não testados
  const workingUrls = workingGateways.map(g => g.gateway);
  const remainingUrls = IPFS_CONFIG.AVAILABLE_GATEWAYS.filter(g => !workingUrls.includes(g));
  
  return [...workingUrls, ...remainingUrls];
}