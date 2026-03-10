'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Flame, CheckCircle, ExternalLink } from 'lucide-react';

interface BurnSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  burnedCount: number;
  chzEarned: number;
  transactionHashes?: string[];
}

export function BurnSuccessModal({
  open,
  onOpenChange,
  burnedCount,
  chzEarned,
  transactionHashes = []
}: BurnSuccessModalProps) {
  const explorerUrl = 'https://scan.chiliz.com/tx';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 opacity-50" />

        <div className="relative p-6 space-y-6">
          {/* Success Icon with Animation */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              {/* Pulse Effect */}
              <motion.div
                className="absolute inset-0 bg-green-400 rounded-full"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Queima Concluída!
            </h2>
            <p className="text-gray-600">
              {burnedCount} card{burnedCount > 1 ? 's foram queimados' : ' foi queimado'} com sucesso
            </p>
          </div>

          {/* CHZ Rewards Section */}
          {chzEarned > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="p-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl shadow-xl">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="w-8 h-8 text-white" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm text-white/90 font-medium">Você ganhou</p>
                    <motion.p
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.5 }}
                      className="text-4xl font-bold text-white drop-shadow-lg"
                    >
                      {chzEarned.toFixed(2)}
                    </motion.p>
                    <p className="text-lg text-white/95 font-semibold">CHZ</p>
                  </div>
                </div>

                {/* Confetti Effect */}
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -50 }}
                  transition={{ duration: 1.5, delay: 0.6 }}
                >
                  <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-yellow-300 rounded-full"
                        animate={{
                          x: [(i - 2) * 20, (i - 2) * 40],
                          y: [0, -60],
                          opacity: [1, 0]
                        }}
                        transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Blockchain Transactions */}
          {transactionHashes.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-600" />
                Transações na Blockchain
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {transactionHashes.map((hash, index) => (
                  <a
                    key={hash}
                    href={`${explorerUrl}/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs transition-colors group"
                  >
                    <span className="text-gray-600 font-mono truncate flex-1">
                      {hash.slice(0, 10)}...{hash.slice(-8)}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            size="lg"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
