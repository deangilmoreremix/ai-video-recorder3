import React, { useState, useRef, useCallback } from 'react';
import { 
  Film, Upload, Trash2, Edit2, Clock, Layout, Play, 
  Copy, Grid, List, Search, Filter, Settings, X,
  AlertCircle, Plus, Music, Video, Image, Eye,
  Sliders, Tag, Palette, Volume2, Crop, Move,
  RotateCcw, Save, Download, Share2, Folder, Camera,
  Wand2, Sparkles, Layers, Focus, Brain, CloudFog,
  Star, ChevronRight, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useBRollStore } from '../../../store/brollStore';
import { Tooltip } from '../../ui/Tooltip';
import { MediaPreview } from './Preview/MediaPreview';
import { AIFeatures } from './AIFeatures';

export const BRollManager: React.FC = () => {
  const {
    clips,
    collections,
    selectedClipId,
    searchQuery,
    filters,
    addClip,
    removeClip,
    updateClip,
    setSelectedClipId,
    addCollection,
    addToCollection,
    toggleFavorite,
    updateFilters,
    setSearchQuery,
    analyzeClip
  } = useBRollStore();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewClip, setPreviewClip] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIProcessing, setShowAIProcessing] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': [],
      'image/*': [],
      'audio/*': []
    },
    onDrop: async (acceptedFiles) => {
      setIsProcessing(true);
      try {
        for (const file of acceptedFiles) {
          const url = URL.createObjectURL(file);
          const type = file.type.startsWith('video') ? 'video' : 
                      file.type.startsWith('image') ? 'image' : 'audio';

          const metadata = await getFileMetadata(file);
          
          addClip({
            name: file.name,
            url,
            thumbnail: type === 'image' ? url : await generateThumbnail(file),
            duration: metadata.duration || 0,
            type,
            category: 'uncategorized',
            tags: [],
            favorite: false,
            lastUsed: new Date(),
            metadata: {
              fileSize: file.size,
              resolution: metadata.resolution || '',
              codec: file.type,
              fps: metadata.fps || 0
            },
            effects: {
              filters: [],
              transform: {
                scale: 1,
                rotate: 0,
                position: { x: 0, y: 0 }
              },
              opacity: 1,
              speed: 1,
              volume: 1
            }
          });

          if (showAIProcessing) {
            await analyzeClip(url);
          }
        }
      } catch (error) {
        console.error('Error processing files:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  });

  const getFileMetadata = async (file: File) => {
    if (file.type.startsWith('video') || file.type.startsWith('audio')) {
      return new Promise((resolve) => {
        const media = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
        media.preload = 'metadata';
        media.onloadedmetadata = () => {
          resolve({
            duration: media.duration,
            resolution: media instanceof HTMLVideoElement ? 
              `${media.videoWidth}x${media.videoHeight}` : undefined,
            fps: media instanceof HTMLVideoElement ? 30 : undefined
          });
        };
        media.src = URL.createObjectURL(file);
      });
    }

    if (file.type.startsWith('image')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            duration: 0,
            resolution: `${img.width}x${img.height}`,
            fps: 0
          });
        };
        img.src = URL.createObjectURL(file);
      });
    }

    return {};
  };

  const generateThumbnail = async (file: File): Promise<string> => {
    if (file.type.startsWith('image')) {
      return URL.createObjectURL(file);
    }

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(clips);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update store with new order
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {view === 'grid' ? (
              <Grid className="w-5 h-5" />
            ) : (
              <List className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${
              showFilters ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAIProcessing(!showAIProcessing)}
            className={`p-2 rounded-lg ${
              showAIProcessing ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
            }`}
          >
            <Brain className="w-5 h-5" />
          </button>
          <button
            onClick={() => addCollection('New Collection')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Folder className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Filter content */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => updateFilters({ category: e.target.value })}
                      className="w-full rounded-lg border-gray-300"
                    >
                      <option value="all">All Categories</option>
                      <option value="b-roll">B-Roll</option>
                      <option value="transitions">Transitions</option>
                      <option value="effects">Effects</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution
                    </label>
                    <select
                      value={filters.resolution}
                      onChange={(e) => updateFilters({ resolution: e.target.value })}
                      className="w-full rounded-lg border-gray-300"
                    >
                      <option value="all">All Resolutions</option>
                      <option value="4k">4K</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="300"
                      value={filters.duration[1]}
                      onChange={(e) => updateFilters({ 
                        duration: [filters.duration[0], parseInt(e.target.value)] 
                      })}
                      className="flex-1 accent-[#E44E51]"
                    />
                    <span className="text-sm text-gray-500">
                      {filters.duration[1]}s
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filters.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-[#E44E51]/10 text-[#E44E51] rounded-full text-sm
                          flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => updateFilters({
                            tags: filters.tags.filter((t) => t !== tag)
                          })}
                          className="hover:text-[#D43B3E]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        const tag = prompt('Enter tag name');
                        if (tag) {
                          updateFilters({
                            tags: [...filters.tags, tag]
                          });
                        }
                      }}
                      className="px-2 py-1 border border-dashed border-gray-300 
                        rounded-full text-sm text-gray-500 hover:border-[#E44E51] 
                        hover:text-[#E44E51]"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`min-h-[200px] border-2 ${
          isDragActive ? 'border-[#E44E51] bg-[#E44E51]/5' : 'border-gray-300'
        } border-dashed rounded-lg transition-colors ${
          view === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-2'
        }`}
      >
        <input {...getInputProps()} />

        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Film className="w-12 h-12 mb-2" />
            <p className="text-sm">Drag and drop media files here</p>
            <p className="text-xs text-gray-400 mt-1">
              Supports video, image, and audio files
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="clips" direction={view === 'grid' ? 'horizontal' : 'vertical'}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={view === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-2'}
                >
                  {clips.map((clip, index) => (
                    <Draggable key={clip.id} draggableId={clip.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative group cursor-move rounded-lg overflow-hidden
                            ${selectedClipId === clip.id ? 'ring-2 ring-[#E44E51]' : ''}
                            ${view === 'list' ? 'flex items-center p-2 bg-gray-50' : ''}`}
                        >
                          <div className={`relative ${view === 'list' ? 'w-48' : 'aspect-video'}`}>
                            <img
                              src={clip.thumbnail}
                              alt={clip.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                              transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setPreviewClip(clip.id);
                                    setShowPreview(true);
                                  }}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedClipId(clip.id)}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleFavorite(clip.id)}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                >
                                  <Star className={`w-4 h-4 ${clip.favorite ? 'fill-yellow-400' : ''}`} />
                                </button>
                                <button
                                  onClick={() => removeClip(clip.id)}
                                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className={view === 'list' ? 'flex-1 ml-4' : 'p-2'}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium truncate">{clip.name}</h4>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  <span>{Math.round(clip.duration)}s</span>
                                  <span>•</span>
                                  <span>{clip.metadata.resolution}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1">
                              {clip.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 
                                    rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewClip && (
        <MediaPreview
          clip={clips.find((c) => c.id === previewClip)!}
          onClose={() => {
            setShowPreview(false);
            setPreviewClip(null);
          }}
        />
      )}

      {/* AI Processing Features */}
      {showAIProcessing && (
        <AIFeatures
          onFeatureToggle={(feature, enabled) => {
            // Handle AI feature toggle
          }}
          enabledFeatures={{}}
        />
      )}
    </div>
  );
};