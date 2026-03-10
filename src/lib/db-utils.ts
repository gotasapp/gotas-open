import { NFT, NFTCategory, NFTRarity } from './types';

// Configuração da conexão com o banco Neon
const projectId = 'sweet-union-73123384';
const connectionString = process.env.DATABASE_URL;

// Função para mapear dados do banco para o formato de NFT
export function mapDBNFTToNFT(dbNFT: any): NFT {
  // dbNFT aqui é o objeto JSON retornado pela nossa API /api/nfts ou /api/nfts/[id]
  // A API retorna campos em snake_case do banco, então precisamos mapear corretamente
  return {
    id: dbNFT.id,
    title: dbNFT.name || 'Untitled NFT', // API retorna 'name', interface espera 'title'
    description: dbNFT.description || 'No description available',
    category: dbNFT.category || NFTCategory.ART, 
    categoryName: dbNFT.category_name || null,
    categoryImageUrl: dbNFT.category_image_url || null,
    rarity: dbNFT.rarity || NFTRarity.COMMON, 
    totalSupply: dbNFT.total_supply || 0, // API retorna snake_case
    claimedSupply: dbNFT.claimed_supply || 0, // API retorna snake_case
    maxPerUser: dbNFT.max_per_user || 1,   // API retorna snake_case
    releaseDate: dbNFT.release_date ? new Date(dbNFT.release_date) : new Date(), // API retorna snake_case
    expirationDate: dbNFT.expiration_date ? new Date(dbNFT.expiration_date) : null, // API retorna snake_case
    cooldownMinutes: dbNFT.cooldown_minutes || null, // API retorna snake_case
    mainImageUrl: dbNFT.main_image_url || '', // API retorna snake_case
    secondaryImageUrl1: dbNFT.secondary_image_url1 || null,
    secondaryImageUrl2: dbNFT.secondary_image_url2 || null,
    status: dbNFT.status || 'inactive',
    createdAt: dbNFT.created_at ? new Date(dbNFT.created_at) : new Date(), // API retorna snake_case
    updatedAt: dbNFT.updated_at ? new Date(dbNFT.updated_at) : new Date(),  // API retorna snake_case
    // Adicionar mapeamento para campos de stake
    stakeRequired: dbNFT.stake_required || false,
    stakeTokenAddress: dbNFT.stake_token_address || undefined,
    stakeTokenAmount: dbNFT.stake_token_amount || undefined,
    stakeTokenSymbol: dbNFT.stake_token_symbol || undefined,
    // Adicionar mapeamento para controle de estatísticas
    showStatistics: dbNFT.show_statistics
  };
}

// Função para obter todos os NFTs do banco
export async function fetchNFTs(): Promise<NFT[]> {
  try {
    // No ambiente de frontend, fazemos uma chamada para a API
    const response = await fetch('/api/nfts');
    
    if (!response.ok) {
      throw new Error('Falha ao buscar NFTs');
    }
    
    const data = await response.json();
    return data.map(mapDBNFTToNFT);
  } catch (error) {
    console.error('Erro ao buscar NFTs:', error);
    return [];
  }
}

// Função para obter um NFT específico pelo ID
export async function fetchNFTById(id: number): Promise<NFT | null> {
  try {
    // No ambiente de frontend, fazemos uma chamada para a API
    const response = await fetch(`/api/nfts/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`NFT com ID ${id} não encontrado (404)`);
        return null;
      }
      throw new Error(`Falha ao buscar NFT com ID ${id}: ${response.status}`);
    }
    
    const data = await response.json();
    return mapDBNFTToNFT(data);
  } catch (error) {
    console.error(`Erro ao buscar NFT com ID ${id}:`, error);
    return null;
  }
}

// Função para formatar dados adicionais para NFTs disponíveis
export function getAvailableNFTs(nfts: NFT[]) {
  return nfts.map(nft => {
    const claimPercentage = Math.round((nft.claimedSupply / nft.totalSupply) * 100);
    const remainingSupply = nft.totalSupply - nft.claimedSupply;
    const daysRemaining = nft.expirationDate 
      ? Math.ceil((new Date(nft.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
      : null;
    
    const claimFrequency = nft.cooldownMinutes 
      ? (() => {
          const minutes = nft.cooldownMinutes;
          
          if (minutes >= 1440 && minutes % 1440 === 0) {
            // Se for múltiplo exato de 1440 minutos (24 horas), mostrar em dias
            const days = minutes / 1440;
            return `Every ${days} day${days > 1 ? 's' : ''}`;
          } else if (minutes >= 60 && minutes % 60 === 0) {
            // Se for múltiplo exato de 60 minutos, mostrar em horas
            const hours = minutes / 60;
            return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
          } else {
            // Mostrar em minutos
            return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
          }
        })()
      : 'Once';

    return {
      ...nft,
      claimPercentage,
      remainingSupply,
      daysRemaining,
      claimFrequency
    };
  });
}