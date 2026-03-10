-- Migration: Add burn_history table for tracking burned cards
-- Created: 2025-10-01

-- Create burn_history table
CREATE TABLE IF NOT EXISTS burn_history (
  id SERIAL PRIMARY KEY,
  privy_user_id VARCHAR(255) NOT NULL,
  card_ids TEXT[] NOT NULL,
  card_count INTEGER NOT NULL DEFAULT 0,
  burned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  rewards_granted JSONB DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_burn_history_privy_user_id ON burn_history(privy_user_id);

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_burn_history_burned_at ON burn_history(burned_at);

-- Optional: Add burned_at column to userassetclaims for soft delete approach
ALTER TABLE userassetclaims
ADD COLUMN IF NOT EXISTS burned_at TIMESTAMP DEFAULT NULL;

-- Add index for filtering out burned cards
CREATE INDEX IF NOT EXISTS idx_userassetclaims_burned_at ON userassetclaims(burned_at) WHERE burned_at IS NULL;

COMMENT ON TABLE burn_history IS 'Tracks all card burn events for audit and rewards';
COMMENT ON COLUMN burn_history.card_ids IS 'Array of user_asset_claim_id that were burned';
COMMENT ON COLUMN burn_history.rewards_granted IS 'JSON object containing any rewards given for burning';
COMMENT ON COLUMN userassetclaims.burned_at IS 'Timestamp when card was burned, NULL if not burned';
