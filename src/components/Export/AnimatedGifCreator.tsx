import React, { useState, useRef, useEffect } from 'react';
import {
  Film, Play, Pause, SkipBack, SkipForward, Settings,
  Download, RefreshCw, Scissors, Check, Save, Wand2,
  Zap, Smile, Image, Palette, Sliders, Sparkles, Eye
} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import GIF from 'gif.js';

interface AnimatedGifCreatorProps {
  videoBlob: Blob | null;
  onGenerate?: (gif: Blob) => void;
}

interface GifSettings {
  width: number;
  fps: number;
  quality: number;
  colors: number;
  startTime: number;
  endTime: number;
  duration: number;
  dithering: boolean;
  loop: boolean;
  optimize: boolean;
  smartLooping: boolean;
  applyEffects: boolean;
  effects: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export const AnimatedGifCreator: React.FC<AnimatedGifCreatorProps> = ({
  videoBlob,
  onGenerate
}) => {
  const [settings, setSettings] = useState<GifSettings>({
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
  
  // Create GIF with FFmpeg
  const generateGif = async () => {
    if (!videoBlob || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));
      
      // Set params based on settings
      const duration = settings.endTime - settings.startTime;
      const fps = settings.fps;
      const width = settings.width;
      
      // Build command
      let args = [
        '-ss', settings.startTime.toString(),
        '-t', duration.toString(),
        '-i', 'input.webm'
      ];
      
      // Apply visual effects if enabled
      let filters = [`fps=${fps}`, `scale=${width}:-1:flags=lanczos`];
      
      if (settings.applyEffects) {
        const { brightness, contrast, saturation } = settings.effects;
        filters.push(`eq=brightness=${brightness/10 + 1}:contrast=${contrast/10 + 1}:saturation=${saturation/10 + 1}`);
      }
      
      // Choose optimization method based on settings
      let paletteGenCommand = 'palettegen';
      let paletteUseCommand = 'paletteuse';
      
      // Adjust palette commands based on optimization level
      if (optimizationLevel === 'maximum') {
        paletteGenCommand += '=max_colors=' + settings.colors;
        if (settings.dithering) {
          paletteUseCommand += '=dither=bayer:bayer_scale=5';
        }
      } else if (optimizationLevel === 'balanced') {
        paletteGenCommand += '=max_colors=' + settings.colors;
        if (settings.dithering) {
          paletteUseCommand += '=dither=floyd_steinberg';
        }
      }
      
      // Build filter complex command
      const filterComplex = `${filters.join(',')},split[s0][s1];[s0]${paletteGenCommand}[p];[s1][p]${paletteUseCommand}`;
      
      args.push('-vf', filterComplex);
      
      // Set loop option
      if (settings.loop) {
        args.push('-loop', '0');
      } else {
        args.push('-loop', '-1');
      }
      
      // Set output filename
      args.push('output.gif');
      
      // Execute FFmpeg command
      await ffmpeg.exec(args);
      
      // Read the output file
      const data = await ffmpeg.readFile('output.gif');
      
      // Create preview URL
      const blob = new Blob([data], { type: 'image/gif' });
      if (previewGif) {
        URL.revokeObjectURL(previewGif);
      }
      
      const url = URL.createObjectURL(blob);
      setPreviewGif(url);
      
      // Call onGenerate callback with the blob
      if (onGenerate) {
        onGenerate(blob);
      }
      
    } catch (error) {
      console.error('Error generating GIF:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };
  
  // Create GIF with gif.js (browser-based alternative for shorter clips)
  const generateGifWithGifJs = async () => {
    if (!videoRef.current || !frameCanvasRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    const video = videoRef.current;
    const canvas = frameCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Setup canvas dimensions based on target width
    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = settings.width;
    canvas.height = Math.round(settings.width * aspectRatio);
    
    // Setup GIF encoder
    const gif = new GIF({
      workers: 2,
      quality: 11 - settings.quality, // Quality is inverted (1-10)
      width: canvas.width,
      height: canvas.height,
      workerScript: '/gif.worker.js', // Path to gif.worker.js
      dither: settings.dithering ? 'FloydSteinberg' : false,
      globalPalette: true
    });
    
    // Add event listeners
    gif.on('progress', p => {
      setProgress(Math.round(p * 100));
    });
    
    gif.on('finished', blob => {
      if (previewGif) {
        URL.revokeObjectURL(previewGif);
      }
      
      const url = URL.createObjectURL(blob);
      setPreviewGif(url);
      
      // Call onGenerate callback with the blob
      if (onGenerate) {
        onGenerate(blob);
      }
      
      setIsProcessing(false);
    });
    
    // Generate frames
    const startTime = settings.startTime;
    const endTime = Math.min(settings.startTime + settings.duration, video.duration);
    const duration = endTime - startTime;
    const frameCount = Math.floor(duration * settings.fps);
    
    // Reset video to start time
    video.currentTime = startTime;
    
    // Wait for the video to be ready at the new time
    await new Promise<void>(resolve => {
      video.onseeked = () => resolve();
    });
    
    // Capture frames
    for (let i = 0; i < frameCount; i++) {
      // Calculate the current time for this frame
      const time = startTime + (i / settings.fps);
      
      // Set video to specific time
      video.currentTime = time;
      
      // Wait for the seek to complete
      await new Promise<void>(resolve => {
        video.onseeked = () => resolve();
      });
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply effects if enabled
      if (settings.applyEffects) {
        const { brightness, contrast, saturation } = settings.effects;
        
        // Apply canvas filters (modern browsers support these)
        ctx.filter = `brightness(${brightness/10 + 1}) contrast(${contrast/10 + 1}) saturate(${saturation/10 + 1})`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }
      
      // Add frame to GIF
      gif.addFrame(ctx, { copy: true, delay: 1000 / settings.fps });
      
      // Update progress
      setProgress(Math.round((i / frameCount) * 50)); // First 50% is frame capture
    }
    
    // Render the GIF
    gif.render();
  };
  
  // Handle downloading the GIF
  const downloadGif = () => {
    if (!previewGif) return;
    
    const a = document.createElement('a');
    a.href = previewGif;
    a.download = `animated_${Date.now()}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Animated GIF Creator</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Preview & Timeline */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
            {/* Main video for editing */}
            <video 
              ref={videoRef}
              className="w-full h-full"
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* Canvas for processing */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Hidden canvas for frame capture */}
            <canvas
              ref={frameCanvasRef}
              className="hidden"
            />
            
            {/* GIF Preview Overlay */}
            {previewGif && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="relative">
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
                    <button
                      onClick={downloadGif}
                      className="p-1 bg-white/30 backdrop-blur-sm rounded hover:bg-white/50 transition-colors"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = settings.startTime;
                    setCurrentTime(settings.startTime);
                  }
                }}
                className="p-1 bg-gray-100 rounded hover:bg-gray-200"
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
                    videoRef.current.currentTime = settings.endTime;
                    setCurrentTime(settings.endTime);
                  }
                }}
                className="p-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
            </div>
          </div>
          
          {/* Timeline */}
          <div className="space-y-2">
            <div
              className="h-8 bg-gray-100 rounded-lg relative cursor-pointer"
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onMouseLeave={handleTimelineMouseUp}
            >
              {/* Track */}
              <div className="absolute inset-y-0 left-0 bg-gray-200 rounded-lg"
                style={{ 
                  width: `${((videoRef.current?.duration || 0) / (videoRef.current?.duration || 1)) * 100}%` 
                }}
              />
              
              {/* Selection range */}
              <div
                className="absolute inset-y-0 bg-[#E44E51]/20 border-l-2 border-r-2 border-[#E44E51]"
                style={{
                  left: `${(settings.startTime / (videoRef.current?.duration || 1)) * 100}%`,
                  width: `${((settings.endTime - settings.startTime) / (videoRef.current?.duration || 1)) * 100}%`
                }}
              />
              
              {/* Current position */}
              <div
                className="absolute inset-y-0 w-0.5 bg-[#E44E51]"
                style={{ left: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%` }}
              />
              
              {/* Handle for start time */}
              <div
                className="absolute top-1/2 w-3 h-6 bg-[#E44E51] rounded-sm transform -translate-y-1/2 -translate-x-1/2 cursor-col-resize"
                style={{ left: `${(settings.startTime / (videoRef.current?.duration || 1)) * 100}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Handle dragging logic for start time
                }}
              />
              
              {/* Handle for end time */}
              <div
                className="absolute top-1/2 w-3 h-6 bg-[#E44E51] rounded-sm transform -translate-y-1/2 -translate-x-1/2 cursor-col-resize"
                style={{ left: `${(settings.endTime / (videoRef.current?.duration || 1)) * 100}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Handle dragging logic for end time
                }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Start: {formatTime(settings.startTime)}</span>
              <span>End: {formatTime(settings.endTime)}</span>
              <span>Duration: {formatTime(settings.endTime - settings.startTime)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSettings({
                ...settings,
                startTime: currentTime
              })}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-1"
            >
              <Scissors className="w-4 h-4" />
              <span>Set In Point</span>
            </button>
            
            <button
              onClick={() => setSettings({
                ...settings,
                endTime: currentTime
              })}
              className="px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-1"
            >
              <Scissors className="w-4 h-4" />
              <span>Set Out Point</span>
            </button>
          </div>
        </div>
        
        {/* Right Column: Settings */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">GIF Width</label>
              <select
                value={settings.width}
                onChange={(e) => setSettings({
                  ...settings,
                  width: Number(e.target.value)
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm"
              >
                <option value="320">320px</option>
                <option value="480">480px</option>
                <option value="640">640px</option>
                <option value="800">800px</option>
                <option value="1280">1280px</option>
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
                className="w-full rounded-lg border-gray-300 shadow-sm"
              >
                <option value="5">5 fps (Smaller)</option>
                <option value="10">10 fps (Balanced)</option>
                <option value="15">15 fps (Smoother)</option>
                <option value="20">20 fps (Smoothest)</option>
              </select>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm flex items-center">
              <Sparkles className="w-4 h-4 mr-1" />
              Optimization
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'basic', label: 'Basic', desc: 'Faster, larger file' },
                { id: 'balanced', label: 'Balanced', desc: 'Recommended' },
                { id: 'maximum', label: 'Maximum', desc: 'Slower, smaller file' }
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
            
            <div>
              <div className="flex justify-between">
                <label className="text-sm text-gray-700">Colors</label>
                <span className="text-xs text-gray-500">{settings.colors}</span>
              </div>
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
                className="w-full accent-[#E44E51]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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
                <span className="ml-2 text-sm">Loop Forever</span>
              </label>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <div className="flex justify-between">
              <h4 className="font-medium text-sm flex items-center">
                <Palette className="w-4 h-4 mr-1" />
                Visual Enhancements
              </h4>
              
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
                <div>
                  <div className="flex justify-between">
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
                
                <div>
                  <div className="flex justify-between">
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
                
                <div>
                  <div className="flex justify-between">
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
          
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <h4 className="font-medium text-sm flex items-center">
              <Wand2 className="w-4 h-4 mr-1" />
              AI Features
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({
                  ...settings,
                  smartLooping: !settings.smartLooping
                })}
                className={`p-2 rounded-lg text-left ${
                  settings.smartLooping
                    ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm flex items-center">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Smart Looping
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Detect perfect loop points
                </div>
              </button>
              
              <button
                className="p-2 rounded-lg text-left bg-white border border-gray-200 hover:border-gray-300"
              >
                <div className="font-medium text-sm flex items-center">
                  <Smile className="w-4 h-4 mr-1" />
                  Scene Detection
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Find interesting moments
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">
              Est. Size: {Math.round(settings.width * settings.fps * (settings.endTime - settings.startTime) * 0.07 / settings.quality)}KB
            </span>
            
            <div className="space-x-2">
              <button
                onClick={() => generateGifWithGifJs()}
                disabled={isProcessing || !videoBlob}
                className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
                  disabled:opacity-50 flex items-center space-x-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{progress}%</span>
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    <span>Generate GIF</span>
                  </>
                )}
              </button>
              
              {previewGif && (
                <button
                  onClick={downloadGif}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 
                    flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden elements for processing */}
      <div className="hidden">
        <canvas ref={canvasRef} />
        <canvas ref={frameCanvasRef} />
      </div>
    </div>
  );
};

// Helper function to format time display
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}