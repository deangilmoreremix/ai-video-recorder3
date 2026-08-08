import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Download, Info, Loader, Music, Palette, Settings, Terminal, Video, X } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import {
  downloadBlob,
  buildFileName,
  getExtensionForBlob,
  isCancellation,
  parseExtraArgs,
  processVideo,
  toError
} from './VideoProcessing';

export interface AdvancedExportSettings {
  codec: string;
  preset: string;
  profile: string;
  pixelFormat: string;
  colorSpace: string;
  colorRange: string;
  sampleRate: number;
  normalizeAudio: boolean;
  fastStart: boolean;
  useGpu: boolean;
  twoPass: boolean;
  keyframeInterval: boolean;
  metadata: {
    title: string;
    description: string;
    tags: string;
  };
  customArgs: string;
}

interface EnhancedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
  /** File name without extension. */
  fileName?: string;
  /** When provided the parent owns the export; otherwise ffmpeg.wasm is used. */
  onExport?: (blob: Blob, settings: AdvancedExportSettings) => Promise<void>;
}

const defaultSettings: AdvancedExportSettings = {
  codec: 'h264',
  preset: 'veryfast',
  profile: 'high',
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  colorRange: 'tv',
  sampleRate: 48000,
  normalizeAudio: false,
  fastStart: true,
  useGpu: false,
  twoPass: false,
  keyframeInterval: false,
  metadata: {
    title: '',
    description: '',
    tags: ''
  },
  customArgs: ''
};

/** The container is dictated by the codec - vp9 cannot live inside an mp4. */
const formatForCodec = (codec: string): string => (codec === 'vp9' ? 'webm' : 'mp4');

export const EnhancedDownloadDialog: React.FC<EnhancedDownloadDialogProps> = ({
  isOpen,
  onClose,
  videoBlob,
  fileName = 'export',
  onExport
}) => {
  const [settings, setSettings] = useState<AdvancedExportSettings>(defaultSettings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateSettings = (patch: Partial<AdvancedExportSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  // Never leave a conversion running after the dialog disappears.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsProcessing(false);
    setProgress(0);
  };

  const handleExport = async () => {
    if (!videoBlob || isProcessing) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const format = formatForCodec(settings.codec);

    try {
      if (onExport) {
        await onExport(videoBlob, settings);
      } else {
        const extraArgs = [
          '-ar',
          String(settings.sampleRate),
          '-colorspace',
          settings.colorSpace,
          '-color_range',
          settings.colorRange,
          ...(settings.normalizeAudio ? ['-af', 'loudnorm'] : []),
          // Shorter GOPs make seeking/streaming smoother.
          ...(settings.keyframeInterval ? ['-g', '48', '-sc_threshold', '0'] : []),
          ...parseExtraArgs(settings.customArgs)
        ];

        const result = await processVideo(
          videoBlob,
          {
            format,
            codec: settings.codec,
            preset: settings.preset,
            profile: settings.profile,
            pixelFormat: settings.pixelFormat,
            fastStart: settings.fastStart,
            metadata: settings.metadata,
            extraArgs
          },
          setProgress,
          controller.signal
        );

        downloadBlob(result, buildFileName(settings.metadata.title || fileName, format));
      }
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
    if (!videoBlob) return;
    downloadBlob(videoBlob, buildFileName(fileName, getExtensionForBlob(videoBlob)));
  };

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
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Download Video</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium 
              text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            <span className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Advanced Settings</span>
            </span>
            <span className="text-gray-400">{showAdvanced ? 'Hide' : 'Show'}</span>
          </button>

          {/* Advanced Settings Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-6 overflow-hidden bg-gray-50 rounded-lg p-4 mt-4"
              >
                {/* Video Processing */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    Video Processing
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Codec
                      </label>
                      <select
                        value={settings.codec}
                        onChange={(e) => updateSettings({ codec: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="h264">H.264 (MP4)</option>
                        <option value="h265">H.265 / HEVC (MP4)</option>
                        <option value="vp9">VP9 (WebM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Preset
                      </label>
                      <select
                        value={settings.preset}
                        onChange={(e) => updateSettings({ preset: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="ultrafast">Ultra Fast</option>
                        <option value="superfast">Super Fast</option>
                        <option value="veryfast">Very Fast</option>
                        <option value="faster">Faster</option>
                        <option value="fast">Fast</option>
                        <option value="medium">Medium</option>
                        <option value="slow">Slow</option>
                        <option value="slower">Slower</option>
                        <option value="veryslow">Very Slow</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Profile
                      </label>
                      <select
                        value={settings.profile}
                        onChange={(e) => updateSettings({ profile: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="baseline">Baseline</option>
                        <option value="main">Main</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Pixel Format
                      </label>
                      <select
                        value={settings.pixelFormat}
                        onChange={(e) => updateSettings({ pixelFormat: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="yuv420p">YUV420P</option>
                        <option value="yuv422p">YUV422P</option>
                        <option value="yuv444p">YUV444P</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Color Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center">
                    <Palette className="w-4 h-4 mr-2" />
                    Color Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Color Space
                      </label>
                      <select
                        value={settings.colorSpace}
                        onChange={(e) => updateSettings({ colorSpace: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="bt709">BT.709 (HD)</option>
                        <option value="bt2020nc">BT.2020 (4K)</option>
                        <option value="smpte170m">BT.601 (SD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Color Range
                      </label>
                      <select
                        value={settings.colorRange}
                        onChange={(e) => updateSettings({ colorRange: e.target.value })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="tv">Limited (TV)</option>
                        <option value="pc">Full (PC)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Audio Processing */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center">
                    <Music className="w-4 h-4 mr-2" />
                    Audio Processing
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Sample Rate
                      </label>
                      <select
                        value={settings.sampleRate}
                        onChange={(e) => updateSettings({ sampleRate: parseInt(e.target.value, 10) || 48000 })}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="48000">48 kHz</option>
                        <option value="44100">44.1 kHz</option>
                        <option value="32000">32 kHz</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Audio Normalization
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.normalizeAudio}
                          onChange={(e) => updateSettings({ normalizeAudio: e.target.checked })}
                          className="rounded border-gray-300 text-[#E44E51]"
                        />
                        <span className="text-sm">Enable</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Features */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Features
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.fastStart}
                        onChange={(e) => updateSettings({ fastStart: e.target.checked })}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Fast Start (Web Optimized)</span>
                    </label>
                    <Tooltip content="Hardware encoding is not available for in-browser exports">
                      <label className="flex items-center space-x-2 opacity-50">
                        <input
                          type="checkbox"
                          checked={settings.useGpu}
                          disabled
                          readOnly
                          className="rounded border-gray-300 text-[#E44E51]"
                        />
                        <span className="text-sm">GPU Acceleration</span>
                      </label>
                    </Tooltip>
                    <Tooltip content="Two-pass encoding is not available for in-browser exports">
                      <label className="flex items-center space-x-2 opacity-50">
                        <input
                          type="checkbox"
                          checked={settings.twoPass}
                          disabled
                          readOnly
                          className="rounded border-gray-300 text-[#E44E51]"
                        />
                        <span className="text-sm">Two-Pass Encoding</span>
                      </label>
                    </Tooltip>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.keyframeInterval}
                        onChange={(e) => updateSettings({ keyframeInterval: e.target.checked })}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Keyframe Optimization</span>
                    </label>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Metadata
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={settings.metadata.title}
                        onChange={(e) => updateSettings({
                          metadata: { ...settings.metadata, title: e.target.value }
                        })}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={settings.metadata.description}
                        onChange={(e) => updateSettings({
                          metadata: { ...settings.metadata, description: e.target.value }
                        })}
                        className="w-full rounded-lg border-gray-300"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={settings.metadata.tags}
                        onChange={(e) => updateSettings({
                          metadata: { ...settings.metadata, tags: e.target.value }
                        })}
                        className="w-full rounded-lg border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom FFmpeg Commands */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center">
                    <Terminal className="w-4 h-4 mr-2" />
                    Custom FFmpeg Commands
                  </h4>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Additional Arguments
                    </label>
                    <input
                      type="text"
                      value={settings.customArgs}
                      onChange={(e) => updateSettings({ customArgs: e.target.value })}
                      placeholder="-tune film -level:v 4.1"
                      className="w-full rounded-lg border-gray-300 font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Input/output arguments (-i, -f, -y) are ignored for safety.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isProcessing && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E44E51] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Converting… {progress}%</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p>{error}</p>
                {videoBlob && (
                  <button
                    onClick={handleDownloadOriginal}
                    className="underline hover:no-underline"
                  >
                    Download the original file instead
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {buildFileName(settings.metadata.title || fileName, formatForCodec(settings.codec))}
          </span>
          <div className="flex space-x-3">
            <button
              onClick={isProcessing ? handleCancel : onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!videoBlob || isProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white rounded-lg 
                hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
                hover:shadow-[#E44E51]/25 transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Exporting… {progress}%</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedDownloadDialog;
