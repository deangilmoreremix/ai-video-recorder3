import React, { useState, useRef, useEffect } from 'react';
import {
  Download, Loader, Video, Settings, Youtube, Instagram,
  Twitter, Facebook, Linkedin, Globe, ChevronRight, 
  X, Play, Check, Camera, Wand2, Film, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';

// Import the thumbnail generator and GIF creator
import { ThumbnailGenerator } from './ThumbnailGenerator';
import { AnimatedGifCreator } from './AnimatedGifCreator';

interface EnhancedExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
}

const EnhancedExportDialog: React.FC<EnhancedExportDialogProps> = ({
  isOpen,
  onClose,
  videoBlob
}) => {
  const [activeTab, setActiveTab] = useState('video');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportResult, setExportResult] = useState<{ url: string; blob: Blob } | null>(null);
  
  // Video settings
  const [videoSettings, setVideoSettings] = useState({
    format: 'mp4',
    quality: 80,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    codec: 'h264',
    selectedPlatform: 'youtube'
  });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'custom', name: 'Custom', icon: Globe }
  ];
  
  // Create a preview URL for the video blob
  useEffect(() => {
    if (videoBlob && videoRef.current) {
      const url = URL.createObjectURL(videoBlob);
      videoRef.current.src = url;
      
      // Clean up when the component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoBlob]);
  
  // Clean up export result URL when the component unmounts
  useEffect(() => {
    return () => {
      if (exportResult) {
        URL.revokeObjectURL(exportResult.url);
      }
    };
  }, [exportResult]);
  
  const handleExportVideo = async () => {
    if (!videoBlob) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // This would be replaced with real video processing
      // For now, we'll simulate the processing
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Create a download URL
      const url = URL.createObjectURL(videoBlob);
      setExportResult({ url, blob: videoBlob });
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };
  
  const createDownloadPackage = async () => {
    if (!exportResult) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Create a ZIP file with the video and related assets
      const zip = new JSZip();
      
      // Add the main video
      zip.file(`video.${videoSettings.format}`, exportResult.blob);
      
      // Create a README file with info
      const readme = `Video Export Information:
- Format: ${videoSettings.format.toUpperCase()}
- Resolution: ${videoSettings.resolution.width}x${videoSettings.resolution.height}
- FPS: ${videoSettings.fps}
- Quality: ${videoSettings.quality}%
- Optimized for: ${videoSettings.selectedPlatform}

Created with AI Screen Recorder
`;
      zip.file("README.txt", readme);
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create a download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_export_package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Creating download package failed:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };
  
  // Handle GIF generation completion
  const handleGifGenerated = (gif: Blob) => {
    const url = URL.createObjectURL(gif);
    setExportResult({ url, blob: gif });
    setIsProcessing(false);
  };
  
  // Handle thumbnail generation completion
  const handleThumbnailsGenerated = (thumbnails: Blob[]) => {
    if (thumbnails.length > 0) {
      const url = URL.createObjectURL(thumbnails[0]);
      setExportResult({ url, blob: thumbnails[0] });
    }
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto"
      >
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Export Media</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'video'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Video className="w-4 h-4 mr-2" />
              Video Export
            </button>
            <button
              onClick={() => setActiveTab('gif')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'gif'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Film className="w-4 h-4 mr-2" />
              Create GIF
            </button>
            <button
              onClick={() => setActiveTab('thumbnail')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'thumbnail'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Camera className="w-4 h-4 mr-2" />
              Thumbnails
            </button>
          </div>

          {/* Content */}
          <div className="py-6">
            {activeTab === 'video' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Video Preview */}
                <div className="md:col-span-1">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      controls
                    ></video>
                  </div>
                  
                  {exportResult ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <Check className="w-4 h-4 mr-1" />
                          Export Complete!
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={exportResult.url}
                          download={`exported-video.${videoSettings.format}`}
                          className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                        <button
                          onClick={createDownloadPackage}
                          className="flex items-center justify-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Create Package
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleExportVideo}
                      disabled={isProcessing || !videoBlob}
                      className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                          <span>Processing... {progress}%</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          <span>Export Video</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Export Settings */}
                <div className="md:col-span-2">
                  {/* Format Selection */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Export Format
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {['mp4', 'webm', 'mov', 'avi'].map((format) => (
                          <button
                            key={format}
                            onClick={() => setVideoSettings({ ...videoSettings, format })}
                            className={`p-3 rounded-lg border text-center ${
                              videoSettings.format === format
                                ? 'border-[#E44E51] bg-[#E44E51]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium text-lg uppercase">{format}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Optimize for Platform
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {platforms.map((platform) => {
                          const Icon = platform.icon;
                          return (
                            <button
                              key={platform.id}
                              onClick={() => setVideoSettings({ 
                                ...videoSettings, 
                                selectedPlatform: platform.id 
                              })}
                              className={`p-3 rounded-lg border flex flex-col items-center ${
                                videoSettings.selectedPlatform === platform.id
                                  ? 'border-[#E44E51] bg-[#E44E51]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon className="w-6 h-6 mb-1" />
                              <span className="text-xs">{platform.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution
                      </label>
                      <select
                        value={`${videoSettings.resolution.width}x${videoSettings.resolution.height}`}
                        onChange={(e) => {
                          const [width, height] = e.target.value.split('x').map(Number);
                          setVideoSettings({ 
                            ...videoSettings, 
                            resolution: { width, height }
                          });
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E44E51] focus:ring-[#E44E51]"
                      >
                        <option value="3840x2160">4K (3840x2160)</option>
                        <option value="2560x1440">2K (2560x1440)</option>
                        <option value="1920x1080">Full HD (1920x1080)</option>
                        <option value="1280x720">HD (1280x720)</option>
                        <option value="854x480">SD (854x480)</option>
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Quality
                        </label>
                        <span className="text-sm text-gray-500">
                          {videoSettings.quality}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={videoSettings.quality}
                        onChange={(e) => setVideoSettings({
                          ...videoSettings,
                          quality: parseInt(e.target.value)
                        })}
                        className="w-full accent-[#E44E51]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frame Rate
                      </label>
                      <select
                        value={videoSettings.fps}
                        onChange={(e) => setVideoSettings({
                          ...videoSettings,
                          fps: parseInt(e.target.value)
                        })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E44E51] focus:ring-[#E44E51]"
                      >
                        <option value="60">60 FPS</option>
                        <option value="30">30 FPS</option>
                        <option value="24">24 FPS (Cinematic)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'gif' && videoBlob && (
              <AnimatedGifCreator
                videoBlob={videoBlob}
                onGenerate={handleGifGenerated}
              />
            )}
            
            {activeTab === 'thumbnail' && videoBlob && (
              <ThumbnailGenerator
                videoBlob={videoBlob}
                onGenerate={handleThumbnailsGenerated}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedExportDialog;