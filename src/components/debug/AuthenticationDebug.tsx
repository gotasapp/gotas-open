'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAuthenticationMethod, useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AuthenticationDebug() {
  const { user, authenticated } = usePrivy();
  const authInfo = useAuthenticationMethod();
  const walletStrategy = useWalletStrategy();

  if (!authenticated || !user) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🔍 Debug de Autenticação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Usuário não autenticado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🔍 Debug de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Método de Autenticação */}
        <div>
          <h3 className="font-semibold mb-2">Método de Autenticação</h3>
          <Badge variant={authInfo.method === 'email' ? 'default' : 
                        authInfo.method === 'social' ? 'secondary' : 
                        authInfo.method === 'external_wallet' ? 'destructive' : 'outline'}>
            {authInfo.method}
          </Badge>
          <p className="text-sm text-gray-600 mt-1">
            Conta primária: {authInfo.primaryAccount || 'Não identificada'}
          </p>
        </div>

        {/* Contas Vinculadas */}
        <div>
          <h3 className="font-semibold mb-2">Contas Vinculadas</h3>
          <div className="flex flex-wrap gap-2">
            {authInfo.linkedAccounts.map((account, index) => (
              <Badge key={index} variant="outline">{account}</Badge>
            ))}
          </div>
        </div>

        {/* Informações da Carteira */}
        <div>
          <h3 className="font-semibold mb-2">Carteira Ativa</h3>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Endereço:</strong> {user.wallet?.address || 'Não disponível'}
            </p>
            <p className="text-sm">
              <strong>Tipo:</strong> {authInfo.walletType || 'Não identificado'}
            </p>
            <div className="flex gap-2">
              <Badge variant={authInfo.isEmbeddedWallet ? 'default' : 'outline'}>
                Embedded: {authInfo.isEmbeddedWallet ? 'Sim' : 'Não'}
              </Badge>
              <Badge variant={authInfo.isExternalWallet ? 'default' : 'outline'}>
                Externa: {authInfo.isExternalWallet ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Estratégia Recomendada */}
        <div>
          <h3 className="font-semibold mb-2">Estratégia de Carteira</h3>
          <Badge variant={authInfo.shouldUseEmbeddedWallet ? 'default' : 'destructive'}>
            {authInfo.shouldUseEmbeddedWallet ? 'Usar Embedded Wallet' : 'Usar External Wallet'}
          </Badge>
          <p className="text-sm text-gray-600 mt-1">
            {authInfo.shouldUseEmbeddedWallet 
              ? 'Operações devem usar a carteira embedded (provider Privy)'
              : 'Operações devem usar a carteira externa (RPC direto)'
            }
          </p>
        </div>

        {/* Detalhes do Usuário Privy */}
        <div>
          <h3 className="font-semibold mb-2">Detalhes do Usuário</h3>
          <div className="text-sm space-y-1">
            <p><strong>ID:</strong> {user.id}</p>
            {user.email?.address && (
              <p><strong>Email:</strong> {user.email.address}</p>
            )}
            {user.phone?.number && (
              <p><strong>Telefone:</strong> {user.phone.number}</p>
            )}
            {user.google?.email && (
              <p><strong>Google:</strong> {user.google.email}</p>
            )}
            {user.twitter?.username && (
              <p><strong>Twitter:</strong> @{user.twitter.username}</p>
            )}
            {user.discord?.username && (
              <p><strong>Discord:</strong> {user.discord.username}</p>
            )}
          </div>
        </div>

        {/* Recomendação */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-800">💡 Recomendação</h3>
          <p className="text-sm text-blue-700">
            {authInfo.method === 'email' || authInfo.method === 'social' 
              ? 'Este usuário se autenticou via email/social login. Todas as operações de carteira devem usar a embedded wallet do Privy.'
              : authInfo.method === 'external_wallet'
              ? 'Este usuário se conectou diretamente com uma carteira externa. Use RPC direto para operações.'
              : 'Método de autenticação não identificado. Verifique a configuração.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 