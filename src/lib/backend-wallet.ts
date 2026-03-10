/**
 * Backend Wallet Helper
 *
 * Cria conta Thirdweb a partir de private key para operações administrativas
 * Usado para adicionar usuários à whitelist do contrato de Burn Staking
 */

import { privateKeyToAccount } from 'thirdweb/wallets';
import { thirdwebClient } from './thirdweb-client';

/**
 * Cria wallet backend a partir da private key configurada em .env
 * Esta wallet tem permissão de admin no contrato de Burn Staking
 *
 * @throws {Error} Se BURN_WHITELIST_PRIVATE_KEY não estiver configurada
 * @returns Conta Thirdweb criada a partir da private key
 */
export function getBackendWallet() {
  const privateKey = process.env.BURN_WHITELIST_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('BURN_WHITELIST_PRIVATE_KEY not configured in environment');
  }

  if (!privateKey.startsWith('0x')) {
    throw new Error('BURN_WHITELIST_PRIVATE_KEY must start with 0x');
  }

  try {
    return privateKeyToAccount({
      client: thirdwebClient,
      privateKey,
    });
  } catch (error) {
    console.error('Error creating backend wallet:', error);
    throw new Error('Failed to create backend wallet from private key');
  }
}
