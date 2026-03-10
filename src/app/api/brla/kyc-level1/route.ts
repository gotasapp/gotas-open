import { NextRequest, NextResponse } from 'next/server';
import { makeBrlaRequest } from '@/lib/brla-auth';

export async function POST(request: NextRequest) {
  try {
    const { cpf, birthDate, fullName, defaultWallet } = await request.json();

    if (!cpf || !birthDate || !fullName) {
      return NextResponse.json(
        { error: 'CPF, data de nascimento e nome completo são obrigatórios' },
        { status: 400 }
      );
    }

    const response = await makeBrlaRequest('/kyc/pf/level1', {
      method: 'POST',
      body: JSON.stringify({
        cpf,
        birthDate,
        fullName,
        defaultWallet,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no KYC Level 1:', response.status, errorText);
      
      if (response.status === 400 && errorText.includes('user already passed kyc')) {
        return NextResponse.json({
          success: true,
          message: 'Usuário já aprovado no KYC',
          userId: 'existing-user'
        });
      }
      
      return NextResponse.json(
        { error: 'Erro na verificação KYC', details: errorText },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Erro no KYC Level 1:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 