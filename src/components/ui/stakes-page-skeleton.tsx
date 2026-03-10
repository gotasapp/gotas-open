'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function StakesPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <Skeleton className="h-9 w-32 mb-8" />
      
      <div className="text-center py-12">
        <Skeleton className="h-7 w-80 mx-auto mb-4" />
        <Skeleton className="h-5 w-96 mx-auto mb-2" />
        <Skeleton className="h-5 w-72 mx-auto mb-6" />
        <Skeleton className="h-11 w-40 mx-auto rounded-md" />
      </div>
    </div>
  );
} 