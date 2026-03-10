import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Tratar erros de validação Zod
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    return NextResponse.json(
      { 
        error: 'Dados inválidos',
        message: firstError.message,
        field: firstError.path.join('.')
      },
      { status: 400 }
    );
  }
  
  // Tratar erros conhecidos
  if (error instanceof Error) {
    // Em produção, não expor detalhes do erro
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
    
    // Em desenvolvimento, mostrar mensagem do erro
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error.message
      },
      { status: 500 }
    );
  }
  
  // Erro desconhecido
  return NextResponse.json(
    { error: 'Erro desconhecido' },
    { status: 500 }
  );
}

// Função helper para respostas de sucesso
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Função helper para respostas de erro customizadas
export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Função para sanitizar dados sensíveis antes de logar
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
} 