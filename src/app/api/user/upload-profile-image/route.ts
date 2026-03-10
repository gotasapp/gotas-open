export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3-upload-utils';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Upload Profile Image - Iniciando processo...');
    
    // Verificar se há arquivo na requisição
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const walletAddress = (formData.get('wallet_address') as string) || '';
    const normalizedWallet = walletAddress.toLowerCase();

    if (!file) {
      console.error('❌ Upload Profile Image - Nenhum arquivo fornecido');
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    if (!walletAddress) {
      console.error('❌ Upload Profile Image - Wallet address não fornecido');
      return NextResponse.json({ error: 'Wallet address é obrigatório' }, { status: 400 });
    }

    console.log(`✅ Upload Profile Image - Dados recebidos: ${file.name} para wallet ${walletAddress}`);

    // Validar tipo de arquivo (com fallback por extensão)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    const nameLower = file.name?.toLowerCase?.() || '';
    const ext = nameLower.split('.').pop() || '';
    let finalContentType = file.type || '';
    const mapByExt: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    if (!allowedTypes.includes(finalContentType)) {
      if (mapByExt[ext]) {
        finalContentType = mapByExt[ext];
      }
    }
    if (!allowedTypes.includes(finalContentType)) {
      console.error(`❌ Upload Profile Image - Tipo de arquivo inválido: ${file.type} (ext: .${ext})`);
      return NextResponse.json({ 
        error: 'Tipo de arquivo não suportado. Use JPEG, JPG, PNG, GIF, SVG ou WEBP.',
        details: 'UNSUPPORTED_TYPE'
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (8MB máximo)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      console.error(`❌ Upload Profile Image - Arquivo muito grande: ${file.size} bytes`);
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo 8MB.',
        details: 'FILE_TOO_LARGE'
      }, { status: 400 });
    }

    console.log(`✅ Upload Profile Image - Arquivo válido: ${file.name} (${file.size} bytes, ${file.type})`);

    // Converter arquivo para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Fazer upload para S3 com path específico do usuário
    console.log('🔄 Upload Profile Image - Iniciando upload para S3...');
    const s3Path = `profile-images/${normalizedWallet}`;
    const imageUrl = await uploadFileToS3(arrayBuffer, file.name, finalContentType, s3Path);
    console.log(`✅ Upload Profile Image - Upload S3 concluído: ${imageUrl}`);

    // Atualizar o banco de dados com a nova URL da imagem
    console.log('🔄 Upload Profile Image - Atualizando banco de dados...');
    const updateResult = await sql`
      UPDATE users 
      SET profile_image_url = ${imageUrl}, updated_at = NOW()
      WHERE LOWER(wallet_address) = LOWER(${normalizedWallet})
      RETURNING id, username, profile_image_url
    `;

    if (updateResult.length === 0) {
      console.error('❌ Upload Profile Image - Usuário não encontrado no banco de dados');
      return NextResponse.json({ 
        error: 'Usuário não encontrado' 
      }, { status: 404 });
    }

    console.log(`✅ Upload Profile Image - Banco de dados atualizado para usuário ${updateResult[0].id}`);

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      user: updateResult[0],
      message: 'Imagem de perfil atualizada com sucesso!'
    });

  } catch (error) {
    console.error('💥 Upload Profile Image - Erro geral:', error);
    
    // Tratamento específico para diferentes tipos de erro
    if (error instanceof Error) {
      // Erros de configuração S3
      if (error.message.includes('STORAGES3_')) {
        return NextResponse.json({ 
          error: 'Erro de configuração do servidor. Tente novamente em alguns minutos.',
          details: 'S3_CONFIG_ERROR'
        }, { status: 500 });
      }
      
      // Erros de conectividade
      if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Problema de conectividade. Tente novamente em alguns segundos.',
          details: 'CONNECTIVITY_ERROR'
        }, { status: 503 });
      }
      
      // Erros de bucket S3
      if (error.message.includes('bucket') || error.message.includes('Nome do bucket')) {
        return NextResponse.json({ 
          error: 'Erro de configuração do armazenamento. Contate o suporte.',
          details: 'BUCKET_ERROR'
        }, { status: 500 });
      }
      
      // Outros erros conhecidos
      return NextResponse.json({ 
        error: error.message || 'Erro interno do servidor',
        details: 'GENERAL_ERROR'
      }, { status: 500 });
    }

    // Erro desconhecido
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 
