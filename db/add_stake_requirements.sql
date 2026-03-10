-- add_stake_requirements.sql
-- Adiciona suporte para requisitos de stake em NFTs

-- Adicionar colunas para requisitos de stake
ALTER TABLE nfts
ADD COLUMN stake_required BOOLEAN DEFAULT FALSE,
ADD COLUMN stake_token_address VARCHAR(255),
ADD COLUMN stake_token_amount NUMERIC(20, 8) DEFAULT 0,
ADD COLUMN stake_token_symbol VARCHAR(50);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN nfts.stake_required IS 'Indica se é necessário ter tokens em stake para resgatar este NFT';
COMMENT ON COLUMN nfts.stake_token_address IS 'Endereço do contrato do token exigido em stake (0x0... para CHZ nativo)';
COMMENT ON COLUMN nfts.stake_token_amount IS 'Quantidade mínima do token que deve estar em stake';
COMMENT ON COLUMN nfts.stake_token_symbol IS 'Símbolo do token para exibição na UI (ex: CHZ, MENGO, etc)';

-- Atualizar função can_claim_nft para verificar requisitos de stake
-- Esta função não fará a verificação on-chain, apenas preparará o banco de dados
-- A verificação real ocorrerá no frontend usando os dados on-chain
CREATE OR REPLACE FUNCTION can_claim_nft(
  p_user_id VARCHAR(255),
  p_nft_id INTEGER
) RETURNS TABLE (
  can_claim BOOLEAN,
  message TEXT,
  stake_required BOOLEAN,
  stake_token_address VARCHAR(255),
  stake_token_amount NUMERIC(20, 8),
  stake_token_symbol VARCHAR(50)
) AS $$
DECLARE
  v_nft RECORD;
  v_user_claim RECORD;
  v_claim_count INTEGER;
  v_can_claim BOOLEAN;
  v_message TEXT;
BEGIN
  -- Obter informações do NFT
  SELECT * INTO v_nft FROM nfts WHERE id = p_nft_id;
  
  -- Verificar se o NFT existe
  IF NOT FOUND THEN
    v_can_claim := FALSE;
    v_message := 'NFT não encontrado';
    RETURN QUERY SELECT v_can_claim, v_message, FALSE, NULL, 0, NULL;
    RETURN;
  END IF;
  
  -- Verificar se o NFT ainda tem suprimento disponível
  IF v_nft.claimed_supply >= v_nft.total_supply THEN
    v_can_claim := FALSE;
    v_message := 'NFT esgotado';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  -- Verificar se o NFT está dentro do período de disponibilidade
  IF v_nft.release_date > NOW() OR (v_nft.expiration_date IS NOT NULL AND v_nft.expiration_date < NOW()) THEN
    v_can_claim := FALSE;
    v_message := 'NFT não disponível neste momento';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  -- Verificar quantos deste NFT o usuário já reivindicou
  SELECT COUNT(*) INTO v_claim_count FROM user_nfts WHERE user_id = p_user_id AND nft_id = p_nft_id;
  
  -- Se o usuário nunca reivindicou este NFT
  IF v_claim_count = 0 THEN
    v_can_claim := TRUE;
    v_message := 'Disponível para resgate';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  -- Se o NFT não pode ser reivindicado novamente (cooldown_minutes é NULL)
  IF v_nft.cooldown_minutes IS NULL THEN
    v_can_claim := FALSE;
    v_message := 'Este NFT só pode ser resgatado uma vez';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  -- Verificar se o usuário já atingiu o limite por usuário
  IF v_claim_count >= v_nft.max_per_user THEN
    v_can_claim := FALSE;
    v_message := 'Você atingiu o limite máximo de resgates para este NFT';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  -- Verificar quando foi a última vez que o usuário reivindicou este NFT
  SELECT * INTO v_user_claim 
  FROM user_nfts 
  WHERE user_id = p_user_id AND nft_id = p_nft_id
  ORDER BY last_claimed_at DESC 
  LIMIT 1;
  
  -- Verificar se o período de cooldown já passou
  IF v_user_claim.last_claimed_at + (v_nft.cooldown_minutes * INTERVAL '1 minute') > NOW() THEN
    v_can_claim := FALSE;
    v_message := 'Cooldown ainda em andamento';
    RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
    RETURN;
  END IF;
  
  v_can_claim := TRUE;
  v_message := 'Disponível para resgate';
  RETURN QUERY SELECT v_can_claim, v_message, v_nft.stake_required, v_nft.stake_token_address, v_nft.stake_token_amount, v_nft.stake_token_symbol;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Atualizar a view para incluir informações de requisitos de stake
CREATE OR REPLACE VIEW available_nfts AS
SELECT 
  n.id,
  n.title,
  n.description,
  n.category,
  n.rarity,
  n.total_supply,
  n.claimed_supply,
  n.max_per_user,
  n.release_date,
  n.expiration_date,
  n.cooldown_minutes,
  n.image_url,
  n.stake_required,
  n.stake_token_address,
  n.stake_token_amount,
  n.stake_token_symbol,
  ROUND((n.claimed_supply::float / n.total_supply::float) * 100) AS claim_percentage,
  n.total_supply - n.claimed_supply AS remaining_supply,
  CASE 
    WHEN n.expiration_date IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (n.expiration_date - NOW())) / 86400 
    ELSE NULL 
  END AS days_remaining,
  CASE
    WHEN n.cooldown_minutes IS NOT NULL THEN
      'Reclaimable every ' || n.cooldown_minutes || ' minutes'
    ELSE
      'One-time claim'
  END AS claim_frequency
FROM nfts n
WHERE 
  n.release_date <= NOW() AND
  (n.expiration_date IS NULL OR n.expiration_date > NOW()) AND
  n.claimed_supply < n.total_supply
ORDER BY 
  n.rarity DESC,
  claim_percentage ASC;

-- Atualizar alguns NFTs existentes com requisitos de stake como exemplo
UPDATE nfts 
SET 
  stake_required = TRUE,
  stake_token_address = '0xD1723Eb9e7C6eE7c7e2d421B2758dc0f2166eDDc',
  stake_token_amount = 5,
  stake_token_symbol = 'MENGO'
WHERE id = 3;  -- Pixels.03 (Legendary NFT)

UPDATE nfts 
SET 
  stake_required = TRUE,
  stake_token_address = '0x0000000000000000000000000000000000000000',
  stake_token_amount = 10,
  stake_token_symbol = 'CHZ'
WHERE id = 5;  -- Weekly Exclusive (Uncommon NFT)