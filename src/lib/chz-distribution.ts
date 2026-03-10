/**
 * CHZ Distribution Utilities
 * Handles the distribution of CHZ rewards to users after burning cards
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { chiliz } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Interface for CHZ transfer result
 */
export interface CHZTransferResult {
  success: boolean;
  transactionHash?: string;
  amount: string;
  recipient: string;
  error?: string;
}

/**
 * Get the backend wallet account from environment
 * This wallet should have CHZ to distribute as rewards
 */
function getBackendWalletAccount() {
  const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY not configured');
  }

  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  return privateKeyToAccount(formattedKey as `0x${string}`);
}

/**
 * Transfer CHZ rewards to a user wallet
 * @param recipientAddress The wallet address to receive CHZ
 * @param amountInCHZ The amount of CHZ to send (not in wei)
 * @returns Transfer result with transaction hash
 */
export async function transferCHZToUser(
  recipientAddress: string,
  amountInCHZ: number
): Promise<CHZTransferResult> {
  try {
    // Validate inputs
    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      throw new Error('Invalid recipient address');
    }

    if (amountInCHZ <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Get RPC URL from environment
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';

    // Create wallet client for sending transactions
    const account = getBackendWalletAccount();
    const walletClient = createWalletClient({
      account,
      chain: chiliz,
      transport: http(rpcUrl)
    });

    // Create public client for reading blockchain data
    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    // Convert CHZ amount to wei (18 decimals for CHZ)
    const amountInWei = parseEther(amountInCHZ.toString());

    // Check backend wallet balance
    const balance = await publicClient.getBalance({
      address: account.address
    });

    if (balance < amountInWei) {
      throw new Error(`Insufficient CHZ balance in backend wallet. Required: ${amountInCHZ} CHZ, Available: ${formatEther(balance)} CHZ`);
    }

    // Send CHZ transaction
    const hash = await walletClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountInWei,
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1
    });

    if (receipt.status === 'success') {
      return {
        success: true,
        transactionHash: hash,
        amount: amountInCHZ.toString(),
        recipient: recipientAddress
      };
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error) {
    console.error('Error transferring CHZ:', error);
    return {
      success: false,
      amount: amountInCHZ.toString(),
      recipient: recipientAddress,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Batch transfer CHZ to multiple users
 * Useful for distributing rewards to multiple users at once
 * @param transfers Array of recipient addresses and amounts
 * @returns Array of transfer results
 */
export async function batchTransferCHZ(
  transfers: Array<{ address: string; amount: number }>
): Promise<CHZTransferResult[]> {
  const results: CHZTransferResult[] = [];

  for (const transfer of transfers) {
    const result = await transferCHZToUser(transfer.address, transfer.amount);
    results.push(result);

    // Add small delay between transfers to avoid rate limiting
    if (transfer !== transfers[transfers.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Check CHZ balance of an address
 * @param address The wallet address to check
 * @returns Balance in CHZ (not wei)
 */
export async function getCHZBalance(address: string): Promise<number> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    const balance = await publicClient.getBalance({
      address: address as `0x${string}`
    });

    return parseFloat(formatEther(balance));
  } catch (error) {
    console.error('Error checking CHZ balance:', error);
    return 0;
  }
}

/**
 * Estimate gas for CHZ transfer
 * @param recipientAddress The recipient address
 * @param amountInCHZ The amount to send in CHZ
 * @returns Estimated gas cost in CHZ
 */
export async function estimateCHZTransferGas(
  recipientAddress: string,
  amountInCHZ: number
): Promise<number> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || 'https://rpc.chiliz.com';
    const account = getBackendWalletAccount();

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    const amountInWei = parseEther(amountInCHZ.toString());

    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: recipientAddress as `0x${string}`,
      value: amountInWei
    });

    const gasPrice = await publicClient.getGasPrice();
    const gasCostInWei = gasEstimate * gasPrice;

    return parseFloat(formatEther(gasCostInWei));
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Default gas estimate
    return 0.001;
  }
}