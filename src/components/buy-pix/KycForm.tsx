'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield } from 'lucide-react';
import { KycData } from './BuyPixPage';

interface KycFormProps {
  walletAddress: string;
  existingData?: KycData | null;
  onSuccess: (data: KycData) => void;
  onError: (error: string) => void;
}

export function KycForm({ walletAddress, existingData, onSuccess, onError }: KycFormProps) {
  const [formData, setFormData] = useState({
    cpf: '',
    birthDate: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Funções utilitárias
  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Atualizar dados do formulário quando existingData mudar
  useEffect(() => {
    if (existingData) {
      // Converter data do formato ISO para YYYY-MM-DD
      let formattedBirthDate = '';
      if (existingData.birthDate) {
        try {
          const date = new Date(existingData.birthDate);
          formattedBirthDate = date.toISOString().split('T')[0];
        } catch (error) {
          console.error('Erro ao converter data:', error);
          formattedBirthDate = existingData.birthDate;
        }
      }

      // Formatar CPF se necessário
      const formattedCpf = existingData.cpf ? formatCPF(existingData.cpf) : '';

      setFormData({
        cpf: formattedCpf,
        birthDate: formattedBirthDate,
        fullName: existingData.fullName || ''
      });
    }
  }, [existingData]);

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
    
    return true;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Nome completo é obrigatório';
    } else if (formData.fullName.trim().split(' ').length < 2) {
      errors.fullName = 'Digite seu nome completo';
    }

    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }

    if (!formData.birthDate) {
      errors.birthDate = 'Data de nascimento é obrigatória';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        errors.birthDate = 'Você deve ter pelo menos 18 anos';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    onError('');

    try {
      const cleanCPF = formData.cpf.replace(/\D/g, '');
      
      const kycResponse = await fetch('/api/brla/kyc-level1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: cleanCPF,
          birthDate: formData.birthDate,
          fullName: formData.fullName,
          defaultWallet: walletAddress
        }),
      });

      const kycData = await kycResponse.json();

      if (!kycResponse.ok) {
        throw new Error(kycData.error || 'Erro na verificação KYC');
      }

      const dbResponse = await fetch('/api/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          cpf: cleanCPF,
          birthDate: formData.birthDate,
          fullName: formData.fullName,
          kycApproved: true,
          brlaUserId: kycData.userId || kycData.id
        }),
      });

      if (!dbResponse.ok) {
        console.error('Erro ao salvar no banco, mas KYC foi aprovado');
      }

      onSuccess({
        cpf: cleanCPF,
        birthDate: formData.birthDate,
        fullName: formData.fullName,
        kycApproved: true,
        brlaUserId: kycData.userId || kycData.id
      });

    } catch (error) {
      console.error('Erro no KYC:', error);
      onError(error instanceof Error ? error.message : 'Erro na verificação KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cpf') {
      value = formatCPF(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verificação de Identidade (KYC)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="fullName" className="mb-2 block">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Digite seu nome completo"
              className={validationErrors.fullName ? 'border-red-500' : ''}
              disabled={loading}
            />
            {validationErrors.fullName && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cpf" className="mb-2 block">CPF</Label>
            <Input
              id="cpf"
              type="text"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              className={validationErrors.cpf ? 'border-red-500' : ''}
              disabled={loading}
            />
            {validationErrors.cpf && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.cpf}</p>
            )}
          </div>

          <div>
            <Label htmlFor="birthDate" className="mb-2 block">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              className={validationErrors.birthDate ? 'border-red-500' : ''}
              disabled={loading}
            />
            {validationErrors.birthDate && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.birthDate}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Identidade'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 