/**
 * NFT Staking Page
 *
 * Temporarily disabled - feature under development
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function NFTStakingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          NFT Staking feature is currently under development and will be available soon.
        </AlertDescription>
      </Alert>
    </div>
  );
}
