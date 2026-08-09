import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Clapperboard, Info, Loader, X } from 'lucide-react';
import { useBRollStore } from '../../../store/brollStore';
import { getRenderableClips, renderBRollTimeline } from '../../Export/brollCompositor';
import { isCancellation, toError } from '../../Export/VideoProcessing';
import { VideoExport } from '../../Export/VideoExport';
import { cn } from '../../../utils/cn';
import { Tooltip } from '../../ui/Tooltip';

/**
 * "Export B-Roll" action for the B-Roll panel header.
 *
 * It bakes the ordered clips - with their backgrounds, overlays and
 * transitions - into a single video and then hands that blob to the regular
 * export dialog, so the download/transcode path stays exactly the same one the
 * recorder and the normal Export dialog use.
 */
export const ExportBRoll: React.FC = () => {
  const clips = useBRollStore((state) => state.clips);
  const backgrounds = useBRollStore((state) => state.backgrounds);
  const overlays = useBRollStore((state) => state.overlays);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<Blob | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const renderable = useMemo(() => getRenderableClips(clips), [clips]);
  const effectCount = useMemo(() => {
    const withBackground = renderable.filter(
      (clip) => (backgrounds[clip.id]?.mode ?? 'none') !== 'none'
    ).length;
    const overlayCount = renderable.reduce(
      (sum, clip) => sum + (overlays[clip.id]?.filter((overlay) => overlay.visible).length ?? 0),
      0
    );
    return { withBackground, overlayCount, transitions: Math.max(0, renderable.length - 1) };
  }, [backgrounds, overlays, renderable]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRendering(false);
    setProgress(0);
    setStage('');
  }, []);

  const handleRender = useCallback(async () => {
    if (isRendering || renderable.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRendering(true);
    setProgress(0);
    setStage('Preparing…');
    setError(null);
    setWarnings([]);
    setResult(null);

    try {
      const rendered = await renderBRollTimeline({
        clips,
        backgrounds,
        overlays,
        onProgress: setProgress,
        onStage: setStage,
        signal: controller.signal
      });
      setWarnings(rendered.warnings);
      setResult(rendered.blob);
    } catch (err) {
      if (!isCancellation(err)) setError(toError(err).message);
    } finally {
      abortRef.current = null;
      setIsRendering(false);
      setStage('');
    }
  }, [backgrounds, clips, isRendering, overlays, renderable.length]);

  const disabled = renderable.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        {isRendering && (
          <button
            onClick={handleCancel}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
        <Tooltip
          content={
            disabled
              ? 'Import a video or image clip in the Media Manager first'
              : 'Bake backgrounds, overlays and transitions into one video'
          }
        >
          <button
            onClick={handleRender}
            disabled={disabled || isRendering}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors',
              disabled || isRendering
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-[#E44E51] text-white hover:bg-[#D43B3E] hover:shadow-[#E44E51]/25'
            )}
          >
            {isRendering ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Rendering… {progress}%</span>
              </>
            ) : (
              <>
                <Clapperboard className="w-4 h-4" />
                <span>Export B-Roll</span>
              </>
            )}
          </button>
        </Tooltip>
      </div>

      {disabled ? (
        <p className="text-xs text-gray-400 text-right">
          No clips yet — add media in the Media Manager tab.
        </p>
      ) : (
        !isRendering && (
          <p className="text-xs text-gray-400 text-right">
            {renderable.length} clip{renderable.length > 1 ? 's' : ''} · {effectCount.transitions} transition
            {effectCount.transitions === 1 ? '' : 's'} · {effectCount.overlayCount} overlay
            {effectCount.overlayCount === 1 ? '' : 's'} · {effectCount.withBackground} background
            {effectCount.withBackground === 1 ? '' : 's'}
          </p>
        )
      )}

      {isRendering && (
        <div className="w-64 space-y-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E44E51] transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 truncate">{stage}</p>
        </div>
      )}

      {error && (
        <div className="max-w-md p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="max-w-md p-3 bg-amber-50 text-amber-800 rounded-lg text-xs space-y-1">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <ul className="flex-1 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <button onClick={() => setWarnings([])} className="hover:text-amber-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* The rendered sequence is handed to the regular export dialog, which
          owns the transcode + download flow used everywhere else. */}
      {result && (
        <VideoExport
          videoBlob={result}
          fileName="broll-sequence"
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
};
