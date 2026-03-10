'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Shield, Cookie } from 'lucide-react';

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário já aceitou os cookies
    const hasAcceptedCookies = localStorage.getItem('cookie-consent-accepted');
    
    if (!hasAcceptedCookies) {
      setShowConsent(true);
    }
    
    setIsLoading(false);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent-accepted', 'true');
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent-accepted', 'false');
    setShowConsent(false);
  };

  // Não renderizar durante o loading inicial
  if (isLoading || !showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-1 duration-300">
      <div className="bg-gray-50 border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Conteúdo principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Cookie className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Cookies e Privacidade
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Utilizamos cookies e tecnologias similares para melhorar sua experiência, personalizar conteúdo e analisar o tráfego do site. 
                      Ao continuar navegando, você concorda com nossa{' '}
                      <a href="https://gotas.social/terms" className="text-blue-600 hover:text-blue-800 underline">
                        Política de Privacidade
                      </a>{' '}
                      e o uso de cookies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  className="w-full sm:w-auto text-sm px-4 py-2 h-9"
                >
                  Recusar
                </Button>
                <Button
                  onClick={handleAccept}
                  className="w-full sm:w-auto text-sm px-4 py-2 h-9 bg-black hover:bg-gray-800 text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Aceitar e Continuar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 