import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const id = searchParams.get('id');

    if (!username && !id) {
      return NextResponse.json({ error: 'Username or ID is required' }, { status: 400 });
    }

    // Find user by username or ID
    const user = username 
      ? await sql`
          SELECT 
            id,
            wallet_address,
            username,
            display_name,
            bio,
            profile_image_url,
            instagram_url,
            youtube_url,
            x_url,
            tiktok_url,
            created_at,
            updated_at
          FROM users 
          WHERE username = ${username}
          LIMIT 1
        `
      : await sql`
          SELECT 
            id,
            wallet_address,
            username,
            display_name,
            bio,
            profile_image_url,
            instagram_url,
            youtube_url,
            x_url,
            tiktok_url,
            created_at,
            updated_at
          FROM users 
          WHERE id = ${id}
          LIMIT 1
        `;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user[0]);
  } catch (error) {
    console.error('Error fetching public user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 