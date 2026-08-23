
import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  roundedClass?: string;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({ 
  children, 
  onDelete, 
  disabled = false,
  roundedClass = "rounded-[2.5rem]" 
}) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Limite para confirmar a exclusão automática (full swipe)
  const THRESHOLD_DELETE = -200;
  // Limite para travar o botão de exclusão
  const THRESHOLD_OPEN = -80;

  if (disabled) return <div className={`relative overflow-hidden ${roundedClass}`}>{children}</div>;

  const handleStart = (clientX: number) => {
    if (isDeleting) return;
    setStartX(clientX - currentX);
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (isDeleting || !isSwiping) return;
    const deltaX = clientX - startX;
    
    // Só permite deslizar para a esquerda (valores negativos)
    if (deltaX <= 0) {
      setCurrentX(deltaX);
    } else {
      setCurrentX(0);
    }
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    setIsMouseDown(false);
    
    // Se o arraste for muito longo, deleta automaticamente (Full Swipe)
    if (currentX < THRESHOLD_DELETE) {
      triggerDelete();
    } 
    // Se passar da metade do caminho do botão, mantém aberto
    else if (currentX < -40) {
      setCurrentX(THRESHOLD_OPEN);
    } 
    // Senão, fecha
    else {
      setCurrentX(0);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  const onMouseDown = (e: React.MouseEvent) => {
    setIsMouseDown(true);
    handleStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown) handleMove(e.clientX);
  };
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => {
    if (isMouseDown) handleEnd();
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    setCurrentX(-window.innerWidth); // Anima para fora da tela
    
    // Pequeno atraso para a animação completar antes de remover do estado
    setTimeout(() => {
      onDelete();
      setIsDeleting(false);
      setCurrentX(0);
    }, 300);
  };

  return (
    <div 
      className={`relative overflow-hidden ${roundedClass} group bg-app-red transition-all duration-300 ${isDeleting ? 'h-0 opacity-0 mb-0' : 'h-auto mb-4'}`}
    >
      {/* Camada de Ação (Atrás do conteúdo) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 text-white"
        style={{ width: '100%' }}
      >
        <div 
          className="flex flex-col items-center gap-1 transition-transform"
          style={{ 
            transform: `scale(${Math.min(1.5, Math.abs(currentX) / 80)})`,
            opacity: Math.min(1, Math.abs(currentX) / 40)
          }}
        >
          <Trash2 size={24} fill={Math.abs(currentX) > 150 ? "white" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {Math.abs(currentX) > 150 ? 'Solte para Excluir' : 'Excluir'}
          </span>
        </div>
      </div>

      {/* Camada de Conteúdo (Desliza) */}
      <div 
        style={{ 
          transform: `translateX(${currentX}px)`,
        }}
        className={`relative bg-white transition-transform ${isSwiping ? 'duration-0' : 'duration-300 cubic-bezier(0.2, 0.8, 0.2, 1)'} shadow-sm cursor-grab active:cursor-grabbing`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={() => currentX !== 0 && setCurrentX(0)} // Fecha se clicar no item aberto
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;
