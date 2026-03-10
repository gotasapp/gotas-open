'use client';

import { useState, useEffect } from 'react';
import { BarChart, Users, Image, Clock } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

// Componente de card estatístico
function StatCard({ title, value, description, icon, trend, trendValue }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="rounded-full bg-gray-100 p-3">{icon}</div>
      </div>
      {trend && (
        <div className="mt-4">
          <p
            className={`text-xs font-medium ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </p>
        </div>
      )}
    </div>
  );
}

// Componente para a tabela de atividades recentes
function RecentActivities() {
  const recentActivities = [
    {
      id: 1,
      action: 'NFT Resgatado',
      user: 'João Silva',
      nft: 'Pixels.01',
      timestamp: '5 minutos atrás',
    },
    {
      id: 2,
      action: 'Novo Usuário',
      user: 'Maria Oliveira',
      nft: '-',
      timestamp: '2 horas atrás',
    },
    {
      id: 3,
      action: 'NFT Resgatado',
      user: 'Carlos Santos',
      nft: 'Daily Pixels',
      timestamp: '4 horas atrás',
    },
    {
      id: 4,
      action: 'NFT Criado',
      user: 'Admin',
      nft: 'Weekly Exclusive',
      timestamp: '1 dia atrás',
    },
  ];

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Atividades Recentes</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
              <th className="whitespace-nowrap px-4 py-3">Ação</th>
              <th className="whitespace-nowrap px-4 py-3">Usuário</th>
              <th className="whitespace-nowrap px-4 py-3">NFT</th>
              <th className="whitespace-nowrap px-4 py-3">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recentActivities.map((activity) => (
              <tr key={activity.id} className="text-sm">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{activity.action}</td>
                <td className="whitespace-nowrap px-4 py-3">{activity.user}</td>
                <td className="whitespace-nowrap px-4 py-3">{activity.nft}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{activity.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  // Dados simulados para estatísticas
  const stats = {
    totalUsers: 215,
    totalNFTs: 5,
    claimedNFTs: 42,
    activeUsers: 68,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">Visão geral e estatísticas do sistema</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Usuários"
          value={stats.totalUsers}
          description="Contas registradas"
          icon={<Users className="h-6 w-6 text-blue-600" />}
          trend="up"
          trendValue="12% em relação ao mês anterior"
        />
        <StatCard
          title="NFTs Disponíveis"
          value={stats.totalNFTs}
          description="Total no sistema"
          icon={<Image className="h-6 w-6 text-purple-600" />}
          trend="neutral"
          trendValue="Sem alteração"
        />
        <StatCard
          title="NFTs Resgatados"
          value={stats.claimedNFTs}
          description="Total"
          icon={<BarChart className="h-6 w-6 text-green-600" />}
          trend="up"
          trendValue="8% em relação à semana anterior"
        />
        <StatCard
          title="Usuários Ativos"
          value={stats.activeUsers}
          description="Últimos 30 dias"
          icon={<Clock className="h-6 w-6 text-orange-600" />}
          trend="up"
          trendValue="5% em relação ao mês anterior"
        />
      </div>

      <RecentActivities />
    </div>
  );
}