// Tipos para integração com o banco de dados NFT

// Enum para categorias de NFTs
export enum NFTCategory {
  ART = 'art',
  COLLECTIBLE = 'collectible',
  TICKET = 'ticket',
  UTILITY = 'utility',
  IDENTITY = 'identity',
  MEMBERSHIP = 'membership'
}

// Enum para raridade de NFTs
export enum NFTRarity {
  COMMON = 'common',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

// Interface para Assets
export interface Asset {
  id: string;
  claimId?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  claimed: boolean;
  nftId: number;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  nftName?: string | null;
  category?: string | null;
  rarity?: NFTRarity | string | null;
  nftMainImageUrl?: string | null;
  categoryName?: string | null;
  categoryImageUrl?: string | null;
  claimedBy?: {
    username?: string | null;
    displayName?: string | null;
    walletAddress?: string | null;
    privyUserId?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  };
  claimedAt?: Date | string | null;
}

// Interface para NFTs
export interface NFT {
  id: number;
  title: string;
  description?: string | null;
  category?: NFTCategory | string | null;
  categoryId?: string | null; // ID da categoria da tabela categories
  categoryName?: string | null; // Nome da categoria da tabela categories
  categoryImageUrl?: string | null; // URL da imagem da categoria
  rarity?: NFTRarity | string | null;
  totalSupply: number;
  claimedSupply: number;
  maxPerUser: number;
  releaseDate?: Date | null;
  expirationDate?: Date | null;
  cooldownMinutes?: number | null; // Período em minutos para reclamar novamente (null se não for permitido)
  mainImageUrl?: string | null;
  secondaryImageUrl1?: string | null;
  secondaryImageUrl2?: string | null;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  // Requisitos de stake
  stakeRequired?: boolean;
  stakeTokenAddress?: string | null;
  stakeTokenAmount?: string | null;
  stakeTokenSymbol?: string | null;
  assetsToRedeemCount?: number;
  // Controle de exibição de estatísticas
  showStatistics?: boolean;
  // Additional computed fields for better UX
  isAvailable?: boolean;
  isSoldOut?: boolean;
  supplyPercentage?: number;
  remainingSupply?: number;
}

// Interface para NFTs reivindicados pelo usuário
export interface UserNFT {
  id: number;
  userId: string;
  nftId: number;
  claimedAt: Date;
  lastClaimedAt: Date;
  claimCount: number;
}

// Interface para NFTs disponíveis com informações extras
export interface AvailableNFT extends NFT {
  claimPercentage: number;
  remainingSupply: number;
  daysRemaining?: number | null;
  claimFrequency: string;
}

// Interface para parâmetros de consulta na API
export interface NFTQueryParams {
  category?: NFTCategory;
  rarity?: NFTRarity;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'releaseDate' | 'expirationDate' | 'rarity' | 'claimPercentage';
  sortOrder?: 'asc' | 'desc';
}

// Função para verificar se um usuário pode reivindicar um NFT
export interface CanClaimNFTParams {
  userId: string;
  nftId: number;
}

// Função para reivindicar um NFT
export interface ClaimNFTParams {
  userId: string;
  nftId: number;
}

// Resultado da reivindicação
export interface ClaimNFTResult {
  success: boolean;
  message: string;
  nft?: NFT;
  userNFT?: UserNFT;
  nextClaimTime?: Date | null;
  stakeRequired?: boolean;
  stakeTokenAddress?: string;
  stakeTokenAmount?: number;
  stakeTokenSymbol?: string;
  stakeVerified?: boolean;
}

// Interface para verificar requisitos de stake
export interface StakeRequirement {
  required: boolean;
  tokenAddress: string;
  tokenAmount: number;
  tokenSymbol: string;
}

// Resultado da verificação de stake
export interface StakeVerificationResult {
  success: boolean;
  message: string;
  currentAmount?: string;
  requiredAmount?: string;
  tokenSymbol?: string;
}