import { NextRequest } from 'next/server';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import { getBurnGlobalSettings, isBurnFeatureEnabled } from '@/lib/burn-rewards-db';

/**
 * GET endpoint to retrieve burn system configuration settings
 * Returns global settings like minimum/maximum cards, cooldown, and feature status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if burn feature is enabled
    const burnEnabled = await isBurnFeatureEnabled();

    // Get global burn settings
    const globalSettings = await getBurnGlobalSettings();

    if (!globalSettings) {
      return errorResponse('Configurações de queima não encontradas', 500);
    }

    return successResponse({
      burnFeatureEnabled: burnEnabled,
      minimumCardsPerBurn: globalSettings.minimumCardsPerBurn,
      maximumCardsPerBurn: globalSettings.maximumCardsPerBurn,
      burnCooldownSeconds: globalSettings.burnCooldownSeconds,
      chzRewardMultiplier: globalSettings.chzRewardMultiplier
    });

  } catch (error) {
    console.error('Erro ao buscar configurações de queima:', error);
    return handleApiError(error);
  }
}
