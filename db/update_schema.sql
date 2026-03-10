-- Adicionar a coluna super_user à tabela de usuários se ainda não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_user BOOLEAN DEFAULT FALSE;

-- Atualizar o usuário existente para ser administrador ou criar um novo se não existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
        UPDATE users SET super_user = TRUE WHERE email = 'admin@example.com';
    ELSE
        -- Inserir um novo usuário admin
        INSERT INTO users (wallet_address, email, username, super_user)
        VALUES ('0x1234567890abcdef1234567890abcdef12345678', 'admin@example.com', 'Admin', TRUE);
    END IF;
END $$;

-- Verificar as alterações
SELECT id, username, email, wallet_address, super_user FROM users WHERE super_user = TRUE;