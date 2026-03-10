import { NextRequest } from 'next/server';
import { query } from '@/lib/db-pool';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import {
  getBurnGlobalSettings,
  isBurnFeatureEnabled,
  getBurnReward
} from '@/lib/burn-rewards-db';
import type { NFTRarityPortuguese } from '@/types/burn-rewards';

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
    'comum': 'comum',
    'raro': 'raro',
    'lendário': 'lendário'
  };
  return mapping[rarity.toLowerCase()] || 'comum';
};

/**
 * POST endpoint to preview burn rewards without actually burning cards
 * This allows users to see how much CHZ they would earn before confirming
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyUserId, cardIds } = body;

    // Validation
    if (!privyUserId || typeof privyUserId !== 'string') {
      return errorResponse('privyUserId inválido', 400);
    }

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return errorResponse('cardIds deve ser um array não vazio', 400);
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
        `Você precisa selecionar pelo menos ${globalSettings.minimumCardsPerBurn} cards`,
        400
      );
    }

    // Validate maximum cards limit
    if (cardIds.length > globalSettings.maximumCardsPerBurn) {
      return errorResponse(
        `Você pode selecionar no máximo ${globalSettings.maximumCardsPerBurn} cards por vez`,
        400
      );
    }

    // Get detailed card information
    const cardDetailsQuery = `
      SELECT
        uac.id as user_asset_claim_id,
        uac.privy_user_id,
        n.rarity,
        n.category,
        n.name as nft_name,
        n.main_image_url as image_url,
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
      return errorResponse(
        `Alguns cards não foram encontrados ou já foram queimados. Esperado: ${cardIds.length}, Encontrado: ${cardDetails.rows.length}`,
        403
      );
    }

    // Group cards by rarity and calculate rewards
    const cardsByRarity: Record<string, { cards: any[], chzPerCard: number }> = {
      comum: { cards: [], chzPerCard: 0 },
      raro: { cards: [], chzPerCard: 0 },
      lendário: { cards: [], chzPerCard: 0 }
    };

    let totalChzReward = 0;
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

      // Get reward amount for this card
      const chzReward = await getBurnReward(fanToken, rarity);

      // Add card to rarity group
      if (rarity in cardsByRarity) {
        cardsByRarity[rarity].cards.push({
          id: card.user_asset_claim_id,
          name: card.nft_name || card.asset_title,
          imageUrl: card.image_url,
          fanToken
        });

        // Update CHZ per card for this rarity (use highest value)
        if (chzReward > cardsByRarity[rarity].chzPerCard) {
          cardsByRarity[rarity].chzPerCard = chzReward;
        }
      }

      // Calculate total with multiplier
      const multipliedReward = chzReward * (globalSettings.chzRewardMultiplier || 1);
      totalChzReward += multipliedReward;
    }

    // Prepare breakdown response
    const breakdown = {
      comum: {
        count: cardsByRarity.comum.cards.length,
        chzPerCard: cardsByRarity.comum.chzPerCard,
        totalChz: cardsByRarity.comum.cards.length * cardsByRarity.comum.chzPerCard * (globalSettings.chzRewardMultiplier || 1),
        cards: cardsByRarity.comum.cards
      },
      raro: {
        count: cardsByRarity.raro.cards.length,
        chzPerCard: cardsByRarity.raro.chzPerCard,
        totalChz: cardsByRarity.raro.cards.length * cardsByRarity.raro.chzPerCard * (globalSettings.chzRewardMultiplier || 1),
        cards: cardsByRarity.raro.cards
      },
      lendário: {
        count: cardsByRarity.lendário.cards.length,
        chzPerCard: cardsByRarity.lendário.chzPerCard,
        totalChz: cardsByRarity.lendário.cards.length * cardsByRarity.lendário.chzPerCard * (globalSettings.chzRewardMultiplier || 1),
        cards: cardsByRarity.lendário.cards
      }
    };

    return successResponse({
      canBurn: true,
      totalCards: cardIds.length,
      totalChzReward,
      multiplierApplied: globalSettings.chzRewardMultiplier || 1,
      primaryFanToken,
      breakdown,
      settings: {
        minimumCards: globalSettings.minimumCardsPerBurn,
        maximumCards: globalSettings.maximumCardsPerBurn,
        cooldownSeconds: globalSettings.burnCooldownSeconds
      },
      message: totalChzReward > 0
        ? `Queimar ${cardIds.length} cards renderá ${totalChzReward.toFixed(2)} CHZ`
        : 'Nenhuma recompensa disponível para estes cards'
    });

  } catch (error) {
    console.error('Erro ao calcular preview de recompensas:', error);
    return handleApiError(error);
  }
}