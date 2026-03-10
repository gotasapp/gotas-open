import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToS3 as s3Upload } from '@/lib/s3-upload-utils';
import { getValidatedEnvConfig } from '@/lib/env-validator';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Validar se as configurações do S3 estão disponíveis
    if (!getValidatedEnvConfig().STORAGES3_BUCKET_NAME || !getValidatedEnvConfig().STORAGES3_REGION) {
      return NextResponse.json(
        { error: 'Serviço de upload não configurado.' },
        { status: 503 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido.' }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    // Validar tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB.' },
        { status: 400 }
      );
    }

    // Sanitizar nome do arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'Extensão de arquivo não permitida.' },
        { status: 400 }
      );
    }
    
    const sanitizedFileName = `upload_${timestamp}.${extension}`;
    const s3Path = formData.get('path') as string || 'nfts/images';

    // Converter o arquivo para ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    const imageUrl = await s3Upload(fileBuffer, sanitizedFileName, file.type, s3Path);
    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error("Erro na API de upload:", error);
    // Não expor detalhes do erro em produção
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Falha no upload da imagem.' 
      : (error instanceof Error ? error.message : 'Erro desconhecido');
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 