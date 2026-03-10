import { S3Client } from "@aws-sdk/client-s3";
import { getCleanEnv } from './env-validator';

// Lazy configuration - only validate when S3 is actually used
let s3Client: S3Client | null = null;
let bucketName: string | null = null;

function initializeS3Config() {
  if (s3Client && bucketName) {
    return { s3Client, bucketName };
  }

  // Buscar apenas as variáveis necessárias para S3 (sem validar o restante do app)
  const accessKeyId = getCleanEnv('STORAGES3_ACCESS_KEY_ID');
  const secretAccessKey = getCleanEnv('STORAGES3_SECRET_ACCESS_KEY');
  const region = getCleanEnv('STORAGES3_REGION');
  const bucket = getCleanEnv('STORAGES3_BUCKET_NAME');

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    console.error('❌ S3 Config - Missing S3 environment variables');
    throw new Error('S3 configuration is incomplete. Check STORAGES3_* env vars.');
  }
  
  // Validar formato do bucket name
  const bucketNameRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
  if (!bucketNameRegex.test(bucket)) {
    // SECURITY: Never log actual bucket names or configurations
    console.error("❌ S3 Config - Invalid bucket name format");
    console.error("Bucket names must contain only lowercase letters, numbers and hyphens");
    throw new Error("Invalid S3 bucket name format. Must contain only lowercase letters, numbers and hyphens.");
  }

  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: {
      requestTimeout: 30000, // 30 segundos
      connectionTimeout: 10000, // 10 segundos
    },
    maxAttempts: 3,
  });

  bucketName = bucket;
  
  return { s3Client, bucketName };
}

// Export lazy getters
export function getS3Client(): S3Client {
  const { s3Client } = initializeS3Config();
  return s3Client;
}

export function getS3BucketName(): string {
  const { bucketName } = initializeS3Config();
  return bucketName;
}

// Legacy exports for backward compatibility
export const s3ClientProxy = (() => {
  let cachedClient: S3Client | null = null;
  return new Proxy({} as S3Client, {
    get(target, prop) {
      if (!cachedClient) {
        cachedClient = getS3Client();
      }
      return cachedClient[prop as keyof S3Client];
    }
  });
})();

export const S3_BUCKET_NAME: string = getS3BucketName();
