import React from 'react';
import { cn } from '../../utils/cn';

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  isFloating?: boolean;
  'aria-label'?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className,
  position = 'top',
  isFloating = false,
  'aria-label': ariaLabel
}) => {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-2 p-2",
        isFloating && "bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-gray-200",
        position === 'bottom' ? "mt-auto" : "mb-auto",
        className
      )}
    >
      {children}
    </div>
  );
};