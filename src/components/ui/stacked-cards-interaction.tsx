"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { OptimizedImage } from "./optimized-image";

const Card = ({
className,
image,
children,
}: {
className?: string;
image?: string;
children?: React.ReactNode;
}) => {
return (
  <div
    className={cn(
      "w-full aspect-square cursor-pointer overflow-hidden bg-white rounded-2xl shadow-[0_0_10px_rgba(0,0,0,0.02)] border border-gray-200/80",
      className
    )}
  >
    {image && (
      <OptimizedImage
        src={image}
        alt="card"
        className="h-[calc(100%-0.5rem)] rounded-xl shadow-lg w-[calc(100%-0.5rem)] m-1"
        aspectRatio="square"
        placeholder="skeleton"
      />
    )}
  </div>
);
};

interface CardData {
image: string;
title: string;
description: string;
}

const StackedCardsInteraction = ({
cards,
spreadDistance = 80,
rotationAngle = 5,
animationDelay = 0.1,
}: {
cards: CardData[];
spreadDistance?: number;
rotationAngle?: number;
animationDelay?: number;
}) => {
const [isHovering, setIsHovering] = useState(false);

// Limit to maximum of 3 cards
const limitedCards = cards.slice(0, 3);

return (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="relative w-full aspect-square">
      {limitedCards.map((card, index) => {
        const isFirst = index === 0;

        let xOffset = 0;
        let rotation = 0;

        if (limitedCards.length > 1) {
          // First card stays in place
          // Second card goes left
          // Third card goes right
          if (index === 1) {
            xOffset = -spreadDistance;
            rotation = -rotationAngle;
          } else if (index === 2) {
            xOffset = spreadDistance;
            rotation = rotationAngle;
          }
        }

        return (
          <motion.div
            key={index}
            className={cn("absolute inset-0", isFirst ? "z-10" : "z-0")}
            initial={{ x: 0, rotate: 0 }}
            animate={{
              x: isHovering ? xOffset : 0,
              rotate: isHovering ? rotation : 0,
              zIndex: isFirst ? 10 : 0,
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
              delay: index * animationDelay,
              type: "spring",
            }}
            {...(isFirst && {
              onHoverStart: () => setIsHovering(true),
              onHoverEnd: () => setIsHovering(false),
            })}
          >
            <Card
              className={isFirst ? "z-10 cursor-pointer" : "z-0"}
              image={card.image}
            />
          </motion.div>
        );
      })}
    </div>
  </div>
);
};

export { StackedCardsInteraction, Card };