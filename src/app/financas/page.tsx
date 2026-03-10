'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  PieChart,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Wallet,
  Home,
  Car,
  Utensils,
  ShoppingCart,
  Heart,
  Book,
  Film,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Estrutura de dados sem valores mockados
interface FinanceData {
  summary: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    netIncome: number;
  };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    color: string;
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    account: string;
    icon: any;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
    color: string;
    period: string;
  }>;
  goals: Array<{
    id: string;
    name: string;
    current: number;
    target: number;
    percentage: number;
    targetDate: string;
    priority: string;
    category: string;
  }>;
}

const categoryIcons = {
  'Alimentação': Utensils,
  'Transporte': Car,
  'Moradia': Home,
  'Entretenimento': Film,
  'Saúde': Heart,
  'Educação': Book,
  'Salário': Briefcase,
  'Compras': ShoppingCart
};

export default function FinancasPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        // Buscar dados reais da API
        const response = await fetch('/api/finance/summary');
        if (response.ok) {
          const financeData = await response.json();
          setData(financeData);
        } else {
          console.error('Erro ao carregar dados financeiros:', response.status);
        }
      } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [selectedPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dados financeiros...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Controle Financeiro</h1>
              <p className="text-slate-600 mt-1">Gerencie suas finanças pessoais de forma inteligente</p>
            </div>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Módulo Financeiro em Desenvolvimento
                </h3>
                <p className="text-gray-600 mb-6">
                  Esta funcionalidade estará disponível em breve.
                </p>
                <p className="text-sm text-gray-500">
                  Aqui você poderá gerenciar suas finanças, acompanhar gastos e receitas, 
                  definir orçamentos e metas financeiras.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Controle Financeiro</h1>
            <p className="text-slate-600 mt-1">Gerencie suas finanças pessoais de forma inteligente</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Saldo Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalBalance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Receitas (Mês)</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.monthlyIncome)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Despesas (Mês)</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.monthlyExpenses)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Taxa de Poupança</p>
                  <p className="text-2xl font-bold">{formatPercentage(data.summary.savingsRate)}</p>
                </div>
                <Target className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transactions and Budgets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transações Recentes</CardTitle>
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma transação encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.recentTransactions.map((transaction) => {
                      const IconComponent = transaction.icon || DollarSign;
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                            )}>
                              <IconComponent className={cn(
                                "h-4 w-4",
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              )} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{transaction.description}</p>
                              <p className="text-sm text-slate-500">{transaction.category} • {transaction.account}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-semibold",
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            )}>
                              {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-slate-500">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budgets */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Orçamentos</CardTitle>
                  <Button variant="ghost" size="sm">Gerenciar</Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.budgets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhum orçamento definido</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {data.budgets.map((budget) => (
                      <div key={budget.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-slate-900">{budget.name}</p>
                            <p className="text-sm text-slate-500">
                              {formatCurrency(budget.spent)} de {formatCurrency(budget.budgeted)}
                            </p>
                          </div>
                          <Badge variant={budget.percentage > 80 ? 'destructive' : budget.percentage > 60 ? 'outline' : 'secondary'}>
                            {budget.percentage}%
                          </Badge>
                        </div>
                        <Progress value={budget.percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Restante: {formatCurrency(budget.remaining)}</span>
                          <span>{budget.period === 'monthly' ? 'Mensal' : 'Anual'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Accounts and Goals */}
          <div className="space-y-6">
            {/* Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Contas</CardTitle>
              </CardHeader>
              <CardContent>
                {data.accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma conta cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: account.color }}
                          />
                          <div>
                            <p className="font-medium text-slate-900">{account.name}</p>
                            <p className="text-sm text-slate-500 capitalize">
                              {account.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <p className={cn(
                          "font-semibold",
                          account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Goals */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Metas Financeiras</CardTitle>
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.goals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma meta definida</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {data.goals.map((goal) => (
                      <div key={goal.id} className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-slate-900">{goal.name}</p>
                            <p className="text-sm text-slate-500">
                              Meta: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'outline' : 'secondary'}>
                            {goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{formatCurrency(goal.current)}</span>
                            <span>{formatCurrency(goal.target)}</span>
                          </div>
                          <Progress value={goal.percentage} className="h-2" />
                          <p className="text-xs text-slate-500 text-center">
                            {goal.percentage}% concluído
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
