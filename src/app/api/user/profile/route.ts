import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
import { generateRandomUserData, generateUsernameFromWallet, generateDisplayNameFromEmail } from '@/utils/user-generator';

// Função para gerar username único baseado no nome
async function generateUniqueUsername(displayName: string): Promise<string> {
  if (!displayName) {
    // Se não tem display name, gera um username aleatório
    const randomNum = Math.floor(Math.random() * 10000);
    return `user${randomNum}`;
  }

  // Limpa o nome para criar um username válido
  let baseUsername = displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
    .substring(0, 15); // Limita a 15 caracteres

  if (!baseUsername) {
    const randomNum = Math.floor(Math.random() * 10000);
    return `user${randomNum}`;
  }

  // Verifica se o username já existe
  const existingUsers = await sql`
    SELECT username FROM users WHERE username LIKE ${baseUsername + '%'}
  `;

  if (existingUsers.length === 0) {
    return baseUsername;
  }

  // Se existe, adiciona números até encontrar um disponível
  let counter = 1;
  let newUsername = `${baseUsername}${counter}`;
  
  while (existingUsers.some(user => user.username === newUsername)) {
    counter++;
    newUsername = `${baseUsername}${counter}`;
  }

  return newUsername;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Normalizar comparação para evitar problemas de caixa (case-insensitive)
    const users = await sql`
      SELECT * FROM users WHERE LOWER(wallet_address) = LOWER(${walletAddress})
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const body = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Normalizar endereço para caixa baixa para consistência e unicidade
    const normalizedWallet = walletAddress.toLowerCase();

    // Verificar se o usuário existe por wallet ou email
    let existingUser = null;
    
    // Primeiro, verificar por wallet
    const usersByWallet = await sql`
      SELECT * FROM users WHERE LOWER(wallet_address) = LOWER(${normalizedWallet})
    `;
    
    if (usersByWallet.length > 0) {
      existingUser = usersByWallet[0];
    }
    
    // Se não encontrou por wallet mas tem email, verificar por email
    if (!existingUser && body.email) {
      const usersByEmail = await sql`
        SELECT * FROM users WHERE email = ${body.email}
      `;
      
      if (usersByEmail.length > 0) {
        existingUser = usersByEmail[0];
      }
    }

    // Se não existe usuário, criar novo (com upsert para evitar condição de corrida)
    if (!existingUser) {
      // Gerar dados aleatórios se não foram fornecidos
      let displayName = body.display_name;
      let username = null;

      if (!displayName) {
        if (body.email) {
          // Se tem email, gera nome baseado no email
          displayName = generateDisplayNameFromEmail(body.email);
        } else {
          // Se não tem nada, gera dados completamente aleatórios
          const generatedData = generateRandomUserData();
          displayName = generatedData.displayName;
          username = generatedData.username;
        }
      }

      // Se ainda não tem username, gera um
      if (!username) {
        if (displayName) {
          username = await generateUniqueUsername(displayName);
        } else {
          username = generateUsernameFromWallet(walletAddress);
        }
      }

      try {
        // Usar UPSERT para evitar violação de chave única em condições de corrida
        const upserted = await sql`
          INSERT INTO users (
            wallet_address,
            privy_user_id,
            email,
            display_name,
            username,
            auth_provider,
            auth_method
          ) VALUES (
            ${normalizedWallet},
            ${body.privy_user_id || null},
            ${body.email || null},
            ${displayName},
            ${username},
            ${body.auth_provider || 'privy'},
            ${body.auth_method || null}
          )
          ON CONFLICT (wallet_address) DO UPDATE SET
            privy_user_id   = COALESCE(EXCLUDED.privy_user_id, users.privy_user_id),
            email           = COALESCE(EXCLUDED.email, users.email),
            display_name    = COALESCE(users.display_name, EXCLUDED.display_name),
            username        = COALESCE(users.username, EXCLUDED.username),
            auth_provider   = COALESCE(EXCLUDED.auth_provider, users.auth_provider),
            auth_method     = COALESCE(EXCLUDED.auth_method, users.auth_method),
            updated_at      = NOW()
          RETURNING *
        `;

        console.log('User upserted:', {
          wallet: normalizedWallet,
          privy_user_id: body.privy_user_id,
          email: body.email,
        });

        return NextResponse.json(upserted[0]);
      } catch (insertError: any) {
        console.error('Error creating/upserting user:', insertError);
        throw insertError;
      }
    }

    // Se o usuário já existe, atualizar campos conforme necessário
    const user = existingUser;
    
    // Se o usuário existe mas não tem display_name ou username, gera agora
    let needsUpdate = false;
    let displayName = user.display_name;
    let username = user.username;

    if (!displayName) {
      if (body.email || user.email) {
        displayName = generateDisplayNameFromEmail(body.email || user.email);
      } else {
        const generatedData = generateRandomUserData();
        displayName = generatedData.displayName;
        if (!username) {
          username = generatedData.username;
        }
      }
      needsUpdate = true;
    }

    if (!username) {
      if (displayName) {
        username = await generateUniqueUsername(displayName);
      } else {
        username = generateUsernameFromWallet(walletAddress);
      }
      needsUpdate = true;
    }

    // Verificar se o cliente solicitou alteração explícita de username
    const requestedUsernameRaw = body.username as string | undefined;
    if (requestedUsernameRaw && requestedUsernameRaw !== user.username) {
      const requestedUsername = String(requestedUsernameRaw).toLowerCase();
      const isValid = /^[a-z0-9]{3,15}$/.test(requestedUsername);
      if (!isValid) {
        console.warn('PUT /api/user/profile - invalid username attempt', { requestedUsernameRaw });
        return NextResponse.json(
          { error: 'Invalid username. Use 3-15 lowercase letters or numbers only.', code: 'INVALID_USERNAME' },
          { status: 400 }
        );
      }

      // Verificar disponibilidade (excluir o próprio usuário)
      const taken = await sql`
        SELECT id FROM users WHERE LOWER(username) = LOWER(${requestedUsername}) AND id <> ${user.id}
      `;
      if (taken.length > 0) {
        console.warn('PUT /api/user/profile - username taken', { requestedUsername });
        return NextResponse.json(
          { error: 'Nome de usuário indisponível', code: 'USERNAME_TAKEN' },
          { status: 409 }
        );
      }

      console.log('PUT /api/user/profile - updating username', { from: user.username, to: requestedUsername });
      username = requestedUsername;
      needsUpdate = true;
    }

    // Preparar dados para atualização
    const updateData = {
      wallet_address: normalizedWallet, // Sempre salvar normalizado
      privy_user_id: body.privy_user_id !== undefined ? body.privy_user_id : user.privy_user_id,
      email: body.email !== undefined ? body.email : user.email,
      display_name: body.display_name !== undefined ? body.display_name : displayName,
      username: username,
      bio: body.bio !== undefined ? body.bio : user.bio,
      profile_image_url: body.profile_image_url !== undefined ? body.profile_image_url : user.profile_image_url,
      instagram_url: body.instagram_url !== undefined ? body.instagram_url : user.instagram_url,
      youtube_url: body.youtube_url !== undefined ? body.youtube_url : user.youtube_url,
      x_url: body.x_url !== undefined ? body.x_url : user.x_url,
      tiktok_url: body.tiktok_url !== undefined ? body.tiktok_url : user.tiktok_url,
      auth_provider: body.auth_provider !== undefined ? body.auth_provider : (user.auth_provider || 'privy'),
      auth_method: body.auth_method !== undefined ? body.auth_method : user.auth_method,
    };

    // Atualizar usuário
    const updatedUsers = await sql`
      UPDATE users 
      SET 
        wallet_address = ${updateData.wallet_address},
        privy_user_id = ${updateData.privy_user_id},
        email = ${updateData.email},
        display_name = ${updateData.display_name},
        username = ${updateData.username},
        bio = ${updateData.bio},
        profile_image_url = ${updateData.profile_image_url},
        instagram_url = ${updateData.instagram_url},
        youtube_url = ${updateData.youtube_url},
        x_url = ${updateData.x_url},
        tiktok_url = ${updateData.tiktok_url},
        auth_provider = ${updateData.auth_provider},
        auth_method = ${updateData.auth_method},
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING *
    `;

    if (updatedUsers.length === 0) {
      throw new Error('Failed to update user');
    }

    return NextResponse.json(updatedUsers[0]);
  } catch (error: any) {
    console.error('Error in PUT /api/user/profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
} 
