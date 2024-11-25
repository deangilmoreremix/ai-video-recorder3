import React from 'react';
import { cn } from '../../utils/cn';
import { GripVertical } from 'lucide-react';

interface DragHandleProps {
  className?: string;
}

export const DragHandle: React.FC<DragHandleProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "cursor-move touch-none select-none",
        "p-1 rounded hover:bg-gray-100 text-gray-400",
        className
      )}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );
};