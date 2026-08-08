import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ChevronRight, Download, Loader, Sparkles, X, Settings, Youtube, Instagram, Twitter, Facebook, Linkedin, Palette, Wind, ImagePlus, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import {
  buildFileName,
  downloadBlob,
  getExtensionForBlob,
  isCancellation,
  processVideo,
  toError,
  type WatermarkPosition
} from './VideoProcessing';

const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center'
];

interface EnhancedExportProps {
  videoBlob: Blob;
  onClose: () => void;
  isOpen: boolean;
}

export const EnhancedExport: React.FC<EnhancedExportProps> = ({
  videoBlob,
  onClose,
  isOpen
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    format: 'mp4',
    codec: 'h264',
    quality: {
      video: 100,
      audio: 100
    },
    resolution: {
      width: 1920,
      height: 1080
    },
    fps: 30,
    bitrate: {
      video: 8000,
      audio: 192
    },
    audioSettings: {
      sampleRate: 48000,
      channels: 2,
      codec: 'aac'
    },
    optimization: {
      platform: 'youtube',
      compression: 'balanced',
      metadata: true
    },
    watermark: {
      enabled: false,
      position: 'bottom-right' as WatermarkPosition,
      opacity: 0.8,
      scale: 1,
      file: null as File | null,
      preview: '',
      offset: { x: 20, y: 20 }
    },
    ai: {
      enhance: false,
      denoise: false,
      stabilize: false,
      colorCorrect: false
    }
  });

  const presets = {
    web: {
      format: 'mp4',
      codec: 'h264',
      quality: { video: 85, audio: 90 },
      resolution: { width: 1280, height: 720 },
      fps: 30,
      bitrate: { video: 4000, audio: 128 }
    },
    professional: {
      format: 'mp4',
      codec: 'h265',
      quality: { video: 100, audio: 100 },
      resolution: { width: 3840, height: 2160 },
      fps: 60,
      bitrate: { video: 16000, audio: 320 }
    },
    mobile: {
      format: 'mp4',
      codec: 'h264',
      quality: { video: 75, audio: 80 },
      resolution: { width: 854, height: 480 },
      fps: 30,
      bitrate: { video: 2000, audio: 96 }
    }
  };

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'custom', name: 'Custom', icon: Settings }
  ];

  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keeps the newest preview URL reachable from the unmount cleanup.
  const previewRef = useRef<string>('');
  previewRef.current = settings.watermark.preview;

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      setSettings(prev => {
        if (prev.watermark.preview) URL.revokeObjectURL(prev.watermark.preview);
        return {
          ...prev,
          watermark: {
            ...prev.watermark,
            file,
            preview: URL.createObjectURL(file),
            enabled: true
          }
        };
      });
      setError(null);
    }

    // Allow picking the same file again later.
    e.target.value = '';
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    setProgress(0);
  };

  const handleExport = async () => {
    if (isProcessing) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await processVideo(
        videoBlob,
        {
          format: settings.format,
          codec: settings.codec,
          resolution: settings.resolution,
          fps: settings.fps,
          bitrate: settings.bitrate,
          quality: settings.quality.video,
          audioCodec: settings.audioSettings.codec,
          audioChannels: settings.audioSettings.channels,
          denoise: settings.ai.denoise,
          stabilize: settings.ai.stabilize,
          enhanceColors: settings.ai.enhance || settings.ai.colorCorrect,
          watermark: settings.watermark.enabled && settings.watermark.file
            ? {
                file: settings.watermark.file,
                position: settings.watermark.position,
                opacity: settings.watermark.opacity,
                scale: settings.watermark.scale,
                offset: settings.watermark.offset
              }
            : undefined
        },
        setProgress,
        controller.signal
      );

      downloadBlob(result, buildFileName('exported_video', settings.format));
      onClose();
    } catch (err) {
      if (!isCancellation(err)) setError(toError(err).message);
    } finally {
      abortRef.current = null;
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleDownloadOriginal = () => {
    downloadBlob(videoBlob, buildFileName('exported_video', getExtensionForBlob(videoBlob)));
  };

  // Abort a running export and release the watermark preview on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Export Video</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Presets */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(presets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => {
                  setSelectedPreset(name);
                  setSettings(prev => ({
                    ...prev,
                    ...preset
                  }));
                }}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedPreset === name
                    ? 'border-[#E44E51] bg-[#E44E51]/5'
                    : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                }`}
              >
                <h4 className="font-medium capitalize">{name}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {preset.resolution.width}x{preset.resolution.height} • {preset.fps}fps
                </p>
              </button>
            ))}
          </div>

          {/* Platform Optimization */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Optimize For</h4>
            <div className="grid grid-cols-6 gap-2">
              {platforms.map(({ id, name, icon: Icon }) => (
                <Tooltip key={id} content={name}>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      optimization: {
                        ...prev.optimization,
                        platform: id
                      }
                    }))}
                    className={`p-3 rounded-lg border transition-colors ${
                      settings.optimization.platform === id
                        ? 'border-[#E44E51] bg-[#E44E51]/5'
                        : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto" />
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* AI Enhancement */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">AI Enhancement</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Auto Enhance</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai.enhance}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ai: { ...prev.ai, enhance: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-[#E44E51] 
                    focus:ring-[#E44E51]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Noise Reduction</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai.denoise}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ai: { ...prev.ai, denoise: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-[#E44E51] 
                    focus:ring-[#E44E51]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Move className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Stabilization</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai.stabilize}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ai: { ...prev.ai, stabilize: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-[#E44E51] 
                    focus:ring-[#E44E51]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Color Correction</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ai.colorCorrect}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    ai: { ...prev.ai, colorCorrect: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-[#E44E51] 
                    focus:ring-[#E44E51]"
                />
              </label>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 
              hover:bg-gray-50 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Advanced Settings</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${
                showAdvancedSettings ? 'rotate-90' : ''
              }`} />
            </div>
          </button>

          {/* Advanced Settings Panel */}
          <AnimatePresence>
            {showAdvancedSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-6">
                  {/* Format Settings */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Format
                      </label>
                      <select
                        value={settings.format}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          format: e.target.value
                        }))}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="mov">MOV</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Codec
                      </label>
                      <select
                        value={settings.codec}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          codec: e.target.value
                        }))}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      >
                        <option value="h264">H.264</option>
                        <option value="h265">H.265 (HEVC)</option>
                        <option value="vp9">VP9</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resolution
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={settings.resolution.width}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            resolution: {
                              ...prev.resolution,
                              width: parseInt(e.target.value)
                            }
                          }))}
                          className="rounded-lg border-gray-300 shadow-sm"
                          placeholder="Width"
                        />
                        <input
                          type="number"
                          value={settings.resolution.height}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            resolution: {
                              ...prev.resolution,
                              height: parseInt(e.target.value)
                            }
                          }))}
                          className="rounded-lg border-gray-300 shadow-sm"
                          placeholder="Height"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quality Settings */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video Quality
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={settings.quality.video}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          quality: {
                            ...prev.quality,
                            video: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full accent-[#E44E51]"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Lower size</span>
                        <span>{settings.quality.video}%</span>
                        <span>Better quality</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Audio Quality
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={settings.quality.audio}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          quality: {
                            ...prev.quality,
                            audio: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full accent-[#E44E51]"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Lower size</span>
                        <span>{settings.quality.audio}%</span>
                        <span>Better quality</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frame Rate
                      </label>
                      <select
                        value={settings.fps}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          fps: parseInt(e.target.value)
                        }))}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      >
                        <option value="24">24 fps</option>
                        <option value="30">30 fps</option>
                        <option value="60">60 fps</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Watermark Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.watermark.enabled}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          watermark: {
                            ...prev.watermark,
                            enabled: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-[#E44E51] focus:ring-[#E44E51]"
                      />
                      <span className="text-sm font-medium">Add Watermark</span>
                    </label>
                    <button
                      onClick={() => watermarkInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg 
                        hover:bg-gray-200 flex items-center space-x-2"
                    >
                      <ImagePlus className="w-4 h-4" />
                      <span>Upload Image</span>
                    </button>
                    <input
                      ref={watermarkInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleWatermarkUpload}
                      className="hidden"
                    />
                  </div>

                  {settings.watermark.enabled && (
                    <div className="space-y-4">
                      {settings.watermark.preview && (
                        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                          <img
                            src={settings.watermark.preview}
                            alt="Watermark preview"
                            className="absolute object-contain"
                            style={{
                              [settings.watermark.position.includes('top') ? 'top' : 'bottom']: 
                                `${settings.watermark.offset.y}px`,
                              [settings.watermark.position.includes('left') ? 'left' : 'right']: 
                                `${settings.watermark.offset.x}px`,
                              transform: `scale(${settings.watermark.scale})`,
                              opacity: settings.watermark.opacity,
                              maxWidth: '200px',
                              maxHeight: '100px'
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {WATERMARK_POSITIONS.map((pos) => (
                            <button
                              key={pos}
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                watermark: {
                                  ...prev.watermark,
                                  position: pos
                                }
                              }))}
                              className={`p-2 rounded-lg border text-sm ${
                                settings.watermark.position === pos
                                  ? 'border-[#E44E51] bg-[#E44E51]/10 text-[#E44E51]'
                                  : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                              }`}
                            >
                              {pos.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Scale
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={settings.watermark.scale}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              watermark: {
                                ...prev.watermark,
                                scale: parseFloat(e.target.value)
                              }
                            }))}
                            className="w-full accent-[#E44E51]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Opacity
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.watermark.opacity}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              watermark: {
                                ...prev.watermark,
                                opacity: parseFloat(e.target.value)
                              }
                            }))}
                            className="w-full accent-[#E44E51]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Export Button */}
        <div className="p-4 border-t space-y-3">
          {isProcessing && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E44E51] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p>{error}</p>
                <button onClick={handleDownloadOriginal} className="underline hover:no-underline">
                  Download the original file instead
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Estimated file size: {Math.round(
                (settings.bitrate.video + settings.bitrate.audio) * 
                (settings.resolution.width * settings.resolution.height) / 
                (1920 * 1080) / 8000
              )} MB
            </div>
            <div className="flex space-x-4">
              <button
                onClick={isProcessing ? handleCancel : onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white 
                  rounded-lg hover:bg-[#D43B3E] disabled:opacity-50 shadow-lg 
                  hover:shadow-[#E44E51]/25 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Exporting... {progress}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};