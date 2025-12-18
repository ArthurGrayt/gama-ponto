import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface SwipeButtonProps {
  onSuccess: () => void;
  text: string;
  disabled?: boolean;
  isLoading?: boolean;
  successMessage?: string | null; // Prop para mensagem de sucesso (ex: "Entrada Confirmada")
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({ onSuccess, text, disabled, isLoading, successMessage }) => {
  const [dragWidth, setDragWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  // Se houver mensagem de sucesso, forçamos o botão a ficar "cheio" visualmente
  const isSuccess = !!successMessage;

  const reset = () => {
    isDragging.current = false;
    setDragWidth(0);
  };

  const handleStart = (clientX: number) => {
    if (disabled || isLoading || isSuccess) return;
    isDragging.current = true;
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const maxDrag = containerWidth - 56; // 56 is handle width (14 * 4)
    const currentDrag = Math.min(Math.max(0, clientX - startX.current), maxDrag);

    setDragWidth(currentDrag);

    if (currentDrag >= maxDrag * 0.95) {
      isDragging.current = false;
      setDragWidth(maxDrag);
      onSuccess();
      // Não resetamos imediatamente aqui, o pai controlará o estado de loading/success
      setTimeout(reset, 1000);
    }
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragWidth(0);
  };

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  // Mouse Events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);

  useEffect(() => {
    const handleGlobalMouseUp = () => handleEnd();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-16 rounded-full overflow-hidden select-none touch-none transition-all duration-500
        ${isSuccess ? 'bg-ios-green shadow-green-200' : 'bg-gray-200/80'}
        ${disabled && !isSuccess ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Success State Overlay */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isSuccess ? 'opacity-100' : 'opacity-0'}`}>
        <Check className="text-white mr-2" size={24} />
        <span className="text-white font-bold text-lg tracking-wide">{successMessage}</span>
      </div>

      {/* Normal State Text */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isSuccess ? 'opacity-0' : 'opacity-100'} pl-14`}>
        <span className="text-gray-500 font-medium text-lg animate-pulse">
          {isLoading ? 'Processando...' : text}
        </span>
      </div>

      {/* Handle (Hidden on Success) */}
      <div
        style={{
          transform: `translateX(${isSuccess ? '1000px' : dragWidth}px)`,
          opacity: isSuccess ? 0 : 1
        }}
        className="absolute left-1 top-1 w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-opacity duration-300"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={onMouseDown}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-ios-blue rounded-full animate-spin" />
        ) : (
          <ChevronRight className="text-gray-400" size={24} />
        )}
      </div>
    </div>
  );
};