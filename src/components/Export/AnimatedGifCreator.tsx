import React, { useState, useRef, useEffect } from 'react';
import {
  Film, Play, Pause, SkipBack, SkipForward, Settings,
  Download, RefreshCw, Scissors, Check, Save, Wand2,
  Zap, Smile, Image, Palette, Sliders, Sparkles, Eye
} from 'lucide-react';

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
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewGif, setPreviewGif] = useState<string | null>(null);
  const [optimizationLevel, setOptimizationLevel] = useState<'basic' | 'balanced' | 'maximum'>('balanced');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Setup
  useEffect(() => {
    if (videoBlob && videoRef.current) {
      const url = URL.createObjectURL(videoBlob);
      videoRef.current.src = url;
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          setSettings(prev => ({
            ...prev,
            endTime: videoRef.current!.duration
          }));
        }
      };
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoBlob]);
  
  // Handle video playback
  useEffect(() => {
    if (!videoRef.current) return;
    
    const updateCurrentTime = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    };
    
    if (isPlaying) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    
    videoRef.current.addEventListener('timeupdate', updateCurrentTime);
    
    return () => {
      videoRef.current?.removeEventListener('timeupdate', updateCurrentTime);
      videoRef.current?.pause();
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
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Simulated GIF generation
  const generateGif = async () => {
    if (!videoBlob || !videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Get the video element and canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Set canvas size based on width setting
      const aspectRatio = video.videoHeight / video.videoWidth;
      canvas.width = settings.width;
      canvas.height = Math.round(settings.width * aspectRatio);
      
      // Begin simulated processing
      // For a real implementation, you'd use a library like gif.js or FFmpeg
      
      // Calculate frames needed based on duration and fps
      const startTime = settings.startTime;
      const endTime = Math.min(settings.startTime + settings.duration, video.duration);
      const duration = endTime - startTime;
      const frameCount = Math.floor(duration * settings.fps);
      
      // Simulate processing time
      for (let i = 0; i < frameCount; i++) {
        // Update progress (first 50% is frame capture)
        setProgress(Math.min(Math.round((i / frameCount) * 50), 50));
        
        // Simulate frame processing delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Simulate encoding (second 50% of progress)
      for (let i = 50; i <= 100; i += 5) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Create a sample blob (would be a real GIF in production)
      const gifBlob = new Blob([await fetch('https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif').then(r => r.blob())], { type: 'image/gif' });
      
      // Create URL for preview
      if (previewGif) {
        URL.revokeObjectURL(previewGif);
      }
      
      const url = URL.createObjectURL(gifBlob);
      setPreviewGif(url);
      
      // Call onGenerate callback if provided
      if (onGenerate) {
        onGenerate(gifBlob);
      }
      
    } catch (error) {
      console.error("Error generating GIF:", error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
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
            
            {/* Canvas for processing */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            
            {/* Hidden canvas for frame extraction */}
            <canvas
              ref={frameCanvasRef}
              className="hidden"
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
                        videoRef.current.duration,
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
                {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
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
                  width: `${((currentTime) / (videoRef.current?.duration || 1)) * 100}%` 
                }}
              ></div>
              
              {/* Selection range */}
              <div
                className="absolute h-full bg-[#E44E51]/30 rounded-full"
                style={{
                  left: `${(settings.startTime / (videoRef.current?.duration || 1)) * 100}%`,
                  width: `${((Math.min(settings.startTime + settings.duration, videoRef.current?.duration || 0) - settings.startTime) / (videoRef.current?.duration || 1)) * 100}%`
                }}
              ></div>
              
              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-2 bg-[#E44E51] rounded-full transform -translate-x-1/2"
                style={{ 
                  left: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%` 
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
                {[
                  { id: 'basic', label: 'Basic', desc: 'Fastest export' },
                  { id: 'balanced', label: 'Balanced', desc: 'Recommended' },
                  { id: 'maximum', label: 'Maximum', desc: 'Smallest file' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setOptimizationLevel(option.id as any)}
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
            <div className="flex space-x-3 items-center">
              <button
                onClick={generateGif}
                disabled={isProcessing}
                className="flex-1 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
                  disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    <span>Processing...</span>
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