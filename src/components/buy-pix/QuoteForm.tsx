'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, ArrowLeft, Coins } from 'lucide-react';
import { KycData, QuoteData } from './BuyPixPage';
import { trackPixInitiated } from '@/lib/gtag';
import { trackSeedtagPurchaseClick } from '@/lib/seedtag';

interface Token {
  id?: string;
  symbol: string;
  name: string;
  description?: string;
  icon_url?: string;
  token_id_internal?: string;
  is_fan_token?: boolean;
}

interface QuoteFormProps {
  walletAddress: string;
  kycData: KycData;
  onSuccess: (data: QuoteData) => void;
  onError: (error: string) => void;
  onBack: () => void;
  onTokenChange?: (token: string) => void;
  prefilledAmount?: string | null;
  amountType?: 'real' | 'token';
  tokens?: Token[];
  selectedToken?: string;
}

export function QuoteForm({ walletAddress, kycData, onSuccess, onError, onBack, onTokenChange, prefilledAmount, amountType = 'real', tokens, selectedToken: initialSelectedToken }: QuoteFormProps) {
  const [amount, setAmount] = useState('');
  const [inputType, setInputType] = useState<'real' | 'token'>(amountType);
  const [selectedToken, setSelectedToken] = useState<string>(initialSelectedToken || 'CHZ');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [gettingQuote, setGettingQuote] = useState(false);
  const [kycPending, setKycPending] = useState(false);

  useEffect(() => {
    fetchAvailableTokens();
  }, []);

  useEffect(() => {
    if (prefilledAmount && !amount) {
      setAmount(prefilledAmount);
    }
  }, [prefilledAmount]);

  useEffect(() => {
    if (initialSelectedToken && initialSelectedToken !== selectedToken) {
      setSelectedToken(initialSelectedToken);
    }
  }, [initialSelectedToken]);

  useEffect(() => {
    // Definir o modo baseado no tipo de token
    const selectedTokenInfo = availableTokens.find(token => token.symbol === selectedToken);
    const isFanToken = selectedTokenInfo?.is_fan_token || false;
    
    if (isFanToken) {
      setInputType('token'); // Fan tokens sempre em modo token
    } else {
      setInputType('real'); // CHZ sempre em modo real
    }
  }, [selectedToken, availableTokens]);

  useEffect(() => {
    if (amount && selectedToken && !gettingQuote && !loading) {
      const timeoutId = setTimeout(() => {
        getQuote();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [amount, selectedToken, inputType]);

  const fetchAvailableTokens = async () => {
    // Se tokens foram passados via props, usar eles
    if (tokens && tokens.length > 0) {
      setAvailableTokens(tokens);
      setLoadingTokens(false);
      return;
    }

    // Caso contrário, buscar via API (fallback)
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
        description: 'Chiliz Token',
        icon_url: '/tokens/chz.png',
        token_id_internal: 'chz',
        is_fan_token: false
      }]);
    } finally {
      setLoadingTokens(false);
    }
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

  const handleAmountChange = (value: string) => {
    if (inputType === 'real') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue) {
        const formattedValue = (parseInt(numericValue) / 100).toFixed(2);
        setAmount(formattedValue);
      } else {
        setAmount('');
      }
    } else {
      // Para tokens, permitir decimais
      const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      setAmount(numericValue);
    }
    setQuote(null);
  };

  const handleTokenChange = (tokenSymbol: string) => {
    setSelectedToken(tokenSymbol);
    setQuote(null);
    onTokenChange?.(tokenSymbol);
  };

  const getQuote = async () => {
    if (!amount || !selectedToken) return;

    setGettingQuote(true);
    setQuote(null);

    try {
      // Buscar informações do token selecionado
      const selectedTokenInfo = availableTokens.find(token => token.symbol === selectedToken);
      const isFanToken = selectedTokenInfo?.is_fan_token || false;

      let requestAmount: number;
      let requestMode: string;

      if (inputType === 'real') {
        // Modo real: converter para centavos
        requestAmount = Math.round(parseFloat(amount) * 100);
        requestMode = 'real';
      } else {
        // Modo token: usar quantidade diretamente
        requestAmount = parseFloat(amount);
        requestMode = 'token';
      }

      const response = await fetch('/api/brla/fast-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: selectedToken,
          amount: requestAmount,
          mode: requestMode,
          walletAddress
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao obter cotação');
      }

      setQuote(data);
    } catch (error) {
      console.error('Erro ao obter cotação:', error);
      setQuote(null);
    } finally {
      setGettingQuote(false);
    }
  };

  const confirmPurchase = async () => {
    if (!quote || !amount) return;

    // Validar endereço da carteira usando regex mais robusta
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddress || !ethAddressRegex.test(walletAddress)) {
      onError('Endereço da carteira inválido. Deve ser um endereço Ethereum válido (formato: 0x seguido de 40 caracteres hexadecimais). Verifique se sua carteira está conectada corretamente.');
      return;
    }

    setLoading(true);
    setKycPending(false);
    onError('');

    // Sempre usar o valor em reais da cotação (quote.amountBrl convertido para centavos)
    const realAmountInCents = quote.amountBrl ? Math.round(parseFloat(quote.amountBrl) * 100) : Math.round(parseFloat(amount) * 100);

    try {
      const requestData: any = {
        taxId: kycData.cpf,
        amount: realAmountInCents,
        token: selectedToken,
        markup: '0.04',
        receiverAddress: walletAddress,
        markupAddress: process.env.NEXT_PUBLIC_BRLA_MARKUP_WALLET || '',
        externalId: `${Date.now()}-${walletAddress.slice(-6)}`
      };

      // Para fan tokens, incluir o token JWT da cotação
      const selectedTokenInfo = availableTokens.find(token => token.symbol === selectedToken);
      const isFanToken = selectedTokenInfo?.is_fan_token || false;
      
      if (isFanToken && quote.token) {
        requestData.quoteToken = quote.token;
      }
      
      const response = await fetch('/api/brla/pix-to-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Tratar erros específicos da BRLA
        let errorMessage = data.error || 'Erro ao criar ordem de compra';
        
        if (data.details) {
          const details = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
          
          // Verificar se é erro de limite de KYC
          if (details.includes('goes beyond limit for current kyc')) {
            const limitMatch = details.match(/can spend at most R\$([0-9,]+\.[0-9]{2})/);
            const limit = limitMatch ? limitMatch[1] : '500,00';
            errorMessage = `Valor excede o limite do seu KYC. Limite máximo: R$ ${limit}`;
          }
          // Verificar se é erro de KYC pendente
          else if (details.includes('user must pass KYC first')) {
            setKycPending(true);
            errorMessage = 'KYC pendente na BRLA. Isso pode levar alguns minutos para ser processado. Tente novamente em alguns instantes.';
          }
          // Verificar se é erro de endereço inválido
          else if (details.includes('invalid receiverAddress')) {
            errorMessage = 'Endereço da carteira inválido. Verifique se sua carteira está conectada corretamente e se o endereço está no formato correto (0x...).';
          }
          // Verificar se é erro de valor mínimo
          else if (details.includes('minimum amount')) {
            errorMessage = 'Valor mínimo para compra é R$ 10,00';
          }
        }
        
        throw new Error(errorMessage);
      }

      const tokenAmount = parseFloat(quote.amountToken || '0');
      const realAmount = realAmountInCents / 100;
      const quoteData: QuoteData = {
        amount: realAmount,
        tokenAmount: tokenAmount,
        rate: tokenAmount > 0 ? realAmount / tokenAmount : 0,
        orderId: data.id || data.orderId,
        pixCode: data.brCode || data.pixCode || data.pix_code,
        pixQrCode: data.pixQrCode || data.pix_qr_code || data.qr_code,
        expiresAt: data.due || data.expiresAt || data.expires_at
      };

      localStorage.setItem('brla-order', JSON.stringify({
        ...quoteData,
        createdAt: Date.now(),
        walletAddress,
        kycData,
        selectedToken
      }));

      // Rastrear início do pagamento PIX
      trackPixInitiated();
      
      // Rastrear clique no botão de compra para Seedtag
      trackSeedtagPurchaseClick();
      
      onSuccess(quoteData);
    } catch (error) {
      console.error('Erro na compra:', error);
      onError(error instanceof Error ? error.message : 'Erro ao criar ordem de compra');
    } finally {
      setLoading(false);
    }
  };

  const checkKycStatus = async () => {
    setLoading(true);
    onError('');
    
    try {
      // Tentar fazer uma nova cotação para verificar se o KYC foi processado
      await getQuote();
      setKycPending(false);
    } catch (error) {
      console.error('Erro ao verificar status do KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cotação {selectedToken}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 h-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="max-w-[600px]">
            <Label htmlFor="token" className="mb-2 block">Token</Label>
                         <Select
               value={selectedToken}
               onValueChange={(value) => handleTokenChange(value)}
               disabled={loading || gettingQuote}
             >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Selecione um token">
                  {selectedToken && availableTokens.length > 0 && (() => {
                    const token = availableTokens.find(t => t.symbol === selectedToken);
                    return token ? (
                      <div className="flex items-center gap-2">
                        {token.icon_url ? (
                          <img 
                            src={token.icon_url} 
                            alt={token.symbol}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-sm text-gray-500">- {token.name}</span>
                      </div>
                    ) : selectedToken;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      {token.icon_url ? (
                        <img 
                          src={token.icon_url} 
                          alt={token.symbol}
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                          {token.symbol.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-sm text-gray-500">- {token.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="amount" className="block">
                {inputType === 'real' ? 'Valor em Reais (R$)' : `Quantidade de ${selectedToken}`}
              </Label>
            </div>
            <Input
              id="amount"
              type="text"
              value={inputType === 'real' 
                ? (amount ? formatCurrency(parseFloat(amount)) : '') 
                : amount
              }
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder={inputType === 'real' ? 'R$ 0,00' : `0.000000 ${selectedToken}`}
              disabled={loading || gettingQuote}
              className="text-[17px] font-bold"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="text-sm text-gray-500">
                <p>
                  {inputType === 'real' 
                    ? 'Valor mínimo: R$ 10,00' 
                    : 'Quantidade mínima equivalente a R$ 10,00'
                  }
                </p>
                {inputType === 'real' && parseFloat(amount || '0') > 500 && (
                  <p className="text-amber-600 font-medium">
                    ⚠️ Valores acima de R$ 500,00 podem exceder seu limite de KYC
                  </p>
                )}
              </div>
              {gettingQuote && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Obtendo cotação...
                </div>
              )}
            </div>
          </div>

          {quote && (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="h-5 w-5 text-black" />
                    <h3 className="font-semibold text-black">Cotação Atual</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Você paga</p>
                      <p className="text-lg font-bold text-black">
                        {inputType === 'real' 
                          ? formatCurrency(parseFloat(amount))
                          : formatCurrency(parseFloat(quote.amountBrl || '0'))
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Você recebe</p>
                      <p className="text-lg font-bold text-black">
                        {inputType === 'token'
                          ? `${formatTokenAmount(parseFloat(amount))} ${selectedToken}`
                          : `${formatTokenAmount(parseFloat(quote.amountToken || '0'))} ${selectedToken}`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Taxa de conversão:</span>
                      <span className="font-medium text-black">
                        1 {selectedToken} = {(() => {
                          const amountBrl = parseFloat(quote.amountBrl || '0');
                          const amountToken = parseFloat(quote.amountToken || '0');
                          if (amountToken > 0) {
                            return formatCurrency(amountBrl / amountToken);
                          }
                          return 'N/A';
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Taxa de serviço:</span>
                      <span className="font-medium text-black">{formatCurrency(parseFloat(quote.markupFee || '0'))}</span>
                    </div>
                  </div>

                  {(() => {
                    // Validar valor mínimo de R$ 10,00
                    const totalValue = parseFloat(quote.amountBrl || '0');
                    const isValidAmount = totalValue >= 10;

                    if (!isValidAmount) {
                      return (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800">
                            ⚠️ Valor mínimo para compra é R$ 10,00. 
                            {inputType === 'token' 
                              ? ` Aumente a quantidade de ${selectedToken}.`
                              : ' Aumente o valor em reais.'
                            }
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Button
                        onClick={confirmPurchase}
                        disabled={loading}
                        className="w-full mt-4 bg-black text-white hover:bg-gray-800 py-6"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando ordem...
                          </>
                        ) : (
                          'Confirmar Compra'
                        )}
                      </Button>
                    );
                  })()}

                  {kycPending && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 mb-3">
                        ⏳ Seu KYC está sendo processado pela BRLA. Isso pode levar alguns minutos.
                      </p>
                      <Button
                        onClick={checkKycStatus}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verificar Status do KYC
                          </>
                        ) : (
                          'Verificar Status do KYC'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• A cotação é válida por alguns minutos</p>
            <p>• Os tokens serão enviados para sua carteira após confirmação do pagamento</p>
            <p>• Tempo limite para pagamento: 10 minutos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
