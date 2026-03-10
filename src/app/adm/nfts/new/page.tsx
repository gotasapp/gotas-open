'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NFTCategory, NFTRarity } from '@/lib/types';
import { StakingToken } from '@/lib/tokens';
import { ArrowLeft, Save, UploadCloud } from 'lucide-react';

export default function CreateNFTPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [secondaryImageFile1, setSecondaryImageFile1] = useState<File | null>(null);
  const [secondaryImageFile2, setSecondaryImageFile2] = useState<File | null>(null);

  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [secondaryImagePreview1, setSecondaryImagePreview1] = useState<string | null>(null);
  const [secondaryImagePreview2, setSecondaryImagePreview2] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tokenId: '',
    name: '',
    description: '',
    mainImageUrl: '',
    secondaryImageUrl1: '',
    secondaryImageUrl2: '',
    metadataUrl: '',
    category: '',
    rarity: '',
    totalSupply: '',
    maxPerUser: '',
    releaseDate: '',
    expirationDate: '',
    cooldownMinutes: '',
    stakeRequired: false,
    stakeTokenAmount: '',
    stakeTokenSymbol: '',
    stakeTokenAddress: '',
    assetsToRedeemCount: '',
    showStatistics: true
  });

  const [availableApiStakingTokens, setAvailableApiStakingTokens] = useState<StakingToken[]>([]);
  const [isLoadingApiTokens, setIsLoadingApiTokens] = useState(true);

  const uploadImageThroughAPI = async (file: File, s3Path: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', s3Path);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Falha ao fazer upload da imagem via API.');
    }
    const data = await response.json();
    return data.imageUrl;
  };

  useEffect(() => {
    const fetchApiStakingTokens = async () => {
      setIsLoadingApiTokens(true);
      try {
        const response = await fetch('/api/staking-tokens');
        if (!response.ok) {
          throw new Error('Failed to fetch staking tokens from API');
        }
        const data = await response.json();
        
        const mappedData = data.map((token: any) => ({
          id: token.token_id_internal,
          symbol: token.symbol,
          name: token.name,
          description: token.description,
          address: token.address,
          icon: token.icon_url,
          decimals: token.decimals,
        }));
        setAvailableApiStakingTokens(mappedData as StakingToken[]);
      } catch (error) {
        console.error("Error fetching API staking tokens:", error);
        setFormError("Falha ao carregar tokens de stake para seleção.");
        setAvailableApiStakingTokens([]);
      } finally {
        setIsLoadingApiTokens(false);
      }
    };
    fetchApiStakingTokens();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'stakeSelectedTokenId') {
      const selectedToken = availableApiStakingTokens.find(token => token.id === value);
      if (selectedToken) {
        setFormData((prev) => ({
          ...prev,
          stakeTokenAddress: selectedToken.address, 
          stakeTokenSymbol: selectedToken.symbol,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          stakeTokenAddress: '',
          stakeTokenSymbol: '',
        }));
      }
    } else if (name === 'cooldownMinutes') {
      // Manter como string no estado do formulário
      setFormData((prev) => ({
        ...prev,
        cooldownMinutes: value,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, setImageFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    let updatedMainImageUrl = formData.mainImageUrl;
    let updatedSecondaryImageUrl1 = formData.secondaryImageUrl1;
    let updatedSecondaryImageUrl2 = formData.secondaryImageUrl2;

    try {
      if (mainImageFile) {
        updatedMainImageUrl = await uploadImageThroughAPI(mainImageFile, 'nfts/main');
      }
      if (secondaryImageFile1) {
        updatedSecondaryImageUrl1 = await uploadImageThroughAPI(secondaryImageFile1, 'nfts/secondary1');
      }
      if (secondaryImageFile2) {
        updatedSecondaryImageUrl2 = await uploadImageThroughAPI(secondaryImageFile2, 'nfts/secondary2');
      }

      const response = await fetch('/api/nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalSupply: parseInt(formData.totalSupply),
          maxPerUser: parseInt(formData.maxPerUser),
          cooldownMinutes: parseInt(formData.cooldownMinutes) || 0,
          stakeTokenAmount: parseFloat(formData.stakeTokenAmount) || 0,
          assetsToRedeemCount: parseInt(formData.assetsToRedeemCount) || 0,
          showStatistics: formData.showStatistics
        }),
      });

      if (response.ok) {
        router.push('/adm/nfts');
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || 'Erro ao criar NFT');
      }
    } catch (error) {
      console.error('Erro ao criar NFT:', error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Ocorreu um erro desconhecido ao criar o NFT.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link href="/adm/nfts" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Criar Novo NFT</h1>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {formError}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium">
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  required
                ></textarea>
              </div>

              <div>
                <label htmlFor="mainImage" className="block text-sm font-medium text-gray-700">
                  Imagem Principal
                </label>
                <div className="mt-1 flex items-center">
                  {mainImagePreview && (
                    <img src={mainImagePreview} alt="Preview Imagem Principal" className="h-20 w-20 object-cover rounded-md mr-4" />
                  )}
                  <label
                    htmlFor="mainImageFile"
                    className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    <span>{mainImageFile ? mainImageFile.name : 'Selecionar Imagem Principal'}</span>
                    <input id="mainImageFile" name="mainImageFile" type="file" className="sr-only" onChange={(e) => handleFileChange(e, setMainImageFile, setMainImagePreview)} accept="image/*" />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium">
                    Categoria
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {Object.values(NFTCategory).map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="rarity" className="block text-sm font-medium">
                    Raridade
                  </label>
                  <select
                    id="rarity"
                    name="rarity"
                    value={formData.rarity}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                    required
                  >
                    <option value="">Selecione uma raridade</option>
                    {Object.values(NFTRarity).map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="totalSupply" className="block text-sm font-medium">
                    Total de Emissão
                  </label>
                  <input
                    type="number"
                    id="totalSupply"
                    name="totalSupply"
                    min="1"
                    value={formData.totalSupply}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor="maxPerUser" className="block text-sm font-medium">
                    Máximo por Usuário
                  </label>
                  <input
                    type="number"
                    id="maxPerUser"
                    name="maxPerUser"
                    min="1"
                    value={formData.maxPerUser}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="releaseDate" className="block text-sm font-medium">
                    Data de Lançamento
                  </label>
                  <input
                    type="date"
                    id="releaseDate"
                    name="releaseDate"
                    value={formData.releaseDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor="expirationDate" className="block text-sm font-medium">
                    Data de Expiração (Opcional)
                  </label>
                  <input
                    type="date"
                    id="expirationDate"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tempo de Resfriamento (em minutos)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="number"
                    id="cooldownMinutes"
                    name="cooldownMinutes"
                    min="0"
                    value={formData.cooldownMinutes}
                    onChange={handleChange}
                    placeholder="0"
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Deixe em 0 para não permitir reclamações repetidas. Exemplo: 60 = 1 hora, 1440 = 1 dia
                </p>
              </div>

              <div>
                <label htmlFor="secondaryImage1" className="block text-sm font-medium text-gray-700">
                  Imagem Secundária 1 (Opcional)
                </label>
                <div className="mt-1 flex items-center">
                  {secondaryImagePreview1 && (
                    <img src={secondaryImagePreview1} alt="Preview Imagem Secundária 1" className="h-20 w-20 object-cover rounded-md mr-4" />
                  )}
                  <label
                    htmlFor="secondaryImageFile1"
                    className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    <span>{secondaryImageFile1 ? secondaryImageFile1.name : 'Selecionar Imagem'}</span>
                    <input id="secondaryImageFile1" name="secondaryImageFile1" type="file" className="sr-only" onChange={(e) => handleFileChange(e, setSecondaryImageFile1, setSecondaryImagePreview1)} accept="image/*" />
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="secondaryImage2" className="block text-sm font-medium text-gray-700">
                  Imagem Secundária 2 (Opcional)
                </label>
                <div className="mt-1 flex items-center">
                  {secondaryImagePreview2 && (
                    <img src={secondaryImagePreview2} alt="Preview Imagem Secundária 2" className="h-20 w-20 object-cover rounded-md mr-4" />
                  )}
                  <label
                    htmlFor="secondaryImageFile2"
                    className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 px-6 py-4 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    <span>{secondaryImageFile2 ? secondaryImageFile2.name : 'Selecionar Imagem'}</span>
                    <input id="secondaryImageFile2" name="secondaryImageFile2" type="file" className="sr-only" onChange={(e) => handleFileChange(e, setSecondaryImageFile2, setSecondaryImagePreview2)} accept="image/*" />
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                <h3 className="font-medium text-sm">Configurações Avançadas</h3>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showStatistics"
                    name="showStatistics"
                    checked={formData.showStatistics}
                    onChange={(e) => setFormData(prev => ({ ...prev, showStatistics: e.target.checked }))}
                    className="mr-2 rounded border-gray-300"
                  />
                  <label htmlFor="showStatistics" className="text-sm font-medium">
                    Exibir estatísticas de evolução
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="stakeRequired"
                    name="stakeRequired"
                    checked={formData.stakeRequired}
                    onChange={(e) => setFormData(prev => ({ ...prev, stakeRequired: e.target.checked }))}
                    className="mr-2 rounded border-gray-300"
                  />
                  <label htmlFor="stakeRequired" className="text-sm font-medium">
                    Exigir stake de tokens para resgate
                  </label>
                </div>

                {formData.stakeRequired && (
                  <div className="space-y-4 pl-2 border-l-2 border-gray-200">
                    <div>
                      <label htmlFor="stakeSelectedTokenId" className="block text-sm font-medium">
                        Token para Stake
                      </label>
                      <select
                        id="stakeSelectedTokenId"
                        name="stakeSelectedTokenId"
                        value={availableApiStakingTokens.find(t => t.address === formData.stakeTokenAddress)?.id || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-sm"
                        disabled={isLoadingApiTokens}
                      >
                        <option value="">{isLoadingApiTokens ? 'Carregando tokens...' : 'Selecione um token'}</option>
                        {availableApiStakingTokens.map((token) => (
                          <option key={token.id} value={token.id}>
                            {token.name} ({token.symbol})
                          </option>
                        ))}
                      </select>
                      <input
                        type="hidden"
                        name="stakeTokenAddress"
                        value={formData.stakeTokenAddress}
                      />
                      {formData.stakeTokenSymbol && (
                      <p className="mt-1 text-xs text-gray-500">
                          Símbolo selecionado: {formData.stakeTokenSymbol}
                      </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label htmlFor="stakeTokenAmount" className="block text-sm font-medium">
                          Quantidade mínima
                        </label>
                        <input
                          type="number"
                          id="stakeTokenAmount"
                          name="stakeTokenAmount"
                          value={formData.stakeTokenAmount}
                          onChange={handleChange}
                          min="0"
                          step="0.0001"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/adm/nfts"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                  Criando...
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" /> Criar NFT
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 