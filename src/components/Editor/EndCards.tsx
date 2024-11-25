import React, { useState, useRef } from 'react';
import { 
  Layout, Plus, Link, Image, Video, Clock, Move, Settings, Palette, Trash2,
  ChevronRight, ChevronLeft, Play, Pause, Eye, EyeOff, Copy, Layers,
  Youtube, ExternalLink, Maximize2, Minimize2, Box, Sparkles, Wand2
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';

interface EndCard {
  id: string;
  type: 'video' | 'playlist' | 'subscribe' | 'link' | 'custom';
  title: string;
  subtitle?: string;
  url: string;
  thumbnail?: string;
  duration: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    backgroundColor: string;
    textColor: string;
    opacity: number;
    borderRadius: number;
    animation: 'fade' | 'slide' | 'zoom' | 'bounce';
    shadow: boolean;
    blur: boolean;
    border: {
      width: number;
      color: string;
      style: 'solid' | 'dashed' | 'dotted';
    };
    hover: {
      scale: number;
      rotate: number;
      translateY: number;
    };
  };
  isVisible: boolean;
  zIndex: number;
}

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

export const EndCards: React.FC = () => {
  const [endCards, setEndCards] = useState<EndCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const addEndCard = (type: EndCard['type']) => {
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
    setEndCards([...endCards, newCard]);
    setSelectedCard(newCard.id);
  };

  const updateEndCard = (id: string, updates: Partial<EndCard>) => {
    setEndCards(cards => 
      cards.map(card => card.id === id ? { ...card, ...updates } : card)
    );
  };

  const duplicateEndCard = (id: string) => {
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
    setEndCards([...endCards, newCard]);
    setSelectedCard(newCard.id);
  };

  const removeEndCard = (id: string) => {
    setEndCards(cards => cards.filter(card => card.id !== id));
    if (selectedCard === id) setSelectedCard(null);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
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

    // Bring card to front
    setEndCards(cards => {
      const maxZ = Math.max(...cards.map(c => c.zIndex));
      return cards.map(c => 
        c.id === id ? { ...c, zIndex: maxZ + 1 } : c
      );
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
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
            <Tooltip content="Add video end card">
              <button
                onClick={() => addEndCard('video')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Video className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content="Add playlist end card">
              <button
                onClick={() => addEndCard('playlist')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Layout className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content="Add subscribe button">
              <button
                onClick={() => addEndCard('subscribe')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Youtube className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content="Add custom link">
              <button
                onClick={() => addEndCard('link')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Link className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content="Add custom element">
              <button
                onClick={() => addEndCard('custom')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Box className="w-5 h-5" />
              </button>
            </Tooltip>
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
              <div
                key={i}
                className="border border-white/10"
              />
            ))}
          </div>
        )}

        <AnimatePresence>
          {endCards.map((card) => (
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
              className={`absolute cursor-move ${
                selectedCard === card.id ? 'ring-2 ring-[#E44E51]' : ''
              }`}
              {...animations[card.style.animation]}
              whileHover={{
                scale: card.style.hover.scale,
                rotate: card.style.hover.rotate,
                y: card.style.hover.translateY,
                transition: { duration: 0.2 }
              }}
              onMouseDown={(e) => handleDragStart(e as any, card.id)}
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
                      onClick={() => updateEndCard(card.id, { 
                        isVisible: !card.isVisible 
                      })}
                      className="p-1 bg-black/50 rounded hover:bg-black/75"
                    >
                      {card.isVisible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => duplicateEndCard(card.id)}
                      className="p-1 bg-black/50 rounded hover:bg-black/75"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeEndCard(card.id)}
                      className="p-1 bg-black/50 rounded hover:bg-black/75"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 p-4 bg-gray-50 rounded-lg overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Card Settings</h4>
              <button
                onClick={() => removeEndCard(selectedCard)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={endCards.find(c => c.id === selectedCard)?.title}
                  onChange={(e) => updateEndCard(selectedCard, { title: e.target.value })}
                  className="w-full rounded-lg border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={endCards.find(c => c.id === selectedCard)?.subtitle}
                  onChange={(e) => updateEndCard(selectedCard, { subtitle: e.target.value })}
                  className="w-full rounded-lg border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={endCards.find(c => c.id === selectedCard)?.url}
                  onChange={(e) => updateEndCard(selectedCard, { url: e.target.value })}
                  className="flex-1 rounded-lg border-gray-300"
                  placeholder="https://"
                />
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={endCards.find(c => c.id === selectedCard)?.duration}
                onChange={(e) => updateEndCard(selectedCard, { 
                  duration: parseInt(e.target.value) 
                })}
                className="w-full accent-[#E44E51]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5s</span>
                <span>{endCards.find(c => c.id === selectedCard)?.duration}s</span>
                <span>30s</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Animation
              </label>
              <select
                value={endCards.find(c => c.id === selectedCard)?.style.animation}
                onChange={(e) => updateEndCard(selectedCard, {
                  style: {
                    ...endCards.find(c => c.id === selectedCard)?.style!,
                    animation: e.target.value as EndCard['style']['animation']
                  }
                })}
                className="w-full rounded-lg border-gray-300"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <input
                  type="color"
                  value={endCards.find(c => c.id === selectedCard)?.style.backgroundColor}
                  onChange={(e) => updateEndCard(selectedCard, {
                    style: {
                      ...endCards.find(c => c.id === selectedCard)?.style!,
                      backgroundColor: e.target.value
                    }
                  })}
                  className="w-full h-8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  value={endCards.find(c => c.id === selectedCard)?.style.textColor}
                  onChange={(e) => updateEndCard(selectedCard, {
                    style: {
                      ...endCards.find(c => c.id === selectedCard)?.style!,
                      textColor: e.target.value
                    }
                  })}
                  className="w-full h-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Effects
              </label>
              <div className="flex flex-wrap gap-2">
                <Tooltip content="Toggle shadow effect">
                  <button
                    onClick={() => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          style: {
                            ...card.style,
                            shadow: !card.style.shadow
                          }
                        });
                      }
                    }}
                    className={`p-2 rounded-lg ${
                      endCards.find(c => c.id === selectedCard)?.style.shadow
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Toggle blur effect">
                  <button
                    onClick={() => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          style: {
                            ...card.style,
                            blur: !card.style.blur
                          }
                        });
                      }
                    }}
                    className={`p-2 rounded-lg ${
                      endCards.find(c => c.id === selectedCard)?.style.blur
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Width</label>
                  <input
                    type="number"
                    value={endCards.find(c => c.id === selectedCard)?.size.width}
                    onChange={(e) => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          size: {
                            ...card.size,
                            width: parseInt(e.target.value)
                          }
                        });
                      }
                    }}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Height</label>
                  <input
                    type="number"
                    value={endCards.find(c => c.id === selectedCard)?.size.height}
                    onChange={(e) => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          size: {
                            ...card.size,
                            height: parseInt(e.target.value)
                          }
                        });
                      }
                    }}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Border
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Width"
                  value={endCards.find(c => c.id === selectedCard)?.style.border.width}
                  onChange={(e) => {
                    const card = endCards.find(c => c.id === selectedCard);
                    if (card) {
                      updateEndCard(selectedCard, {
                        style: {
                          ...card.style,
                          border: {
                            ...card.style.border,
                            width: parseInt(e.target.value)
                          }
                        }
                      });
                    }
                  }}
                  className="rounded-lg border-gray-300"
                />
                <select
                  value={endCards.find(c => c.id === selectedCard)?.style.border.style}
                  onChange={(e) => {
                    const card = endCards.find(c => c.id === selectedCard);
                    if (card) {
                      updateEndCard(selectedCard, {
                        style: {
                          ...card.style,
                          border: {
                            ...card.style.border,
                            style: e.target.value as 'solid' | 'dashed' | 'dotted'
                          }
                        }
                      });
                    }
                  }}
                  className="rounded-lg border-gray-300"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
                <input
                  type="color"
                  value={endCards.find(c => c.id === selectedCard)?.style.border.color}
                  onChange={(e) => {
                    const card = endCards.find(c => c.id === selectedCard);
                    if (card) {
                      updateEndCard(selectedCard, {
                        style: {
                          ...card.style,
                          border: {
                            ...card.style.border,
                            color: e.target.value
                          }
                        }
                      });
                    }
                  }}
                  className="w-full h-9 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hover Animation
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Scale</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="1.5"
                    value={endCards.find(c => c.id === selectedCard)?.style.hover.scale}
                    onChange={(e) => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          style: {
                            ...card.style,
                            hover: {
                              ...card.style.hover,
                              scale: parseFloat(e.target.value)
                            }
                          }
                        });
                      }
                    }}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rotate</label>
                  <input
                    type="number"
                    step="1"
                    min="-180"
                    max="180"
                    value={endCards.find(c => c.id === selectedCard)?.style.hover.rotate}
                    onChange={(e) => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          style: {
                            ...card.style,
                            hover: {
                              ...card.style.hover,
                              rotate: parseInt(e.target.value)
                            }
                          }
                        });
                      }
                    }}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Lift</label>
                  <input
                    type="number"
                    step="1"
                    min="-50"
                    max="50"
                    value={endCards.find(c => c.id === selectedCard)?.style.hover.translateY}
                    onChange={(e) => {
                      const card = endCards.find(c => c.id === selectedCard);
                      if (card) {
                        updateEndCard(selectedCard, {
                          style: {
                            ...card.style,
                            hover: {
                              ...card.style.hover,
                              translateY: parseInt(e.target.value)
                            }
                          }
                        });
                      }
                    }}
                    className="w-full rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};