import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-pool';
import { errorResponse, handleApiError } from '@/lib/error-handler';

// Simple in-memory cache for 24h
type CacheEntry = { data: any; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return errorResponse('Wallet address is required', 400);
    }

    const cacheKey = (walletAddress || '').toLowerCase();
    const now = Date.now();
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }

    const [totalResult, categoryResult, rarityResult, categoryRarityResult] = await Promise.all([
      query(
        `SELECT COUNT(DISTINCT uac.id) as total
         FROM userassetclaims uac
         INNER JOIN users u ON uac.user_id = u.id
         WHERE u.wallet_address = $1
           AND uac.burned_at IS NULL`,
        [walletAddress]
      ),
      query(
        `SELECT 
          COALESCE(c.name, 'Sem Categoria') as category,
          COUNT(DISTINCT uac.id) as count
         FROM userassetclaims uac
         INNER JOIN users u ON uac.user_id = u.id
         LEFT JOIN asset a ON uac.asset_id = a.id
         LEFT JOIN nfts n ON a.nft_id = n.id
         LEFT JOIN categories c ON n.category_id = c.id
         WHERE u.wallet_address = $1
           AND uac.burned_at IS NULL
         GROUP BY c.name
         ORDER BY c.name`,
        [walletAddress]
      ),
      query(
        `SELECT 
          COALESCE(LOWER(n.rarity::text), 'unknown') as rarity,
          COUNT(DISTINCT uac.id) as count
         FROM userassetclaims uac
         INNER JOIN users u ON uac.user_id = u.id
         LEFT JOIN asset a ON uac.asset_id = a.id
         LEFT JOIN nfts n ON a.nft_id = n.id
         WHERE u.wallet_address = $1
           AND uac.burned_at IS NULL
         GROUP BY n.rarity
         ORDER BY n.rarity`,
        [walletAddress]
      ),
      query(
        `SELECT 
          COALESCE(c.name, 'Sem Categoria') as category,
          COALESCE(LOWER(n.rarity::text), 'unknown') as rarity,
          COUNT(DISTINCT uac.id) as count
         FROM userassetclaims uac
         INNER JOIN users u ON uac.user_id = u.id
         LEFT JOIN asset a ON uac.asset_id = a.id
         LEFT JOIN nfts n ON a.nft_id = n.id
          LEFT JOIN categories c ON n.category_id = c.id
         WHERE u.wallet_address = $1
           AND uac.burned_at IS NULL
         GROUP BY c.name, n.rarity
         ORDER BY c.name, n.rarity`,
        [walletAddress]
      ),
    ]);

    const counts = {
      total: parseInt(totalResult.rows[0]?.total || '0'),
      categories: categoryResult.rows.reduce((acc: Record<string, number>, row: any) => {
        // Remove $ prefix and convert to lowercase for frontend compatibility
        const category = row.category || 'sem-categoria';
        const key = category.replace(/^\$/, '').toLowerCase();
        acc[key] = parseInt(row.count || '0');
        return acc;
      }, {}),
      rarities: rarityResult.rows.reduce((acc: Record<string, number>, row: any) => {
        const key = (row.rarity || 'unknown').toLowerCase();
        acc[key] = parseInt(row.count || '0');
        return acc;
      }, {}),
      categoryRarity: categoryRarityResult.rows.reduce((acc: Record<string, Record<string, number>>, row: any) => {
        const category = (row.category || 'sem-categoria').replace(/^\$/, '').toLowerCase();
        const rarity = (row.rarity || 'unknown').toLowerCase();
        if (!acc[category]) acc[category] = {};
        acc[category][rarity] = parseInt(row.count || '0');
        return acc;
      }, {})
    };

    // Save to cache for 24 hours
    CACHE.set(cacheKey, { data: counts, expiresAt: now + DAY_MS });

    return NextResponse.json(counts, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Failed to fetch cards count:', error);
    return handleApiError(error);
  }
}
