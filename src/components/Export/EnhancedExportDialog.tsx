import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader, Check, X, Film, ChevronRight, ChevronDown, Youtube, Instagram, Twitter, Facebook, Linkedin, Globe, Settings, Video, Music, Image, Camera, Zap, Save, Send, Crop, Sparkles, Layout, Grid, Maximize2, Eye, Play, Pause, Monitor, Smile, Sliders, SlidersHorizontal, Palette, Wand2, Copy, RotateCcw, Eclipse as Flip, RefreshCw, Sun, Layers, Type, Brush } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface EnhancedExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
}

interface CropSettings {
  enabled: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
  aspectRatio: string;
}

interface ColorCorrectionSettings {
  enabled: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  gamma: number;
}

interface ThumbnailSettings {
  autoDetectScenes: boolean;
  generateMultiple: boolean;
  count: number;
  interval: number;
  includeTimestamp: boolean;
  extractSubtitles: boolean;
  applyColorCorrection: boolean;
  smartCrop: boolean;
  includeSeries: boolean;
  format: 'jpg' | 'png' | 'webp';
  quality: number;
}

interface AnimatedThumbnailSettings {
  type: 'gif' | 'webp' | 'mp4';
  duration: number;
  fps: number;
  smartLooping: boolean;
  zoomEffect: boolean;
  zoomAmount: number;
  pipEnabled: boolean;
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  includeTimelapse: boolean;
  frameCount: number;
  quality: number;
  width: number;
  dithering: boolean;
  optimize: boolean;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'general';
}

interface TextOverlaySettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'top' | 'center' | 'bottom';
  extractFromSubtitles: boolean;
}

const EnhancedExportDialog: React.FC<EnhancedExportDialogProps> = ({
  isOpen,
  onClose,
  videoBlob
}) => {
  // Tabs and format selection
  const [activeTab, setActiveTab] = useState('video');
  const [activeSubTab, setActiveSubTab] = useState('standard');
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Export settings
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });
  const [frameRate, setFrameRate] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoBitrate, setVideoBitrate] = useState(5000);
  const [audioBitrate, setAudioBitrate] = useState(128);
  const [audioCodec, setAudioCodec] = useState('aac');
  
  // Thumbnail settings
  const [thumbnailSettings, setThumbnailSettings] = useState<ThumbnailSettings>({
    autoDetectScenes: true,
    generateMultiple: false,
    count: 3,
    interval: 5,
    includeTimestamp: true,
    extractSubtitles: false,
    applyColorCorrection: true,
    smartCrop: true,
    includeSeries: false,
    format: 'jpg',
    quality: 90
  });
  
  // Crop settings for thumbnails/GIFs
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    enabled: false,
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    aspectRatio: '16:9'
  });

  // Color correction settings
  const [colorSettings, setColorSettings] = useState<ColorCorrectionSettings>({
    enabled: false,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    gamma: 1
  });

  // Animated thumbnail settings
  const [animatedSettings, setAnimatedSettings] = useState<AnimatedThumbnailSettings>({
    type: 'gif',
    duration: 3,
    fps: 10,
    smartLooping: true,
    zoomEffect: false,
    zoomAmount: 10,
    pipEnabled: false,
    pipPosition: 'bottom-right',
    includeTimelapse: false,
    frameCount: 5,
    quality: 75,
    width: 640,
    dithering: true,
    optimize: true,
    platform: 'general'
  });

  // Text overlay settings
  const [textOverlaySettings, setTextOverlaySettings] = useState<TextOverlaySettings>({
    enabled: false,
    text: 'Add your text here',
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.5,
    position: 'bottom',
    extractFromSubtitles: false
  });

  // Detected scenes for thumbnails
  const [detectedScenes, setDetectedScenes] = useState<number[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  
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
    thumbnails: [
      { id: 'single', name: 'Single Thumbnail', codec: [], description: 'Extract key frame' },
      { id: 'multiple', name: 'Multiple Thumbnails', codec: [], description: 'Generate thumbnail set' },
      { id: 'smart-crop', name: 'Smart Cropping', codec: [], description: 'AI-based cropping' },
      { id: 'animated', name: 'Animated Thumbnail', codec: [], description: 'Short animated preview' },
      { id: 'timelapse', name: 'Timelapse Grid', codec: [], description: 'Show video progression' }
    ]
  };

  const platformPresets = {
    youtube: { width: 1280, height: 720, format: 'jpg', quality: 90 },
    instagram: { width: 1080, height: 1080, format: 'jpg', quality: 90 },
    tiktok: { width: 1080, height: 1920, format: 'jpg', quality: 90 },
    facebook: { width: 1200, height: 630, format: 'jpg', quality: 90 },
    twitter: { width: 1200, height: 675, format: 'jpg', quality: 90 },
    general: { width: 1280, height: 720, format: 'jpg', quality: 90 }
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

  // Update canvas dimensions when video loads
  useEffect(() => {
    if (canvasRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }
  }, [videoRef.current?.readyState]);

  // Initialize crop settings based on video dimensions
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      setCropSettings({
        ...cropSettings,
        width: videoWidth,
        height: videoHeight
      });
    }
  }, [videoRef.current?.readyState]);

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
      
      if (endTime > 0 && endTime < videoRef.current?.duration!) {
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
          
        case 'thumbnails':
          if (activeSubTab === 'standard' || activeSubTab === 'single') {
            // Standard single thumbnail extraction
            const format = thumbnailSettings.format;
            outputFileName = `thumbnail.${format}`;
            
            // Extract a single frame
            ffmpegArgs = ['-i', inputFileName, '-frames:v', '1'];
            
            // Use scene timestamp if selected, otherwise use startTime
            if (selectedSceneIndex !== null && detectedScenes.length > 0) {
              ffmpegArgs = ['-ss', detectedScenes[selectedSceneIndex].toString(), ...ffmpegArgs];
            } else if (startTime > 0) {
              ffmpegArgs = ['-ss', startTime.toString(), ...ffmpegArgs];
            }
            
            // Apply smart cropping if enabled
            if (thumbnailSettings.smartCrop && cropSettings.enabled) {
              ffmpegArgs.push('-vf', `crop=${cropSettings.width}:${cropSettings.height}:${cropSettings.left}:${cropSettings.top}`);
            }
            
            // Apply color correction if enabled
            if (thumbnailSettings.applyColorCorrection && colorSettings.enabled) {
              const colorFilters = [];
              if (colorSettings.brightness !== 0) colorFilters.push(`brightness=${1 + colorSettings.brightness * 0.1}`);
              if (colorSettings.contrast !== 0) colorFilters.push(`contrast=${1 + colorSettings.contrast * 0.1}`);
              if (colorSettings.saturation !== 0) colorFilters.push(`saturation=${1 + colorSettings.saturation * 0.1}`);
              if (colorSettings.gamma !== 1) colorFilters.push(`gamma=${colorSettings.gamma}`);
              if (colorSettings.hue !== 0) colorFilters.push(`hue=h=${colorSettings.hue}`);
              
              if (colorFilters.length > 0) {
                ffmpegArgs.push('-vf', colorFilters.join(','));
              }
            }
            
            // Set quality
            ffmpegArgs.push('-q:v', Math.round(thumbnailSettings.quality / 10).toString());
          } 
          else if (activeSubTab === 'multiple') {
            // Generate multiple thumbnails at different timestamps
            const format = thumbnailSettings.format;
            outputFileName = `thumbnail-%03d.${format}`;
            
            // Generate thumbnails at regular intervals
            const interval = (endTime - startTime) / (thumbnailSettings.count + 1);
            let filterComplex = '';
            
            for (let i = 0; i < thumbnailSettings.count; i++) {
              const time = startTime + interval * (i + 1);
              
              // Add -ss command for each thumbnail
              ffmpegArgs.push('-ss', time.toString());
              ffmpegArgs.push('-i', inputFileName);
            }
            
            // Apply smart cropping if enabled
            if (thumbnailSettings.smartCrop && cropSettings.enabled) {
              for (let i = 0; i < thumbnailSettings.count; i++) {
                ffmpegArgs.push('-vf', `crop=${cropSettings.width}:${cropSettings.height}:${cropSettings.left}:${cropSettings.top}`);
              }
            }
            
            // Generate one frame per input
            ffmpegArgs.push('-frames:v', '1');
          }
          else if (activeSubTab === 'animated') {
            // Animated thumbnail (GIF or short video)
            const type = animatedSettings.type;
            outputFileName = `animated-thumbnail.${type}`;
            
            // Duration and position filter
            let seekTime = startTime;
            if (selectedSceneIndex !== null && detectedScenes.length > 0) {
              seekTime = detectedScenes[selectedSceneIndex];
            }
            
            ffmpegArgs = ['-ss', seekTime.toString(), '-t', animatedSettings.duration.toString(), '-i', inputFileName];
            
            // Apply filters based on animation type
            const filters = [];
            
            // Resize
            filters.push(`scale=${animatedSettings.width}:-1:flags=lanczos`);
            
            // Apply smart crop if enabled
            if (thumbnailSettings.smartCrop && cropSettings.enabled) {
              filters.push(`crop=${cropSettings.width}:${cropSettings.height}:${cropSettings.left}:${cropSettings.top}`);
            }
            
            // Apply fps for GIF/WebP
            if (type === 'gif' || type === 'webp') {
              filters.push(`fps=${animatedSettings.fps}`);
            }
            
            // Apply zoom effect if enabled
            if (animatedSettings.zoomEffect) {
              const zoom = 1 + (animatedSettings.zoomAmount / 100);
              filters.push(`zoompan=z='min(zoom+0.0015,${zoom})':d=${animatedSettings.duration * animatedSettings.fps}:s=${animatedSettings.width}x${animatedSettings.height}`);
            }
            
            // Apply color correction if enabled
            if (thumbnailSettings.applyColorCorrection && colorSettings.enabled) {
              if (colorSettings.brightness !== 0) filters.push(`eq=brightness=${colorSettings.brightness * 0.1}`);
              if (colorSettings.contrast !== 0) filters.push(`eq=contrast=${1 + colorSettings.contrast * 0.1}`);
              if (colorSettings.saturation !== 0) filters.push(`eq=saturation=${1 + colorSettings.saturation * 0.1}`);
              if (colorSettings.gamma !== 1) filters.push(`eq=gamma=${colorSettings.gamma}`);
              if (colorSettings.hue !== 0) filters.push(`hue=h=${colorSettings.hue}`);
            }
            
            if (filters.length > 0) {
              ffmpegArgs.push('-vf', filters.join(','));
            }
            
            // Specific settings for each format
            if (type === 'gif') {
              // Palette generation for higher quality GIFs
              ffmpegArgs = [
                '-ss', seekTime.toString(),
                '-t', animatedSettings.duration.toString(),
                '-i', inputFileName,
                '-vf', `${filters.join(',')},split[s0][s1];[s0]palettegen=max_colors=${gifSettings.colors}[p];[s1][p]paletteuse${animatedSettings.dithering ? '=dither=floyd_steinberg' : ''}`
              ];
            } else if (type === 'webp') {
              ffmpegArgs.push('-loop', '0');
              ffmpegArgs.push('-quality', animatedSettings.quality.toString());
            } else if (type === 'mp4') {
              // Create a small, efficient MP4
              ffmpegArgs.push('-c:v', 'libx264');
              ffmpegArgs.push('-preset', 'fast');
              ffmpegArgs.push('-crf', (30 - animatedSettings.quality / 5).toString());
              ffmpegArgs.push('-an'); // No audio
              
              // Create a looping video if smart looping is enabled
              if (animatedSettings.smartLooping) {
                // Create a forward-backward loop
                ffmpegArgs = [
                  '-ss', seekTime.toString(),
                  '-t', (animatedSettings.duration / 2).toString(),
                  '-i', inputFileName,
                  '-filter_complex', `[0:v]${filters.join(',')},split[v1][v2];[v1]fifo[v1out];[v2]reverse[v2out];[v1out][v2out]concat=n=2:v=1:a=0[out]`,
                  '-map', '[out]',
                  '-c:v', 'libx264',
                  '-preset', 'fast',
                  '-crf', (30 - animatedSettings.quality / 5).toString(),
                  '-an'
                ];
              }
            }
            
            // Add text overlay if enabled
            if (textOverlaySettings.enabled) {
              // We need to modify the existing filter chain to add text
              // This gets complex with filter_complex, so we'll handle it specially
              // For simplicity here, we'll just add a simple drawtext
              const textFilter = `drawtext=text='${textOverlaySettings.text}':fontcolor=${textOverlaySettings.fontColor}:fontsize=${textOverlaySettings.fontSize}:x=(w-text_w)/2:y=${textOverlaySettings.position === 'top' ? '10' : textOverlaySettings.position === 'center' ? '(h-text_h)/2' : 'h-text_h-10'}:box=1:boxcolor=${textOverlaySettings.backgroundColor}@${textOverlaySettings.backgroundOpacity}`;
              
              if (type === 'gif') {
                // For GIF with palette, we need special handling
                ffmpegArgs = [
                  '-ss', seekTime.toString(),
                  '-t', animatedSettings.duration.toString(),
                  '-i', inputFileName,
                  '-vf', `${filters.join(',')},${textFilter},split[s0][s1];[s0]palettegen=max_colors=${gifSettings.colors}[p];[s1][p]paletteuse${animatedSettings.dithering ? '=dither=floyd_steinberg' : ''}`
                ];
              } else {
                // For other formats, add to the filter chain
                const currentFilterIndex = ffmpegArgs.indexOf('-vf');
                if (currentFilterIndex !== -1) {
                  ffmpegArgs[currentFilterIndex + 1] = `${ffmpegArgs[currentFilterIndex + 1]},${textFilter}`;
                } else {
                  ffmpegArgs.push('-vf', textFilter);
                }
              }
            }
          }
          else if (activeSubTab === 'timelapse') {
            // Timelapse grid of thumbnails
            outputFileName = `timelapse.${thumbnailSettings.format}`;
            
            // Extract frames at regular intervals
            const interval = (endTime - startTime) / thumbnailSettings.count;
            const filters = [];
            const tileLayout = getTileLayout(thumbnailSettings.count);
            
            // Create complex filter to generate tile grid
            let filterComplex = '';
            
            for (let i = 0; i < thumbnailSettings.count; i++) {
              const time = startTime + interval * i;
              
              // Extract frame at specified time
              filterComplex += `[0:v]select=eq(n\\,${Math.round(time * frameRate)}),scale=${animatedSettings.width / tileLayout.cols}:${animatedSettings.width / tileLayout.cols / 16 * 9}[v${i}];`;
            }
            
            // Create tile layout
            let tileInputs = '';
            for (let i = 0; i < thumbnailSettings.count; i++) {
              tileInputs += `[v${i}]`;
            }
            
            filterComplex += `${tileInputs}tile=${tileLayout.cols}x${tileLayout.rows}`;
            
            ffmpegArgs = [
              '-i', inputFileName,
              '-filter_complex', filterComplex,
              '-frames:v', '1'
            ];
            
            // Apply color correction if enabled
            if (thumbnailSettings.applyColorCorrection && colorSettings.enabled) {
              // Add color correction before tile creation
              // This is complex to implement here, so we'll omit for simplicity
            }
          }
          break;
      }
      
      // Add output filename
      ffmpegArgs.push(outputFileName);
      
      // Execute FFmpeg command
      await ffmpeg.exec(ffmpegArgs);
      
      // Read the output file
      let outputData;
      let mimeType = 'video/mp4';
      
      // If we're generating multiple thumbnails, we need to handle them differently
      if (activeTab === 'thumbnails' && activeSubTab === 'multiple') {
        // Create a zip file containing all thumbnails
        // This would require additional libraries to create zip files in the browser
        // For now, let's just download them individually
        
        const format = thumbnailSettings.format;
        const files = [];
        
        for (let i = 1; i <= thumbnailSettings.count; i++) {
          const fileName = `thumbnail-${i.toString().padStart(3, '0')}.${format}`;
          const data = await ffmpeg.readFile(fileName);
          
          // Create and trigger download for each thumbnail
          const blob = new Blob([data], { type: `image/${format}` });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        // No need to continue with single file download
        setIsProcessing(false);
        onClose();
        return;
      } else {
        outputData = await ffmpeg.readFile(outputFileName);
      }
      
      // Determine MIME type based on output format
      const outputFormat = outputFileName.split('.').pop() || 'mp4';
      
      if (activeTab === 'video') {
        mimeType = `video/${outputFormat}`;
      } 
      else if (activeTab === 'audio') {
        mimeType = `audio/${outputFormat}`;
      } 
      else if (activeTab === 'image' || activeTab === 'thumbnails') {
        mimeType = outputFormat === 'gif' ? 'image/gif' : 
                  outputFormat === 'apng' ? 'image/apng' :
                  outputFormat === 'webp' ? 'image/webp' : 
                  outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      }
      
      // Create download link
      const blob = new Blob([outputData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

  const detectScenes = async () => {
    if (!videoBlob || !videoRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      
      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob));
      
      // Run scene detection
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vf', 'select=gt(scene\\,0.3),showinfo',
        '-f', 'null',
        '-'
      ]);
      
      // In a real implementation, we would parse the output to get scene change frames
      // For this demo, let's simulate some detected scenes
      const duration = videoRef.current.duration;
      const sceneCount = Math.min(5, Math.max(3, Math.floor(duration / 30)));
      
      const scenes = [];
      for (let i = 0; i < sceneCount; i++) {
        scenes.push(Math.round((duration / (sceneCount + 1) * (i + 1)) * 100) / 100);
      }
      
      setDetectedScenes(scenes);
      
      // Generate thumbnails for detected scenes
      const thumbnails = [];
      
      for (let i = 0; i < scenes.length; i++) {
        // In a real implementation, we would extract thumbnails for each scene
        // For this demo, we'll just create placeholder URLs
        thumbnails.push(`https://picsum.photos/seed/${i}/640/360`);
      }
      
      setGeneratedThumbnails(thumbnails);
      
    } catch (error) {
      console.error('Scene detection error:', error);
      setErrorMessage('Failed to detect scenes');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to determine the best tile layout for a grid
  const getTileLayout = (count: number) => {
    // Simple algorithm to determine rows and columns for a grid
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    return { rows, cols };
  };

  // Function to generate thumbnail with smart cropping
  const applySmartCrop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real implementation, we would use ML to detect faces or subjects
    // For this demo, we'll just simulate it by highlighting a region
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const aspectRatio = cropSettings.aspectRatio === '16:9' ? 16/9 :
                        cropSettings.aspectRatio === '9:16' ? 9/16 :
                        cropSettings.aspectRatio === '1:1' ? 1 :
                        cropSettings.aspectRatio === '4:3' ? 4/3 :
                        cropSettings.aspectRatio === '3:4' ? 3/4 : 16/9;
    
    let cropWidth, cropHeight;
    
    if (aspectRatio > 1) {
      cropWidth = Math.min(canvas.width, canvas.width * 0.8);
      cropHeight = cropWidth / aspectRatio;
    } else {
      cropHeight = Math.min(canvas.height, canvas.height * 0.8);
      cropWidth = cropHeight * aspectRatio;
    }
    
    const cropX = centerX - cropWidth / 2;
    const cropY = centerY - cropHeight / 2;
    
    // Update crop settings
    setCropSettings({
      ...cropSettings,
      enabled: true,
      left: Math.round(cropX),
      top: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    });
    
    // Draw crop rectangle
    ctx.strokeStyle = '#E44E51';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
  };

  // Function to apply color correction to canvas
  const applyColorCorrection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply color adjustments using canvas filters
    ctx.filter = `
      brightness(${1 + colorSettings.brightness * 0.05})
      contrast(${1 + colorSettings.contrast * 0.05})
      saturate(${1 + colorSettings.saturation * 0.05})
      hue-rotate(${colorSettings.hue}deg)
    `;
    
    // Redraw with filters
    ctx.drawImage(canvas, 0, 0);
    
    // Reset filters
    ctx.filter = 'none';
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
      case 'single':
      case 'multiple':
        return <Camera className="w-4 h-4" />;
      case 'smart-crop':
        return <Crop className="w-4 h-4" />;
      case 'animated':
        return <Play className="w-4 h-4" />;
      case 'timelapse':
        return <Grid className="w-4 h-4" />;
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
      case 'thumbnails':
        if (activeSubTab === 'animated') {
          if (animatedSettings.type === 'gif') {
            bitrate = animatedSettings.width * animatedSettings.fps * 0.1;
          } else if (animatedSettings.type === 'mp4') {
            bitrate = animatedSettings.width * 0.3;
          }
          return `${((bitrate * animatedSettings.duration * 0.128) || 0.1).toFixed(1)} MB`;
        } else {
          // A rough estimate for a single image
          const pixels = resolution.width * resolution.height;
          const multiplier = thumbnailSettings.format === 'jpg' ? 0.1 : 0.2;
          return `${((pixels * multiplier / 1024 / 1024) || 0.1).toFixed(1)} MB`;
        }
      default:
        return 'N/A';
    }
    
    // Calculate size in MB
    const sizeInMB = (bitrate * duration * 0.128).toFixed(1);
    return `${sizeInMB} MB`;
  };
  
  const renderThumbnailControls = () => {
    switch (activeSubTab) {
      case 'standard':
      case 'single':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">Format</label>
                </div>
                <div className="flex space-x-2">
                  {['jpg', 'png', 'webp'].map(format => (
                    <button
                      key={format}
                      onClick={() => setThumbnailSettings({
                        ...thumbnailSettings,
                        format: format as any
                      })}
                      className={`px-3 py-1.5 rounded text-sm ${
                        thumbnailSettings.format === format
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">Quality</label>
                  <span className="text-xs text-gray-500">{thumbnailSettings.quality}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={thumbnailSettings.quality}
                  onChange={(e) => setThumbnailSettings({
                    ...thumbnailSettings,
                    quality: Number(e.target.value)
                  })}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Auto-detect Best Frames
              </label>
              <button
                onClick={() => {
                  setThumbnailSettings({
                    ...thumbnailSettings,
                    autoDetectScenes: !thumbnailSettings.autoDetectScenes
                  });
                  if (!thumbnailSettings.autoDetectScenes && detectedScenes.length === 0) {
                    detectScenes();
                  }
                }}
                className={`px-3 py-1.5 rounded text-sm ${
                  thumbnailSettings.autoDetectScenes
                    ? 'bg-[#E44E51]/10 text-[#E44E51]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {thumbnailSettings.autoDetectScenes ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {detectedScenes.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Detected Scenes
                </label>
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {detectedScenes.map((timestamp, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSceneIndex(index)}
                      className={`flex-shrink-0 p-1 border rounded ${
                        selectedSceneIndex === index
                          ? 'border-[#E44E51] bg-[#E44E51]/10'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="w-24 h-16 bg-gray-200 relative">
                        {generatedThumbnails[index] && (
                          <img 
                            src={generatedThumbnails[index]} 
                            alt={`Scene ${index}`}
                            className="w-full h-full object-cover rounded-sm"
                          />
                        )}
                        <div className="absolute bottom-0 right-0 text-xs bg-black text-white px-1 rounded-tl">
                          {formatTime(timestamp)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>Smart Cropping</span>
                  <button
                    onClick={() => {
                      setThumbnailSettings({
                        ...thumbnailSettings,
                        smartCrop: !thumbnailSettings.smartCrop
                      });
                      if (!thumbnailSettings.smartCrop) {
                        applySmartCrop();
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      thumbnailSettings.smartCrop
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {thumbnailSettings.smartCrop ? 'Enabled' : 'Disabled'}
                  </button>
                </label>
                
                <div className="flex space-x-2">
                  {['16:9', '9:16', '1:1', '4:3', '3:4'].map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => {
                        setCropSettings({
                          ...cropSettings,
                          aspectRatio: ratio
                        });
                        if (thumbnailSettings.smartCrop) {
                          applySmartCrop();
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        cropSettings.aspectRatio === ratio
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
                            
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>Color Correction</span>
                  <button
                    onClick={() => {
                      setThumbnailSettings({
                        ...thumbnailSettings,
                        applyColorCorrection: !thumbnailSettings.applyColorCorrection
                      });
                      if (!thumbnailSettings.applyColorCorrection) {
                        setColorSettings({...colorSettings, enabled: true});
                        applyColorCorrection();
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      thumbnailSettings.applyColorCorrection
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {thumbnailSettings.applyColorCorrection ? 'Enabled' : 'Disabled'}
                  </button>
                </label>
                
                {thumbnailSettings.applyColorCorrection && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Brightness</span>
                        <span>{colorSettings.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={colorSettings.brightness}
                        onChange={(e) => setColorSettings({
                          ...colorSettings,
                          brightness: Number(e.target.value)
                        })}
                        className="w-full accent-[#E44E51]"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Contrast</span>
                        <span>{colorSettings.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        value={colorSettings.contrast}
                        onChange={(e) => setColorSettings({
                          ...colorSettings,
                          contrast: Number(e.target.value)
                        })}
                        className="w-full accent-[#E44E51]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={textOverlaySettings.enabled}
                  onChange={(e) => setTextOverlaySettings({
                    ...textOverlaySettings,
                    enabled: e.target.checked
                  })}
                  className="rounded border-gray-300 text-[#E44E51] mr-2"
                />
                Add Text Overlay
              </label>
              
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={thumbnailSettings.includeTimestamp}
                  onChange={(e) => setThumbnailSettings({
                    ...thumbnailSettings,
                    includeTimestamp: e.target.checked
                  })}
                  className="rounded border-gray-300 text-[#E44E51] mr-2"
                />
                Include Timestamp
              </label>
            </div>
            
            {textOverlaySettings.enabled && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  value={textOverlaySettings.text}
                  onChange={(e) => setTextOverlaySettings({
                    ...textOverlaySettings,
                    text: e.target.value
                  })}
                  className="w-full rounded-lg border-gray-300 text-sm"
                  placeholder="Enter text for overlay"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">Text Color</label>
                    <input
                      type="color"
                      value={textOverlaySettings.fontColor}
                      onChange={(e) => setTextOverlaySettings({
                        ...textOverlaySettings,
                        fontColor: e.target.value
                      })}
                      className="w-full h-8 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Background</label>
                    <input
                      type="color"
                      value={textOverlaySettings.backgroundColor}
                      onChange={(e) => setTextOverlaySettings({
                        ...textOverlaySettings,
                        backgroundColor: e.target.value
                      })}
                      className="w-full h-8 rounded"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {['top', 'center', 'bottom'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => setTextOverlaySettings({
                        ...textOverlaySettings,
                        position: pos as any
                      })}
                      className={`px-2 py-1 rounded text-xs ${
                        textOverlaySettings.position === pos
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'multiple':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Number of Thumbnails
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Math.max(2, thumbnailSettings.count - 1)
                    })}
                    className="p-1 bg-gray-100 rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={thumbnailSettings.count}
                    onChange={(e) => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Number(e.target.value)
                    })}
                    className="w-full rounded-lg border-gray-300 text-sm text-center"
                  />
                  <button
                    onClick={() => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Math.min(12, thumbnailSettings.count + 1)
                    })}
                    className="p-1 bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Format & Quality
                  </label>
                  <span className="text-xs text-gray-500">{thumbnailSettings.quality}%</span>
                </div>
                <div className="flex space-x-2">
                  {['jpg', 'png', 'webp'].map(format => (
                    <button
                      key={format}
                      onClick={() => setThumbnailSettings({
                        ...thumbnailSettings,
                        format: format as any
                      })}
                      className={`px-2 py-1 rounded text-xs ${
                        thumbnailSettings.format === format
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Extraction Method</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    autoDetectScenes: true
                  })}
                  className={`p-2 rounded text-sm text-left ${
                    thumbnailSettings.autoDetectScenes
                      ? 'bg-[#E44E51]/10 text-gray-900 border border-[#E44E51]'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <div className="font-medium flex items-center">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Smart Scene Detection
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    AI-powered selection of key moments
                  </p>
                </button>
                
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    autoDetectScenes: false
                  })}
                  className={`p-2 rounded text-sm text-left ${
                    !thumbnailSettings.autoDetectScenes
                      ? 'bg-[#E44E51]/10 text-gray-900 border border-[#E44E51]'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  <div className="font-medium flex items-center">
                    <Layout className="w-4 h-4 mr-1" />
                    Equal Intervals
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Distribute evenly across timeline
                  </p>
                </button>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Enhancement Options</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    applyColorCorrection: !thumbnailSettings.applyColorCorrection
                  })}
                  className={`p-2 rounded-lg text-left ${
                    thumbnailSettings.applyColorCorrection
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Palette className="w-4 h-4 mr-1" />
                    Auto Color Correction
                  </div>
                </button>
                
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    smartCrop: !thumbnailSettings.smartCrop
                  })}
                  className={`p-2 rounded-lg text-left ${
                    thumbnailSettings.smartCrop
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Crop className="w-4 h-4 mr-1" />
                    Smart Cropping
                  </div>
                </button>
                
                <button
                  onClick={() => setTextOverlaySettings({
                    ...textOverlaySettings,
                    enabled: !textOverlaySettings.enabled
                  })}
                  className={`p-2 rounded-lg text-left ${
                    textOverlaySettings.enabled
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Type className="w-4 h-4 mr-1" />
                    Text Overlay
                  </div>
                </button>
                
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    includeSeries: !thumbnailSettings.includeSeries
                  })}
                  className={`p-2 rounded-lg text-left ${
                    thumbnailSettings.includeSeries
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Layers className="w-4 h-4 mr-1" />
                    Series Consistency
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'animated':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {['gif', 'webp', 'mp4'].map(type => (
                <button
                  key={type}
                  onClick={() => setAnimatedSettings({
                    ...animatedSettings,
                    type: type as any
                  })}
                  className={`p-2 rounded-lg text-center ${
                    animatedSettings.type === type
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {type.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {type === 'gif' ? 'Widely compatible' : 
                     type === 'webp' ? 'Smaller size' : 'Best quality'}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={animatedSettings.duration}
                  onChange={(e) => setAnimatedSettings({
                    ...animatedSettings,
                    duration: Number(e.target.value)
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
                  min="5"
                  max="30"
                  value={animatedSettings.fps}
                  onChange={(e) => setAnimatedSettings({
                    ...animatedSettings,
                    fps: Number(e.target.value)
                  })}
                  className="w-full rounded-lg border-gray-300 text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Width (height will scale proportionally)
              </label>
              <input
                type="number"
                min="320"
                max="1920"
                step="80"
                value={animatedSettings.width}
                onChange={(e) => setAnimatedSettings({
                  ...animatedSettings,
                  width: Number(e.target.value)
                })}
                className="w-full rounded-lg border-gray-300 text-sm"
              />
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <h3 className="text-sm font-medium flex items-center">
                <Wand2 className="w-4 h-4 mr-1" />
                Animation Effects
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAnimatedSettings({
                    ...animatedSettings,
                    smartLooping: !animatedSettings.smartLooping
                  })}
                  className={`p-2 rounded-lg text-left ${
                    animatedSettings.smartLooping
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Smart Looping
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Find perfect loop points
                  </div>
                </button>
                
                <button
                  onClick={() => setAnimatedSettings({
                    ...animatedSettings,
                    zoomEffect: !animatedSettings.zoomEffect
                  })}
                  className={`p-2 rounded-lg text-left ${
                    animatedSettings.zoomEffect
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Zoom Effect
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Subtle zoom animation
                  </div>
                </button>
              </div>
              
              {animatedSettings.zoomEffect && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Zoom Amount</span>
                    <span>{animatedSettings.zoomAmount}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={animatedSettings.zoomAmount}
                    onChange={(e) => setAnimatedSettings({
                      ...animatedSettings,
                      zoomAmount: Number(e.target.value)
                    })}
                    className="w-full accent-[#E44E51]"
                  />
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <h3 className="text-sm font-medium flex items-center">
                  <Monitor className="w-4 h-4 mr-1" />
                  Platform Optimization
                </h3>
                
                <div className="flex space-x-1">
                  {['youtube', 'instagram', 'tiktok', 'facebook', 'twitter', 'general'].map(platform => {
                    const Icon = platform === 'youtube' ? Youtube :
                               platform === 'instagram' ? Instagram :
                               platform === 'tiktok' ? Video :
                               platform === 'facebook' ? Facebook :
                               platform === 'twitter' ? Twitter : Globe;
                    
                    return (
                      <button
                        key={platform}
                        onClick={() => {
                          setAnimatedSettings({
                            ...animatedSettings,
                            platform: platform as any
                          });
                          
                          // Apply platform-specific settings
                          const preset = platformPresets[platform as keyof typeof platformPresets];
                          setAnimatedSettings(prev => ({
                            ...prev,
                            width: preset.width
                          }));
                        }}
                        className={`p-1.5 rounded ${
                          animatedSettings.platform === platform
                            ? 'bg-[#E44E51]/10 text-[#E44E51]'
                            : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {animatedSettings.type === 'gif' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Quality Level</span>
                      <span>{animatedSettings.quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      value={animatedSettings.quality}
                      onChange={(e) => setAnimatedSettings({
                        ...animatedSettings,
                        quality: Number(e.target.value)
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={animatedSettings.dithering}
                        onChange={(e) => setAnimatedSettings({
                          ...animatedSettings,
                          dithering: e.target.checked
                        })}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="ml-2 text-xs text-gray-700">Dithering</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={animatedSettings.optimize}
                        onChange={(e) => setAnimatedSettings({
                          ...animatedSettings,
                          optimize: e.target.checked
                        })}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="ml-2 text-xs text-gray-700">Optimize File Size</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {textOverlaySettings.enabled && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium flex items-center">
                    <Type className="w-4 h-4 mr-1" />
                    Text Overlay
                  </h3>
                  
                  <button
                    onClick={() => setTextOverlaySettings({
                      ...textOverlaySettings,
                      enabled: false
                    })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                
                <input
                  type="text"
                  value={textOverlaySettings.text}
                  onChange={(e) => setTextOverlaySettings({
                    ...textOverlaySettings,
                    text: e.target.value
                  })}
                  className="w-full rounded-lg border-gray-300 text-sm"
                  placeholder="Enter text for overlay"
                />
                
                <div className="flex space-x-2">
                  {['top', 'center', 'bottom'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => setTextOverlaySettings({
                        ...textOverlaySettings,
                        position: pos as any
                      })}
                      className={`px-2 py-1 rounded text-xs ${
                        textOverlaySettings.position === pos
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'timelapse':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Number of Frames
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Math.max(4, thumbnailSettings.count - 1)
                    })}
                    className="p-1 bg-gray-100 rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="4"
                    max="16"
                    value={thumbnailSettings.count}
                    onChange={(e) => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Number(e.target.value)
                    })}
                    className="w-full rounded-lg border-gray-300 text-sm text-center"
                  />
                  <button
                    onClick={() => setThumbnailSettings({
                      ...thumbnailSettings,
                      count: Math.min(16, thumbnailSettings.count + 1)
                    })}
                    className="p-1 bg-gray-100 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Layout Preview
                </label>
                <div className="bg-gray-100 rounded-lg p-2 h-12 flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-1 w-full h-full">
                    {Array.from({ length: thumbnailSettings.count }).map((_, i) => (
                      <div key={i} className="bg-gray-300 rounded-sm"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">Format</label>
                </div>
                <div className="flex space-x-2">
                  {['jpg', 'png', 'webp'].map(format => (
                    <button
                      key={format}
                      onClick={() => setThumbnailSettings({
                        ...thumbnailSettings,
                        format: format as any
                      })}
                      className={`px-3 py-1.5 rounded text-sm ${
                        thumbnailSettings.format === format
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="block text-sm font-medium text-gray-700">Quality</label>
                  <span className="text-xs text-gray-500">{thumbnailSettings.quality}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={thumbnailSettings.quality}
                  onChange={(e) => setThumbnailSettings({
                    ...thumbnailSettings,
                    quality: Number(e.target.value)
                  })}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <h3 className="text-sm font-medium flex items-center">
                <Wand2 className="w-4 h-4 mr-1" />
                Enhancement Options
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setThumbnailSettings({
                    ...thumbnailSettings,
                    applyColorCorrection: !thumbnailSettings.applyColorCorrection
                  })}
                  className={`p-2 rounded-lg text-left ${
                    thumbnailSettings.applyColorCorrection
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Palette className="w-4 h-4 mr-1" />
                    Auto Color Enhancement
                  </div>
                </button>
                
                <button
                  onClick={() => setTextOverlaySettings({
                    ...textOverlaySettings,
                    enabled: !textOverlaySettings.enabled
                  })}
                  className={`p-2 rounded-lg text-left ${
                    textOverlaySettings.enabled
                      ? 'bg-[#E44E51]/10 border-[#E44E51] border'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center">
                    <Type className="w-4 h-4 mr-1" />
                    Add Text Overlay
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Export Media</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Left column - Preview */}
          <div className="md:col-span-1 space-y-4">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              <video 
                ref={videoRef} 
                className="w-full h-full object-contain" 
                onEnded={() => setIsPreviewPlaying(false)}
              />
              
              {/* Canvas for processing previews */}
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={togglePlayPreview}
                  className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  {isPreviewPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>
              
              {/* Show crop overlay when in thumbnails tab with smart crop enabled */}
              {activeTab === 'thumbnails' && thumbnailSettings.smartCrop && cropSettings.enabled && (
                <div
                  className="absolute border-2 border-[#E44E51] pointer-events-none"
                  style={{
                    left: `${cropSettings.left}px`,
                    top: `${cropSettings.top}px`,
                    width: `${cropSettings.width}px`,
                    height: `${cropSettings.height}px`
                  }}
                />
              )}
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
                image: { label: 'Animated', icon: Image },
                thumbnails: { label: 'Thumbnails', icon: Camera }
              }).map(([tab, { label, icon: Icon }]) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    // Set default format for each tab
                    if (tab === 'video') {
                      setSelectedFormat('mp4');
                      setActiveSubTab('standard');
                    }
                    if (tab === 'audio') {
                      setSelectedFormat('mp3');
                      setActiveSubTab('standard');
                    }
                    if (tab === 'image') {
                      setSelectedFormat('gif');
                      setActiveSubTab('standard');
                    }
                    if (tab === 'thumbnails') {
                      setActiveSubTab('single');
                    }
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
            
            {/* Sub-tabs for thumbnail types */}
            {activeTab === 'thumbnails' && (
              <div className="flex space-x-2 border-b pb-2">
                {[
                  { id: 'single', label: 'Single', icon: Camera },
                  { id: 'multiple', label: 'Multiple', icon: Grid },
                  { id: 'animated', label: 'Animated', icon: Play },
                  { id: 'timelapse', label: 'Timelapse', icon: Layout }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSubTab(id)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg ${
                      activeSubTab === id
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Format Selection */}
            {activeTab !== 'thumbnails' && (
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
            )}
            
            {/* Thumbnail specific controls */}
            {activeTab === 'thumbnails' && renderThumbnailControls()}
            
            {/* Quality Presets - only show for video and audio */}
            {(activeTab === 'video' || activeTab === 'audio') && (
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
            )}
            
            {/* Advanced Settings Toggle - only show for video, audio and image */}
            {(activeTab === 'video' || activeTab === 'audio' || activeTab === 'image') && (
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
            )}
            
            {/* Advanced Settings */}
            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Video advanced settings */}
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
                  
                  {/* Audio advanced settings */}
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
                  
                  {/* Image advanced settings */}
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