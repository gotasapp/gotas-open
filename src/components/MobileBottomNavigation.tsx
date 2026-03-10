'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletCards, Layers, User as UserIcon, Droplets, Trophy } from 'lucide-react';
import { UnifiedAuthState } from '@/hooks/useUnifiedAuth';
import { UserProfile } from '@/hooks/useUserProfile';

interface MobileBottomNavigationProps {
  onOpenEditProfile: () => void;
  authenticated: boolean;
  user: UnifiedAuthState['user'];
  profile: UserProfile | null;
  onOpenConnectModal: () => void;
}

export function MobileBottomNavigation({ 
  onOpenEditProfile, 
  authenticated, 
  user, 
  profile, 
  onOpenConnectModal 
}: MobileBottomNavigationProps) {
  const pathname = usePathname();

  if (!authenticated) {
    // Mesmo deslogado, a barra aparece, mas os links protegidos pedirão login
  }

  // Use static href for hydration consistency, handle dynamic routing in onClick
  const navItems = [
    { href: '/mints', label: 'Resgate', icon: Droplets, requiresAuth: false },
    { href: '/cards', label: 'Cards', icon: WalletCards, requiresAuth: false },
    // Ranking deve abrir a mesma rota do header (Colecionadores)
    { href: '/colecionadores', label: 'Ranking', icon: Trophy, requiresAuth: false },
    { href: '/profile', label: 'Perfil', icon: UserIcon, requiresAuth: true },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/60 backdrop-blur-md supports-[backdrop-filter]:bg-black/40 p-2 md:hidden">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const currentPath = pathname || "";
          const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
          
          const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
            if (item.requiresAuth && !authenticated) {
              event.preventDefault();
              onOpenConnectModal();
              return;
            }

            // Handle dynamic profile routing client-side only
            if (item.href === '/profile' && authenticated) {
              event.preventDefault();
              const profileUrl = profile?.username
                ? `/${profile.username}`
                : user?.id
                  ? `/profile/${user.id}`
                  : '/profile';
              window.location.href = profileUrl;
            }
          };

          // Use consistent href for hydration - always use the actual href
          // Handle authentication requirement through onClick only
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-md transition-colors flex-1 w-full ${
                isActive ? 'text-white' : 'text-white/70'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
              <span className={`text-[11px] leading-none font-medium max-w-[72px] truncate text-center ${
                isActive ? 'text-white' : 'text-white/70'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 
