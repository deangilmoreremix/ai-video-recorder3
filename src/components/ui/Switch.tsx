import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label }) => {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        role="switch"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
        peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
        peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
        after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
        after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
      {label && <span className="sr-only">{label}</span>}
    </label>
  );
};