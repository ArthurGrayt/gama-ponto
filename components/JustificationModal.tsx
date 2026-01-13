import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2, Check } from 'lucide-react';

interface JustificationModalProps {
    onClose: () => void;
    onSubmit: (text: string, file: File | null, type: 'atraso' | 'falta') => Promise<void>;
    isOpen: boolean;
}

export const JustificationModal: React.FC<JustificationModalProps> = ({ onClose, onSubmit, isOpen }) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [justType, setJustType] = useState<'atraso' | 'falta'>('atraso');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    // ... inside handleSubmit ...
    const handleSubmit = async () => {
        if (!text.trim() && !file) {
            alert("Por favor, forneça um texto ou uma foto.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(text, file, justType);
            onClose();
        } catch (error) {
            console.error("Error submitting justification:", error);
            alert("Erro ao enviar justificativa.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Justificar Ausência</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto min-h-0">
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                        <p className="text-sm text-yellow-800 leading-snug">
                            Você está fora do raio permitido. Para registrar o ponto, é necessário justificar sua localização.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Tipo de Justificativa</label>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setJustType('atraso')}
                                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium text-sm flex items-center justify-center space-x-2 ${justType === 'atraso'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${justType === 'atraso' ? 'border-blue-600' : 'border-gray-300'}`}>
                                    {justType === 'atraso' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                </div>
                                <span>Atraso</span>
                            </button>

                            <button
                                onClick={() => setJustType('falta')}
                                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium text-sm flex items-center justify-center space-x-2 ${justType === 'falta'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${justType === 'falta' ? 'border-blue-600' : 'border-gray-300'}`}>
                                    {justType === 'falta' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                </div>
                                <span>Falta</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Motivo</label>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm min-h-[100px] resize-none"
                            placeholder="Descreva o motivo da ausência/atraso..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Foto (Opcional)</label>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                        />

                        {!previewUrl ? (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting}
                                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-400 transition-all gap-2"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Camera size={24} className="text-gray-500" />
                                </div>
                                <span className="text-sm font-medium">Tirar foto ou anexar</span>
                            </button>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"
                                    disabled={isSubmitting}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!text && !file)}
                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${isSubmitting ? 'bg-gray-300 text-gray-500 cursor-wait' :
                            (!text && !file) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                                'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Enviando...</span>
                            </>
                        ) : (
                            <>
                                <Check size={20} />
                                <span>Registrar {justType ? `(${justType === 'atraso' ? 'Atraso' : 'Falta'})` : 'e Justificar'}</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
