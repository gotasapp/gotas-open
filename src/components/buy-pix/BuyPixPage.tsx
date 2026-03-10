'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { KycForm } from './KycForm';
import { QuoteForm } from './QuoteForm';
import { PaymentStep } from './PaymentStep';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useAuthenticationMethod } from '@/hooks/useAuthenticationMethod';
import { useBrlaOrder } from '@/hooks/useBrlaOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, CreditCard, CheckCircle } from 'lucide-react';

export interface KycData {
  cpf: string;
  birthDate: string;
  fullName: string;
  kycApproved?: boolean;
  brlaUserId?: string;
}

export interface QuoteData {
  amount: number;
  tokenAmount: number;
  rate: number;
  orderId?: string;
  pixCode?: string;
  pixQrCode?: string;
  expiresAt?: string;
}

type Step = 'kyc' | 'quote' | 'payment' | 'success';

export function BuyPixPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, user, authProvider } = useUnifiedAuth();
  const { shouldUseEmbeddedWallet } = useAuthenticationMethod();
  const { order: savedOrder, hasActiveOrder, clearOrder } = useBrlaOrder();
  const [currentStep, setCurrentStep] = useState<Step>('kyc');
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>('CHZ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilledAmount, setPrefilledAmount] = useState<string | null>(null);
  const [amountType, setAmountType] = useState<'real' | 'token'>('real');
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);

  const walletAddress = user?.wallet?.address;

  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      const timer = setTimeout(() => setShowConnectPrompt(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowConnectPrompt(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && walletAddress) {
      const hasUrlParams = checkUrlParams();
      if (!hasUrlParams) {
        checkExistingKyc();
      }
      
      // Verificar se há token salvo no localStorage
      const savedOrder = localStorage.getItem('brla-order');
      if (savedOrder) {
        try {
          const order = JSON.parse(savedOrder);
          if (order.selectedToken) {
            setSelectedToken(order.selectedToken);
          }
        } catch (error) {
          console.error('Erro ao recuperar token do localStorage:', error);
        }
      }
    }
  }, [authenticated, walletAddress]);

  useEffect(() => {
    if (hasActiveOrder && savedOrder && walletAddress === savedOrder.walletAddress) {
      const hasUrlParams = searchParams && (
        searchParams.get('orderId') || 
        searchParams.get('pixCode')
      );
      
      if (!hasUrlParams) {
        setKycData(savedOrder.kycData);
        setQuoteData({
          amount: savedOrder.amount,
          tokenAmount: savedOrder.tokenAmount,
          rate: savedOrder.rate,
          orderId: savedOrder.orderId,
          pixCode: savedOrder.pixCode,
          pixQrCode: savedOrder.pixQrCode,
          expiresAt: savedOrder.expiresAt
        });
        setCurrentStep('payment');
      }
    }
  }, [hasActiveOrder, savedOrder, walletAddress]);

  useEffect(() => {
    fetchAvailableTokens();
  }, []);

  const fetchAvailableTokens = async () => {
    try {
      const response = await fetch('/api/tokens/available');
      const data = await response.json();
      
      if (data.success) {
        setAvailableTokens(data.tokens);
      }
    } catch (error) {
      console.error('Erro ao buscar tokens:', error);
      // Fallback para CHZ apenas
      setAvailableTokens([{
        id: 'chz',
        symbol: 'CHZ',
        name: 'Chiliz',
        is_fan_token: false
      }]);
    }
  };

  const checkUrlParams = () => {
    // Fallback para window.location.search se searchParams não funcionar
    let urlParams: URLSearchParams;
    if (searchParams) {
      urlParams = searchParams;
    } else if (typeof window !== 'undefined') {
      urlParams = new URLSearchParams(window.location.search);
    } else {
      return false;
    }
    
    const orderId = urlParams.get('orderId');
    const pixCode = urlParams.get('pixCode');
    const amount = urlParams.get('amount');
    const tokenAmount = urlParams.get('tokenAmount');
    const rate = urlParams.get('rate');
    const expiresAt = urlParams.get('expiresAt');
    const cpf = urlParams.get('cpf');
    const fullName = urlParams.get('fullName');
    const birthDate = urlParams.get('birthDate');

    // Se há parâmetros de ordem existente, processar eles
    if (orderId && pixCode && amount && tokenAmount && rate && expiresAt && cpf && fullName && birthDate) {
      const expirationTime = new Date(expiresAt);
      const now = new Date();

      if (now < expirationTime) {
        setKycData({
          cpf: decodeURIComponent(cpf),
          birthDate: decodeURIComponent(birthDate),
          fullName: decodeURIComponent(fullName),
          kycApproved: true
        });

        setQuoteData({
          amount: parseInt(amount),
          tokenAmount: parseFloat(tokenAmount),
          rate: parseFloat(rate),
          orderId: orderId,
          pixCode: decodeURIComponent(pixCode),
          expiresAt: expiresAt
        });

        setCurrentStep('payment');
        return true;
      } else {
        router.replace('/buy-pix');
      }
    } else {
      // Se não há ordem existente, verificar parâmetros de pré-preenchimento
      const tokenParam = urlParams.get('token');
      const amountParam = urlParams.get('amount');
      const amountTypeParam = urlParams.get('amountType');
      
      if (tokenParam) {
        setSelectedToken(tokenParam.toUpperCase());
      }
      
      if (amountParam) {
        setPrefilledAmount(amountParam);
      }
      
      if (amountTypeParam && (amountTypeParam === 'real' || amountTypeParam === 'token')) {
        setAmountType(amountTypeParam);
      }
    }
    return false;
  };

  const checkExistingKyc = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/kyc?wallet=${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.kyc_approved) {
          setKycData({
            cpf: data.cpf,
            birthDate: data.birth_date,
            fullName: data.full_name,
            kycApproved: data.kyc_approved,
            brlaUserId: data.brla_user_id
          });
          setCurrentStep('quote');
        } else {
          setKycData({
            cpf: data.cpf,
            birthDate: data.birth_date,
            fullName: data.full_name,
            kycApproved: false
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar KYC existente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKycSuccess = (data: KycData) => {
    setKycData(data);
    setCurrentStep('quote');
    setError(null);
  };

  const handleQuoteSuccess = (data: QuoteData) => {
    setQuoteData(data);
    setCurrentStep('payment');
    setError(null);
    
    if (data.orderId && data.pixCode && data.expiresAt && kycData) {
      const params = new URLSearchParams({
        orderId: data.orderId,
        pixCode: encodeURIComponent(data.pixCode),
        amount: data.amount.toString(),
        tokenAmount: data.tokenAmount.toString(),
        rate: data.rate.toString(),
        expiresAt: data.expiresAt,
        cpf: encodeURIComponent(kycData.cpf),
        fullName: encodeURIComponent(kycData.fullName),
        birthDate: encodeURIComponent(kycData.birthDate)
      });
      
      router.replace(`/buy-pix?${params.toString()}`);
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
    setError(null);
    router.replace('/buy-pix');
  };

  const getWalletInfo = () => {
    if (!walletAddress) return null;

    const isEmbedded = shouldUseEmbeddedWallet;
    const provider = authProvider === 'socios' ? 'Socios.com' : 'Privy';
    
    return {
      address: walletAddress,
      isEmbedded,
      provider,
      shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    };
  };

  if (!authenticated && showConnectPrompt) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Conecte sua Carteira</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Para comprar tokens via PIX, você precisa conectar sua carteira primeiro.
              </p>
              <Wallet className="h-12 w-12 mx-auto text-gray-400" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-lg md:text-3xl font-bold text-center mb-2">
              Comprar {selectedToken} com PIX
            </h1>
          </div>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${currentStep === 'kyc' ? 'text-black' : currentStep === 'quote' || currentStep === 'payment' || currentStep === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'kyc' ? 'bg-black text-white' : currentStep === 'quote' || currentStep === 'payment' || currentStep === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep === 'quote' || currentStep === 'payment' || currentStep === 'success' ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <span className="text-sm font-medium hidden sm:block ml-2">KYC</span>
              </div>
              
              <div className={`w-8 h-0.5 ${currentStep === 'quote' || currentStep === 'payment' || currentStep === 'success' ? 'bg-green-600' : 'bg-gray-200'}`} />
              
              <div className={`flex items-center ${currentStep === 'quote' ? 'text-black' : currentStep === 'payment' || currentStep === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'quote' ? 'bg-black text-white' : currentStep === 'payment' || currentStep === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep === 'payment' || currentStep === 'success' ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <span className="text-sm font-medium hidden sm:block ml-2">Cotação</span>
              </div>
              
              <div className={`w-8 h-0.5 ${currentStep === 'payment' || currentStep === 'success' ? 'bg-green-600' : 'bg-gray-200'}`} />
              
              <div className={`flex items-center ${currentStep === 'payment' ? 'text-black' : currentStep === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'payment' ? 'bg-black text-white' : currentStep === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  {currentStep === 'success' ? <CheckCircle className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium hidden sm:block ml-2">Pagamento</span>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {currentStep === 'kyc' && (
            <KycForm
              walletAddress={walletAddress!}
              existingData={kycData}
              onSuccess={handleKycSuccess}
              onError={setError}
            />
          )}

          {currentStep === 'quote' && kycData && (
            <>
              {!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress) ? (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertDescription className="text-amber-800">
                    ⚠️ Endereço da carteira inválido ou não encontrado. 
                    <br />
                    Endereço atual: {walletAddress || 'Não definido'}
                    <br />
                    Por favor, reconecte sua carteira e tente novamente.
                  </AlertDescription>
                </Alert>
              ) : (
                <QuoteForm
                  walletAddress={walletAddress}
                  kycData={kycData}
                  onSuccess={handleQuoteSuccess}
                  onError={setError}
                  onBack={() => setCurrentStep('kyc')}
                  onTokenChange={setSelectedToken}
                  prefilledAmount={prefilledAmount}
                  amountType={amountType}
                  tokens={availableTokens}
                  selectedToken={selectedToken}
                />
              )}
            </>
          )}

          {currentStep === 'payment' && quoteData && kycData && (
            <PaymentStep
              walletAddress={walletAddress!}
              kycData={kycData}
              quoteData={quoteData}
              selectedToken={selectedToken}
              onSuccess={handlePaymentSuccess}
              onError={setError}
              onBack={() => setCurrentStep('quote')}
            />
          )}

          {currentStep === 'success' && (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h2>
                <p className="text-gray-600 mb-4">
                  Seus tokens {selectedToken} foram enviados para sua carteira com sucesso.
                </p>
                <button
                  onClick={() => {
                    setCurrentStep('quote');
                    setQuoteData(null);
                    router.replace('/buy-pix');
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fazer Nova Compra
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 