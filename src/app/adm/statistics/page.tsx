'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  RefreshCw,
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  Download,
  Clock,
  Award,
  Target,
  Zap,
  Calendar,
  PieChart,
  LineChart,
} from 'lucide-react';
import { Chart, BarChart, PieChart as CustomPieChart, LineChart as CustomLineChart } from '@/components/ui/chart';

interface AdoptionStats {
  uniqueUsers: number;
  totalMints: number;
  successfulMints: number;
  uniqueAssets: number;
  activeUsers: number;
  successRate: number;
  userEngagementRate: number;
  avgMintsPerUser: number;
  avgMintTime: number | null;
  dailyMints: Array<{ date: string; count: number }>;
  timeFilter: string;
}

interface DistributionStats {
  rarityDistribution: Array<{
    rarity: string;
    mintCount: number;
    uniqueOwners: number;
    percentage: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    originalCategory: string;
    mintCount: number;
    uniqueOwners: number;
    percentage: number;
  }>;
  topNFTs: Array<{
    id: number;
    name: string;
    title?: string;
    rarity: string;
    category: string;
    originalCategory: string;
    totalSupply: number;
    claimedSupply: number;
    mintCount: number;
    uniqueOwners: number;
    availabilityPercentage: number;
  }>;
  supplyDistribution: Array<{
    status: string;
    count: number;
  }>;
  timeFilter: string;
}

interface StakingStats {
  eligibleStakers: number;
  totalStakeableNFTs: number;
  estimatedActiveStakers: number;
  estimatedStakingRate: number;
  estimatedStakingValue: number;
  stakingPotentialByRarity: Array<{
    rarity: string;
    nftCount: number;
    uniqueHolders: number;
    tokenRequirement: number;
    estimatedTokensNeeded: number;
    estimatedValue?: number;
  }>;
  topMultiHolders: Array<{
    wallet: string;
    nftCount: number;
  }>;
  stakingByCategory: Array<{
    category: string;
    nftCount: number;
    uniqueHolders: number;
  }>;
  monthlyActivity: Array<{
    month: string;
    activeUsers: number;
    totalActivity: number;
  }>;
  timeFilter: string;
}

interface ClubStats {
  clubEngagement: Array<{
    club_name: string;
    image_url: string;
    total_mints: number;
    successful_mints: number;
    unique_collectors: number;
    unique_nfts: number;
    conversion_rate: number;
    avg_mint_time: number | null;
    rarityDistribution: { [key: string]: number };
    topCollectors: Array<{
      wallet: string;
      assetCount: number;
      mintCount: number;
      collectionCount?: number;
      uniqueRarities: number;
    }>;
    recentActivity: Array<{
      date: string;
      dailyMints: number;
      dailyUsers: number;
    }>;
  }>;
  summary: {
    totalClubs: number;
    totalMints: number;
    totalCollectors: number;
    avgConversionRate: number;
  };
  timeFilter: string;
}

interface ActivityStats {
  recentMints: Array<{
    id: number;
    queueId: string;
    userWallet: string;
    status: string;
    createdAt: string;
    mintedAt: string | null;
    nftTitle: string;
    rarity: string;
    category: string;
    categoryImage: string;
  }>;
  newUsers: Array<{
    walletAddress: string;
    username: string | null;
    displayName: string | null;
    joinedAt: string;
  }>;
  hourlyActivity: Array<{
    hour: number;
    count: number;
  }>;
  activityPeaks: Array<{
    date: string;
    totalMints: number;
    successfulMints: number;
    uniqueUsers: number;
  }>;
  recentErrors: Array<{
    userWallet: string;
    errorMessage: string;
    timestamp: string;
    nftTitle: string;
    category: string;
  }>;
  activeUsers: Array<{
    wallet: string;
    totalMints: number;
    successfulMints: number;
    lastActivity: string;
    uniqueNfts: number;
    successRate: number;
  }>;
  realTimeStats: {
    lastHourMints: number;
    last24hMints: number;
    last7dMints: number;
    pendingMints: number;
    recentFailures: number;
  };
}

export default function AdminStatisticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('adoption');
  const [timeFilter, setTimeFilter] = useState('total');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [adoptionStats, setAdoptionStats] = useState<AdoptionStats | null>(null);
  const [distributionStats, setDistributionStats] = useState<DistributionStats | null>(null);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [clubStats, setClubStats] = useState<ClubStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);

  const fetchAdoptionStats = async () => {
    try {
      const response = await fetch(`/api/adm/statistics/adoption?timeFilter=${timeFilter}`);
      if (!response.ok) throw new Error('Failed to fetch adoption stats');
      const data = await response.json();
      setAdoptionStats(data);
    } catch (error) {
      console.error('Error fetching adoption stats:', error);
      toast.error('Erro ao carregar estatísticas de adoção');
    }
  };

  const fetchDistributionStats = async () => {
    try {
      console.log('Fetching distribution stats...');
      const response = await fetch(`/api/adm/statistics/distribution?timeFilter=${timeFilter}`);
      console.log('Distribution response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Distribution API error:', errorText);
        throw new Error(`Failed to fetch distribution stats: ${response.status}`);
      }
      const data = await response.json();
      console.log('Distribution data received:', data);
      setDistributionStats(data);
    } catch (error) {
      console.error('Error fetching distribution stats:', error);
      toast.error('Erro ao carregar estatísticas de distribuição');
    }
  };

  const fetchStakingStats = async () => {
    try {
      const response = await fetch(`/api/adm/statistics/staking?timeFilter=${timeFilter}`);
      if (!response.ok) throw new Error('Failed to fetch staking stats');
      const data = await response.json();
      setStakingStats(data);
    } catch (error) {
      console.error('Error fetching staking stats:', error);
      toast.error('Erro ao carregar estatísticas de staking');
    }
  };

  const fetchClubStats = async () => {
    try {
      const response = await fetch(`/api/adm/statistics/clubs?timeFilter=${timeFilter}`);
      if (!response.ok) throw new Error('Failed to fetch club stats');
      const data = await response.json();
      setClubStats(data);
    } catch (error) {
      console.error('Error fetching club stats:', error);
      toast.error('Erro ao carregar estatísticas de clubes');
    }
  };

  const fetchActivityStats = async () => {
    try {
      const response = await fetch('/api/adm/statistics/activity');
      if (!response.ok) throw new Error('Failed to fetch activity stats');
      const data = await response.json();
      setActivityStats(data);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      toast.error('Erro ao carregar estatísticas de atividade');
    }
  };

  const fetchAllStats = async () => {
    await Promise.all([
      fetchAdoptionStats(),
      fetchDistributionStats(),
      fetchStakingStats(),
      fetchClubStats(),
      fetchActivityStats(),
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllStats();
    setIsRefreshing(false);
    toast.success('Estatísticas atualizadas');
  };

  const handleTimeFilterChange = async (newFilter: string) => {
    setTimeFilter(newFilter);
    setIsRefreshing(true);
    // Activity stats não usa filtro de tempo
    await Promise.all([
      fetchAdoptionStats(),
      fetchDistributionStats(),
      fetchStakingStats(),
      fetchClubStats(),
    ]);
    setIsRefreshing(false);
  };

  const exportToExcel = async () => {
    try {
      const dataToExport = {
        adoption: adoptionStats,
        distribution: distributionStats,
        staking: stakingStats,
        clubs: clubStats,
        activity: activityStats,
        timeFilter,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `socios-statistics-${timeFilter}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchAllStats();
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      handleTimeFilterChange(timeFilter);
    }
  }, [timeFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, label: 'Pendente' },
      MINTED: { variant: 'default' as const, label: 'Mintado', className: 'bg-green-100 text-green-800' },
      FAILED: { variant: 'destructive' as const, label: 'Falhou' },
      CANCELLED: { variant: 'outline' as const, label: 'Cancelado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <Badge variant={config.variant} className={'className' in config ? config.className : ''}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Estatísticas Avançadas</h1>
          <p className="text-gray-500">Dashboard completo de métricas e analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Todos os Tempos</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="day">Último Dia</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Real-time Overview */}
      {activityStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Última Hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityStats.realTimeStats.lastHourMints}</div>
              <p className="text-xs text-gray-500">mints</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                24 Horas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityStats.realTimeStats.last24hMints}</div>
              <p className="text-xs text-gray-500">mints</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityStats.realTimeStats.last7dMints}</div>
              <p className="text-xs text-gray-500">mints</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Falhas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityStats.realTimeStats.recentFailures}</div>
              <p className="text-xs text-gray-500">última hora</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Statistics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="adoption" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Adoção
          </TabsTrigger>
          <TabsTrigger value="staking" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Staking
          </TabsTrigger>
          <TabsTrigger value="clubs" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Clubes
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividade
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Distribuição
          </TabsTrigger>
        </TabsList>

        {/* Adoption Tab */}
        <TabsContent value="adoption" className="space-y-6">
          {adoptionStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adoptionStats.uniqueUsers.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">registrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Mints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adoptionStats.totalMints.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">{adoptionStats.successRate.toFixed(1)}% sucesso</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adoptionStats.activeUsers.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">{adoptionStats.userEngagementRate.toFixed(1)}% engajamento</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Mints por Usuário</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adoptionStats.avgMintsPerUser.toFixed(1)}</div>
                    <p className="text-xs text-gray-500">média</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart title="Mints Diários" description="Atividade dos últimos 7 dias">
                  <CustomLineChart 
                    data={adoptionStats.dailyMints.map(item => ({
                      name: new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
                      value: item.count
                    }))}
                    height={250}
                  />
                </Chart>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Métricas de Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                      <span className="font-medium">{adoptionStats.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Engajamento de Usuários</span>
                      <span className="font-medium">{adoptionStats.userEngagementRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Assets Únicos</span>
                      <span className="font-medium">{adoptionStats.uniqueAssets.toLocaleString()}</span>
                    </div>
                    {adoptionStats.avgMintTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tempo Médio de Mint</span>
                        <span className="font-medium">{adoptionStats.avgMintTime}s</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          {distributionStats && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart title="Distribuição por Raridade" description="Percentual de mints por raridade">
                  <CustomPieChart 
                    data={distributionStats.rarityDistribution.map((item, index) => ({
                      name: item.rarity,
                      value: item.mintCount,
                      color: ['#3b82f6', '#8b5cf6', '#f59e0b'][index] || '#6b7280'
                    }))}
                    size={300}
                  />
                </Chart>

                <Chart title="Distribuição por Categoria" description="Mints por categoria/clube">
                  <BarChart 
                    data={distributionStats.categoryDistribution.slice(0, 8).map((item, index) => ({
                      name: item.category.length > 10 ? item.category.substring(0, 10) + '...' : item.category,
                      value: item.mintCount,
                      percentage: item.percentage,
                      color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'][index % 8]
                    }))}
                    height={250}
                  />
                </Chart>
              </div>

            </>
          )}
          {!distributionStats && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Carregando dados de distribuição...</p>
                <p className="text-sm text-gray-400">Se persistir, verifique os logs do servidor</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Staking Tab */}
        <TabsContent value="staking" className="space-y-6">
          {stakingStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Stakers Elegíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stakingStats.eligibleStakers.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">com NFTs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">NFTs Stakeáveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stakingStats.totalStakeableNFTs.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">disponíveis</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Stakers Estimados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stakingStats.estimatedActiveStakers.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">{stakingStats.estimatedStakingRate.toFixed(1)}% taxa</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stakingStats.estimatedStakingValue.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">pontos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart title="Potencial por Raridade" description="NFTs disponíveis para staking">
                  <BarChart 
                    data={stakingStats.stakingPotentialByRarity.map((item, index) => ({
                      name: item.rarity,
                      value: item.nftCount,
                      percentage: 0,
                      color: ['bg-gray-500', 'bg-purple-500', 'bg-yellow-500'][index] || 'bg-gray-400'
                    }))}
                    height={200}
                  />
                </Chart>

                <Chart title="Staking por Categoria" description="Distribuição por clube">
                  <BarChart 
                    data={stakingStats.stakingByCategory.slice(0, 6).map((item, index) => ({
                      name: item.category.length > 8 ? item.category.substring(0, 8) + '...' : item.category,
                      value: item.nftCount,
                      percentage: 0,
                      color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'][index % 6]
                    }))}
                    height={200}
                  />
                </Chart>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Top Multi-Holders</CardTitle>
                  <p className="text-sm text-gray-500">Usuários com maior potencial de staking</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stakingStats.topMultiHolders.slice(0, 10).map((holder, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <code className="text-sm">{formatWallet(holder.wallet)}</code>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{holder.nftCount} NFTs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Clubs Tab */}
        <TabsContent value="clubs" className="space-y-6">
          {clubStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Clubes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clubStats.summary.totalClubs}</div>
                    <p className="text-xs text-gray-500">ativos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Mints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clubStats.summary.totalMints.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">todos os clubes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Colecionadores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clubStats.summary.totalCollectors.toLocaleString()}</div>
                    <p className="text-xs text-gray-500">únicos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clubStats.summary.avgConversionRate.toFixed(1)}%</div>
                    <p className="text-xs text-gray-500">média</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {clubStats.clubEngagement.map((club, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {club.image_url && (
                          <img src={club.image_url} alt={club.club_name} className="w-8 h-8 rounded" />
                        )}
                        <div>
                          <CardTitle className="text-lg font-semibold">{club.club_name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Colecionadores únicos</p>
                          <p className="text-xl font-bold">{club.unique_collectors.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total de Mints</p>
                          <p className="text-xl font-bold">{club.total_mints.toLocaleString()}</p>
                        </div>
                      </div>

                      {club.topCollectors.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Top Collectors</h4>
                          <div className="space-y-1">
                            {club.topCollectors.slice(0, 3).map((collector, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <code>{formatWallet(collector.wallet)}</code>
                                <span>{collector.assetCount} assets</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          {activityStats && (
            <>
              {/* Full width hourly activity chart */}
              <Chart title="Atividade por Hora" description="Últimas 24 horas">
                <BarChart 
                  data={activityStats.hourlyActivity.map(item => ({
                    name: `${item.hour}h`,
                    value: item.count,
                    percentage: 0,
                    color: 'bg-blue-500'
                  }))}
                  height={250}
                />
              </Chart>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Usuários Mais Ativos</CardTitle>
                    <p className="text-sm text-gray-500">Últimos 30 dias</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activityStats.activeUsers.slice(0, 8).map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{formatWallet(user.wallet)}</code>
                            <a 
                              href={`https://cards.gotas.com/user${user.wallet.slice(-4)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 text-xs"
                            >
                              [perfil]
                            </a>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{user.totalMints} mints</p>
                            <p className="text-xs text-gray-500">{user.successRate.toFixed(1)}% sucesso</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Mints Recentes</CardTitle>
                    <p className="text-sm text-gray-500">Últimas atividades</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activityStats.recentMints.slice(0, 20).map((mint, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {mint.categoryImage && (
                              <img src={mint.categoryImage} alt={mint.category} className="w-6 h-6 rounded" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{mint.nftTitle}</p>
                              <p className="text-xs text-gray-500">{formatWallet(mint.userWallet)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(mint.status)}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(mint.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Novos Usuários</CardTitle>
                    <p className="text-sm text-gray-500">Últimos 30 dias</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {activityStats.newUsers.slice(0, 15).map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <code className="text-sm">{formatWallet(user.walletAddress)}</code>
                            {user.username && (
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(user.joinedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {activityStats.recentErrors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-red-600">Erros Recentes</CardTitle>
                    <p className="text-sm text-gray-500">Últimas falhas reportadas</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {activityStats.recentErrors.slice(0, 10).map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <code className="text-sm">{formatWallet(error.userWallet)}</code>
                            <p className="text-xs text-gray-500">{formatDate(error.timestamp)}</p>
                          </div>
                          <p className="text-sm font-medium">{error.nftTitle}</p>
                          <p className="text-xs text-red-600 mt-1">{error.errorMessage}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}