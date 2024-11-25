import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'left' | 'right';
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  className,
  position = 'left'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative h-full transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        position === 'right' ? "border-l" : "border-r",
        "border-gray-200 bg-white",
        className
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-4 bg-white rounded-full p-1.5 shadow-lg border border-gray-200",
          position === 'right' ? "-left-4" : "-right-4"
        )}
      >
        {position === 'right' ? (
          isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : (
          isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      <div className={cn(
        "h-full overflow-y-auto",
        isCollapsed ? "px-2" : "px-4",
        "py-4"
      )}>
        {children}
      </div>
    </div>
  );
};