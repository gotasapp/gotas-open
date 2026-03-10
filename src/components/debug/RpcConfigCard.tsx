import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Globe } from 'lucide-react';

export function RpcConfigCard() {
  const chilizRpcUrl = process.env.NEXT_PUBLIC_CHILIZ_RPC_URL;
  const fallbackRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const stakingContract = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
  const chainId = process.env.CHAINID;

  const finalRpcUrl = chilizRpcUrl || fallbackRpcUrl || 'https://rpc.chiliz.com';

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configurações RPC
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="space-y-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-purple-600" />
              <span className="font-medium">Chiliz RPC URL:</span>
            </div>
            <div className="text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono break-all">
              {chilizRpcUrl || 'Não configurado'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">Fallback RPC URL:</span>
            <div className="text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono break-all">
              {fallbackRpcUrl || 'Não configurado'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">RPC Final (Usado):</span>
            <div className="text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono break-all">
              {finalRpcUrl}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">Contrato de Staking:</span>
            <div className="text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono break-all">
              {stakingContract || 'Não configurado'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-medium">Chain ID:</span>
            <div className="text-purple-700 bg-purple-100 px-2 py-1 rounded">
              {chainId || 'Não configurado'}
            </div>
          </div>
        </div>

        <div className="mt-3 p-2 bg-purple-100 border border-purple-200 rounded text-xs">
          <p className="font-medium text-purple-800">Status:</p>
          <p className="text-purple-700">
            {chilizRpcUrl ? '✅ Chiliz RPC configurado' : '⚠️ Usando RPC padrão'}
          </p>
          <p className="text-purple-700">
            {stakingContract ? '✅ Contrato configurado' : '❌ Contrato não configurado'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 