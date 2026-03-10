/**
 * API Route: Admin Burn Settings Management
 *
 * GET /api/adm/burn-settings - Fetch all burn configuration settings
 * POST /api/adm/burn-settings - Update burn configuration settings (requires password)
 *
 * Security: SHA-256 password verification required for updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { createHash } from 'crypto';

// Admin password must be set in environment variables
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required');
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Verify admin password
 */
function verifyPassword(providedPassword: string): boolean {
  const hashedProvided = hashPassword(providedPassword);
  const hashedStored = hashPassword(ADMIN_PASSWORD);
  return hashedProvided === hashedStored;
}

/**
 * GET - Fetch all burn configuration settings
 */
export async function GET() {
  try {
    const result = await query(`
      SELECT
        setting_key,
        setting_value,
        setting_type,
        description,
        updated_at
      FROM burn_global_settings
      ORDER BY setting_key
    `);

    return NextResponse.json({
      success: true,
      settings: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching burn settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch burn settings',
        details: err.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Update burn configuration settings
 * Requires password authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, settings } = body;

    // Validate password
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 401 }
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 403 }
      );
    }

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Settings object is required' },
        { status: 400 }
      );
    }

    // Update each setting
    const updates: Array<{ key: string; value: string; success: boolean }> = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        await query(
          `UPDATE burn_global_settings
           SET setting_value = $1, updated_at = NOW()
           WHERE setting_key = $2`,
          [String(value), key]
        );
        updates.push({ key, value: String(value), success: true });
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`Error updating ${key}:`, error);
        updates.push({ key, value: String(value), success: false });
      }
    }

    // Fetch updated settings
    const result = await query(`
      SELECT
        setting_key,
        setting_value,
        setting_type,
        description,
        updated_at
      FROM burn_global_settings
      ORDER BY setting_key
    `);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      updates,
      settings: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error updating burn settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update burn settings',
        details: err.message
      },
      { status: 500 }
    );
  }
}
