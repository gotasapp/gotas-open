import { NextRequest } from 'next/server';
import { handleApiError, successResponse, errorResponse } from '@/lib/error-handler';
import { query } from '@/lib/db-pool';
import { MarketplaceListing, NFTWithMetadata, TokenType, ListingStatus } from '@/types/marketplace';

/**
 * GET /api/marketplace/listings
 * 
 * Busca todas as listagens ativas do marketplace
 * Query params:
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 20)
 * - search: busca por nome ou ID
 * - rarity: filtro por raridade
 * - club: filtro por clube
 * - priceMin: preço mínimo em CHZ
 * - priceMax: preço máximo em CHZ
 * - sortBy: ordenação (newest, oldest, price_low, price_high, rarity)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // máximo 100 itens
    const offset = (page - 1) * limit;
    
    // Parâmetros de filtro
    const search = searchParams.get('search') || '';
    const rarity = searchParams.get('rarity') || '';
    const club = searchParams.get('club') || '';
    const priceMin = searchParams.get('priceMin') || '';
    const priceMax = searchParams.get('priceMax') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    
    // Construir query SQL base
    let sqlQuery = `
      SELECT 
        ml.*,
        a.id as asset_id,
        a.title as asset_title,
        a.rarity as asset_rarity,
        a.nft_number as asset_nft_number,
        a.image_url as asset_image_url,
        a.metadata_json as asset_metadata_ipfs,
        a.asset_data->>'team' as asset_team
      FROM marketplace_listings ml
      LEFT JOIN asset a ON ml.token_id = a.id::text
      WHERE ml.status = $1 
      AND ml.end_timestamp > EXTRACT(EPOCH FROM NOW())
    `;
    
    const queryParams: any[] = [ListingStatus.CREATED.toString()];
    let paramCounter = 2;
    
    // Adicionar filtros
    if (search) {
      sqlQuery += ` AND (a.title ILIKE $${paramCounter} OR ml.token_id = $${paramCounter + 1})`;
      queryParams.push(`%${search}%`, search);
      paramCounter += 2;
    }
    
    if (rarity) {
      sqlQuery += ` AND a.rarity = $${paramCounter}`;
      queryParams.push(rarity);
      paramCounter++;
    }
    
    if (club) {
      sqlQuery += ` AND a.asset_data->>'team' = $${paramCounter}`;
      queryParams.push(club);
      paramCounter++;
    }
    
    if (priceMin) {
      sqlQuery += ` AND ml.price_per_token >= $${paramCounter}`;
      queryParams.push(priceMin);
      paramCounter++;
    }
    
    if (priceMax) {
      sqlQuery += ` AND ml.price_per_token <= $${paramCounter}`;
      queryParams.push(priceMax);
      paramCounter++;
    }
    
    // Adicionar ordenação
    switch (sortBy) {
      case 'oldest':
        sqlQuery += ' ORDER BY ml.start_timestamp ASC';
        break;
      case 'price_low':
        sqlQuery += ' ORDER BY ml.price_per_token ASC';
        break;
      case 'price_high':
        sqlQuery += ' ORDER BY ml.price_per_token DESC';
        break;
      case 'rarity':
        sqlQuery += ' ORDER BY CASE WHEN a.rarity = \'legendary\' THEN 1 WHEN a.rarity = \'epic\' THEN 2 ELSE 3 END';
        break;
      case 'newest':
      default:
        sqlQuery += ' ORDER BY ml.start_timestamp DESC';
        break;
    }
    
    // Adicionar paginação
    sqlQuery += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(limit, offset);
    
    // Executar query principal
    const listingsResult = await query(sqlQuery, queryParams);
    
    // Query para contar total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM marketplace_listings ml
      LEFT JOIN asset a ON ml.token_id = a.id::text
      WHERE ml.status = $1 
      AND ml.end_timestamp > EXTRACT(EPOCH FROM NOW())
    `;
    
    const countParams = [ListingStatus.CREATED.toString()];
    let countParamCounter = 2;
    
    // Adicionar os mesmos filtros na query de contagem
    if (search) {
      countQuery += ` AND (a.title ILIKE $${countParamCounter} OR ml.token_id = $${countParamCounter + 1})`;
      countParams.push(`%${search}%`, search);
      countParamCounter += 2;
    }
    
    if (rarity) {
      countQuery += ` AND a.rarity = $${countParamCounter}`;
      countParams.push(rarity);
      countParamCounter++;
    }
    
    if (club) {
      countQuery += ` AND a.asset_data->>'team' = $${countParamCounter}`;
      countParams.push(club);
      countParamCounter++;
    }
    
    if (priceMin) {
      countQuery += ` AND ml.price_per_token >= $${countParamCounter}`;
      countParams.push(priceMin);
      countParamCounter++;
    }
    
    if (priceMax) {
      countQuery += ` AND ml.price_per_token <= $${countParamCounter}`;
      countParams.push(priceMax);
      countParamCounter++;
    }
    
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');
    
    // Transformar dados para o formato esperado
    const listings: MarketplaceListing[] = listingsResult.rows.map((row: any) => {
      // Criar NFT metadata
      const nft: NFTWithMetadata = {
        tokenId: row.token_id,
        owner: row.listing_creator,
        metadata: {
          name: row.asset_title || `NFT #${row.token_id}`,
          description: `${row.asset_title || 'NFT'} - ${row.asset_team || 'Unknown Club'}`,
          image: row.asset_image_url || '/placeholder-nft.png',
          attributes: [
            { trait_type: 'Rarity', value: row.asset_rarity || 'Unknown' },
            { trait_type: 'Club', value: row.asset_team || 'Unknown' },
            { trait_type: 'Number', value: row.asset_nft_number?.toString() || row.token_id }
          ]
        },
        assetData: row.asset_id ? {
          id: row.asset_id,
          title: row.asset_title,
          rarity: row.asset_rarity,
          nft_number: row.asset_nft_number,
          image_url: row.asset_image_url
        } : undefined
      };
      
      // Criar listing
      const listing: MarketplaceListing = {
        listingId: row.listing_id,
        tokenId: row.token_id,
        quantity: row.quantity,
        pricePerToken: row.price_per_token,
        priceInCHZ: parseFloat(row.price_per_token).toFixed(3), // Formato para UI
        startTimestamp: row.start_timestamp,
        endTimestamp: row.end_timestamp,
        listingCreator: row.listing_creator,
        assetContract: row.asset_contract,
        currency: row.currency,
        tokenType: row.token_type || TokenType.ERC721,
        status: row.status,
        reserved: row.reserved || false,
        nft
      };
      
      return listing;
    });
    
    return successResponse({
      listings,
      totalCount,
      hasMore: offset + listings.length < totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
    
  } catch (error) {
    console.error('Falha ao buscar listings do marketplace:', error);
    return handleApiError(error);
  }
}

/**
 * Estrutura da tabela marketplace_listings (para referência):
 * 
 * CREATE TABLE IF NOT EXISTS marketplace_listings (
 *   listing_id VARCHAR(66) PRIMARY KEY,
 *   token_id VARCHAR(78) NOT NULL,
 *   quantity VARCHAR(78) NOT NULL DEFAULT '1',
 *   price_per_token VARCHAR(78) NOT NULL,
 *   start_timestamp BIGINT NOT NULL,
 *   end_timestamp BIGINT NOT NULL,
 *   listing_creator VARCHAR(42) NOT NULL,
 *   asset_contract VARCHAR(42) NOT NULL,
 *   currency VARCHAR(42) NOT NULL,
 *   token_type INTEGER NOT NULL DEFAULT 0,
 *   status INTEGER NOT NULL DEFAULT 1,
 *   reserved BOOLEAN DEFAULT FALSE,
 *   transaction_hash VARCHAR(66),
 *   block_number BIGINT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */