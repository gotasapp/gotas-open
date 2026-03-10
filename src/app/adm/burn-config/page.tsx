'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, X, Settings, TrendingUp, History } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import type { BurnRewardConfig, BurnGlobalSettings, NFTRarityPortuguese } from '@/types/burn-rewards';
import { getRarityDisplay } from '@/types/burn-rewards';

interface BurnStats {
  totalCardsBurned: string;
  totalChzDistributed: string;
  uniqueUsers: string;
  avgCardsPerBurn: string;
  maxCardsInSingleBurn: string;
  recentActivity: Array<{
    id: number;
    burnedAt: string;
    cardCount: number;
    totalChz: string;
  }>;
}

interface EditingReward {
  fanTokenSymbol: string;
  rarity: NFTRarityPortuguese;
  value: string;
}

export default function BurnConfigPage() {
  const [rewardConfigs, setRewardConfigs] = useState<BurnRewardConfig[]>([]);
  const [globalSettings, setGlobalSettings] = useState<BurnGlobalSettings | null>(null);
  const [stats, setStats] = useState<BurnStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReward, setEditingReward] = useState<EditingReward | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<Partial<BurnGlobalSettings>>({});

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/adm/burn-config'),
        fetch('/api/adm/burn-stats')
      ]);

      if (!configRes.ok) throw new Error('Failed to fetch config');
      if (!statsRes.ok) throw new Error('Failed to fetch stats');

      const configData = await configRes.json();
      const statsData = await statsRes.json();

      setRewardConfigs(configData.rewards);
      setGlobalSettings(configData.settings);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle reward edit
  const startEditingReward = (fanToken: string, rarity: NFTRarityPortuguese, currentValue: number) => {
    setEditingReward({
      fanTokenSymbol: fanToken,
      rarity,
      value: currentValue.toString()
    });
  };

  const cancelEditingReward = () => {
    setEditingReward(null);
  };

  const saveReward = async () => {
    if (!editingReward) return;

    const value = parseFloat(editingReward.value);
    if (isNaN(value) || value < 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/adm/burn-config/rewards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fanTokenSymbol: editingReward.fanTokenSymbol,
          rarity: editingReward.rarity,
          chzRewardAmount: value
        })
      });

      if (!response.ok) throw new Error('Failed to update reward');

      const updated = await response.json();
      setRewardConfigs(prev => prev.map(r =>
        r.fanTokenSymbol === editingReward.fanTokenSymbol && r.rarity === editingReward.rarity
          ? { ...r, chzRewardAmount: updated.chzRewardAmount }
          : r
      ));

      toast.success('Recompensa atualizada com sucesso');
      setEditingReward(null);
    } catch (error) {
      console.error('Error updating reward:', error);
      toast.error('Erro ao atualizar recompensa');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle global settings edit
  const startEditingSettings = () => {
    setEditingSettings(true);
    setTempSettings({ ...globalSettings });
  };

  const cancelEditingSettings = () => {
    setEditingSettings(false);
    setTempSettings({});
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/adm/burn-config/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSettings)
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const updated = await response.json();
      setGlobalSettings(updated);
      setEditingSettings(false);
      setTempSettings({});

      toast.success('Configurações atualizadas com sucesso');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Group rewards by fan token
  const groupedRewards = rewardConfigs.reduce((acc, config) => {
    if (!acc[config.fanTokenSymbol]) {
      acc[config.fanTokenSymbol] = [];
    }
    acc[config.fanTokenSymbol].push(config);
    return acc;
  }, {} as Record<string, BurnRewardConfig[]>);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-lg">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Configuração de Burn Rewards</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie recompensas em CHZ para queima de cards</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cards Queimados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCardsBurned || '0'}</div>
              <p className="text-xs text-gray-500 mt-1">Total de todos os tempos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">CHZ Distribuído</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parseFloat(stats.totalChzDistributed || '0').toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Total em recompensas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Usuários Únicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers || '0'}</div>
              <p className="text-xs text-gray-500 mt-1">Utilizaram o burn</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Média por Queima</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parseFloat(stats.avgCardsPerBurn || '0').toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">Cards por operação</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Globais
              </CardTitle>
              <CardDescription>Configurações gerais do sistema de burn</CardDescription>
            </div>
            {!editingSettings ? (
              <Button onClick={startEditingSettings} variant="outline" size="sm">
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={saveSettings} disabled={isSaving} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
                <Button onClick={cancelEditingSettings} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {globalSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sistema de Burn Ativo</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSettings ? tempSettings.burnFeatureEnabled : globalSettings.burnFeatureEnabled}
                    onCheckedChange={(checked) => {
                      if (editingSettings) {
                        setTempSettings(prev => ({ ...prev, burnFeatureEnabled: checked }));
                      }
                    }}
                    disabled={!editingSettings}
                  />
                  <span className="text-sm text-gray-600">
                    {(editingSettings ? tempSettings.burnFeatureEnabled : globalSettings.burnFeatureEnabled) ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minCards">Mínimo de Cards por Queima</Label>
                <Input
                  id="minCards"
                  type="number"
                  min="1"
                  value={editingSettings ? tempSettings.minimumCardsPerBurn : globalSettings.minimumCardsPerBurn}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, minimumCardsPerBurn: parseInt(e.target.value) }))}
                  disabled={!editingSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCards">Máximo de Cards por Queima</Label>
                <Input
                  id="maxCards"
                  type="number"
                  min="1"
                  value={editingSettings ? tempSettings.maximumCardsPerBurn : globalSettings.maximumCardsPerBurn}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, maximumCardsPerBurn: parseInt(e.target.value) }))}
                  disabled={!editingSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (segundos)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  min="0"
                  value={editingSettings ? tempSettings.burnCooldownSeconds : globalSettings.burnCooldownSeconds}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, burnCooldownSeconds: parseInt(e.target.value) }))}
                  disabled={!editingSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiplier">Multiplicador de Recompensa</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={editingSettings ? tempSettings.chzRewardMultiplier : globalSettings.chzRewardMultiplier}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, chzRewardMultiplier: parseFloat(e.target.value) }))}
                  disabled={!editingSettings}
                />
              </div>

              <div className="space-y-2">
                <Label>Auto-Reivindicar Recompensas</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingSettings ? tempSettings.autoClaimRewards : globalSettings.autoClaimRewards}
                    onCheckedChange={(checked) => {
                      if (editingSettings) {
                        setTempSettings(prev => ({ ...prev, autoClaimRewards: checked }));
                      }
                    }}
                    disabled={!editingSettings}
                  />
                  <span className="text-sm text-gray-600">
                    {(editingSettings ? tempSettings.autoClaimRewards : globalSettings.autoClaimRewards) ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Burn Rewards Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recompensas por Token e Raridade
          </CardTitle>
          <CardDescription>Configure o valor de CHZ para cada tipo de card</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fan Token</TableHead>
                  <TableHead>Raridade</TableHead>
                  <TableHead className="text-right">Recompensa (CHZ)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedRewards).map(([, configs]) => (
                  configs.map((config, index) => {
                    const rarityDisplay = getRarityDisplay(config.rarity);
                    const isEditing = editingReward?.fanTokenSymbol === config.fanTokenSymbol &&
                                    editingReward?.rarity === config.rarity;

                    return (
                      <TableRow key={`${config.fanTokenSymbol}-${config.rarity}`}>
                        {index === 0 && (
                          <TableCell rowSpan={configs.length} className="font-medium">
                            {config.fanTokenSymbol}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={`${rarityDisplay.bgColor} ${rarityDisplay.color} border ${rarityDisplay.borderColor}`}>
                            {rarityDisplay.icon} {rarityDisplay.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingReward.value}
                              onChange={(e) => setEditingReward({ ...editingReward, value: e.target.value })}
                              className="w-32 ml-auto"
                              autoFocus
                            />
                          ) : (
                            <span className="font-mono">{config.chzRewardAmount.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={config.isActive ? 'default' : 'destructive'}>
                            {config.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button onClick={saveReward} disabled={isSaving} size="sm">
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button onClick={cancelEditingReward} variant="outline" size="sm">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => startEditingReward(config.fanTokenSymbol, config.rarity, config.chzRewardAmount)}
                              variant="outline"
                              size="sm"
                            >
                              Editar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas 10 operações de burn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-center">Cards Queimados</TableHead>
                    <TableHead className="text-right">CHZ Distribuído</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        {new Date(activity.burnedAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">{activity.cardCount}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(activity.totalChz).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
