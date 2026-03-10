'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NFT, NFTCategory, NFTRarity } from '@/lib/types';
import { StakingToken } from '@/lib/tokens';
import { ArrowLeft, Save, Trash, UploadCloud } from 'lucide-react';

// Usando método de hook personalizado para extrair ID de forma segura,
// contornando o erro de React.use
import { useParams } from 'next/navigation';

export default function EditNFTPage() {
  // Obtendo o id via useParams, que não gera o erro de React.use
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '1';
  const router = useRouter();
  const [nft, setNft] = useState<NFT | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [secondaryImageFile1, setSecondaryImageFile1] = useState<File | null>(null);
  const [secondaryImageFile2, setSecondaryImageFile2] = useState<File | null>(null);

  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [secondaryImagePreview1, setSecondaryImagePreview1] = useState<string | null>(null);
  const [secondaryImagePreview2, setSecondaryImagePreview2] = useState<string | null>(null);

  // Form state - todos os campos necessários (alguns precisam ser adicionados via migração)
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
    status: '',
    showStatistics: true
  });

  const [availableApiStakingTokens, setAvailableApiStakingTokens] = useState<StakingToken[]>([]);
  const [isLoadingApiTokens, setIsLoadingApiTokens] = useState(true);

  // Nova função para chamar a API de upload
  const uploadImageThroughAPI = async (file: File, s3Path: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', s3Path); // Opcional, se a API for usar

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

  // Fetch staking tokens from API
  useEffect(() => {
    const fetchApiStakingTokens = async () => {
      setIsLoadingApiTokens(true);
      try {
        const response = await fetch('/api/staking-tokens');
        if (!response.ok) {
          throw new Error('Failed to fetch staking tokens from API');
        }
        const data = await response.json();
        // A API retorna tokens com `id` do banco, `token_id_internal`, `address`, etc.
        // Precisamos mapear para a estrutura que o formulário espera, se necessário,
        // ou ajustar o formulário para usar os campos da API.
        // Para StakingToken, o campo 'id' no frontend era o token_id_internal.
        // Vamos assumir que a API retorna um campo 'address' e 'symbol', e 'id' (PK do banco)
        // e um campo como 'token_id_internal' que corresponde ao antigo 'id' da lib.
        // Se a StakingToken da lib for usada, precisa de id, symbol, name, description, address, icon, decimals.
        // A API retorna: id (db), token_id_internal, symbol, name, description, address, icon_url, decimals, is_active
        // Vamos adaptar o tipo StakingToken ou criar um novo tipo/interface para os tokens da API se necessário.
        // Por agora, vamos assumir que a API pode ser usada diretamente se os campos corresponderem ou forem mapeados.
        
        // Exemplo de mapeamento se a StakingToken da lib for mantida e a API tiver campos diferentes:
        const mappedData = data.map((token: any) => ({
          id: token.token_id_internal, // Usar token_id_internal como o 'id' que o formulário espera para o select
          symbol: token.symbol,
          name: token.name,
          description: token.description,
          address: token.address,
          icon: token.icon_url, // Mapear icon_url para icon
          decimals: token.decimals,
          // db_id: token.id // Opcional, se precisar do ID do banco para algo específico
        }));
        setAvailableApiStakingTokens(mappedData as StakingToken[]);
      } catch (error) {
        console.error("Error fetching API staking tokens:", error);
        setFormError((prevError) => prevError + " Falha ao carregar tokens de stake para seleção.");
        setAvailableApiStakingTokens([]);
      } finally {
        setIsLoadingApiTokens(false);
      }
    };
    fetchApiStakingTokens();
  }, []);

  // Carregar dados do NFT
  useEffect(() => {
    const fetchNFT = async () => {
      try {
        const response = await fetch(`/api/nfts/${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Dados carregados da API:', data);
          console.log('cooldownMinutes do banco:', data.cooldown_minutes);
          console.log('Todos os campos da API:', Object.keys(data));
          
          setNft(data);
          
          const mappedFormData = {
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            rarity: data.rarity || '',
            releaseDate: data.release_date ? data.release_date.split('T')[0] : '',
            expirationDate: data.expiration_date ? data.expiration_date.split('T')[0] : '',
            totalSupply: String(data.total_supply || 1),
            maxPerUser: String(data.max_per_user || 1),
            cooldownMinutes: String(data.cooldown_minutes || 0),
            mainImageUrl: data.main_image_url || data.imageUrl || '', // imageUrl fallback mantido por segurança transitória
            secondaryImageUrl1: data.secondary_image_url1 || '',
            secondaryImageUrl2: data.secondary_image_url2 || '',
            stakeRequired: data.stake_required || false,
            stakeTokenAddress: data.stake_token_address || '',
            stakeTokenAmount: String(data.stake_token_amount || 0),
            stakeTokenSymbol: data.stake_token_symbol || '',
            tokenId: String(data.token_id || ''),
            metadataUrl: data.metadata_url || '',
            assetsToRedeemCount: String(data.assets_to_redeem_count || 0),
            status: data.status || '',
            showStatistics: data.show_statistics !== undefined ? data.show_statistics : true
          };
          
          console.log('FormData mapeado:', mappedFormData);
          console.log('cooldownMinutes mapeado:', mappedFormData.cooldownMinutes);
          
          setFormData(mappedFormData);
          
          // Definir previews iniciais se URLs existirem
          if (data.main_image_url || data.imageUrl) setMainImagePreview(data.main_image_url || data.imageUrl);
          if (data.secondary_image_url1) setSecondaryImagePreview1(data.secondary_image_url1);
          if (data.secondary_image_url2) setSecondaryImagePreview2(data.secondary_image_url2);
        } else {
          setFormError('Erro ao carregar NFT');
        }
      } catch (error) {
        console.error('Erro ao carregar NFT:', error);
        setFormError('Erro ao carregar NFT');
      } finally {
        setLoading(false);
      }
    };

    fetchNFT();
  }, [id]);

  useEffect(() => {
    console.log('FormData cooldownMinutes mudou para:', formData.cooldownMinutes);
  }, [formData.cooldownMinutes]);

  // Lidar com mudanças no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'stakeSelectedTokenId') {
      // Usar availableApiStakingTokens para encontrar o token selecionado
      const selectedToken = availableApiStakingTokens.find(token => token.id === value); // token.id aqui é o token_id_internal
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

  // Enviar formulário
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

      const payload = {
        ...formData,
        totalSupply: parseInt(formData.totalSupply),
        maxPerUser: parseInt(formData.maxPerUser),
        cooldownMinutes: parseInt(formData.cooldownMinutes) || 0,
        stakeTokenAmount: parseFloat(formData.stakeTokenAmount) || 0,
        assetsToRedeemCount: parseInt(formData.assetsToRedeemCount) || 0,
        mainImageUrl: updatedMainImageUrl,
        secondaryImageUrl1: updatedSecondaryImageUrl1,
        secondaryImageUrl2: updatedSecondaryImageUrl2,
      };

      const response = await fetch(`/api/nfts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push('/adm/nfts');
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || 'Erro ao atualizar NFT');
      }
    } catch (error) {
      console.error('Erro ao atualizar NFT:', error);
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Ocorreu um erro desconhecido ao atualizar o NFT.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Excluir NFT
  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este NFT? Esta ação não pode ser desfeita.')) {
      try {
        const response = await fetch(`/api/nfts/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          router.push('/adm/nfts');
        } else {
          const error = await response.json();
          setFormError(error.message || 'Erro ao excluir NFT');
        }
      } catch (error) {
        console.error('Erro ao excluir NFT:', error);
        setFormError('Erro ao excluir NFT');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!nft && !loading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold mb-2">NFT não encontrado</h2>
        <p className="text-gray-500 mb-4">O NFT que você está tentando editar não existe ou foi removido.</p>
        <Link href="/adm/nfts" className="text-blue-600 hover:underline">
          Voltar para lista de NFTs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/adm/nfts" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Editar NFT</h1>
        </div>
        <button
          onClick={handleDelete}
          className="inline-flex items-center justify-center rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100"
        >
          <Trash className="mr-1 h-4 w-4" /> Excluir NFT
        </button>
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
                {formData.mainImageUrl && !mainImagePreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Imagem atual:</p>
                    <img src={formData.mainImageUrl} alt="Imagem Principal Atual" className="h-20 w-20 object-cover rounded-md" />
                  </div>
                )}
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
                  >
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
                  >
                    {Object.values(NFTRarity).map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Adicionar campos extras que podem não existir até a migração ser executada */}
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

              {/* Campo para Imagem Secundária 1 */}
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
                {formData.secondaryImageUrl1 && !secondaryImagePreview1 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Imagem atual:</p>
                    <img src={formData.secondaryImageUrl1} alt="Imagem Secundária 1 Atual" className="h-20 w-20 object-cover rounded-md" />
                  </div>
                )}
              </div>

              {/* Campo para Imagem Secundária 2 */}
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
                {formData.secondaryImageUrl2 && !secondaryImagePreview2 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Imagem atual:</p>
                    <img src={formData.secondaryImageUrl2} alt="Imagem Secundária 2 Atual" className="h-20 w-20 object-cover rounded-md" />
                  </div>
                )}
              </div>

              {/* Configurações Avançadas */}
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

              <div className="grid grid-cols-1 gap-4">
                <p className="text-xs text-gray-500 mt-2">
                  Nota: Alguns campos podem não funcionar até que a migração do banco de dados seja executada.
                  Utilize o script add_stake_requirements.sql para adicionar os campos de requisitos de stake.
                </p>
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
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}