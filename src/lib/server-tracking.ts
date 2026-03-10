// Server-side tracking helper for API routes
// Quando o pagamento é confirmado no servidor, salvamos os dados necessários
// para tracking que serão enviados ao cliente

export interface TrackingData {
  event: 'token_purchase';
  token: string;
  amount: number;
  transactionHash?: string;
}

// Função para preparar dados de tracking que serão enviados ao cliente
export function prepareTokenPurchaseTracking(
  token: string,
  amountBrl: number,
  walletAddress?: string
): TrackingData {
  return {
    event: 'token_purchase',
    token: token.toUpperCase(),
    amount: amountBrl,
    transactionHash: walletAddress // Temporariamente usando wallet address como ID
  };
}