import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import { query } from '@/lib/db-pool';
import type { BurnGlobalSettings } from '@/types/burn-rewards';

const updateSettingsSchema = z.object({
  burnFeatureEnabled: z.boolean().optional(),
  minimumCardsPerBurn: z.number().int().min(1).optional(),
  maximumCardsPerBurn: z.number().int().min(1).optional(),
  burnCooldownSeconds: z.number().int().min(0).optional(),
  chzRewardMultiplier: z.number().min(0.1).optional(),
  burnTransactionTimeout: z.number().int().min(1).optional(),
  autoClaimRewards: z.boolean().optional()
}).refine(
  (data) => {
    if (data.minimumCardsPerBurn !== undefined && data.maximumCardsPerBurn !== undefined) {
      return data.minimumCardsPerBurn <= data.maximumCardsPerBurn;
    }
    return true;
  },
  {
    message: 'Minimum cards must be less than or equal to maximum cards'
  }
);

/**
 * PUT /api/adm/burn-config/settings
 * Update global burn settings
 */
export async function PUT(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        `Invalid request data: ${validation.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const settings = validation.data;

    // Start transaction for atomic updates
    await query('BEGIN');

    try {
      // Update each setting that was provided
      for (const [key, value] of Object.entries(settings)) {
        if (value === undefined) continue;

        const snakeKey = toSnakeCase(key);
        const stringValue = typeof value === 'boolean' ? value.toString() : value.toString();

        await query(`
          UPDATE burn_global_settings
          SET setting_value = $2, updated_at = NOW()
          WHERE setting_key = $1
        `, [snakeKey, stringValue]);
      }

      await query('COMMIT');

      // Fetch updated settings
      const result = await query(`
        SELECT setting_key, setting_value, setting_type
        FROM burn_global_settings
      `);

      // Convert to settings object
      const updatedSettings: Record<string, string | number | boolean> = {};
      for (const row of result.rows) {
        const key = toCamelCase(row.setting_key);
        const value = row.setting_value;
        const type = row.setting_type;

        if (type === 'boolean') {
          updatedSettings[key] = value === 'true';
        } else if (type === 'integer') {
          updatedSettings[key] = parseInt(value, 10);
        } else if (type === 'decimal') {
          updatedSettings[key] = parseFloat(value);
        } else {
          updatedSettings[key] = value;
        }
      }

      return successResponse(updatedSettings as BurnGlobalSettings);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Failed to update global settings:', error);
    return handleApiError(error);
  }
}

/**
 * Helper function to convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Helper function to convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
