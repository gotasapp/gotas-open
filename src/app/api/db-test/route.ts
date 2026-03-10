import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Configuração para evitar o Edge Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test');

    if (testType === 'create-privy-user') {
      // Teste de criação de usuário Privy
      const testWallet = `0x${Math.random().toString(16).substr(2, 40)}`;
      const testEmail = `test${Date.now()}@example.com`;
      const testPrivyId = `did:privy:test${Date.now()}`;
      
      console.log('Testing user creation with:', {
        wallet: testWallet,
        email: testEmail,
        privyId: testPrivyId
      });

      try {
        const newUser = await sql`
          INSERT INTO users (
            wallet_address, 
            privy_user_id, 
            email, 
            display_name, 
            username,
            auth_provider,
            auth_method
          )
          VALUES (
            ${testWallet}, 
            ${testPrivyId}, 
            ${testEmail}, 
            ${'Test User'}, 
            ${'testuser' + Date.now()},
            ${'privy'},
            ${'privy'}
          )
          RETURNING *
        `;

        return NextResponse.json({
          success: true,
          message: 'Test user created successfully',
          user: newUser[0]
        });
      } catch (insertError: any) {
        return NextResponse.json({
          success: false,
          error: insertError.message,
          details: insertError
        }, { status: 500 });
      }
    }

    // Teste padrão de conexão
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    return NextResponse.json({
      success: true,
      database: result[0],
      message: 'Database connection successful'
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}