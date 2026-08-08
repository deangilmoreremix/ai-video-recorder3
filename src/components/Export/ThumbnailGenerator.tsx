import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Camera, Palette, Crop, Download, Copy, Type, RefreshCw, Check, ArrowRight } from 'lucide-react';

interface ThumbnailGeneratorProps {
  videoBlob: Blob | null;
  onGenerate?: (thumbnails: Blob[]) => void;
}

type ThumbnailFormat = 'jpg' | 'png' | 'webp';
type ThumbnailAspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

const FORMATS: ThumbnailFormat[] = ['jpg', 'png', 'webp'];

const ASPECT_RATIOS: Array<{ id: ThumbnailAspectRatio; label: string }> = [
  { id: '16:9', label: 'Landscape 16:9' },
  { id: '9:16', label: 'Portrait 9:16' },
  { id: '1:1', label: 'Square 1:1' },
  { id: '4:3', label: 'Standard 4:3' }
];

interface Thumbnail {
  url: string;
  blob: Blob;
}

const SEEK_TIMEOUT_MS = 10000;

/** Resolves once the element reached `time`, or rejects on error/timeout. */
const seekTo = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      if (error) reject(error);
      else resolve();
    };
    const handleSeeked = () => finish();
    const handleError = () => finish(new Error('The video could not be decoded at this position.'));
    const timer = window.setTimeout(() => finish(new Error('Timed out while seeking the video.')), SEEK_TIMEOUT_MS);

    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.currentTime = time;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the thumbnail.'))),
      mimeType,
      quality
    );
  });

export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  videoBlob,
  onGenerate
}) => {
  const [settings, setSettings] = useState({
    count: 3,
    format: 'jpg' as ThumbnailFormat,
    quality: 90,
    cropEnabled: false,
    colorCorrection: true,
    aspectRatio: '16:9' as ThumbnailAspectRatio,
    textOverlay: false,
    textContent: '',
    autoDetect: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelledRef = useRef(false);
  // Lets the unmount cleanup revoke the latest URLs.
  const thumbnailsRef = useRef<Thumbnail[]>([]);
  thumbnailsRef.current = thumbnails;

  useEffect(() => {
    const video = videoRef.current;
    if (!videoBlob || !video) return;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    // MediaRecorder files may only report their real duration after scanning.
    const handleMetadata = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('durationchange', handleMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('durationchange', handleMetadata);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  // Release every preview URL when the component goes away.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      thumbnailsRef.current.forEach((thumbnail) => URL.revokeObjectURL(thumbnail.url));
    };
  }, []);

  const generateThumbnails = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoBlob || !video || !canvas || isProcessing) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setError('Could not get canvas context.');
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError('The video is still loading. Please try again in a moment.');
      return;
    }

    cancelledRef.current = false;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const created: Thumbnail[] = [];

    try {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      const ratio =
        settings.aspectRatio === '16:9' ? 16 / 9 :
        settings.aspectRatio === '9:16' ? 9 / 16 :
        settings.aspectRatio === '1:1' ? 1 :
        4 / 3;

      // Center-crop the source instead of stretching it into the target frame.
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      if (settings.cropEnabled) {
        if (sourceWidth / sourceHeight > ratio) {
          cropWidth = Math.round(sourceHeight * ratio);
        } else {
          cropHeight = Math.round(sourceWidth / ratio);
        }
      }
      const cropX = Math.round((sourceWidth - cropWidth) / 2);
      const cropY = Math.round((sourceHeight - cropHeight) / 2);

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const videoDuration = duration || (Number.isFinite(video.duration) ? video.duration : 0);
      if (videoDuration <= 0) throw new Error('The video duration is not available yet.');

      const mimeType =
        settings.format === 'jpg' ? 'image/jpeg' :
        settings.format === 'png' ? 'image/png' : 'image/webp';
      const quality = settings.format === 'png' ? undefined : settings.quality / 100;

      const wasPlaying = !video.paused;
      video.pause();

      for (let i = 0; i < settings.count; i++) {
        if (cancelledRef.current) break;

        // Stay inside the media range - seeking past the end never resolves.
        const position = Math.min(((i + 0.5) / settings.count) * videoDuration, Math.max(0, videoDuration - 0.05));
        await seekTo(video, position);

        ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

        if (settings.colorCorrection) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let j = 0; j < data.length; j += 4) {
            data[j] = Math.min(255, data[j] * 1.1);
            data[j + 1] = Math.min(255, data[j + 1] * 1.1);
            data[j + 2] = Math.min(255, data[j + 2] * 1.1);
          }

          ctx.putImageData(imageData, 0, 0);
        }

        if (settings.textOverlay && settings.textContent) {
          const text = settings.textContent;
          const fontSize = Math.max(16, Math.round(canvas.width / 20));
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = Math.max(2, fontSize / 16);
          ctx.textAlign = 'center';
          ctx.strokeText(text, canvas.width / 2, canvas.height - fontSize);
          ctx.fillText(text, canvas.width / 2, canvas.height - fontSize);
        }

        const blob = await canvasToBlob(canvas, mimeType, quality);
        created.push({ blob, url: URL.createObjectURL(blob) });

        setProgress(Math.round(((i + 1) / settings.count) * 100));
      }

      if (cancelledRef.current) {
        created.forEach((thumbnail) => URL.revokeObjectURL(thumbnail.url));
        return;
      }

      // Replace the previous batch and release its URLs.
      setThumbnails((prev) => {
        prev.forEach((thumbnail) => URL.revokeObjectURL(thumbnail.url));
        return created;
      });
      setSelectedIndex(null);

      onGenerate?.(created.map((thumbnail) => thumbnail.blob));

      if (wasPlaying) video.play().catch(() => undefined);
    } catch (err) {
      created.forEach((thumbnail) => URL.revokeObjectURL(thumbnail.url));
      setError(err instanceof Error ? err.message : 'Could not generate thumbnails.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copySelected = async () => {
    if (selectedIndex === null) return;
    const thumbnail = thumbnails[selectedIndex];
    if (!thumbnail) return;

    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard access is not available in this browser.');
      }
      await navigator.clipboard.write([new ClipboardItem({ [thumbnail.blob.type]: thumbnail.blob })]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Use the download button instead.`
          : 'Could not copy the thumbnail.'
      );
    }
  };

  const useSelected = () => {
    if (selectedIndex === null) return;
    const thumbnail = thumbnails[selectedIndex];
    if (thumbnail) onGenerate?.([thumbnail.blob]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          {/* Video Preview */}
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative shadow-md">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
            />
          </div>
          
          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Processing Button */}
          <button
            onClick={generateThumbnails}
            disabled={isProcessing || !videoBlob}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing... {progress}%</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Generate Thumbnails</span>
              </div>
            )}
          </button>

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="p-4 bg-gray-50 rounded-lg space-y-6 shadow-sm">
            <h3 className="text-lg font-medium">Thumbnail Generator</h3>
            <p className="text-sm text-gray-600">Create high-quality thumbnails from your video with customizable settings.</p>
            
            {/* Settings Grid */}
            <div className="grid grid-cols-2 gap-4">
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
                  {FORMATS.map(format => (
                    <button
                      key={format}
                      onClick={() => setSettings({
                        ...settings,
                        format
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
            
            {/* Feature toggles */}
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
            </div>
            
            {/* Additional settings that appear based on toggles */}
            {settings.textOverlay && (
              <div className="p-3 bg-white rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overlay Text
                </label>
                <input
                  type="text"
                  value={settings.textContent}
                  onChange={(e) => setSettings({
                    ...settings,
                    textContent: e.target.value
                  })}
                  placeholder="Enter text to overlay"
                  className="w-full rounded-lg border-gray-300"
                />
              </div>
            )}
            
            {settings.cropEnabled && (
              <div className="p-3 bg-white rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio.id}
                      onClick={() => setSettings({
                        ...settings,
                        aspectRatio: ratio.id
                      })}
                      className={`py-2 text-sm rounded-lg ${
                        settings.aspectRatio === ratio.id
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Generated Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Generated Thumbnails</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {thumbnails.map((thumbnail, index) => (
              <div
                key={index}
                className={`relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer group ${
                  selectedIndex === index ? 'ring-2 ring-[#E44E51]' : ''
                }`}
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
              >
                <img
                  src={thumbnail.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity"></div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={thumbnail.url} 
                    download={`thumbnail-${index + 1}.${settings.format}`}
                    className="p-1.5 bg-white rounded-full text-gray-700 hover:text-gray-900 shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                
                {selectedIndex === index && (
                  <div className="absolute bottom-2 right-2 p-1 bg-[#E44E51] rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedIndex !== null && (
            <div className="flex justify-end space-x-2">
              <button
                onClick={copySelected}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button
                onClick={useSelected}
                className="px-3 py-1.5 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-sm text-sm flex items-center space-x-1"
              >
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