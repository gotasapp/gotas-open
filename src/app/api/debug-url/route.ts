import { NextRequest, NextResponse } from 'next/server';
import { getCleanEnv, validateThirdwebConfig } from '@/lib/env-validator';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Verificar se é ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disponível apenas em desenvolvimento' }, { status: 403 });
  }
  
  const thirdwebValidation = validateThirdwebConfig();
  
  // Obter valores brutos e limpos para comparação
  const rawValues = {
    THIRDWEB_ENGINE_URL: process.env.THIRDWEB_ENGINE_URL,
    THIRDWEB_CHAIN_ID: process.env.THIRDWEB_CHAIN_ID,
    THIRDWEB_NFT_CONTRACT_ADDRESS: process.env.THIRDWEB_NFT_CONTRACT_ADDRESS,
  };
  
  const cleanValues = {
    THIRDWEB_ENGINE_URL: getCleanEnv('THIRDWEB_ENGINE_URL'),
    THIRDWEB_CHAIN_ID: getCleanEnv('THIRDWEB_CHAIN_ID'),
    THIRDWEB_NFT_CONTRACT_ADDRESS: getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS'),
  };
  
  // Construir URLs como seria feito no código real
  const rawUrl = `${process.env.THIRDWEB_ENGINE_URL}/contract/${process.env.THIRDWEB_CHAIN_ID}/${process.env.THIRDWEB_NFT_CONTRACT_ADDRESS}/write`;
  const cleanUrl = `${getCleanEnv('THIRDWEB_ENGINE_URL')}/contract/${getCleanEnv('THIRDWEB_CHAIN_ID')}/${getCleanEnv('THIRDWEB_NFT_CONTRACT_ADDRESS')}/write`;
  
  // Testar se a URL é válida
  let rawUrlValid = false;
  let cleanUrlValid = false;
  
  try {
    new URL(rawUrl);
    rawUrlValid = true;
  } catch (e) {
    // URL inválida
  }
  
  try {
    new URL(cleanUrl);
    cleanUrlValid = true;
  } catch (e) {
    // URL inválida
  }
  
  return NextResponse.json({
    thirdwebConfig: {
      isValid: thirdwebValidation.isValid,
      configured: thirdwebValidation.configured,
      missing: thirdwebValidation.missing
    },
    rawValues,
    cleanValues,
    urls: {
      raw: {
        url: rawUrl,
        isValid: rawUrlValid
      },
      clean: {
        url: cleanUrl,
        isValid: cleanUrlValid
      }
    },
    recommendation: !cleanUrlValid ? 'As variáveis de ambiente contêm aspas. Remova as aspas das variáveis no servidor.' : 'Configuração OK'
  });
} 