import { NextRequest, NextResponse } from 'next/server';
import { makeBrlaRequest } from '@/lib/brla-auth';
import { prepareTokenPurchaseTracking } from '@/lib/server-tracking';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID da ordem é obrigatório' },
        { status: 400 }
      );
    }



    // Usar o endpoint de histórico para verificar o status
    const params = new URLSearchParams({
      page: '1',
      pageSize: '10',
      id: orderId
    });

    const response = await makeBrlaRequest(`/buy/pix-to-token/history?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Erro na API BRLA:', response.status);
      return NextResponse.json({
        orderId: orderId,
        status: 'pending',
        message: 'Erro ao verificar status na API BRLA'
      });
    }

    const data = await response.json();


    // Procurar a transação específica
    const depositsLogs = data.depositsLogs || [];
    const transaction = depositsLogs.find((log: any) => log.id === orderId);

    if (!transaction) {
      return NextResponse.json({
        orderId: orderId,
        status: 'pending',
        message: 'Transação não encontrada no histórico'
      });
    }



    // Mapear status da BRLA para nosso sistema
    const brlaStatus = transaction.status;
    let mappedStatus = 'pending';
    let message = 'Aguardando pagamento PIX';

    // Preparar dados de tracking se o pagamento foi confirmado
    let trackingData = null;
    
    switch (brlaStatus) {
      case 'PAID':
        mappedStatus = 'completed';
        message = 'Pagamento confirmado! Tokens enviados para sua carteira.';
        // Preparar dados de tracking para enviar ao cliente
        trackingData = prepareTokenPurchaseTracking(
          transaction.token,
          transaction.amountBrl,
          transaction.walletAddress
        );
        break;
      case 'PENDING':
        mappedStatus = 'pending';
        message = 'Aguardando pagamento PIX';
        break;
      case 'EXPIRED':
        mappedStatus = 'expired';
        message = 'PIX expirado. Gere um novo código.';
        break;
      case 'CANCELLED':
        mappedStatus = 'cancelled';
        message = 'Pagamento cancelado';
        break;
      default:
        mappedStatus = 'pending';
        message = `Status: ${brlaStatus}`;
    }

    return NextResponse.json({
      orderId: orderId,
      status: mappedStatus,
      message: message,
      brlaStatus: brlaStatus,
      transaction: {
        id: transaction.id,
        token: transaction.token,
        amountBrl: transaction.amountBrl,
        payerName: transaction.payerName,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        due: transaction.due,
        walletAddress: transaction.walletAddress,
        // Incluir informações dos tokens se disponível
        pixToTokenOps: transaction.pixToTokenOps || []
      },
      // Incluir dados de tracking se disponível
      trackingData: trackingData
    });
    
  } catch (error) {
    console.error('Erro no status do pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 