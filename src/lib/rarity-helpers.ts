import { Sparkles, Crown, Diamond, Star, Shield, Gem } from 'lucide-react';

export type Rarity = 'common' | 'epic' | 'legendary' | 'Comum' | 'Épico' | 'Lendário';

export const rarityDetails = {
  common: {
    label: 'Comum',
    icon: Shield,
    className: 'bg-black text-white',
  },
  'Comum': {
    label: 'Comum',
    icon: Shield,
    className: 'bg-black text-white',
  },
  epic: {
    label: 'Épico',
    icon: Diamond,
    className: 'bg-purple-600 text-white',
  },
  'Épico': {
    label: 'Épico',
    icon: Diamond,
    className: 'bg-purple-600 text-white',
  },
  legendary: {
    label: 'Lendário',
    icon: Sparkles,
    className: 'bg-yellow-400 text-black',
  },
  'Lendário': {
    label: 'Lendário',
    icon: Sparkles,
    className: 'bg-yellow-400 text-black',
  }
};

export const getRarityDetails = (rarity: string | null | undefined) => {
  const rarityKey = (rarity || 'common') as Rarity;
  return rarityDetails[rarityKey] || rarityDetails.common;
}; 