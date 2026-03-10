import { NextRequest, NextResponse } from 'next/server';
import { makeBrlaRequest } from '@/lib/brla-auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '50';

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Endereço da carteira é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar CPF do usuário no banco de dados
    const kycData = await sql`
      SELECT cpf, full_name, wallet_address 
      FROM kyc_data 
      WHERE LOWER(wallet_address) = LOWER(${walletAddress})
      LIMIT 1
    `;

    if (kycData.length === 0) {
      return NextResponse.json({
        error: 'Usuário não encontrado ou KYC não realizado',
        depositsLogs: [],
        totalCount: 0,
        userInfo: null
      });
    }

    const userCpf = kycData[0].cpf;
    const userName = kycData[0].full_name;

    // Buscar todas as carteiras associadas ao mesmo CPF
    const allWallets = await sql`
      SELECT wallet_address, full_name 
      FROM kyc_data 
      WHERE cpf = ${userCpf}
      ORDER BY created_at DESC
    `;

    // Buscar histórico de transações PIX na BRLA usando o CPF
    const params = new URLSearchParams({
      page,
      pageSize,
      taxId: userCpf
    });

    const response = await makeBrlaRequest(`/buy/pix-to-token/history?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Erro na API BRLA:', response.status);
      return NextResponse.json({
        error: 'Erro ao buscar histórico na API BRLA',
        depositsLogs: [],
        totalCount: 0,
        userInfo: {
          cpf: userCpf,
          name: userName,
          wallets: allWallets
        }
      });
    }

    const data = await response.json();
    
    // Processar dados das transações
    let depositsLogs = data.depositsLogs || [];

    // Ordenar por data de criação (mais recente primeiro)
    depositsLogs.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      depositsLogs,
      totalCount: depositsLogs.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      userInfo: {
        cpf: userCpf,
        name: userName,
        wallets: allWallets,
        currentWallet: walletAddress
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        depositsLogs: [],
        totalCount: 0,
        userInfo: null
      },
      { status: 500 }
    );
  }
} 