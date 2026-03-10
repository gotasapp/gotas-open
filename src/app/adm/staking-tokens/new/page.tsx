'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Interface para os dados do formulário, espelhando StakingTokenDbRecord mas sem os campos gerados pelo DB
interface StakingTokenFormData {
  token_id_internal: string;
  symbol: string;
  name: string;
  description: string;
  address: string;
  icon_url: string;
  decimals: number | string; // String para o input, convertido para number antes de enviar
  is_active: boolean;
}

const initialFormData: StakingTokenFormData = {
  token_id_internal: '',
  symbol: '',
  name: '',
  description: '',
  address: '',
  icon_url: '',
  decimals: '', // Inicializa como string para o input
  is_active: true,
};

export default function NewStakingTokenPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<StakingTokenFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<StakingTokenFormData>>({});
  const [iconFile, setIconFile] = useState<File | null>(null); // Estado para o arquivo do ícone
  const [iconPreview, setIconPreview] = useState<string | null>(null); // Estado para o preview do ícone

  const validate = (): boolean => {
    const newErrors: Partial<StakingTokenFormData> = {};
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
        toast.error("Imagem do ícone muito grande. Máximo de 2MB.");
        setIconFile(null);
        setIconPreview(null);
        e.target.value = ''; // Limpa o input file
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
      setIconPreview(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
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

    let finalIconUrl = formData.icon_url; // Mantém a URL se não houver novo upload

    try {
      if (iconFile) {
        toast.info("Fazendo upload do ícone...");
        finalIconUrl = await uploadImageToS3(iconFile, 'staking-tokens/icons');
        toast.success("Ícone enviado com sucesso!");
      }

      const payload = {
          ...formData,
          icon_url: finalIconUrl, // Usa a URL do S3 ou a URL manual
          decimals: Number(formData.decimals),
      };

      const response = await fetch('/api/staking-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao criar o token');
      }

      toast.success('Token de stake criado com sucesso!');
      router.push('/adm/staking-tokens'); 
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      console.error("Erro ao criar token:", error);
      toast.error(`Erro ao criar token: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="flex items-center mb-6">
        <Link href="/adm/staking-tokens">
          <Button variant="outline" size="icon" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Adicionar Novo Token de Stake</h1>
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
              <span>{iconFile ? iconFile.name : 'Selecionar Imagem (Max 2MB)'}</span>
              <input 
                id="icon_file_input_trigger" 
                name="icon_file_input_trigger" // Nome diferente para não conflitar com formData
                type="file" 
                className="sr-only" 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/webp, image/svg+xml" 
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Opcional: Se preferir, cole a URL direta no campo abaixo.</p>
        </div>

        <div>
          <Label htmlFor="icon_url">URL do Ícone (Manual)</Label>
          <Input 
            id="icon_url" 
            name="icon_url" 
            value={formData.icon_url} // Controlado pelo formData
            onChange={handleChange} 
            placeholder="https://exemplo.com/icone.png"
            disabled={!!iconFile} // Desabilitar se um arquivo foi selecionado para upload
          />
          {iconFile && <p className="text-xs text-orange-600 mt-1">Upload de arquivo selecionado. A URL manual será ignorada.</p>}
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3}/>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="is_active" 
            name="is_active" 
            checked={formData.is_active} 
            onCheckedChange={(checked: boolean) => setFormData(prev => ({...prev, is_active: checked}))} 
          />
          <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Token Ativo
          </Label>
        </div>

        <div className="flex justify-end space-x-3">
          <Link href="/adm/staking-tokens">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Token
          </Button>
        </div>
      </form>
    </div>
  );
} 