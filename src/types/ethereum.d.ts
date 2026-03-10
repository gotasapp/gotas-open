// src/types/ethereum.d.ts
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
      chainId?: string; // Adicionando chainId que pode ser retornado
      _metamask?: { isUnlocked: () => Promise<boolean> }; // Específico do MetaMask
      isRabby?: boolean; // Específico do Rabby
      // Adicionar outras propriedades comuns se necessário
    };
  }
}

// Exportar algo para garantir que seja tratado como um módulo
export {}; 