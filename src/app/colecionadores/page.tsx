'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Header } from '@/components/header';
import Footer from '@/components/footer';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { getRarityDetails } from '@/lib/rarity-helpers';
import { useSearchParams, useRouter } from 'next/navigation';

type TeamId = 'all' | 'mengo' | 'flu' | 'vasco' | 'spfc' | 'verdao' | 'saci';

// Usa os mesmos tickers e ícones locais usados nos cards
const TEAMS: { id: TeamId, label: string, icon?: string }[] = [
  { id: 'all', label: 'Geral' },
  { id: 'mengo', label: 'MENGO', icon: '/teams/flamengo.svg' },
  { id: 'flu', label: 'FLU', icon: '/teams/fluminense.svg' },
  { id: 'vasco', label: 'VASCO', icon: '/teams/vasco.svg' },
  { id: 'spfc', label: 'SPFC', icon: '/teams/saopaulo.svg' },
  { id: 'verdao', label: 'VERDAO', icon: '/teams/palmeiras.svg' },
  { id: 'saci', label: 'SACI', icon: '/teams/internacional.svg' },
];

interface LeaderRow {
  id: number;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  wallet_address: string | null;
  created_at: string;
  legendary_count: string | number;
  epic_count: string | number;
  common_count: string | number;
  score: string | number;
  rank: number;
}

function CollectorsContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [top10, setTop10] = useState<LeaderRow[]>([]);
  const [meRow, setMeRow] = useState<LeaderRow | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const [detailRow, setDetailRow] = useState<LeaderRow | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedTeam = (search?.get('team') as TeamId) || 'all';

  const handleTeamChange = (team: TeamId) => {
    const params = new URLSearchParams(search?.toString() || '');
    if (team && team !== 'all') params.set('team', team);
    else params.delete('team');
    router.push(`/colecionadores${params.toString() ? `?${params.toString()}` : ''}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const wallet = user?.wallet?.address || '';
        const params = new URLSearchParams();
        if (selectedTeam) params.set('team', selectedTeam);
        if (wallet) params.set('wallet', wallet);
        const res = await fetch(`/api/leaderboard?${params.toString()}`, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTop10(data.top10 || []);
        setMeRow(data.me || null);
        setUpdatedAt(data.updatedAt || null);
      } catch (e) {
        setError('Falha ao carregar ranking.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTeam, user?.wallet?.address]);

  // Auto-scroll tabs to selected team (mobile usability)
  useEffect(() => {
    const el = itemRefs.current[selectedTeam];
    if (el && tabsContainerRef.current) {
      try {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch {
        // fallback: center via manual scroll
        const parent = tabsContainerRef.current;
        const left = el.offsetLeft - parent.clientWidth / 2 + el.clientWidth / 2;
        parent.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    }
  }, [selectedTeam, top10.length]);

  // Close drawers on ESC key (desktop UX)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (showScoringInfo) setShowScoringInfo(false);
        if (detailRow) setDetailRow(null);
      }
    };
    if (showScoringInfo || detailRow) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [showScoringInfo, detailRow]);

  const displayTeam = useMemo(() => {
    if (selectedTeam === 'all') return 'Geral';
    const t = TEAMS.find(t => t.id === selectedTeam);
    return t?.label || 'Time';
  }, [selectedTeam]);

  const ScoreBadge = ({ score, onClick }: { score: number; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full hover:bg-amber-200 transition-colors"
      title="Ver detalhes da pontuação"
    >
      {score} pts
    </button>
  );

  const RankRow = ({ row, index = 0, highlight }: { row: LeaderRow; index?: number; highlight?: boolean }) => {
    const name = row.display_name || row.username || (row.wallet_address ? `${row.wallet_address.slice(0,6)}...${row.wallet_address.slice(-4)}` : 'Usuário');
    const score = Number(row.score || 0);
    const rankLabel = row.rank ?? (index !== undefined ? index + 1 : undefined);
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(index * 0.075, 0.9) }}
        className={`flex items-center justify-between p-3 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 text-center font-bold text-gray-700">{rankLabel}</div>
          <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${row.profile_image_url ? 'bg-gray-100' : 'bg-gray-900'}`}>
            {row.profile_image_url ? (
              <img src={row.profile_image_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            {row.username ? (
              <Link href={`/${row.username}`} className="font-semibold text-gray-900 truncate hover:underline">
                {name}
              </Link>
            ) : (
              <div className="font-semibold text-gray-900 truncate">{name}</div>
            )}
          </div>
        </div>
        <ScoreBadge score={score} onClick={() => setDetailRow(row)} />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Colecionadores</h1>
            <button
              onClick={() => setShowScoringInfo(true)}
              className="text-gray-500 hover:text-gray-800"
              title="Como funciona a pontuação"
              aria-label="Como funciona a pontuação"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600">Ranking atualiza a cada 24h.</p>
        </div>

        {/* Team selector */}
        <div ref={tabsContainerRef} className="flex gap-3 overflow-x-auto pb-2 mb-8">
          {TEAMS.map(team => (
            <button
              key={team.id}
              ref={(el) => { itemRefs.current[team.id] = el; }}
              onClick={() => handleTeamChange(team.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border whitespace-nowrap min-w-[5.5rem] ${
                selectedTeam === team.id ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium">{team.label}</span>
            </button>
          ))}
        </div>

        {/* Me highlight */}
        {meRow && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Sua posição em {displayTeam}</h2>
            <RankRow row={meRow} highlight />
          </div>
        )}

        {/* Top 10 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Top 10 • {displayTeam}</h2>
          {updatedAt && (
            <>
              <span className="hidden sm:inline text-xs text-gray-500">Atualizado: {new Date(updatedAt).toLocaleString('pt-BR')}</span>
              <button
                className="sm:hidden text-gray-500 hover:text-gray-800"
                onClick={() => toast(`Atualizado: ${new Date(updatedAt).toLocaleString('pt-BR')}`)}
                aria-label="Ver data de atualização"
                title="Ver data de atualização"
              >
                <Info className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : top10.length === 0 ? (
          <div className="text-center text-gray-500">Nenhum colecionador encontrado.</div>
        ) : (
          <div className="space-y-3">
            {top10.map((row, idx) => (
              <RankRow key={`${row.id}-${idx}`} row={row} index={idx} />
            ))}
          </div>
        )}
      </main>
      {/* Drawer: Como funciona a pontuação */}
      <Sheet open={showScoringInfo} onOpenChange={setShowScoringInfo}>
        <SheetContent side="bottom" className="sm:max-w-2xl sm:left-1/2 sm:-translate-x-1/2">
          <SheetHeader>
            <SheetTitle>Como funciona a pontuação</SheetTitle>
            <SheetDescription>
              Cada card vale pontos conforme a sua raridade:
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            {[
              { key: 'legendary', label: 'Lendário', points: 10 },
              { key: 'epic', label: 'Épico', points: 2 },
              { key: 'common', label: 'Comum', points: 1 },
            ].map(({ key, label, points }) => {
              const info = getRarityDetails(key);
              const Icon = info.icon;
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-md border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${info.className}`}>
                      <Icon className="w-3 h-3" /> {label}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{points} pontos</div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer: Detalhes da pontuação do usuário */}
      <Sheet open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <SheetContent side="bottom" className="sm:max-w-2xl sm:left-1/2 sm:-translate-x-1/2">
          <SheetHeader>
            <SheetTitle>Detalhes da pontuação</SheetTitle>
            {detailRow && (
              <SheetDescription>
                {detailRow.display_name || detailRow.username || 'Usuário'}
              </SheetDescription>
            )}
          </SheetHeader>
          {detailRow && (() => {
            const legendary = Number(detailRow.legendary_count || 0);
            const epic = Number(detailRow.epic_count || 0);
            const common = Number(detailRow.common_count || 0);
            const items = [
              { key: 'legendary', label: 'Lendário', count: legendary, pointsEach: 10 },
              { key: 'epic', label: 'Épico', count: epic, pointsEach: 2 },
              { key: 'common', label: 'Comum', count: common, pointsEach: 1 },
            ];
            const rows = items.map(({ key, label, count, pointsEach }) => {
              const total = count * pointsEach;
              const info = getRarityDetails(key);
              const Icon = info.icon;
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-md border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${info.className}`}>
                      <Icon className="w-3 h-3" /> {label}
                    </span>
                    <span className="text-sm text-gray-700">{count} cards</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{count} × {pointsEach} = {total} pts</div>
                </div>
              );
            });
            const totalScore = Number(detailRow.score || 0);
            return (
              <div className="space-y-3 mt-4">
                {rows}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm font-semibold text-gray-700">Total</div>
                  <div className="text-sm font-bold text-gray-900">{totalScore} pts</div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
      <Footer />
    </div>
  );
}

export default function CollectorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CollectorsContent />
    </Suspense>
  );
}
