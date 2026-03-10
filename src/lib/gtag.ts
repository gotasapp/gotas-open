// Tipos de eventos do GA4 e Meta Pixel
declare global {
  interface Window {
    dataLayer: any[] | undefined;
    fbq: any;
    gtag?: (...args: any[]) => void;
  }
}

// Helper para enviar eventos ao GA4 diretamente
function sendGAEvent(eventName: string, params: Record<string, any>) {
  if (typeof window === 'undefined') return;
  // Garante dataLayer e função gtag disponíveis
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    // Define gtag para evitar erros caso o script ainda não tenha carregado
    window.gtag = function gtag() {
      // @ts-ignore
      window.dataLayer && window.dataLayer.push(arguments);
    };
  }
  try {
    window.gtag('event', eventName, params || {});
  } catch (e) {
    // Fallback muito defensivo
    // @ts-ignore
    window.dataLayer && window.dataLayer.push({ event: eventName, ...(params || {}) });
  }
}

// Mapeamento de tokens válidos
const VALID_TOKENS = {
  CHZ: 'CHZ',
  MENGO: 'MENGO',
  SPFC: 'SPFC',
  VERDAO: 'VERDAO',
  BAR: 'BAR',
  PSG: 'PSG',
  JUV: 'JUV',
  ATM: 'ATM',
  FLU: 'FLU',
  VASCO: 'VASCO',
  SACI: 'SACI'
} as const;

type ValidToken = keyof typeof VALID_TOKENS;

// Função auxiliar para validar tokens
function validateToken(token?: string): ValidToken {
  if (!token) return 'CHZ';
  const upperToken = token.toUpperCase();
  return VALID_TOKENS[upperToken as ValidToken] || 'CHZ';
}

// Função para rastrear conexão de carteira
export function trackWalletConnection(wallet: string, tokenPartner?: string) {
  try {
    // Formato da wallet: w_0x...
    const formattedWallet = wallet.startsWith('w_') ? wallet : `w_${wallet}`;
    const validatedToken = validateToken(tokenPartner);
    
    // Google Analytics 4
    sendGAEvent('connect_wallet_successful', {
      wallet: formattedWallet,
      token_partner: validatedToken,
    });
    
    // Meta Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', 'WalletConnected', {
        wallet: formattedWallet,
        token: validatedToken
      });
    }
    
    console.log('Wallet connection tracked:', { wallet: formattedWallet, token: validatedToken });
  } catch (error) {
    console.error('Error tracking wallet connection:', error);
  }
}

// Função para rastrear início do pagamento PIX
export function trackPixInitiated() {
  try {
    // Google Analytics 4
    sendGAEvent('pix_payment_initiated', {
      payment_method: 'PIX',
    });
    
    // Meta Pixel - InitiateCheckout
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        payment_method: 'PIX'
      });
    }
    
    console.log('PIX payment initiation tracked');
  } catch (error) {
    console.error('Error tracking PIX initiation:', error);
  }
}

// Função para rastrear compra de tokens concluída
export function trackTokenPurchase(tokenPartner: string, amountFiat: number, blockchainTransaction: string) {
  try {
    const validatedToken = validateToken(tokenPartner);
    
    // Google Analytics 4
    sendGAEvent('Buy_Tokens_successful', {
      token_partner: validatedToken,
      amount_fiat: amountFiat,
      blockchain_transaction: blockchainTransaction,
    });
    
    // Meta Pixel - Purchase
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: amountFiat,
        currency: 'BRL',
        content_name: validatedToken,
        content_type: 'token',
        transaction_id: blockchainTransaction
      });
    }
    
    console.log('Token purchase tracked:', { 
      token: validatedToken, 
      amount: amountFiat, 
      transaction: blockchainTransaction 
    });
  } catch (error) {
    console.error('Error tracking token purchase:', error);
  }
}

// Função auxiliar para debug - lista todos os eventos no dataLayer
export function debugDataLayer() {
  if (typeof window !== 'undefined' && window.dataLayer) {
    console.log('Current dataLayer:', window.dataLayer);
  } else {
    console.log('dataLayer not available');
  }
}

// =============== Staking / Unstaking / Claim Events ===============

function pushToDataLayer(payload: Record<string, any>) {
  if (typeof window !== 'undefined') {
    // Garante que o dataLayer existe antes de empurrar eventos,
    // evitando perda de eventos caso o GTM ainda não tenha carregado
    if (!window.dataLayer) {
      window.dataLayer = [];
    }
    window.dataLayer.push(payload);
  }
}

function formatWallet(address?: string) {
  if (!address) return undefined;
  return address.startsWith('w_') ? address : `w_${address}`;
}

// Stake events
export function trackStakeInitiated(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount } = params;
  pushToDataLayer({
    event: 'stake_initiated',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
  });
}

export function trackStakeSuccessful(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  txHash: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, txHash } = params;
  pushToDataLayer({
    event: 'stake_successful',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
    transaction_hash: txHash,
  });
}

export function trackStakeFailed(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount?: number;
  error: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, error } = params;
  pushToDataLayer({
    event: 'stake_failed',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
    error_message: error,
  });
}

// Unstake events
export function trackUnstakeInitiated(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount } = params;
  pushToDataLayer({
    event: 'unstake_initiated',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
  });
}

export function trackUnstakeSuccessful(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: number;
  txHash: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, txHash } = params;
  pushToDataLayer({
    event: 'unstake_successful',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
    transaction_hash: txHash,
  });
}

export function trackUnstakeFailed(params: {
  wallet?: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount?: number;
  error: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, error } = params;
  pushToDataLayer({
    event: 'unstake_failed',
    wallet: formatWallet(wallet),
    token_symbol: validateToken(tokenSymbol),
    token_address: tokenAddress,
    amount,
    error_message: error,
  });
}

// Claim events (staking claim and NFT claims)
export function trackClaimInitiated(params: {
  wallet?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: number;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount } = params;
  pushToDataLayer({
    event: 'claim_initiated',
    wallet: formatWallet(wallet),
    token_symbol: tokenSymbol ? validateToken(tokenSymbol) : undefined,
    token_address: tokenAddress,
    amount,
  });
}

export function trackClaimSuccessful(params: {
  wallet?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: number;
  txHash?: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, txHash } = params;
  pushToDataLayer({
    event: 'claim_successful',
    wallet: formatWallet(wallet),
    token_symbol: tokenSymbol ? validateToken(tokenSymbol) : undefined,
    token_address: tokenAddress,
    amount,
    transaction_hash: txHash,
  });
}

export function trackClaimFailed(params: {
  wallet?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: number;
  error: string;
}) {
  const { wallet, tokenSymbol, tokenAddress, amount, error } = params;
  pushToDataLayer({
    event: 'claim_failed',
    wallet: formatWallet(wallet),
    token_symbol: tokenSymbol ? validateToken(tokenSymbol) : undefined,
    token_address: tokenAddress,
    amount,
    error_message: error,
  });
}

// NFT claim specific
export function trackNftClaimInitiated(params: {
  nftId: string | number;
  nftTitle?: string;
  userId?: string;
  wallet?: string;
}) {
  const { nftId, nftTitle, userId, wallet } = params;
  pushToDataLayer({
    event: 'nft_claim_initiated',
    nft_id: String(nftId),
    nft_title: nftTitle,
    user_id: userId,
    wallet: formatWallet(wallet),
  });
}

export function trackNftClaimSuccessful(params: {
  nftId: string | number;
  nftTitle?: string;
  rarity?: string;
  userId?: string;
  wallet?: string;
}) {
  const { nftId, nftTitle, rarity, userId, wallet } = params;
  pushToDataLayer({
    event: 'nft_claim_successful',
    nft_id: String(nftId),
    nft_title: nftTitle,
    rarity,
    user_id: userId,
    wallet: formatWallet(wallet),
  });
}

export function trackNftClaimFailed(params: {
  nftId: string | number;
  nftTitle?: string;
  reason?: string;
  userId?: string;
  wallet?: string;
}) {
  const { nftId, nftTitle, reason, userId, wallet } = params;
  pushToDataLayer({
    event: 'nft_claim_failed',
    nft_id: String(nftId),
    nft_title: nftTitle,
    reason,
    user_id: userId,
    wallet: formatWallet(wallet),
  });
}

export function trackNftClaimBlockedByStake(params: {
  nftId: string | number;
  nftTitle?: string;
  requiredTokenSymbol?: string;
  requiredTokenAddress?: string;
  requiredAmount?: number;
  wallet?: string;
}) {
  const { nftId, nftTitle, requiredTokenSymbol, requiredTokenAddress, requiredAmount, wallet } = params;
  pushToDataLayer({
    event: 'nft_claim_blocked_stake_required',
    nft_id: String(nftId),
    nft_title: nftTitle,
    required_token_symbol: requiredTokenSymbol ? validateToken(requiredTokenSymbol) : undefined,
    required_token_address: requiredTokenAddress,
    required_amount: requiredAmount,
    wallet: formatWallet(wallet),
  });
}
