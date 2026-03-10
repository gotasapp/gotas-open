-- Migration: Add burn rewards configuration tables
-- Created: 2025-10-01
-- Description: Creates tables for managing CHZ rewards for burning NFT cards

-- =====================================================
-- Table 1: burn_rewards_config
-- Stores CHZ reward amounts per NFT rarity and fan token
-- =====================================================
CREATE TABLE IF NOT EXISTS burn_rewards_config (
  id SERIAL PRIMARY KEY,
  fan_token_symbol VARCHAR(20) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  chz_reward_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure unique combination of token and rarity
  UNIQUE(fan_token_symbol, rarity)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_burn_rewards_config_fan_token ON burn_rewards_config(fan_token_symbol);
CREATE INDEX IF NOT EXISTS idx_burn_rewards_config_rarity ON burn_rewards_config(rarity);
CREATE INDEX IF NOT EXISTS idx_burn_rewards_config_active ON burn_rewards_config(is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE burn_rewards_config IS 'Configuration table for CHZ rewards when burning NFT cards';
COMMENT ON COLUMN burn_rewards_config.fan_token_symbol IS 'Symbol of the fan token (MENGO, SCCP, etc.)';
COMMENT ON COLUMN burn_rewards_config.rarity IS 'NFT rarity level: comum (common), raro (rare), or lendário (legendary)';
COMMENT ON COLUMN burn_rewards_config.chz_reward_amount IS 'Amount of CHZ to reward for burning this rarity/token combination';
COMMENT ON COLUMN burn_rewards_config.is_active IS 'Whether this reward configuration is currently active';

-- =====================================================
-- Table 2: burn_global_settings
-- Global burn feature configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS burn_global_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('integer', 'boolean', 'decimal', 'text')),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for key lookups
CREATE INDEX IF NOT EXISTS idx_burn_global_settings_key ON burn_global_settings(setting_key);

-- Add comments
COMMENT ON TABLE burn_global_settings IS 'Global configuration for burn feature';
COMMENT ON COLUMN burn_global_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN burn_global_settings.setting_value IS 'Value of the setting (stored as text, parsed based on setting_type)';
COMMENT ON COLUMN burn_global_settings.setting_type IS 'Data type of the setting value';

-- =====================================================
-- Table 3: fan_tokens (if not exists)
-- Reference table for fan tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS fan_tokens (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  team_name VARCHAR(100),
  contract_address VARCHAR(66),
  decimals INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fan_tokens_symbol ON fan_tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_fan_tokens_active ON fan_tokens(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE fan_tokens IS 'Reference table for all fan tokens in the system';
COMMENT ON COLUMN fan_tokens.decimals IS 'Number of decimal places (0 for fan tokens, 18 for CHZ)';

-- =====================================================
-- Update trigger for updated_at columns
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_burn_rewards_config_updated_at
  BEFORE UPDATE ON burn_rewards_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_burn_global_settings_updated_at
  BEFORE UPDATE ON burn_global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fan_tokens_updated_at
  BEFORE UPDATE ON fan_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Initial seed data for fan_tokens
-- =====================================================
INSERT INTO fan_tokens (symbol, name, team_name, contract_address, decimals, is_active) VALUES
  ('MENGO', 'Flamengo Fan Token', 'Flamengo', '0xD1723Eb9e7C6eE7c7e2d421B2758dc0f2166eDDc', 0, true),
  ('SCCP', 'SC Corinthians Paulista Fan Token', 'Corinthians', NULL, 0, true),
  ('FLU', 'Fluminense Fan Token', 'Fluminense', NULL, 0, true),
  ('VASCO', 'Vasco da Gama Fan Token', 'Vasco', NULL, 0, true),
  ('SPFC', 'São Paulo FC Fan Token', 'São Paulo', NULL, 0, true),
  ('VERDAO', 'Palmeiras Fan Token', 'Palmeiras', NULL, 0, true),
  ('SACI', 'Internacional Fan Token', 'Internacional', NULL, 0, true),
  ('CAM', 'Atlético Mineiro Fan Token', 'Atlético Mineiro', NULL, 0, true),
  ('CHZ', 'Chiliz', 'Native Token', NULL, 18, true)
ON CONFLICT (symbol) DO NOTHING;

-- =====================================================
-- Initial seed data for burn_rewards_config
-- All rarities get the same CHZ rewards across all teams initially
-- =====================================================

-- Define the rarity levels
DO $$
DECLARE
  token_record RECORD;
  rarity_level VARCHAR;
  reward_amount DECIMAL;
BEGIN
  -- Loop through each fan token (excluding CHZ)
  FOR token_record IN SELECT symbol FROM fan_tokens WHERE symbol != 'CHZ' AND is_active = true
  LOOP
    -- Insert rewards for each rarity level
    -- comum (common) = 10 CHZ
    INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount, is_active)
    VALUES (token_record.symbol, 'comum', 10.0, true)
    ON CONFLICT (fan_token_symbol, rarity) DO NOTHING;

    -- raro (rare) = 20 CHZ
    INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount, is_active)
    VALUES (token_record.symbol, 'raro', 20.0, true)
    ON CONFLICT (fan_token_symbol, rarity) DO NOTHING;

    -- lendário (legendary) = 30 CHZ
    INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount, is_active)
    VALUES (token_record.symbol, 'lendário', 30.0, true)
    ON CONFLICT (fan_token_symbol, rarity) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- Initial seed data for burn_global_settings
-- =====================================================
INSERT INTO burn_global_settings (setting_key, setting_value, setting_type, description) VALUES
  ('burn_feature_enabled', 'true', 'boolean', 'Master switch to enable/disable the burn feature globally'),
  ('minimum_cards_per_burn', '1', 'integer', 'Minimum number of cards required per burn session'),
  ('maximum_cards_per_burn', '100', 'integer', 'Maximum number of cards allowed per burn session'),
  ('burn_cooldown_seconds', '0', 'integer', 'Cooldown period between burn sessions in seconds (0 = no cooldown)'),
  ('chz_reward_multiplier', '1.0', 'decimal', 'Global multiplier for CHZ rewards (1.0 = 100%, 1.5 = 150%)'),
  ('burn_transaction_timeout', '60', 'integer', 'Maximum time in seconds to wait for burn transaction confirmation'),
  ('auto_claim_rewards', 'false', 'boolean', 'Whether to automatically claim CHZ rewards after burning')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- View for easy reward lookup
-- =====================================================
CREATE OR REPLACE VIEW v_burn_rewards AS
SELECT
  ft.symbol as fan_token,
  ft.name as token_name,
  ft.team_name,
  brc.rarity,
  brc.chz_reward_amount,
  brc.is_active as reward_active,
  ft.is_active as token_active,
  (brc.is_active AND ft.is_active) as fully_active
FROM burn_rewards_config brc
JOIN fan_tokens ft ON ft.symbol = brc.fan_token_symbol
ORDER BY ft.symbol,
  CASE brc.rarity
    WHEN 'comum' THEN 1
    WHEN 'raro' THEN 2
    WHEN 'lendário' THEN 3
    ELSE 4
  END;

COMMENT ON VIEW v_burn_rewards IS 'Consolidated view of burn rewards with token information';

-- =====================================================
-- Helper function to get CHZ reward for burning a card
-- =====================================================
CREATE OR REPLACE FUNCTION get_burn_reward(
  p_fan_token_symbol VARCHAR,
  p_rarity VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
  v_reward DECIMAL;
  v_multiplier DECIMAL;
  v_is_enabled BOOLEAN;
BEGIN
  -- Check if burn feature is enabled
  SELECT (setting_value = 'true')::BOOLEAN INTO v_is_enabled
  FROM burn_global_settings
  WHERE setting_key = 'burn_feature_enabled';

  IF NOT v_is_enabled OR v_is_enabled IS NULL THEN
    RETURN 0;
  END IF;

  -- Get the base reward amount
  SELECT chz_reward_amount INTO v_reward
  FROM burn_rewards_config
  WHERE fan_token_symbol = p_fan_token_symbol
    AND rarity = p_rarity
    AND is_active = true;

  IF v_reward IS NULL THEN
    RETURN 0;
  END IF;

  -- Get the global multiplier
  SELECT setting_value::DECIMAL INTO v_multiplier
  FROM burn_global_settings
  WHERE setting_key = 'chz_reward_multiplier';

  IF v_multiplier IS NULL THEN
    v_multiplier := 1.0;
  END IF;

  RETURN v_reward * v_multiplier;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_burn_reward IS 'Calculate CHZ reward for burning a card based on fan token and rarity';

-- =====================================================
-- Grant permissions (adjust as needed for your database user)
-- =====================================================
-- Example: GRANT SELECT, INSERT, UPDATE ON burn_rewards_config TO your_app_user;
-- Example: GRANT SELECT ON v_burn_rewards TO your_app_user;