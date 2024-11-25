import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Trash2 } from 'lucide-react';
import type { EndCard } from './types';

interface EndCardPreviewProps {
  card: EndCard;
  isSelected: boolean;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onUpdate: (id: string, updates: Partial<EndCard>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  animations: Record<string, any>;
}

export const EndCardPreview: React.FC<EndCardPreviewProps> = ({
  card,
  isSelected,
  onDragStart,
  onUpdate,
  onDuplicate,
  onRemove,
  animations
}) => {
  return (
    <motion.div
      key={card.id}
      style={{
        left: `${card.position.x}%`,
        top: `${card.position.y}%`,
        width: card.size.width,
        height: card.size.height,
        transform: 'translate(-50%, -50%)',
        backgroundColor: card.style.backgroundColor,
        opacity: card.isVisible ? card.style.opacity : 0.3,
        borderRadius: card.style.borderRadius,
        color: card.style.textColor,
        zIndex: card.zIndex,
        boxShadow: card.style.shadow ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        backdropFilter: card.style.blur ? 'blur(8px)' : 'none',
        border: `${card.style.border.width}px ${card.style.border.style} ${card.style.border.color}`
      }}
      className={`absolute cursor-move group ${
        isSelected ? 'ring-2 ring-[#E44E51]' : ''
      }`}
      {...animations[card.style.animation]}
      whileHover={{
        scale: card.style.hover.scale,
        rotate: card.style.hover.rotate,
        y: card.style.hover.translateY,
        transition: { duration: 0.2 }
      }}
      onMouseDown={(e) => onDragStart(e, card.id)}
    >
      <div className="relative w-full h-full p-4">
        <div className="flex flex-col h-full">
          <h4 className="font-medium truncate">{card.title}</h4>
          {card.subtitle && (
            <p className="text-sm opacity-75 truncate">{card.subtitle}</p>
          )}
          {card.type === 'video' && (
            <div className="mt-auto text-xs">
              {Math.floor(card.duration)}s
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            <button
              onClick={() => onUpdate(card.id, { isVisible: !card.isVisible })}
              className="p-1 bg-black/50 rounded hover:bg-black/75"
            >
              {card.isVisible ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onDuplicate(card.id)}
              className="p-1 bg-black/50 rounded hover:bg-black/75"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(card.id)}
              className="p-1 bg-black/50 rounded hover:bg-black/75"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};