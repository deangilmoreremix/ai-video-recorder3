import React from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className
}) => {
  const sizes = {
    sm: 'w-8 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  };

  const handleSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className={cn(
        sizes[size],
        "bg-gray-200 peer-focus:outline-none peer-focus:ring-4",
        "peer-focus:ring-[#E44E51]/30 rounded-full peer",
        "peer-checked:after:translate-x-full peer-checked:after:border-white",
        "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
        "after:bg-white after:border-gray-300 after:border after:rounded-full",
        `after:${handleSizes[size]} after:transition-all`,
        "peer-checked:bg-[#E44E51]",
        disabled && "opacity-50 cursor-not-allowed"
      )} />
    </label>
  );
};