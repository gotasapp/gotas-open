import { NextRequest } from 'next/server';
import { query } from '@/lib/db-pool';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import {
  getBurnGlobalSettings,
  isBurnFeatureEnabled,
  recordBurnEvent,
  getBurnReward
} from '@/lib/burn-rewards-db';
import { transferCHZToUser } from '@/lib/chz-distribution';
import type {
  BurnRewards,
  BurnRewardBreakdown,
  NFTRarityPortuguese
} from '@/types/burn-rewards';

// Mapping from NFT category to fan token symbol
const categoryToFanToken: Record<string, string> = {
  'flamengo': 'MENGO',
  'mengo': 'MENGO',
  'corinthians': 'SCCP',
  'sccp': 'SCCP',
  'palmeiras': 'VERDAO',
  'verdao': 'VERDAO',
  'saopaulo': 'SPFC',
  'spfc': 'SPFC',
  'vasco': 'VASCO',
  'fluminense': 'FLU',
  'flu': 'FLU',
  'internacional': 'SACI',
  'saci': 'SACI',
  // International clubs
  'barcelona': 'BAR',
  'bar': 'BAR',
  'psg': 'PSG',
  'juventus': 'JUV',
  'juv': 'JUV',
  'atleticomadrid': 'ATM',
  'atm': 'ATM'
};

// Map English rarity to Portuguese
const rarityToPortuguese = (rarity: string): NFTRarityPortuguese => {
  const mapping: Record<string, NFTRarityPortuguese> = {
    'common': 'comum',
    'rare': 'raro',
    'epic': 'raro',
    'legendary': 'lendário',
    // Already in Portuguese
    'comum': 'comum',
    'raro': 'raro',
    'lendário': 'lendário'
  };
  return mapping[rarity.toLowerCase()] || 'comum';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyUserId, cardIds, transactionHashes } = body;

    // Validation
    if (!privyUserId || typeof privyUserId !== 'string') {
      return errorResponse('privyUserId inválido', 400);
    }

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return errorResponse('cardIds deve ser um array não vazio', 400);
    }

    // Validate blockchain transaction hashes
    if (!Array.isArray(transactionHashes) || transactionHashes.length === 0) {
      return errorResponse('Transaction hashes da blockchain são obrigatórios', 400);
    }

    // Check if burn feature is enabled
    const burnEnabled = await isBurnFeatureEnabled();
    if (!burnEnabled) {
      return errorResponse('O sistema de queima está temporariamente desativado', 503);
    }

    // Get global burn settings
    const globalSettings = await getBurnGlobalSettings();
    if (!globalSettings) {
      return errorResponse('Configurações de queima não encontradas', 500);
    }

    // Validate minimum cards requirement
    if (cardIds.length < globalSettings.minimumCardsPerBurn) {
      return errorResponse(
        `Você precisa queimar pelo menos ${globalSettings.minimumCardsPerBurn} cards`,
        400
      );
    }

    // Validate maximum cards limit
    if (cardIds.length > globalSettings.maximumCardsPerBurn) {
      return errorResponse(
        `Você pode queimar no máximo ${globalSettings.maximumCardsPerBurn} cards por vez`,
        400
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Get detailed card information including rarity and category
      const cardDetailsQuery = `
        SELECT
          uac.id as user_asset_claim_id,
          uac.privy_user_id,
          uac.wallet_address,
          n.rarity,
          n.category,
          n.name as nft_name,
          a.title as asset_title
        FROM userassetclaims uac
        JOIN asset a ON uac.asset_id = a.id
        JOIN nfts n ON uac.nft_id = n.id
        WHERE uac.id = ANY($1)
          AND uac.privy_user_id = $2
          AND uac.burned_at IS NULL
      `;

      const cardDetails = await query(cardDetailsQuery, [cardIds, privyUserId]);

      if (cardDetails.rows.length !== cardIds.length) {
        await query('ROLLBACK');
        return errorResponse('Alguns cards não foram encontrados ou já foram queimados', 403);
      }

      // Get user wallet address (from first card or users table)
      let userWalletAddress = cardDetails.rows[0]?.wallet_address;
      if (!userWalletAddress) {
        const userQuery = await query(
          'SELECT wallet_address FROM users WHERE privy_user_id = $1',
          [privyUserId]
        );
        userWalletAddress = userQuery.rows[0]?.wallet_address;
      }

      // Group cards by fan token and rarity for reward calculation
      const cardGroups: Map<string, Map<NFTRarityPortuguese, number>> = new Map();
      let primaryFanToken = '';

      for (const card of cardDetails.rows) {
        // Get fan token from category
        const category = card.category?.toLowerCase() || '';
        const fanToken = categoryToFanToken[category];

        if (!fanToken) {
          console.warn(`No fan token mapping for category: ${category}`);
          continue;
        }

        if (!primaryFanToken) primaryFanToken = fanToken;

        // Get rarity in Portuguese
        const rarity = rarityToPortuguese(card.rarity || 'common');

        // Group cards
        if (!cardGroups.has(fanToken)) {
          cardGroups.set(fanToken, new Map());
        }
        const rarityMap = cardGroups.get(fanToken)!;
        rarityMap.set(rarity, (rarityMap.get(rarity) || 0) + 1);
      }

      // Calculate CHZ rewards
      let totalChzReward = 0;
      const breakdown: BurnRewardBreakdown[] = [];

      for (const [fanToken, rarities] of Array.from(cardGroups.entries())) {
        for (const [rarity, quantity] of Array.from(rarities.entries())) {
          // Get reward amount for this fan token and rarity
          const chzPerCard = await getBurnReward(fanToken, rarity);
          const totalChzForRarity = chzPerCard * quantity;

          // Apply global multiplier if configured
          const multipliedReward = totalChzForRarity * (globalSettings.chzRewardMultiplier || 1);

          totalChzReward += multipliedReward;

          breakdown.push({
            rarity,
            quantity,
            chzPerCard,
            totalChz: multipliedReward
          });
        }
      }

      // Mark cards as burned (soft delete with burned_at timestamp)
      const burnResult = await query(
        `UPDATE userassetclaims
         SET burned_at = NOW()
         WHERE id = ANY($1)
         AND burned_at IS NULL
         RETURNING id as user_asset_claim_id`,
        [cardIds]
      );

      // Initialize rewards object
      let rewards: BurnRewards = {
        totalChz: totalChzReward,
        fanToken: primaryFanToken,
        breakdown,
        multiplierApplied: globalSettings.chzRewardMultiplier || 1
      };

      // Distribute CHZ rewards if configured and user has a wallet
      let transactionHash: string | undefined;
      if (userWalletAddress && totalChzReward > 0) {
        try {
          // Check if backend wallet is configured
          if (process.env.BACKEND_WALLET_PRIVATE_KEY) {
            // Transfer CHZ to user's wallet
            const transferResult = await transferCHZToUser(userWalletAddress, totalChzReward);

            if (transferResult.success && transferResult.transactionHash) {
              transactionHash = transferResult.transactionHash;
              rewards.transactionHash = transactionHash;
              console.log(`CHZ transferred successfully: ${totalChzReward} CHZ to ${userWalletAddress}, tx: ${transactionHash}`);
            } else {
              console.error(`Failed to transfer CHZ: ${transferResult.error}`);
              // Continue without failing - rewards are tracked in database
            }
          } else {
            console.log(`Backend wallet not configured. Would distribute: ${totalChzReward} CHZ to ${userWalletAddress}`);
          }

          // Try to update user's CHZ balance in database (for tracking)
          try {
            await query(
              `INSERT INTO user_balances (privy_user_id, wallet_address, token_symbol, balance, updated_at)
               VALUES ($1, $2, 'CHZ', $3, NOW())
               ON CONFLICT (privy_user_id, token_symbol)
               DO UPDATE SET balance = user_balances.balance + $3, updated_at = NOW()`,
              [privyUserId, userWalletAddress, totalChzReward]
            );
          } catch (balanceError) {
            // Log but don't fail if balance table doesn't exist
            console.warn('Could not update user_balances table:', balanceError);
          }
        } catch (distributionError) {
          console.error('Error in CHZ distribution:', distributionError);
          // Continue without failing - the burn is successful even if distribution fails
        }
      }

      // Record burn event in history with rewards and blockchain transaction hashes
      const burnHistoryId = await recordBurnEvent(privyUserId, cardIds, {
        ...rewards,
        blockchainTransactionHashes: transactionHashes
      });

      await query('COMMIT');

      // Prepare detailed response
      const breakdownByRarity = {
        comum: { count: 0, chz: 0 },
        raro: { count: 0, chz: 0 },
        lendário: { count: 0, chz: 0 }
      };

      for (const item of breakdown) {
        breakdownByRarity[item.rarity].count += item.quantity;
        breakdownByRarity[item.rarity].chz += item.totalChz;
      }

      return successResponse({
        success: true,
        message: totalChzReward > 0
          ? `Cards queimados com sucesso! Você ganhou ${totalChzReward.toFixed(2)} CHZ`
          : 'Cards queimados com sucesso',
        data: {
          burnedCount: burnResult.rows.length,
          totalChzEarned: totalChzReward,
          breakdown: breakdownByRarity,
          burnHistoryId,
          transactionHash,
          blockchainTransactionHashes: transactionHashes,
          cardIds: burnResult.rows.map((r: any) => r.user_asset_claim_id)
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erro ao queimar cards:', error);
    return handleApiError(error);
  }
}
