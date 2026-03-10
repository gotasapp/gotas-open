'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RotateCcw,
  Copy,
  ExternalLink,
  CheckCheck,
  Send,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface MintLog {
  id: number;
  queue_id: string;
  nft_id: number;
  nft_name: string;
  user_wallet: string;
  engine_status: string;
  transaction_hash: string | null;
  block_number: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  minted_at: string | null;
  last_checked_at: string | null;
  status_category: string;
  processing_time_seconds: number | null;
}

interface MintStats {
  total: number;
  pending: number;
  minted: number;
  failed: number;
  cancelled: number;
}

export default function AdminMintsPage() {
  const router = useRouter();
  const [mints, setMints] = useState<MintLog[]>([]);
  const [stats, setStats] = useState<MintStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMint, setSelectedMint] = useState<MintLog | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sortBy, setSortBy] = useState('created_desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchMints();
    fetchStats();
  }, [statusFilter, sortBy, page]);

  const fetchMints = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('sort', sortBy);
      params.append('page', page.toString());

      const response = await fetch(`/api/adm/mints?${params}`);
      if (!response.ok) throw new Error('Failed to fetch mints');
      
      const data = await response.json();
      setMints(data.mints);
    } catch (error) {
      console.error('Error fetching mints:', error);
      toast.error('Erro ao carregar mints');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/adm/mints/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMints();
    await fetchStats();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMints();
  };

  const handleRetry = async (queueId: string) => {
    try {
      const response = await fetch('/api/adm/mints/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to retry mint');
      }

      const result = await response.json();
      toast.success(`Retry enviado com sucesso! Novo Queue ID: ${result.data.newQueueId.slice(0, 8)}...`);
      fetchMints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer retry');
    }
  };

  const handleSendToEngine = async (mintId: string) => {
    try {
      const response = await fetch('/api/adm/mints/send-to-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send mint to engine');
      }

      const result = await response.json();
      toast.success(`Enviado para Engine! Queue ID: ${result.data.queueId.slice(0, 8)}... (Token ID: ${result.data.tokenId})`);
      fetchMints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar para Engine');
    }
  };

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/adm/mints/verify');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify mints');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Atualizar dados
      await fetchMints();
      await fetchStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao verificar mints');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySingle = async (queueId: string) => {
    try {
      const response = await fetch('/api/adm/mints/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueIds: [queueId] })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify mint');
      }

      const result = await response.json();
      
      if (result.results && result.results[0]) {
        const mintResult = result.results[0];
        if (mintResult.updated) {
          toast.success(`Status atualizado: ${mintResult.oldStatus} → ${mintResult.newStatus}`);
        } else {
          toast.info(mintResult.message || 'Nenhuma alteração de status');
        }
      } else {
        toast.success('Verificação concluída');
      }
      
      // Atualizar dados
      fetchMints();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao verificar mint');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, icon: Clock, label: 'Pendente', className: '' },
      MINTED: { variant: 'default' as const, icon: CheckCircle, label: 'Mintado', className: 'bg-green-100 text-green-800' },
      FAILED: { variant: 'destructive' as const, icon: XCircle, label: 'Falhou', className: '' },
      CANCELLED: { variant: 'outline' as const, icon: AlertCircle, label: 'Cancelado', className: '' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Mints</h1>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Mintados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.minted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Falhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Buscar por wallet, queue ID ou NFT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="MINTED">Mintados</SelectItem>
            <SelectItem value="FAILED">Falhas</SelectItem>
            <SelectItem value="CANCELLED">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Mais recente</SelectItem>
            <SelectItem value="created_asc">Mais antigo</SelectItem>
            <SelectItem value="status_asc">Status (A-Z)</SelectItem>
            <SelectItem value="status_desc">Status (Z-A)</SelectItem>
            <SelectItem value="nft_name_asc">NFT (A-Z)</SelectItem>
            <SelectItem value="nft_name_desc">NFT (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mints Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue ID</TableHead>
                <TableHead>NFT</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mints.map((mint) => (
                <TableRow key={mint.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{mint.queue_id ? mint.queue_id.slice(0, 8) + '...' : 'N/A'}</code>
                      {mint.queue_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(mint.queue_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/adm/nfts/${mint.nft_id}`} className="hover:underline">
                      {mint.nft_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{mint.user_wallet.slice(0, 6)}...{mint.user_wallet.slice(-4)}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(mint.user_wallet)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(mint.engine_status)}</TableCell>
                  <TableCell>
                    {mint.transaction_hash ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs">{mint.transaction_hash.slice(0, 8)}...</code>
                        <Link
                          href={`https://scan.chiliz.com/tx/${mint.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatTime(mint.processing_time_seconds)}</TableCell>
                  <TableCell>{formatDate(mint.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedMint(mint)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!mint.queue_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSendToEngine(mint.id.toString())}
                          title="Enviar para Engine"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {mint.engine_status === 'PENDING' && mint.queue_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleVerifySingle(mint.queue_id)}
                          title="Verificar status"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {(mint.engine_status === 'FAILED' || mint.engine_status === 'PENDING') && mint.queue_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRetry(mint.queue_id)}
                          title="Reenviar para Engine"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedMint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMint(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Detalhes do Mint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Queue ID</p>
                  <p className="font-mono text-sm">{selectedMint.queue_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedMint.engine_status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">NFT</p>
                  <p>{selectedMint.nft_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuário</p>
                  <p className="font-mono text-sm">{selectedMint.user_wallet}</p>
                </div>
                {selectedMint.transaction_hash && (
                  <div>
                    <p className="text-sm text-gray-500">Transaction Hash</p>
                    <p className="font-mono text-sm">{selectedMint.transaction_hash}</p>
                  </div>
                )}
                {selectedMint.block_number && (
                  <div>
                    <p className="text-sm text-gray-500">Block Number</p>
                    <p>{selectedMint.block_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Retry Count</p>
                  <p>{selectedMint.retry_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Criado em</p>
                  <p>{formatDate(selectedMint.created_at)}</p>
                </div>
                {selectedMint.minted_at && (
                  <div>
                    <p className="text-sm text-gray-500">Mintado em</p>
                    <p>{formatDate(selectedMint.minted_at)}</p>
                  </div>
                )}
                {selectedMint.last_checked_at && (
                  <div>
                    <p className="text-sm text-gray-500">Última verificação</p>
                    <p>{formatDate(selectedMint.last_checked_at)}</p>
                  </div>
                )}
              </div>
              {selectedMint.error_message && (
                <div>
                  <p className="text-sm text-gray-500">Erro</p>
                  <p className="text-red-600 text-sm">{selectedMint.error_message}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMint(null)}>
                  Fechar
                </Button>
                {!selectedMint.queue_id && (
                  <Button onClick={() => {
                    handleSendToEngine(selectedMint.id.toString());
                    setSelectedMint(null);
                  }} variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para Engine
                  </Button>
                )}
                {selectedMint.engine_status === 'PENDING' && selectedMint.queue_id && (
                  <Button onClick={() => {
                    handleVerifySingle(selectedMint.queue_id);
                    setSelectedMint(null);
                  }} variant="outline">
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Verificar Status
                  </Button>
                )}
                {(selectedMint.engine_status === 'FAILED' || selectedMint.engine_status === 'PENDING') && selectedMint.queue_id && (
                  <Button onClick={() => {
                    handleRetry(selectedMint.queue_id);
                    setSelectedMint(null);
                  }}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reenviar para Engine
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}