/**
 * Database operations for burn rewards system
 */

import { query } from '@/lib/db-pool';
import type {
  BurnRewardConfig,
  BurnGlobalSettings,
  FanToken,
  BurnHistory,
  BurnRewards,
  BurnRewardsView,
  NFTRarityPortuguese
} from '@/types/burn-rewards';

/**
 * Get CHZ reward amount for burning a specific card
 */
export async function getBurnReward(
  fanTokenSymbol: string,
  rarity: NFTRarityPortuguese
): Promise<number> {
  try {
    const result = await query(
      'SELECT get_burn_reward($1, $2) as reward',
      [fanTokenSymbol, rarity]
    );
    return parseFloat(result.rows[0]?.reward || '0');
  } catch (error) {
    console.error('Error getting burn reward:', error);
    return 0;
  }
}

/**
 * Get all active burn reward configurations
 */
export async function getActiveBurnRewards(): Promise<BurnRewardConfig[]> {
  try {
    const result = await query(`
      SELECT
        id,
        fan_token_symbol as "fanTokenSymbol",
        rarity,
        chz_reward_amount as "chzRewardAmount",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM burn_rewards_config
      WHERE is_active = true
      ORDER BY fan_token_symbol,
        CASE rarity
          WHEN 'comum' THEN 1
          WHEN 'raro' THEN 2
          WHEN 'lendário' THEN 3
        END
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting active burn rewards:', error);
    return [];
  }
}

/**
 * Get burn rewards for a specific fan token
 */
export async function getBurnRewardsByToken(
  fanTokenSymbol: string
): Promise<BurnRewardConfig[]> {
  try {
    const result = await query(`
      SELECT
        id,
        fan_token_symbol as "fanTokenSymbol",
        rarity,
        chz_reward_amount as "chzRewardAmount",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM burn_rewards_config
      WHERE fan_token_symbol = $1 AND is_active = true
      ORDER BY
        CASE rarity
          WHEN 'comum' THEN 1
          WHEN 'raro' THEN 2
          WHEN 'lendário' THEN 3
        END
    `, [fanTokenSymbol]);
    return result.rows;
  } catch (error) {
    console.error('Error getting burn rewards by token:', error);
    return [];
  }
}

/**
 * Get global burn settings
 */
export async function getBurnGlobalSettings(): Promise<BurnGlobalSettings | null> {
  try {
    const result = await query(`
      SELECT
        setting_key,
        setting_value,
        setting_type
      FROM burn_global_settings
    `);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    // Convert rows to settings object
    const settings: any = {};
    for (const row of result.rows) {
      const key = row.setting_key;
      const value = row.setting_value;
      const type = row.setting_type;

      // Parse value based on type
      if (type === 'boolean') {
        settings[toCamelCase(key)] = value === 'true';
      } else if (type === 'integer') {
        settings[toCamelCase(key)] = parseInt(value, 10);
      } else if (type === 'decimal') {
        settings[toCamelCase(key)] = parseFloat(value);
      } else {
        settings[toCamelCase(key)] = value;
      }
    }

    return settings as BurnGlobalSettings;
  } catch (error) {
    console.error('Error getting global burn settings:', error);
    return null;
  }
}

/**
 * Check if burn feature is enabled
 */
export async function isBurnFeatureEnabled(): Promise<boolean> {
  try {
    const result = await query(
      `SELECT setting_value FROM burn_global_settings
       WHERE setting_key = 'burn_feature_enabled'`
    );
    return result.rows[0]?.setting_value === 'true';
  } catch (error) {
    console.error('Error checking burn feature status:', error);
    return false;
  }
}

/**
 * Get all fan tokens
 */
export async function getAllFanTokens(activeOnly = true): Promise<FanToken[]> {
  try {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await query(`
      SELECT
        id,
        symbol,
        name,
        team_name as "teamName",
        contract_address as "contractAddress",
        decimals,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM fan_tokens
      ${whereClause}
      ORDER BY symbol
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting fan tokens:', error);
    return [];
  }
}

/**
 * Get burn rewards view (consolidated data)
 */
export async function getBurnRewardsView(): Promise<BurnRewardsView[]> {
  try {
    const result = await query(`
      SELECT
        fan_token as "fanToken",
        token_name as "tokenName",
        team_name as "teamName",
        rarity,
        chz_reward_amount as "chzRewardAmount",
        reward_active as "rewardActive",
        token_active as "tokenActive",
        fully_active as "fullyActive"
      FROM v_burn_rewards
      WHERE fully_active = true
      ORDER BY fan_token,
        CASE rarity
          WHEN 'comum' THEN 1
          WHEN 'raro' THEN 2
          WHEN 'lendário' THEN 3
        END
    `);
    return result.rows;
  } catch (error) {
    console.error('Error getting burn rewards view:', error);
    return [];
  }
}

/**
 * Record a burn event in history
 */
export async function recordBurnEvent(
  privyUserId: string,
  cardIds: string[],
  rewards: BurnRewards
): Promise<number | null> {
  try {
    const result = await query(`
      INSERT INTO burn_history (
        privy_user_id,
        card_ids,
        card_count,
        rewards_granted,
        burned_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, [
      privyUserId,
      cardIds,
      cardIds.length,
      JSON.stringify(rewards)
    ]);
    return result.rows[0]?.id;
  } catch (error) {
    console.error('Error recording burn event:', error);
    return null;
  }
}

/**
 * Get burn history for a user
 */
export async function getUserBurnHistory(
  privyUserId: string,
  limit = 50
): Promise<BurnHistory[]> {
  try {
    const result = await query(`
      SELECT
        id,
        privy_user_id as "privyUserId",
        card_ids as "cardIds",
        card_count as "cardCount",
        burned_at as "burnedAt",
        rewards_granted as "rewardsGranted",
        created_at as "createdAt"
      FROM burn_history
      WHERE privy_user_id = $1
      ORDER BY burned_at DESC
      LIMIT $2
    `, [privyUserId, limit]);

    // Parse rewards_granted JSON
    return result.rows.map(row => ({
      ...row,
      rewardsGranted: row.rewardsGranted ?
        (typeof row.rewardsGranted === 'string' ?
          JSON.parse(row.rewardsGranted) :
          row.rewardsGranted) :
        null
    }));
  } catch (error) {
    console.error('Error getting user burn history:', error);
    return [];
  }
}

/**
 * Calculate total CHZ rewards for multiple cards
 */
export async function calculateBurnRewards(
  cards: Array<{ fanToken: string; rarity: NFTRarityPortuguese; quantity: number }>
): Promise<number> {
  try {
    // Build the query for multiple cards
    const values = cards.map((card, index) => {
      const offset = index * 3;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    }).join(', ');

    const params = cards.flatMap(card => [card.fanToken, card.rarity, card.quantity]);

    const result = await query(`
      WITH cards_to_burn (token, rarity, quantity) AS (
        VALUES ${values}
      )
      SELECT
        SUM(get_burn_reward(token, rarity) * quantity) as total_reward
      FROM cards_to_burn
    `, params);

    return parseFloat(result.rows[0]?.total_reward || '0');
  } catch (error) {
    console.error('Error calculating burn rewards:', error);
    return 0;
  }
}

/**
 * Update burn reward configuration
 */
export async function updateBurnReward(
  fanTokenSymbol: string,
  rarity: NFTRarityPortuguese,
  chzRewardAmount: number
): Promise<boolean> {
  try {
    await query(`
      UPDATE burn_rewards_config
      SET chz_reward_amount = $3, updated_at = NOW()
      WHERE fan_token_symbol = $1 AND rarity = $2
    `, [fanTokenSymbol, rarity, chzRewardAmount]);
    return true;
  } catch (error) {
    console.error('Error updating burn reward:', error);
    return false;
  }
}

/**
 * Update global burn setting
 */
export async function updateBurnGlobalSetting(
  settingKey: string,
  settingValue: string
): Promise<boolean> {
  try {
    await query(`
      UPDATE burn_global_settings
      SET setting_value = $2, updated_at = NOW()
      WHERE setting_key = $1
    `, [settingKey, settingValue]);
    return true;
  } catch (error) {
    console.error('Error updating global burn setting:', error);
    return false;
  }
}

/**
 * Mark cards as burned in userassetclaims
 */
export async function markCardsAsBurned(
  userAssetClaimIds: string[]
): Promise<boolean> {
  try {
    const placeholders = userAssetClaimIds.map((_, i) => `$${i + 1}`).join(', ');
    await query(`
      UPDATE userassetclaims
      SET burned_at = NOW()
      WHERE user_asset_claim_id IN (${placeholders})
    `, userAssetClaimIds);
    return true;
  } catch (error) {
    console.error('Error marking cards as burned:', error);
    return false;
  }
}

/**
 * Mark cards as burned by blockchain token IDs
 */
export async function markCardsAsBurnedByTokenIds(
  walletAddress: string,
  tokenIds: (string | number)[]
): Promise<string[]> {
  if (!tokenIds || tokenIds.length === 0) {
    return [];
  }

  const lowercaseWallet = walletAddress?.toLowerCase();
  const tokenIdStrings = tokenIds.map(id => id.toString());

  try {
    const result = await query(
      `
        WITH matched_claims AS (
          SELECT DISTINCT uac.id
          FROM userassetclaims uac
          INNER JOIN asset a ON a.id = uac.asset_id
          INNER JOIN nft_mint_log nml ON nml.asset_id = a.id
      WHERE LOWER(uac.wallet_address) = $1
        AND LOWER(COALESCE(nml.user_wallet_address, uac.wallet_address)) = $1
        AND nml.token_id::text = ANY($2::text[])
            AND uac.burned_at IS NULL
        )
        UPDATE userassetclaims uac
        SET burned_at = NOW()
        FROM matched_claims mc
        WHERE uac.id = mc.id
        RETURNING uac.id
      `,
      [lowercaseWallet, tokenIdStrings]
    );

    return result.rows.map((row: any) => row.id);
  } catch (error) {
    console.error('Error marking cards as burned by token IDs:', error);
    return [];
  }
}

/**
 * Get burn statistics for admin dashboard
 */
export async function getBurnStatistics(days = 7): Promise<any> {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT privy_user_id) as unique_users,
        SUM(card_count) as total_cards_burned,
        SUM((rewards_granted->>'totalChz')::DECIMAL) as total_chz_distributed,
        AVG(card_count) as avg_cards_per_burn,
        MAX(card_count) as max_cards_in_single_burn
      FROM burn_history
      WHERE burned_at > NOW() - INTERVAL '${days} days'
    `);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting burn statistics:', error);
    return null;
  }
}

/**
 * Helper function to convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
