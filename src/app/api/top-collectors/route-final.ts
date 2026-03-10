import { query } from '@/lib/db-pool';
import { handleApiError, successResponse } from '@/lib/error-handler';

export const runtime = 'nodejs';

// Collector type definition
interface Collector {
  id: number;
  walletAddress: string;
  displayName: string;
  username: string | null;
  avatarUrl: string;
  totalPoints: number;
  totalCards: number;
  rank?: number;
}

// In-memory cache with shorter TTL for competitive leaderboard
interface CacheEntry {
  data: Collector[];
  total: number;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (reduced from 24 hours)

function getCacheKey(limit: number, offset: number): string {
  return `${limit}-${offset}`;
}

function isCacheValid(entry: CacheEntry | undefined): boolean {
  if (!entry) return false;
  return (Date.now() - entry.timestamp) < CACHE_DURATION;
}

/**
 * Optimized query using summary table (if migration applied)
 * Falls back to optimized direct query if summary table doesn't exist
 */
async function getTopCollectors(limit: number = 10, offset: number = 0): Promise<{ collectors: Collector[], total: number }> {
  try {
    // First, try to use the optimized summary table (fastest - ~30ms)
    const summaryQuery = `
      SELECT
        user_id as id,
        wallet_address,
        display_name,
        profile_image_url as avatar_url,
        username,
        total_points,
        total_cards,
        ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as rank
      FROM user_points_summary
      WHERE total_points > 0
      ORDER BY total_points DESC, created_at ASC
      LIMIT $1 OFFSET $2
    `;

    const summaryResult = await query(summaryQuery, [limit, offset]);

    // Get total count from summary table
    const summaryCountResult = await query(`
      SELECT COUNT(*) as total
      FROM user_points_summary
      WHERE total_points > 0
    `);

    const total = parseInt(summaryCountResult.rows[0]?.total || '0');
    const collectors = formatCollectors(summaryResult.rows);

    return { collectors, total };

  } catch (error: any) {
    // If summary table doesn't exist, fall back to optimized direct query
    if (error.code === '42P01') { // Table does not exist
      console.log('Summary table not found, using optimized direct query');
      return getTopCollectorsDirectQuery(limit, offset);
    }
    throw error;
  }
}

/**
 * Fallback optimized query with proper indexes
 * Used when summary table is not available
 */
async function getTopCollectorsDirectQuery(limit: number = 10, offset: number = 0): Promise<{ collectors: Collector[], total: number }> {
  // Use CTE to avoid duplicating CASE logic
  const queryText = `
    WITH user_points AS (
      SELECT
        u.id,
        u.wallet_address,
        u.display_name,
        u.profile_image_url as avatar_url,
        u.username,
        u.created_at,
        SUM(
          CASE n.rarity::TEXT
            WHEN 'legendary' THEN 10
            WHEN 'epic' THEN 2
            WHEN 'common' THEN 1
            ELSE 0
          END
        ) AS total_points,
        COUNT(DISTINCT uac.id) as total_cards
      FROM users u
      INNER JOIN userassetclaims uac ON u.id = uac.user_id
      INNER JOIN nfts n ON uac.nft_id = n.id
      WHERE n.status = 'active'
        AND (uac.burned_at IS NULL OR uac.burned_at = '')
      GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at
    ),
    ranked_users AS (
      SELECT
        *,
        ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as rank
      FROM user_points
      WHERE total_points > 0
    )
    SELECT * FROM ranked_users
    ORDER BY rank
    LIMIT $1 OFFSET $2
  `;

  const result = await query(queryText, [limit, offset]);

  // Get total count
  const countQuery = `
    WITH user_points AS (
      SELECT
        u.id,
        SUM(
          CASE n.rarity::TEXT
            WHEN 'legendary' THEN 10
            WHEN 'epic' THEN 2
            WHEN 'common' THEN 1
            ELSE 0
          END
        ) AS total_points
      FROM users u
      INNER JOIN userassetclaims uac ON u.id = uac.user_id
      INNER JOIN nfts n ON uac.nft_id = n.id
      WHERE n.status = 'active'
        AND (uac.burned_at IS NULL OR uac.burned_at = '')
      GROUP BY u.id
    )
    SELECT COUNT(*) as total
    FROM user_points
    WHERE total_points > 0
  `;

  const countResult = await query(countQuery);
  const total = parseInt(countResult.rows[0]?.total || '0');
  const collectors = formatCollectors(result.rows);

  return { collectors, total };
}

function formatCollectors(rows: any[]): Collector[] {
  return rows.map((row) => {
    const walletShort = `${row.wallet_address.slice(0, 6)}...${row.wallet_address.slice(-4)}`;
    const defaultName = row.username || walletShort;

    return {
      id: row.id,
      walletAddress: row.wallet_address,
      displayName: row.display_name || defaultName,
      username: row.username,
      avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
      totalPoints: parseInt(row.total_points) || 0,
      totalCards: parseInt(row.total_cards) || 0,
      rank: row.rank ? parseInt(row.rank) : undefined
    };
  });
}

// Main GET handler with pagination support for infinite scroll
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Max 100 per request
    const offset = parseInt(searchParams.get('offset') || '0');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = getCacheKey(limit, offset);
    const cachedEntry = cache.get(cacheKey);

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(cachedEntry)) {
      const executionTime = Date.now() - startTime;
      console.log(`Top collectors returned from cache in ${executionTime}ms`);

      return successResponse({
        collectors: cachedEntry.data,
        pagination: {
          limit,
          offset,
          total: cachedEntry.total,
          hasMore: offset + limit < cachedEntry.total
        },
        cached: true
      });
    }

    // Fetch fresh data
    const { collectors, total } = await getTopCollectors(limit, offset);

    // Update cache
    cache.set(cacheKey, {
      data: collectors,
      total,
      timestamp: Date.now()
    });

    // Clean old cache entries if cache is getting large
    if (cache.size > 50) {
      const entries = Array.from(cache.entries());
      const now = Date.now();
      entries.forEach(([key, entry]) => {
        if (now - entry.timestamp > CACHE_DURATION) {
          cache.delete(key);
        }
      });
    }

    const executionTime = Date.now() - startTime;
    console.log(`Top collectors query executed in ${executionTime}ms (${collectors.length} results)`);

    return successResponse({
      collectors,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      },
      cached: false
    });

  } catch (error) {
    console.error('Error fetching top collectors:', error);
    return handleApiError(error);
  }
}

// DELETE endpoint to clear cache (useful for admin/development)
export async function DELETE() {
  try {
    const previousSize = cache.size;
    cache.clear();
    return successResponse({
      message: 'Cache cleared successfully',
      entriesCleared: previousSize
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST endpoint to trigger summary table rebuild (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, adminKey } = body;

    // Simple admin authentication (in production, use proper auth)
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey) {
      return handleApiError(new Error('Server misconfigured'), 'ADMIN_KEY not set', 500);
    }
    if (adminKey !== expectedKey) {
      return handleApiError(new Error('Unauthorized'), 'Invalid admin key', 401);
    }

    if (action === 'rebuild-summary') {
      // Check if summary table exists
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'user_points_summary'
        )
      `);

      if (!tableCheck.rows[0]?.exists) {
        return handleApiError(new Error('Summary table not found. Please run migration first.'));
      }

      // Rebuild summary table
      await query(`
        TRUNCATE user_points_summary;

        INSERT INTO user_points_summary (
          user_id, wallet_address, display_name, profile_image_url, username, created_at,
          total_points, total_cards
        )
        SELECT
          u.id,
          u.wallet_address,
          u.display_name,
          u.profile_image_url,
          u.username,
          u.created_at,
          COALESCE(SUM(CASE n.rarity::TEXT
            WHEN 'legendary' THEN 10
            WHEN 'epic' THEN 2
            WHEN 'common' THEN 1
            ELSE 0
          END), 0) AS total_points,
          COUNT(DISTINCT uac.id) as total_cards
        FROM users u
        LEFT JOIN userassetclaims uac ON u.id = uac.user_id
          AND (uac.burned_at IS NULL OR uac.burned_at = '')
        LEFT JOIN nfts n ON uac.nft_id = n.id AND n.status = 'active'
        GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at
        ON CONFLICT (user_id) DO NOTHING;
      `);

      // Clear cache after rebuild
      cache.clear();

      return successResponse({
        message: 'Summary table rebuilt successfully',
        cacheCleared: true
      });
    }

    return handleApiError(new Error('Invalid action'));

  } catch (error) {
    console.error('Error in POST handler:', error);
    return handleApiError(error);
  }
}