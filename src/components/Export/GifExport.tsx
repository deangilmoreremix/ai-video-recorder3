import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, X, Download, CheckCircle2 } from 'lucide-react';
import { AnimatedGifCreator } from './AnimatedGifCreator';
import { buildFileName, downloadBlob } from './VideoProcessing';

interface GifExportProps {
  /** The clip to convert. The dialog stays closed while this is null. */
  videoBlob: Blob | null;
  isOpen: boolean;
  onClose: () => void;
  /** Optional hook for callers that want to keep the generated GIF. */
  onExported?: (gif: Blob) => void;
  /** Base name used for the downloaded file. */
  fileName?: string;
}

/**
 * Modal entry point for the GIF exporter.
 *
 * The heavy lifting (range selection, palette generation and encoding) is done
 * by `AnimatedGifCreator`, which runs a real ffmpeg.wasm `palettegen`/
 * `paletteuse` pass. This component owns the dialog chrome, keeps the last
 * generated GIF around so it can be re-downloaded, and reports its size.
 */
export const GifExport: React.FC<GifExportProps> = ({
  videoBlob,
  isOpen,
  onClose,
  onExported,
  fileName = 'animation'
}) => {
  const [generatedGif, setGeneratedGif] = useState<Blob | null>(null);

  const handleGenerated = useCallback(
    (gif: Blob) => {
      setGeneratedGif(gif);
      onExported?.(gif);
    },
    [onExported]
  );

  const handleDownload = useCallback(() => {
    if (!generatedGif) return;
    downloadBlob(generatedGif, buildFileName(fileName, 'gif'));
  }, [generatedGif, fileName]);

  if (!isOpen || !videoBlob) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Create an animated GIF"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Film className="w-5 h-5 text-[#E44E51]" aria-hidden="true" />
            <h3 className="text-lg font-semibold">Create GIF</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatedGifCreator videoBlob={videoBlob} onGenerate={handleGenerated} />
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            {generatedGif ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                <span>GIF ready — {(generatedGif.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <span>Pick a range, then press “Generate GIF”.</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!generatedGif}
              className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white rounded-lg
                hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg
                hover:shadow-[#E44E51]/25 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download GIF</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GifExport;
