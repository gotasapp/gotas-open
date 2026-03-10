"use client"

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const ShuffleHero = () => {
  return (
    <section className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-12 grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
      <div className="order-2 lg:order-1">
        <span className="block mb-4 text-xs md:text-sm text-primary font-medium">
          Cards do futebol
        </span>
        <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground">
          Colecione cards digitais exclusivos
        </h3>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground my-4 md:my-6">
          Os Cards do Futebol transformam os jogadores do elenco principal em colecionáveis digitais exclusivos para você colecionar e negociar. É a emoção do campeonato direto na blockchain! Faça staking dos Fan Tokens™️ do seu time e receba até três cards digitais do mesmo clube por dia, até o fim da temporada. Cada card é único, combinações geradas por inteligência artificial garantem que não exista outro igual.
        </p>
        <Link 
          href="/mints"
          className={cn(
            "inline-block bg-primary text-primary-foreground font-medium py-2 px-4 rounded-md",
            "transition-all hover:bg-primary/90 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          Resgatar cards
        </Link>
      </div>
      <div className="order-1 lg:order-2 w-full">
        <ShuffleGrid />
      </div>
    </section>
  );
};

const shuffle = (array: (typeof squareData)[0][]) => {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};

const squareData = [
  {
    id: 1,
    src: "/exports/GRID-1.webp",
  },
  {
    id: 2,
    src: "/exports/GRID-2.webp",
  },
  {
    id: 3,
    src: "/exports/GRID-3.webp",
  },
  {
    id: 4,
    src: "/exports/GRID-4.webp",
  },
  {
    id: 5,
    src: "/exports/GRID-5.webp",
  },
  {
    id: 6,
    src: "/exports/GRID-6.webp",
  },
  {
    id: 7,
    src: "/exports/GRID-14.webp",
  },
  {
    id: 8,
    src: "/exports/GRID-8.webp",
  },
  {
    id: 9,
    src: "/exports/GRID-9.webp",
  },
  {
    id: 10,
    src: "/exports/GRID-10.webp",
  },
  {
    id: 11,
    src: "/exports/GRID-14.webp",
  },
  {
    id: 12,
    src: "/exports/GRID-12.webp",
  },
  {
    id: 13,
    src: "/exports/GRID-13.webp",
  },
  {
    id: 14,
    src: "/exports/GRID-14.webp",
  },
  {
    id: 15,
    src: "/exports/GRID-15.webp",
  },
  {
    id: 16,
    src: "/exports/GRID-16.webp",
  },
];

const generateSquares = () => {
  return shuffle(squareData).map((sq) => (
    <motion.div
      key={sq.id}
      layout
      transition={{ duration: 1.5, type: "spring" }}
      className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-muted"
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${sq.src})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </motion.div>
  ));
};

const ShuffleGrid = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [squares, setSquares] = useState<React.ReactElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Gerar squares apenas no cliente para evitar erro de hidratação
    shuffleSquares();
    setIsLoading(false);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const shuffleSquares = () => {
    setSquares(generateSquares());

    timeoutRef.current = setTimeout(shuffleSquares, 3000);
  };

  // Mostrar skeleton enquanto carrega
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, index) => (
          <div
            key={index}
            className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {squares.map((sq) => sq)}
    </div>
  );
}; 