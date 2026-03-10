export {};

declare global {
  interface Window {
    __sociosWalletInterceptor?: {
      enable: (options?: { onUnsupportedWallet?: (walletName: string) => void; timeout?: number }) => void;
      disable: () => void;
      isEnabled: () => boolean;
    };
  }
}
