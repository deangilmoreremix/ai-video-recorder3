import React, { useState, useRef } from 'react';
import { 
  Video, Download, Settings, Share2, Film, Camera, Wand2,
  Sparkles, Layers, Focus, Brain, CloudFog, Wind, Palette,
  Gauge, Eye, Save, Upload, X, Check, AlertCircle, Play,
  Pause, Volume2, VolumeX, Maximize2, Minimize2, ChevronRight,
  ChevronDown, Plus, Minus, Sliders, Music, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExportStore } from '../../store/exportStore';
import { processVideo, generateGif } from '../Export/VideoProcessing';
import { SocialMediaExport } from '../Export/SocialMediaExport';
import { Tooltip } from '../ui/Tooltip';

interface EnhancedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordedBlob: Blob | null;
}

export const EnhancedDownloadDialog: React.FC<EnhancedDownloadDialogProps> = ({
  isOpen,
  onClose,
  recordedBlob
}) => {
  const [activeTab, setActiveTab] = useState('format');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { settings, presets, updateSettings } = useExportStore();

  const tabs = [
    { id: 'format', label: 'Format', icon: Video },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ];

  const handleExport = async () => {
    if (!recordedBlob) return;

    setIsProcessing(true);
    try {
      let outputBlob: Blob;

      if (settings.format === 'gif') {
        outputBlob = await generateGif(recordedBlob, settings.gifSettings, setProgress);
      } else {
        outputBlob = await processVideo(recordedBlob, settings, setProgress);
      }

      // Create download link
      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported-video.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = presets[presetName];
    if (preset) {
      updateSettings(preset);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Preview */}
          {recordedBlob && (
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
              <video
                ref={videoRef}
                src={URL.createObjectURL(recordedBlob)}
                className="w-full h-full"
                controls={previewMode}
              />
              {!previewMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setPreviewMode(true)}
                    className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Play className="w-8 h-8 text-white" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-4 border-b mb-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-[#E44E51] text-[#E44E51]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'format' && (
              <>
                {/* Format Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(presets).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        settings.format === preset.format
                          ? 'border-[#E44E51] bg-[#E44E51]/5'
                          : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                      }`}
                    >
                      <h4 className="font-medium">{name}</h4>
                      <p className="text-sm text-gray-500">
                        {preset.resolution?.width}x{preset.resolution?.height}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Quick Settings */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={settings.format}
                      onChange={(e) => updateSettings({ format: e.target.value })}
                      className="w-full rounded-lg border-gray-300"
                    >
                      <option value="mp4">MP4</option>
                      <option value="webm">WebM</option>
                      <option value="gif">GIF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.quality}
                      onChange={(e) => updateSettings({ 
                        quality: parseInt(e.target.value) 
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                </div>

                {/* Advanced Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 
                    hover:bg-gray-50 rounded-lg flex justify-between items-center"
                >
                  <span>Advanced Settings</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      showAdvanced ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Advanced Settings */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        {/* Video Settings */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Video Settings</h4>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Resolution
                            </label>
                            <select
                              value={`${settings.resolution.width}x${settings.resolution.height}`}
                              onChange={(e) => {
                                const [width, height] = e.target.value.split('x').map(Number);
                                updateSettings({ resolution: { width, height } });
                              }}
                              className="w-full rounded-lg border-gray-300"
                            >
                              <option value="3840x2160">4K (3840x2160)</option>
                              <option value="2560x1440">2K (2560x1440)</option>
                              <option value="1920x1080">1080p (1920x1080)</option>
                              <option value="1280x720">720p (1280x720)</option>
                              <option value="854x480">480p (854x480)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Frame Rate
                            </label>
                            <select
                              value={settings.fps}
                              onChange={(e) => updateSettings({ 
                                fps: parseInt(e.target.value) 
                              })}
                              className="w-full rounded-lg border-gray-300"
                            >
                              <option value="60">60 fps</option>
                              <option value="30">30 fps</option>
                              <option value="24">24 fps</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Video Bitrate (kbps)
                            </label>
                            <input
                              type="range"
                              min="1000"
                              max="20000"
                              step="1000"
                              value={settings.bitrate.video}
                              onChange={(e) => updateSettings({
                                bitrate: {
                                  ...settings.bitrate,
                                  video: parseInt(e.target.value)
                                }
                              })}
                              className="w-full accent-[#E44E51]"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>1 Mbps</span>
                              <span>{settings.bitrate.video / 1000} Mbps</span>
                              <span>20 Mbps</span>
                            </div>
                          </div>
                        </div>

                        {/* Audio Settings */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Audio Settings</h4>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Audio Codec
                            </label>
                            <select
                              value={settings.audioCodec}
                              onChange={(e) => updateSettings({ 
                                audioCodec: e.target.value 
                              })}
                              className="w-full rounded-lg border-gray-300"
                            >
                              <option value="aac">AAC</option>
                              <option value="mp3">MP3</option>
                              <option value="opus">Opus</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Audio Bitrate (kbps)
                            </label>
                            <select
                              value={settings.bitrate.audio}
                              onChange={(e) => updateSettings({
                                bitrate: {
                                  ...settings.bitrate,
                                  audio: parseInt(e.target.value)
                                }
                              })}
                              className="w-full rounded-lg border-gray-300"
                            >
                              <option value="384">384 kbps</option>
                              <option value="256">256 kbps</option>
                              <option value="192">192 kbps</option>
                              <option value="128">128 kbps</option>
                              <option value="96">96 kbps</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">
                              Channels
                            </label>
                            <select
                              value={settings.audioChannels}
                              onChange={(e) => updateSettings({ 
                                audioChannels: parseInt(e.target.value) 
                              })}
                              className="w-full rounded-lg border-gray-300"
                            >
                              <option value="2">Stereo</option>
                              <option value="1">Mono</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Enhancement Options */}
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium">Enhancements</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.stabilize}
                              onChange={(e) => updateSettings({ 
                                stabilize: e.target.checked 
                              })}
                              className="rounded border-gray-300 text-[#E44E51]"
                            />
                            <span className="text-sm">Stabilization</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.denoise}
                              onChange={(e) => updateSettings({ 
                                denoise: e.target.checked 
                              })}
                              className="rounded border-gray-300 text-[#E44E51]"
                            />
                            <span className="text-sm">Noise Reduction</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.enhanceColors}
                              onChange={(e) => updateSettings({ 
                                enhanceColors: e.target.checked 
                              })}
                              className="rounded border-gray-300 text-[#E44E51]"
                            />
                            <span className="text-sm">Color Enhancement</span>
                          </label>
                        </div>
                      </div>

                      {/* GIF Settings */}
                      {settings.format === 'gif' && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-medium">GIF Settings</h4>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Frame Rate
                              </label>
                              <select
                                value={settings.gifSettings.fps}
                                onChange={(e) => updateSettings({
                                  gifSettings: {
                                    ...settings.gifSettings,
                                    fps: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full rounded-lg border-gray-300"
                              >
                                <option value="30">30 fps</option>
                                <option value="15">15 fps</option>
                                <option value="10">10 fps</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Width
                              </label>
                              <input
                                type="number"
                                value={settings.gifSettings.width}
                                onChange={(e) => updateSettings({
                                  gifSettings: {
                                    ...settings.gifSettings,
                                    width: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full rounded-lg border-gray-300"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={settings.gifSettings.dither}
                                onChange={(e) => updateSettings({
                                  gifSettings: {
                                    ...settings.gifSettings,
                                    dither: e.target.checked
                                  }
                                })}
                                className="rounded border-gray-300 text-[#E44E51]"
                              />
                              <span className="text-sm">Dithering</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={settings.gifSettings.optimize}
                                onChange={(e) => updateSettings({
                                  gifSettings: {
                                    ...settings.gifSettings,
                                    optimize: e.target.checked
                                  }
                                })}
                                className="rounded border-gray-300 text-[#E44E51]"
                              />
                              <span className="text-sm">Optimize</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={settings.gifSettings.loop}
                                onChange={(e) => updateSettings({
                                  gifSettings: {
                                    ...settings.gifSettings,
                                    loop: e.target.checked
                                  }
                                })}
                                className="rounded border-gray-300 text-[#E44E51]"
                              />
                              <span className="text-sm">Loop</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {activeTab === 'social' && recordedBlob && (
              <SocialMediaExport
                duration={recordedBlob.size / 1024 / 1024} // Estimate duration
                fileSize={recordedBlob.size}
                onExport={async (platform, settings) => {
                  setIsProcessing(true);
                  try {
                    const processed = await processVideo(recordedBlob, {
                      ...settings,
                      format: 'mp4',
                      codec: 'h264'
                    }, setProgress);
                    
                    // Here you would typically integrate with social media APIs
                    // For now, we'll just download the processed file
                    const url = URL.createObjectURL(processed);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${platform}-optimized-video.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Export failed:', error);
                  } finally {
                    setIsProcessing(false);
                    setProgress(0);
                  }
                }}
              />
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end space-x-2 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isProcessing || !recordedBlob}
              className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
                hover:shadow-[#E44E51]/25 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent 
                    rounded-full animate-spin" />
                  <span>Processing... {progress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};