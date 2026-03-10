-- =========================================
-- Top Collectors Query Performance Optimization
-- =========================================
-- Target: Reduce query time from 1469ms to <500ms
-- Date: 2025-10-11
-- =========================================

-- =========================================
-- PHASE 1: Critical Indexes
-- =========================================

-- 1. Index for userassetclaims join and filtering
CREATE INDEX IF NOT EXISTS idx_userassetclaims_user_nft
ON userassetclaims(user_id, nft_id)
WHERE burned_at IS NULL; -- Exclude burned cards from index

-- 2. Index for NFT status filtering and rarity lookup
CREATE INDEX IF NOT EXISTS idx_nfts_status_rarity
ON nfts(status, rarity)
WHERE status = 'active'; -- Partial index for active NFTs only

-- 3. Covering index for user data to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_data
ON users(id, wallet_address, display_name, profile_image_url, username, created_at);

-- =========================================
-- PHASE 2: Materialized View for Points
-- =========================================

-- Drop existing materialized view if exists
DROP MATERIALIZED VIEW IF EXISTS mv_user_points CASCADE;

-- Create materialized view for pre-computed points
CREATE MATERIALIZED VIEW mv_user_points AS
SELECT
  u.id as user_id,
  u.wallet_address,
  u.display_name,
  u.profile_image_url,
  u.username,
  u.created_at,
  COALESCE(SUM(
    CASE n.rarity::TEXT
      WHEN 'legendary' THEN 10
      WHEN 'epic' THEN 2
      WHEN 'common' THEN 1
      ELSE 0
    END
  ), 0) AS total_points,
  COUNT(DISTINCT uac.id) as total_cards,
  MAX(uac.claimed_at) as last_claim_date
FROM users u
LEFT JOIN userassetclaims uac ON u.id = uac.user_id AND uac.burned_at IS NULL
LEFT JOIN nfts n ON uac.nft_id = n.id AND n.status = 'active'
GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at;

-- Create unique index on materialized view for fast lookups
CREATE UNIQUE INDEX idx_mv_user_points_user_id ON mv_user_points(user_id);

-- Create index for sorting
CREATE INDEX idx_mv_user_points_ranking
ON mv_user_points(total_points DESC, created_at ASC)
WHERE total_points > 0;

-- =========================================
-- PHASE 3: Incremental Update Function
-- =========================================

-- Function to refresh materialized view incrementally
CREATE OR REPLACE FUNCTION refresh_user_points_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh materialized view concurrently (doesn't lock reads)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_points;
END;
$$;

-- =========================================
-- PHASE 4: Trigger for Automatic Updates
-- =========================================

-- Function to mark materialized view for refresh
CREATE OR REPLACE FUNCTION mark_user_points_dirty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set a flag in a tracking table (created below)
  INSERT INTO mv_refresh_queue (view_name, needs_refresh)
  VALUES ('mv_user_points', true)
  ON CONFLICT (view_name)
  DO UPDATE SET needs_refresh = true, updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$;

-- Create tracking table for materialized view refreshes
CREATE TABLE IF NOT EXISTS mv_refresh_queue (
  view_name VARCHAR(255) PRIMARY KEY,
  needs_refresh BOOLEAN DEFAULT false,
  last_refresh TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial record
INSERT INTO mv_refresh_queue (view_name, needs_refresh)
VALUES ('mv_user_points', true)
ON CONFLICT DO NOTHING;

-- Trigger on userassetclaims changes
DROP TRIGGER IF EXISTS trg_userassetclaims_points_update ON userassetclaims;
CREATE TRIGGER trg_userassetclaims_points_update
AFTER INSERT OR UPDATE OR DELETE ON userassetclaims
FOR EACH STATEMENT
EXECUTE FUNCTION mark_user_points_dirty();

-- Trigger on nfts status changes
DROP TRIGGER IF EXISTS trg_nfts_points_update ON nfts;
CREATE TRIGGER trg_nfts_points_update
AFTER UPDATE OF status, rarity ON nfts
FOR EACH STATEMENT
EXECUTE FUNCTION mark_user_points_dirty();

-- =========================================
-- PHASE 5: Scheduled Refresh (Run via cron or app)
-- =========================================

-- Function to check and refresh if needed
CREATE OR REPLACE FUNCTION check_and_refresh_mv()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  needs_refresh_flag BOOLEAN;
  last_refresh_time TIMESTAMP;
BEGIN
  -- Check if refresh is needed
  SELECT needs_refresh, last_refresh
  INTO needs_refresh_flag, last_refresh_time
  FROM mv_refresh_queue
  WHERE view_name = 'mv_user_points';

  -- Refresh if needed or if last refresh was more than 1 hour ago
  IF needs_refresh_flag OR
     last_refresh_time < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN

    PERFORM refresh_user_points_mv();

    -- Update tracking table
    UPDATE mv_refresh_queue
    SET needs_refresh = false,
        last_refresh = CURRENT_TIMESTAMP
    WHERE view_name = 'mv_user_points';
  END IF;
END;
$$;

-- =========================================
-- PHASE 6: Alternative - Summary Table
-- =========================================

-- Create summary table for real-time updates (alternative to MV)
CREATE TABLE IF NOT EXISTS user_points_summary (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  display_name VARCHAR(255),
  profile_image_url TEXT,
  username VARCHAR(255),
  created_at TIMESTAMP,
  total_points INTEGER DEFAULT 0,
  total_cards INTEGER DEFAULT 0,
  legendary_count INTEGER DEFAULT 0,
  epic_count INTEGER DEFAULT 0,
  common_count INTEGER DEFAULT 0,
  last_claim_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast ranking queries
CREATE INDEX idx_user_points_summary_ranking
ON user_points_summary(total_points DESC, created_at ASC)
WHERE total_points > 0;

-- Function to update summary table
CREATE OR REPLACE FUNCTION update_user_points_summary(p_user_id INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_data RECORD;
  v_points_data RECORD;
BEGIN
  -- Get user data
  SELECT wallet_address, display_name, profile_image_url, username, created_at
  INTO v_user_data
  FROM users
  WHERE id = p_user_id;

  -- Calculate points and counts
  SELECT
    COALESCE(SUM(CASE n.rarity::TEXT
      WHEN 'legendary' THEN 10
      WHEN 'epic' THEN 2
      WHEN 'common' THEN 1
      ELSE 0
    END), 0) AS total_points,
    COUNT(DISTINCT uac.id) as total_cards,
    COUNT(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 END) as legendary_count,
    COUNT(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 END) as epic_count,
    COUNT(CASE WHEN n.rarity::TEXT = 'common' THEN 1 END) as common_count,
    MAX(uac.claimed_at) as last_claim_date
  INTO v_points_data
  FROM userassetclaims uac
  JOIN nfts n ON uac.nft_id = n.id
  WHERE uac.user_id = p_user_id
    AND uac.burned_at IS NULL
    AND n.status = 'active';

  -- Upsert into summary table
  INSERT INTO user_points_summary (
    user_id, wallet_address, display_name, profile_image_url, username, created_at,
    total_points, total_cards, legendary_count, epic_count, common_count,
    last_claim_date, updated_at
  ) VALUES (
    p_user_id, v_user_data.wallet_address, v_user_data.display_name,
    v_user_data.profile_image_url, v_user_data.username, v_user_data.created_at,
    v_points_data.total_points, v_points_data.total_cards,
    v_points_data.legendary_count, v_points_data.epic_count, v_points_data.common_count,
    v_points_data.last_claim_date, CURRENT_TIMESTAMP
  )
  ON CONFLICT (user_id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    display_name = EXCLUDED.display_name,
    profile_image_url = EXCLUDED.profile_image_url,
    username = EXCLUDED.username,
    total_points = EXCLUDED.total_points,
    total_cards = EXCLUDED.total_cards,
    legendary_count = EXCLUDED.legendary_count,
    epic_count = EXCLUDED.epic_count,
    common_count = EXCLUDED.common_count,
    last_claim_date = EXCLUDED.last_claim_date,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Trigger to update summary on claim
CREATE OR REPLACE FUNCTION trigger_update_user_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_user_points_summary(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_points_summary(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_points ON userassetclaims;
CREATE TRIGGER trg_update_user_points
AFTER INSERT OR UPDATE OR DELETE ON userassetclaims
FOR EACH ROW
EXECUTE FUNCTION trigger_update_user_points();

-- =========================================
-- PHASE 7: Initial Data Population
-- =========================================

-- Populate summary table with existing data
INSERT INTO user_points_summary (
  user_id, wallet_address, display_name, profile_image_url, username, created_at,
  total_points, total_cards, legendary_count, epic_count, common_count, last_claim_date
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
  COUNT(DISTINCT uac.id) as total_cards,
  COUNT(CASE WHEN n.rarity::TEXT = 'legendary' THEN 1 END) as legendary_count,
  COUNT(CASE WHEN n.rarity::TEXT = 'epic' THEN 1 END) as epic_count,
  COUNT(CASE WHEN n.rarity::TEXT = 'common' THEN 1 END) as common_count,
  MAX(uac.claimed_at) as last_claim_date
FROM users u
LEFT JOIN userassetclaims uac ON u.id = uac.user_id AND uac.burned_at IS NULL
LEFT JOIN nfts n ON uac.nft_id = n.id AND n.status = 'active'
GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username, u.created_at
ON CONFLICT (user_id) DO NOTHING;

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW mv_user_points;

-- =========================================
-- PHASE 8: Query Performance Testing
-- =========================================

-- Test queries for comparison
/*
-- Original slow query (1469ms)
EXPLAIN ANALYZE
SELECT ... (original query)

-- Optimized with indexes only (target: ~600ms)
EXPLAIN ANALYZE
SELECT ... (same query with new indexes)

-- Using materialized view (target: <50ms)
EXPLAIN ANALYZE
SELECT * FROM mv_user_points
WHERE total_points > 0
ORDER BY total_points DESC, created_at ASC
LIMIT 10;

-- Using summary table (target: <30ms)
EXPLAIN ANALYZE
SELECT * FROM user_points_summary
WHERE total_points > 0
ORDER BY total_points DESC, created_at ASC
LIMIT 10;
*/

-- =========================================
-- ROLLBACK SCRIPT (if needed)
-- =========================================
/*
DROP MATERIALIZED VIEW IF EXISTS mv_user_points CASCADE;
DROP TABLE IF EXISTS user_points_summary CASCADE;
DROP TABLE IF EXISTS mv_refresh_queue CASCADE;
DROP FUNCTION IF EXISTS refresh_user_points_mv() CASCADE;
DROP FUNCTION IF EXISTS mark_user_points_dirty() CASCADE;
DROP FUNCTION IF EXISTS check_and_refresh_mv() CASCADE;
DROP FUNCTION IF EXISTS update_user_points_summary(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS trigger_update_user_points() CASCADE;
DROP INDEX IF EXISTS idx_userassetclaims_user_nft;
DROP INDEX IF EXISTS idx_nfts_status_rarity;
DROP INDEX IF EXISTS idx_users_profile_data;
*/