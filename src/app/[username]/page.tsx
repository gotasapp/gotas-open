'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import NFTDetailModal from '@/components/modals/NFTDetailModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { NFTsTab } from '@/components/profile/NFTsTab';
import { Asset } from '@/lib/types';
import { Instagram, Youtube, Globe, MoreHorizontal, Wallet, Edit, Copy, Layers, X, Search } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageSwiper } from '@/components/ui/image-swiper';
import { MarketplaceDebugPanel, useMarketplaceDebug } from '@/components/debug/MarketplaceDebugPanel';
// Removed team icons beside categories per requirements
import { getCategories } from '@/lib/actions/category-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { Chart, BarChart, PieChart as CustomPieChart } from '@/components/ui/chart';

// Ícone do TikTok customizado
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.76 20.5a6.34 6.34 0 0 0 10.86-4.43V7.83a8.2 8.2 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.8-.26z"/>
  </svg>
);

// Ícone do X (Twitter) customizado
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z"/>
  </svg>
);

interface UserProfile {
  id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  x_url?: string;
  tiktok_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface UserClaimedAsset {
  id: number;
  claimId?: string;
  userAssetClaimId?: string;
  burnedAt?: string | null;
  isBurned?: boolean;
  title: string;
  description: string;
  imageUrl: string;
  claimed: boolean;
  nftId: number;
  createdAt: string;
  updatedAt: string;
  nftName: string;
  category: string;
  rarity: string;
  nftMainImageUrl: string;
  categoryName: string;
  categoryImageUrl: string;
  claimedBy: {
    username: string;
    displayName: string;
    walletAddress: string;
    privyUserId: string;
    profileImageUrl?: string;
  };
  claimedAt: string;
  blockchainTokenId?: string | null;
}

const BadgeRarity = ({ rarity, className = '' }: { rarity: string | null | undefined, className?: string }) => {
  if (!rarity) return null;
  const rarityInfo = getRarityDetails(rarity);
  const Icon = rarityInfo.icon;

  return (
    <Badge className={`${rarityInfo.className} border-0 text-xs px-2 py-1 rounded-full ${className}`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {rarityInfo.label}
    </Badge>
  );
};

export default function PublicProfilePage() {
  // Toggle for enabling the NFTs tab (hidden for now)
  const ENABLE_NFTS_TAB = false;
  const params = useParams();
  const username = params?.username as string;
  const { user, authenticated } = usePrivy();
  const { profile: userProfile, fetchProfile } = useUserProfile();
  const router = useRouter();
  const { showDebug } = useMarketplaceDebug();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userClaimedAssets, setUserClaimedAssets] = useState<UserClaimedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  type CardCounts = {
    total: number;
    categories: Record<string, number>;
    rarities?: Record<string, number>;
    categoryRarity?: Record<string, Record<string, number>>;
  };
  const [cardCounts, setCardCounts] = useState<CardCounts | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [isSwiperOpen, setIsSwiperOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'collection' | 'nfts'>('collection');
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const normalizeKey = (s?: string | null) => (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const normalizeText = (s?: string | null) => (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  // Team tabs + rarity filter
  const searchParams = useSearchParams();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<'all' | 'common' | 'epic' | 'legendary'>('all');
  const teamsScrollRef = useRef<HTMLDivElement>(null);
  const teamItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeAssets = useMemo(
    () => userClaimedAssets.filter(asset => !asset.burnedAt),
    [userClaimedAssets]
  );

  const burnedAssets = useMemo(
    () => userClaimedAssets.filter(asset => !!asset.burnedAt),
    [userClaimedAssets]
  );

  // Prefer logged-in profile image for own profile to avoid stale public data
  const resolvedProfileImageUrl = isOwnProfile 
    ? (userProfile?.profile_image_url || profile?.profile_image_url)
    : profile?.profile_image_url;

  const handleUsernameChange = (newUsername: string) => {
    router.push(`/${newUsername}`);
  };

  const handleProfileUpdate = async () => {
    // Recarregar o perfil após mudanças
    await fetchUserProfile();
  };

  // Derive available teams from user's claimed assets with count from database
  const availableTeams = useMemo(() => {
    const set = new Map<string, { id: string; label: string; icon?: string; count: number }>();
    
    // Build the teams list from loaded assets to get the labels and icons
    activeAssets.forEach(a => {
      // Only process if categoryName exists and is not empty
      if (a.categoryName && a.categoryName.trim()) {
        const id = a.categoryName.toLowerCase();
        const label = a.categoryName;
        
        if (!set.has(id)) {
          set.set(id, { id, label, icon: a.categoryImageUrl || undefined, count: 0 });
        }
      }
    });
    
    // Use database counts if available
    if (cardCounts) {
      // Update counts from database using normalized keys (ignore $ and accents)
      const entries = Object.entries(cardCounts.categories || {});
      set.forEach((value, key) => {
        const normKey = normalizeKey(key.replace(/^$/,''));
        let matched = 0;
        for (const [catKey, cnt] of entries) {
          const normCat = normalizeKey(catKey);
          if (normCat === normKey) { matched = cnt; break; }
        }
        value.count = matched;
      });
    } else {
      // Fallback to counting from loaded assets (for initial load)
      const countMap = new Map<string, number>();
      activeAssets.forEach(a => {
        if (a.categoryName && a.categoryName.trim()) {
          const id = a.categoryName.toLowerCase();
          countMap.set(id, (countMap.get(id) || 0) + 1);
        }
      });
      set.forEach((value, key) => {
        value.count = countMap.get(key) || 0;
      });
    }
    
    const arr = Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label));
    // Geral always shows total count from database or fallback to loaded count
    return [{ id: 'all', label: 'Geral', count: totalCount }, ...arr];
  }, [activeAssets, cardCounts]);

  // Sync from URL
  useEffect(() => {
    const t = (searchParams?.get('team') || 'all').toLowerCase();
    const r = (searchParams?.get('rarity') || 'all').toLowerCase() as 'all' | 'common' | 'epic' | 'legendary';
    setSelectedTeam(t);
    setSelectedRarity(['all','common','epic','legendary'].includes(r) ? r : 'all');
  }, [searchParams]);

  const pushTeamRarity = (team: string, rarity: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (team && team !== 'all') params.set('team', team); else params.delete('team');
    if (rarity && rarity !== 'all') params.set('rarity', rarity); else params.delete('rarity');
    router.push(`/${username}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Auto-scroll team tabs
  useEffect(() => {
    const el = teamItemRefs.current[selectedTeam];
    if (el && teamsScrollRef.current) {
      try { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
      catch {
        const parent = teamsScrollRef.current;
        const left = el.offsetLeft - parent.clientWidth / 2 + el.clientWidth / 2;
        parent.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    }
  }, [selectedTeam, availableTeams.length]);

  // Filter assets
  const displayedAssets = useMemo(() => {
    let list = [...activeAssets];
    if (selectedTeam !== 'all') list = list.filter(a => (a.categoryName || '').toLowerCase() === selectedTeam);
    if (selectedRarity !== 'all') list = list.filter(a => (a.rarity || '').toString().toLowerCase() === selectedRarity);
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      list = list.filter(a => {
        const t = normalizeText(a.title);
        const d = normalizeText(a.description);
        return t.includes(q) || d.includes(q);
      });
    }
    return list;
  }, [activeAssets, selectedTeam, selectedRarity, searchQuery]);

  const copyWalletAddress = async () => {
    if (!profile?.wallet_address) return;
    
    try {
      await navigator.clipboard.writeText(profile.wallet_address);
      toast.success('Endereço da carteira copiado!');
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
      toast.error('Erro ao copiar endereço da carteira');
    }
  };

  const convertToAsset = (userAsset: UserClaimedAsset): Asset => {
    return {
      id: userAsset.claimId || userAsset.id.toString(),
      claimId: userAsset.claimId,
      title: userAsset.title,
      description: userAsset.description,
      imageUrl: userAsset.imageUrl,
      claimed: userAsset.claimed,
      nftId: userAsset.nftId,
      createdAt: userAsset.createdAt,
      updatedAt: userAsset.updatedAt,
      nftName: userAsset.nftName,
      category: userAsset.category,
      rarity: userAsset.rarity,
      nftMainImageUrl: userAsset.nftMainImageUrl,
      categoryName: userAsset.categoryName,
      categoryImageUrl: userAsset.categoryImageUrl,
      claimedBy: {
        username: userAsset.claimedBy.username,
        displayName: userAsset.claimedBy.displayName,
        walletAddress: userAsset.claimedBy.walletAddress,
        privyUserId: userAsset.claimedBy.privyUserId,
        profileImageUrl: userAsset.claimedBy.profileImageUrl,
      },
      claimedAt: userAsset.claimedAt,
    };
  };

  const handleAssetClick = (userAsset: UserClaimedAsset) => {
    const asset = convertToAsset(userAsset);
    setSelectedAsset(asset);
    setIsNFTModalOpen(true);
  };

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username, authenticated, user?.wallet?.address]);

  // Load categories once to map category name -> image
  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        const map: Record<string, string> = {};
        cats.forEach(c => { 
          if (c.imageUrl) {
            const nameKey = normalizeKey(c.name);
            if (nameKey) map[nameKey] = c.imageUrl;
            const symbolKey = normalizeKey(c.symbol || '');
            if (symbolKey) map[symbolKey] = c.imageUrl;
          }
        });
        setCategoriesMap(map);
      } catch (e) {}
    })();
  }, []);

  // Fetch card counts from database
  useEffect(() => {
    const fetchCardCounts = async () => {
      if (!profile?.wallet_address) return;
      
      try {
        const response = await fetch(`/api/user/cards-count?wallet=${encodeURIComponent(profile.wallet_address)}`);
        if (response.ok) {
          const data = await response.json();
          setCardCounts(data.data || data);
        }
      } catch (error) {
        console.error('Error fetching card counts:', error);
      }
    };

    fetchCardCounts();
  }, [profile?.wallet_address]);

  // Resolve a category key from API (which may not include '$' or accents)
  const resolveTeamId = (key: string) => {
    if (!key || key === 'all') return 'all';
    const normKey = normalizeKey(key);
    for (const t of availableTeams) {
      const normId = normalizeKey(t.id);
      const normLabel = normalizeKey(t.label);
      if (normId === normKey || normLabel === normKey) return t.id;
      if (normId === normalizeKey('$' + key) || normLabel === normalizeKey('$' + key)) return t.id;
    }
    return 'all';
  };

  const applyStatsFilter = (team: string, rarity: 'all' | 'common' | 'epic' | 'legendary') => {
    setActiveTab('collection');
    const teamId = resolveTeamId(team);
    pushTeamRarity(teamId, rarity);
    setIsStatsOpen(false);
  };

  // Mostrar prompt para atualizar perfil SOMENTE quando não houver imagem de perfil
  useEffect(() => {
    if (!isOwnProfile || !profile) return;

    // Evitar exibir múltiplas vezes por sessão/usuário
    const addr = (profile.wallet_address || '').toLowerCase();
    const sessionKey = `profile-update-prompt-shown:${addr}`;
    if (sessionStorage.getItem(sessionKey) === '1') return;

    const missingAvatar = !profile.profile_image_url;
    if (missingAvatar) {
      setShowUpdatePrompt(true);
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [isOwnProfile, profile?.wallet_address, profile?.profile_image_url, profile?.display_name, profile?.username, profile?.bio, profile?.instagram_url, profile?.youtube_url, profile?.x_url, profile?.tiktok_url]);

  // Re-verificar ownership quando estado de autenticação mudar
  useEffect(() => {
    if (profile && user?.wallet?.address) {
      const userAddress = user.wallet.address.toLowerCase();
      const profileAddress = profile.wallet_address?.toLowerCase();
      const isOwn = Boolean(authenticated && userAddress && profileAddress && userAddress === profileAddress);
      
      console.log('🔄 Re-checking profile ownership:', {
        authenticated,
        userAddress,
        profileAddress,
        currentIsOwnProfile: isOwnProfile,
        newIsOwn: isOwn
      });
      
      if (isOwn !== isOwnProfile) {
        setIsOwnProfile(isOwn);
      }
    }
  }, [authenticated, user?.wallet?.address, profile?.wallet_address]);

  // Atualizar perfil quando o hook userProfile mudar (para usuário logado)
  useEffect(() => {
    if (isOwnProfile && userProfile && profile) {
      setProfile(userProfile);
    }
  }, [userProfile?.profile_image_url, userProfile?.display_name, userProfile?.username, isOwnProfile]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
      const queryParam = isUUID ? `id=${username}` : `username=${username}`;
      
      // Adicionar cache-busting para garantir dados atualizados
      const cacheBuster = `&_t=${Date.now()}`;
      const response = await fetch(`/api/user/profile/public?${queryParam}${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar se é o próprio perfil do usuário logado
        const userAddress = user?.wallet?.address?.toLowerCase();
        const profileAddress = data.wallet_address?.toLowerCase();
        const isOwn = Boolean(authenticated && userAddress && profileAddress && userAddress === profileAddress);
        
        // Debug logs para troubleshooting
        console.log('🔍 Profile ownership check:', {
          authenticated,
          userAddress,
          profileAddress,
          isOwn,
          userData: user
        });
        
        setIsOwnProfile(isOwn);
        
        setProfile(data);
        if (data.username || data.wallet_address) {
          // Reset pagination and load first page
          setCurrentPage(1);
          setHasMore(true);
          fetchUserClaimedAssets(data.username, data.wallet_address, 1, false);
        }
      } else if (response.status === 404) {
        setError('User not found');
        setProfile(null);
      } else {
        const errorText = await response.text();
        setError(`Falha ao carregar perfil: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Erro de rede. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserClaimedAssets = async (username?: string, walletAddress?: string, page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setAssetsLoading(true);
      }

      const params = new URLSearchParams();
      if (username) {
        params.append('username', username);
      } else if (walletAddress) {
        params.append('wallet', walletAddress);
      }
      params.append('page', page.toString());
      params.append('limit', '40');

      const response = await fetch(`/api/user/claimed-assets?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const newAssets = result.data;
        
        if (append) {
          setUserClaimedAssets(prev => {
            const existingIds = new Set(prev.map(asset => asset.userAssetClaimId || asset.claimId));
            const merged = [...prev];
            newAssets.forEach((asset, idx) => {
              const key = asset.userAssetClaimId || asset.claimId || `${asset.id}-${asset.blockchainTokenId || idx}`;
              if (!existingIds.has(key)) {
                merged.push({ ...asset, claimId: key });
                existingIds.add(key);
              }
            });
            return merged;
          });
        } else {
          setUserClaimedAssets(newAssets);
        }
        
        setHasMore(result.pagination.hasMore);
        setTotalCount(result.pagination.activeTotal ?? result.pagination.total ?? newAssets.filter((asset: any) => !asset.burnedAt).length);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching user claimed assets:', error);
      if (!append) {
        setUserClaimedAssets([]);
      }
    } finally {
      setAssetsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more data for infinite scroll
  const loadMore = async () => {
    if (!isLoadingMore && hasMore && profile) {
      await fetchUserClaimedAssets(profile.username, profile.wallet_address, currentPage + 1, true);
    }
  };

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (
        !isLoadingMore && 
        hasMore && 
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, hasMore, isLoadingMore, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error === 'User not found' ? 'Usuário Não Encontrado' : 'Erro ao Carregar Perfil'}
            </h1>
            <p className="text-gray-600">
              {error === 'User not found' 
                ? 'O usuário que você está procurando não existe ou não foi encontrado.'
                : error || 'Algo deu errado ao carregar o perfil.'
              }
            </p>
            {error !== 'User not found' && (
              <Button 
                onClick={fetchUserProfile}
                variant="outline"
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || 'User';

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Profile Content */}
      <div className="px-6 lg:px-12 pt-12">
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between">
            {/* Left side - Profile Info */}
            <div className="flex-1 max-w-4xl">
              {/* Avatar */}
              <div className="mb-6">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    title="Editar perfil"
                    aria-label="Editar perfil"
                    className="relative group h-20 w-20 rounded-full border-2 border-gray-100 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {resolvedProfileImageUrl ? (
                      <OptimizedImage
                        src={resolvedProfileImageUrl}
                        alt={displayName}
                        className="h-20 w-20 rounded-full"
                        aspectRatio="square"
                        placeholder="skeleton"
                        priority
                      />
                    ) : (
                      <Avatar 
                        key={resolvedProfileImageUrl || 'no-image'} 
                        className="h-20 w-20"
                      >
                        <AvatarImage 
                          src={resolvedProfileImageUrl || undefined} 
                          alt={displayName}
                        />
                        <AvatarFallback className="bg-gray-900 text-white text-2xl font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {/* subtle hover overlay */}
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ) : (
                  <>
                    {resolvedProfileImageUrl ? (
                      <OptimizedImage
                        src={resolvedProfileImageUrl}
                        alt={displayName}
                        className="h-20 w-20 rounded-full border-2 border-gray-100"
                        aspectRatio="square"
                        placeholder="skeleton"
                        priority
                      />
                    ) : (
                      <Avatar 
                        key={resolvedProfileImageUrl || 'no-image'} 
                        className="h-20 w-20 border-2 border-gray-100"
                      >
                        <AvatarImage 
                          src={resolvedProfileImageUrl || undefined} 
                          alt={displayName}
                        />
                        <AvatarFallback className="bg-gray-900 text-white text-2xl font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </>
                )}
              </div>

              {/* Name and Username */}
              <div className="mb-0">
                <h1 className="text-5xl font-bold text-gray-900 mb-0 leading-tight">
                  {displayName}
                </h1>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mb-8">
                  <p className="text-lg text-gray-700 leading-relaxed max-w-3xl">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Social Links */}
              {(!!profile.instagram_url || !!profile.youtube_url || !!profile.x_url || !!profile.tiktok_url) && (
                <div className="flex items-center gap-4 mb-0">
                  {!!profile.instagram_url && profile.instagram_url.trim() && (
                    <Link 
                      href={profile.instagram_url} 
                      target="_blank" 
                      className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors font-medium"
                    >
                      <Instagram className="h-5 w-5" />
                      <span className="hidden sm:inline">Instagram</span>
                    </Link>
                  )}
                  {!!profile.youtube_url && profile.youtube_url.trim() && (
                    <Link 
                      href={profile.youtube_url} 
                      target="_blank" 
                      className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors font-medium"
                    >
                      <Youtube className="h-5 w-5" />
                      <span className="hidden sm:inline">YouTube</span>
                    </Link>
                  )}
                  {!!profile.x_url && profile.x_url.trim() && (() => {
                    // Extrai o handle do X/Twitter
                    let handle = null;
                    try {
                      const url = new URL(profile.x_url);
                      const path = url.pathname.replace(/^\//, "");
                      if (path) {
                        handle = `@${path}`;
                      }
                    } catch {}
                    return (
                      <Link 
                        href={profile.x_url} 
                        target="_blank" 
                        className="flex items-center gap-2 text-gray-600 hover:text-purple-500 transition-colors font-medium"
                      >
                        <XIcon className="h-5 w-5" />
                        {handle && <span className="hidden sm:inline">{handle}</span>}
                      </Link>
                    );
                  })()}
                  {!!profile.tiktok_url && profile.tiktok_url.trim() && (
                    <Link 
                      href={profile.tiktok_url} 
                      target="_blank" 
                      className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors font-medium"
                    >
                      <TikTokIcon className="h-5 w-5" />
                      <span className="hidden sm:inline">TikTok</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Right side - Action Button */}
            <div className="pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuItem className="flex items-center gap-3 p-4">
                    <Wallet className="h-5 w-5 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 mb-1">Endereço da Carteira</div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        {profile.wallet_address}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyWalletAddress();
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center gap-3 p-4"
                    onClick={() => setIsStatsOpen(true)}
                  >
                    <Layers className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Estatísticas gerais</span>
                  </DropdownMenuItem>
                  {isOwnProfile && (
                    <DropdownMenuItem 
                      className="flex items-center gap-3 p-4"
                      onClick={() => setIsEditProfileOpen(true)}
                    >
                      <Edit className="h-5 w-5 text-gray-500" />
                      <span className="font-medium">Editar Perfil</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-10">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('collection')}
              className={`py-4 px-1 border-b-2 font-semibold text-base whitespace-nowrap transition-colors ${
                activeTab === 'collection'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Coleção
              <span className="ml-3 bg-gray-100 text-gray-900 py-1 px-3 rounded-full text-sm font-medium">
                {totalCount}
              </span>
            </button>
            
            {/* Aba NFTs - só mostra se for o próprio perfil */}
            {ENABLE_NFTS_TAB && isOwnProfile && (
              <button
                onClick={() => setActiveTab('nfts')}
                className={`py-4 px-1 border-b-2 font-semibold text-base whitespace-nowrap transition-colors ${
                  activeTab === 'nfts'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                NFTs
                <span className="ml-2 bg-gray-100 text-gray-900 py-1 px-2 rounded-full text-xs font-medium">
                  On-chain
                </span>
              </button>
            )}
            
            
            {/* Rarity filter on the right (collection tab) */}
            {activeTab === 'collection' && (
              <div className="flex items-center gap-3 ml-auto">
                {/* Search toggle + input */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setIsSearchOpen(v => !v)}
                    title={isSearchOpen ? 'Fechar busca' : 'Buscar na coleção'}
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  {isSearchOpen && (
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por título ou descrição"
                        className="h-10 w-56 sm:w-72 rounded-md border border-gray-300 bg-white px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setSearchQuery('')}
                          aria-label="Limpar busca"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Rarity filter */}
                <Select
                  value={selectedRarity}
                  onValueChange={(v) => pushTeamRarity(selectedTeam, v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Raridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Raridades</SelectItem>
                    <SelectItem value="common">Comum</SelectItem>
                    <SelectItem value="epic">Épica</SelectItem>
                    <SelectItem value="legendary">Lendária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'collection' || !ENABLE_NFTS_TAB ? (
            // Aba Coleção (existente)
            <>
              {assetsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : activeAssets.length > 0 ? (
                <>
                  {/* Team tabs (horizontal scroll) */}
                  {availableTeams.length > 0 && (
                    <div className="mb-4">
                      <div ref={teamsScrollRef} className="flex gap-3 overflow-x-auto pb-2">
                        {availableTeams.map(team => (
                          <button
                            key={team.id}
                            ref={(el) => { teamItemRefs.current[team.id] = el; }}
                            onClick={() => pushTeamRarity(team.id, selectedRarity)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap ${
                              selectedTeam === team.id ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-sm font-medium">
                              {team.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-6">
                    {displayedAssets.map((asset) => (
                      <div 
                        key={asset.claimId || `${asset.id}-${Date.now()}-${Math.random()}`} 
                        className="group cursor-pointer bg-transparent rounded-lg overflow-hidden shadow-none hover:shadow-md transition-shadow border border-gray-100"
                        onClick={() => handleAssetClick(asset)}
                      >
                        <div className="p-5">
                          <div className="relative">
                            <img
                              src={asset.imageUrl}
                              alt={asset.title}
                              className="w-full h-auto object-contain rounded-lg"
                            />
                            {asset.rarity && (
                              <div className="absolute top-2 right-2">
                                <BadgeRarity rarity={asset.rarity} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-5 pb-5 pt-2">
                          <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
                            {asset.title}
                          </h3>
                          {asset.categoryName && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                              <span>{asset.categoryName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {burnedAssets.length > 0 && (
                    <div className="mt-12">
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Cards queimados</h2>
                        <span className="text-sm text-gray-500">{burnedAssets.length}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-6">
                        {burnedAssets.map((asset) => (
                          <div
                            key={asset.userAssetClaimId || asset.claimId || `${asset.id}-burned`}
                            className="relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs font-semibold uppercase tracking-widest text-white">
                              Queimado
                            </div>
                            <div className="opacity-50 pointer-events-none">
                              <div className="p-5">
                                <div className="relative">
                                  <img
                                    src={asset.imageUrl}
                                    alt={asset.title}
                                    className="w-full h-auto object-contain rounded-lg"
                                  />
                                  {asset.rarity && (
                                    <div className="absolute top-2 right-2">
                                      <BadgeRarity rarity={asset.rarity} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="px-5 pb-5 pt-2">
                                <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
                                  {asset.title}
                                </h3>
                                {asset.categoryName && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                                    <span>{asset.categoryName}</span>
                                  </div>
                                )}
                                {asset.claimedAt && (
                                  <div className="mt-1 text-[11px] text-gray-500">
                                    Reivindicado em {new Date(asset.claimedAt).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading more indicator */}
                  {isLoadingMore && (
                    <div className="flex justify-center py-8 mt-6">
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                        <span>Carregando mais cards...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* End of results indicator */}
                  {!hasMore && displayedAssets.length > 0 && (
                    <div className="flex justify-center py-8 mt-6">
                      <span className="text-gray-500 text-sm">
                        Todos os {displayedAssets.length} cards foram carregados
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum card ainda</h3>
                  <p className="text-gray-600 max-w-md mx-auto">Em breve, você vai começar a visualizar aqui os cards que as pessoas vão resgatando, gerados por AI.</p>
                </div>
              )}
            </>
          ) : (
            // Aba NFTs (nova)
            <NFTsTab />
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => {
            setIsEditProfileOpen(false);
            // Recarregar o perfil após fechar o modal
            handleProfileUpdate();
          }}
          onUsernameChange={handleUsernameChange}
        />
      )}

      {/* Prompt para atualizar informações do perfil (somente dono do perfil) */}
      {isOwnProfile && (
        <AlertDialog open={showUpdatePrompt} onOpenChange={setShowUpdatePrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Atualizar suas informações?</AlertDialogTitle>
              <AlertDialogDescription>
                Seu perfil está com dados genéricos ou sem imagem. Deseja atualizar agora para personalizá-lo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Depois</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowUpdatePrompt(false);
                  setIsEditProfileOpen(true);
                }}
              >
                Atualizar agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* NFT Detail Modal */}
      {selectedAsset && (
        <NFTDetailModal
          isOpen={isNFTModalOpen}
          onClose={() => setIsNFTModalOpen(false)}
          asset={selectedAsset}
        />
      )}

      {/* Fullscreen Swiper */}
            {isSwiperOpen && activeAssets.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-in fade-in-0 p-4"
          onClick={() => setIsSwiperOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/10 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsSwiperOpen(false);
            }}
          >
            <X className="h-6 w-6" />
          </Button>
          <div 
            className="relative w-full max-w-[90vw] h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageSwiper 
              images={activeAssets.map(asset => asset.imageUrl).join(',')}
            />
          </div>
        </div>
      )}

      {/* Enhanced Visual Statistics - Drawer */}
      <Sheet open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">Estatísticas da Coleção</SheetTitle>
            <SheetDescription>
              Análise visual completa da sua coleção de cards com gráficos interativos.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Collection Overview */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Visão Geral da Coleção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900 mb-1">{cardCounts?.total || totalCount}</div>
                    <div className="text-sm text-gray-600 font-medium">Total de Cards</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {cardCounts?.total ? 'Dados em tempo real' : 'Dados carregados'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {availableTeams.filter(t => t.id !== 'all' && t.count > 0).length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Times Diferentes</div>
                    <div className="text-xs text-gray-500 mt-1">
                      de {availableTeams.length - 1} disponíveis
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Filtros por Raridade</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const rarities = ['all','common','epic','legendary'] as const;
                      const labels: Record<typeof rarities[number], string> = {
                        all: 'Todas',
                        common: 'Comum',
                        epic: 'Épica',
                        legendary: 'Lendária',
                      } as const;
                      const overallFromApi = cardCounts?.rarities || {};
                      const overallFromClient = activeAssets.reduce<Record<string, number>>((acc, a) => {
                        const r = (a.rarity || '').toString().toLowerCase();
                        if (!r) return acc;
                        acc[r] = (acc[r] || 0) + 1;
                        return acc;
                      }, {});
                      const getCount = (r: typeof rarities[number]) => {
                        if (r === 'all') return cardCounts?.total ?? totalCount;
                        return (overallFromApi[r] ?? overallFromClient[r] ?? 0);
                      };
                      return (
                        <>
                          {rarities.map((r) => (
                            <StatPill
                              key={r}
                              label={labels[r]}
                              count={getCount(r)}
                              onClick={() => applyStatsFilter('all', r === 'all' ? 'all' : r)}
                              active={selectedTeam === 'all' && (r === 'all' ? selectedRarity === 'all' : selectedRarity === r)}
                            />
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Estatísticas Rápidas</h4>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {(() => {
                          const commons = cardCounts?.rarities?.common || 0;
                          const total = cardCounts?.total || totalCount || 1;
                          return `${((commons / total) * 100).toFixed(1)}%`;
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">Cards Comuns</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {cardCounts?.rarities?.legendary || 0}
                      </div>
                      <div className="text-xs text-gray-500">Cards Lendários</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rarity Distribution Chart */}
            <Chart 
              title="Distribuição por Raridade" 
              description="Visualização interativa da distribuição de cards por raridade com percentuais"
            >
              {(() => {
                const rarityData: Array<{ name: string; value: number; color: string }> = [];
                const overallFromApi = cardCounts?.rarities || {};
                const overallFromClient = activeAssets.reduce<Record<string, number>>((acc, a) => {
                  const r = (a.rarity || '').toString().toLowerCase();
                  if (!r) return acc;
                  acc[r] = (acc[r] || 0) + 1;
                  return acc;
                }, {});

                const rarityColors = {
                  common: '#10B981',    // Green
                  epic: '#8B5CF6',      // Purple  
                  legendary: '#F59E0B', // Amber
                  unknown: '#6B7280'    // Gray
                };

                const rarityLabels = {
                  common: 'Comum',
                  epic: 'Épica',
                  legendary: 'Lendária',
                  unknown: 'Desconhecida'
                };

                Object.entries(overallFromApi).forEach(([rarity, count]) => {
                  if (rarity !== 'unknown' && count > 0) {
                    rarityData.push({
                      name: rarityLabels[rarity as keyof typeof rarityLabels] || rarity,
                      value: count,
                      color: rarityColors[rarity as keyof typeof rarityColors] || rarityColors.unknown
                    });
                  }
                });

                if (rarityData.length === 0) {
                  Object.entries(overallFromClient).forEach(([rarity, count]) => {
                    if (rarity !== 'unknown' && count > 0) {
                      rarityData.push({
                        name: rarityLabels[rarity as keyof typeof rarityLabels] || rarity,
                        value: count,
                        color: rarityColors[rarity as keyof typeof rarityColors] || rarityColors.unknown
                      });
                    }
                  });
                }

                return rarityData.length > 0 ? (
                  <div className="cursor-pointer" onClick={() => applyStatsFilter('all', 'all')}>
                    <CustomPieChart data={rarityData} size={200} />
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{rarityData.reduce((sum, item) => sum + item.value, 0)} cards</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Clique para ver todos</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Nenhum dado de raridade disponível</p>
                  </div>
                );
              })()}
            </Chart>

            {/* Team Distribution Chart removed per request */}

            {/* Detailed Team Statistics */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Relatório Detalhado por Time</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Clique em qualquer estatística para aplicar filtros na sua coleção
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const categories = cardCounts?.categories || {};
                    const byCatRarity = cardCounts?.categoryRarity || {};
                    const entries = Object.entries(categories)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1]);
                    
                    return entries.map(([catKey, count]) => {
                    const fromTeam = (availableTeams.find(t => normalizeKey(t.id) === normalizeKey(catKey) || normalizeKey(t.label) === normalizeKey(catKey)) || { label: catKey });
                      const label = fromTeam.label || catKey;
                      const rarities = byCatRarity[catKey] || {};
                      const getRarityCount = (r: 'common'|'epic'|'legendary') => rarities[r] || 0;
                      const total = getRarityCount('common') + getRarityCount('epic') + getRarityCount('legendary');
                      
                      return (
                        <div key={catKey} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 hover:shadow-sm transition-all">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: `hsl(${Math.abs(catKey.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 65%, 55%)` }}
                              />
                              {label}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-gray-200"
                              onClick={() => applyStatsFilter(catKey, 'all')}
                            >
                              {count} cards
                            </Badge>
                          </div>
                          
                          {/* Mini rarity distribution for this team */}
                          <div className="mb-3">
                            <div className="flex gap-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              {getRarityCount('common') > 0 && (
                                <div 
                                  className="bg-green-500" 
                                  style={{ width: `${(getRarityCount('common') / total) * 100}%` }}
                                  title={`Comum: ${getRarityCount('common')}`}
                                />
                              )}
                              {getRarityCount('epic') > 0 && (
                                <div 
                                  className="bg-purple-500" 
                                  style={{ width: `${(getRarityCount('epic') / total) * 100}%` }}
                                  title={`Épica: ${getRarityCount('epic')}`}
                                />
                              )}
                              {getRarityCount('legendary') > 0 && (
                                <div 
                                  className="bg-amber-500" 
                                  style={{ width: `${(getRarityCount('legendary') / total) * 100}%` }}
                                  title={`Lendária: ${getRarityCount('legendary')}`}
                                />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <StatPill
                              label="Todas"
                              count={count}
                              onClick={() => applyStatsFilter(catKey, 'all')}
                              active={selectedTeam === catKey && selectedRarity === 'all'}
                              className="text-xs"
                            />
                            <StatPill
                              label="Comum"
                              count={getRarityCount('common')}
                              onClick={() => applyStatsFilter(catKey, 'common')}
                              active={selectedTeam === catKey && selectedRarity === 'common'}
                              className="text-xs"
                            />
                            <StatPill
                              label="Épica"
                              count={getRarityCount('epic')}
                              onClick={() => applyStatsFilter(catKey, 'epic')}
                              active={selectedTeam === catKey && selectedRarity === 'epic'}
                              className="text-xs"
                            />
                            <StatPill
                              label="Lendária"
                              count={getRarityCount('legendary')}
                              onClick={() => applyStatsFilter(catKey, 'legendary')}
                              active={selectedTeam === catKey && selectedRarity === 'legendary'}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Debug Panel (apenas em desenvolvimento) */}
      {showDebug && <MarketplaceDebugPanel />}
    </div>
  );
} 

// Helper components for the stats drawer
function StatPill({
  label,
  count,
  onClick,
  active = false,
  className = '',
}: {
  label: string;
  count: number;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${
        active ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
      } ${className}`}
    >
      <span>{label}</span>
      <span className={active ? 'text-gray-300' : 'text-gray-500'}>({count})</span>
    </button>
  );
}
