'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Send, AlertCircle } from 'lucide-react';
import { Address, isAddress } from 'viem';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Minimal ERC-721 ABI for transfer
const ERC721_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
] as const;

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

interface NFTData {
  tokenId: string;
  name?: string;
  image?: string;
  attributes?: NFTAttribute[];
}

interface TransferNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFTData | null;
  contractAddress: Address;
  onSuccess?: () => void;
}

export function TransferNFTModal({
  isOpen,
  onClose,
  nft,
  contractAddress,
  onSuccess
}: TransferNFTModalProps) {
  const { address } = useAccount();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleTransfer = async () => {
    if (!nft || !address) {
      toast.error('Dados inválidos para transferência');
      return;
    }

    if (!recipientAddress || !isAddress(recipientAddress)) {
      toast.error('Endereço de destino inválido');
      return;
    }

    if (recipientAddress.toLowerCase() === address.toLowerCase()) {
      toast.error('Você não pode transferir para si mesmo');
      return;
    }

    setIsProcessing(true);

    try {
      toast.info(`Iniciando transferência do Card #${nft.tokenId}...`);

      writeContract({
        address: contractAddress,
        abi: ERC721_ABI,
        functionName: 'safeTransferFrom',
        args: [address, recipientAddress as Address, BigInt(nft.tokenId)],
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Erro ao transferir NFT:', error);
      toast.error(err?.message || 'Erro ao transferir Card');
      setIsProcessing(false);
    }
  };

  // Handle successful transaction
  if (isSuccess && isProcessing) {
    setIsProcessing(false);
    toast.success(`Card #${nft?.tokenId} transferido com sucesso!`);
    setRecipientAddress('');
    onSuccess?.();
    onClose();
  }

  const handleClose = () => {
    if (!isProcessing && !isPending && !isConfirming) {
      setRecipientAddress('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Transferir Card
          </DialogTitle>
          <DialogDescription>
            Envie este Card para outra carteira
          </DialogDescription>
        </DialogHeader>

        {nft && (
          <div className="space-y-4">
            {/* NFT Preview */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="w-16 h-24 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={nft.image || '/placeholder-card.svg'}
                  alt={nft.name || `Card #${nft.tokenId}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {nft.name || `Card #${nft.tokenId}`}
                </p>
                <p className="text-xs text-gray-500">
                  Token ID: {nft.tokenId}
                </p>
              </div>
            </div>

            {/* Warning Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Esta ação é irreversível. Certifique-se de que o endereço está correto.
              </AlertDescription>
            </Alert>

            {/* Recipient Address Input */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Endereço de Destino</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                disabled={isProcessing || isPending || isConfirming}
                className="font-mono text-sm"
              />
              {recipientAddress && !isAddress(recipientAddress) && (
                <p className="text-xs text-red-600">Endereço inválido</p>
              )}
            </div>

            {/* Status Messages */}
            {isPending && (
              <Alert>
                <AlertDescription className="text-sm">
                  Aguardando confirmação na carteira...
                </AlertDescription>
              </Alert>
            )}

            {isConfirming && (
              <Alert>
                <AlertDescription className="text-sm">
                  Aguardando confirmação na blockchain...
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing || isPending || isConfirming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              !recipientAddress ||
              !isAddress(recipientAddress) ||
              isProcessing ||
              isPending ||
              isConfirming ||
              recipientAddress.toLowerCase() === address?.toLowerCase()
            }
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isPending ? 'Aguardando...' : isConfirming ? 'Confirmando...' : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
