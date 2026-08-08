import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ImagePlus, Loader, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  buildFileName,
  downloadBlob,
  getExtensionForBlob,
  isCancellation,
  processVideo,
  toError,
  type WatermarkPosition
} from './VideoProcessing';

interface VideoExportProps {
  videoBlob: Blob;
  onClose: () => void;
  /** File name without extension. */
  fileName?: string;
}

interface WatermarkSettings {
  enabled: boolean;
  position: WatermarkPosition;
  opacity: number;
  scale: number;
  file?: File;
  preview?: string;
  offset: {
    x: number;
    y: number;
  };
}

const POSITIONS: WatermarkPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];

const toInt = (value: string, fallback: number): number => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value: string, fallback: number): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const VideoExport: React.FC<VideoExportProps> = ({ videoBlob, onClose, fileName = 'video' }) => {
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    position: 'bottom-right',
    opacity: 0.8,
    scale: 1,
    offset: {
      x: 20,
      y: 20
    }
  });

  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keeps the latest preview URL reachable from the unmount cleanup.
  const previewRef = useRef<string | undefined>(undefined);
  previewRef.current = watermark.preview;

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = '';
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for the watermark.');
      return;
    }

    setWatermark(prev => {
      if (prev.preview) URL.revokeObjectURL(prev.preview);
      return {
        ...prev,
        file,
        preview: URL.createObjectURL(file),
        enabled: true
      };
    });
    setError(null);
  };

  const removeWatermark = () => {
    setWatermark(prev => {
      if (prev.preview) URL.revokeObjectURL(prev.preview);
      return {
        ...prev,
        file: undefined,
        preview: undefined,
        enabled: false
      };
    });
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
          format,
          codec: format === 'webm' ? 'vp9' : 'h264',
          quality,
          watermark: watermark.enabled && watermark.file
            ? {
                file: watermark.file,
                position: watermark.position,
                opacity: watermark.opacity,
                scale: watermark.scale,
                offset: watermark.offset
              }
            : undefined
        },
        setProgress,
        controller.signal
      );

      downloadBlob(result, buildFileName(fileName, format));
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
    downloadBlob(videoBlob, buildFileName(fileName, getExtensionForBlob(videoBlob)));
  };

  // Clean up the watermark preview URL and any running export on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const watermarkSection = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={watermark.enabled}
            onChange={(e) => setWatermark(prev => ({
              ...prev,
              enabled: e.target.checked
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

      {watermark.enabled && (
        <div className="space-y-4">
          {/* Watermark Preview */}
          {watermark.preview && (
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={watermark.preview}
                alt="Watermark preview"
                className="absolute object-contain"
                style={{
                  [watermark.position.includes('top') ? 'top' : 'bottom']: `${watermark.offset.y}px`,
                  [watermark.position.includes('left') ? 'left' : 'right']: `${watermark.offset.x}px`,
                  transform: `scale(${watermark.scale})`,
                  opacity: watermark.opacity,
                  maxWidth: '200px',
                  maxHeight: '100px'
                }}
              />
              <button
                onClick={removeWatermark}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full
                  hover:bg-red-600 shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Position Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setWatermark(prev => ({
                    ...prev,
                    position: pos
                  }))}
                  className={`p-2 rounded-lg border text-sm ${
                    watermark.position === pos
                      ? 'border-[#E44E51] bg-[#E44E51]/10 text-[#E44E51]'
                      : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                  }`}
                >
                  {pos.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Offset Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                X Offset (px)
              </label>
              <input
                type="number"
                min={0}
                value={watermark.offset.x}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  offset: {
                    ...prev.offset,
                    x: Math.max(0, toInt(e.target.value, prev.offset.x))
                  }
                }))}
                className="w-full rounded-lg border-gray-300 shadow-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Y Offset (px)
              </label>
              <input
                type="number"
                min={0}
                value={watermark.offset.y}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  offset: {
                    ...prev.offset,
                    y: Math.max(0, toInt(e.target.value, prev.offset.y))
                  }
                }))}
                className="w-full rounded-lg border-gray-300 shadow-sm bg-white"
              />
            </div>
          </div>

          {/* Scale and Opacity Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-700">Scale</label>
                <span className="text-sm text-gray-500">{Math.round(watermark.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={watermark.scale}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  scale: toFloat(e.target.value, prev.scale)
                }))}
                className="w-full accent-[#E44E51]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-700">Opacity</label>
                <span className="text-sm text-gray-500">{Math.round(watermark.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={watermark.opacity}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  opacity: toFloat(e.target.value, prev.opacity)
                }))}
                className="w-full accent-[#E44E51]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Export Video</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            {/* Compression Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-lg border-gray-300"
                >
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP9)</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Quality</label>
                  <span className="text-sm text-gray-500">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(toInt(e.target.value, quality))}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            </div>

            {/* Watermark Settings */}
            {watermarkSection}
          </div>

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
                <button onClick={handleDownloadOriginal} className="underline hover:no-underline">
                  Download the original file instead
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            onClick={isProcessing ? handleCancel : onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isProcessing}
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
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VideoExport;
