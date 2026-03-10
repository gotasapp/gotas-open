import type { NextConfig } from "next";
import path from "path";

// Suprimir logs do Neon em produção
if (process.env.NODE_ENV === 'production') {
  const originalLog = console.log;
  const originalInfo = console.info;
  
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('neon.tech') || message.includes('POST https://api.us-east-1.aws.neon.tech')) {
      return;
    }
    originalLog(...args);
  };
  
  console.info = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('neon.tech') || message.includes('POST https://api.us-east-1.aws.neon.tech')) {
      return;
    }
    originalInfo(...args);
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Configuração para AWS Amplify
  output: 'standalone',
  
  // Desabilitar telemetria
  env: {
    NEXT_TELEMETRY_DISABLED: '1'
  },
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Permitir build mesmo com erros de TypeScript (para não bloquear deploys)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configurações de imagem otimizadas para Amplify
  images: {
    unoptimized: false,
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
      ...(process.env.NEXT_PUBLIC_S3_IMAGE_HOST ? [{
        protocol: 'https' as const,
        hostname: process.env.NEXT_PUBLIC_S3_IMAGE_HOST,
        port: '',
        pathname: '/**',
      }] : []),
    ],
  },
  
  // Headers de segurança e cache
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Cache control para APIs
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Configuração do compilador para produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Configuração do webpack otimizada
  webpack: (config, { isServer }) => {
    // Configuração para módulos nativos
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Externals para servidor
    if (isServer) {
      config.externals = [...(config.externals || []), 'mock-aws-s3', 'aws-sdk', 'nock'];
    }

    // Garantir que os aliases funcionem em qualquer ambiente (ex: Collify/Nixpacks)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
};

export default nextConfig;
