import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FullWidthChartWrapperProps {
  children: ReactNode;
  className?: string;
}

export function FullWidthChartWrapper({ children, className }: FullWidthChartWrapperProps) {
  return (
    <div 
      className={cn(
        "w-full", // Largura total
        "!max-w-none", // Remove qualquer limitação de largura máxima
        "!mx-0", // Remove margens horizontais
        "px-0", // Remove padding horizontal
        "[&>*]:w-full", // Força todos os filhos diretos a ter largura total
        "[&>*]:!max-w-none", // Remove limitações nos filhos
        "[&_canvas]:w-full", // Força canvas a ocupar largura total
        "[&_svg]:w-full", // Força SVG a ocupar largura total
        "[&_.max-w-]:!max-w-none", // Override classes max-w-*
        "[&_.container]:!max-w-none", // Override container
        "[&_.mx-auto]:!mx-0", // Remove centralização automática
        className
      )}
    >
      {children}
    </div>
  );
}