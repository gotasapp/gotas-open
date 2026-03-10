'use client';

import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { Menu, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { UserProfileSidebar } from '@/components/ui/user-profile-sidebar';

export function Header() {
  const [showCollectorsDialog, setShowCollectorsDialog] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const pathname = usePathname();
  const { authenticated, user, profile, fetchProfile, logout } = useUnifiedAuth();

  // useEffect para buscar perfil quando o modal de edição é fechado
  useEffect(() => {
    if (!isEditProfileOpen && authenticated) {
      fetchProfile();
    }
  }, [isEditProfileOpen, authenticated, fetchProfile]);

  const navigationItems = [
    { href: "/mints", label: "Resgates" },
    { href: "/cards", label: "Cards" },
    { href: "/burn", label: "Burn to Earn" },
    // { href: "/marketplace", label: "Marketplace" }, // temporariamente oculto
  ];

  const showMarketplace = false;
  const visibleNavigationItems = navigationItems.filter(
    (item) => (showMarketplace || item.href !== "/marketplace")
  );

  const handleCollectorsClick = () => {
    // Navega para a página de colecionadores
    window.location.href = '/colecionadores';
  };

  // Use state to prevent hydration mismatch - profile data loads after initial render
  const [userInfo, setUserInfo] = useState<{
    displayName: string;
    username: string;
    shortAddress: string;
    profileImage?: string;
  } | null>(null);

  // Update userInfo when auth or profile changes (client-side only)
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) {
      setUserInfo(null);
      return;
    }

    const walletAddress = user.wallet.address;
    const displayName = profile?.display_name || profile?.username || `User${walletAddress.slice(-4)}`;
    const username = profile?.username || `user${walletAddress.slice(-4)}`;
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

    setUserInfo({
      displayName,
      username,
      shortAddress,
      profileImage: profile?.profile_image_url
    });
  }, [authenticated, user?.wallet?.address, profile]);

  // Removido o fallback que alterava a página atual; usamos apenas target="_blank"

  return (
    <>
      <header className="sticky top-0 z-50 w-full flex items-center justify-between py-4 px-4 md:py-6 md:px-8 border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Menu hambúrguer - visível apenas no mobile */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[350px]">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <div className="flex flex-col space-y-4 mt-8">
                <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity" onClick={() => setIsSheetOpen(false)}>
                  <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
                  <span className="font-bold text-xl tracking-tight">cards</span>
                </Link>

                {/* Informações do usuário - apenas no mobile */}
                {userInfo && (
                  <button
                    type="button"
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-4 w-full text-left hover:bg-gray-100 transition-colors"
                    onClick={() => setIsUserMenuOpen(true)}
                    aria-label="Abrir menu do usuário"
                  >
                    <div className="flex-shrink-0">
                      {userInfo.profileImage ? (
                        <img
                          src={userInfo.profileImage}
                          alt={userInfo.displayName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userInfo.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        @{userInfo.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {userInfo.shortAddress}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                )}

                <nav className="flex flex-col space-y-4">
                  {visibleNavigationItems.map((item) => {
                    const isBurnToEarn = item.href === '/burn';
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`text-lg hover:text-black transition-colors flex items-center gap-2 ${isActive ? 'font-bold text-[#8B1A1A]' : isBurnToEarn ? 'font-medium text-[#8B1A1A]' : 'font-medium text-neutral-500'
                          }`}
                        onClick={() => setIsSheetOpen(false)}
                      >
                        {item.label}
                        {isBurnToEarn && (
                          <span className="text-[10px] font-bold uppercase bg-[#8B1A1A] text-white px-1.5 py-0.5 rounded">
                            NOVO
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  <Link
                    href={'/colecionadores'}
                    className={`text-lg hover:text-black transition-colors ${pathname === '/colecionadores' ? 'font-bold text-black' : 'font-medium text-neutral-500'
                      }`}
                    onClick={() => setIsSheetOpen(false)}
                  >
                    Colecionadores
                  </Link>
                </nav>

                {/* Botão de conectar wallet apenas se não estiver autenticado */}
                {!authenticated && (
                  <div className="pt-4 border-t">
                    <Button className="w-full" onClick={() => { setIsSheetOpen(false); setIsConnectModalOpen(true); }}>
                      Entrar
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <span className="font-bold text-xl tracking-tight">cards</span>
          </Link>

          {/* Navegação desktop - oculta no mobile */}
          <nav className="hidden md:flex gap-2">
            {visibleNavigationItems.map((item) => {
              const isBurnToEarn = item.href === '/burn';
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${isActive
                      ? isBurnToEarn
                        ? 'bg-[#8B1A1A] text-white hover:bg-[#6B1414]'
                        : 'bg-black text-white hover:bg-gray-800'
                      : isBurnToEarn
                        ? 'text-[#8B1A1A] hover:text-[#6B1414] hover:bg-red-50'
                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }`}
                >
                  {item.label}
                  {isBurnToEarn && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-[#8B1A1A] text-white'}`}>
                      NOVO
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              href={'/colecionadores'}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${pathname === '/colecionadores'
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
            >
              Colecionadores
            </Link>
          </nav>
        </div>

        {/* Botão de conectar wallet - oculto no mobile (fica no menu lateral) */}
        <div className="hidden md:block">
          <ConnectWalletButton
            isOpen={isConnectModalOpen}
            setIsOpen={setIsConnectModalOpen}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
          />
        </div>
      </header>

      <AlertDialog open={showCollectorsDialog} onOpenChange={setShowCollectorsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ranking dos Colecionadores</AlertDialogTitle>
            <AlertDialogDescription>
              O ranking dos colecionadores estará disponível em breve. Fique atento às próximas atualizações!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCollectorsDialog(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Edição de Perfil agora renderizado aqui */}
      {authenticated && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}

      {/* Menu do Usuário (abre do lado direito no mobile) */}
      {authenticated && (
        <Sheet open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
          <SheetContent side="right" className="p-0 flex flex-col w-[85vw] max-w-sm">
            <SheetTitle className="sr-only">Menu do usuário</SheetTitle>
            <div className="p-4">
              <UserProfileSidebar
                onEditProfile={() => {
                  setIsEditProfileOpen(true);
                  setIsUserMenuOpen(false);
                }}
              />
            </div>
            <nav className="flex-grow px-4 space-y-2 mb-4">
              <Link href={profile?.username ? `/${profile.username}` : (user?.id ? `/profile/${user.id}` : '/profile')} onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <User className="h-5 w-5" />
                Meus Cards
              </Link>
              <Link href="/stakes" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <span className="h-5 w-5 inline-flex items-center justify-center">⛓️</span>
                Stakes
              </Link>
              <Link href="/historico-pix" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 p-2 hover:bg-muted rounded-md text-sm font-medium transition-colors">
                <span className="h-5 w-5 inline-flex items-center justify-center">💳</span>
                Histórico PIX
              </Link>
            </nav>
            <div className="mt-auto p-4 border-t">
              <Button
                variant="ghost"
                onClick={() => { logout(); setIsUserMenuOpen(false); }}
                className="w-full flex items-center justify-start gap-3 text-sm font-medium"
              >
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Barra de Navegação Inferior Mobile */}
      <MobileBottomNavigation
        authenticated={authenticated}
        user={user}
        profile={profile}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
      />
    </>
  );
} 
