-- Migration: Add minimum fan token balance requirement for burn feature
-- Created: 2025-10-15
-- Description: Adds configuration for minimum fan token balance required to access burn feature

-- =====================================================
-- Add minimum_fantoken_balance setting to burn_global_settings
-- =====================================================

-- Insert the new setting for minimum fan token balance
INSERT INTO burn_global_settings (setting_key, setting_value, setting_type, description)
VALUES (
  'minimum_fantoken_balance',
  '100',
  'integer',
  'Minimum balance of ANY single fan token required to access burn feature'
)
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add comment for clarity
COMMENT ON COLUMN burn_global_settings.setting_key IS 'Unique identifier for the setting. minimum_fantoken_balance controls burn access gate.';

-- =====================================================
-- Helper function to check if user meets minimum token requirement
-- =====================================================

CREATE OR REPLACE FUNCTION check_burn_eligibility(
  p_wallet_address VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_minimum_required INTEGER;
  v_is_enabled BOOLEAN;
BEGIN
  -- Check if burn feature is enabled globally
  SELECT (setting_value = 'true')::BOOLEAN INTO v_is_enabled
  FROM burn_global_settings
  WHERE setting_key = 'burn_feature_enabled';

  IF NOT v_is_enabled OR v_is_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get minimum required balance
  SELECT setting_value::INTEGER INTO v_minimum_required
  FROM burn_global_settings
  WHERE setting_key = 'minimum_fantoken_balance';

  IF v_minimum_required IS NULL THEN
    v_minimum_required := 100; -- Default fallback
  END IF;

  -- Note: Actual token balance check must be done via blockchain query
  -- This function just validates configuration is present
  -- Frontend/API layer will query blockchain for actual balances

  RETURN TRUE; -- Configuration is valid
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_burn_eligibility IS 'Validates burn feature configuration for a wallet address. Actual token balance check happens in application layer via blockchain queries.';

-- =====================================================
-- View to see all burn configuration settings
-- =====================================================

CREATE OR REPLACE VIEW v_burn_configuration AS
SELECT
  setting_key,
  setting_value,
  setting_type,
  description,
  CASE setting_key
    WHEN 'burn_feature_enabled' THEN 'Master switch for burn feature'
    WHEN 'minimum_fantoken_balance' THEN 'Minimum token balance gate'
    WHEN 'minimum_cards_per_burn' THEN 'Card count limits'
    WHEN 'maximum_cards_per_burn' THEN 'Card count limits'
    WHEN 'burn_cooldown_seconds' THEN 'Rate limiting'
    WHEN 'chz_reward_multiplier' THEN 'Reward calculation'
    ELSE 'Other setting'
  END as category
FROM burn_global_settings
WHERE setting_key LIKE 'burn%' OR setting_key LIKE 'minimum%' OR setting_key LIKE 'maximum%'
ORDER BY category, setting_key;

COMMENT ON VIEW v_burn_configuration IS 'Consolidated view of all burn-related configuration settings';

-- =====================================================
-- Verification query
-- =====================================================

-- Show the new setting
SELECT
  setting_key,
  setting_value,
  setting_type,
  description
FROM burn_global_settings
WHERE setting_key = 'minimum_fantoken_balance';

-- Show all burn configuration
SELECT * FROM v_burn_configuration;

-- Success message
SELECT 'Burn minimum token requirement migration completed successfully' as status;
