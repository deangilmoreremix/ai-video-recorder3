import React, { useEffect, useId, useRef, useState } from 'react';

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
  const timeoutRef = useRef<number>();
  const tooltipId = useId();

  const clearPendingShow = () => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  };

  // Never leave a pending timer behind (it would call setState after unmount)
  useEffect(() => clearPendingShow, []);

  const handleShow = () => {
    clearPendingShow();
    if (delay > 0) {
      timeoutRef.current = window.setTimeout(() => setShow(true), delay);
    } else {
      setShow(true);
    }
  };

  const handleHide = () => {
    clearPendingShow();
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
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      aria-describedby={show ? tooltipId : undefined}
    >
      {children}
      {show && (
        <div 
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 pointer-events-none ${positionClasses[position]}`}
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
              aria-hidden="true"
              className={`absolute w-3 h-3 border-4 border-transparent ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};