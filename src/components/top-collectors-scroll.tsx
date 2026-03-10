'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface Collector {
  id: number;
  walletAddress: string;
  displayName: string;
  avatarUrl: string;
  totalPoints: number;
}

export function TopCollectorsScroll() {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTopCollectors() {
      try {
        const response = await fetch('/api/top-collectors');
        if (!response.ok) throw new Error('Failed to fetch top collectors');
        const data = await response.json();
        setCollectors(data);
      } catch (error) {
        console.error('Error fetching top collectors:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTopCollectors();
  }, []);

  if (isLoading || collectors.length === 0) {
    return null;
  }

  // Duplicar collectors 4x para garantir loop suave sem interrupções
  const duplicatedCollectors = [...collectors, ...collectors, ...collectors, ...collectors];

  // Calcular largura estimada para animação suave
  // Cada item tem aproximadamente 200px de largura
  const itemWidth = 200;
  const totalWidth = collectors.length * itemWidth;

  return (
    <div className="w-full bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200">
      <div className="py-3 sm:py-4 overflow-hidden relative">
        {/* Linha superior decorativa */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

        {/* Container do scroll com gradientes nas bordas */}
        <div className="relative">
          {/* Gradiente esquerdo */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />

          {/* Scroll infinito */}
          <motion.div
            className="flex gap-4 sm:gap-6"
            animate={{
              x: [0, -totalWidth]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 80, // Animação bem lenta
                ease: "linear"
              }
            }}
          >
            {duplicatedCollectors.map((collector, index) => (
              <Link
                key={`${collector.id}-${index}`}
                href={`/${collector.username || collector.walletAddress}`}
                className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex-shrink-0 group cursor-pointer"
              >
                {/* Avatar com rank badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-gray-300 transition-colors">
                    <Image
                      src={collector.avatarUrl}
                      alt={collector.displayName}
                      width={40}
                      height={40}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {/* Rank badge apenas para os 3 primeiros em cada repetição */}
                  {(index % collectors.length) < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {(index % collectors.length) + 1}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-[150px]">
                    {collector.displayName}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-600 font-medium">
                    {collector.totalPoints.toLocaleString()} pts
                  </span>
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Gradiente direito */}
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
        </div>

        {/* Linha inferior decorativa */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    </div>
  );
}
