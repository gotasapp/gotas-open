import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { UserProfile } from './useUserProfile';
import { generateRandomUserData, generateDisplayNameFromEmail } from '@/utils/user-generator';
import { trackWalletConnection } from '@/lib/gtag';
import { useSociosSession } from '@/components/providers/SociosSessionProvider';

export interface UnifiedAuthState {
  isAuthenticated: boolean;
  user: {
    id?: string;
    wallet?: {
      address: string;
    };
    email?: {
      address: string;
    };
  } | null;
  profile: UserProfile | null;
  authProvider: 'privy' | 'socios' | null;
  loading: boolean;
  error: string | null;
}

export const useUnifiedAuth = () => {
  const { authenticated: privyAuthenticated, user: privyUser, logout: privyLogout } = usePrivy();
  
  let sociosAddress: string | undefined;
  let sociosConnected = false;
  let sociosDisconnect: (() => void) | undefined;
  
  try {
    // Usar o hook de sessão do Socios que acessa o contexto correto
    const sociosSession = useSociosSession();
    sociosAddress = sociosSession.address;
    sociosConnected = sociosSession.isConnected;
    sociosDisconnect = sociosSession.disconnect;
  } catch (e) {
    // Fallback silencioso se o contexto não estiver disponível
    if (typeof window !== 'undefined') {
      const storedAddress = localStorage.getItem('socios_wallet_address');
      if (storedAddress) {
        sociosAddress = storedAddress;
        sociosConnected = true;
      }
    }
  }
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [sociosWalletAddress, setSociosWalletAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('socios_wallet_address');
    }
    return null;
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'socios_wallet_address') {
        setSociosWalletAddress(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const checkInterval = setInterval(() => {
      const stored = localStorage.getItem('socios_wallet_address');
      if (stored !== sociosWalletAddress) {
        setSociosWalletAddress(stored);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [sociosWalletAddress]);
  
  if (!sociosAddress && sociosWalletAddress) {
    sociosAddress = sociosWalletAddress;
    sociosConnected = true;
  }
  
  // Estado para controlar se já foi inicializado
  const [initialized, setInitialized] = useState(false);
  
  // Cache mais robusto
  const cacheRef = useRef<{
    address: string | null;
    provider: 'privy' | 'socios' | null;
    profile: UserProfile | null;
    isFetching: boolean;
  }>({
    address: null,
    provider: null,
    profile: null,
    isFetching: false
  });

  // Determina qual provedor está ativo
  const getActiveAuth = useCallback((): {
    isAuthenticated: boolean;
    user: UnifiedAuthState['user'];
    authProvider: 'privy' | 'socios' | null;
  } => {
    // Privy tem prioridade se estiver autenticado
    if (privyAuthenticated && privyUser?.wallet?.address) {
      return {
        isAuthenticated: true,
        user: privyUser,
        authProvider: 'privy'
      };
    }
    
    // Senão, verifica Socios
    const finalSociosAddress = sociosAddress || sociosWalletAddress;
    if ((sociosConnected || sociosWalletAddress) && finalSociosAddress) {
      return {
        isAuthenticated: true,
        user: {
          id: finalSociosAddress,
          wallet: { address: finalSociosAddress }
        },
        authProvider: 'socios'
      };
    }

    return {
      isAuthenticated: false,
      user: null,
      authProvider: null
    };
  }, [privyAuthenticated, privyUser, sociosConnected, sociosAddress, sociosWalletAddress]);

  const createUserIfNotExists = async (
    walletAddress: string, 
    authProvider: 'privy' | 'socios',
    privyUserId?: string, 
    email?: string
  ) => {
    try {
      console.log('Creating user with:', {
        walletAddress,
        authProvider,
        privyUserId,
        email
      });

      // Gerar dados automaticamente se não foram fornecidos
      let displayName: string | undefined;
      
      if (email) {
        // Se tem email, gera nome baseado no email
        displayName = generateDisplayNameFromEmail(email);
      } else {
        // Se não tem email, deixa undefined para que a API gere dados aleatórios
        displayName = undefined;
      }

      const response = await fetch(`/api/user/profile?wallet=${walletAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privy_user_id: privyUserId,
          email: email,
          auth_provider: authProvider,
          auth_method: authProvider === 'socios' ? 'wallet_connect' : 'privy',
          display_name: displayName,
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        console.log('User created successfully:', newUser);
        return newUser;
      } else {
        const errorData = await response.json();
        console.error('Failed to create user:', errorData);
        throw new Error(`Failed to create user: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in createUserIfNotExists:', error);
      throw error;
    }
  };

  const fetchProfileInternal = async (
    walletAddress: string, 
    authProvider: 'privy' | 'socios', 
    privyUserId?: string, 
    email?: string
  ) => {
    // Verificar se já está buscando ou se já tem o mesmo resultado em cache
    if (cacheRef.current.isFetching) {
      return cacheRef.current.profile;
    }

    if (cacheRef.current.address === walletAddress && 
        cacheRef.current.provider === authProvider && 
        cacheRef.current.profile) {
      return cacheRef.current.profile;
    }
    
    cacheRef.current.isFetching = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?wallet=${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Atualizar cache e estado
        cacheRef.current = {
          address: walletAddress,
          provider: authProvider,
          profile: data,
          isFetching: false
        };
        
        setProfile(data);
        return data;
      } else if (response.status === 404) {
        // Usuário não existe, criar
        const newUser = await createUserIfNotExists(walletAddress, authProvider, privyUserId, email);
        
        // Atualizar cache e estado
        cacheRef.current = {
          address: walletAddress,
          provider: authProvider,
          profile: newUser,
          isFetching: false
        };
        
        setProfile(newUser);
        return newUser;
      } else {
        setError('Failed to fetch profile');
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setError('Error fetching profile');
      return null;
    } finally {
      cacheRef.current.isFetching = false;
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>, walletAddress: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?wallet=${walletAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        
        // Atualizar cache
        if (cacheRef.current.address === walletAddress) {
          cacheRef.current.profile = updatedProfile;
        }
        
        return updatedProfile;
      } else {
        let msg = `Failed to update profile: ${response.status}`;
        try {
          const data = await response.json();
          if (data?.code) msg += ` (${data.code})`;
          if (data?.error) msg += ` - ${data.error}`;
        } catch {}
        setError('Failed to update profile');
        throw new Error(msg);
      }
    } catch (error) {
      setError('Error updating profile');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfileImage = async (file: File, walletAddress: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('wallet_address', walletAddress);

    try {
      const response = await fetch('/api/user/upload-profile-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        await updateProfile({ profile_image_url: result.imageUrl }, walletAddress);
        return result.imageUrl;
      } else {
        try {
          const data = await response.json();
          const code = data?.details || data?.code;
          const msg = data?.error || 'Failed to upload image';
          throw new Error(`${msg}${code ? ` (${code})` : ''}`);
        } catch (e) {
          throw new Error('Failed to upload image');
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = useCallback(async () => {
    setProfile(null);
    setError(null);
    setInitialized(false);
    cacheRef.current = {
      address: null,
      provider: null,
      profile: null,
      isFetching: false
    };
    
    try {
      await Promise.all([
        privyAuthenticated ? privyLogout().catch(() => {}) : Promise.resolve(),
        sociosDisconnect ? Promise.resolve(sociosDisconnect()).catch(() => {}) : Promise.resolve()
      ]);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('socios_wallet_address');
        const walletConnectKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('wc@') || key.startsWith('walletconnect') || key.startsWith('socios_wc_')
        );
        walletConnectKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Erro durante logout:', error);
    }
  }, [privyAuthenticated, privyLogout, sociosDisconnect]);

  // Função para forçar re-fetch do perfil
  const refetchProfile = useCallback(() => {
    const { isAuthenticated, user, authProvider } = getActiveAuth();
    
    if (isAuthenticated && user?.wallet?.address && authProvider) {
      // Limpar cache para forçar novo fetch
      cacheRef.current = {
        address: null,
        provider: null,
        profile: null,
        isFetching: false
      };
      
      fetchProfileInternal(
        user.wallet.address,
        authProvider,
        authProvider === 'privy' ? user.id : undefined,
        authProvider === 'privy' && user.email ? user.email.address : undefined
      );
    }
  }, [getActiveAuth]);

  // Efeito principal - MUITO mais controlado
  useEffect(() => {
    const { isAuthenticated, user, authProvider } = getActiveAuth();
    
    
    if (isAuthenticated && user?.wallet?.address && authProvider) {
      // Só fazer fetch se:
      // 1. Não foi inicializado ainda OU
      // 2. Mudou o endereço OU
      // 3. Mudou o provedor
      const shouldFetch = !initialized || 
                         cacheRef.current.address !== user.wallet.address || 
                         cacheRef.current.provider !== authProvider;
      
      if (shouldFetch) {
        fetchProfileInternal(
          user.wallet.address,
          authProvider,
          authProvider === 'privy' ? user.id : undefined,
          authProvider === 'privy' && user.email ? user.email.address : undefined
        ).then(() => {
          setInitialized(true);
          // Rastrear conexão de wallet bem sucedida
          if (user.wallet?.address) {
            trackWalletConnection(user.wallet.address);
          }
        });
      }
    } else {
      // Não autenticado - limpar apenas se tinha algo antes
      if (initialized || profile) {
        setProfile(null);
        setInitialized(false);
        cacheRef.current = {
          address: null,
          provider: null,
          profile: null,
          isFetching: false
        };
      }
    }
  }, [privyAuthenticated, privyUser?.wallet?.address, privyUser?.id, privyUser?.email?.address, sociosConnected, sociosAddress, sociosWalletAddress, initialized, profile]);

  // Retorna o estado unificado
  const { isAuthenticated, user, authProvider } = getActiveAuth();

  return {
    // Estado unificado compatível com usePrivy
    authenticated: isAuthenticated,
    ready: true,
    user,
    profile,
    authProvider,
    loading,
    error,
    
    // Funções
    logout,
    updateProfile: (updates: Partial<UserProfile>) => 
      user?.wallet?.address ? updateProfile(updates, user.wallet.address) : Promise.reject('No wallet address'),
    uploadProfileImage: (file: File) => 
      user?.wallet?.address ? uploadProfileImage(file, user.wallet.address) : Promise.reject('No wallet address'),
    fetchProfile: refetchProfile,
  };
}; 
