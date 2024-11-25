import React from 'react';
import { motion } from 'framer-motion';

interface FeatureTooltipProps {
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
  title,
  description,
  position = 'top',
  children
}) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[#E44E51]',
    bottom: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-[#E44E51]',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-[#E44E51]',
    right: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-[#E44E51]'
  };

  return (
    <div className="relative group">
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`absolute z-50 ${positionClasses[position]} hidden group-hover:block`}
      >
        <div className="relative">
          <div className="bg-[#E44E51] text-white p-3 rounded-lg shadow-lg max-w-xs">
            <h4 className="font-medium mb-1">{title}</h4>
            <p className="text-sm opacity-90">{description}</p>
          </div>
          <div 
            className={`absolute w-3 h-3 border-4 border-transparent ${arrowClasses[position]}`}
          />
        </div>
      </motion.div>
    </div>
  );
};