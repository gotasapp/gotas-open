-- Migration: Add marketplace_listings table for NFT marketplace
-- This table stores all NFT listings created on the marketplace

CREATE TABLE IF NOT EXISTS marketplace_listings (
  listing_id VARCHAR(66) PRIMARY KEY,
  token_id VARCHAR(78) NOT NULL,
  quantity VARCHAR(78) NOT NULL DEFAULT '1',
  price_per_token VARCHAR(78) NOT NULL,
  start_timestamp BIGINT NOT NULL,
  end_timestamp BIGINT NOT NULL,
  listing_creator VARCHAR(42) NOT NULL,
  asset_contract VARCHAR(42) NOT NULL,
  currency VARCHAR(42) NOT NULL,
  token_type INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  reserved BOOLEAN DEFAULT FALSE,
  transaction_hash VARCHAR(66),
  block_number BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings (status);
CREATE INDEX IF NOT EXISTS idx_marketplace_creator ON marketplace_listings (listing_creator);
CREATE INDEX IF NOT EXISTS idx_marketplace_token_id ON marketplace_listings (token_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_asset_contract ON marketplace_listings (asset_contract);
CREATE INDEX IF NOT EXISTS idx_marketplace_currency ON marketplace_listings (currency);
CREATE INDEX IF NOT EXISTS idx_marketplace_timestamps ON marketplace_listings (start_timestamp, end_timestamp);
CREATE INDEX IF NOT EXISTS idx_marketplace_price ON marketplace_listings (price_per_token);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace_listings (created_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_listings_updated_at_trigger
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_listings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE marketplace_listings IS 'Stores NFT marketplace listings with all transaction details';
COMMENT ON COLUMN marketplace_listings.listing_id IS 'Unique identifier from the marketplace contract';
COMMENT ON COLUMN marketplace_listings.token_id IS 'NFT token ID from the ERC721 contract';
COMMENT ON COLUMN marketplace_listings.quantity IS 'Quantity of tokens (always 1 for ERC721)';
COMMENT ON COLUMN marketplace_listings.price_per_token IS 'Price per token in wei (base units)';
COMMENT ON COLUMN marketplace_listings.start_timestamp IS 'Unix timestamp when listing becomes active';
COMMENT ON COLUMN marketplace_listings.end_timestamp IS 'Unix timestamp when listing expires';
COMMENT ON COLUMN marketplace_listings.listing_creator IS 'Ethereum address of the seller';
COMMENT ON COLUMN marketplace_listings.asset_contract IS 'ERC721 contract address';
COMMENT ON COLUMN marketplace_listings.currency IS 'Currency contract address (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for CHZ)';
COMMENT ON COLUMN marketplace_listings.token_type IS 'Token type: 0=ERC721, 1=ERC1155';
COMMENT ON COLUMN marketplace_listings.status IS 'Listing status: 0=UNSET, 1=CREATED, 2=COMPLETED, 3=CANCELLED';
COMMENT ON COLUMN marketplace_listings.reserved IS 'Whether the listing is reserved for specific buyer';
COMMENT ON COLUMN marketplace_listings.transaction_hash IS 'Transaction hash that created this listing';
COMMENT ON COLUMN marketplace_listings.block_number IS 'Block number where listing was created';