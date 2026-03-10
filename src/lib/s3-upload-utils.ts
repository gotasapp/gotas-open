import { s3ClientProxy as s3Client, S3_BUCKET_NAME } from "./storage-s3"; // Este caminho deve funcionar pois estarão no mesmo diretório src/lib
import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { getCleanEnv } from './env-validator';

/**
 * Faz upload de um arquivo (como ArrayBuffer) para o S3 e retorna a URL pública.
 * @param fileBuffer O buffer do arquivo a ser enviado.
 * @param originalFileName O nome original do arquivo (para obter a extensão).
 * @param contentType O tipo de conteúdo do arquivo.
 * @param path O caminho/prefixo no S3 onde o arquivo será armazenado.
 * @returns A URL pública do arquivo no S3.
 */
export async function uploadFileToS3(fileBuffer: ArrayBuffer, originalFileName: string, contentType: string, path: string = 'uploads'): Promise<string> {
  if (!fileBuffer) {
    throw new Error("Nenhum buffer de arquivo fornecido para upload.");
  }

  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  };
  let fileExtension = (originalFileName.includes('.') ? originalFileName.split('.').pop() : '') || '';
  if (!fileExtension || fileExtension.length > 5) {
    fileExtension = byType[contentType] || 'bin';
  }
  const fileName = `${path}/${uuidv4()}.${fileExtension}`;

  const params: PutObjectCommandInput = {
    Bucket: S3_BUCKET_NAME,
    Key: fileName,
    Body: Buffer.from(fileBuffer), // Usar Buffer.from para converter ArrayBuffer
    ContentType: contentType,
  };

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 S3 Upload - Tentativa ${attempt}/${maxRetries} para ${fileName}`);
      
      await s3Client.send(new PutObjectCommand(params));
      
      const region = getCleanEnv('STORAGES3_REGION');
      if (!region) throw new Error('S3 region not configured');
      const publicUrl = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
      console.log(`✅ S3 Upload - Sucesso na tentativa ${attempt}: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ S3 Upload - Erro na tentativa ${attempt}:`, lastError.message);
      
      // Se for erro de DNS/conectividade e não for a última tentativa, aguarda antes de tentar novamente
      if (attempt < maxRetries && (
        lastError.message.includes('ENOTFOUND') || 
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('timeout')
      )) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.log(`⏳ S3 Upload - Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Para outros tipos de erro, não tenta novamente
      break;
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error("💥 S3 Upload - Todas as tentativas falharam:", lastError?.message);
  
  // Verificar configurações
  if (!process.env.STORAGES3_BUCKET_NAME) {
    throw new Error("Configuração S3 incompleta: STORAGES3_BUCKET_NAME não definida");
  }
  if (!process.env.STORAGES3_REGION) {
    throw new Error("Configuração S3 incompleta: STORAGES3_REGION não definida");
  }
  
  throw new Error(`Falha no upload para o S3 após ${maxRetries} tentativas: ${lastError?.message || 'Erro desconhecido'}`);
} 
