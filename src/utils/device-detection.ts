export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

export function isMobileUserAgent(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Mobi|Android/i.test(navigator.userAgent);
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent;
  
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
} 