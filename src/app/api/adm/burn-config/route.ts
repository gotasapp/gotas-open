import { handleApiError, successResponse } from '@/lib/error-handler';
import { query } from '@/lib/db-pool';
import type { BurnRewardConfig, BurnGlobalSettings } from '@/types/burn-rewards';

/**
 * GET /api/adm/burn-config
 * Returns all burn reward configurations and global settings
 */
export async function GET() {
  try {
    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) return errorResponse('Unauthorized', 401);

    // Fetch all burn reward configurations
    const rewardsResult = await query(`
      SELECT
        id,
        fan_token_symbol as "fanTokenSymbol",
        rarity,
        chz_reward_amount as "chzRewardAmount",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM burn_rewards_config
      ORDER BY fan_token_symbol,
        CASE rarity
          WHEN 'comum' THEN 1
          WHEN 'raro' THEN 2
          WHEN 'lendário' THEN 3
        END
    `);

    // Fetch global settings
    const settingsResult = await query(`
      SELECT
        setting_key,
        setting_value,
        setting_type
      FROM burn_global_settings
    `);

    // Convert settings rows to object
    const settings: Record<string, string | number | boolean> = {};
    for (const row of settingsResult.rows) {
      const key = toCamelCase(row.setting_key);
      const value = row.setting_value;
      const type = row.setting_type;

      if (type === 'boolean') {
        settings[key] = value === 'true';
      } else if (type === 'integer') {
        settings[key] = parseInt(value, 10);
      } else if (type === 'decimal') {
        settings[key] = parseFloat(value);
      } else {
        settings[key] = value;
      }
    }

    return successResponse({
      rewards: rewardsResult.rows as BurnRewardConfig[],
      settings: settings as BurnGlobalSettings
    });
  } catch (error) {
    console.error('Failed to fetch burn configuration:', error);
    return handleApiError(error);
  }
}

/**
 * Helper function to convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
