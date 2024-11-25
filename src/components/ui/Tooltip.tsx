import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 0,
  maxWidth = '300px'
}) => {
  const [show, setShow] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number>();

  const handleMouseEnter = () => {
    const id = window.setTimeout(() => setShow(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setShow(false);
  };

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
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div 
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ maxWidth }}
        >
          <div className="relative">
            <div className="bg-[#E44E51] text-white text-sm px-3 py-2 rounded shadow-lg">
              {content.split('\n').map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>
            <div 
              className={`absolute w-3 h-3 border-4 border-transparent ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};