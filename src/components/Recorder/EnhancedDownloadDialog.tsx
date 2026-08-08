import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Facebook,
  Folder,
  Globe,
  Info,
  Instagram,
  Linkedin,
  Loader,
  Plus,
  Save,
  Tag,
  Twitter,
  Video,
  X,
  Youtube
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getFolders } from '../../utils/supabaseClient';
import { generateThumbnail } from '../../utils/videoProcessing';
import {
  MAX_INPUT_BYTES,
  downloadBlob,
  generateGif,
  getExtensionForBlob,
  hasSharedArrayBuffer,
  isCancellation,
  isCrossOriginIsolated,
  isFFmpegSupported,
  processVideo,
  toError
} from '../Export/VideoProcessing';
import { useExportStore } from '../../store/exportStore';

interface EnhancedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordedBlob: Blob | null;
  onSave?: (blob: Blob, videoUrl: string, thumbnailUrl: string) => void;
  recordingTitle: string;
  recordingTags: string[];
  recordingFolder: string | null;
  onRecordingTitleChange: (title: string) => void;
  onRecordingTagsChange: (tags: string[]) => void;
  onRecordingFolderChange: (folder: string | null) => void;
}

/** `original` hands the recorded file over untouched, everything else re-encodes. */
type ExportFormat = 'original' | 'mp4' | 'webm' | 'mov' | 'gif';

/** What the pipeline is doing right now – used for honest status copy. */
type ExportStage = 'idle' | 'engine' | 'converting' | 'finishing';

interface Resolution {
  width: number;
  height: number;
}

interface DialogSettings {
  format: ExportFormat;
  quality: number;
  /** `null` keeps the source resolution (no scaling / no upscaling). */
  resolution: Resolution | null;
  /** `null` keeps the source frame rate. */
  fps: number | null;
  codec: string;
  selectedPlatform: string;
}

interface PlatformPreset {
  format: Exclude<ExportFormat, 'original' | 'gif'>;
  codec: string;
  resolution: Resolution;
  fps: number;
}

interface Platform {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  /** `null` = leave the current settings alone. */
  preset: PlatformPreset | null;
  description: string;
}

/** GIFs grow ~1 MB per second, so only the head of the take is converted. */
const GIF_MAX_SECONDS = 15;
const GIF_MAX_WIDTH = 640;

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: 'original', label: 'Original', hint: 'No re-encode' },
  { id: 'mp4', label: 'MP4', hint: 'H.264' },
  { id: 'webm', label: 'WebM', hint: 'VP9' },
  { id: 'mov', label: 'MOV', hint: 'H.264' },
  { id: 'gif', label: 'GIF', hint: `First ${GIF_MAX_SECONDS}s` }
];

const PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    preset: { format: 'mp4', codec: 'h264', resolution: { width: 1920, height: 1080 }, fps: 30 },
    description: 'MP4 · H.264 · 1080p · 30 fps'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    preset: { format: 'mp4', codec: 'h264', resolution: { width: 1080, height: 1080 }, fps: 30 },
    description: 'MP4 · H.264 · 1080×1080 · 30 fps'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    preset: { format: 'mp4', codec: 'h264', resolution: { width: 1280, height: 720 }, fps: 30 },
    description: 'MP4 · H.264 · 720p · 30 fps'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    preset: { format: 'mp4', codec: 'h264', resolution: { width: 1280, height: 720 }, fps: 30 },
    description: 'MP4 · H.264 · 720p · 30 fps'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    preset: { format: 'mp4', codec: 'h264', resolution: { width: 1920, height: 1080 }, fps: 30 },
    description: 'MP4 · H.264 · 1080p · 30 fps'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Globe,
    preset: null,
    description: 'Keep the settings chosen below'
  }
];

const RESOLUTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'source', label: 'Keep source resolution' },
  { value: '3840x2160', label: '4K (3840x2160)' },
  { value: '2560x1440', label: '2K (2560x1440)' },
  { value: '1920x1080', label: 'Full HD (1920x1080)' },
  { value: '1280x720', label: 'HD (1280x720)' },
  { value: '854x480', label: 'SD (854x480)' }
];

/** Maps a recorded blob type (e.g. `video/webm;codecs=vp9`) to a file extension. */
const getBlobExtension = (blob: Blob | null): string => {
  const subtype = blob?.type.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (!subtype) return 'webm';
  if (subtype === 'quicktime') return 'mov';
  if (subtype === 'x-matroska') return 'mkv';
  return subtype;
};

/** The extension always follows the bytes we really hand out, never the request. */
const extensionForBlob = (blob: Blob): string => getExtensionForBlob(blob, getBlobExtension(blob));

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

export const EnhancedDownloadDialog: React.FC<EnhancedDownloadDialogProps> = ({
  isOpen,
  onClose,
  recordedBlob,
  onSave,
  recordingTitle,
  recordingTags,
  recordingFolder,
  onRecordingTitleChange,
  onRecordingTagsChange,
  onRecordingFolderChange
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'social'>('format');
  const [newTag, setNewTag] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [stage, setStage] = useState<ExportStage>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  // Every object URL handed out, so none of them leak when the dialog closes
  const objectUrlsRef = useRef<string[]>([]);
  // Lets the user (and `onClose`) stop a running ffmpeg job
  const abortRef = useRef<AbortController | null>(null);

  // The export job itself lives in the shared export store: it owns the real
  // progress reported by ffmpeg, the error message and the finished blob.
  const status = useExportStore((state) => state.status);
  const progress = useExportStore((state) => state.progress);
  const exportError = useExportStore((state) => state.error);
  const startExport = useExportStore((state) => state.startExport);
  const setProgress = useExportStore((state) => state.setProgress);
  const completeExport = useExportStore((state) => state.completeExport);
  const failExport = useExportStore((state) => state.failExport);
  const cancelExport = useExportStore((state) => state.cancelExport);
  const resetExport = useExportStore((state) => state.resetExport);

  const isProcessing = status === 'processing';

  // Settings for exporting
  const [settings, setSettings] = useState<DialogSettings>({
    format: 'original',
    quality: 80,
    resolution: null,
    fps: null,
    codec: 'h264',
    selectedPlatform: 'custom'
  });

  const needsTranscode = settings.format !== 'original';

  // Capability probes run once: they only depend on the browser/page headers.
  const ffmpegAvailable = useMemo(() => isFFmpegSupported(), []);
  const isMultiThreaded = useMemo(() => hasSharedArrayBuffer() && isCrossOriginIsolated(), []);

  const isTooLargeToConvert = !!recordedBlob && recordedBlob.size > MAX_INPUT_BYTES;
  const canTranscode = ffmpegAvailable && !isTooLargeToConvert;

  const conversionBlockedReason = !ffmpegAvailable
    ? 'This browser cannot run the in-browser converter (WebAssembly and Web Workers are required). ' +
      'The recording can still be saved or downloaded in its original format.'
    : isTooLargeToConvert
      ? `This recording is ${formatFileSize(recordedBlob?.size ?? 0)}, which is above the ` +
        `${formatFileSize(MAX_INPUT_BYTES)} in-browser conversion limit. It can still be saved or ` +
        'downloaded in its original format.'
      : null;

  const sourceExtension = getBlobExtension(recordedBlob);
  const targetExtension = needsTranscode ? settings.format : sourceExtension;
  const outputFileName = `${toSafeFileName(recordingTitle)}.${targetExtension}`;

  // Load folders
  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      setIsLoadingFolders(true);
      try {
        const folderList = await getFolders();
        if (!cancelled) setFolders(folderList);
      } catch (err) {
        // Supabase may be unavailable – folders are optional metadata
        console.error('Error loading folders:', err);
      } finally {
        if (!cancelled) setIsLoadingFolders(false);
      }
    };
    
    if (isOpen) {
      loadFolders();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Preview URL: created once per blob instead of on every render
  useEffect(() => {
    if (!isOpen || !recordedBlob) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(recordedBlob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recordedBlob, isOpen]);

  // Real duration of the take – needed to bound the GIF range
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;

    const readDuration = () => {
      // MediaRecorder files report Infinity until they are fully scanned.
      setSourceDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };

    readDuration();
    video.addEventListener('loadedmetadata', readDuration);
    video.addEventListener('durationchange', readDuration);

    return () => {
      video.removeEventListener('loadedmetadata', readDuration);
      video.removeEventListener('durationchange', readDuration);
    };
    // `activeTab` remounts the <video>, so the listeners have to be re-attached.
  }, [previewUrl, activeTab]);

  // Revoke any URL handed to the parent when the dialog closes or unmounts
  useEffect(() => {
    const urls = objectUrlsRef.current;
    if (!isOpen && urls.length > 0) {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.length = 0;
    }

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.length = 0;
    };
  }, [isOpen]);

  // A closed dialog must never leave an ffmpeg job (or its worker) running
  useEffect(() => {
    if (isOpen) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setStage('idle');
    resetExport();
  }, [isOpen, resetExport]);

  useEffect(() => () => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Generate thumbnail when blob is available
  useEffect(() => {
    if (!recordedBlob || !isOpen) return;

    let cancelled = false;

    const generateThumbnailFromVideo = async () => {
      try {
        // Create a File object from the Blob (no copy, safe for large takes)
        const file = new File([recordedBlob], `recording.${getBlobExtension(recordedBlob)}`, {
          type: recordedBlob.type
        });
        
        // Generate a thumbnail
        const thumbnail = await generateThumbnail(file);
        if (!cancelled) setThumbnailUrl(thumbnail);
      } catch (err) {
        // A missing thumbnail must never block saving the recording
        console.error('Error generating thumbnail:', err);
      }
    };

    generateThumbnailFromVideo();

    return () => {
      cancelled = true;
    };
  }, [recordedBlob, isOpen]);

  /** Hands the finished bytes to the parent (cloud save) or to the browser. */
  const deliver = (blob: Blob) => {
    const fileName = `${toSafeFileName(recordingTitle)}.${extensionForBlob(blob)}`;
    // The store owns the object URL of the finished export and revokes it when
    // the next export starts or the dialog is reset.
    const result = completeExport(blob, fileName);

    if (onSave) {
      objectUrlsRef.current.push(result.url);
      onSave(blob, result.url, thumbnailUrl ?? '');
      return;
    }

    downloadBlob(blob, fileName);
    onClose();
  };

  /** Runs the real ffmpeg.wasm pipeline; `setProgress` is fed by ffmpeg itself. */
  const runConversion = (blob: Blob, signal: AbortSignal): Promise<Blob> => {
    // `processVideo`/`generateGif` forward ffmpeg's `progress` event here
    // (percent = Math.round(event.progress * 100)) – nothing is interpolated.
    const handleProgress = (value: number) => {
      setStage('converting');
      setProgress(value);
    };

    if (settings.format === 'gif') {
      const endTime = sourceDuration > 0
        ? Math.min(sourceDuration, GIF_MAX_SECONDS)
        : GIF_MAX_SECONDS;

      return generateGif(
        blob,
        {
          fps: Math.min(settings.fps ?? 15, 20),
          quality: settings.quality,
          width: Math.min(settings.resolution?.width ?? GIF_MAX_WIDTH, GIF_MAX_WIDTH),
          dither: true,
          optimize: true,
          startTime: 0,
          endTime,
          loop: true
        },
        handleProgress,
        signal
      );
    }

    return processVideo(
      blob,
      {
        format: settings.format,
        codec: settings.format === 'webm' ? 'vp9' : settings.codec,
        resolution: settings.resolution ?? undefined,
        fps: settings.fps ?? undefined,
        quality: settings.quality,
        metadata: {
          title: recordingTitle.trim() || undefined,
          tags: recordingTags.length > 0 ? recordingTags.join(', ') : undefined
        }
      },
      handleProgress,
      signal
    );
  };

  const handleDownloadOriginal = () => {
    if (!recordedBlob) return;
    downloadBlob(recordedBlob, `${toSafeFileName(recordingTitle)}.${extensionForBlob(recordedBlob)}`);
  };

  const handleExport = async () => {
    if (!recordedBlob || isProcessing) return;

    const controller = new AbortController();
    abortRef.current = controller;
    startExport();

    try {
      if (!needsTranscode) {
        // Pass-through: there is nothing to encode, so there is no progress to
        // report either – the file is handed over straight away.
        setStage('finishing');
        deliver(recordedBlob);
        return;
      }

      if (!ffmpegAvailable) {
        throw new Error(
          'Video conversion is not available in this browser: it requires WebAssembly and Web Workers.'
        );
      }

      setStage('engine');
      const converted = await runConversion(recordedBlob, controller.signal);
      setStage('finishing');
      deliver(converted);
    } catch (err) {
      if (isCancellation(err)) {
        cancelExport();
        return;
      }

      // Real failure (core could not load, unsupported settings, out of memory…):
      // report what actually went wrong and hand over the untouched recording
      // instead of pretending the export succeeded.
      const extension = extensionForBlob(recordedBlob);
      downloadBlob(recordedBlob, `${toSafeFileName(recordingTitle)}.${extension}`);
      failExport(
        new Error(
          `${toError(err).message} Nothing was converted – the original ${extension.toUpperCase()} ` +
            'recording was downloaded instead.'
        )
      );
    } finally {
      abortRef.current = null;
      setStage('idle');
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelExport();
    setStage('idle');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !recordingTags.includes(newTag.trim())) {
      onRecordingTagsChange([...recordingTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onRecordingTagsChange(recordingTags.filter(tag => tag !== tagToRemove));
  };

  const selectFormat = (format: ExportFormat) => {
    // Touching the format by hand leaves any platform preset behind.
    setSettings(prev => ({ ...prev, format, selectedPlatform: 'custom' }));
  };

  const selectPlatform = (platformId: string) => {
    const platform = PLATFORMS.find(item => item.id === platformId);
    if (!platform) return;

    const preset = platform.preset;
    if (!preset) {
      setSettings(prev => ({ ...prev, selectedPlatform: platformId }));
      return;
    }

    setSettings(prev => ({
      ...prev,
      selectedPlatform: platformId,
      format: preset.format,
      codec: preset.codec,
      resolution: preset.resolution,
      fps: preset.fps
    }));
  };

  const currentResolutionValue = settings.resolution
    ? `${settings.resolution.width}x${settings.resolution.height}`
    : 'source';
  const resolutionOptions = RESOLUTION_OPTIONS.some(option => option.value === currentResolutionValue)
    ? RESOLUTION_OPTIONS
    : [...RESOLUTION_OPTIONS, { value: currentResolutionValue, label: `Custom (${currentResolutionValue})` }];

  const actionLabel = onSave
    ? needsTranscode ? 'Convert & Save' : 'Save Recording'
    : needsTranscode ? 'Convert & Download' : 'Download Recording';

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
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Save Recording</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {exportError && (
            <div className="mb-4 p-3 rounded-lg border border-[#E44E51]/30 bg-[#E44E51]/10 
              text-sm text-[#E44E51] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p>{exportError}</p>
                {recordedBlob && (
                  <button
                    onClick={handleDownloadOriginal}
                    className="underline hover:no-underline"
                  >
                    Download the original file again
                  </button>
                )}
              </div>
            </div>
          )}

          {conversionBlockedReason && (
            <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm 
              text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{conversionBlockedReason}</p>
            </div>
          )}

          {/* Recording Details */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => onRecordingTitleChange(e.target.value)}
                className="w-full rounded-lg border-gray-300"
                placeholder="Enter recording title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-grow rounded-lg border-gray-300"
                  placeholder="Add tags"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {recordingTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recordingTags.map(tag => (
                    <div 
                      key={tag}
                      className="flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      <span className="text-sm">{tag}</span>
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder
              </label>
              <div className="relative">
                <select
                  value={recordingFolder || ''}
                  onChange={(e) => onRecordingFolderChange(e.target.value === '' ? null : e.target.value)}
                  disabled={isLoadingFolders}
                  className="w-full rounded-lg border-gray-300 pr-10 disabled:opacity-60"
                >
                  <option value="">{isLoadingFolders ? 'Loading folders…' : 'None'}</option>
                  {folders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
                <Folder className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <div className="mt-1 flex justify-end">
                <button 
                  onClick={() => {
                    const folderName = prompt('Enter new folder name:');
                    if (folderName && !folders.includes(folderName)) {
                      setFolders([...folders, folderName]);
                      onRecordingFolderChange(folderName);
                    }
                  }}
                  className="text-sm text-[#E44E51] hover:text-[#D43B3E] font-medium"
                >
                  Create New Folder
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b overflow-x-auto mb-6">
            <button
              onClick={() => setActiveTab('format')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'format'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Video className="w-4 h-4 mr-2" />
              Video Export
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'social'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Social Media
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {activeTab === 'format' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Video Preview */}
                <div className="md:col-span-1">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      src={previewUrl ?? undefined}
                      className="w-full h-full"
                      controls
                      preload="metadata"
                    ></video>
                  </div>

                  {recordedBlob && (
                    <p className="mt-2 text-xs text-gray-500">
                      {sourceExtension.toUpperCase()} · {formatFileSize(recordedBlob.size)}
                      {sourceDuration > 0 && ` · ${sourceDuration.toFixed(1)}s`}
                    </p>
                  )}
                  
                  {thumbnailUrl && (
                    <div className="mt-4 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thumbnail Preview
                      </label>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={thumbnailUrl} 
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Export Settings */}
                <div className="md:col-span-2">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Export Format
                      </label>
                      <div className="grid grid-cols-5 gap-3">
                        {FORMAT_OPTIONS.map((option) => {
                          const disabled = option.id !== 'original' && !canTranscode;
                          return (
                            <button
                              key={option.id}
                              onClick={() => selectFormat(option.id)}
                              disabled={disabled || isProcessing}
                              className={`p-3 rounded-lg border text-center disabled:opacity-40 
                                disabled:cursor-not-allowed ${
                                settings.format === option.id
                                  ? 'border-[#E44E51] bg-[#E44E51]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span className="block font-medium uppercase">{option.label}</span>
                              <span className="block text-[10px] text-gray-500">{option.hint}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {needsTranscode
                          ? `The recording is re-encoded to ${settings.format.toUpperCase()} with FFmpeg in your browser; ` +
                            'the progress bar follows the encoder.'
                          : `The recording is kept exactly as captured (${sourceExtension.toUpperCase()}) – no re-encoding, no quality loss.`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution
                      </label>
                      <select
                        value={currentResolutionValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'source') {
                            setSettings(prev => ({ ...prev, resolution: null, selectedPlatform: 'custom' }));
                            return;
                          }
                          const [width, height] = value.split('x').map(Number);
                          setSettings(prev => ({
                            ...prev,
                            resolution: { width, height },
                            selectedPlatform: 'custom'
                          }));
                        }}
                        disabled={!needsTranscode || isProcessing}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E44E51] 
                          focus:ring-[#E44E51] disabled:opacity-60"
                      >
                        {resolutionOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Quality
                        </label>
                        <span className="text-sm text-gray-500">
                          {settings.quality}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={settings.quality}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          quality: parseInt(e.target.value, 10) || prev.quality,
                          selectedPlatform: 'custom'
                        }))}
                        disabled={!needsTranscode || isProcessing}
                        className="w-full accent-[#E44E51] disabled:opacity-60"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                      </div>
                      {!needsTranscode && (
                        <p className="mt-2 text-xs text-gray-500 flex items-start">
                          <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                          Resolution and quality only apply when a conversion format is selected.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimize for Platform
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const disabled = !!platform.preset && (!canTranscode || isProcessing);
                      return (
                        <button
                          key={platform.id}
                          onClick={() => selectPlatform(platform.id)}
                          disabled={disabled}
                          className={`p-3 rounded-lg border flex flex-col items-center disabled:opacity-40 
                            disabled:cursor-not-allowed ${
                            settings.selectedPlatform === platform.id
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

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">
                    {PLATFORMS.find(p => p.id === settings.selectedPlatform)?.name ?? 'Custom'} preset
                  </p>
                  <p>{PLATFORMS.find(p => p.id === settings.selectedPlatform)?.description}</p>
                  <p className="mt-2 text-xs">
                    {needsTranscode
                      ? `FFmpeg will re-encode the take to ${settings.format.toUpperCase()}` +
                        `${settings.resolution ? ` at ${settings.resolution.width}×${settings.resolution.height}` : ''}` +
                        `${settings.fps ? ` · ${settings.fps} fps` : ''} · quality ${settings.quality}%.`
                      : `No conversion selected – the original ${sourceExtension.toUpperCase()} file is used as is.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Real progress: 0 until ffmpeg emits its first `progress` event */}
          {isProcessing && (
            <div className="mb-4 space-y-2">
              {needsTranscode ? (
                <>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E44E51] transition-[width] duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {stage === 'engine'
                      ? 'Starting the video engine…'
                      : `Converting with FFmpeg… ${progress}%`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 flex items-center">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Preparing your file…
                </p>
              )}
              {needsTranscode && !isMultiThreaded && (
                <p className="text-xs text-gray-500">
                  This page is not cross-origin isolated (no SharedArrayBuffer), so the encoder runs
                  single-threaded and can take a while for long takes.
                </p>
              )}
            </div>
          )}

          {status === 'done' && onSave && (
            <p className="mb-4 text-sm text-gray-600">
              Export ready ({outputFileName}) – saving it to your library…
            </p>
          )}

          {/* Export Button */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 truncate mr-4">{outputFileName}</span>
              <div className="flex space-x-2">
                <button
                  onClick={isProcessing ? handleCancel : onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isProcessing || !recordedBlob || !recordingTitle.trim()}
                  className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
                    hover:shadow-[#E44E51]/25 flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{needsTranscode ? `Converting… ${progress}%` : 'Preparing…'}</span>
                    </>
                  ) : (
                    <>
                      {onSave ? <Save className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      <span>{actionLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
