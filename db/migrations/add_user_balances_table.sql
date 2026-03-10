-- Create user_balances table to track token balances
CREATE TABLE IF NOT EXISTS user_balances (
  id SERIAL PRIMARY KEY,
  privy_user_id VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42),
  token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(privy_user_id, token_symbol)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_balances_privy_user_id ON user_balances(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_wallet_address ON user_balances(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_balances_token_symbol ON user_balances(token_symbol);

-- Add comments for documentation
COMMENT ON TABLE user_balances IS 'Tracks user token balances for rewards and transactions';
COMMENT ON COLUMN user_balances.privy_user_id IS 'User identifier from Privy authentication';
COMMENT ON COLUMN user_balances.wallet_address IS 'User wallet address on blockchain';
COMMENT ON COLUMN user_balances.token_symbol IS 'Token symbol (CHZ, MENGO, etc.)';
COMMENT ON COLUMN user_balances.balance IS 'Current balance with 18 decimal precision';