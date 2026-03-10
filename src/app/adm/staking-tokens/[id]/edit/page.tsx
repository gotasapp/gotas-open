'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, RefreshCw, UploadCloud, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { toast } from 'sonner';

// Interface para os dados do formulário e do token vindo do DB
interface StakingTokenData {
  id?: number; // Opcional, pois não existe na criação
  token_id_internal: string;
  symbol: string;
  name: string;
  description: string;
  address: string;
  icon_url: string;
  decimals: number | string; // String para input, number para DB
  is_active: boolean;
  is_fan_token: boolean;
  // Campos do DB não editáveis diretamente no formulário
  created_at?: string;
  updated_at?: string;
}

const initialFormData: StakingTokenData = {
  token_id_internal: '',
  symbol: '',
  name: '',
  description: '',
  address: '',
  icon_url: '',
  decimals: '', // Input como string
  is_active: true,
  is_fan_token: false,
};

export default function EditStakingTokenPage() {
  const router = useRouter();
  const params = useParams();
  // Garantir que params existe e que id é uma string
  const tokenId = params?.id as string | undefined;

  const [formData, setFormData] = useState<StakingTokenData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errors, setErrors] = useState<Partial<StakingTokenData>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null); // Estado para o arquivo do ícone
  const [iconPreview, setIconPreview] = useState<string | null>(null); // Estado para o preview do ícone

  const fetchTokenData = useCallback(async () => {
    if (!tokenId) {
      // Se tokenId for undefined (params.id não existe ou params é null), 
      // não tentar buscar e talvez mostrar um erro ou redirecionar.
      // Por agora, apenas retornamos para evitar a chamada da API.
      setIsFetching(false);
      setFetchError("ID do token não encontrado na URL.");
      toast.error("Não foi possível carregar o token: ID ausente.");
      return;
    }
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/staking-tokens/${tokenId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao buscar dados do token');
      }
      const data = await response.json();
      setFormData({ 
        ...data, 
        decimals: data.decimals.toString() // Manter decimals como string para o input
      });
      // Definir preview inicial se URL do ícone existir
      if (data.icon_url) {
        setIconPreview(data.icon_url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      console.error("Erro ao buscar token:", error);
      setFetchError(message);
      toast.error(`Erro ao carregar dados do token: ${message}`);
    } finally {
      setIsFetching(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  const validate = (): boolean => {
    const newErrors: Partial<StakingTokenData> = {};
    if (!formData.token_id_internal.trim()) newErrors.token_id_internal = 'ID Interno é obrigatório.';
    if (!formData.symbol.trim()) newErrors.symbol = 'Símbolo é obrigatório.';
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!formData.address.trim()) newErrors.address = 'Endereço é obrigatório.';
    else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.address.trim())) {
        newErrors.address = 'Endereço de contrato inválido.';
    }
    if (formData.decimals === '' || isNaN(Number(formData.decimals))) newErrors.decimals = 'Decimais é obrigatório e deve ser um número.';
    else if (Number(formData.decimals) < 0 || !Number.isInteger(Number(formData.decimals))) {
        newErrors.decimals = 'Decimais deve ser um número inteiro não negativo.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (field: 'is_active' | 'is_fan_token') => (checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
        toast.error("Imagem do ícone muito grande. Máximo de 2MB.");
        setIconFile(null);
        setIconPreview(formData.icon_url || null); // Reverte para o preview da URL atual se houver
        e.target.value = ''; 
        return;
      }
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIconFile(null);
      setIconPreview(formData.icon_url || null); // Reverte para o preview da URL atual
    }
  };

  // Função para upload de imagem (adaptada da edição de NFT)
  const uploadImageToS3 = async (file: File, s3Path: string): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('path', s3Path);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Falha ao fazer upload da imagem do ícone via API.');
    }
    const data = await response.json();
    return data.imageUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }
    setIsLoading(true);
    let finalIconUrl = formData.icon_url; // Usa a URL existente por padrão

    try {
      if (iconFile) { // Se um novo arquivo foi selecionado, faz o upload
        toast.info("Fazendo upload do novo ícone...");
        finalIconUrl = await uploadImageToS3(iconFile, 'staking-tokens/icons');
        toast.success("Novo ícone enviado com sucesso!");
      }

      const payload = {
          ...formData,
          icon_url: finalIconUrl, // URL do S3 ou a URL manual/existente
          decimals: Number(formData.decimals),
      };
      // Remover campos que não devem ser enviados no PUT se não forem editáveis
      delete payload.id; 
      delete payload.created_at;
      delete payload.updated_at;

      const response = await fetch(`/api/staking-tokens/${tokenId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao atualizar o token');
      }

      toast.success('Token de stake atualizado com sucesso!');
      router.push('/adm/staking-tokens');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      console.error("Erro ao atualizar token:", error);
      toast.error(`Erro ao atualizar token: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-lg">Carregando dados do token...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
         <div className="flex items-center mb-6">
          <Link href="/adm/staking-tokens">
            <Button variant="outline" size="icon" className="mr-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-destructive">Erro ao Carregar Token</h1>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{fetchError}</span>
          <div className="mt-4">
            <Button onClick={fetchTokenData} variant="destructive">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <div className="flex items-center mb-6">
          <Link href="/adm/staking-tokens">
            <Button variant="outline" size="icon" className="mr-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Editar Token de Stake: {formData.name || 'Carregando...'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-md rounded-lg">
          <div>
            <Label htmlFor="token_id_internal">ID Interno (ex: chz, mengo)</Label>
            <Input 
              id="token_id_internal" 
              name="token_id_internal" 
              value={formData.token_id_internal} 
              onChange={handleChange} 
              maxLength={50}
              className={errors.token_id_internal ? 'border-red-500' : ''}
            />
            {errors.token_id_internal && <p className="text-sm text-red-600 mt-1">{errors.token_id_internal}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <Label htmlFor="name">Nome do Token</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} maxLength={255} className={errors.name ? 'border-red-500' : ''}/>
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                  <Label htmlFor="symbol">Símbolo (ex: CHZ)</Label>
                  <Input id="symbol" name="symbol" value={formData.symbol} onChange={handleChange} maxLength={20} className={errors.symbol ? 'border-red-500' : ''}/>
                  {errors.symbol && <p className="text-sm text-red-600 mt-1">{errors.symbol}</p>}
              </div>
          </div>

          <div>
            <Label htmlFor="address">Endereço do Contrato</Label>
            <Input id="address" name="address" value={formData.address} onChange={handleChange} maxLength={42} className={errors.address ? 'border-red-500' : ''}/>
            {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
          </div>
          
          <div>
            <Label htmlFor="decimals">Decimais</Label>
            <Input id="decimals" name="decimals" type="number" value={formData.decimals} onChange={handleChange} className={errors.decimals ? 'border-red-500' : ''}/>
            {errors.decimals && <p className="text-sm text-red-600 mt-1">{errors.decimals}</p>}
          </div>

          <div>
            <Label htmlFor="icon_file_input">Ícone do Token (Upload)</Label>
            <div className="mt-1 flex items-center">
              {iconPreview && (
                <img src={iconPreview} alt="Preview Ícone" className="h-16 w-16 object-cover rounded-full mr-4 border" />
              )}
              <label
                htmlFor="icon_file_input_trigger"
                className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                <span>{iconFile ? iconFile.name : 'Selecionar Nova Imagem (Max 2MB)'}</span>
                <input 
                  id="icon_file_input_trigger" 
                  name="icon_file_input_trigger"
                  type="file" 
                  className="sr-only" 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Opcional: Se preferir, cole a URL direta no campo abaixo. Se selecionar um novo arquivo, esta URL será substituída.</p>
          </div>

          <div>
            <Label htmlFor="icon_url">URL do Ícone (Manual / Atual)</Label>
            <Input 
              id="icon_url" 
              name="icon_url" 
              value={formData.icon_url || ''} 
              onChange={handleChange} 
              placeholder="https://exemplo.com/icone.png"
              disabled={!!iconFile} // Desabilitar se um arquivo foi selecionado para upload
            />
             {iconFile && <p className="text-xs text-orange-600 mt-1">Upload de nova imagem selecionado. A URL manual será ignorada.</p>}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={3}/>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_active" 
                name="is_active" 
                checked={formData.is_active} 
                onCheckedChange={handleCheckboxChange('is_active')} 
              />
              <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Token Ativo
              </Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="is_fan_token" 
                  name="is_fan_token" 
                  checked={formData.is_fan_token} 
                  onCheckedChange={handleCheckboxChange('is_fan_token')} 
                />
                <Label htmlFor="is_fan_token" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1">
                  É Fan Token
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </Label>
              </div>
              <div className="text-xs text-gray-600 ml-6 bg-gray-50 p-3 rounded-md">
                <p className="mb-2">
                  <strong>Fan Token:</strong> Tokens de times de futebol que requerem tratamento especial na API BRLA.
                </p>
                <p className="mb-2">
                  <strong>Exemplos:</strong> MENGO, SPFC, VERDAO, etc. O CHZ é o único token nativo (não é fan token).
                </p>
                <p>
                  <strong>Diferenças técnicas:</strong> Fan tokens usam fixOutput=true nas cotações, requerem token JWT da cotação para criação de ordens, e markupAddress deve ser igual ao receiverAddress.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Link href="/adm/staking-tokens">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading || isFetching}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    );
} 