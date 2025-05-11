import React, { useState, useRef, useEffect } from 'react';
import {
  Download, Loader, Check, X, Film, ChevronRight, ChevronDown,
  Youtube, Instagram, Twitter, Facebook, Linkedin, Globe,
  Settings, Video, Music, Image, Camera, Zap, Save, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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
  // Tabs and format selection
  const [activeTab, setActiveTab] = useState('video');
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedCodec, setSelectedCodec] = useState('h264');
  const [selectedQuality, setSelectedQuality] = useState('high');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Video preview
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Export settings
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
  const [frameRate, setFrameRate] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoBitrate, setVideoBitrate] = useState(5000);
  const [audioBitrate, setAudioBitrate] = useState(128);
  const [audioCodec, setAudioCodec] = useState('aac');
  
  // Special settings
  const [gifSettings, setGifSettings] = useState({
    fps: 10,
    colors: 256,
    width: 640,
    dithering: true,
    optimize: true
  });
  
  const [imageSequenceSettings, setImageSequenceSettings] = useState({
    format: 'jpg',
    quality: 90,
    frameInterval: 1
  });

  const formatCategories = {
    video: [
      { id: 'mp4', name: 'MP4', codec: ['h264', 'h265'], description: 'Best for sharing & compatibility' },
      { id: 'webm', name: 'WebM', codec: ['vp8', 'vp9'], description: 'Optimized for web' },
      { id: 'mkv', name: 'MKV', codec: ['h264', 'h265', 'vp9'], description: 'High quality container' },
      { id: 'mov', name: 'QuickTime MOV', codec: ['h264', 'prores'], description: 'Good for Apple devices' },
      { id: 'avi', name: 'AVI', codec: ['mjpeg', 'mpeg4'], description: 'Legacy format' }
    ],
    audio: [
      { id: 'mp3', name: 'MP3', codec: ['mp3'], description: 'Standard audio format' },
      { id: 'aac', name: 'AAC', codec: ['aac'], description: 'High quality audio' },
      { id: 'wav', name: 'WAV', codec: ['pcm_s16le'], description: 'Uncompressed audio' },
      { id: 'flac', name: 'FLAC', codec: ['flac'], description: 'Lossless compressed audio' },
      { id: 'ogg', name: 'OGG Vorbis', codec: ['libvorbis'], description: 'Free audio format' }
    ],
    image: [
      { id: 'gif', name: 'Animated GIF', codec: [], description: 'Animated image format' },
      { id: 'apng', name: 'Animated PNG', codec: [], description: 'Better quality than GIF' },
      { id: 'webp', name: 'WebP Animation', codec: [], description: 'Modern animated image format' },
      { id: 'jpg-seq', name: 'JPEG Sequence', codec: [], description: 'Series of JPEG images' },
      { id: 'png-seq', name: 'PNG Sequence', codec: [], description: 'Series of PNG images' }
    ],
    special: [
      { id: 'gif-optimized', name: 'Optimized GIF', codec: [], description: 'Smaller file size GIF' },
      { id: 'thumbnail', name: 'Video Thumbnail', codec: [], description: 'Extract specific frame' },
      { id: 'preview', name: 'Preview GIF', codec: [], description: 'Low quality preview' }
    ]
  };

  const qualityPresets = {
    low: { videoBitrate: 1000, audioBitrate: 64, resolution: { width: 854, height: 480 } },
    medium: { videoBitrate: 2500, audioBitrate: 128, resolution: { width: 1280, height: 720 } },
    high: { videoBitrate: 5000, audioBitrate: 192, resolution: { width: 1920, height: 1080 } },
    ultra: { videoBitrate: 8000, audioBitrate: 256, resolution: { width: 3840, height: 2160 } }
  };

  // Initialize video preview when dialog opens
  useEffect(() => {
    if (isOpen && videoBlob && videoRef.current) {
      const url = URL.createObjectURL(videoBlob);
      videoRef.current.src = url;
      
      // Get duration when metadata is loaded
      const handleMetadata = () => {
        if (videoRef.current) {
          setEndTime(videoRef.current.duration);
        }
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleMetadata);
      
      return () => {
        URL.revokeObjectURL(url);
        videoRef.current?.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [isOpen, videoBlob]);

  // Update quality preset settings when quality changes
  useEffect(() => {
    const preset = qualityPresets[selectedQuality as keyof typeof qualityPresets];
    setResolution(preset.resolution);
    setVideoBitrate(preset.videoBitrate);
    setAudioBitrate(preset.audioBitrate);
  }, [selectedQuality]);

  const handleExport = async () => {
    if (!videoBlob) {
      setErrorMessage('No video to export');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setErrorMessage('');
    
    try {
      const ffmpeg = new FFmpeg();
      
      // Set up progress tracking
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });
      
      await ffmpeg.load();
      
      // Write input file
      const inputFileName = 'input.webm';
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlob));
      
      // Determine output file name and format-specific settings
      let outputFileName = '';
      let ffmpegArgs = ['-i', inputFileName];
      
      // Add trim settings if specified
      if (startTime > 0) {
        ffmpegArgs.push('-ss', startTime.toString());
      }
      
      if (endTime > 0 && endTime < videoRef.current?.duration) {
        ffmpegArgs.push('-to', endTime.toString());
      }
      
      // Set codec and quality based on the selected format and settings
      switch (activeTab) {
        case 'video':
          outputFileName = `output.${selectedFormat}`;
          
          // Video codec
          if (selectedCodec) {
            ffmpegArgs.push('-c:v', selectedCodec);
          }
          
          // Resolution
          ffmpegArgs.push('-vf', `scale=${resolution.width}:${resolution.height}`);
          
          // Frame rate
          ffmpegArgs.push('-r', frameRate.toString());
          
          // Video bitrate
          ffmpegArgs.push('-b:v', `${videoBitrate}k`);
          
          // Audio codec and bitrate
          ffmpegArgs.push('-c:a', audioCodec);
          ffmpegArgs.push('-b:a', `${audioBitrate}k`);
          break;
          
        case 'audio':
          outputFileName = `output.${selectedFormat}`;
          
          // Extract audio only
          ffmpegArgs.push('-vn');
          
          // Audio codec
          ffmpegArgs.push('-c:a', selectedFormat === 'mp3' ? 'libmp3lame' : 
                                 selectedFormat === 'aac' ? 'aac' : 
                                 selectedFormat === 'flac' ? 'flac' :
                                 selectedFormat === 'ogg' ? 'libvorbis' : 'pcm_s16le');
          
          // Audio bitrate (except for WAV/FLAC)
          if (selectedFormat !== 'wav' && selectedFormat !== 'flac') {
            ffmpegArgs.push('-b:a', `${audioBitrate}k`);
          }
          break;
          
        case 'image':
          if (selectedFormat === 'gif') {
            outputFileName = 'output.gif';
            
            // GIF settings
            const gifFilters = [
              `fps=${gifSettings.fps}`,
              `scale=${gifSettings.width}:-1:flags=lanczos`,
              gifSettings.dithering ? 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=floyd_steinberg' : 'split[s0][s1];[s0]palettegen=max_colors=${gifSettings.colors}[p];[s1][p]paletteuse'
            ];
            
            ffmpegArgs.push('-vf', gifFilters.join(','));
          } 
          else if (selectedFormat === 'jpg-seq' || selectedFormat === 'png-seq') {
            const ext = selectedFormat === 'jpg-seq' ? 'jpg' : 'png';
            outputFileName = `frame-%04d.${ext}`;
            
            // Image sequence settings
            ffmpegArgs.push('-vf', `fps=1/${imageSequenceSettings.frameInterval}`);
            
            if (selectedFormat === 'jpg-seq') {
              ffmpegArgs.push('-q:v', (Math.round((100 - imageSequenceSettings.quality) / 5)).toString());
            }
          }
          else if (selectedFormat === 'apng' || selectedFormat === 'webp') {
            outputFileName = `output.${selectedFormat}`;
            
            // APNG/WebP settings
            ffmpegArgs.push('-vf', `fps=${gifSettings.fps},scale=${gifSettings.width}:-1`);
            
            if (selectedFormat === 'webp') {
              ffmpegArgs.push('-loop', '0');
              ffmpegArgs.push('-compression_level', '6');
            }
          }
          break;
          
        case 'special':
          if (selectedFormat === 'thumbnail') {
            outputFileName = 'thumbnail.jpg';
            
            // Extract a single frame
            ffmpegArgs = ['-i', inputFileName, '-frames:v', '1'];
            
            if (startTime > 0) {
              ffmpegArgs = ['-ss', startTime.toString(), ...ffmpegArgs];
            }
            
            ffmpegArgs.push('-q:v', '2');
          }
          break;
      }
      
      // Add output filename
      ffmpegArgs.push(outputFileName);
      
      // Execute FFmpeg command
      await ffmpeg.exec(ffmpegArgs);
      
      // Read the output file
      const data = await ffmpeg.readFile(outputFileName);
      
      // Create and download the blob
      const outputFormat = outputFileName.split('.').pop() || 'mp4';
      
      let mimeType = 'video/mp4';
      if (activeTab === 'audio') {
        mimeType = `audio/${outputFormat}`;
      } 
      else if (activeTab === 'image') {
        mimeType = outputFormat === 'gif' ? 'image/gif' : 
                  outputFormat === 'apng' ? 'image/apng' :
                  outputFormat === 'webp' ? 'image/webp' : 
                  outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      }
      
      const outputBlob = new Blob([data], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Close dialog
      setIsProcessing(false);
      onClose();
      
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage(`Export failed: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const togglePlayPreview = () => {
    if (videoRef.current) {
      if (isPreviewPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPreviewPlaying(!isPreviewPlaying);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFormatIcon = (formatId: string) => {
    switch (formatId) {
      case 'mp4':
      case 'webm':
      case 'mkv':
      case 'mov':
      case 'avi':
        return <Video className="w-4 h-4" />;
      case 'mp3':
      case 'aac':
      case 'wav':
      case 'flac':
      case 'ogg':
        return <Music className="w-4 h-4" />;
      case 'gif':
      case 'apng':
      case 'webp':
      case 'jpg-seq':
      case 'png-seq':
        return <Image className="w-4 h-4" />;
      case 'thumbnail':
        return <Camera className="w-4 h-4" />;
      case 'gif-optimized':
      case 'preview':
        return <Zap className="w-4 h-4" />;
      default:
        return <Film className="w-4 h-4" />;
    }
  };

  const getEstimatedFileSize = () => {
    if (!videoRef.current) return 'N/A';
    
    const duration = (endTime || videoRef.current.duration) - startTime;
    let bitrate = 0;
    
    switch (activeTab) {
      case 'video':
        bitrate = videoBitrate + audioBitrate;
        break;
      case 'audio':
        bitrate = audioBitrate;
        break;
      case 'image':
        // Rough estimates for image formats
        if (selectedFormat === 'gif') {
          bitrate = gifSettings.width * gifSettings.fps * 0.1;
        } else if (selectedFormat.includes('seq')) {
          bitrate = resolution.width * 0.3 / imageSequenceSettings.frameInterval;
        }
        break;
      case 'special':
        if (selectedFormat === 'thumbnail') {
          return '~100KB'; // Rough estimate for a single JPEG
        }
        break;
    }
    
    // Calculate size in MB
    const sizeInMB = (bitrate * duration * 0.128).toFixed(1);
    return `${sizeInMB} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Export Video</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {/* Left column - Preview */}
          <div className="md:col-span-1 space-y-4">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              <video 
                ref={videoRef} 
                className="w-full h-full object-contain" 
                onEnded={() => setIsPreviewPlaying(false)}
              />
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={togglePlayPreview}
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  {isPreviewPlaying ? (
                    <X className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Trim controls */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Trim Video</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={formatTime(startTime)}
                    onChange={(e) => {
                      // Parse time string like "1:30" to seconds
                      const parts = e.target.value.split(':').map(Number);
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        setStartTime(parts[0] * 60 + parts[1]);
                      }
                    }}
                    className="w-full rounded-lg border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Time</label>
                  <input
                    type="text"
                    value={formatTime(endTime)}
                    onChange={(e) => {
                      const parts = e.target.value.split(':').map(Number);
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        setEndTime(parts[0] * 60 + parts[1]);
                      }
                    }}
                    className="w-full rounded-lg border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Duration: {formatTime(endTime - startTime)}</span>
                <span>Estimated Size: {getEstimatedFileSize()}</span>
              </div>
            </div>
          </div>
          
          {/* Right columns - Format Selection */}
          <div className="md:col-span-2 space-y-6">
            {/* Format Tabs */}
            <div className="flex space-x-1 border-b overflow-x-auto">
              {Object.entries({
                video: { label: 'Video', icon: Film },
                audio: { label: 'Audio', icon: Music },
                image: { label: 'Images', icon: Image },
                special: { label: 'Special', icon: Zap }
              }).map(([tab, { label, icon: Icon }]) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    // Set default format for each tab
                    if (tab === 'video') setSelectedFormat('mp4');
                    if (tab === 'audio') setSelectedFormat('mp3');
                    if (tab === 'image') setSelectedFormat('gif');
                    if (tab === 'special') setSelectedFormat('thumbnail');
                  }}
                  className={`flex items-center space-x-1 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-[#E44E51] text-[#E44E51]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            
            {/* Format Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {formatCategories[activeTab as keyof typeof formatCategories].map((format) => (
                <button
                  key={format.id}
                  onClick={() => {
                    setSelectedFormat(format.id);
                    if (format.codec && format.codec.length > 0) {
                      setSelectedCodec(format.codec[0]);
                    }
                  }}
                  className={`flex flex-col items-start p-3 border rounded-lg transition-colors ${
                    selectedFormat === format.id
                      ? 'bg-[#E44E51]/5 border-[#E44E51] text-gray-900'
                      : 'border-gray-200 text-gray-700 hover:border-[#E44E51] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {getFormatIcon(format.id)}
                    <span className="font-medium">{format.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{format.description}</p>
                </button>
              ))}
            </div>
            
            {/* Quality Presets */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Quality</h3>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'ultra'].map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setSelectedQuality(quality)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedQuality === quality
                        ? 'bg-[#E44E51]/10 text-[#E44E51] font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Advanced Settings</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${
                showAdvancedSettings ? 'rotate-180' : ''
              }`} />
            </button>
            
            {/* Advanced Settings */}
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {activeTab === 'video' && (
                    <>
                      {/* Codec Selection */}
                      {formatCategories.video
                        .find(f => f.id === selectedFormat)?.codec.length > 0 && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Video Codec
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {formatCategories.video
                              .find(f => f.id === selectedFormat)?.codec.map(codec => (
                              <button
                                key={codec}
                                onClick={() => setSelectedCodec(codec)}
                                className={`px-3 py-2 text-sm rounded-lg ${
                                  selectedCodec === codec
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {codec.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Resolution
                          </label>
                          <select
                            value={`${resolution.width}x${resolution.height}`}
                            onChange={(e) => {
                              const [width, height] = e.target.value.split('x').map(Number);
                              setResolution({ width, height });
                            }}
                            className="w-full rounded-lg text-sm border-gray-300"
                          >
                            <option value="3840x2160">4K (3840x2160)</option>
                            <option value="2560x1440">2K (2560x1440)</option>
                            <option value="1920x1080">Full HD (1920x1080)</option>
                            <option value="1280x720">HD (1280x720)</option>
                            <option value="854x480">SD (854x480)</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Frame Rate
                          </label>
                          <select
                            value={frameRate}
                            onChange={(e) => setFrameRate(Number(e.target.value))}
                            className="w-full rounded-lg text-sm border-gray-300"
                          >
                            <option value="60">60 fps</option>
                            <option value="30">30 fps</option>
                            <option value="24">24 fps</option>
                            <option value="15">15 fps</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              Video Bitrate
                            </label>
                            <span className="text-xs text-gray-500">{videoBitrate} kbps</span>
                          </div>
                          <input
                            type="range"
                            min="500"
                            max="20000"
                            step="500"
                            value={videoBitrate}
                            onChange={(e) => setVideoBitrate(Number(e.target.value))}
                            className="w-full accent-[#E44E51]"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              Audio Bitrate
                            </label>
                            <span className="text-xs text-gray-500">{audioBitrate} kbps</span>
                          </div>
                          <input
                            type="range"
                            min="32"
                            max="320"
                            step="32"
                            value={audioBitrate}
                            onChange={(e) => setAudioBitrate(Number(e.target.value))}
                            className="w-full accent-[#E44E51]"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'audio' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Audio Codec
                        </label>
                        <select
                          value={audioCodec}
                          onChange={(e) => setAudioCodec(e.target.value)}
                          className="w-full rounded-lg text-sm border-gray-300"
                        >
                          <option value="aac">AAC</option>
                          <option value="mp3">MP3</option>
                          <option value="flac">FLAC</option>
                          <option value="opus">Opus</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="block text-sm font-medium text-gray-700">
                            Audio Bitrate
                          </label>
                          <span className="text-xs text-gray-500">{audioBitrate} kbps</span>
                        </div>
                        <input
                          type="range"
                          min="32"
                          max="320"
                          step="32"
                          value={audioBitrate}
                          onChange={(e) => setAudioBitrate(Number(e.target.value))}
                          className="w-full accent-[#E44E51]"
                        />
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'image' && selectedFormat === 'gif' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            GIF Width
                          </label>
                          <input
                            type="number"
                            value={gifSettings.width}
                            onChange={(e) => setGifSettings({
                              ...gifSettings,
                              width: Number(e.target.value)
                            })}
                            className="w-full rounded-lg border-gray-300 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Frames per Second
                          </label>
                          <input
                            type="number"
                            value={gifSettings.fps}
                            onChange={(e) => setGifSettings({
                              ...gifSettings,
                              fps: Number(e.target.value)
                            })}
                            className="w-full rounded-lg border-gray-300 text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Color Depth
                          </label>
                          <select
                            value={gifSettings.colors}
                            onChange={(e) => setGifSettings({
                              ...gifSettings,
                              colors: Number(e.target.value)
                            })}
                            className="w-full rounded-lg text-sm border-gray-300"
                          >
                            <option value="32">32 colors</option>
                            <option value="64">64 colors</option>
                            <option value="128">128 colors</option>
                            <option value="256">256 colors</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2 flex flex-col justify-end">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={gifSettings.dithering}
                              onChange={(e) => setGifSettings({
                                ...gifSettings,
                                dithering: e.target.checked
                              })}
                              className="rounded border-gray-300 text-[#E44E51]"
                            />
                            <span className="ml-2 text-sm text-gray-700">Dithering</span>
                          </label>
                          
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={gifSettings.optimize}
                              onChange={(e) => setGifSettings({
                                ...gifSettings,
                                optimize: e.target.checked
                              })}
                              className="rounded border-gray-300 text-[#E44E51]"
                            />
                            <span className="ml-2 text-sm text-gray-700">Optimize</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'image' && (selectedFormat === 'jpg-seq' || selectedFormat === 'png-seq') && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Frame Interval
                          </label>
                          <select
                            value={imageSequenceSettings.frameInterval}
                            onChange={(e) => setImageSequenceSettings({
                              ...imageSequenceSettings,
                              frameInterval: Number(e.target.value)
                            })}
                            className="w-full rounded-lg text-sm border-gray-300"
                          >
                            <option value="1">Every frame</option>
                            <option value="2">Every 2 frames</option>
                            <option value="5">Every 5 frames</option>
                            <option value="10">Every 10 frames</option>
                            <option value="30">Every second (30fps)</option>
                          </select>
                        </div>
                        
                        {selectedFormat === 'jpg-seq' && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              JPEG Quality
                            </label>
                            <input
                              type="range"
                              min="60"
                              max="100"
                              value={imageSequenceSettings.quality}
                              onChange={(e) => setImageSequenceSettings({
                                ...imageSequenceSettings,
                                quality: Number(e.target.value)
                              })}
                              className="w-full accent-[#E44E51]"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Smaller</span>
                              <span>{imageSequenceSettings.quality}%</span>
                              <span>Higher Quality</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Error message */}
        {errorMessage && (
          <div className="px-6 py-2 text-red-600 bg-red-50 text-sm">
            {errorMessage}
          </div>
        )}
        
        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end items-center space-x-2">
          <div className="text-sm text-gray-500">
            {isProcessing && (
              <div className="flex items-center">
                <Loader className="animate-spin w-4 h-4 mr-2" />
                Processing: {progress}%
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          
          <button
            onClick={handleExport}
            disabled={isProcessing || !videoBlob}
            className="px-6 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
              disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportDialog;