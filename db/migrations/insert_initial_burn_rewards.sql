-- Insert initial burn rewards configuration
-- Values per card based on rarity and fan token

-- First, ensure burn_global_settings has proper configuration
INSERT INTO burn_global_settings (setting_key, setting_value, setting_type, description) VALUES
('burn_feature_enabled', 'true', 'boolean', 'Enable or disable the burn feature globally'),
('minimum_cards_per_burn', '1', 'integer', 'Minimum number of cards required per burn transaction'),
('maximum_cards_per_burn', '100', 'integer', 'Maximum number of cards allowed per burn transaction'),
('burn_cooldown_seconds', '0', 'integer', 'Cooldown period between burns in seconds'),
('chz_reward_multiplier', '1.0', 'decimal', 'Global multiplier for CHZ rewards')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- Insert burn rewards for each fan token and rarity combination
-- Format: (fan_token_symbol, rarity, chz_per_card)

-- FLAMENGO (MENGO)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('MENGO', 'comum', 10.00),
('MENGO', 'raro', 40.00),
('MENGO', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- CORINTHIANS (SCCP)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('SCCP', 'comum', 10.00),
('SCCP', 'raro', 40.00),
('SCCP', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- PALMEIRAS (VERDAO)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('VERDAO', 'comum', 10.00),
('VERDAO', 'raro', 40.00),
('VERDAO', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- SÃO PAULO (SPFC)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('SPFC', 'comum', 10.00),
('SPFC', 'raro', 40.00),
('SPFC', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- VASCO
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('VASCO', 'comum', 10.00),
('VASCO', 'raro', 40.00),
('VASCO', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- FLUMINENSE (FLU)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('FLU', 'comum', 10.00),
('FLU', 'raro', 40.00),
('FLU', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- INTERNACIONAL (SACI)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('SACI', 'comum', 10.00),
('SACI', 'raro', 40.00),
('SACI', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- BARCELONA (BAR)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('BAR', 'comum', 10.00),
('BAR', 'raro', 40.00),
('BAR', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- PSG
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('PSG', 'comum', 10.00),
('PSG', 'raro', 40.00),
('PSG', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- JUVENTUS (JUV)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('JUV', 'comum', 10.00),
('JUV', 'raro', 40.00),
('JUV', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- ATLÉTICO MADRID (ATM)
INSERT INTO burn_rewards_config (fan_token_symbol, rarity, chz_reward_amount) VALUES
('ATM', 'comum', 10.00),
('ATM', 'raro', 40.00),
('ATM', 'lendário', 100.00)
ON CONFLICT (fan_token_symbol, rarity) DO UPDATE
SET chz_reward_amount = EXCLUDED.chz_reward_amount;

-- Verify insertions
SELECT 'Burn rewards configuration inserted successfully' as status;
SELECT COUNT(*) as total_configs FROM burn_rewards_config;
SELECT fan_token_symbol, rarity, chz_reward_amount
FROM burn_rewards_config
ORDER BY fan_token_symbol,
  CASE rarity
    WHEN 'comum' THEN 1
    WHEN 'raro' THEN 2
    WHEN 'lendário' THEN 3
  END;
