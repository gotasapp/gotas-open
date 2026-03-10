'use client';

interface TeamFanTokenCardProps {
  teamName: string;
  tokenSymbol: string;
  backgroundColor: string;
}

export function TeamFanTokenCard({ 
  teamName, 
  tokenSymbol, 
  backgroundColor 
}: TeamFanTokenCardProps) {
  return (
    <div 
      className={`relative rounded-xl overflow-hidden ${backgroundColor} aspect-[4/3] flex flex-col items-center justify-center p-6`}
    >
      {/* Mobile: Texto acima, logo abaixo */}
      {/* Desktop: Texto e logo juntos no círculo */}
      
      {/* Texto - visível apenas no mobile, posicionado acima */}
      <div className="sm:hidden text-white text-center mb-4">
        <h3 className="text-xl font-bold">{tokenSymbol}</h3>
        <p className="text-sm">FAN TOKEN</p>
      </div>
      
      {/* Marca central apenas com texto (sem logo) */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full flex flex-col items-center justify-center p-4">
        <h3 className="text-base font-bold text-gray-900">{tokenSymbol}</h3>
        <p className="text-xs text-gray-600">FAN TOKEN</p>
      </div>
    </div>
  );
}

// Exemplo de uso:
export function TeamCardsGrid() {
  const teams = [
    { 
      teamName: 'Vasco', 
      tokenSymbol: '$VASCO', 
      backgroundColor: 'bg-orange-500'
    },
    { 
      teamName: 'Mengo', 
      tokenSymbol: '$MENGO', 
      backgroundColor: 'bg-black'
    },
    { 
      teamName: 'São Paulo', 
      tokenSymbol: '$SPFC', 
      backgroundColor: 'bg-red-600'
    },
    { 
      teamName: 'Fluminense', 
      tokenSymbol: '$FLU', 
      backgroundColor: 'bg-green-700'
    },
    { 
      teamName: 'Internacional', 
      tokenSymbol: '$SACI', 
      backgroundColor: 'bg-red-500'
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {teams.map((team) => (
        <TeamFanTokenCard key={team.tokenSymbol} {...team} />
      ))}
    </div>
  );
} 
