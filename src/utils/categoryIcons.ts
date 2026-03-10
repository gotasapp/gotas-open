export function normalizeKey(s?: string | null) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Static local icons mapping for common Brazilian clubs
const localIconByKey: Record<string, string> = {
  // Flamengo
  flamengo: '/teams/flamengo.svg',
  mengo: '/teams/flamengo.svg',
  crflamengo: '/teams/flamengo.svg',
  // Fluminense
  fluminense: '/teams/fluminense.svg',
  flu: '/teams/fluminense.svg',
  ffc: '/teams/fluminense.svg',
  // Vasco da Gama
  vasco: '/teams/vasco.svg',
  vascodagama: '/teams/vasco.svg',
  crvasco: '/teams/vasco.svg',
  // Palmeiras
  palmeiras: '/teams/palmeiras.svg',
  sep: '/teams/palmeiras.svg',
  verdão: '/teams/palmeiras.svg',
  verdao: '/teams/palmeiras.svg',
  // São Paulo FC
  saopaulo: '/teams/saopaulo.svg',
  saopaulofc: '/teams/saopaulo.svg',
  spfc: '/teams/saopaulo.svg',
  // Internacional
  internacional: '/teams/internacional.svg',
  inter: '/teams/internacional.svg',
  sci: '/teams/internacional.svg',
  saci: '/teams/internacional.svg',
};

export function getLocalTeamIcon(categoryName?: string | null): string | undefined {
  const key = normalizeKey(categoryName);
  if (!key) return undefined;
  // Try direct and variants
  if (localIconByKey[key]) return localIconByKey[key];
  return undefined;
}

