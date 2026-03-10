-- Ensure nft_mint_log has token_id column for burn sync
ALTER TABLE nft_mint_log
  ADD COLUMN IF NOT EXISTS token_id TEXT;

-- Add indexes to optimize burn synchronization lookups
CREATE INDEX IF NOT EXISTS idx_nft_mint_log_token_id ON nft_mint_log ((token_id));
CREATE INDEX IF NOT EXISTS idx_userassetclaims_wallet_burned ON userassetclaims (LOWER(wallet_address), burned_at);
