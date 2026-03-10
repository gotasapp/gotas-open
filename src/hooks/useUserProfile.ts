import { useState, useEffect, useCallback } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';
import { generateDisplayNameFromEmail } from '@/utils/user-generator';

export interface UserProfile {
  id: number;
  wallet_address: string;
  privy_user_id?: string;
  email?: string;
  display_name?: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  x_url?: string;
  tiktok_url?: string;
  auth_provider?: string;
  auth_method?: string;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user, authenticated } = useUnifiedAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUserIfNotExists = useCallback(async (walletAddress: string, privyUserId?: string, email?: string) => {
    try {
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
          display_name: displayName,
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        setProfile(newUser);
        return newUser;
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?wallet=${user.wallet.address}`);

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        await createUserIfNotExists(
          user.wallet.address,
          user.id,
          user.email?.address
        );
      } else {
        const errorText = await response.text();
        setError('Failed to fetch profile');
      }
    } catch (error) {
      setError('Error fetching profile');
    } finally {
      setLoading(false);
    }
  }, [authenticated, user, createUserIfNotExists]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authenticated || !user?.wallet?.address) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?wallet=${user.wallet.address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        toast.success('Perfil atualizado com sucesso!');
        return updatedProfile;
      } else {
        const errorText = await response.text();
        setError('Failed to update profile');
        toast.error('Erro ao atualizar perfil');
        throw new Error(`Failed to update profile: ${response.status}`);
      }
    } catch (error) {
      setError('Error updating profile');
      toast.error('Error updating profile');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    if (!authenticated || !user?.wallet?.address) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('wallet_address', user.wallet.address);

    try {
      const response = await fetch('/api/user/upload-profile-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        await updateProfile({ profile_image_url: result.imageUrl });
        return result.imageUrl;
      } else {
        const errorText = await response.text();
        throw new Error('Failed to upload image');
      }
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [authenticated, user?.wallet?.address, fetchProfile]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadProfileImage,
  };
}; 