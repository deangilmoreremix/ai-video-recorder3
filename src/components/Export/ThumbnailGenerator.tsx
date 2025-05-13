import React, { useState, useRef, useEffect } from 'react';
import {
  Grid, Camera, Palette, Crop, Download, Play,
  Wand2, Sliders, Layers, Copy, Trash2, Type,
  RefreshCw, Check, ArrowRight, Image, Sparkles
} from 'lucide-react';

interface ThumbnailGeneratorProps {
  videoBlob: Blob | null;
  onGenerate?: (thumbnails: Blob[]) => void;
}

export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  videoBlob,
  onGenerate
}) => {
  const [settings, setSettings] = useState({
    count: 3,
    format: 'jpg' as 'jpg' | 'png' | 'webp',
    quality: 90,
    cropEnabled: false,
    colorCorrection: true,
    aspectRatio: '16:9' as '16:9' | '9:16' | '1:1' | '4:3',
    textOverlay: false,
    textContent: '',
    autoDetect: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (videoBlob && videoRef.current) {
      const url = URL.createObjectURL(videoBlob);
      videoRef.current.src = url;
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoBlob]);
  
  const generateThumbnails = async () => {
    if (!videoBlob || !videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Set canvas size to match video or aspect ratio
      const aspectRatioMultiplier = 
        settings.aspectRatio === '16:9' ? { w: 16, h: 9 } :
        settings.aspectRatio === '9:16' ? { w: 9, h: 16 } :
        settings.aspectRatio === '1:1' ? { w: 1, h: 1 } :
        { w: 4, h: 3 };
      
      if (settings.cropEnabled) {
        // Use custom aspect ratio
        const height = Math.round((video.videoWidth / aspectRatioMultiplier.w) * aspectRatioMultiplier.h);
        canvas.width = video.videoWidth;
        canvas.height = height;
      } else {
        // Match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const duration = video.duration;
      const results: string[] = [];
      const blobResults: Blob[] = [];
      
      // Generate thumbnails at evenly spaced intervals
      for (let i = 0; i < settings.count; i++) {
        // Calculate position (add 0.5 to avoid exact 0)
        const position = ((i + 0.5) / settings.count) * duration;
        
        // Set video position
        video.currentTime = position;
        
        // Wait for the video to seek to the time
        await new Promise<void>(resolve => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          video.addEventListener('seeked', handleSeeked);
        });
        
        // Draw the frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply color correction if enabled
        if (settings.colorCorrection) {
          // Simple brightness and contrast adjustment
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Apply simple enhancement
          for (let j = 0; j < data.length; j += 4) {
            // Increase contrast slightly
            data[j] = Math.min(255, data[j] * 1.1);     // Red
            data[j + 1] = Math.min(255, data[j + 1] * 1.1); // Green
            data[j + 2] = Math.min(255, data[j + 2] * 1.1); // Blue
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Add text overlay if enabled
        if (settings.textOverlay && settings.textContent) {
          const text = settings.textContent;
          ctx.font = 'bold 32px Arial';
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.textAlign = 'center';
          ctx.strokeText(text, canvas.width / 2, canvas.height - 40);
          ctx.fillText(text, canvas.width / 2, canvas.height - 40);
        }
        
        // Convert canvas to blob
        const mimeType = 
          settings.format === 'jpg' ? 'image/jpeg' :
          settings.format === 'png' ? 'image/png' : 'image/webp';
        
        const quality = settings.format === 'jpg' || settings.format === 'webp' 
          ? settings.quality / 100 
          : undefined;
        
        const blob = await new Promise<Blob>(resolve => {
          canvas.toBlob(blob => resolve(blob!), mimeType, quality);
        });
        
        blobResults.push(blob);
        
        // Create URL for preview
        const url = URL.createObjectURL(blob);
        results.push(url);
        
        // Update progress
        setProgress(Math.round(((i + 1) / settings.count) * 100));
      }
      
      setThumbnails(results);
      
      // Call the onGenerate callback with the generated thumbnails
      if (onGenerate) {
        onGenerate(blobResults);
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {/* Video Preview */}
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative shadow-md">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
            />
          </div>
          
          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Processing Button */}
          <button
            onClick={generateThumbnails}
            disabled={isProcessing || !videoBlob}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing... {progress}%</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Generate Thumbnails</span>
              </div>
            )}
          </button>
        </div>
        
        <div className="md:col-span-2">
          <div className="p-4 bg-gray-50 rounded-lg space-y-6 shadow-sm">
            <h3 className="text-lg font-medium">Thumbnail Generator</h3>
            <p className="text-sm text-gray-600">Create high-quality thumbnails from your video with customizable settings.</p>
            
            {/* Settings Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Number of Thumbnails
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="9"
                    value={settings.count}
                    onChange={(e) => setSettings({
                      ...settings,
                      count: Number(e.target.value)
                    })}
                    className="flex-1 accent-[#E44E51] mr-2"
                  />
                  <span className="text-sm font-medium w-6 text-center">
                    {settings.count}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Format</label>
                <div className="grid grid-cols-3 gap-1">
                  {['jpg', 'png', 'webp'].map(format => (
                    <button
                      key={format}
                      onClick={() => setSettings({
                        ...settings,
                        format: format as any
                      })}
                      className={`py-1 rounded-lg text-xs ${
                        settings.format === format
                          ? 'bg-[#E44E51] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Feature toggles */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSettings({
                  ...settings,
                  colorCorrection: !settings.colorCorrection
                })}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                  settings.colorCorrection
                    ? 'bg-[#E44E51]/10 text-[#E44E51]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Auto Color</span>
              </button>
              
              <button
                onClick={() => setSettings({
                  ...settings,
                  cropEnabled: !settings.cropEnabled
                })}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                  settings.cropEnabled
                    ? 'bg-[#E44E51]/10 text-[#E44E51]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Crop className="w-4 h-4" />
                <span>Smart Crop</span>
              </button>
              
              <button
                onClick={() => setSettings({
                  ...settings,
                  textOverlay: !settings.textOverlay
                })}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                  settings.textOverlay
                    ? 'bg-[#E44E51]/10 text-[#E44E51]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Text Overlay</span>
              </button>
            </div>
            
            {/* Additional settings that appear based on toggles */}
            {settings.textOverlay && (
              <div className="p-3 bg-white rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overlay Text
                </label>
                <input
                  type="text"
                  value={settings.textContent}
                  onChange={(e) => setSettings({
                    ...settings,
                    textContent: e.target.value
                  })}
                  placeholder="Enter text to overlay"
                  className="w-full rounded-lg border-gray-300"
                />
              </div>
            )}
            
            {settings.cropEnabled && (
              <div className="p-3 bg-white rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '16:9', label: 'Landscape 16:9' },
                    { id: '9:16', label: 'Portrait 9:16' },
                    { id: '1:1', label: 'Square 1:1' },
                    { id: '4:3', label: 'Standard 4:3' }
                  ].map(ratio => (
                    <button
                      key={ratio.id}
                      onClick={() => setSettings({
                        ...settings,
                        aspectRatio: ratio.id as any
                      })}
                      className={`py-2 text-sm rounded-lg ${
                        settings.aspectRatio === ratio.id
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Generated Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Generated Thumbnails</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {thumbnails.map((url, index) => (
              <div
                key={index}
                className={`relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer group ${
                  selectedIndex === index ? 'ring-2 ring-[#E44E51]' : ''
                }`}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity"></div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={url} 
                    download={`thumbnail-${index + 1}.${settings.format}`}
                    className="p-1.5 bg-white rounded-full text-gray-700 hover:text-gray-900 shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                
                {selectedIndex === index && (
                  <div className="absolute bottom-2 right-2 p-1 bg-[#E44E51] rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedIndex !== null && (
            <div className="flex justify-end space-x-2">
              <button 
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button 
                className="px-3 py-1.5 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-sm text-sm flex items-center space-x-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Use Selected</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};