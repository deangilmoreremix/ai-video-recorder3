import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Trash2, Edit2, Clock, Play, Grid, List, Search, Filter, X, Folder, Brain, Star, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { useBRollStore, type BRollClip, type BRollMediaType } from '../../../store/brollStore';
import { MediaPreview } from './Preview/MediaPreview';
import { AIFeatures } from './AIFeatures';
import { BatchProcessor, type BatchSettings } from './BatchProcessor';

interface MediaFileMetadata {
  duration: number;
  resolution: string;
  fps: number;
}

interface ClipFilters {
  category: string;
  resolution: string;
  duration: [number, number];
  tags: string[];
}

const DEFAULT_FILTERS: ClipFilters = {
  category: 'all',
  resolution: 'all',
  duration: [0, 300],
  tags: []
};

const EMPTY_METADATA: MediaFileMetadata = { duration: 0, resolution: '', fps: 0 };

/** Import rules used by the plain dropzone (the batch panel supplies its own). */
const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  autoTag: true,
  categorize: true,
  generateThumbnails: true,
  extractMetadata: true,
  batchRename: false,
  renamePattern: '{index}-{name}'
};

const getMediaType = (file: File): BRollMediaType => {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('image')) return 'image';
  return 'audio';
};

/** Reads duration/resolution without leaking the temporary object URL. */
const getFileMetadata = (file: File): Promise<MediaFileMetadata> =>
  new Promise((resolve) => {
    const type = getMediaType(file);
    const url = URL.createObjectURL(file);
    const done = (metadata: MediaFileMetadata) => {
      URL.revokeObjectURL(url);
      resolve(metadata);
    };

    if (type === 'image') {
      const img = document.createElement('img');
      img.onload = () => done({ duration: 0, resolution: `${img.width}x${img.height}`, fps: 0 });
      img.onerror = () => done(EMPTY_METADATA);
      img.src = url;
      return;
    }

    const media = document.createElement(type === 'video' ? 'video' : 'audio');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration) ? media.duration : 0;
      done({
        duration,
        resolution: media instanceof HTMLVideoElement
          ? `${media.videoWidth}x${media.videoHeight}`
          : '',
        fps: media instanceof HTMLVideoElement ? 30 : 0
      });
    };
    media.onerror = () => done(EMPTY_METADATA);
    media.src = url;
  });

/** Grabs a poster frame; falls back to an empty thumbnail instead of hanging. */
const generateThumbnail = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const type = getMediaType(file);

    if (type === 'image') {
      resolve(URL.createObjectURL(file));
      return;
    }

    if (type === 'audio') {
      resolve('');
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (thumbnail: string) => {
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };

    video.preload = 'metadata';
    video.muted = true;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 3);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas.width || !canvas.height) {
          done('');
          return;
        }
        ctx.drawImage(video, 0, 0);
        done(canvas.toDataURL('image/jpeg'));
      } catch {
        // Tainted canvas / decoding issue - keep the import going without a thumbnail.
        done('');
      }
    };
    video.onerror = () => done('');
    video.src = url;
  });

/** Apply a `{index}` / `{name}` rename pattern to an imported file. */
const applyRenamePattern = (pattern: string, index: number, fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const extension = dot > 0 ? fileName.slice(dot) : '';
  const renamed = pattern
    .replace(/\{index\}/g, String(index + 1).padStart(2, '0'))
    .replace(/\{name\}/g, base)
    .trim();
  if (!renamed) return fileName;
  return renamed.includes('.') ? renamed : `${renamed}${extension}`;
};

/** Tags derived from what we actually measured about the file. */
const buildAutoTags = (type: BRollMediaType, metadata: MediaFileMetadata): string[] => {
  const tags: string[] = [type];
  const width = Number(metadata.resolution.split('x')[0] ?? 0);
  if (width >= 3840) tags.push('4k');
  else if (width >= 1920) tags.push('1080p');
  else if (width >= 1280) tags.push('720p');
  else if (width > 0) tags.push('sd');
  if (metadata.duration > 0) tags.push(metadata.duration <= 10 ? 'short' : 'long');
  return tags;
};

export const BRollManager: React.FC = () => {
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const addClip = useBRollStore((state) => state.addClip);
  const removeClip = useBRollStore((state) => state.removeClip);
  const setSelectedClipId = useBRollStore((state) => state.setSelectedClipId);
  const toggleFavorite = useBRollStore((state) => state.toggleFavorite);
  const addCollection = useBRollStore((state) => state.addCollection);
  const reorderClips = useBRollStore((state) => state.reorderClips);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showBatch, setShowBatch] = useState(false);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ClipFilters>(DEFAULT_FILTERS);
  const [importError, setImportError] = useState<string | null>(null);

  // Object URLs minted by this component, revoked on unmount to avoid leaks.
  const createdUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.length = 0;
    };
  }, []);

  const updateFilters = useCallback((updates: Partial<ClipFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Shared import routine used by the dropzone and by the batch panel. Each
   * file is imported independently so one bad asset cannot abort the batch.
   */
  const importFiles = useCallback(
    async (files: File[], settings: BatchSettings = DEFAULT_BATCH_SETTINGS) => {
      if (!files.length) return;

      setIsProcessing(true);
      setImportProgress(0);
      setImportError(null);
      const failed: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        let url: string | undefined;
        let thumbnail: string | undefined;

        try {
          const type = getMediaType(file);
          const metadata = settings.extractMetadata ? await getFileMetadata(file) : EMPTY_METADATA;
          url = URL.createObjectURL(file);
          createdUrls.current.push(url);

          if (settings.generateThumbnails) {
            thumbnail = type === 'image' ? url : await generateThumbnail(file);
            if (thumbnail && thumbnail !== url && thumbnail.startsWith('blob:')) {
              createdUrls.current.push(thumbnail);
            }
          } else {
            thumbnail = '';
          }

          addClip({
            name: settings.batchRename
              ? applyRenamePattern(settings.renamePattern, index, file.name)
              : file.name,
            url,
            thumbnail,
            duration: metadata.duration,
            type,
            category: settings.categorize ? type : 'uncategorized',
            tags: settings.autoTag ? buildAutoTags(type, metadata) : [],
            favorite: false,
            lastUsed: new Date(),
            metadata: {
              fileSize: file.size,
              resolution: metadata.resolution,
              codec: file.type,
              fps: metadata.fps
            }
          });
        } catch (error) {
          console.error(`Failed to import "${file.name}":`, error);
          failed.push(file.name);
          if (url) {
            const created = url;
            URL.revokeObjectURL(created);
            createdUrls.current = createdUrls.current.filter((entry) => entry !== created);
          }
        }

        setImportProgress(Math.round(((index + 1) / files.length) * 100));
      }

      if (failed.length) {
        setImportError(
          `${failed.length} file${failed.length > 1 ? 's' : ''} could not be imported: ${failed.join(', ')}`
        );
      }
      setIsProcessing(false);
    },
    [addClip]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': [],
      'image/*': [],
      'audio/*': []
    },
    onDrop: (acceptedFiles) => {
      void importFiles(acceptedFiles);
    }
  });

  const handleRemoveClip = useCallback((clip: BRollClip) => {
    removeClip(clip.id);
    // Release the media the manager created for this clip.
    [clip.url, clip.thumbnail].forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        createdUrls.current = createdUrls.current.filter((entry) => entry !== url);
      }
    });
  }, [removeClip]);

  const filteredClips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const [minDuration, maxDuration] = filters.duration;

    return clips.filter((clip) => {
      const matchesQuery = !query ||
        clip.name.toLowerCase().includes(query) ||
        clip.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesCategory = filters.category === 'all' || clip.category === filters.category;
      const matchesResolution = filters.resolution === 'all' ||
        clip.metadata.resolution.toLowerCase().includes(filters.resolution.toLowerCase());
      const matchesDuration = clip.duration >= minDuration && clip.duration <= maxDuration;
      const matchesTags = filters.tags.length === 0 ||
        filters.tags.every((tag) => clip.tags.includes(tag));

      return matchesQuery && matchesCategory && matchesResolution && matchesDuration && matchesTags;
    });
  }, [clips, searchQuery, filters]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    // The list can be filtered, so translate visible positions back to store indices.
    const source = filteredClips[result.source.index];
    const target = filteredClips[result.destination.index];
    if (!source || !target) return;

    const fromIndex = clips.findIndex((clip) => clip.id === source.id);
    const toIndex = clips.findIndex((clip) => clip.id === target.id);
    if (fromIndex === -1 || toIndex === -1) return;

    reorderClips(fromIndex, toIndex);
  }, [clips, filteredClips, reorderClips]);

  const previewClip = useMemo(
    () => (previewClipId ? clips.find((clip) => clip.id === previewClipId) ?? null : null),
    [clips, previewClipId]
  );

  const selectedClip = useMemo(
    () => (selectedClipId ? clips.find((clip) => clip.id === selectedClipId) ?? null : null),
    [clips, selectedClipId]
  );

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewClipId(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
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
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          {isProcessing && (
            <span className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="w-4 h-4 border-2 border-[#E44E51] border-t-transparent rounded-full animate-spin" />
              <span>Importing…</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBatch(!showBatch)}
            className={`p-2 rounded-lg ${
              showBatch ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
            }`}
            title="Batch import"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAIProcessing(!showAIProcessing)}
            className={`p-2 rounded-lg ${
              showAIProcessing ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
            }`}
            title="AI features"
          >
            <Brain className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const name = prompt('Collection name', 'New Collection');
              if (name?.trim()) addCollection(name);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="New collection"
          >
            <Folder className="w-5 h-5" />
          </button>
        </div>
      </div>

      {importError && (
        <div className="flex items-start justify-between p-3 text-sm bg-[#E44E51]/10 text-[#E44E51] rounded-lg">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="ml-4 hover:text-[#D43B3E]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                      <option value="uncategorized">Uncategorized</option>
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
                      <option value="3840">4K</option>
                      <option value="1920">1080p</option>
                      <option value="1280">720p</option>
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
                        duration: [filters.duration[0], parseInt(e.target.value, 10) || 0]
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
                        const tag = prompt('Enter tag name')?.trim();
                        if (tag && !filters.tags.includes(tag)) {
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

      {showBatch && (
        <div className="p-4 border rounded-lg space-y-3">
          <div>
            <h4 className="font-medium">Batch import</h4>
            <p className="text-sm text-gray-500">
              Queue several files, then import them all with the same naming, tagging and thumbnail
              rules.
            </p>
          </div>
          <BatchProcessor
            onProcess={importFiles}
            isProcessing={isProcessing}
            progress={importProgress}
          />
        </div>
      )}

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
        ) : filteredClips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Filter className="w-8 h-8 mb-2" />
            <p className="text-sm">No clips match the current filters</p>
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
                  {filteredClips.map((clip, index) => (
                    <Draggable key={clip.id} draggableId={clip.id} index={index}>
                      {(draggableProvided) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          className={`relative group cursor-move rounded-lg overflow-hidden
                            ${selectedClipId === clip.id ? 'ring-2 ring-[#E44E51]' : ''}
                            ${view === 'list' ? 'flex items-center p-2 bg-gray-50' : ''}`}
                        >
                          <div className={`relative ${view === 'list' ? 'w-48' : 'aspect-video'}`}>
                            {clip.thumbnail ? (
                              <img
                                src={clip.thumbnail}
                                alt={clip.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <Film className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                              transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setPreviewClipId(clip.id);
                                    setShowPreview(true);
                                  }}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                  title="Preview"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedClipId(clip.id)}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                  title="Select"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleFavorite(clip.id)}
                                  className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                                  title="Favorite"
                                >
                                  <Star className={`w-4 h-4 ${clip.favorite ? 'fill-yellow-400' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleRemoveClip(clip)}
                                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                                  title="Remove"
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
                                  {clip.metadata.resolution && (
                                    <>
                                      <span>•</span>
                                      <span>{clip.metadata.resolution}</span>
                                    </>
                                  )}
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
          url={previewClip.url}
          type={previewClip.type}
          title={previewClip.name}
          metadata={{
            duration: previewClip.duration,
            size: previewClip.metadata.fileSize,
            resolution: previewClip.metadata.resolution,
            format: previewClip.metadata.codec
          }}
          onClose={closePreview}
        />
      )}

      {/* AI Processing Features */}
      {showAIProcessing && <AIFeatures clip={selectedClip} />}
    </div>
  );
};
