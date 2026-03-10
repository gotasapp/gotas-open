'use client';

import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Mail, RefreshCw, X } from 'lucide-react';

interface WhitelistErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function WhitelistErrorModal({
  open,
  onOpenChange,
  onRetry
}: WhitelistErrorModalProps) {
  const supportEmail = 'support@gotas.social';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Wallet Não Autorizada
          </DialogTitle>
          <DialogDescription>
            Sua wallet não está apta para resgatar recompensas.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-6 border-2 border-orange-200 bg-orange-50 shadow-none">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-900">
                  Acesso Restrito
                </h3>
                <p className="text-sm text-orange-800">
                  Esta wallet não tem permissão para resgatar recompensas do sistema de burn.
                </p>
              </div>

              {/* Contact Info */}
              <div className="w-full space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 text-sm text-orange-900">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Entre em contato</span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-orange-900 font-mono">
                    {supportEmail}
                  </code>
                  <Button
                    onClick={handleCopyEmail}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 hover:bg-orange-100 text-orange-900"
                  >
                    Copiar
                  </Button>
                </div>

                <p className="text-xs text-orange-700">
                  Nossa equipe irá orientá-lo sobre como resolver esta situação.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              onRetry();
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>

        {/* Info Footer */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            Este controle existe para garantir a segurança e integridade do sistema de recompensas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
