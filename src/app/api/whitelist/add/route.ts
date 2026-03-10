import { NextRequest } from 'next/server';
import { addToWhitelist, isWhitelisted } from '@/lib/burn-staking-contract';
import { getBackendWallet } from '@/lib/backend-wallet';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';

/**
 * POST /api/whitelist/add
 *
 * Adiciona um endereço à whitelist do contrato de Burn Staking
 * Usa a wallet backend (admin) para executar a transação
 *
 * Body:
 * {
 *   "address": "0x..." // Endereço da carteira do usuário
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Adicionado à whitelist com sucesso"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    // Validar endereço
    if (!address) {
      return errorResponse('Address is required', 400);
    }

    // Validar formato de endereço Ethereum
    if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return errorResponse('Invalid Ethereum address format', 400);
    }

    console.log(`[WHITELIST] Adding address to whitelist: ${address}`);

    // Verificar se já está na whitelist
    const alreadyWhitelisted = await isWhitelisted(address);
    if (alreadyWhitelisted) {
      console.log(`[WHITELIST] Address ${address} is already whitelisted`);
      return successResponse({
        success: true,
        message: 'Usuário já está na whitelist',
        address,
        alreadyWhitelisted: true,
      });
    }

    // Criar wallet backend
    const backendWallet = getBackendWallet();
    console.log(`[WHITELIST] Using backend wallet: ${backendWallet.address}`);

    // Adicionar à whitelist via contrato
    console.log(`[WHITELIST] Sending transaction to add ${address} to whitelist...`);
    const receipt = await addToWhitelist(address, backendWallet);
    console.log(`[WHITELIST] Transaction confirmed! Hash: ${receipt.transactionHash}`);

    // Verificar on-chain via RPC com retry logic
    console.log(`[WHITELIST] Verifying whitelist status via RPC...`);
    let verified = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!verified && attempts < maxAttempts) {
      attempts++;
      console.log(`[WHITELIST] Verification attempt ${attempts}/${maxAttempts}...`);

      verified = await isWhitelisted(address);

      if (!verified && attempts < maxAttempts) {
        console.log(`[WHITELIST] Not verified yet, waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!verified) {
      console.error(`[WHITELIST] Verification failed after ${maxAttempts} attempts: ${address} not whitelisted on-chain`);
      return errorResponse('Transaction confirmed but verification failed. Please check the contract permissions.', 500);
    }

    console.log(`[WHITELIST] Successfully verified ${address} is whitelisted on-chain`);

    return successResponse({
      success: true,
      message: 'Adicionado à whitelist com sucesso',
      address,
      verified: true,
    });
  } catch (error) {
    console.error('[WHITELIST ERROR] Failed to add to whitelist:', error);
    return handleApiError(error);
  }
}
