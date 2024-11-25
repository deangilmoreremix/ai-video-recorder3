import React, { useState, useRef, useCallback } from 'react';
import { 
  Layout, Plus, Link, Video, Box, Eye, Youtube
} from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import { EndCardPreview } from './EndCardPreview';
import { EndCardSettings } from './EndCardSettings';
import type { EndCard } from './types';

const defaultStyle = {
  backgroundColor: '#000000',
  textColor: '#ffffff',
  opacity: 0.9,
  borderRadius: 8,
  animation: 'fade' as const,
  shadow: true,
  blur: false,
  border: {
    width: 0,
    color: '#ffffff',
    style: 'solid' as const
  },
  hover: {
    scale: 1.05,
    rotate: 0,
    translateY: -5
  }
};

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slide: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 }
  },
  zoom: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 }
  },
  bounce: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { type: "spring" } },
    exit: { y: 100, opacity: 0 }
  }
};

export const EndCards: React.FC = () => {
  const [endCards, setEndCards] = useState<EndCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const addEndCard = useCallback((type: EndCard['type']) => {
    const newCard: EndCard = {
      id: nanoid(),
      type,
      title: `New ${type} card`,
      subtitle: '',
      url: '',
      duration: 20,
      position: { x: 50, y: 50 },
      size: { width: 200, height: type === 'subscribe' ? 100 : 150 },
      style: defaultStyle,
      isVisible: true,
      zIndex: endCards.length
    };
    setEndCards(prev => [...prev, newCard]);
    setSelectedCard(newCard.id);
  }, [endCards.length]);

  const updateEndCard = useCallback((id: string, updates: Partial<EndCard>) => {
    setEndCards(cards => 
      cards.map(card => card.id === id ? { ...card, ...updates } : card)
    );
  }, []);

  const duplicateEndCard = useCallback((id: string) => {
    const card = endCards.find(c => c.id === id);
    if (!card) return;

    const newCard: EndCard = {
      ...card,
      id: nanoid(),
      title: `${card.title} (Copy)`,
      position: {
        x: card.position.x + 10,
        y: card.position.y + 10
      },
      zIndex: endCards.length
    };
    setEndCards(prev => [...prev, newCard]);
    setSelectedCard(newCard.id);
  }, [endCards]);

  const removeEndCard = useCallback((id: string) => {
    setEndCards(cards => cards.filter(card => card.id !== id));
    if (selectedCard === id) setSelectedCard(null);
  }, [selectedCard]);

  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (!previewRef.current) return;

    const card = endCards.find(c => c.id === id);
    if (!card) return;

    const rect = previewRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - (rect.left + (rect.width * card.position.x / 100)),
      y: e.clientY - (rect.top + (rect.height * card.position.y / 100))
    });
    setIsDragging(true);
    setSelectedCard(id);

    setEndCards(cards => {
      const maxZ = Math.max(...cards.map(c => c.zIndex));
      return cards.map(c => 
        c.id === id ? { ...c, zIndex: maxZ + 1 } : c
      );
    });
  }, [endCards]);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedCard || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
    const y = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;

    updateEndCard(selectedCard, {
      position: {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      }
    });
  }, [isDragging, selectedCard, dragOffset.x, dragOffset.y, updateEndCard]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">End Cards</h3>
        <div className="flex space-x-2">
          <Tooltip content="Toggle preview mode">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-lg ${
                showPreview ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Eye className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle grid">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg ${
                showGrid ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Layout className="w-5 h-5" />
            </button>
          </Tooltip>
          <div className="flex space-x-1 border-l pl-2">
            {[
              { type: 'video', icon: Video, tooltip: 'Add video end card' },
              { type: 'playlist', icon: Layout, tooltip: 'Add playlist end card' },
              { type: 'subscribe', icon: Youtube, tooltip: 'Add subscribe button' },
              { type: 'link', icon: Link, tooltip: 'Add custom link' },
              { type: 'custom', icon: Box, tooltip: 'Add custom element' }
            ].map(({ type, icon: Icon, tooltip }) => (
              <Tooltip key={type} content={tooltip}>
                <button
                  onClick={() => addEndCard(type as EndCard['type'])}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icon className="w-5 h-5" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div
        ref={previewRef}
        className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4"
        onMouseMove={handleDrag}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {showGrid && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/10" />
            ))}
          </div>
        )}

        <AnimatePresence>
          {endCards.map((card) => (
            <EndCardPreview
              key={card.id}
              card={card}
              isSelected={selectedCard === card.id}
              onDragStart={handleDragStart}
              onUpdate={updateEndCard}
              onDuplicate={duplicateEndCard}
              onRemove={removeEndCard}
              animations={animations}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {selectedCard && (
          <EndCardSettings
            card={endCards.find(c => c.id === selectedCard)!}
            onUpdate={updateEndCard}
            onRemove={removeEndCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
};