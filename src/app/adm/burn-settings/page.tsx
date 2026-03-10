'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Settings, Lock, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface BurnSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  updated_at: string;
}

interface SettingsMap {
  [key: string]: string;
}

export default function BurnSettingsPage() {
  const [settings, setSettings] = useState<BurnSetting[]>([]);
  const [editedSettings, setEditedSettings] = useState<SettingsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/adm/burn-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        // Initialize edited settings
        const initialSettings: SettingsMap = {};
        data.settings.forEach((setting: BurnSetting) => {
          initialSettings[setting.setting_key] = setting.setting_value;
        });
        setEditedSettings(initialSettings);
      } else {
        toast.error('Erro ao carregar configurações');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSaveClick = () => {
    if (!hasChanges) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }
    setShowPasswordDialog(true);
  };

  const handleSaveSettings = async () => {
    if (!password) {
      toast.error('Senha é obrigatória');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/adm/burn-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          settings: editedSettings
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Configurações atualizadas com sucesso!');
        setSettings(data.settings);
        setHasChanges(false);
        setShowPasswordDialog(false);
        setPassword('');
      } else {
        toast.error(data.error || 'Erro ao atualizar configurações');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao atualizar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const getSettingLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      'minimum_fantoken_balance': 'Mínimo de Fan Tokens',
      'burn_feature_enabled': 'Feature Ativada',
      'minimum_cards_per_burn': 'Mínimo de Cards por Queima',
      'maximum_cards_per_burn': 'Máximo de Cards por Queima',
      'burn_cooldown_seconds': 'Cooldown (segundos)',
      'chz_reward_multiplier': 'Multiplicador de Recompensa CHZ',
    };
    return labels[key] || key;
  };

  const getSettingCategory = (key: string): string => {
    if (key.includes('feature_enabled')) return 'Sistema';
    if (key.includes('minimum') || key.includes('maximum')) return 'Limites';
    if (key.includes('cooldown')) return 'Controle de Taxa';
    if (key.includes('reward') || key.includes('multiplier')) return 'Recompensas';
    return 'Outros';
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    const category = getSettingCategory(setting.setting_key);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(setting);
    return acc;
  }, {} as { [category: string]: BurnSetting[] });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Configurações de Burn
            </h1>
            <p className="text-gray-600">
              Gerencie as configurações do sistema de queima de cards
            </p>
          </div>
        </div>
      </div>

      {/* Security Alert */}
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <Lock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Área Protegida:</strong> Alterações requerem senha de administrador
        </AlertDescription>
      </Alert>

      {/* Settings Groups */}
      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <Card key={category} className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                {categorySettings.length} configuração{categorySettings.length > 1 ? 'ões' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySettings.map((setting) => (
                <div key={setting.setting_key} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor={setting.setting_key} className="text-sm font-semibold">
                        {getSettingLabel(setting.setting_key)}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {setting.description}
                      </p>
                    </div>
                    <div className="w-48">
                      {setting.setting_type === 'boolean' ? (
                        <select
                          id={setting.setting_key}
                          value={editedSettings[setting.setting_key] || setting.setting_value}
                          onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                          <option value="true">Ativo</option>
                          <option value="false">Inativo</option>
                        </select>
                      ) : (
                        <Input
                          id={setting.setting_key}
                          type={setting.setting_type === 'integer' ? 'number' : 'text'}
                          value={editedSettings[setting.setting_key] || setting.setting_value}
                          onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                          className="border-2 border-gray-300 focus:border-gray-900"
                        />
                      )}
                    </div>
                  </div>
                  {editedSettings[setting.setting_key] !== setting.setting_value && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 ml-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Valor alterado (original: {setting.setting_value})</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-8 justify-end">
        <Button
          variant="outline"
          onClick={fetchSettings}
          disabled={isSaving}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Recarregar
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={!hasChanges || isSaving}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Confirmar Alterações
            </DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para salvar as alterações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {Object.keys(editedSettings).filter(key =>
                  editedSettings[key] !== settings.find(s => s.setting_key === key)?.setting_value
                ).length} configuração(ões) será(ão) atualizada(s)
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha de Administrador</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSettings()}
                disabled={isSaving}
                className="border-2 border-gray-300 focus:border-gray-900"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPassword('');
              }}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!password || isSaving}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
