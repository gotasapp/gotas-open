import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Função para criar hash seguro usando Web Crypto API (compatível com Edge Runtime)
async function createSecureHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Por razões de simplicidade, vamos usar uma abordagem simulada de verificação
// Em um sistema real, você usaria autenticação mais robusta
const ADMIN_EMAIL = 'admin@example.com';

export async function middleware(request: NextRequest) {
  // Verificar se a rota começa com /adm
  if (request.nextUrl.pathname.startsWith('/adm') &&
      !request.nextUrl.pathname.startsWith('/adm/login')) {

    // Verificar o cookie de autenticação
    const adminAuthCookie = request.cookies.get('adminAuth')?.value;
    
    // Verificar se temos as credenciais no ENV
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('Problems with admin configuration');
      return NextResponse.redirect(new URL('/adm/login', request.url));
    }
    
    // Verificar se o cookie tem o hash correto das credenciais
    const expectedHash = await createSecureHash(
      `${adminEmail}:${adminPassword}`
    );

    // Redirecionar se não estiver autenticado ou hash incorreto
    if (!adminAuthCookie || adminAuthCookie !== expectedHash) {
      return NextResponse.redirect(new URL('/adm/login', request.url));
    }
  }

  return NextResponse.next();
}

// Configurar quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    // Aplicar apenas para as rotas administrativas, exceto a de login
    '/adm/((?!login).*)',
  ],
};