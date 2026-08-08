import React from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
  label
}) => {
  const sizes = {
    sm: 'w-8 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  };

  // Full class names (never build them by interpolation - Tailwind only picks
  // up literal strings, and `after:${'h-5 w-5'}` would leak a bare `w-5`
  // onto the track element).
  const handleSizes = {
    sm: 'after:h-4 after:w-4',
    md: 'after:h-5 after:w-5',
    lg: 'after:h-6 after:w-6'
  };

  return (
    <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
        className="sr-only peer"
      />
      <div className={cn(
        sizes[size],
        "bg-gray-200 peer-focus:outline-none peer-focus:ring-4",
        "peer-focus:ring-[#E44E51]/30 rounded-full peer",
        "peer-checked:after:translate-x-full peer-checked:after:border-white",
        "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
        "after:bg-white after:border-gray-300 after:border after:rounded-full",
        handleSizes[size],
        "after:transition-all",
        "peer-checked:bg-[#E44E51]",
        disabled && "opacity-50"
      )} />
      {label && <span className="sr-only">{label}</span>}
    </label>
  );
};