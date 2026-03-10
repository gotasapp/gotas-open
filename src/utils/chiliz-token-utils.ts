/**
 * Utilitário para interagir com tokens CHZ na Chiliz Chain
 */
import { WalletWithMetadata } from '@privy-io/react-auth';
import stakingABI from '@/abis/FTStakingABI.json';

/**
 * Obtém o saldo nativo (CHZ) da carteira na Chiliz Chain
 * @param wallet Carteira Privy conectada
 * @returns O saldo formatado em CHZ
 */
export async function getNativeBalance(wallet: WalletWithMetadata): Promise<string> {
  try {
    if (!wallet || !wallet.address) {
      console.warn("[getNativeBalance] Wallet or wallet address is missing.");
      return "0";
    }

    const targetAddress = wallet.address as `0x${string}`;
    const decimals = 18; // CHZ native token decimals
    const divisor = 10 ** decimals;

    // Primeiro, tenta usar o provider da Privy se for uma carteira embedded
    if (wallet.walletClientType === 'privy' && typeof (wallet as any).getEthereumProvider === 'function') {
      try {
        const provider = await (wallet as any).getEthereumProvider(); // Garante que é uma promise
        const balanceHex = await provider.request({
          method: 'eth_getBalance',
          params: [targetAddress, 'latest'],
        });
        if (balanceHex) {
          const balanceBigInt = BigInt(balanceHex);
          return (Number(balanceBigInt) / divisor).toString();
        }
      } catch (privyError) {
        console.error("[getNativeBalance] Error getting balance from Privy provider:", privyError);
        // Continua para o fallback RPC se falhar
      }
    }

    // Fallback para PublicClient com RPC URL para todos os outros casos ou se Privy falhar
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

    if (!rpcUrl) {
      console.error("[getNativeBalance] Missing RPC URL for fallback.");
      return "0";
    }

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({ address: targetAddress });
    return (Number(balance) / divisor).toString();

  } catch (error) {
    console.error("[getNativeBalance] General error getting native balance:", error);
    return "0";
  }
}

/**
 * Obtém o saldo de token ERC20 da carteira
 * @param wallet Carteira Privy conectada
 * @param tokenAddress Endereço do contrato do token
 * @returns O saldo formatado
 */
export async function getTokenBalance(
  wallet: WalletWithMetadata,
  tokenAddress: `0x${string}`
): Promise<{ balance: string; symbol: string }> {
  try {
    if (!wallet || !wallet.address) {
      return { balance: "0", symbol: "???" };
    }

    // Create a Viem client for querying balances
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

    if (!rpcUrl) {
      console.error("Missing RPC URL");
      return { balance: "0", symbol: "???" };
    }

    const client = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    // Get token balance
    const balance = await client.readContract({
      address: tokenAddress,
      abi: [
        { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
        { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" },
        { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }
      ],
      functionName: 'balanceOf',
      args: [wallet.address as `0x${string}`]
    });

    // Get token decimals
    const decimals = await client.readContract({
      address: tokenAddress,
      abi: [{ "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" }],
      functionName: 'decimals',
    }) as number;

    // Get token symbol
    const symbol = await client.readContract({
      address: tokenAddress,
      abi: [{ "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }],
      functionName: 'symbol',
    }) as string;

    // Format the balance
    const formattedBalance = Number(balance) / (10 ** decimals);

    return {
      balance: formattedBalance.toString(),
      symbol
    };
  } catch (error) {
    console.error("Error getting token balance:", error);
    return { balance: "0", symbol: "???" };
  }
}

/**
 * Obtém a quantidade de tokens em stake
 * @param wallet Carteira Privy conectada
 * @param tokenAddress Endereço do contrato do token
 * @param contractAddress Endereço do contrato de staking
 * @returns O saldo em stake formatado
 */
export async function getStakedAmount(
  walletAddress: string,
  tokenAddress: string,
  contractAddress: string
): Promise<string> {
  try {
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');

    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
    if (!rpcUrl || !contractAddress) {
      console.error("Missing RPC URL or contract address");
      return "0";
    }

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    // Get stake data using getStakeData function to get detailed stake information
    const stakeData = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: stakingABI,
      functionName: 'getStakeData',
      args: [walletAddress as `0x${string}`, tokenAddress as `0x${string}`, false]
    });

    // Format the totalStake field from the response
    if (stakeData && (stakeData as any).totalStake) {
      // Importar helpers para detectar fan tokens
      const { isFanToken } = await import('@/lib/tokens');
      
      // Verificar se o token é um fan token (como MENGO - decimais = 0)
      const isFan = isFanToken({ id: '', symbol: '', name: '', description: '', address: tokenAddress });
      const decimals = isFan ? 0 : 18;
      
      // Usar o valor correto de decimais para divisão
      const divisor = 10 ** decimals;
      const totalStake = Number((stakeData as any).totalStake) / divisor;
      return totalStake.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    }

    return "0";
  } catch (error) {
    console.error("Error getting staked amount:", error);
    return "0";
  }
}

/**
 * Verifica se o saldo é suficiente para transação (Desabilitado)
 * @param balance Saldo atual
 * @param requiredAmount Quantidade necessária
 * @returns true se o saldo for suficiente
 */
export function hasEnoughBalance(balance: string, requiredAmount: string): boolean {
  return false;
}

/**
 * Obtém o período de cooldown para unstake do contrato de staking.
 * @param stakingContractAddress Endereço do contrato de staking.
 * @returns O período de cooldown em segundos, como string.
 */
export async function getUnstakeCooldownPeriod(stakingContractAddress: string): Promise<string> {
  try {
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

    if (!rpcUrl) {
      console.error("[getUnstakeCooldownPeriod] Missing RPC URL");
      return "0"; 
    }
    if (!stakingContractAddress) {
      console.error("[getUnstakeCooldownPeriod] Missing staking contract address");
      return "0";
    }

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl),
    });

    const cooldownPeriod = await publicClient.readContract({
      address: stakingContractAddress as `0x${string}`,
      abi: stakingABI,
      functionName: 'unstakePeriod',
      args: [],
    });

    return (cooldownPeriod as bigint).toString(); // Convertendo para string, assumindo que é BigInt
  } catch (error) {
    console.error("[getUnstakeCooldownPeriod] Error fetching unstake cooldown period:", error);
    return "Error"; // Retorna "Error" ou "0" para indicar falha
  }
}

/**
 * Obtém a quantidade de tokens que podem ser resgatados (claimed) por um staker para um token específico.
 * @param stakerAddress Endereço da carteira do staker.
 * @param tokenAddress Endereço do contrato do token.
 * @param stakingContractAddress Endereço do contrato de staking.
 * @returns A quantidade de tokens resgatáveis como BigInt.
 */
export async function getClaimableAmount(
  stakerAddress: string,
  tokenAddress: string,
  stakingContractAddress: string
): Promise<bigint> {
  try {
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';

    if (!rpcUrl) {
      console.error("[getClaimableAmount] Missing RPC URL");
      return BigInt(0);
    }
    if (!stakingContractAddress || !stakerAddress || !tokenAddress) {
      console.error("[getClaimableAmount] Missing required addresses");
      return BigInt(0);
    }

    const publicClient = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl),
    });

    // A ABI FTStakingABI.json tem getClaimableStake(address staker, address token)
    let claimable = await publicClient.readContract({
      address: stakingContractAddress as `0x${string}`,
      abi: stakingABI,
      functionName: 'getClaimableStake',
      args: [stakerAddress as `0x${string}`, tokenAddress as `0x${string}`],
    });

    // Fallback: alguns contratos podem reportar melhor via getStakeData.totalClaimable
    let asBigInt = claimable as bigint;
    if (asBigInt === BigInt(0)) {
      try {
        const stakeData = await publicClient.readContract({
          address: stakingContractAddress as `0x${string}`,
          abi: stakingABI,
          functionName: 'getStakeData',
          args: [stakerAddress as `0x${string}`, tokenAddress as `0x${string}`, false],
        });
        if (stakeData && (stakeData as any).totalClaimable !== undefined) {
          asBigInt = (stakeData as any).totalClaimable as bigint;
        }
      } catch (fallbackErr) {
        // silencioso: manter 0 se fallback falhar
      }
    }

    return asBigInt; // uint256 como bigint
  } catch (error) {
    console.error("[getClaimableAmount] Error fetching claimable amount for token", tokenAddress, ":", error);
    return BigInt(0);
  }
}

/**
 * Obtém a quantidade de tokens ainda pendentes de cooldown após unstake.
 */
export async function getPendingUnstakeAmount(
  stakerAddress: string,
  tokenAddress: string,
  stakingContractAddress: string
): Promise<bigint> {
  try {
    const { createPublicClient, http } = await import('viem');
    const { chiliz } = await import('@/lib/chains');
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
    if (!rpcUrl) return BigInt(0);
    const publicClient = createPublicClient({ chain: chiliz, transport: http(rpcUrl) });
    const stakeData = await publicClient.readContract({
      address: stakingContractAddress as `0x${string}`,
      abi: stakingABI,
      functionName: 'getStakeData',
      args: [stakerAddress as `0x${string}`, tokenAddress as `0x${string}`, false],
    });
    return (stakeData as any).totalPendingUnstake as bigint;
  } catch (err) {
    console.error('[getPendingUnstakeAmount] Error:', err);
    return BigInt(0);
  }
}
