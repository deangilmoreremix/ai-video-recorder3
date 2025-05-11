import React, { useState, useRef, useEffect } from 'react';
import {
  Grid, Camera, Palette, Crop, Download, Play,
  Wand2, Sliders, Layers, Copy, Trash2, Type,
  RefreshCw, Check, ArrowRight, Image, Sparkles
} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface ThumbnailGeneratorProps {
  videoBlob: Blob | null;
  onGenerate?: (thumbnails: Blob[]) => void;
}

interface ThumbnailSettings {
  count: number;
  format: 'jpg' | 'png' | 'webp';
  quality: number;
  cropEnabled: boolean;
  colorCorrection: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  textOverlay: boolean;
  textContent: string;
  autoDetect: boolean;
}

export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  videoBlob,
  onGenerate
}) => {
  const [settings, setSettings] = useState<ThumbnailSettings>({
    count: 3,
    format: 'jpg',
    quality: 90,
    cropEnabled: false,
    colorCorrection: true,
    aspectRatio: '16:9',
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
    if (!videoBlob || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));
      
      const duration = videoRef.current.duration;
      const results = [];
      
      for (let i = 0; i < settings.count; i++) {
        // Calculate timestamp for this thumbnail
        const timestamp = (duration / (settings.count + 1)) * (i + 1);
        
        // Build FFmpeg command
        const outputFilename = `thumbnail_${i}.${settings.format}`;
        const args = [
          '-ss', timestamp.toString(),
          '-i', 'input.webm',
          '-frames:v', '1'
        ];
        
        // Add quality settings
        if (settings.format === 'jpg') {
          args.push('-q:v', (Math.round((100 - settings.quality) / 5)).toString());
        } else if (settings.format === 'webp') {
          args.push('-q:v', settings.quality.toString());
        }
        
        // Apply color correction if enabled
        if (settings.colorCorrection) {
          args.push('-vf', 'eq=brightness=0.05:contrast=1.1:saturation=1.2');
        }
        
        // Add output filename
        args.push(outputFilename);
        
        // Execute FFmpeg command
        await ffmpeg.exec(args);
        
        // Read the output file
        const data = await ffmpeg.readFile(outputFilename);
        
        // Create thumbnail URL
        const blob = new Blob([data], { 
          type: settings.format === 'jpg' ? 'image/jpeg' : 
                settings.format === 'png' ? 'image/png' : 'image/webp' 
        });
        
        const url = URL.createObjectURL(blob);
        results.push(url);
        
        // Update progress
        setProgress(Math.round(((i + 1) / settings.count) * 100));
      }
      
      setThumbnails(results);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const generateAnimatedThumbnail = async () => {
    if (!videoBlob || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));
      
      // Select a point in the video for the animated thumbnail
      const duration = videoRef.current.duration;
      const startTime = duration / 3; // Pick a point around 1/3 through
      
      // Create a short GIF
      const args = [
        '-ss', startTime.toString(),
        '-t', '3',  // 3 seconds duration
        '-i', 'input.webm',
        '-vf', 'fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=sierra2_4a',
        'output.gif'
      ];
      
      await ffmpeg.exec(args);
      
      // Read the output file
      const data = await ffmpeg.readFile('output.gif');
      
      // Create thumbnail URL
      const blob = new Blob([data], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      
      setThumbnails([url]);
    } catch (error) {
      console.error('Error generating animated thumbnail:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Thumbnail Generator</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
          />
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <button
              onClick={() => setSettings({
                ...settings,
                autoDetect: !settings.autoDetect
              })}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                settings.autoDetect
                  ? 'bg-[#E44E51]/10 text-[#E44E51]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Detection</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={generateThumbnails}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
                disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>Generate Thumbnails</span>
            </button>
            
            <button
              onClick={generateAnimatedThumbnail}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 
                disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Create Animated</span>
            </button>
          </div>
        </div>
      </div>
      
      {thumbnails.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Generated Thumbnails</h4>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
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
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={url} 
                    download={`thumbnail-${index + 1}.${settings.format}`}
                    className="p-1 bg-white rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </a>
                </div>
                
                {selectedIndex === index && (
                  <div className="absolute bottom-1 right-1 p-1 bg-[#E44E51] rounded-full">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedIndex !== null && (
            <div className="flex justify-end space-x-2 mt-2">
              <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center space-x-1">
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button className="px-3 py-1.5 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] text-sm flex items-center space-x-1">
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