'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, Copy, Clock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KycData, QuoteData } from './BuyPixPage';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { trackTokenPurchase } from '@/lib/gtag';

interface PaymentStepProps {
  walletAddress: string;
  kycData: KycData;
  quoteData: QuoteData;
  selectedToken?: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function PaymentStep({ walletAddress, kycData, quoteData, selectedToken = 'CHZ', onSuccess, onError, onBack }: PaymentStepProps) {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'confirmed' | 'expired' | 'cancelled'>('pending');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run on client-side to prevent hydration mismatch
    if (typeof window === 'undefined') return;

    const savedOrder = localStorage.getItem('brla-order');
    if (savedOrder) {
      const order = JSON.parse(savedOrder);
      // Calculate elapsed time only on client to avoid SSR/client mismatch
      const elapsed = Math.floor((Date.now() - order.createdAt) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = timer;

    const checkTimer = setInterval(() => {
      if (paymentStatus === 'pending') {
        checkPaymentStatus();
      }
    }, 10000); // Verifica a cada 10 segundos

    checkIntervalRef.current = checkTimer;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (quoteData.pixCode) {
      generateQRCode(quoteData.pixCode);
    }
  }, [quoteData.pixCode]);

  const generateQRCode = async (pixCode: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(pixCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTokenAmount = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const copyPixCode = async () => {
    if (quoteData.pixCode) {
      try {
        await navigator.clipboard.writeText(quoteData.pixCode);
        toast.success('Código PIX copiado!');
      } catch (error) {
        toast.error('Erro ao copiar código PIX');
      }
    }
  };

  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success('Endereço copiado!');
    } catch (error) {
      toast.error('Erro ao copiar endereço');
    }
  };

  const checkPaymentStatus = async () => {
    if (!quoteData.orderId || checking) return;

    setChecking(true);

    try {
      const response = await fetch(`/api/brla/payment-status?orderId=${quoteData.orderId}`);
      const data = await response.json();

      if (response.ok) {
        if (data.status === 'confirmed' || data.status === 'completed' || data.status === 'success') {
          setPaymentStatus('confirmed');
          localStorage.removeItem('brla-order');
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          
          // Rastrear compra concluída se recebemos dados de tracking do servidor
          if (data.trackingData) {
            trackTokenPurchase(
              data.trackingData.token,
              data.trackingData.amount,
              data.trackingData.transactionHash || quoteData.orderId
            );
          }
          
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else if (data.status === 'cancelled' || data.status === 'failed') {
          setPaymentStatus('cancelled');
          onError('Pagamento foi cancelado ou falhou');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleManualCheck = () => {
    setPaymentStatus('checking');
    checkPaymentStatus();
  };

  const cancelOrder = () => {
    localStorage.removeItem('brla-order');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    onBack();
  };

  if (paymentStatus === 'confirmed') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-green-600">Pagamento Confirmado!</h2>
          <p className="text-gray-600 mb-4">
            Processando o envio dos tokens para sua carteira...
          </p>
          <div className="animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'expired') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-red-600">Tempo Expirado</h2>
          <p className="text-gray-600 mb-4">
            O tempo limite para pagamento expirou. Você pode fazer uma nova cotação.
          </p>
          <Button onClick={onBack} className="w-full">
            Nova Cotação
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className={`${timeLeft < 120 ? 'text-red-600' : 'text-gray-600'}`}>
              Expira em: <span className="font-mono">{formatTime(timeLeft)}</span>
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {qrCodeDataUrl && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img 
                  src={qrCodeDataUrl}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Escaneie com o app do seu banco
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pagamento deverá ser feito para BRL Digital LTDA
              </p>
            </div>
          )}

          {quoteData.pixCode && (
            <div>
              <Label className="text-sm font-medium">Código PIX (Copia e Cola)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={quoteData.pixCode}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={copyPixCode}
                  variant="outline"
                  size="icon"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Resumo da Compra</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Valor:</span>
                <span className="font-medium">{formatCurrency(quoteData.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fan Token:</span>
                <span className="font-medium">{formatTokenAmount(quoteData.tokenAmount)} {selectedToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Carteira:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <Button
                    onClick={copyWalletAddress}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">* valor estimado</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={cancelOrder}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleManualCheck}
              disabled={checking || paymentStatus === 'checking'}
              className="flex-1 bg-black text-white hover:bg-gray-800"
            >
              {checking || paymentStatus === 'checking' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Pagamento'
              )}
            </Button>
          </div>


        </div>
      </CardContent>
    </Card>
  );
} 