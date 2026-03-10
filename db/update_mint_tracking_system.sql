-- Script para adicionar sistema de tracking completo para NFTs mintados via Thirdweb Engine
-- Autor: Sistema de Tracking de Minting
-- Data: 2025-01-17

-- 1. Adicionar novos campos na tabela nft_mint_log
ALTER TABLE nft_mint_log 
ADD COLUMN IF NOT EXISTS engine_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS block_number BIGINT,
ADD COLUMN IF NOT EXISTS gas_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS minted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP;

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_nft_mint_log_queue_id ON nft_mint_log(queue_id);
CREATE INDEX IF NOT EXISTS idx_nft_mint_log_engine_status ON nft_mint_log(engine_status);
CREATE INDEX IF NOT EXISTS idx_nft_mint_log_nft_id ON nft_mint_log(nft_id);
CREATE INDEX IF NOT EXISTS idx_nft_mint_log_user_wallet ON nft_mint_log(user_wallet);

-- 3. Adicionar constraint para evitar duplicação de token_id
ALTER TABLE nft_mint_log 
ADD CONSTRAINT unique_nft_token_id UNIQUE (nft_id, token_id) 
ON CONFLICT DO NOTHING;

-- 4. Criar tabela para logs de webhooks do Thirdweb Engine
CREATE TABLE IF NOT EXISTS thirdweb_webhook_logs (
    id SERIAL PRIMARY KEY,
    queue_id VARCHAR(255) NOT NULL,
    webhook_type VARCHAR(50) NOT NULL, -- 'success', 'error', 'cancelled'
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES nft_mint_log(queue_id)
);

-- 5. Criar tabela para histórico de retry de mints
CREATE TABLE IF NOT EXISTS mint_retry_history (
    id SERIAL PRIMARY KEY,
    original_queue_id VARCHAR(255) NOT NULL,
    new_queue_id VARCHAR(255),
    nft_id INTEGER NOT NULL,
    user_wallet VARCHAR(255) NOT NULL,
    retry_reason TEXT,
    retry_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (nft_id) REFERENCES nfts(id)
);

-- 6. Criar view para visualização consolidada do status de minting
CREATE OR REPLACE VIEW v_mint_status_dashboard AS
SELECT 
    ml.id,
    ml.nft_id,
    n.name as nft_name,
    ml.user_wallet,
    ml.queue_id,
    ml.engine_status,
    ml.transaction_hash,
    ml.block_number,
    ml.error_message,
    ml.retry_count,
    ml.created_at,
    ml.minted_at,
    ml.last_checked_at,
    CASE 
        WHEN ml.engine_status = 'MINTED' THEN 'success'
        WHEN ml.engine_status = 'FAILED' THEN 'error'
        WHEN ml.engine_status = 'CANCELLED' THEN 'cancelled'
        WHEN ml.last_checked_at < NOW() - INTERVAL '30 minutes' THEN 'stale'
        ELSE 'pending'
    END as status_category,
    EXTRACT(EPOCH FROM (COALESCE(ml.minted_at, NOW()) - ml.created_at)) as processing_time_seconds
FROM nft_mint_log ml
JOIN nfts n ON ml.nft_id = n.id
ORDER BY ml.created_at DESC;

-- 7. Função para verificar se um NFT já foi mintado para evitar duplicação
CREATE OR REPLACE FUNCTION check_nft_already_minted(
    p_nft_id INTEGER,
    p_user_wallet VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM nft_mint_log 
        WHERE nft_id = p_nft_id 
        AND user_wallet = p_user_wallet 
        AND engine_status = 'MINTED'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para atualizar last_checked_at automaticamente
CREATE OR REPLACE FUNCTION update_last_checked_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_checked_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_checked_at
BEFORE UPDATE ON nft_mint_log
FOR EACH ROW
WHEN (OLD.engine_status IS DISTINCT FROM NEW.engine_status)
EXECUTE FUNCTION update_last_checked_at();

-- 9. Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN nft_mint_log.engine_status IS 'Status do minting no Thirdweb Engine: PENDING, MINTED, FAILED, CANCELLED';
COMMENT ON COLUMN nft_mint_log.transaction_hash IS 'Hash da transação blockchain quando o NFT foi mintado';
COMMENT ON COLUMN nft_mint_log.block_number IS 'Número do bloco onde a transação foi confirmada';
COMMENT ON COLUMN nft_mint_log.gas_used IS 'Quantidade de gas usado na transação';
COMMENT ON COLUMN nft_mint_log.error_message IS 'Mensagem de erro se o minting falhou';
COMMENT ON COLUMN nft_mint_log.retry_count IS 'Número de tentativas de retry realizadas';
COMMENT ON COLUMN nft_mint_log.last_checked_at IS 'Última vez que o status foi verificado';
COMMENT ON COLUMN nft_mint_log.minted_at IS 'Timestamp de quando o NFT foi efetivamente mintado';
COMMENT ON COLUMN nft_mint_log.webhook_received_at IS 'Timestamp de quando o webhook do Engine foi recebido';

-- 10. Valores possíveis para engine_status
-- PENDING: Enviado para o Engine, aguardando processamento
-- MINTED: NFT mintado com sucesso na blockchain
-- FAILED: Falha no minting (ver error_message)
-- CANCELLED: Minting cancelado
-- RETRYING: Em processo de retry