import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  maxHeight?: string;
  className?: string;
  preventBackdropClose?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  showCloseButton = false,
  maxHeight = '90vh',
  className = '',
  preventBackdropClose = false,
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      triggerHaptic('light');
      onClose();
    }
  };

  // Handle touch events for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    // Only allow downward swipes
    if (deltaY > 0) {
      const sheet = sheetRef.current;
      sheet.style.transform = `translateY(${deltaY}px)`;
      sheet.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !sheetRef.current) return;
    
    const deltaY = currentY.current - startY.current;
    const sheet = sheetRef.current;
    
    // Reset transition
    sheet.style.transition = 'transform 0.3s ease-out';
    
    // Close if swiped down more than 100px
    if (deltaY > 100) {
      triggerHaptic('medium');
      onClose();
    } else {
      // Snap back to original position
      sheet.style.transform = 'translateY(0)';
    }
    
    isDragging.current = false;
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 opacity-100" />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`
          relative w-full bg-white rounded-t-2xl shadow-2xl
          transform transition-transform duration-300 ease-out translate-y-0
          ${className}
        `}
        style={{ 
          maxHeight,
          paddingBottom: 'calc(16px + var(--safe-area-inset-bottom))'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        {showHandle && (
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2 mb-1" />
        )}
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 flex-1 text-center">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="icon-btn text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// Utility hook for bottom sheet state management
export const useBottomSheet = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);
  
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
};

export default BottomSheet;