import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import { query } from '@/lib/db-pool';

const updateRewardSchema = z.object({
  fanTokenSymbol: z.string().min(1, 'Fan token symbol is required'),
  rarity: z.enum(['comum', 'raro', 'lendário']),
  chzRewardAmount: z.number().min(0, 'Reward amount must be positive')
});

/**
 * PUT /api/adm/burn-config/rewards
 * Update reward amount for specific token/rarity combination
 */
export async function PUT(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validation = updateRewardSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Invalid request data: ${validation.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const { fanTokenSymbol, rarity, chzRewardAmount } = validation.data;

    // Update the reward configuration
    const result = await query(`
      UPDATE burn_rewards_config
      SET
        chz_reward_amount = $3,
        updated_at = NOW()
      WHERE fan_token_symbol = $1 AND rarity = $2
      RETURNING
        id,
        fan_token_symbol as "fanTokenSymbol",
        rarity,
        chz_reward_amount as "chzRewardAmount",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [fanTokenSymbol, rarity, chzRewardAmount]);

    if (result.rowCount === 0) {
      return errorResponse('Reward configuration not found', 404);
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    console.error('Failed to update reward configuration:', error);
    return handleApiError(error);
  }
}
