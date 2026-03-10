import { query } from '@/lib/db-pool';
import { handleApiError, successResponse } from '@/lib/error-handler';

export const runtime = 'nodejs';

// Definição do tipo de colecionador
interface Collector {
  id: number;
  walletAddress: string;
  displayName: string;
  username: string | null;
  avatarUrl: string;
  totalPoints: number;
  totalCards: number;
}

// Cache em memória com TTL de 24 horas
interface CacheEntry {
  data: Collector[];
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

function isCacheValid(): boolean {
  if (!cache) return false;
  const now = Date.now();
  return (now - cache.timestamp) < CACHE_DURATION;
}

export async function GET() {
  try {
    // Retornar cache se ainda estiver válido
    if (isCacheValid() && cache) {
      console.log('Retornando top collectors do cache');
      return successResponse(cache.data);
    }

    // Buscar top 10 colecionadores
    // Sistema de pontuação: Legendary = 10, Epic = 2, Common = 1
    const queryText = `
      SELECT
        u.id,
        u.wallet_address,
        u.display_name,
        u.profile_image_url as avatar_url,
        u.username,
        SUM(CASE
          WHEN n.rarity::TEXT = 'legendary' THEN 10
          WHEN n.rarity::TEXT = 'epic' THEN 2
          WHEN n.rarity::TEXT = 'common' THEN 1
          ELSE 0
        END) AS total_points,
        COUNT(DISTINCT uac.id) as total_cards
      FROM users u
      JOIN userassetclaims uac ON u.id = uac.user_id
      JOIN nfts n ON uac.nft_id = n.id
      WHERE n.status = 'active'
      GROUP BY u.id, u.wallet_address, u.display_name, u.profile_image_url, u.username
      HAVING SUM(CASE
        WHEN n.rarity::TEXT = 'legendary' THEN 10
        WHEN n.rarity::TEXT = 'epic' THEN 2
        WHEN n.rarity::TEXT = 'common' THEN 1
        ELSE 0
      END) > 0
      ORDER BY total_points DESC, u.created_at ASC
      LIMIT 10
    `;

    const result = await query(queryText);

    // Formatar dados para o frontend
    const topCollectors: Collector[] = result.rows.map((row) => {
      const walletShort = `${row.wallet_address.slice(0, 6)}...${row.wallet_address.slice(-4)}`;
      const defaultName = row.username || walletShort;

      return {
        id: row.id,
        walletAddress: row.wallet_address,
        displayName: row.display_name || defaultName,
        username: row.username,
        avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
        totalPoints: parseInt(row.total_points) || 0,
        totalCards: parseInt(row.total_cards) || 0
      };
    });

    // Atualizar cache
    cache = {
      data: topCollectors,
      timestamp: Date.now()
    };

    console.log(`Top collectors atualizados: ${topCollectors.length} registros`);
    return successResponse(topCollectors);

  } catch (error) {
    console.error('Erro ao buscar top collectors:', error);
    return handleApiError(error);
  }
}

// Endpoint opcional para limpar o cache manualmente (útil para desenvolvimento)
export async function DELETE() {
  try {
    cache = null;
    return successResponse({ message: 'Cache limpo com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
