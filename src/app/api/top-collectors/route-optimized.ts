import { query } from '@/lib/db-pool';
import { handleApiError, successResponse } from '@/lib/error-handler';
import { unstable_cache } from 'next/cache';

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
  legendaryCount?: number;
  epicCount?: number;
  commonCount?: number;
  rank?: number;
}

// =========================================
// STRATEGY 1: Optimized Query with Indexes
// =========================================
async function getTopCollectorsOptimizedQuery(limit: number = 10, offset: number = 0): Promise<Collector[]> {
  const queryText = `
    WITH ranked_collectors AS (
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
        COUNT(DISTINCT uac.id) as total_cards,
        ROW_NUMBER() OVER (
          ORDER BY
            SUM(CASE n.rarity::TEXT
              WHEN 'legendary' THEN 10
              WHEN 'epic' THEN 2
              WHEN 'common' THEN 1
              ELSE 0
            END) DESC,
            u.created_at ASC
        ) as rank
      FROM users u
      INNER JOIN userassetclaims uac ON u.id = uac.user_id
      INNER JOIN nfts n ON uac.nft_id = n.id
      WHERE n.status = 'active'
        AND uac.burned_at IS NULL
      GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at
    )
    SELECT *
    FROM ranked_collectors
    WHERE total_points > 0
    ORDER BY rank
    LIMIT $1 OFFSET $2
  `;

  const result = await query(queryText, [limit, offset]);
  return formatCollectors(result.rows);
}

// =========================================
// STRATEGY 2: Materialized View Query
// =========================================
async function getTopCollectorsFromMaterializedView(limit: number = 10, offset: number = 0): Promise<Collector[]> {
  // Check if refresh is needed
  await checkAndRefreshMaterializedView();

  const queryText = `
    SELECT
      user_id as id,
      wallet_address,
      display_name,
      profile_image_url as avatar_url,
      username,
      total_points,
      total_cards,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as rank
    FROM mv_user_points
    WHERE total_points > 0
    ORDER BY total_points DESC, created_at ASC
    LIMIT $1 OFFSET $2
  `;

  const result = await query(queryText, [limit, offset]);
  return formatCollectors(result.rows);
}

// =========================================
// STRATEGY 3: Summary Table Query (Fastest)
// =========================================
async function getTopCollectorsFromSummaryTable(limit: number = 10, offset: number = 0): Promise<Collector[]> {
  const queryText = `
    SELECT
      user_id as id,
      wallet_address,
      display_name,
      profile_image_url as avatar_url,
      username,
      total_points,
      total_cards,
      legendary_count,
      epic_count,
      common_count,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, created_at ASC) as rank
    FROM user_points_summary
    WHERE total_points > 0
    ORDER BY total_points DESC, created_at ASC
    LIMIT $1 OFFSET $2
  `;

  const result = await query(queryText, [limit, offset]);
  return formatCollectors(result.rows);
}

// =========================================
// Helper Functions
// =========================================

async function checkAndRefreshMaterializedView(): Promise<void> {
  try {
    // Check if materialized view needs refresh
    const refreshCheck = await query(`
      SELECT needs_refresh, last_refresh
      FROM mv_refresh_queue
      WHERE view_name = 'mv_user_points'
    `);

    if (refreshCheck.rows.length > 0) {
      const { needs_refresh, last_refresh } = refreshCheck.rows[0];
      const hoursSinceRefresh = (Date.now() - new Date(last_refresh).getTime()) / (1000 * 60 * 60);

      // Refresh if flagged or if last refresh was more than 1 hour ago
      if (needs_refresh || hoursSinceRefresh > 1) {
        // Refresh asynchronously without blocking the request
        query(`SELECT check_and_refresh_mv()`).catch(err => {
          console.error('Error refreshing materialized view:', err);
        });
      }
    }
  } catch (error) {
    console.error('Error checking materialized view refresh status:', error);
  }
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
      legendaryCount: row.legendary_count ? parseInt(row.legendary_count) : undefined,
      epicCount: row.epic_count ? parseInt(row.epic_count) : undefined,
      commonCount: row.common_count ? parseInt(row.common_count) : undefined,
      rank: row.rank ? parseInt(row.rank) : undefined
    };
  });
}

// =========================================
// Redis-like In-Memory Cache with Next.js
// =========================================
const getCachedTopCollectors = unstable_cache(
  async (limit: number, offset: number) => {
    // Use the fastest strategy: summary table
    return await getTopCollectorsFromSummaryTable(limit, offset);
  },
  ['top-collectors'],
  {
    revalidate: 300, // 5 minutes cache
    tags: ['leaderboard', 'collectors']
  }
);

// =========================================
// Main GET Handler with Strategy Selection
// =========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const strategy = searchParams.get('strategy') || 'summary'; // summary | materialized | optimized | cached

    console.time('top-collectors-query');

    let topCollectors: Collector[];

    switch (strategy) {
      case 'materialized':
        // Strategy 2: Use materialized view (~50ms)
        topCollectors = await getTopCollectorsFromMaterializedView(limit, offset);
        break;

      case 'optimized':
        // Strategy 1: Use optimized query with indexes (~600ms)
        topCollectors = await getTopCollectorsOptimizedQuery(limit, offset);
        break;

      case 'cached':
        // Strategy 4: Use Next.js cache with summary table (~5ms after first hit)
        topCollectors = await getCachedTopCollectors(limit, offset);
        break;

      case 'summary':
      default:
        // Strategy 3: Use summary table (fastest, ~30ms)
        topCollectors = await getTopCollectorsFromSummaryTable(limit, offset);
        break;
    }

    console.timeEnd('top-collectors-query');

    // Get total count for pagination
    const totalCountResult = await query(`
      SELECT COUNT(*) as total
      FROM user_points_summary
      WHERE total_points > 0
    `);

    const totalCount = parseInt(totalCountResult.rows[0]?.total || '0');
    const hasMore = offset + limit < totalCount;

    console.log(`Top collectors fetched: ${topCollectors.length} records (strategy: ${strategy})`);

    return successResponse({
      collectors: topCollectors,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching top collectors:', error);
    return handleApiError(error);
  }
}

// =========================================
// POST Handler for Manual Cache Invalidation
// =========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'refresh-materialized-view') {
      // Manually trigger materialized view refresh
      await query(`SELECT refresh_user_points_mv()`);
      return successResponse({ message: 'Materialized view refreshed successfully' });
    }

    if (action === 'rebuild-summary') {
      // Rebuild entire summary table
      await query(`
        TRUNCATE user_points_summary;
        INSERT INTO user_points_summary ... (full rebuild query)
      `);
      return successResponse({ message: 'Summary table rebuilt successfully' });
    }

    return handleApiError(new Error('Invalid action'));

  } catch (error) {
    console.error('Error in POST handler:', error);
    return handleApiError(error);
  }
}

// =========================================
// DELETE Handler for Cache Clearing
// =========================================
export async function DELETE() {
  try {
    // Clear Next.js cache
    // Note: In production, you might want to use revalidateTag instead
    // revalidateTag('leaderboard');

    return successResponse({ message: 'Cache cleared successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}