/**
 * Utilitários para verificação de requisitos de stake para mint de NFTs
 */
import { StakeRequirement, StakeVerificationResult } from '@/lib/types';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import stakingABI from '@/abis/FTStakingABI.json';

/**
 * Verifica se um usuário tem o valor necessário em stake para um token específico
 * @param userAddress Endereço da carteira do usuário
 * @param requirement Requisitos de stake para verificação
 * @returns Resultado da verificação com status e detalhes
 */
export async function verifyStakeRequirement(
  userAddress: string,
  requirement: StakeRequirement
): Promise<StakeVerificationResult> {
  try {
    // Se não houver requisito de stake, a verificação é bem-sucedida por padrão
    if (!requirement.required) {
      return { 
        success: true, 
        message: 'Este NFT não exige stake para resgate' 
      };
    }

    // Verificar se os parâmetros necessários estão presentes
    if (!requirement.tokenAddress || !requirement.tokenAmount || !requirement.tokenSymbol) {
      return { 
        success: false, 
        message: 'Requisitos de stake incompletos' 
      };
    }

    // Configurar o cliente Viem para interagir com a blockchain
    const rpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.chiliz.com';
    if (!rpcUrl) {
      return { 
        success: false, 
        message: 'Configuração RPC ausente' 
      };
    }

    // Criar o cliente público para interagir com a blockchain (somente leitura)
    const client = createPublicClient({
      chain: chiliz,
      transport: http(rpcUrl)
    });

    // Obter o endereço do contrato de staking
    const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
    if (!contractAddress) {
      return { 
        success: false, 
        message: 'Endereço do contrato de staking não definido' 
      };
    }

    console.log(`Verificando stake para ${userAddress}, token: ${requirement.tokenAddress}, mínimo: ${requirement.tokenAmount} ${requirement.tokenSymbol}`);

    // Chamar o contrato de staking para obter informações de stake
    const stakeData = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: stakingABI,
      functionName: 'getStakeData',
      args: [userAddress as `0x${string}`, requirement.tokenAddress as `0x${string}`, false]
    });

    // Processar os dados retornados
    if (stakeData && (stakeData as {totalStake?: bigint}).totalStake) {
      // Determinar decimais do token com heurística robusta
      let decimals = 18;
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      try {
        if (requirement.tokenAddress?.toLowerCase() === zeroAddress) {
          // CHZ nativo
          decimals = 18;
        } else if (requirement.tokenAddress) {
          // Tentar ler decimais do contrato ERC-20
          const erc20Decimals = await client.readContract({
            address: requirement.tokenAddress as `0x${string}`,
            abi: [{ "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" }],
            functionName: 'decimals',
          }) as number;
          if (typeof erc20Decimals === 'number' && erc20Decimals >= 0 && erc20Decimals <= 36) {
            decimals = erc20Decimals;
          }
        } else if (requirement.tokenSymbol?.toUpperCase() === 'CHZ') {
          decimals = 18;
        } else {
          // Fan tokens padrão
          decimals = 0;
        }
      } catch {
        // Fallback: se símbolo indicar fan token comum, usar 0; senão 18
        decimals = requirement.tokenSymbol?.toUpperCase() === 'CHZ' ? 18 : 0;
      }

      console.log(`[verifyStake] Token: ${requirement.tokenSymbol}, decimals: ${decimals}`);

      // Usar o valor correto de decimais para divisão
      const divisor = 10 ** decimals;
      const totalStake = Number((stakeData as {totalStake: bigint}).totalStake) / divisor;
      const formattedStake = totalStake.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
      
      // Verificar se o valor em stake atende ao requisito mínimo
      if (totalStake >= requirement.tokenAmount) {
        return {
          success: true,
          message: `Você tem ${formattedStake} ${requirement.tokenSymbol} em stake, atendendo ao requisito mínimo de ${requirement.tokenAmount}`,
          currentAmount: formattedStake,
          requiredAmount: requirement.tokenAmount.toString(),
          tokenSymbol: requirement.tokenSymbol
        };
      } else {
        return {
          success: false,
          message: `Você precisa de pelo menos ${requirement.tokenAmount} ${requirement.tokenSymbol} em stake para resgatar este NFT. Atualmente você tem ${formattedStake}`,
          currentAmount: formattedStake,
          requiredAmount: requirement.tokenAmount.toString(),
          tokenSymbol: requirement.tokenSymbol
        };
      }
    }

    // Se não houver dados de stake, o usuário não tem stake
    return {
      success: false,
      message: `Você precisa de pelo menos ${requirement.tokenAmount} ${requirement.tokenSymbol} em stake para resgatar este NFT`,
      currentAmount: '0',
      requiredAmount: requirement.tokenAmount.toString(),
      tokenSymbol: requirement.tokenSymbol
    };
    
  } catch (error) {
    console.error("Erro ao verificar requisitos de stake:", error);
    return { 
      success: false, 
      message: 'Error verifying stake requirements. Please try again.' 
    };
  }
}
