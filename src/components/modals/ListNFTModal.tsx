'use client';

// ListNFTModal desabilitado - pronto para reimplementação futura
interface ListNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: any | null;
  onListingSuccess?: () => void;
}

export default function ListNFTModal({ isOpen, onClose, nft, onListingSuccess }: ListNFTModalProps) {
  if (!isOpen || !nft) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center py-8">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Funcionalidade Desabilitada</h3>
          <p className="text-gray-600 mb-6">
            A funcionalidade de listagem será reimplementada em breve.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}