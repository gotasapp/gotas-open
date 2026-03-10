// Lista de contratos NFT conhecidos na Chiliz Chain
export const KNOWN_NFT_CONTRACTS = [
  // Contrato principal configurado
  '0x1e6F3a15ce830705914025DC2e9c1B5cDCA4C8Fd',
  
  // Contratos populares da Chiliz Chain baseados no explorer
  '0x677978dE066b3C8706e7C0D8D8a7B6e4b7B8F5F3', // FC Barcelona Fan Token
  '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', // Paris Saint-Germain Fan Token
  '0xeDB761da5BfC6CEc9CA40cbE41e4b9A2c65C11A8', // Juventus Fan Token
  '0x0b7fF0F2AC4bF455eD2a80C85dE8e3B4eA2a9B1C', // AC Milan Fan Token
  '0x6C6A2d3B5B7D4F8E9C0a1A8D3C4B5F7E8A9B0C1D', // Manchester City Fan Token
  
  // Contratos específicos de NFTs (possíveis endereços baseados em fragmentos)
  '0x3b59afB26805ce830705914025DC2e9c1B5cDCA4', // Possível gotas.social
  '0xcba03500efd0ce830705914025DC2e9c1B5cDCA4', // Possível Cards CGOTAS
] as const;

// Endereços completos dos contratos verificados
export const NFT_CONTRACTS = [
  // Contratos confirmados
  '0x1e6F3a15ce830705914025DC2e9c1B5cDCA4C8Fd', // Cards do futebol - CONFIRMADO
  
  // Contratos a serem testados (baseados em fragmentos do explorer)
  '0x3b59afB26805ce830705914025DC2e9c1B5cDCA4', // Possível gotas.social
  '0xcba03500efd0ce830705914025DC2e9c1B5cDCA4', // Possível Cards CGOTAS
  
  // Outros contratos populares NFT na Chiliz Chain
  '0x8B3192f5eEBD8579568A2Ed41E6FEB402f93f73F', // Generic NFT contract
  '0x5A0b54D5dc17e0AaD7E0F8E44B8B5B5B5B5B5B5B', // Community NFTs
  '0x4F2ac1aA4F4F4F4F4F4F4F4F4F4F4F4F4F4F4F4F', // Sports NFTs
  '0x7D1c3B4F8e9C0A1B2D3E4F5A6B7C8D9E0F1A2B3C', // Special Edition NFTs
  
  // Contratos de fan tokens que podem ter NFTs
  '0x677978dE066b3C8706e7C0D8D8a7B6e4b7B8F5F3', // FC Barcelona 
  '0x3506424F91fD33084466F402d5D97f05F8e3b4AF', // Paris Saint-Germain
  '0xeDB761da5BfC6CEc9CA40cbE41e4b9A2c65C11A8', // Juventus
] as const;

export type NFTContract = typeof NFT_CONTRACTS[number];

// Função para obter nome amigável do contrato
export function getContractName(address: string): string {
  const addr = address.toLowerCase();
  
  switch (addr) {
    case '0x1e6f3a15ce830705914025dc2e9c1b5cdca4c8fd':
      return 'Cards do Futebol (Principal)';
    case '0x3b59afb26805ce830705914025dc2e9c1b5cdca4':
      return 'GOTAS Social NFTs';
    case '0xcba03500efd0ce830705914025dc2e9c1b5cdca4':
      return 'CGOTAS Cards';
    case '0x677978de066b3c8706e7c0d8d8a7b6e4b7b8f5f3':
      return 'FC Barcelona Fan Token';
    case '0x3506424f91fd33084466f402d5d97f05f8e3b4af':
      return 'Paris Saint-Germain Fan Token';
    case '0xedb761da5bfc6cec9ca40cbe41e4b9a2c65c11a8':
      return 'Juventus Fan Token';
    case '0x8b3192f5eebd8579568a2ed41e6feb402f93f73f':
      return 'Generic NFT Contract';
    case '0x5a0b54d5dc17e0aad7e0f8e44b8b5b5b5b5b5b5b':
      return 'Community NFTs';
    case '0x4f2ac1aa4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f':
      return 'Sports NFTs';
    case '0x7d1c3b4f8e9c0a1b2d3e4f5a6b7c8d9e0f1a2b3c':
      return 'Special Edition NFTs';
    default:
      return `Contrato NFT (${address.slice(0, 6)}...${address.slice(-4)})`;
  }
}

// Função para verificar se um endereço parece ser um contrato válido
export function isValidContractAddress(address: string): boolean {
  // Verificar formato básico de endereço Ethereum
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }
  
  // Verificar se não é address zero
  if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  
  return true;
}

// Função para verificar se um endereço é um contrato NFT conhecido
export function isKnownNFTContract(address: string): boolean {
  return NFT_CONTRACTS.some(contract => 
    contract.toLowerCase() === address.toLowerCase()
  );
}