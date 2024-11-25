import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  isHoverable?: boolean;
  isClickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  isHoverable,
  isClickable
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-lg p-6 transition-all duration-200",
        isHoverable && "hover:shadow-xl hover:-translate-y-1",
        isClickable && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {children}
    </div>
  );
};