import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Image as ImageIcon,
  Loader,
  Pause,
  Play,
  Palette,
  RotateCcw,
  Droplets,
  Upload,
  UserCheck,
  UserX
} from 'lucide-react';
import {
  DEFAULT_CLIP_BACKGROUND,
  useBRollStore,
  type BackgroundMode,
  type ClipBackground
} from '../../../../store/brollStore';
import { cn } from '../../../../utils/cn';
import { Tooltip } from '../../../ui/Tooltip';
import { ClipSelector } from '../ClipSelector';
import { useVirtualBackground } from './useVirtualBackground';

const MODES: { id: BackgroundMode; label: string; icon: typeof Ban; hint: string }[] = [
  { id: 'none', label: 'None', icon: Ban, hint: 'Keep the original background' },
  { id: 'color', label: 'Color', icon: Palette, hint: 'Replace the background with a solid colour' },
  { id: 'blur', label: 'Blur', icon: Droplets, hint: 'Keep the subject sharp and blur everything behind' },
  { id: 'image', label: 'Image', icon: ImageIcon, hint: 'Composite the subject over your own image' }
];

const COLOR_PRESETS = ['#0F172A', '#1E293B', '#065F46', '#1D4ED8', '#7C3AED', '#E44E51', '#111827', '#F8FAFC'];

export const Backgrounds: React.FC = () => {
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const backgrounds = useBRollStore((state) => state.backgrounds);
  const setClipBackground = useBRollStore((state) => state.setClipBackground);
  const resetClipBackground = useBRollStore((state) => state.resetClipBackground);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef<ClipBackground>(DEFAULT_CLIP_BACKGROUND);
  const dirtyRef = useRef(true);
  const ownedUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [personFound, setPersonFound] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');

  const clip = useMemo(
    () => clips.find((entry) => entry.id === selectedClipId && entry.type === 'video') ?? null,
    [clips, selectedClipId]
  );

  const settings = useMemo<ClipBackground>(
    () => ({
      ...DEFAULT_CLIP_BACKGROUND,
      ...(clip ? backgrounds[clip.id] : undefined)
    }),
    [backgrounds, clip]
  );

  const needsSegmentation = settings.mode !== 'none';
  const { status, error, composite } = useVirtualBackground(Boolean(clip) && needsSegmentation);

  // The render loop reads the latest settings from a ref so changing a slider
  // never has to tear down and rebuild the animation frame chain.
  useEffect(() => {
    settingsRef.current = settings;
    dirtyRef.current = true;
  }, [settings]);

  // Keep the chosen background image decoded and ready for compositing.
  useEffect(() => {
    if (settings.mode !== 'image' || !settings.imageUrl) {
      backgroundImageRef.current = null;
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!cancelled) {
        backgroundImageRef.current = image;
        dirtyRef.current = true;
      }
    };
    image.onerror = () => {
      if (!cancelled) backgroundImageRef.current = null;
    };
    image.src = settings.imageUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [settings.mode, settings.imageUrl]);

  // Compositing loop.
  useEffect(() => {
    if (!clip) return;

    let stopped = false;
    let frame = 0;

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const shouldRender = !video.paused || dirtyRef.current;
        if (shouldRender) {
          dirtyRef.current = false;
          const result = await composite(
            video,
            canvas,
            settingsRef.current,
            backgroundImageRef.current
          );
          setPersonFound((prev) => (prev === result.personFound ? prev : result.personFound));
        }
      }

      if (!stopped) {
        frame = requestAnimationFrame(() => {
          void tick();
        });
      }
    };

    void tick();

    return () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [clip, composite]);

  // Reset playback state when the clip changes.
  useEffect(() => {
    setIsPlaying(false);
    dirtyRef.current = true;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [clip?.id]);

  const update = useCallback(
    (updates: Partial<ClipBackground>) => {
      if (!clip) return;
      setClipBackground(clip.id, updates);
    },
    [clip, setClipBackground]
  );

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
      dirtyRef.current = true;
    }
  }, []);

  const handleImageFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      if (ownedUrlRef.current) URL.revokeObjectURL(ownedUrlRef.current);
      ownedUrlRef.current = url;
      update({ mode: 'image', imageUrl: url });
    },
    [update]
  );

  const clearImage = useCallback(() => {
    if (ownedUrlRef.current) {
      URL.revokeObjectURL(ownedUrlRef.current);
      ownedUrlRef.current = null;
    }
    update({ imageUrl: null });
  }, [update]);

  const statusLabel = (() => {
    if (!needsSegmentation) return 'Original background';
    if (status === 'loading') return 'Loading segmentation model…';
    if (status === 'error') return error ?? 'Segmentation unavailable';
    if (status !== 'ready') return 'Preparing…';
    return personFound ? 'Subject detected' : 'Looking for a subject…';
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Virtual Backgrounds</h3>
          <p className="text-sm text-gray-500">
            Segment the subject out of the selected clip and place them over a colour, a blurred
            plate or your own image. The result is composited live on the canvas below.
          </p>
        </div>
        {clip && (
          <Tooltip content="Remove the background settings from this clip">
            <button
              onClick={() => resetClipBackground(clip.id)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </Tooltip>
        )}
      </div>

      <ClipSelector
        label="Clip to process"
        renderBadge={(clipId) =>
          backgrounds[clipId] && backgrounds[clipId].mode !== 'none' ? (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#E44E51] text-white uppercase">
              {backgrounds[clipId].mode}
            </span>
          ) : null
        }
      />

      {!clip ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Select a video clip to start</p>
          <p className="text-sm">Background replacement runs on the clip you pick above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live preview */}
          <div className="space-y-3">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={clip.url}
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={() => {
                  dirtyRef.current = true;
                }}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
              {needsSegmentation && status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading segmentation model…
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={togglePlayback}
                className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg
                  hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'} preview</span>
              </button>
              <div
                className={cn(
                  'flex items-center space-x-2 text-sm',
                  status === 'error' ? 'text-[#E44E51]' : 'text-gray-500'
                )}
              >
                {needsSegmentation && status === 'ready' ? (
                  personFound ? (
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )
                ) : null}
                <span>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Background mode</span>
              <div className="grid grid-cols-4 gap-2">
                {MODES.map(({ id, label, icon: Icon, hint }) => (
                  <Tooltip key={id} content={hint}>
                    <button
                      onClick={() => update({ mode: id })}
                      className={cn(
                        'flex flex-col items-center py-3 rounded-lg border text-xs transition-colors w-full',
                        settings.mode === id
                          ? 'border-[#E44E51] bg-[#E44E51]/10 text-[#E44E51]'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      )}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      {label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {settings.mode === 'color' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="bg-color">
                  Background colour
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    id="bg-color"
                    type="color"
                    value={settings.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-200"
                  />
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => update({ color: preset })}
                        style={{ backgroundColor: preset }}
                        className={cn(
                          'w-6 h-6 rounded-full border',
                          settings.color.toLowerCase() === preset.toLowerCase()
                            ? 'ring-2 ring-offset-1 ring-[#E44E51] border-transparent'
                            : 'border-gray-200'
                        )}
                        aria-label={`Use ${preset}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settings.mode === 'blur' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Blur strength</span>
                  <span className="text-gray-500">{settings.blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={settings.blurAmount}
                  onChange={(e) => update({ blurAmount: parseInt(e.target.value, 10) || 1 })}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            )}

            {settings.mode === 'image' && (
              <div className="space-y-3">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Background image</span>
                  <label
                    className="flex items-center justify-center space-x-2 px-4 py-3 border border-dashed
                      border-gray-300 rounded-lg cursor-pointer hover:border-[#E44E51] hover:text-[#E44E51]
                      text-gray-500 text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload an image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={imageUrlDraft}
                    onChange={(e) => setImageUrlDraft(e.target.value)}
                    placeholder="…or paste an image URL"
                    className="flex-1 rounded-lg border-gray-300 shadow-sm text-sm"
                  />
                  <button
                    onClick={() => {
                      if (imageUrlDraft.trim()) {
                        update({ mode: 'image', imageUrl: imageUrlDraft.trim() });
                        setImageUrlDraft('');
                      }
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Use
                  </button>
                </div>

                {settings.imageUrl && (
                  <div className="flex items-center space-x-3">
                    <img
                      src={settings.imageUrl}
                      alt="Selected background"
                      className="w-24 h-14 object-cover rounded border border-gray-200"
                    />
                    <select
                      value={settings.imageFit}
                      onChange={(e) =>
                        update({ imageFit: e.target.value as ClipBackground['imageFit'] })
                      }
                      className="rounded-lg border-gray-300 text-sm"
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="stretch">Stretch</option>
                    </select>
                    <button
                      onClick={clearImage}
                      className="text-sm text-gray-500 hover:text-[#E44E51]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {needsSegmentation && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Edge softness</span>
                    <span className="text-gray-500">{settings.edgeSoftness}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={settings.edgeSoftness}
                    onChange={(e) => update({ edgeSoftness: parseInt(e.target.value, 10) || 0 })}
                    className="w-full accent-[#E44E51]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Detection threshold</span>
                    <span className="text-gray-500">{settings.threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={settings.threshold}
                    onChange={(e) => update({ threshold: parseFloat(e.target.value) || 0.5 })}
                    className="w-full accent-[#E44E51]"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Saved on <span className="font-medium text-gray-500">{clip.name}</span> — the B-Roll
              store keeps these settings with the clip so the same composite can be reproduced on
              export.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
