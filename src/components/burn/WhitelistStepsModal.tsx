'use client';

import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Flame, Loader2 } from 'lucide-react';

interface WhitelistStepsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: 'pending' | 'processing' | 'success';
  isApproved: boolean;
  onRequestWhitelist: () => Promise<void>;
  onContinue: () => void;
}

export function WhitelistStepsModal({
  open,
  onOpenChange,
  step,
  isApproved,
  onRequestWhitelist,
  onContinue
}: WhitelistStepsModalProps) {
  const handleRequestWhitelist = async () => {
    try {
      await onRequestWhitelist();
    } catch (error) {
      console.error('Error requesting whitelist:', error);
    }
  };

  const renderStepIcon = (stepState: 'completed' | 'processing' | 'pending') => {
    if (stepState === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (stepState === 'processing') {
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getApprovalState = () => {
    if (isApproved) return 'completed';
    if (step === 'pending') return 'pending';
    return 'pending';
  };

  const getWhitelistState = () => {
    if (step === 'success') return 'completed';
    if (step === 'processing') return 'processing';
    return 'pending';
  };

  const getStakeState = () => {
    if (step === 'success') return 'processing';
    return 'pending';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-gray-900" />
            Configuração Necessária
          </DialogTitle>
          <DialogDescription>
            {step === 'pending' && 'Para participar do sistema de burn, sua wallet precisa ser autorizada.'}
            {step === 'processing' && 'Aguarde enquanto adicionamos você à whitelist e verificamos on-chain...'}
            {step === 'success' && 'Tudo pronto! Verificação on-chain confirmada. Agora você pode queimar seus NFTs.'}
          </DialogDescription>
        </DialogHeader>

        {/* Steps */}
        <div className="space-y-4 py-4">
          {/* Step 1: Approve for All */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
              getApprovalState() === 'completed'
                ? 'border-green-200 bg-green-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            {renderStepIcon(getApprovalState())}
            <div className="flex-1">
              <p className={`font-medium ${
                getApprovalState() === 'completed' ? 'text-green-900' : 'text-gray-700'
              }`}>
                Approve for All
              </p>
              <p className="text-xs text-gray-600">
                {isApproved ? 'Concluído' : 'Pendente'}
              </p>
            </div>
          </motion.div>

          {/* Step 2: Whitelist */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
              getWhitelistState() === 'completed'
                ? 'border-green-200 bg-green-50'
                : getWhitelistState() === 'processing'
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            {renderStepIcon(getWhitelistState())}
            <div className="flex-1">
              <p className={`font-medium ${
                getWhitelistState() === 'completed'
                  ? 'text-green-900'
                  : getWhitelistState() === 'processing'
                  ? 'text-blue-900'
                  : 'text-gray-700'
              }`}>
                Adicionar à Whitelist
              </p>
              <p className="text-xs text-gray-600">
                {step === 'success' && 'Whitelist Aprovada (Verificado on-chain)'}
                {step === 'processing' && 'Adicionando e verificando on-chain...'}
                {step === 'pending' && 'Em Progresso'}
              </p>
            </div>
          </motion.div>

          {/* Step 3: Stake NFTs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
              getStakeState() === 'processing'
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            {renderStepIcon(getStakeState())}
            <div className="flex-1">
              <p className={`font-medium ${
                getStakeState() === 'processing' ? 'text-blue-900' : 'text-gray-700'
              }`}>
                Stake NFTs
              </p>
              <p className="text-xs text-gray-600">
                {step === 'success' ? 'Pronto para Stake' : 'Aguardando'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {step === 'pending' && (
            <Button
              onClick={handleRequestWhitelist}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              Adicionar à Whitelist
            </Button>
          )}

          {step === 'processing' && (
            <Button
              disabled
              className="w-full bg-gray-900 text-white"
              size="lg"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </Button>
          )}

          {step === 'success' && (
            <Button
              onClick={onContinue}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continuar para Queima
            </Button>
          )}

          {step !== 'processing' && (
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
