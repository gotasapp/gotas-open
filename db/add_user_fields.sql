-- Script SQL para adicionar campos faltantes na tabela users
-- Execute este script no editor SQL do Neon para adicionar os campos necessários

-- Verificar se as colunas já existem antes de adicioná-las
DO $$
BEGIN
    -- Verificar e adicionar a coluna privy_user_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'privy_user_id') THEN
        ALTER TABLE users ADD COLUMN privy_user_id VARCHAR(255) NULL;
        COMMENT ON COLUMN users.privy_user_id IS 'ID único do usuário no Privy (UUID)';
    END IF;

    -- Verificar e adicionar a coluna email se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL;
        COMMENT ON COLUMN users.email IS 'Email do usuário';
    END IF;

    -- Verificar e adicionar a coluna display_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'display_name') THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL;
        COMMENT ON COLUMN users.display_name IS 'Nome de exibição do usuário';
    END IF;

    -- Verificar e adicionar a coluna username se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE NULL;
        COMMENT ON COLUMN users.username IS 'Nome de usuário único';
    END IF;

    -- Verificar e adicionar a coluna bio se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT NULL;
        COMMENT ON COLUMN users.bio IS 'Biografia do usuário';
    END IF;

    -- Verificar e adicionar a coluna profile_image_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'profile_image_url') THEN
        ALTER TABLE users ADD COLUMN profile_image_url TEXT NULL;
        COMMENT ON COLUMN users.profile_image_url IS 'URL da imagem de perfil do usuário';
    END IF;

    -- Verificar e adicionar a coluna instagram_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'instagram_url') THEN
        ALTER TABLE users ADD COLUMN instagram_url TEXT NULL;
        COMMENT ON COLUMN users.instagram_url IS 'URL do Instagram do usuário';
    END IF;

    -- Verificar e adicionar a coluna youtube_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'youtube_url') THEN
        ALTER TABLE users ADD COLUMN youtube_url TEXT NULL;
        COMMENT ON COLUMN users.youtube_url IS 'URL do YouTube do usuário';
    END IF;

    -- Verificar e adicionar a coluna x_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'x_url') THEN
        ALTER TABLE users ADD COLUMN x_url TEXT NULL;
        COMMENT ON COLUMN users.x_url IS 'URL do X (Twitter) do usuário';
    END IF;

    -- Verificar e adicionar a coluna tiktok_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'tiktok_url') THEN
        ALTER TABLE users ADD COLUMN tiktok_url TEXT NULL;
        COMMENT ON COLUMN users.tiktok_url IS 'URL do TikTok do usuário';
    END IF;

    -- Verificar e adicionar a coluna created_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
        COMMENT ON COLUMN users.created_at IS 'Data de criação do usuário';
    END IF;

    -- Verificar e adicionar a coluna updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        COMMENT ON COLUMN users.updated_at IS 'Data de última atualização do usuário';
    END IF;

    -- Verificar e adicionar a coluna super_user se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'users' AND column_name = 'super_user') THEN
        ALTER TABLE users ADD COLUMN super_user BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN users.super_user IS 'Indica se o usuário é um super usuário (admin)';
    END IF;

END$$;

-- Criar índices para melhorar performance
DO $$
BEGIN
    -- Índice para privy_user_id se a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'privy_user_id') AND
       NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'users' AND indexname = 'users_privy_user_id_idx') THEN
        CREATE INDEX users_privy_user_id_idx ON users (privy_user_id);
    END IF;

    -- Índice para email se a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'email') AND
       NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'users' AND indexname = 'users_email_idx') THEN
        CREATE INDEX users_email_idx ON users (email);
    END IF;

    -- Índice para username se a coluna existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'username') AND
       NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'users' AND indexname = 'users_username_idx') THEN
        CREATE UNIQUE INDEX users_username_idx ON users (username) WHERE username IS NOT NULL;
    END IF;

    -- Índice para wallet_address se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
              WHERE tablename = 'users' AND indexname = 'users_wallet_address_idx') THEN
        CREATE UNIQUE INDEX users_wallet_address_idx ON users (wallet_address);
    END IF;

END$$;

-- Exibir a estrutura atualizada da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 