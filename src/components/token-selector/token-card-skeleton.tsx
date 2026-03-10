'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function TokenCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border p-4 shadow">
      <div className="flex items-center mb-4">
        <Skeleton className="w-12 h-12 rounded-full mr-3" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </div>
    </div>
  );
}