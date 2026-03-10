import { handleApiError, successResponse } from '@/lib/error-handler';
import { query } from '@/lib/db-pool';

/**
 * GET /api/adm/burn-stats
 * Returns burn statistics for admin dashboard
 */
export async function GET() {
  try {
    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) return errorResponse('Unauthorized', 401);

    // Get overall statistics
    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT privy_user_id) as unique_users,
        COALESCE(SUM(card_count), 0) as total_cards_burned,
        COALESCE(SUM((rewards_granted->>'totalChz')::DECIMAL), 0) as total_chz_distributed,
        COALESCE(AVG(card_count), 0) as avg_cards_per_burn,
        COALESCE(MAX(card_count), 0) as max_cards_in_single_burn
      FROM burn_history
    `);

    // Get recent activity (last 10 burns)
    const recentResult = await query(`
      SELECT
        id,
        burned_at as "burnedAt",
        card_count as "cardCount",
        (rewards_granted->>'totalChz')::DECIMAL as "totalChz"
      FROM burn_history
      ORDER BY burned_at DESC
      LIMIT 10
    `);

    // Get burn activity by rarity
    const rarityResult = await query(`
      SELECT
        rarity,
        COUNT(*) as burn_count,
        SUM(quantity) as total_burned
      FROM (
        SELECT
          jsonb_array_elements(rewards_granted->'breakdown')->>'rarity' as rarity,
          (jsonb_array_elements(rewards_granted->'breakdown')->>'quantity')::INTEGER as quantity
        FROM burn_history
      ) as breakdown_data
      GROUP BY rarity
      ORDER BY
        CASE rarity
          WHEN 'comum' THEN 1
          WHEN 'raro' THEN 2
          WHEN 'lendário' THEN 3
        END
    `);

    // Get most active fan tokens
    const tokenResult = await query(`
      SELECT
        rewards_granted->>'fanToken' as fan_token,
        COUNT(*) as burn_count,
        SUM((rewards_granted->>'totalChz')::DECIMAL) as total_chz
      FROM burn_history
      GROUP BY rewards_granted->>'fanToken'
      ORDER BY burn_count DESC
      LIMIT 5
    `);

    const stats = statsResult.rows[0];

    return successResponse({
      totalCardsBurned: stats.total_cards_burned || '0',
      totalChzDistributed: stats.total_chz_distributed || '0',
      uniqueUsers: stats.unique_users || '0',
      avgCardsPerBurn: stats.avg_cards_per_burn || '0',
      maxCardsInSingleBurn: stats.max_cards_in_single_burn || '0',
      recentActivity: recentResult.rows,
      burnsByRarity: rarityResult.rows,
      topTokens: tokenResult.rows
    });
  } catch (error) {
    console.error('Failed to fetch burn statistics:', error);
    return handleApiError(error);
  }
}
