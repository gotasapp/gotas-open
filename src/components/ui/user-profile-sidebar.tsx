import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useWallets } from '@privy-io/react-auth';
import { useWalletStrategy } from '@/hooks/useAuthenticationMethod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserProfileSidebarProps {
  onEditProfile?: () => void;
}

export function UserProfileSidebar({ onEditProfile }: UserProfileSidebarProps) {
  const { authenticated, user, profile, authProvider, loading } = useUnifiedAuth();
  const { wallets } = useWallets();
  const { shouldUseEmbedded, authMethod } = useWalletStrategy();
  const [copied, setCopied] = useState(false);

  if (!authenticated || !user?.wallet?.address) {
    return null;
  }

  // Para Socios, usar diretamente o endereço da wallet
  // Para Privy, usar a estratégia baseada no método de autenticação
  let walletAddress = user.wallet.address;
  
  if (authProvider === 'privy' && wallets.length > 0) {
    let activeWallet;
    if (shouldUseEmbedded) {
      // Priorizar embedded wallet (privy) para email/social login
      activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
    } else {
      // Priorizar external wallet (não privy) para login via carteira externa
      activeWallet = wallets.find(w => w.walletClientType !== 'privy') || wallets[0];
    }
    walletAddress = activeWallet?.address || user.wallet.address;
  }

  const displayName = profile?.display_name || profile?.username || `User${walletAddress.slice(-4)}`;
  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Endereço da carteira copiado!', {
        description: shortAddress,
        duration: 2000
      });
      
      // Reset do ícone após 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar endereço da carteira');
    }
  };

  return (
    <div className="space-y-4">
      {/* User Profile Section */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={profile?.profile_image_url}
            alt={displayName}
          />
          <AvatarFallback className="bg-blue-500 text-white">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">
                {shortAddress}
              </p>
              {authProvider && (
                <p className="text-xs text-gray-400">
                  via {authProvider === 'socios' ? 'Socios.com' : 'Privy'}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyWallet}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                title="Copiar endereço da carteira"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>

              {onEditProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEditProfile}
                  className="h-8 w-8 p-0"
                  title="Configurações do perfil"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 