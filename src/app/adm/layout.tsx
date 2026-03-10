'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Home, Users, Image, TrendingUp, LogOut, Coins, Tag, Zap, Flame, Settings } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Se o caminho for /adm/login, não renderizar o layout administrativo
  if (pathname === '/adm/login') {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/adm', icon: Home },
    { name: 'NFTs', href: '/adm/nfts', icon: Image },
    // { name: 'Categorias', href: '/adm/categories', icon: Tag },
    { name: 'Mints', href: '/adm/mints', icon: Zap },
    { name: 'Tokens de Stake', href: '/adm/staking-tokens', icon: Coins },
    { name: 'Configurações Burn', href: '/adm/burn-settings', icon: Settings },
    { name: 'Usuários', href: '/adm/users', icon: Users },
    { name: 'Estatísticas', href: '/adm/statistics', icon: TrendingUp },
  ];

  // Verificar se o link está ativo
  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Função para fazer logout
  const handleLogout = () => {
    // Limpar o cookie de autenticação
    // Usando o mesmo nome de cookie que definimos no login
    document.cookie = "adminAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/adm/login');
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <Link href="/adm/home" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Admin</span>
            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-md">Painel</span>
          </Link>
          <button
            className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-6 px-3 space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100 ${
                  active ? 'bg-gray-100 text-blue-600 font-medium' : 'text-gray-700'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-6">
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5 text-gray-400" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-0">
        {/* Top navbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <button
            className="lg:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-4 w-4 text-gray-500" />
            </div>
            <span className="text-sm font-medium">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}