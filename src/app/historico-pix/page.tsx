'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Header } from '@/components/header';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, CreditCard, Copy, ExternalLink, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PixToTokenOp {
  id: string;
  token: string;
  amountBrl: string;
  amountUsd: string;
  amountToken: string;
  receiverAddress: string;
  createdAt: string;
  smartContractOps?: Array<{
    tx: string;
    posted: boolean;
  }>;
}

interface Transaction {
  id: string;
  token: string;
  taxId: string;
  referenceLabel: string;
  externalId: string;
  walletAddress: string;
  amountBrl: number;
  status: string;
  payerName: string;
  createdAt: string;
  updatedAt: string;
  pixToTokenOps: PixToTokenOp[];
}

interface UserWallet {
  wallet_address: string;
  full_name: string;
}

interface UserInfo {
  cpf: string;
  name: string;
  wallets: UserWallet[];
  currentWallet: string;
}

interface HistoryResponse {
  depositsLogs: Transaction[];
  totalCount: number;
  userInfo: UserInfo;
  error?: string;
}

export default function HistoricoPix() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async (walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/brla/history?walletAddress=${walletAddress}`);
      const data: HistoryResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar histórico');
      }

      setTransactions(data.depositsLogs || []);
      setUserInfo(data.userInfo);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) {
      router.push('/');
      return;
    }

    fetchHistory(user.wallet.address);
  }, [authenticated, user, router]);

  const handleRefresh = () => {
    if (user?.wallet?.address) {
      fetchHistory(user.wallet.address);
    }
  };

  const formatCPF = (cpf: string) => {
    // Mascarar CPF: mostrar apenas 3 primeiros e 3 últimos dígitos
    if (cpf.length >= 6) {
      const first3 = cpf.slice(0, 3);
      const last3 = cpf.slice(-3);
      return `${first3}.***.***-${last3}`;
    }
    return cpf;
  };

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100); // BRLA retorna valores em centavos
  };

  const formatTokenAmount = (amount: string, token: string) => {
    const value = parseFloat(amount);
    return `${value.toFixed(6)} ${token}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PAID': { label: 'Pago', variant: 'default' as const },
      'PENDING': { label: 'Pendente', variant: 'secondary' as const },
      'FAILED': { label: 'Falhou', variant: 'destructive' as const },
      'CANCELLED': { label: 'Cancelado', variant: 'outline' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const openInExplorer = (txHash: string, token: string) => {
    let explorerUrl = '';
    
    // Determinar o explorer baseado no token
    if (token === 'CHZ') {
      explorerUrl = `https://scan.chiliz.com/tx/${txHash}`;
    } else if (token === 'MATIC') {
      explorerUrl = `https://polygonscan.com/tx/${txHash}`;
    } else {
      explorerUrl = `https://etherscan.io/tx/${txHash}`;
    }
    
    window.open(explorerUrl, '_blank');
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Histórico de Compras PIX</h1>
                <p className="text-gray-600">Todas as suas transações de compra de fan tokens via PIX</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* User Info Card */}
          {userInfo && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nome</label>
                    <p className="text-lg font-semibold">{userInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">CPF</label>
                    <p className="text-lg font-semibold">{formatCPF(userInfo.cpf)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Carregando histórico...</span>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h3>
                <p className="text-gray-600 text-center mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma transação encontrada</h3>
                <p className="text-gray-600 text-center mb-4">
                  Não foram encontradas transações PIX para o CPF {userInfo ? formatCPF(userInfo.cpf) : ''}.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Verifique se você já realizou compras com este CPF na plataforma BRLA.
                </p>
                <Button
                  onClick={() => {
                    const url = 'https://chiliz.gotas.com/?all=true';
                    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
                    alert('Abriremos a compra em uma nova aba.\nSe a nova aba não abrir, verifique se o navegador bloqueou pop-ups e permita abrir janelas para este site.');
                    if (!newTab || newTab.closed) {
                      window.location.href = url;
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Comprar Fan Tokens
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Transações ({transactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Data/Hora</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Valor BRL</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Token/Moeda</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Quantidade</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Pagador</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Hash da Transação</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">ID do Pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="text-sm">
                              {formatDate(transaction.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(transaction.status)}
                          </td>
                          <td className="py-3 px-2 font-semibold">
                            {formatCurrency(transaction.amountBrl)}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{transaction.token}</Badge>
                          </td>
                          <td className="py-3 px-2">
                            {transaction.pixToTokenOps && transaction.pixToTokenOps.length > 0 ? (
                              <div className="text-sm">
                                {formatTokenAmount(transaction.pixToTokenOps[0].amountToken, transaction.token)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-sm">{transaction.payerName}</div>
                          </td>
                          <td className="py-3 px-2">
                            {transaction.pixToTokenOps && 
                             transaction.pixToTokenOps.length > 0 && 
                             transaction.pixToTokenOps[0].smartContractOps &&
                             transaction.pixToTokenOps[0].smartContractOps.length > 0 &&
                             transaction.pixToTokenOps[0].smartContractOps[0].tx ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {transaction.pixToTokenOps[0].smartContractOps[0].tx.slice(0, 8)}...
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(transaction.pixToTokenOps[0].smartContractOps![0].tx)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openInExplorer(transaction.pixToTokenOps[0].smartContractOps![0].tx, transaction.token)}
                                  className="h-6 w-6 p-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {transaction.id.slice(0, 8)}...
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(transaction.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 
