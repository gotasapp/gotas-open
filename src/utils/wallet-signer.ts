/**
 * Utilitário para assinar mensagens usando carteiras Web3 diretamente
 * Alternativa à API de assinatura da Privy.io
 */

/**
 * Assina uma mensagem usando o provider de carteira injetado (window.ethereum)
 * Esta função utiliza o método personal_sign diretamente do provider
 */
export async function signMessageWithProvider(message: string): Promise<string> {
  try {
    // Verifica se o window.ethereum está disponível
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Ethereum provider not found. Please install MetaMask or another Web3 wallet.');
    }

    // Solicita acesso às contas
    // @ts-ignore
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet and try again.');
    }

    // Usa a primeira conta
    const from = accounts[0];
    
    // Assina a mensagem usando personal_sign (EIP-191)
    // @ts-ignore
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, from]
    });

    return signature;
  } catch (error: any) {
    throw new Error(`Falha ao assinar mensagem: ${error.message || error}`);
  }
}

/**
 * Retorna todas as contas disponíveis no provider
 */
export async function getProviderAccounts(): Promise<string[]> {
  try {
    // Verifica se o window.ethereum está disponível
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Provider Ethereum não encontrado');
    }

    // Solicita acesso às contas
    // @ts-ignore
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts || [];
  } catch (error: any) {
    return [];
  }
}

/**
 * Verifica se o usuário tem um provider de carteira injetado e disponível
 */
export function hasWalletProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}