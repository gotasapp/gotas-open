// Tipos para o Marketplace NFT - Thirdweb v3

export interface MarketplaceListing {
  listingId: string;
  tokenId: string;
  quantity: string;
  pricePerToken: string;
  priceInCHZ: string; // Preço formatado em CHZ para UI
  startTimestamp: number;
  endTimestamp: number;
  listingCreator: string;
  assetContract: string;
  currency: string;
  tokenType: TokenType;
  status: ListingStatus;
  statusText: string; // Status legível em português
  reserved: boolean;
  isActive: boolean; // Se está ativo e não expirado
  isExpired: boolean; // Se já expirou
  timeRemaining?: string; // Tempo restante formatado
  // NFT associado ao listing
  nft: NFTWithMetadata;
}

export interface ListingParameters {
  assetContract: string;
  tokenId: string;
  quantity: string;
  currency: string;
  pricePerToken: string;
  startTimestamp: number;
  endTimestamp: number;
  reserved: boolean;
}

export enum TokenType {
  ERC721 = 0,
  ERC1155 = 1,
  ERC20 = 2
}

export enum ListingStatus {
  UNSET = 0,
  CREATED = 1,
  COMPLETED = 2,
  CANCELLED = 3
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface NFTWithMetadata {
  tokenId: string;
  owner: string;
  metadata: NFTMetadata;
  // Dados do database quando disponível
  assetData?: {
    id: number;
    title: string;
    rarity: string;
    nft_number: number;
    image_url: string;
  };
  // Dados do marketplace se listado
  listingData?: MarketplaceListing;
}

export interface CreateListingParams {
  tokenId: string;
  priceInCHZ: string;
  durationInDays: number;
  reserved?: boolean;
}

export interface BuyFromListingParams {
  listingId: string;
  priceInCHZ: string;
  buyFor?: string; // endereço do comprador, default: próprio usuário
}

export interface MarketplaceFilters {
  minPrice?: string;
  maxPrice?: string;
  rarity?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  onlyAvailable?: boolean;
}

export interface MarketplaceActivity {
  id: number;
  listingId: string;
  tokenId: string;
  sellerAddress: string;
  buyerAddress?: string;
  priceChz: string;
  currencyAddress: string;
  activityType: 'LISTED' | 'SOLD' | 'CANCELLED';
  transactionHash?: string;
  blockNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para contratos ERC721
export interface ERC721ContractInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
}

// Tipos para validação de chain
export interface ChainValidationResult {
  isValidChain: boolean;
  currentChainId?: number;
  requiredChainId: number;
  chainName: string;
}

// Tipos para erros específicos do marketplace
export enum MarketplaceErrorType {
  CHAIN_MISMATCH = 'CHAIN_MISMATCH',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  NFT_NOT_APPROVED = 'NFT_NOT_APPROVED',
  NFT_NOT_OWNED = 'NFT_NOT_OWNED',
  LISTING_EXPIRED = 'LISTING_EXPIRED',
  LISTING_NOT_FOUND = 'LISTING_NOT_FOUND',
  INVALID_PRICE = 'INVALID_PRICE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  METADATA_FETCH_FAILED = 'METADATA_FETCH_FAILED'
}

export interface MarketplaceError {
  type: MarketplaceErrorType;
  message: string;
  details?: any;
}

// Tipos para configuração do marketplace
export interface MarketplaceConfig {
  contractAddress: string;
  nftContractAddress: string;
  chainId: number;
  feePercentage: number;
  maxListingDurationDays: number;
  minPriceChz: string;
  maxPriceChz: string;
}

// Estados de loading para hooks
export interface LoadingState {
  isLoading: boolean;
  error?: MarketplaceError | null;
}

export interface TransactionState extends LoadingState {
  isTransactionPending: boolean;
  transactionHash?: string;
}

// Resposta da API para buscar NFTs
export interface UserNFTsResponse {
  nfts: NFTWithMetadata[];
  totalCount: number;
  hasMore: boolean;
}

export interface MarketplaceListingsResponse {
  listings: MarketplaceListing[];
  totalCount: number;
  hasMore: boolean;
}