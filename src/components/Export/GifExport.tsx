import React, { useState, useRef, useCallback } from 'react';
import { 
  Download, X, Settings, Film, Image, Loader,
  Play, Pause, SkipBack, SkipForward, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GifExportProps {
  videoBlob: Blob;
  onClose: () => void;
}

export const GifExport: React.FC<GifExportProps> = ({ videoBlob, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    startTime: 0,
    endTime: 5,
    width: 480,
    fps: 10,
    quality: 10, // 1-20, lower is better
    loop: true,
    dither: true
  });

  const [showSettings, setShowSettings] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate GIF
  const generateGif = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas dimensions
    const aspectRatio = video.videoWidth / video.videoHeight;
    const height = Math.round(settings.width / aspectRatio);
    canvas.width = settings.width;
    canvas.height = height;

    // Calculate frame count
    const duration = settings.endTime - settings.startTime;
    const frameCount = Math.ceil(duration * settings.fps);
    const delay = Math.round(1000 / settings.fps);

    // For now, we'll create a simple preview (actual GIF encoding would require gif.js)
    for (let i = 0; i < frameCount; i++) {
      const time = settings.startTime + (i / settings.fps);
      
      video.currentTime = time;
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const progressPercent = Math.round(((i + 1) / frameCount) * 100);
      setProgress(progressPercent);
      
      // Small delay to prevent freezing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Get final frame as preview
    const finalUrl = canvas.toDataURL('image/png');
    setGifUrl(finalUrl);
    setIsProcessing(false);
  }, [settings]);

  // Download GIF
  const downloadGif = useCallback(() => {
    if (!gifUrl) return;
    
    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = 'animation.gif';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [gifUrl]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Film className="w-5 h-5 text-[#E44E51]" />
            <h2 className="text-lg font-semibold">Export as GIF</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={URL.createObjectURL(videoBlob)}
              className="w-full h-full object-contain"
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* GIF Preview */}
            {gifUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <img 
                  src={gifUrl} 
                  alt="GIF Preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            
            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <Loader className="w-12 h-12 text-white animate-spin mb-2" />
                <p className="text-white">Processing... {progress}%</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h3 className="font-medium">GIF Settings</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Time Range */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Start Time (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.startTime}
                        onChange={(e) => setSettings(s => ({ 
                          ...s, 
                          startTime: Math.max(0, parseFloat(e.target.value) || 0) 
                        }))}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        End Time (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={settings.endTime}
                        onChange={(e) => setSettings(s => ({ 
                          ...s, 
                          endTime: Math.max(s.startTime + 1, parseFloat(e.target.value) || 5) 
                        }))}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                    
                    {/* Size */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Width (px)
                      </label>
                      <select
                        value={settings.width}
                        onChange={(e) => setSettings(s => ({ 
                          ...s, 
                          width: parseInt(e.target.value) 
                        }))}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value={320}>320px</option>
                        <option value={480}>480px</option>
                        <option value={640}>640px</option>
                        <option value={800}>800px</option>
                        <option value={1024}>1024px</option>
                      </select>
                    </div>
                    
                    {/* FPS */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Frame Rate (FPS)
                      </label>
                      <select
                        value={settings.fps}
                        onChange={(e) => setSettings(s => ({ 
                          ...s, 
                          fps: parseInt(e.target.value) 
                        }))}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value={5}>5 FPS</option>
                        <option value={10}>10 FPS</option>
                        <option value={15}>15 FPS</option>
                        <option value={24}>24 FPS</option>
                      </select>
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-700">Quality</label>
                      <span className="text-sm text-gray-500">
                        {settings.quality === 1 ? 'Best' : settings.quality === 20 ? 'Smallest' : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={settings.quality}
                      onChange={(e) => setSettings(s => ({ 
                        ...s, 
                        quality: parseInt(e.target.value) 
                      }))}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.loop}
                        onChange={(e) => setSettings(s => ({ ...s, loop: e.target.checked }))}
                        className="rounded text-[#E44E51]"
                      />
                      <span className="text-sm">Loop animation</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.dither}
                        onChange={(e) => setSettings(s => ({ ...s, dither: e.target.checked }))}
                        className="rounded text-[#E44E51]"
                      />
                      <span className="text-sm">Dithering</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info */}
          <div className="text-sm text-gray-500">
            <p>Duration: {settings.endTime - settings.startTime} seconds</p>
            <p>Estimated frames: {Math.ceil((settings.endTime - settings.startTime) * settings.fps)}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{showSettings ? 'Hide' : 'Show'} Settings</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            
            {!gifUrl ? (
              <button
                onClick={generateGif}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    <span>Generate GIF</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={downloadGif}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Download GIF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GifExport;
