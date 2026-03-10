(function() {
  'use strict';

  const state = {
    enabled: false,
    callback: null,
    originalOpen: null,
    originalRequest: null,
    autoDisableTimer: null,
  };

  const nonSociosWallets = [
    'metamask', 'trust', 'coinbase', 'rainbow', 'phantom',
    'rabby', 'zerion', 'uniswap', 'safe', 'ledger'
  ];

  const walletDetection = [
    { name: 'MetaMask', pattern: /metamask/i },
    { name: 'Trust Wallet', pattern: /trust/i },
    { name: 'Coinbase', pattern: /coinbase/i },
    { name: 'Rainbow', pattern: /rainbow/i },
    { name: 'Phantom', pattern: /phantom/i },
    { name: 'Rabby', pattern: /rabby/i },
    { name: 'Zerion', pattern: /zerion/i }
  ];

  function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }

  function notifyUnsupported(walletName) {
    if (typeof state.callback === 'function') {
      try {
        state.callback(walletName);
      } catch (err) {
        console.error('[SociosInterceptor] Callback error:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('walletNotSupported', {
      detail: { walletName }
    }));
  }

  function wrapWindowOpen() {
    if (state.originalOpen || typeof window.open !== 'function') {
      return;
    }

    state.originalOpen = window.open;
    window.open = function(url, target, features) {
      if (state.enabled && typeof url === 'string') {
        const lowered = url.toLowerCase();
        if (lowered.includes('walletconnect') || lowered.includes('wc?uri=')) {
          const detectedWallet = nonSociosWallets.find(wallet => lowered.includes(wallet));
          if (detectedWallet && !lowered.includes('socios')) {
            notifyUnsupported(detectedWallet);
            return null;
          }
        }
      }

      return state.originalOpen.call(this, url, target, features);
    };
  }

  function wrapEthereumRequest() {
    if (!window.ethereum || typeof window.ethereum.request !== 'function' || state.originalRequest) {
      return;
    }

    state.originalRequest = window.ethereum.request;
    window.ethereum.request = async function(args = {}) {
      if (
        state.enabled &&
        args &&
        (args.method === 'wallet_requestPermissions' || args.method === 'eth_requestAccounts')
      ) {
        const userAgent = navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
        const detectedWallet = walletDetection.find(wallet =>
          wallet.pattern.test(userAgent) ||
          (window.ethereum && window.ethereum[wallet.name.toLowerCase().replace(' ', '')])
        );

        if (detectedWallet && !detectedWallet.name.toLowerCase().includes('socios')) {
          notifyUnsupported(detectedWallet.name);
          throw new Error(`Wallet ${detectedWallet.name} not supported. Please use Socios Wallet.`);
        }
      }

      return state.originalRequest.call(this, args);
    };
  }

  function restoreWindowOpen() {
    if (state.originalOpen) {
      window.open = state.originalOpen;
      state.originalOpen = null;
    }
  }

  function restoreEthereumRequest() {
    if (state.originalRequest && window.ethereum && typeof window.ethereum.request === 'function') {
      window.ethereum.request = state.originalRequest;
      state.originalRequest = null;
    }
  }

  function clearAutoDisableTimer() {
    if (state.autoDisableTimer) {
      clearTimeout(state.autoDisableTimer);
      state.autoDisableTimer = null;
    }
  }

  function enable(options = {}) {
    if (!isMobileDevice()) {
      state.enabled = false;
      return;
    }

    state.callback = typeof options.onUnsupportedWallet === 'function'
      ? options.onUnsupportedWallet
      : null;

    wrapWindowOpen();
    wrapEthereumRequest();

    state.enabled = true;

    clearAutoDisableTimer();
    if (typeof options.timeout === 'number' && options.timeout > 0) {
      state.autoDisableTimer = setTimeout(disable, options.timeout);
    }
  }

  function disable() {
    state.enabled = false;
    state.callback = null;
    clearAutoDisableTimer();
    restoreWindowOpen();
    restoreEthereumRequest();
  }

  window.__sociosWalletInterceptor = {
    enable,
    disable,
    isEnabled: function() {
      return state.enabled;
    }
  };
})();
