// Script para limpar service workers que podem estar causando problemas de cache
(function() {
  'use strict';
  
  // Função para desregistrar todos os service workers
  function unregisterAllServiceWorkers() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(function(registration) {
          registration.unregister().then(function(success) {
            // Service worker removido silenciosamente
          }).catch(function(error) {
            console.error('Service worker unregistration error:', error);
          });
        });
      }).catch(function(error) {
        console.error('Error getting service worker registrations:', error);
      });
    }
  }
  
  // Função para limpar caches problemáticos
  function clearProblemCaches() {
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        cacheNames.forEach(function(cacheName) {
          caches.delete(cacheName).then(function(success) {
            // Cache removido silenciosamente
          }).catch(function(error) {
            console.error('Cache deletion error:', error);
          });
        });
      }).catch(function(error) {
        console.error('Error getting cache names:', error);
      });
    }
  }
  
  // Executar limpeza quando o script carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      unregisterAllServiceWorkers();
      clearProblemCaches();
    });
  } else {
    unregisterAllServiceWorkers();
    clearProblemCaches();
  }
  
  // Prevenir registro de novos service workers
  if ('serviceWorker' in navigator) {
    const originalRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function() {
      return Promise.reject(new Error('Service worker registration blocked'));
    };
  }
})(); 