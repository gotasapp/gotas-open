// Validador de variáveis de ambiente para AWS Amplify
export interface EnvConfig {
  // Variáveis públicas (NEXT_PUBLIC_*)
  NEXT_PUBLIC_PRIVY_APP_ID: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string;
  NEXT_PUBLIC_CHILIZ_RPC_URL: string;
  NEXT_PUBLIC_STAKING_CONTRACT: string;

  
  // Variáveis privadas
  DATABASE_URL: string;
  CHAINID: string;
  
  // BRLA API
  BRLA_BASE_API_URL: string;
  BRLA_EMAIL: string;
  BRLA_PASSWORD: string;

  
  // AWS S3
  STORAGES3_ACCESS_KEY_ID: string;
  STORAGES3_SECRET_ACCESS_KEY: string;
  STORAGES3_REGION: string;
  STORAGES3_BUCKET_NAME: string;
  
  // Admin
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  
  // Thirdweb Engine (opcional)
  THIRDWEB_ENGINE_URL?: string;
  THIRDWEB_ENGINE_ACCESS_TOKEN?: string;
  THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS?: string;
  THIRDWEB_NFT_CONTRACT_ADDRESS?: string;
  THIRDWEB_CHAIN_ID?: string;
  THIRDWEB_CLIENT_ID?: string;
  
  // Marketplace (opcional)
  NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS?: string;
}

// Lista de variáveis obrigatórias
const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_CHILIZ_RPC_URL',
  'NEXT_PUBLIC_STAKING_CONTRACT',

  'DATABASE_URL',
  'CHAINID',
  'BRLA_BASE_API_URL',
  'BRLA_EMAIL',
  'BRLA_PASSWORD',

  'STORAGES3_ACCESS_KEY_ID',
  'STORAGES3_SECRET_ACCESS_KEY',
  'STORAGES3_REGION',
  'STORAGES3_BUCKET_NAME',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

// Função para validar variáveis de ambiente
export function validateEnvVars(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Função para obter configuração validada
export function getEnvConfig(): EnvConfig {
  const validation = validateEnvVars();
  
  if (!validation.isValid) {
    // SECURITY: Never log environment variable names or values in production
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Missing required environment variables. Check your .env configuration.');
    }
    
    // Em produção, lançar erro genérico para evitar exposição de informações sensíveis
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Problems with environment variables configuration');
    } else {
      throw new Error('Missing required environment variables. Check your .env configuration.');
    }
  }
  
  return process.env as unknown as EnvConfig;
}

// Lazy configuration getter - only validate when explicitly needed
let _envConfig: EnvConfig | null = null;
export function getValidatedEnvConfig(): EnvConfig {
  if (!_envConfig) {
    _envConfig = getEnvConfig();
  }
  return _envConfig;
}

/**
 * Remove aspas duplas e barras escapadas das variáveis de ambiente
 * Isso previne problemas quando as variáveis são definidas com aspas no ambiente
 */
export function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return value;
  
  // Remove aspas duplas escapadas e aspas duplas normais do início e fim
  return value
    .replace(/^\\"/, '') // Remove \" do início
    .replace(/\\"$/, '') // Remove \" do fim
    .replace(/^"/, '')   // Remove " do início
    .replace(/"$/, '');  // Remove " do fim
}

/**
 * Obter valor limpo de uma variável de ambiente
 */
export function getCleanEnv(key: string): string | undefined {
  return cleanEnvValue(process.env[key]);
}

/**
 * Valida se as variáveis do Thirdweb Engine estão configuradas
 * Retorna true se todas estão presentes ou se nenhuma está presente
 * Retorna false se apenas algumas estão configuradas (configuração parcial)
 */
export function validateThirdwebConfig(): { isValid: boolean; missing?: string[]; configured: boolean } {
  const thirdwebVars = [
    'THIRDWEB_ENGINE_URL',
    'THIRDWEB_ENGINE_ACCESS_TOKEN',
    'THIRDWEB_ENGINE_BACKEND_WALLET_ADDRESS',
    'THIRDWEB_NFT_CONTRACT_ADDRESS',
    'THIRDWEB_CHAIN_ID',
    'THIRDWEB_CLIENT_ID'
  ];
  
  const presentVars = thirdwebVars.filter(varName => getCleanEnv(varName));
  
  // Se nenhuma variável está configurada, é válido (feature desabilitada)
  if (presentVars.length === 0) {
    return { isValid: true, configured: false };
  }
  
  // Se todas estão configuradas, é válido
  if (presentVars.length === thirdwebVars.length) {
    return { isValid: true, configured: true };
  }
  
  // Configuração parcial é inválida
  const missing = thirdwebVars.filter(varName => !getCleanEnv(varName));
  return { isValid: false, missing, configured: false };
}

/**
 * Valida se as variáveis do Marketplace estão configuradas
 * Retorna true se a variável está presente ou se não está presente (opcional)
 */
export function validateMarketplaceConfig(): { isValid: boolean; missing?: string[]; configured: boolean } {
  const marketplaceAddress = getCleanEnv('NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS');
  
  // Se a variável está configurada, é válido
  if (marketplaceAddress) {
    return { isValid: true, configured: true };
  }
  
  // Se não está configurada, também é válido (feature desabilitada)
  return { isValid: true, configured: false };
}

/**
 * Obter endereço do contrato marketplace limpo
 * SECURITY: Safe for client-side use - no sensitive data logged
 * CLIENT-SAFE: Does not trigger server-side environment validation
 */
export function getMarketplaceContractAddress(): string | undefined {
  // CLIENT-SAFE: Direct access to NEXT_PUBLIC_ variables without validation
  // These are safe to access on client-side and don't require server validation
  if (typeof window !== 'undefined') {
    // Client-side: directly access the public environment variable
    return process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;
  }
  
  // Server-side: use the cleaned value
  const address = getCleanEnv('NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS');
  return address;
} 