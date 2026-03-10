import { NextRequest } from 'next/server';
import { query } from '@/lib/db-pool';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import { getUserBurnHistory } from '@/lib/burn-rewards-db';
import { getCHZBalance } from '@/lib/chz-distribution';

/**
 * GET endpoint to fetch a user's burn rewards balance and history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privyUserId = searchParams.get('privyUserId');

    if (!privyUserId) {
      return errorResponse('privyUserId é obrigatório', 400);
    }

    // Get user's burn history
    const burnHistory = await getUserBurnHistory(privyUserId, 20);

    // Calculate total rewards from history
    let totalChzEarned = 0;
    let totalCardsBurned = 0;
    const rewardsByRarity = {
      comum: { count: 0, chz: 0 },
      raro: { count: 0, chz: 0 },
      lendário: { count: 0, chz: 0 }
    };

    for (const burn of burnHistory) {
      totalCardsBurned += burn.cardCount;

      if (burn.rewardsGranted) {
        totalChzEarned += burn.rewardsGranted.totalChz || 0;

        // Aggregate breakdown by rarity
        if (burn.rewardsGranted.breakdown) {
          for (const item of burn.rewardsGranted.breakdown) {
            if (item.rarity in rewardsByRarity) {
              rewardsByRarity[item.rarity as keyof typeof rewardsByRarity].count += item.quantity;
              rewardsByRarity[item.rarity as keyof typeof rewardsByRarity].chz += item.totalChz;
            }
          }
        }
      }
    }

    // Get user's CHZ balance from database (if tracked)
    let databaseBalance = 0;
    try {
      const balanceResult = await query(
        `SELECT balance FROM user_balances
         WHERE privy_user_id = $1 AND token_symbol = 'CHZ'`,
        [privyUserId]
      );
      if (balanceResult.rows.length > 0) {
        databaseBalance = parseFloat(balanceResult.rows[0].balance);
      }
    } catch (error) {
      console.warn('Could not fetch database balance:', error);
    }

    // Get user's wallet address to check on-chain balance
    let walletAddress: string | null = null;
    let onChainBalance = 0;
    try {
      const userResult = await query(
        `SELECT wallet_address FROM users WHERE privy_user_id = $1`,
        [privyUserId]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].wallet_address) {
        walletAddress = userResult.rows[0].wallet_address;

        // Check on-chain CHZ balance if wallet is configured
        if (process.env.NEXT_PUBLIC_CHILIZ_RPC_URL && walletAddress) {
          onChainBalance = await getCHZBalance(walletAddress);
        }
      }
    } catch (error) {
      console.warn('Could not fetch wallet balance:', error);
    }

    return successResponse({
      privyUserId,
      walletAddress,
      rewards: {
        totalChzEarned,
        totalCardsBurned,
        breakdownByRarity: rewardsByRarity,
        databaseBalance,
        onChainBalance
      },
      recentBurns: burnHistory.slice(0, 5).map(burn => ({
        id: burn.id,
        cardCount: burn.cardCount,
        chzEarned: burn.rewardsGranted?.totalChz || 0,
        burnedAt: burn.burnedAt,
        transactionHash: burn.rewardsGranted?.transactionHash
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar saldo de recompensas:', error);
    return handleApiError(error);
  }
}