import React, { useState, useRef } from 'react';
import { 
  Film, Upload, Trash2, Edit2, Clock, Layout, Sliders, Play, 
  Pause, Maximize2, Volume2, Move, RotateCcw, Crop, Eye,
  PictureInPicture, Layers, Copy, ChevronRight, ChevronLeft,
  Palette, Music, Video, Image
} from 'lucide-react';

interface BRollClip {
  id: string;
  name: string;
  duration: number;
  thumbnail: string;
  url: string;
  startTime: number;
  endTime: number;
  volume: number;
  opacity: number;
  scale: number;
  position: { x: number; y: number };
  rotation: number;
  transition: {
    type: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'wipe';
    duration: number;
  };
  filters: {
    brightness: number;
    contrast: number;
    blur: number;
    saturation: number;
  };
  cropSettings: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  pip: {
    enabled: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: number;
  };
  loop: boolean;
  speed: number;
  muted: boolean;
  category: string;
  tags: string[];
}

export const BRoll: React.FC = () => {
  const [clips, setClips] = useState<BRollClip[]>([]);
  const [draggedClip, setDraggedClip] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'grid' | 'list'>('grid');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'all',
    'intros',
    'transitions',
    'backgrounds',
    'overlays',
    'effects',
    'outros'
  ];

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    const newClips = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url;
        
        return new Promise<BRollClip>((resolve) => {
          video.onloadedmetadata = () => {
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              duration: video.duration,
              thumbnail: url,
              url,
              startTime: 0,
              endTime: video.duration,
              volume: 1,
              opacity: 1,
              scale: 1,
              position: { x: 0, y: 0 },
              rotation: 0,
              transition: {
                type: 'fade',
                duration: 0.5
              },
              filters: {
                brightness: 1,
                contrast: 1,
                blur: 0,
                saturation: 1
              },
              cropSettings: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
              },
              pip: {
                enabled: false,
                position: 'top-right',
                size: 0.3
              },
              loop: false,
              speed: 1,
              muted: false,
              category: 'uncategorized',
              tags: []
            });
          };
        });
      })
    );

    setClips([...clips, ...newClips]);
  };

  const handleClipSelect = (clipId: string) => {
    setSelectedClip(clipId === selectedClip ? null : clipId);
  };

  const duplicateClip = (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (clip) {
      const newClip = {
        ...clip,
        id: Math.random().toString(36).substr(2, 9),
        name: `${clip.name} (Copy)`
      };
      setClips([...clips, newClip]);
    }
  };

  const filteredClips = clips.filter(clip => {
    const matchesCategory = currentCategory === 'all' || clip.category === currentCategory;
    const matchesSearch = clip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clip.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">B-Roll Manager</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(prev => prev === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Toggle View"
          >
            <Layout className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Advanced Settings"
          >
            <Sliders className="w-5 h-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Upload Files"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Search and Categories */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Search clips..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCurrentCategory(category)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                currentCategory === category
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center space-x-1">
          <Video className="w-4 h-4" />
          <span>Record Screen</span>
        </button>
        <button className="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 flex items-center space-x-1">
          <Image className="w-4 h-4" />
          <span>Import Images</span>
        </button>
        <button className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center space-x-1">
          <Music className="w-4 h-4" />
          <span>Add Audio</span>
        </button>
      </div>

      {/* Clips Grid/List */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 ${
          previewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-2'
        }`}
      >
        {filteredClips.length > 0 ? (
          filteredClips.map((clip) => (
            <div
              key={clip.id}
              draggable
              onDragStart={() => setDraggedClip(clip.id)}
              onDragEnd={() => setDraggedClip(null)}
              onClick={() => handleClipSelect(clip.id)}
              className={`relative ${
                previewMode === 'grid'
                  ? 'aspect-video'
                  : 'flex items-center p-2'
              } ${
                selectedClip === clip.id
                  ? 'ring-2 ring-blue-500'
                  : ''
              } group cursor-move rounded-lg overflow-hidden bg-gray-100`}
            >
              {previewMode === 'grid' ? (
                <>
                  <img
                    src={clip.thumbnail}
                    alt={clip.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                    transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <div className="flex space-x-2">
                      <button className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-gray-100">
                        <Play className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-gray-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-gray-100">
                        <Copy className="w-4 h-4" onClick={() => duplicateClip(clip.id)} />
                      </button>
                      <button className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-sm truncate">{clip.name}</p>
                    <p className="text-gray-300 text-xs">{Math.round(clip.duration)}s</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-32 aspect-video bg-gray-200 rounded relative group">
                    <img
                      src={clip.thumbnail}
                      alt={clip.name}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                      transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{clip.name}</h4>
                    <p className="text-xs text-gray-500">
                      {Math.round(clip.duration)}s • {clip.category}
                    </p>
                    <div className="flex space-x-1 mt-1">
                      {clip.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded">
                      <Copy className="w-4 h-4" onClick={() => duplicateClip(clip.id)} />
                    </button>
                    <button className="p-1 hover:bg-gray-200 rounded text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 col-span-3">
            <Film className="w-8 h-8 mb-2" />
            <p className="text-sm">Drag and drop B-roll clips here</p>
            <p className="text-xs text-gray-400 mt-1">
              Supports MP4, MOV, WebM, PNG, JPG formats
            </p>
          </div>
        )}
      </div>

      {/* Clip Editor */}
      {selectedClip && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Clip Settings</h4>
            <button
              onClick={() => setSelectedClip(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="number"
                className="w-full rounded-lg border-gray-300 shadow-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="number"
                className="w-full rounded-lg border-gray-300 shadow-sm"
                placeholder="5.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opacity
            </label>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scale
            </label>
            <input
              type="range"
              min="50"
              max="150"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rotation
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transition
            </label>
            <select className="w-full rounded-lg border-gray-300 shadow-sm">
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="dissolve">Dissolve</option>
              <option value="wipe">Wipe</option>
            </select>
          </div>

          {showAdvancedSettings && (
            <>
              <div className="space-y-4 border-t pt-4">
                <h5 className="text-sm font-medium text-gray-700">Advanced Settings</h5>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Picture in Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="ml-2 text-sm">Enable PiP</span>
                    </label>
                    <select className="rounded-lg border-gray-300 shadow-sm text-sm">
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Settings
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Top"
                      className="rounded-lg border-gray-300 shadow-sm"
                    />
                    <input
                      type="number"
                      placeholder="Right"
                      className="rounded-lg border-gray-300 shadow-sm"
                    />
                    <input
                      type="number"
                      placeholder="Bottom"
                      className="rounded-lg border-gray-300 shadow-sm"
                    />
                    <input
                      type="number"
                      placeholder="Left"
                      className="rounded-lg border-gray-300 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Playback Speed
                  </label>
                  <select className="w-full rounded-lg border-gray-300 shadow-sm">
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select className="w-full rounded-lg border-gray-300 shadow-sm">
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Add tags (comma separated)"
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="ml-2 text-sm">Loop</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="ml-2 text-sm">Mute</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Reset
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};