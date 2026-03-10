import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Cache on CDN for 24h
const MAX_AGE_SECONDS = 60 * 60 * 24 // 24h

function toTeamSymbol(team?: string | null): string | null {
  if (!team) return null
  const v = team.toLowerCase()
  if (v === 'all') return null
  // Accept ids like 'mengo', 'flu', 'vasco', 'spfc', 'verdao', 'saci'
  // Add $ prefix for matching database symbols
  return `$${v.toUpperCase()}`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const team = toTeamSymbol(url.searchParams.get('team'))
    const wallet = url.searchParams.get('wallet')?.toLowerCase() || null

    // Build base query with optional team filter (by category symbol or exact name)
    // Ranking score: 10 (legendary), 2 (epic), 1 (common)
    // Tie-breaker: older account (users.created_at ASC)
    const teamFilter = team
      ? sql`(UPPER(c.symbol) = ${team} OR UPPER(c.name) = ${team})`
      : sql`1=1`

    const topRows = await sql`
      WITH per_user AS (
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.profile_image_url,
          u.wallet_address,
          u.created_at,
          SUM(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 ELSE 0 END) AS legendary_count,
          SUM(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 ELSE 0 END) AS epic_count,
          SUM(CASE WHEN n.rarity::TEXT = 'common' THEN 1 ELSE 0 END) AS common_count,
          SUM(CASE 
                WHEN n.rarity::TEXT = 'legendary' THEN 10 
                WHEN n.rarity::TEXT = 'epic' THEN 2 
                WHEN n.rarity::TEXT = 'common' THEN 1 
                ELSE 0 END) AS score
        FROM userassetclaims uac
        JOIN users u ON uac.user_id = u.id
        JOIN nfts n ON uac.nft_id = n.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.status = 'active' AND ${teamFilter}
        GROUP BY u.id
      ), ranked AS (
        SELECT *, RANK() OVER (ORDER BY score DESC, created_at ASC) AS rank
        FROM per_user
      )
      SELECT * FROM ranked
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `

    // Compute "me" row (if wallet provided)
    let me: any = null
    if (wallet) {
      const meRows = await sql`
        WITH per_user AS (
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.profile_image_url,
            u.wallet_address,
            u.created_at,
            SUM(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 ELSE 0 END) AS legendary_count,
            SUM(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 ELSE 0 END) AS epic_count,
            SUM(CASE WHEN n.rarity::TEXT = 'common' THEN 1 ELSE 0 END) AS common_count,
            SUM(CASE 
                  WHEN n.rarity::TEXT = 'legendary' THEN 10 
                  WHEN n.rarity::TEXT = 'epic' THEN 2 
                  WHEN n.rarity::TEXT = 'common' THEN 1 
                  ELSE 0 END) AS score
          FROM userassetclaims uac
          JOIN users u ON uac.user_id = u.id
          JOIN nfts n ON uac.nft_id = n.id
          LEFT JOIN categories c ON n.category_id = c.id
          WHERE n.status = 'active' AND ${teamFilter}
          GROUP BY u.id
        ), ranked AS (
          SELECT *, RANK() OVER (ORDER BY score DESC, created_at ASC) AS rank
          FROM per_user
        )
        SELECT * FROM ranked WHERE LOWER(wallet_address) = ${wallet}
      `
      if (meRows.length > 0) {
        me = meRows[0]
      }
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      team: team ? team.replace('$', '').toLowerCase() : 'all',
      top10: topRows,
      me,
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', `public, s-maxage=${MAX_AGE_SECONDS}, stale-while-revalidate=60`)
    return res
  } catch (error) {
    console.error('❌ Leaderboard API error:', error)
    return NextResponse.json({ error: 'Failed to compute leaderboard' }, { status: 500 })
  }
}
