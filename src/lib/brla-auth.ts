interface BrlaAuthToken {
  token: string;
  expiresAt: number;
}

let cachedToken: BrlaAuthToken | null = null;

export async function getBrlaAuthToken(): Promise<string> {
  // Verificar se temos um token válido em cache
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const response = await fetch(`${process.env.BRLA_BASE_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.BRLA_EMAIL,
        password: process.env.BRLA_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no login BRLA:', response.status, errorText);
      throw new Error(`Falha na autenticação BRLA: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const token = data.accessToken || data.token || data.access_token || data.auth_token;
    
    if (!token) {
      throw new Error('Token não encontrado na resposta da autenticação BRLA');
    }

    // Cache do token por 50 minutos (assumindo que expira em 1 hora)
    const expiresAt = Date.now() + (50 * 60 * 1000);
    cachedToken = { token, expiresAt };

    return token;
  } catch (error) {
    console.error('Erro ao obter token BRLA:', error);
    throw error;
  }
}

export async function makeBrlaRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getBrlaAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  return fetch(`${process.env.BRLA_BASE_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
} 