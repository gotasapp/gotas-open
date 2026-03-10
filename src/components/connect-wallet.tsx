'use client';

import { Button } from "@/components/ui/button";
import {
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
import { User, LogOut, Layers, PlusSquare, Loader2, Wallet, CreditCard } from "lucide-react";
import { UserProfileSidebar } from '@/components/ui/user-profile-sidebar';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { ConnectionChoiceModal } from '@/components/modals/ConnectionChoiceModal';
import { WalletModal } from '@/components/wallet-modal';

// Flag de debug (desativada)
const DEBUG = false;

export function ConnectWalletButton({
  isOpen,
  setIsOpen,
  onOpenEditProfile,
}: {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  onOpenEditProfile?: () => void;
}) {
  // Move useRouter to top level - MUST be before any conditional returns
  const router = useRouter();
  
  // Usar useUnifiedAuth em vez de usePrivy e useUserProfile separadamente
  const { authenticated, ready, user, profile, authProvider, logout } = useUnifiedAuth();
  
  // Manter usePrivy apenas para a função de login do Privy
  const { login } = usePrivy();
  const { wallets } = useWallets();
  
  // Verificar se há embedded wallet ativa
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Use estado externo se fornecido, senão use interno
  const modalOpen = typeof isOpen === 'boolean' ? isOpen : isChoiceModalOpen;
  const setModalOpen = typeof setIsOpen === 'function' ? setIsOpen : setIsChoiceModalOpen;

  // Track when component is mounted to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (DEBUG) {
      console.log('🔄 ConnectWallet - State changed:');
      console.log('  - authenticated:', authenticated);
      console.log('  - authProvider:', authProvider);
      console.log('  - user:', user);
      console.log('  - profile:', profile);
    }
  }, [authenticated, authProvider, user, profile]);

  useEffect(() => {
    if (isSigningIn && authenticated) {
      setIsSigningIn(false);
      setError(null);
      setIsChoiceModalOpen(false);
    }
  }, [authenticated, isSigningIn]);

  // Prevent hydration errors by not rendering until mounted
  if (!isMounted || !ready) {
    return (
      <Button disabled className="min-w-[100px]">
        <span>Carregando...</span>
      </Button>
    );
  }

  const originalPrivyLogin = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      setIsChoiceModalOpen(false);
      await login();
    } catch (err: unknown) {
      let errorMessage = "Falha no login: ";
      const error = err as Error;
      if (error?.message?.includes("403")) {
        errorMessage += "Acesso negado. Verifique se o App ID está correto e ativo no console do Privy.";
      } else if (error?.message?.includes("network") || error?.message?.includes("timeout")) {
        errorMessage += "Erro de conexão. Verifique sua internet.";
      } else if (error?.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Erro desconhecido";
      }
      setError(errorMessage);
      setIsSigningIn(false);
    }
  };
  
  const handleLogoutAndCloseSheet = () => {
    logout();
    setIsSheetOpen(false);
  };

  if (authenticated && user) {
    const userIdentifier = profile?.display_name || profile?.username || user?.id || 'Usuário';
    const profileHref = profile?.username ? `/${profile.username}` : (user?.id ? `/profile/${user.id}` : '/profile');
    // router is now defined at the top level
    return (
      <>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full"
              data-user-profile-trigger="true"
              aria-label="Abrir menu do usuário"
              title="Menu do usuário"
            >
              {profile?.profile_image_url ? (
                <img 
                  src={profile.profile_image_url} 
                  alt={userIdentifier} 
                  className="h-8 w-8 rounded-full object-cover" 
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="p-0 flex flex-col">
            <SheetTitle className="sr-only">Menu do usuário</SheetTitle>
            <div className="p-4">
              <UserProfileSidebar 
                onEditProfile={() => {
                  if (onOpenEditProfile) onOpenEditProfile();
                  setIsSheetOpen(false);
                }}
              />
            </div>
            
            <nav className="flex-grow px-4 space-y-2 mb-4">
              <Link href={profile?.username ? `/${profile.username}` : (user?.id ? `/profile/${user.id}` : '/profile')}  onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <User className="h-5 w-5" /> 
                Meus Cards
              </Link>
              <Link href="/stakes" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <Layers className="h-5 w-5" />
                Stakes
              </Link>
              <Link href="/historico-pix" onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <CreditCard className="h-5 w-5" />
                Histórico PIX
              </Link>
              {authProvider === 'privy' && embeddedWallet && (
                <button 
                  onClick={() => {
                    setIsWalletModalOpen(true);
                    setIsSheetOpen(false);
                  }} 
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors w-full text-left"
                >
                  <Wallet className="h-5 w-5" />
                  Ver Carteira
                </button>
              )}
            </nav>

            <div className="mt-auto p-4 border-t">
              <Button 
                variant="ghost"
                onClick={handleLogoutAndCloseSheet}
                className="w-full flex items-center justify-start gap-3 text-sm font-medium"
              >
                <LogOut className="h-5 w-5" />
                Sair
                {authProvider && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {authProvider === 'socios' ? 'Socios' : 'Privy'}
                  </span>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <WalletModal
          open={isWalletModalOpen}
          onOpenChange={setIsWalletModalOpen}
          wallet={embeddedWallet}
        />
      </>
    );
  }

  return (
    <>
      <Button 
        onClick={() => { setModalOpen(true); setIsSheetOpen(false); }} 
        disabled={isSigningIn} 
        className="min-w-[100px]"
      >
        {isSigningIn ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="sr-only">Carregando</span>
          </>
        ) : (
          <span>Entrar</span>
        )}
      </Button>
      {error && (
        <div className="text-red-500 text-xs mt-2 max-w-xs text-center">
          {error}
        </div>
      )}
      <ConnectionChoiceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onPrivyLogin={originalPrivyLogin}
      />
    </>
  );
}
