import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Film, Play, Pause, SkipBack, SkipForward, Download, RefreshCw, Scissors, Sparkles, Eye, X } from 'lucide-react';
import { generateGif, isCancellation, toError } from './VideoProcessing';

type OptimizationLevel = 'basic' | 'balanced' | 'maximum';

const OPTIMIZATION_LEVELS: Array<{ id: OptimizationLevel; label: string; desc: string }> = [
  { id: 'basic', label: 'Basic', desc: 'Fastest export' },
  { id: 'balanced', label: 'Balanced', desc: 'Recommended' },
  { id: 'maximum', label: 'Maximum', desc: 'Smallest file' }
];

interface AnimatedGifCreatorProps {
  videoBlob: Blob | null;
  onGenerate?: (gif: Blob) => void;
}

export const AnimatedGifCreator: React.FC<AnimatedGifCreatorProps> = ({
  videoBlob,
  onGenerate
}) => {
  const [settings, setSettings] = useState({
    width: 480,
    fps: 10,
    quality: 10,
    colors: 256,
    startTime: 0,
    endTime: 0,
    duration: 3,
    dithering: true,
    loop: true,
    optimize: true,
    smartLooping: false,
    applyEffects: false,
    effects: {
      brightness: 0,
      contrast: 0,
      saturation: 0
    }
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewGif, setPreviewGif] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimizationLevel, setOptimizationLevel] = useState<OptimizationLevel>('balanced');

  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Lets the unmount cleanup revoke the newest preview URL.
  const previewRef = useRef<string | null>(null);
  previewRef.current = previewGif;

  // Release the preview URL and stop any running conversion on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);
  
  // Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!videoBlob || !video) return;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    const handleMetadata = () => {
      // MediaRecorder files can report Infinity until they are fully scanned.
      const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(videoDuration);
      setSettings(prev => ({
        ...prev,
        endTime: videoDuration,
        duration: Math.min(prev.duration, Math.max(0.5, videoDuration || prev.duration))
      }));
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('durationchange', handleMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('durationchange', handleMetadata);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  // Handle video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateCurrentTime = () => setCurrentTime(video.currentTime);

    if (isPlaying) {
      // Autoplay can be rejected - keep the UI in sync instead of throwing.
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }

    video.addEventListener('timeupdate', updateCurrentTime);

    return () => {
      video.removeEventListener('timeupdate', updateCurrentTime);
      video.pause();
    };
  }, [isPlaying]);
  
  // Handle timeline dragging
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingTimeline(true);
    updateTimeFromMouse(e);
  };
  
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingTimeline) {
      updateTimeFromMouse(e);
    }
  };
  
  const handleTimelineMouseUp = () => {
    setIsDraggingTimeline(false);
  };
  
  const updateTimeFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const newTime = position * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    setProgress(0);
  };

  // Encodes the selected range with ffmpeg.wasm (palettegen + paletteuse).
  const handleGenerateGif = async () => {
    if (!videoBlob || isProcessing) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const startTime = Math.max(0, settings.startTime);
      const endTime = duration > 0
        ? Math.min(startTime + settings.duration, duration)
        : startTime + settings.duration;

      // Fewer colours / diff palettes shrink the file, at the cost of quality.
      const colors =
        optimizationLevel === 'maximum'
          ? Math.min(settings.colors, 128)
          : optimizationLevel === 'basic'
          ? settings.colors
          : Math.min(settings.colors, 192);

      const gifBlob = await generateGif(
        videoBlob,
        {
          fps: settings.fps,
          quality: settings.quality,
          width: settings.width,
          colors,
          dither: settings.dithering,
          optimize: optimizationLevel !== 'basic' && settings.optimize,
          startTime,
          endTime,
          loop: settings.loop
        },
        setProgress,
        controller.signal
      );

      setPreviewGif(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(gifBlob);
      });

      onGenerate?.(gifBlob);
    } catch (err) {
      if (!isCancellation(err)) setError(toError(err).message);
    } finally {
      abortRef.current = null;
      setIsProcessing(false);
    }
  };
  
  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Video Preview & Timeline */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative shadow-md">
            {/* Main Video */}
            <video 
              ref={videoRef}
              className="w-full h-full"
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* GIF Preview Overlay */}
            {previewGif && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="relative max-w-full max-h-full">
                  <img 
                    src={previewGif} 
                    alt="GIF Preview"
                    className="max-h-full max-w-full rounded"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      onClick={() => setPreviewGif(null)}
                      className="p-1 bg-white/30 backdrop-blur-sm rounded hover:bg-white/50 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                    <a
                      href={previewGif}
                      download="animated.gif"
                      className="p-1 bg-white/30 backdrop-blur-sm rounded hover:bg-white/50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4 text-white" />
                    </a>
                  </div>
                </div>
              </div>
            )}
            
            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <RefreshCw className="w-10 h-10 text-white animate-spin mb-3" />
                <div className="w-48 h-2 bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-[#E44E51] rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="mt-3 text-white">{progress}% Complete</p>
                <button
                  onClick={cancelGeneration}
                  className="mt-3 px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg 
                    hover:bg-white/30 flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Timeline Controls */}
          <div className="space-y-2">
            {/* Playback Controls */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1);
                    }
                  }}
                  className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E]"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(
                        duration || videoRef.current.currentTime + 1,
                        videoRef.current.currentTime + 1
                      );
                    }
                  }}
                  className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            
            {/* Scrubber/Timeline */}
            <div 
              className="h-4 bg-gray-100 rounded-full relative cursor-pointer"
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onMouseLeave={handleTimelineMouseUp}
            >
              {/* Played progress */}
              <div 
                className="absolute h-full bg-gray-300 rounded-full"
                style={{ 
                  width: `${(currentTime / (duration || 1)) * 100}%` 
                }}
              ></div>
              
              {/* Selection range */}
              <div
                className="absolute h-full bg-[#E44E51]/30 rounded-full"
                style={{
                  left: `${(settings.startTime / (duration || 1)) * 100}%`,
                  width: `${((Math.min(settings.startTime + settings.duration, duration || settings.startTime + settings.duration) - settings.startTime) / (duration || 1)) * 100}%`
                }}
              ></div>
              
              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-2 bg-[#E44E51] rounded-full transform -translate-x-1/2"
                style={{ 
                  left: `${(currentTime / (duration || 1)) * 100}%` 
                }}
              ></div>
            </div>
            
            {/* Start/End Time Controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({
                  ...settings,
                  startTime: currentTime
                })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
              >
                <Scissors className="w-4 h-4 mr-1" />
                <span>Set Start: {formatTime(settings.startTime)}</span>
              </button>
              
              <button
                onClick={() => setSettings({
                  ...settings,
                  duration: Math.max(0.5, currentTime - settings.startTime)
                })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
              >
                <Scissors className="w-4 h-4 mr-1" />
                <span>Set Duration: {settings.duration.toFixed(1)}s</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* GIF Settings */}
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Film className="w-5 h-5 mr-2 text-[#E44E51]" />
              GIF Settings
            </h3>
            
            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Width</label>
                <select
                  value={settings.width}
                  onChange={(e) => setSettings({
                    ...settings,
                    width: Number(e.target.value)
                  })}
                  className="w-full rounded-lg border-gray-300"
                >
                  <option value={320}>320px</option>
                  <option value={480}>480px</option>
                  <option value={640}>640px</option>
                  <option value={800}>800px</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Frame Rate</label>
                <select
                  value={settings.fps}
                  onChange={(e) => setSettings({
                    ...settings,
                    fps: Number(e.target.value)
                  })}
                  className="w-full rounded-lg border-gray-300"
                >
                  <option value={5}>5 fps (Smaller)</option>
                  <option value={10}>10 fps (Balanced)</option>
                  <option value={15}>15 fps (Smoother)</option>
                  <option value={20}>20 fps (Smoothest)</option>
                </select>
              </div>
            </div>
            
            {/* Optimization Settings */}
            <div className="bg-white p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-800">Optimization</h4>
                <div className="text-xs bg-blue-50 text-blue-700 py-1 px-2 rounded">
                  Reduces file size
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {OPTIMIZATION_LEVELS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setOptimizationLevel(option.id)}
                    className={`p-2 rounded-lg text-sm text-center border ${
                      optimizationLevel === option.id
                        ? 'bg-[#E44E51]/10 border-[#E44E51] text-gray-900'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Color Count</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="32"
                    max="256"
                    step="32"
                    value={settings.colors}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: Number(e.target.value)
                    })}
                    className="flex-1 accent-[#E44E51]"
                  />
                  <span className="text-sm font-medium w-8">{settings.colors}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.dithering}
                    onChange={(e) => setSettings({
                      ...settings,
                      dithering: e.target.checked
                    })}
                    className="rounded border-gray-300 text-[#E44E51]"
                  />
                  <span className="ml-2 text-sm">Dithering</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.loop}
                    onChange={(e) => setSettings({
                      ...settings,
                      loop: e.target.checked
                    })}
                    className="rounded border-gray-300 text-[#E44E51]"
                  />
                  <span className="ml-2 text-sm">Loop</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.smartLooping}
                    onChange={(e) => setSettings({
                      ...settings,
                      smartLooping: e.target.checked
                    })}
                    className="rounded border-gray-300 text-[#E44E51]"
                  />
                  <span className="ml-2 text-sm">Smart Loop Detection</span>
                </label>
              </div>
            </div>
            
            {/* Visual Effects */}
            <div className="bg-white p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-800">Visual Effects</h4>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    applyEffects: !settings.applyEffects
                  })}
                  className={`px-2 py-0.5 rounded text-xs ${
                    settings.applyEffects
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {settings.applyEffects ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              
              {settings.applyEffects && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-700">Brightness</label>
                      <span className="text-xs text-gray-500">{settings.effects.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={settings.effects.brightness}
                      onChange={(e) => setSettings({
                        ...settings,
                        effects: {
                          ...settings.effects,
                          brightness: Number(e.target.value)
                        }
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-700">Contrast</label>
                      <span className="text-xs text-gray-500">{settings.effects.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={settings.effects.contrast}
                      onChange={(e) => setSettings({
                        ...settings,
                        effects: {
                          ...settings.effects,
                          contrast: Number(e.target.value)
                        }
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-gray-700">Saturation</label>
                      <span className="text-xs text-gray-500">{settings.effects.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      value={settings.effects.saturation}
                      onChange={(e) => setSettings({
                        ...settings,
                        effects: {
                          ...settings.effects,
                          saturation: Number(e.target.value)
                        }
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Create GIF Button */}
            <div className="space-y-3">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-3 items-center">
                <button
                  onClick={isProcessing ? cancelGeneration : handleGenerateGif}
                  disabled={!videoBlob}
                  className="flex-1 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
                    disabled:opacity-50 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      <span>Cancel ({progress}%)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      <span>Create GIF</span>
                    </>
                  )}
                </button>

                {previewGif && (
                  <a
                    href={previewGif}
                    download="animation.gif"
                    className="py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 
                      flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* File size estimation */}
      <div className="text-sm text-gray-500 flex justify-between items-center">
        <span>Estimated file size: {Math.round(
          settings.width * settings.fps * settings.duration * 
          (settings.colors / 256) * (settings.optimize ? 0.7 : 1) * 
          0.12 // approximation factor
        )} KB</span>
        
        <div className="flex items-center">
          <span className="mr-2">Higher quality</span>
          <div className="w-24 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full"
              style={{ 
                width: `${50 + (settings.fps - 10) * 2.5 + 
                  (settings.width - 480) / 10 +
                  (settings.colors - 128) / 25}%` 
              }}
            ></div>
          </div>
          <span className="ml-2">Larger file</span>
        </div>
      </div>
    </div>
  );
};