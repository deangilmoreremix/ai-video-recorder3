import React, { useEffect, useRef, useState } from 'react';
import { Download, X, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoDownloaderProps {
  videoBlob: Blob | null;
  onClose: () => void;
  isOpen: boolean;
}

/** Maps a blob type (e.g. `video/webm;codecs=vp9`) to a matching file extension. */
const getBlobExtension = (blob: Blob | null): string => {
  const subtype = blob?.type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (!subtype) return 'webm';
  if (subtype === 'quicktime') return 'mov';
  if (subtype === 'x-matroska') return 'mkv';
  return subtype;
};

/** Keeps file names safe for every OS. */
const toSafeFileName = (name: string): string =>
  (name.trim() || 'recording').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

export const VideoDownloader: React.FC<VideoDownloaderProps> = ({
  videoBlob,
  onClose,
  isOpen
}) => {
  const [fileName, setFileName] = useState('recording');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const revokeTimeoutRef = useRef<number | null>(null);

  // One object URL per blob, always revoked when the dialog closes
  useEffect(() => {
    if (!isOpen || !videoBlob) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(videoBlob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob, isOpen]);

  // A pending download URL must not outlive the component
  useEffect(() => {
    return () => {
      if (revokeTimeoutRef.current !== null) {
        window.clearTimeout(revokeTimeoutRef.current);
        revokeTimeoutRef.current = null;
      }
    };
  }, []);

  const handleDownload = () => {
    if (!videoBlob || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    // Streaming the blob through an object URL keeps large recordings off the
    // JS heap (no base64 / FileReader round trip).
    let url: string | null = null;
    try {
      url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${toSafeFileName(fileName)}.${getBlobExtension(videoBlob)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Give the browser time to start writing the file before releasing it
      const downloadUrl = url;
      revokeTimeoutRef.current = window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        revokeTimeoutRef.current = null;
      }, 10000);

      onClose();
    } catch (err) {
      console.error('Download failed:', err);
      if (url) URL.revokeObjectURL(url);
      setError('Could not save the video. Please try again.');
    } finally {
      setIsProcessing(false);
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
        className="bg-white rounded-lg max-w-lg w-full overflow-hidden"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Download Video</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-[#E44E51]/30 bg-[#E44E51]/10 
              text-sm text-[#E44E51]">
              {error}
            </div>
          )}

          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {previewUrl ? (
              <video
                src={previewUrl}
                className="w-full h-full"
                controls
                preload="metadata"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No recording available
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File name
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-grow rounded-lg border-gray-300"
                placeholder="recording"
              />
              <span className="text-sm text-gray-500">
                .{getBlobExtension(videoBlob)}
              </span>
            </div>
            {videoBlob && (
              <p className="mt-1 text-xs text-gray-500">
                {getBlobExtension(videoBlob).toUpperCase()} · {formatFileSize(videoBlob.size)}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!videoBlob || isProcessing}
            className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
              disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
              hover:shadow-[#E44E51]/25 flex items-center space-x-2"
          >
            {isProcessing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
