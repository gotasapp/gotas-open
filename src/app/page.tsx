'use client';
import { Header } from "@/components/header";
import { ShuffleHero } from "@/components/ui/shuffle-grid";
import { TopCollectorsScroll } from "@/components/top-collectors-scroll";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <TopCollectorsScroll />
      <main className="flex-grow flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
{/* TODO: Reativar banner Queimar Cards quando necessário
          <div className="relative overflow-hidden rounded-2xl bg-gray-900 text-white shadow-lg mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-0" />
            <div className="absolute inset-0 overflow-hidden z-0 opacity-60">
              <div className="absolute bottom-[-20%] left-[10%] w-[40%] h-[80%] bg-orange-500/50 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[80%] bg-red-600/50 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />
            </div>

            <div className="relative p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 z-10">
              <div className="text-center md:text-left space-y-2 max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Queimar Cards
                </h1>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Transforme seus cards em recompensas exclusivas. Queime seus ativos digitais e receba CHZ.
                </p>
              </div>

              <div className="flex-shrink-0">
                <Link href="/burn">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white gap-2 backdrop-blur-sm text-sm h-9"
                  >
                    <span>Participar</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          */}
          <ShuffleHero />
        </div>
      </main>
    </div>
  );
}
