import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface FloatingPanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  children,
  isOpen,
  onClose,
  position = 'bottom-right',
  className
}) => {
  const positions = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300 transform",
        positions[position],
        isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        "bg-white/80 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200",
        className
      )}
    >
      <div className="absolute top-2 right-2">
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};