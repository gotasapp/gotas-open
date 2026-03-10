import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  variant?: 'grid' | 'list' | 'table';
  count?: number;
}

export function CardSkeleton({ className, variant = 'grid', count = 1 }: CardSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (variant === 'table') {
    return (
      <>
        {skeletons.map((index) => (
          <tr key={index} className="border-b border-gray-100">
            <td className="py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-200 animate-shimmer" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-shimmer" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-shimmer" />
                </div>
              </div>
            </td>
            <td className="py-4 px-6">
              <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer" />
            </td>
            <td className="py-4 px-6">
              <div className="h-6 w-16 bg-gray-200 rounded-full animate-shimmer" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (variant === 'list') {
    return (
      <>
        {skeletons.map((index) => (
          <div key={index} className={cn("bg-white rounded-xl border border-gray-200 overflow-hidden", className)}>
            <div className="flex h-32">
              <div className="w-32 h-full bg-gray-200 animate-shimmer" />
              <div className="flex-1 p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded-full animate-shimmer" />
                  <div className="h-5 w-20 bg-gray-200 rounded-full animate-shimmer" />
                </div>
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-shimmer" />
                <div className="h-4 w-full bg-gray-200 rounded animate-shimmer" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  // Grid variant (default)
  return (
    <>
      {skeletons.map((index) => (
        <div key={index} className={cn("bg-white rounded-xl border border-gray-200 overflow-hidden", className)}>
          <div className="aspect-square bg-gray-200 animate-shimmer" />
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-gray-200 rounded-full animate-shimmer" />
              <div className="h-5 w-20 bg-gray-200 rounded-full animate-shimmer" />
            </div>
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-shimmer" />
            <div className="h-4 w-full bg-gray-200 rounded animate-shimmer" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-shimmer" />
          </div>
        </div>
      ))}
    </>
  );
}

// Skeleton para modal de NFT
export function NFTModalSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Imagem Principal */}
      <div className="flex justify-center">
        <div className="w-80 h-80 md:w-96 md:h-96 bg-gray-200 rounded-lg animate-shimmer" />
      </div>

      {/* Título e Descrição */}
      <div className="text-center space-y-4">
        <div className="h-12 w-3/4 mx-auto bg-gray-200 rounded animate-shimmer" />
        <div className="h-6 w-2/3 mx-auto bg-gray-200 rounded animate-shimmer" />
        <div className="h-6 w-1/2 mx-auto bg-gray-200 rounded animate-shimmer" />
      </div>

      {/* Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-full bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-shimmer" />
        </div>
        <div className="space-y-3">
          <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-full bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para perfil de usuário
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar e info básica */}
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 animate-shimmer" />
        <div className="space-y-3">
          <div className="h-8 w-48 bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-shimmer" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-shimmer" />
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <CardSkeleton count={8} />
      </div>
    </div>
  );
} 