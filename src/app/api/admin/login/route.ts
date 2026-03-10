import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnvConfig } from '@/lib/env-validator';

// Função para criar hash seguro usando Web Crypto API
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar credenciais
    if (email !== getValidatedEnvConfig().ADMIN_EMAIL || password !== getValidatedEnvConfig().ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Criar hash para o cookie
    const authHash = await createSecureHash(`${email}:${password}`);

    // Criar resposta com cookie
    const response = NextResponse.json(
      { success: true, message: 'Login realizado com sucesso' },
      { status: 200 }
    );

    // Definir cookie httpOnly
    response.cookies.set('adminAuth', authHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
} 