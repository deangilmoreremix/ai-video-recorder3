import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layout,
  Pause,
  Play,
  Trash2,
  Type
} from 'lucide-react';
import { useBRollStore, type ClipOverlay } from '../../../../store/brollStore';
import { cn } from '../../../../utils/cn';
import { Tooltip } from '../../../ui/Tooltip';
import { ClipSelector } from '../ClipSelector';
import { drawOverlays, getOverlayAlpha } from './overlayRender';

const EMPTY_OVERLAYS: ClipOverlay[] = [];

const FONTS = ['Inter', 'Arial', 'Georgia', 'Impact', 'Courier New', 'Times New Roman', 'Verdana'];

const formatTime = (seconds: number) => `${seconds.toFixed(2)}s`;

export const Overlays: React.FC = () => {
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const overlayMap = useBRollStore((state) => state.overlays);
  const addOverlay = useBRollStore((state) => state.addOverlay);
  const updateOverlay = useBRollStore((state) => state.updateOverlay);
  const removeOverlay = useBRollStore((state) => state.removeOverlay);
  const reorderOverlay = useBRollStore((state) => state.reorderOverlay);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlaysRef = useRef<ClipOverlay[]>(EMPTY_OVERLAYS);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const dirtyRef = useRef(true);
  const draggingRef = useRef(false);

  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const clip = useMemo(
    () => clips.find((entry) => entry.id === selectedClipId && entry.type === 'video') ?? null,
    [clips, selectedClipId]
  );

  const overlays = clip ? overlayMap[clip.id] ?? EMPTY_OVERLAYS : EMPTY_OVERLAYS;
  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null;

  useEffect(() => {
    overlaysRef.current = overlays;
    dirtyRef.current = true;
  }, [overlays]);

  useEffect(() => {
    setSelectedOverlayId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    dirtyRef.current = true;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [clip?.id]);

  // Decode every image referenced by an overlay once, then reuse it per frame.
  const imageUrls = overlays
    .map((overlay) => overlay.imageUrl)
    .filter((url): url is string => Boolean(url))
    .join('|');

  useEffect(() => {
    const urls = imageUrls ? imageUrls.split('|') : [];
    const cache = imagesRef.current;

    urls.forEach((url) => {
      if (cache.has(url)) return;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        dirtyRef.current = true;
      };
      image.src = url;
      cache.set(url, image);
    });

    // Drop images that are no longer referenced.
    Array.from(cache.keys()).forEach((url) => {
      if (!urls.includes(url)) cache.delete(url);
    });
  }, [imageUrls]);

  // Preview loop: source frame first, overlays composited on top.
  useEffect(() => {
    if (!clip) return;

    let stopped = false;
    let frame = 0;
    let lastReportedTime = -1;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return false;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return false;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(video, 0, 0, width, height);
      drawOverlays(ctx, overlaysRef.current, video.currentTime, width, height, imagesRef.current);

      if (Math.abs(video.currentTime - lastReportedTime) > 0.08) {
        lastReportedTime = video.currentTime;
        setCurrentTime(video.currentTime);
      }

      return true;
    };

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && (!video.paused || dirtyRef.current)) {
        // Only clear the dirty flag once a frame was really painted, so the
        // first decoded frame always makes it to the canvas.
        if (render()) dirtyRef.current = false;
      }
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [clip]);

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

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
    dirtyRef.current = true;
  }, []);

  const patchSelected = useCallback(
    (updates: Partial<ClipOverlay>) => {
      if (!clip || !selectedOverlayId) return;
      updateOverlay(clip.id, selectedOverlayId, updates);
    },
    [clip, selectedOverlayId, updateOverlay]
  );

  const handleAddText = useCallback(() => {
    if (!clip) return;
    const end = clip.duration > 0 ? Math.min(clip.duration, Math.max(1, currentTime + 5)) : 5;
    const id = addOverlay(clip.id, {
      type: 'text',
      name: `Text ${overlays.length + 1}`,
      text: 'Your text here',
      startTime: Math.max(0, currentTime),
      endTime: end,
      position: { x: 0.5, y: 0.8 }
    });
    setSelectedOverlayId(id);
    dirtyRef.current = true;
  }, [addOverlay, clip, currentTime, overlays.length]);

  const handleAddImage = useCallback(
    (file: File) => {
      if (!clip) return;
      const url = URL.createObjectURL(file);
      const end = clip.duration > 0 ? Math.min(clip.duration, Math.max(1, currentTime + 5)) : 5;
      const id = addOverlay(clip.id, {
        type: 'image',
        name: file.name,
        imageUrl: url,
        startTime: Math.max(0, currentTime),
        endTime: end,
        position: { x: 0.75, y: 0.25 },
        scale: 0.8
      });
      setSelectedOverlayId(id);
      dirtyRef.current = true;
    },
    [addOverlay, clip, currentTime]
  );

  /** Map a pointer event to normalised canvas coordinates (object-contain aware). */
  const pointerToPosition = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const shownWidth = canvas.width * scale;
    const shownHeight = canvas.height * scale;
    const offsetX = rect.left + (rect.width - shownWidth) / 2;
    const offsetY = rect.top + (rect.height - shownHeight) / 2;
    const x = (event.clientX - offsetX) / shownWidth;
    const y = (event.clientY - offsetY) / shownHeight;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!selectedOverlay) return;
      const position = pointerToPosition(event);
      if (!position) return;
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      patchSelected({ position });
      dirtyRef.current = true;
    },
    [patchSelected, pointerToPosition, selectedOverlay]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const position = pointerToPosition(event);
      if (!position) return;
      patchSelected({ position });
      dirtyRef.current = true;
    },
    [patchSelected, pointerToPosition]
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const clipDuration = duration || clip?.duration || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Overlays</h3>
        <p className="text-sm text-gray-500">
          Composite text and image layers over the selected clip. Position, scale, rotation, opacity
          and in/out timing are rendered live on the canvas and stored with the clip.
        </p>
      </div>

      <ClipSelector
        label="Clip to decorate"
        renderBadge={(clipId) =>
          overlayMap[clipId]?.length ? (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#E44E51] text-white">
              {overlayMap[clipId].length} overlay{overlayMap[clipId].length > 1 ? 's' : ''}
            </span>
          ) : null
        }
      />

      {!clip ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-lg">
          <Layout className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Select a video clip to add overlays</p>
          <p className="text-sm">Overlays are stored per clip so each one keeps its own layers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-3">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={clip.url}
                muted
                loop
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => {
                  const value = e.currentTarget.duration;
                  setDuration(Number.isFinite(value) ? value : 0);
                  dirtyRef.current = true;
                }}
                onLoadedData={() => {
                  dirtyRef.current = true;
                }}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              />
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={cn(
                  'absolute inset-0 w-full h-full object-contain touch-none',
                  selectedOverlay ? 'cursor-move' : 'cursor-default'
                )}
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlayback}
                className="p-2 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E]
                  shadow-lg hover:shadow-[#E44E51]/25"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max={clipDuration || 0}
                step="0.01"
                value={Math.min(currentTime, clipDuration || 0)}
                onChange={(e) => seek(parseFloat(e.target.value) || 0)}
                className="flex-1 accent-[#E44E51]"
              />
              <span className="text-xs text-gray-500 w-24 text-right">
                {formatTime(currentTime)} / {formatTime(clipDuration)}
              </span>
            </div>

            <p className="text-xs text-gray-400">
              {selectedOverlay
                ? 'Drag on the preview to reposition the selected overlay.'
                : 'Select an overlay to edit it, then drag on the preview to move it.'}
            </p>

            <div className="flex space-x-2">
              <button
                onClick={handleAddText}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-[#E44E51] text-white
                  rounded-lg hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25"
              >
                <Type className="w-4 h-4" />
                <span>Add text</span>
              </button>
              <label
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 rounded-lg
                  hover:bg-gray-200 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Add image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAddImage(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {/* Layer list + inspector */}
          <div className="space-y-4">
            <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
              {overlays.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  No overlays yet — add a text or image layer to get started.
                </p>
              ) : (
                overlays
                  .slice()
                  .reverse()
                  .map((overlay) => {
                    const live = getOverlayAlpha(overlay, currentTime) > 0;
                    return (
                      <div
                        key={overlay.id}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                          selectedOverlayId === overlay.id ? 'bg-[#E44E51]/10' : 'hover:bg-gray-50'
                        )}
                        onClick={() => setSelectedOverlayId(overlay.id)}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {overlay.type === 'text' ? (
                            <Type className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {overlay.type === 'text' ? overlay.text || overlay.name : overlay.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(overlay.startTime)} → {formatTime(overlay.endTime)}
                              {live && <span className="ml-2 text-emerald-600">on screen</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <Tooltip content={overlay.visible ? 'Hide overlay' : 'Show overlay'}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOverlay(clip.id, overlay.id, { visible: !overlay.visible });
                                dirtyRef.current = true;
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {overlay.visible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </Tooltip>
                          <Tooltip content="Move up (render later)">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reorderOverlay(clip.id, overlay.id, 1);
                                dirtyRef.current = true;
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Move down (render earlier)">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reorderOverlay(clip.id, overlay.id, -1);
                                dirtyRef.current = true;
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Delete overlay">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeOverlay(clip.id, overlay.id);
                                if (selectedOverlayId === overlay.id) setSelectedOverlayId(null);
                                dirtyRef.current = true;
                              }}
                              className="p-1 hover:bg-red-100 text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {selectedOverlay && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                {selectedOverlay.type === 'text' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                      <textarea
                        value={selectedOverlay.text}
                        rows={2}
                        onChange={(e) => patchSelected({ text: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font</label>
                        <select
                          value={selectedOverlay.fontFamily}
                          onChange={(e) => patchSelected({ fontFamily: e.target.value })}
                          className="w-full rounded-lg border-gray-300 text-sm"
                        >
                          {FONTS.map((font) => (
                            <option key={font} value={font}>
                              {font}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Size ({selectedOverlay.fontSize}% of height)
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          step="0.5"
                          value={selectedOverlay.fontSize}
                          onChange={(e) =>
                            patchSelected({ fontSize: parseFloat(e.target.value) || 2 })
                          }
                          className="w-full accent-[#E44E51]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-700">Colour</span>
                        <input
                          type="color"
                          value={selectedOverlay.color}
                          onChange={(e) => patchSelected({ color: e.target.value })}
                          className="w-10 h-8 rounded border border-gray-200"
                        />
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedOverlay.fontWeight === 'bold'}
                          onChange={(e) =>
                            patchSelected({ fontWeight: e.target.checked ? 'bold' : 'normal' })
                          }
                          className="rounded text-[#E44E51] focus:ring-[#E44E51]"
                        />
                        <span className="text-gray-700">Bold</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedOverlay.backgroundColor)}
                          onChange={(e) =>
                            patchSelected({ backgroundColor: e.target.checked ? '#000000' : null })
                          }
                          className="rounded text-[#E44E51] focus:ring-[#E44E51]"
                        />
                        <span className="text-gray-700">Plate</span>
                      </label>
                      {selectedOverlay.backgroundColor && (
                        <input
                          type="color"
                          value={selectedOverlay.backgroundColor}
                          onChange={(e) => patchSelected({ backgroundColor: e.target.value })}
                          className="w-10 h-8 rounded border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    {selectedOverlay.imageUrl && (
                      <img
                        src={selectedOverlay.imageUrl}
                        alt={selectedOverlay.name}
                        className="w-20 h-12 object-contain bg-gray-200 rounded"
                      />
                    )}
                    <p className="text-sm text-gray-600 truncate">{selectedOverlay.name}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">X</span>
                      <span className="text-gray-500">
                        {Math.round(selectedOverlay.position.x * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.005"
                      value={selectedOverlay.position.x}
                      onChange={(e) =>
                        patchSelected({
                          position: {
                            ...selectedOverlay.position,
                            x: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Y</span>
                      <span className="text-gray-500">
                        {Math.round(selectedOverlay.position.y * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.005"
                      value={selectedOverlay.position.y}
                      onChange={(e) =>
                        patchSelected({
                          position: {
                            ...selectedOverlay.position,
                            y: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Scale</span>
                      <span className="text-gray-500">{selectedOverlay.scale.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.05"
                      value={selectedOverlay.scale}
                      onChange={(e) => patchSelected({ scale: parseFloat(e.target.value) || 0.1 })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Rotation</span>
                      <span className="text-gray-500">{Math.round(selectedOverlay.rotation)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedOverlay.rotation}
                      onChange={(e) => patchSelected({ rotation: parseInt(e.target.value, 10) || 0 })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Opacity</span>
                      <span className="text-gray-500">
                        {Math.round(selectedOverlay.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedOverlay.opacity}
                      onChange={(e) => patchSelected({ opacity: parseFloat(e.target.value) || 0 })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Fade</span>
                      <span className="text-gray-500">{selectedOverlay.fadeDuration.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={selectedOverlay.fadeDuration}
                      onChange={(e) =>
                        patchSelected({ fadeDuration: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start (s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={clipDuration || undefined}
                      step="0.1"
                      value={selectedOverlay.startTime}
                      onChange={(e) =>
                        patchSelected({ startTime: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End (s)</label>
                    <input
                      type="number"
                      min="0"
                      max={clipDuration || undefined}
                      step="0.1"
                      value={selectedOverlay.endTime}
                      onChange={(e) =>
                        patchSelected({ endTime: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => seek(selectedOverlay.startTime)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Jump to start
                  </button>
                  <button
                    onClick={() =>
                      patchSelected({
                        startTime: Math.max(0, currentTime),
                        endTime: Math.max(currentTime + 1, selectedOverlay.endTime)
                      })
                    }
                    className="px-3 py-1.5 text-sm text-[#E44E51] hover:bg-[#E44E51]/10 rounded-lg"
                  >
                    Start at playhead
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
