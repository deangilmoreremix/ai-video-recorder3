import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Film, Loader, Pause, Play, RotateCcw } from 'lucide-react';
import { useBRollStore } from '../../../../store/brollStore';
import {
  drawTitleCard,
  getTitleCardDuration,
  loadCardImage,
  recordTitleCard,
  type TitleCardAssets,
  type TitleCardConfig,
  type TitleCardStyle
} from '../titleCardRender';

interface IntroPreviewProps {
  templateData: {
    text: {
      title: string;
      subtitle: string;
      tagline: string;
      callToAction?: string;
    };
    style: TitleCardStyle;
    media?: {
      background: string | null;
      logo: string | null;
    };
  };
  /** Name used for the clip when the intro is added to the B-Roll timeline. */
  name?: string;
}

const RENDER_SIZE = { width: 1280, height: 720 };

const formatTime = (seconds: number) => `${seconds.toFixed(1)}s`;

/**
 * Live, frame-accurate preview of an intro card. The canvas is painted by the
 * shared title-card renderer, which is also what gets recorded when the intro
 * is exported or pushed onto the B-Roll timeline - preview and output can
 * never drift apart.
 */
export const IntroPreview: React.FC<IntroPreviewProps> = ({ templateData, name = 'Intro' }) => {
  const addClip = useBRollStore((state) => state.addClip);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<TitleCardAssets>({ background: null, logo: null });
  const configRef = useRef<TitleCardConfig | null>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const lastFrameRef = useRef(0);
  const downloadUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duration = getTitleCardDuration(templateData.style);

  const config: TitleCardConfig = {
    text: {
      title: templateData.text.title,
      subtitle: templateData.text.subtitle,
      body: templateData.text.tagline,
      callToAction: templateData.text.callToAction
    },
    style: templateData.style
  };
  configRef.current = config;

  const backgroundUrl = templateData.media?.background ?? null;
  const logoUrl = templateData.media?.logo ?? null;

  // Decode the background / logo once per URL.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [background, logo] = await Promise.all([
        loadCardImage(backgroundUrl),
        loadCardImage(logoUrl)
      ]);
      if (!cancelled) assetsRef.current = { background, logo };
    })();
    return () => {
      cancelled = true;
    };
  }, [backgroundUrl, logoUrl]);

  useEffect(() => {
    playingRef.current = isPlaying;
    lastFrameRef.current = 0;
  }, [isPlaying]);

  // Render loop - always paints, so scrubbing while paused still updates.
  useEffect(() => {
    let frame = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      const canvas = canvasRef.current;
      const current = configRef.current;

      if (canvas && current) {
        if (canvas.width !== RENDER_SIZE.width || canvas.height !== RENDER_SIZE.height) {
          canvas.width = RENDER_SIZE.width;
          canvas.height = RENDER_SIZE.height;
        }
        const total = getTitleCardDuration(current.style);

        if (playingRef.current) {
          const delta = lastFrameRef.current ? (now - lastFrameRef.current) / 1000 : 0;
          lastFrameRef.current = now;
          // Loop so the animation keeps playing while the user tweaks it.
          timeRef.current = (timeRef.current + delta) % total;
          // The label/scrubber only needs a coarse update, not one per frame.
          setTime((prev) =>
            Math.abs(prev - timeRef.current) > 0.08 ? timeRef.current : prev
          );
        } else {
          lastFrameRef.current = 0;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawTitleCard(
            ctx,
            current,
            assetsRef.current,
            Math.min(timeRef.current, total),
            canvas.width,
            canvas.height
          );
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(
    () => () => {
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    },
    []
  );

  const seek = useCallback((value: number) => {
    timeRef.current = value;
    setTime(value);
  }, []);

  const restart = useCallback(() => {
    seek(0);
    setIsPlaying(true);
  }, [seek]);

  const render = useCallback(async (): Promise<Blob | null> => {
    const current = configRef.current;
    if (!current) return null;
    setIsRendering(true);
    setRenderProgress(0);
    setError(null);
    try {
      const result = await recordTitleCard(current, assetsRef.current, {
        ...RENDER_SIZE,
        onProgress: setRenderProgress
      });
      return result.blob;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering the intro failed.');
      return null;
    } finally {
      setIsRendering(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setStatus(null);
    const blob = await render();
    if (!blob) return;
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    const url = URL.createObjectURL(blob);
    downloadUrlRef.current = url;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus('Intro downloaded');
  }, [name, render]);

  const handleAddToTimeline = useCallback(async () => {
    setStatus(null);
    const current = configRef.current;
    if (!current) return;

    setIsRendering(true);
    setRenderProgress(0);
    setError(null);
    try {
      const result = await recordTitleCard(current, assetsRef.current, {
        ...RENDER_SIZE,
        onProgress: setRenderProgress
      });
      const url = URL.createObjectURL(result.blob);
      addClip({
        name: `${name} (intro)`,
        url,
        thumbnail: result.thumbnail,
        duration: result.duration,
        type: 'video',
        category: 'intro',
        tags: ['intro'],
        metadata: {
          fileSize: result.blob.size,
          resolution: `${result.width}x${result.height}`,
          codec: result.blob.type,
          fps: 30
        }
      });
      setStatus('Added to the B-Roll timeline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering the intro failed.');
    } finally {
      setIsRendering(false);
    }
  }, [addClip, name]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />

        {isRendering && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-sm">
            <Loader className="w-5 h-5 animate-spin mb-2" />
            <span>Rendering… {renderProgress}%</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="p-2 bg-white rounded-full hover:bg-gray-100"
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={restart}
              className="p-2 bg-white rounded-full hover:bg-gray-100"
              aria-label="Restart preview"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.05"
              value={Math.min(time, duration)}
              onChange={(e) => {
                setIsPlaying(false);
                seek(parseFloat(e.target.value) || 0);
              }}
              className="flex-1 accent-[#E44E51]"
              aria-label="Preview position"
            />
            <span className="text-xs text-white w-20 text-right">
              {formatTime(Math.min(time, duration))} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-500">
          {status ? (
            <span className="flex items-center text-emerald-600">
              <Check className="w-4 h-4 mr-1" />
              {status}
            </span>
          ) : (
            <span>Duration: {formatTime(duration)}</span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            disabled={isRendering}
            className="px-3 py-1.5 flex items-center space-x-2 text-sm text-gray-700 hover:bg-gray-100
              rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={handleAddToTimeline}
            disabled={isRendering}
            className="px-3 py-1.5 flex items-center space-x-2 text-sm bg-[#E44E51] text-white rounded-lg
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:opacity-50
              disabled:cursor-not-allowed"
          >
            <Film className="w-4 h-4" />
            <span>Add to B-Roll</span>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[#E44E51]">{error}</p>}
    </div>
  );
};
