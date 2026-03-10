import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface HowItWorksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-white text-gray-900 border-gray-200">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center mb-6">Como funciona a Queima?</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-900 border border-gray-200">1</div>
                        <p className="text-sm text-gray-600">Selecione os cards que deseja queimar da sua coleção.</p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-900 border border-gray-200">2</div>
                        <p className="text-sm text-gray-600">Aprove a transação e confirme a queima dos ativos.</p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-900 border border-gray-200">3</div>
                        <p className="text-sm text-gray-600">Receba recompensas em CHZ automaticamente acumuladas.</p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-900 border border-gray-200">4</div>
                        <p className="text-sm text-gray-600">Resgate seus ganhos para sua carteira quando quiser.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
