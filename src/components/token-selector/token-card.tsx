'use client';

import { useState } from 'react';
import { StakingToken } from '@/lib/tokens';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TokenCardProps {
  token: StakingToken;
  balance?: string;
  stakedAmount?: string;
  claimableAmount?: string;
  pendingCooldownAmount?: string;
  onStake?: (token: StakingToken) => void;
  onUnstake?: (token: StakingToken) => void;
  onClaim?: (token: StakingToken) => void;
}

export function TokenCard({
  token,
  balance = '0',
  stakedAmount = '0',
  claimableAmount = '0',
  pendingCooldownAmount = '0',
  onStake,
  onUnstake,
  onClaim
}: TokenCardProps) {
  // Normaliza números no formato pt-BR ("1.234,56") para parseFloat seguro
  const normalizeNumber = (value: string) => value.replace(/\./g, '').replace(',', '.');
  const hasClaimable = parseFloat(normalizeNumber(claimableAmount)) > 0;
  const hasPending = parseFloat(normalizeNumber(pendingCooldownAmount)) > 0;
  const [showClaimInfo, setShowClaimInfo] = useState(false);

  return (
    <div className="bg-white rounded-xl border p-4 shadow hover:shadow-md transition-shadow">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center mb-4">
        <div className="w-12 h-12 relative sm:mr-3 bg-gray-100 rounded-full overflow-hidden mx-auto sm:mx-0 mt-3 sm:mt-0">
          {token.icon_url ? (
            <img src={token.icon_url} alt={token.symbol} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {token.symbol.substring(0, 1)}
            </div>
          )}
        </div>
        
        <div className="text-center sm:text-left">
          <h3 className="font-bold text-lg">{token.symbol}</h3>
          <p className="text-sm text-gray-500">{token.name}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
          {token.description}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Seu Saldo:</span>
          <span className="font-medium">{balance} {token.symbol}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Quantidade em Stake:</span>
          <span className="font-medium">{stakedAmount} {token.symbol}</span>
        </div>
        {/* Linha de cooldown com ajuda; removemos a linha "Resgatável" */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Em cooldown:</span>
            <button
              onClick={() => setShowClaimInfo(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Entenda o período de cooldown"
              title="Entenda o período de cooldown"
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </div>
          <span className={`font-medium ${hasPending ? 'text-amber-600' : ''}`}>{pendingCooldownAmount} {token.symbol}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => onStake?.(token)}
            className="flex-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition"
          >
            Stake
          </button>
          <button
            onClick={() => onUnstake?.(token)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition"
            disabled={stakedAmount === '0' || parseFloat(normalizeNumber(stakedAmount)) <= 0}
          >
            Unstake
          </button>
        </div>
        <button
          onClick={() => onClaim?.(token)}
          className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition"
          // Sempre habilitado, aparência de desabilitado (cinza)
          disabled={false}
        >
          Resgatar {hasClaimable ? `(${claimableAmount} ${token.symbol})` : ''}
        </button>
      </div>

      {/* Modal de Informações sobre Resgate */}
      <Dialog open={showClaimInfo} onOpenChange={setShowClaimInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <span>Como funciona o Resgate</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Período de Cooldown</h3>
              <p className="text-sm text-gray-600">
                Após fazer unstake dos seus tokens, há um período de espera de <strong>7 dias</strong> antes que você possa resgatar os tokens para sua carteira. Durante o cooldown, você pode continuar fazendo stake normalmente.
              </p>
            </div>


            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Como Resgatar</h3>
              <p className="text-sm text-gray-600">
                Quando houver tokens disponíveis, clique no botão <strong>"Resgatar"</strong> abaixo do card do token para transferi-los para sua carteira.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
