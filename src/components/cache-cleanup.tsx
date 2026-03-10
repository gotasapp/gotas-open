'use client';

import { useEffect } from 'react';

export function CacheCleanup() {
  useEffect(() => {
    // Função para desregistrar service workers problemáticos
    const cleanupServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          for (const registration of registrations) {
            // Verificar se é um service worker que pode estar causando problemas
            if (registration.scope.includes('sw.js') || 
                registration.scope.includes('workbox') ||
                registration.scope.includes('cache')) {
              
              await registration.unregister();
            }
          }
        } catch (error) {
          console.error('Erro ao limpar service workers:', error);
        }
      }
    };

    // Função para limpar caches problemáticos
    const cleanupCaches = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          
          for (const cacheName of cacheNames) {
            // Remover caches que podem estar causando problemas com POST
            if (cacheName.includes('workbox') || 
                cacheName.includes('runtime') ||
                cacheName.includes('precache')) {
              
              await caches.delete(cacheName);
            }
          }
        } catch (error) {
          console.error('Erro ao limpar caches:', error);
        }
      }
    };

    // Executar limpeza
    cleanupServiceWorkers();
    cleanupCaches();

    // Interceptar e prevenir novos registros de service worker problemáticos
    if ('serviceWorker' in navigator) {
      const originalRegister = navigator.serviceWorker.register;
      
      navigator.serviceWorker.register = function(scriptURL: string | URL, options?: RegistrationOptions) {
        const url = scriptURL.toString();
        
        // Bloquear service workers que podem causar problemas
        if (url.includes('sw.js') || url.includes('workbox')) {
          return Promise.reject(new Error('Service worker registration blocked'));
        }
        
        return originalRegister.call(this, scriptURL, options);
      };
    }
  }, []);

  return null; // Este componente não renderiza nada
} 