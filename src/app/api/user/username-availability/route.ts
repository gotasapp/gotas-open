import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usernameRaw = searchParams.get('username');
    const wallet = (searchParams.get('wallet') || '').toLowerCase();

    if (!usernameRaw) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const username = usernameRaw.toLowerCase();
    const isValid = /^[a-z0-9]{3,15}$/.test(username);
    if (!isValid) {
      return NextResponse.json({ available: false, valid: false, reason: 'INVALID_FORMAT' });
    }

    // Se wallet foi fornecido, obter ID do usuário para exclusão na verificação
    let currentId: number | null = null;
    if (wallet) {
      const users = await sql`SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(${wallet})`;
      if (users.length > 0) {
        currentId = users[0].id as number;
      }
    }

    const taken = await sql`
      SELECT id FROM users 
      WHERE LOWER(username) = LOWER(${username})
      ${currentId !== null ? sql`AND id <> ${currentId}` : sql``}
      LIMIT 1
    `;

    return NextResponse.json({ available: taken.length === 0, valid: true });
  } catch (error) {
    console.error('Error in GET /api/user/username-availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

