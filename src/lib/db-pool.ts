import { Pool } from 'pg';
import { getValidatedEnvConfig } from './env-validator';

// Lazy pool configuration - only validated when pool is created
function getPoolConfig() {
  const envConfig = getValidatedEnvConfig();
  return {
    connectionString: envConfig.DATABASE_URL,
    // Configurações para serverless
    max: 1, // Mínimo de conexões para evitar sobrecarga
    idleTimeoutMillis: 10000, // 10 segundos
    connectionTimeoutMillis: 15000, // 15 segundos (aumentado para conexões Neon)
    // Evitar criar muitas conexões em ambiente serverless
    allowExitOnIdle: true,
  };
}

// Criar pool singleton
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const poolConfig = getPoolConfig();
    pool = new Pool(poolConfig);
    
    // Log de erro de conexão
    pool.on('error', (err) => {
      console.error('Erro inesperado no pool de conexões:', err);
    });
  }
  
  return pool;
}

// Função helper para executar queries
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const pool = getPool();
  const start = Date.now();
  let client;

  try {
    // Acquire a client from the pool
    client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    // Log apenas queries lentas em desenvolvimento
    if (process.env.NODE_ENV !== 'production' && duration > 1000) {
      console.log('Query lenta detectada:', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Erro na query:', error);
    console.error('Query que falhou:', { text: text.substring(0, 100), duration });
    throw error;
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

// Função para fechar o pool (útil para testes)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
} 