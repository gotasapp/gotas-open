-- Migration: Add ipfs_image_url column to asset table
-- Date: 2025-07-18
-- Purpose: Store IPFS image URLs extracted from metadata_json to use in NFT minting

-- Add the new column
ALTER TABLE asset 
ADD COLUMN IF NOT EXISTS ipfs_image_url TEXT;

-- Add index for performance when querying assets without IPFS URL
CREATE INDEX IF NOT EXISTS idx_asset_ipfs_image_url_null 
ON asset (id) 
WHERE ipfs_image_url IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN asset.ipfs_image_url IS 'IPFS URL of the NFT image extracted from metadata stored in IPFS. Format: ipfs://QmXXX.../image.png';