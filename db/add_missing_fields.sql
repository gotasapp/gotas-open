-- Script SQL para adicionar campos faltantes na tabela nfts
-- Execute este script no editor SQL do Neon para adicionar os campos necessários

-- Verificar se as colunas já existem antes de adicioná-las
DO $$
BEGIN
    -- Verificar e adicionar a coluna total_supply se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'total_supply') THEN
        ALTER TABLE nfts ADD COLUMN total_supply INTEGER NOT NULL DEFAULT 100;
    END IF;

    -- Verificar e adicionar a coluna claimed_supply se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'claimed_supply') THEN
        ALTER TABLE nfts ADD COLUMN claimed_supply INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Verificar e adicionar a coluna max_per_user se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'max_per_user') THEN
        ALTER TABLE nfts ADD COLUMN max_per_user INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Verificar e adicionar a coluna release_date se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'release_date') THEN
        ALTER TABLE nfts ADD COLUMN release_date TIMESTAMP NOT NULL DEFAULT NOW();
    END IF;

    -- Verificar e adicionar a coluna expiration_date se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'expiration_date') THEN
        ALTER TABLE nfts ADD COLUMN expiration_date TIMESTAMP NULL;
    END IF;

    -- Verificar e adicionar a coluna cooldown_minutes se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'nfts' AND column_name = 'cooldown_minutes') THEN
        ALTER TABLE nfts ADD COLUMN cooldown_minutes INTEGER NULL;
    END IF;

    -- Fazer as mudanças nome/tipo se necessário (mint_date → release_date, expiry_date → expiration_date)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'mint_date') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'release_date') THEN
        -- Adicionar coluna temporária para Release Date
        ALTER TABLE nfts ADD COLUMN release_date TIMESTAMP NOT NULL DEFAULT NOW();
        -- Copiar dados da mint_date para release_date
        UPDATE nfts SET release_date = mint_date;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'expiry_date') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'expiration_date') THEN
        -- Adicionar coluna temporária para Expiration Date
        ALTER TABLE nfts ADD COLUMN expiration_date TIMESTAMP NULL;
        -- Copiar dados da expiry_date para expiration_date
        UPDATE nfts SET expiration_date = expiry_date;
    END IF;

END$$;

-- Criar índices para os novos campos
DO $$
BEGIN
    -- Índice para total_supply se a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'total_supply') AND
       NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'nfts' AND indexname = 'nfts_total_supply_idx') THEN
        CREATE INDEX nfts_total_supply_idx ON nfts (total_supply);
    END IF;

    -- Índice para release_date se a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'nfts' AND column_name = 'release_date') AND
       NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'nfts' AND indexname = 'nfts_release_date_idx') THEN
        CREATE INDEX nfts_release_date_idx ON nfts (release_date);
    END IF;

END$$;

-- Comentários para as colunas
COMMENT ON COLUMN nfts.total_supply IS 'Número total de NFTs disponíveis';
COMMENT ON COLUMN nfts.claimed_supply IS 'Número de NFTs já reivindicados';
COMMENT ON COLUMN nfts.max_per_user IS 'Número máximo de NFTs que um usuário pode reivindicar';
COMMENT ON COLUMN nfts.release_date IS 'Data em que o NFT fica disponível para reivindicação';
COMMENT ON COLUMN nfts.expiration_date IS 'Data opcional em que o NFT expira e não pode mais ser reivindicado';
COMMENT ON COLUMN nfts.cooldown_minutes IS 'Período de resfriamento em minutos (NULL se não for permitido reivindicar novamente)';

-- Exibir a estrutura atualizada da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'nfts' 
ORDER BY ordinal_position;