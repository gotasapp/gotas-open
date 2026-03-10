'use client';

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransactionStep = 'approval' | 'staking' | 'complete';
export type StepStatus = 'pending' | 'active' | 'success' | 'error';

interface TransactionFeedbackProps {
  currentStep: TransactionStep;
  approvalStatus: StepStatus;
  stakingStatus: StepStatus;
  error?: string;
  className?: string;
}

export function TransactionFeedback({
  currentStep,
  approvalStatus,
  stakingStatus,
  error,
  className,
}: TransactionFeedbackProps) {
  const steps = [
    {
      id: 'approval' as TransactionStep,
      label: 'Aprovando NFT',
      description: 'Aguardando aprovação na carteira...',
      status: approvalStatus,
    },
    {
      id: 'staking' as TransactionStep,
      label: 'Fazendo Stake',
      description: 'Enviando NFT para stake...',
      status: stakingStatus,
    },
  ];

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'active':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStepIcon(step.status)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium",
              step.status === 'active' && "text-primary",
              step.status === 'success' && "text-green-600",
              step.status === 'error' && "text-red-600",
              step.status === 'pending' && "text-gray-400"
            )}>
              {step.label}
            </p>
            {step.status === 'active' && (
              <p className="text-xs text-gray-500 mt-0.5">
                {step.description}
              </p>
            )}
            {step.status === 'success' && (
              <p className="text-xs text-green-600 mt-0.5">
                Concluído com sucesso
              </p>
            )}
          </div>
        </div>
      ))}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Erro na transação</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'complete' && !error && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Stake realizado!</p>
              <p className="text-xs text-green-600 mt-1">
                Seu NFT foi enviado para stake com sucesso
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
