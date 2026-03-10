import { useState, useRef, useEffect } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { UserProfile } from '@/hooks/useUserProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Instagram, Youtube, Globe } from 'lucide-react';
import { toast } from 'sonner';

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

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Username editing disabled; prop kept for backward compatibility (unused)
  onUsernameChange?: (newUsername: string) => void;
}

// Validadores de URL para cada rede social
const validateSocialUrl = (platform: string, url: string): boolean => {
  if (!url.trim()) return true; // URLs vazias são válidas
  
  const validPrefixes = {
    instagram: ['https://instagram.com/', 'https://www.instagram.com/', 'http://instagram.com/', 'http://www.instagram.com/'],
    youtube: ['https://youtube.com/', 'https://www.youtube.com/', 'http://youtube.com/', 'http://www.youtube.com/'],
    x: ['https://x.com/', 'https://www.x.com/', 'http://x.com/', 'http://www.x.com/', 'https://twitter.com/', 'https://www.twitter.com/', 'http://twitter.com/', 'http://www.twitter.com/'],
    tiktok: ['https://tiktok.com/', 'https://www.tiktok.com/', 'http://tiktok.com/', 'http://www.tiktok.com/']
  };
  
  const prefixes = validPrefixes[platform as keyof typeof validPrefixes];
  return prefixes ? prefixes.some(prefix => url.toLowerCase().startsWith(prefix)) : false;
};

// Detecta se o texto contém URLs
const containsUrl = (text: string): boolean => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,})/i;
  return urlRegex.test(text);
};

export function EditProfileModal({ isOpen, onClose, onUsernameChange }: EditProfileModalProps) {
  const { profile, updateProfile, uploadProfileImage, loading, fetchProfile } = useUnifiedAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    instagram_url: '',
    youtube_url: '',
    x_url: '',
    tiktok_url: '',
  });

  const [imageUploading, setImageUploading] = useState(false);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  // Username status/messages removed (username not editable)

  // Update form data when profile changes or modal opens
  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        instagram_url: profile.instagram_url || '',
        youtube_url: profile.youtube_url || '',
        x_url: profile.x_url || '',
        tiktok_url: profile.tiktok_url || '',
      });
    }
  }, [profile, isOpen]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    // Aplicar limite de caracteres para bio (aproximadamente 2 linhas)
    if (field === 'bio') {
      if (value.length > 140) {
        return; // Não permite mais de 140 caracteres
      }
      // Verificar se contém URLs
      if (containsUrl(value)) {
        toast.error('URLs não são permitidas na bio');
        return;
      }
    }
    
    // Validar URLs das redes sociais
    if (field.endsWith('_url')) {
      const platform = field.replace('_url', '');
      const isValid = validateSocialUrl(platform, value);
      
      setUrlErrors(prev => ({
        ...prev,
        [field]: isValid ? '' : `URL deve começar com a URL oficial do ${platform === 'x' ? 'X/Twitter' : platform}`
      }));
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));

    // Username validation removed
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📤 Modal - Starting image upload:', file.name, file.size);

    setImageUploading(true);
    try {
      await uploadProfileImage(file);
      console.log('✅ Modal - Image upload successful');
      toast.success('Imagem do perfil atualizada com sucesso!');
    } catch (error) {
      console.error('💥 Modal - Image upload failed:', error);
      
      let errorMessage = 'Failed to upload image';
      if (error instanceof Error) {
        if (error.message.includes('413')) {
          errorMessage = 'Image too large. Please choose a smaller image.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid image format. Please choose a valid image.';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Erro de armazenamento. Tente novamente.';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('💾 Modal - Starting profile save');
      
      // Validar todas as URLs antes de salvar
      const urlFields = ['instagram_url', 'youtube_url', 'x_url', 'tiktok_url'] as const;
      const hasUrlErrors = urlFields.some(field => {
        const platform = field.replace('_url', '');
        const url = formData[field];
        if (url && !validateSocialUrl(platform, url)) {
          toast.error(`URL do ${platform === 'x' ? 'X/Twitter' : platform} inválida`);
          return true;
        }
        return false;
      });
      
      if (hasUrlErrors) {
        return;
      }
      
      // Limpar campos vazios (converter strings vazias para null)
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key, 
          value.trim() === '' ? null : value.trim()
        ])
      );
      
      console.log('📋 Modal - Form data:', formData);
      console.log('🧹 Modal - Cleaned data:', cleanedData);
      
      const updatedProfile = await updateProfile(cleanedData);
      console.log('✅ Modal - Profile saved successfully');
      
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('💥 Modal - Profile save failed:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          errorMessage = 'Invalid data. Please check your information.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro do servidor. Tente novamente.';
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={profile?.profile_image_url} 
                  alt={displayName}
                />
                <AvatarFallback className="bg-blue-500 text-white text-xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <Button
                variant="outline"
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="Seu nome de exibição"
              />
            </div>

            {/* Username field removed by request */}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="bio">Bio</Label>
                <span className={`text-sm ${formData.bio.length > 120 ? 'text-orange-500' : 'text-gray-500'}`}>
                  {formData.bio.length}/140
                </span>
              </div>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Conte-nos sobre você... (máx 2 linhas)"
                rows={3}
                className={`resize-none ${formData.bio.length > 120 ? 'border-orange-300 focus:border-orange-500' : ''}`}
              />
              {formData.bio.length > 120 && (
                <p className="text-xs text-orange-600 mt-1">
                  Aproximando-se do limite de 2 linhas
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <Label>Links Sociais</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  <div className="flex-1">
                    <Input
                      value={formData.instagram_url}
                      onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                      placeholder="https://instagram.com/username"
                      className={urlErrors.instagram_url ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {urlErrors.instagram_url && (
                      <p className="text-xs text-red-600 mt-1">{urlErrors.instagram_url}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Youtube className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <Input
                      value={formData.youtube_url}
                      onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                      placeholder="https://youtube.com/channel/..."
                      className={urlErrors.youtube_url ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {urlErrors.youtube_url && (
                      <p className="text-xs text-red-600 mt-1">{urlErrors.youtube_url}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <XIcon className="h-4 w-4 text-black" />
                  <div className="flex-1">
                    <Input
                      value={formData.x_url}
                      onChange={(e) => handleInputChange('x_url', e.target.value)}
                      placeholder="https://x.com/username"
                      className={urlErrors.x_url ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {urlErrors.x_url && (
                      <p className="text-xs text-red-600 mt-1">{urlErrors.x_url}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TikTokIcon className="h-4 w-4 text-black" />
                  <div className="flex-1">
                    <Input
                      value={formData.tiktok_url}
                      onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                      placeholder="https://tiktok.com/@username"
                      className={urlErrors.tiktok_url ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {urlErrors.tiktok_url && (
                      <p className="text-xs text-red-600 mt-1">{urlErrors.tiktok_url}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
