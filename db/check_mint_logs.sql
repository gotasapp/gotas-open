-- Script para verificar logs de mint do Thirdweb Engine
-- Execute este script no banco de dados para diagnosticar problemas de mint

-- 1. Resumo dos status de mint nas últimas 24 horas
SELECT 
    status,
    COUNT(*) as total,
    MAX(created_at) as ultimo_ocorrido
FROM nft_mint_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY total DESC;

-- 2. Últimos 20 logs de mint com detalhes
SELECT 
    ml.id,
    ml.asset_id,
    ml.user_wallet_address,
    ml.status,
    ml.error_message,
    ml.thirdweb_engine_queue_id as queue_id,
    TO_CHAR(ml.created_at, 'DD/MM/YYYY HH24:MI:SS') as criado_em,
    TO_CHAR(ml.updated_at, 'DD/MM/YYYY HH24:MI:SS') as atualizado_em,
    a.title as asset_title,
    n.name as nft_name
FROM nft_mint_log ml
LEFT JOIN asset a ON ml.asset_id::integer = a.id
LEFT JOIN nfts n ON a.nft_id = n.id
ORDER BY ml.created_at DESC
LIMIT 20;

-- 3. Logs com erro nas últimas 24 horas
SELECT 
    ml.id,
    ml.asset_id,
    ml.status,
    ml.error_message,
    TO_CHAR(ml.created_at, 'DD/MM/YYYY HH24:MI:SS') as criado_em,
    a.title as asset_title
FROM nft_mint_log ml
LEFT JOIN asset a ON ml.asset_id::integer = a.id
WHERE ml.status IN ('ENGINE_CALL_FAILED', 'ENGINE_CALL_PREP_FAILED')
    AND ml.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ml.created_at DESC;

-- 4. Taxa de sucesso vs falha nas últimas 24 horas
SELECT 
    CASE 
        WHEN status = 'ENGINE_QUEUED' THEN 'Sucesso'
        WHEN status IN ('ENGINE_CALL_FAILED', 'ENGINE_CALL_PREP_FAILED') THEN 'Falha'
        ELSE 'Pendente'
    END as resultado,
    COUNT(*) as total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM nft_mint_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY resultado;

-- 5. Verificar se há logs "travados" em PENDING_ENGINE_CALL
SELECT 
    COUNT(*) as logs_travados,
    MIN(created_at) as mais_antigo
FROM nft_mint_log
WHERE status = 'PENDING_ENGINE_CALL'
    AND created_at < NOW() - INTERVAL '5 minutes';

-- 6. Logs agrupados por hora nas últimas 24 horas
SELECT 
    DATE_TRUNC('hour', created_at) as hora,
    COUNT(*) as total_tentativas,
    SUM(CASE WHEN status = 'ENGINE_QUEUED' THEN 1 ELSE 0 END) as sucessos,
    SUM(CASE WHEN status IN ('ENGINE_CALL_FAILED', 'ENGINE_CALL_PREP_FAILED') THEN 1 ELSE 0 END) as falhas
FROM nft_mint_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC; 