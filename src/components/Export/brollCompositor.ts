/**
 * B-Roll compositor: turns `brollStore` (clips + backgrounds + overlays +
 * transitions) into ONE finished video Blob with every effect baked in.
 *
 * Pipeline (all inside a single exclusive ffmpeg.wasm session so MEMFS state
 * survives between commands):
 *
 *   1. resolve every clip's media (and every overlay / background image) to a
 *      Blob - a clip whose source cannot be fetched aborts the render with a
 *      message naming the clip;
 *   2. one pass per clip: normalise it to the sequence frame size / fps, bake
 *      the background backdrop, the colour filters and the overlay stack, and
 *      give it a guaranteed stereo audio track;
 *   3. one final pass: chain the normalised clips with `xfade` (video) and
 *      `acrossfade` (audio) using each clip's stored transition;
 *   4. read the result back as an `mp4` Blob.
 *
 * The command lines themselves live in `brollFilterGraph.ts` so they can be
 * built and asserted on without a browser.
 *
 * ── Documented limitation ────────────────────────────────────────────────────
 * ffmpeg.wasm cannot run person segmentation, so `background.mode` is baked as
 * a *full-frame backdrop behind the clip*, not as a replacement of the area
 * around a segmented subject:
 *   • `color` - solid colour plate behind the fitted clip;
 *   • `blur`  - blurred, cover-scaled copy of the clip behind the fitted clip;
 *   • `image` - the chosen image (cover/contain/stretch) behind the fitted clip.
 * The backdrop is therefore visible wherever the clip does not fill the frame
 * (letterbox / pillarbox areas). The live preview keeps using real TensorFlow
 * segmentation; the export never claims to.
 */
import type { BRollClip, ClipBackground, ClipOverlay } from '../../store/brollStore';
import { drawOverlay } from '../Editor/BRoll/Overlays/overlayRender';
import {
  buildAudioProbeArgs,
  buildClipPassArgs,
  buildTimelinePassArgs,
  planTimeline,
  safeFileName,
  type OverlayRender,
  type TimelineSegment
} from './brollFilterGraph';
import {
  ExportCancelledError,
  getExtensionForBlob,
  MAX_INPUT_BYTES,
  runFFmpegSession,
  toError,
  type ProgressCallback
} from './VideoProcessing';
// Bundled with the app: the ffmpeg core has no fontconfig, so `drawtext` can
// only render text from an explicit font file.
import bundledFontUrl from '../../assets/fonts/DejaVuSans.ttf?url';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface BRollRenderSize {
  width: number;
  height: number;
}

export interface BRollRenderOptions {
  clips: BRollClip[];
  backgrounds: Record<string, ClipBackground>;
  overlays: Record<string, ClipOverlay[]>;
  /** Output frame size. Defaults to the first clip's resolution (max 1080p). */
  size?: BRollRenderSize;
  /** Output frame rate. Defaults to 30. */
  fps?: number;
  onProgress?: ProgressCallback;
  /** Human readable description of the current step. */
  onStage?: (stage: string) => void;
  signal?: AbortSignal;
}

export interface BRollRenderResult {
  blob: Blob;
  duration: number;
  width: number;
  height: number;
  /** Clips that are part of the store but cannot be rendered (audio only). */
  skipped: string[];
  /** Non fatal notes worth showing to the user. */
  warnings: string[];
}

/** Clips the compositor can actually draw. */
export const isRenderableClip = (clip: BRollClip): boolean =>
  clip.type === 'video' || clip.type === 'image';

export const getRenderableClips = (clips: BRollClip[]): BRollClip[] => clips.filter(isRenderableClip);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_SIZE: BRollRenderSize = { width: 1280, height: 720 };
const DEFAULT_FPS = 30;
/** Stills have no intrinsic length. */
const DEFAULT_STILL_DURATION = 5;

const clamp = (value: number, min: number, max: number, fallback = min): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const toEven = (value: number, fallback: number): number => {
  const rounded = Math.round(Number.isFinite(value) && value > 0 ? value : fallback);
  const clamped = Math.min(1920, Math.max(160, rounded));
  return clamped % 2 === 0 ? clamped : clamped - 1;
};

/** Effective length of a clip inside the sequence, honouring its trim. */
export const getClipDuration = (clip: BRollClip): number => {
  const start = Math.max(0, Number.isFinite(clip.startTime) ? clip.startTime : 0);
  const end = Number.isFinite(clip.endTime) ? clip.endTime : 0;
  const trimmed = end > start ? end - start : 0;
  if (trimmed > 0.05) return trimmed;
  if (Number.isFinite(clip.duration) && clip.duration > 0.05) return clip.duration;
  return clip.type === 'image' ? DEFAULT_STILL_DURATION : 1;
};

/** `"1920x1080"` → `{ width, height }`. */
const parseResolution = (resolution: string): BRollRenderSize | null => {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(resolution.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
};

export const resolveRenderSize = (clips: BRollClip[], requested?: BRollRenderSize): BRollRenderSize => {
  if (requested) {
    return { width: toEven(requested.width, DEFAULT_SIZE.width), height: toEven(requested.height, DEFAULT_SIZE.height) };
  }
  for (const clip of clips) {
    const parsed = parseResolution(clip.metadata?.resolution ?? '');
    if (parsed) {
      // Cap at 1080p: ffmpeg.wasm keeps every frame in wasm memory.
      const scale = Math.min(1, 1920 / parsed.width, 1080 / parsed.height);
      return {
        width: toEven(parsed.width * scale, DEFAULT_SIZE.width),
        height: toEven(parsed.height * scale, DEFAULT_SIZE.height)
      };
    }
  }
  return { ...DEFAULT_SIZE };
};

const describeFetchFailure = (subject: string, url: string, error: unknown): Error => {
  const reason = toError(error).message;
  const hint = url.startsWith('blob:')
    ? 'Its temporary browser URL has expired - re-import the file in the Media Manager and try again.'
    : 'Check that the file is still reachable (and that the server allows cross-origin requests).';
  return new Error(`${subject} could not be loaded. ${hint} (${reason})`);
};

/** Fetch any media the store references (object URL, data URL or remote URL). */
const fetchBlob = async (url: string, subject: string, signal?: AbortSignal): Promise<Blob> => {
  if (!url) throw new Error(`${subject} has no media source. Re-import it in the Media Manager.`);
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('the file is empty');
    return blob;
  } catch (error) {
    if (signal?.aborted) throw new ExportCancelledError();
    throw describeFetchFailure(subject, url, error);
  }
};

const loadImageSize = (blob: Blob): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    const done = (size: { width: number; height: number }) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onload = () => done({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    image.onerror = () => done({ width: 0, height: 0 });
    image.src = url;
  });

/**
 * Rotated text cannot be produced by `drawtext`, so those overlays are painted
 * once with the exact preview renderer and composited as a full frame PNG.
 */
const rasteriseTextOverlay = (
  overlay: ClipOverlay,
  width: number,
  height: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      // Opacity + fades are applied by ffmpeg, so paint at full alpha here.
      drawOverlay(ctx, overlay, 1, width, height, null);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });

interface PreparedClip {
  clip: BRollClip;
  duration: number;
  blob: Blob;
  extension: string;
  background: ClipBackground | null;
  backgroundBlob: Blob | null;
  backgroundExtension: string;
  overlays: Array<{
    overlay: ClipOverlay;
    /** Text overlays rendered by drawtext have no image. */
    blob: Blob | null;
    extension: string;
    naturalWidth: number;
    naturalHeight: number;
    /** A rotated text overlay is baked into a full frame PNG. */
    rasterised: boolean;
  }>;
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Renders the ordered `brollStore.clips` (with their effects) into a single
 * H.264/AAC mp4 Blob. Progress is reported from ffmpeg's own `progress` events.
 */
export const renderBRollTimeline = async (
  options: BRollRenderOptions
): Promise<BRollRenderResult> => {
  const { clips, backgrounds, overlays, onProgress, onStage, signal } = options;

  const renderable = getRenderableClips(clips);
  const skipped = clips.filter((clip) => !isRenderableClip(clip)).map((clip) => clip.name);
  const warnings: string[] = [];

  if (renderable.length === 0) {
    throw new Error(
      'There is nothing to render yet. Import at least one video or image clip in the Media Manager tab.'
    );
  }
  if (skipped.length > 0) {
    warnings.push(
      `${skipped.length} audio-only clip${skipped.length > 1 ? 's were' : ' was'} skipped: they have no picture to render.`
    );
  }

  const size = resolveRenderSize(renderable, options.size);
  const fps = Math.round(clamp(options.fps ?? DEFAULT_FPS, 1, 60, DEFAULT_FPS));

  onStage?.('Collecting media…');

  /* -- 1. resolve every asset ------------------------------------------- */
  const prepared: PreparedClip[] = [];
  let totalInputBytes = 0;
  let needsFont = false;

  for (const clip of renderable) {
    const blob = await fetchBlob(clip.url, `The clip “${clip.name}”`, signal);
    totalInputBytes += blob.size;

    const background = backgrounds[clip.id] ?? null;
    let backgroundBlob: Blob | null = null;
    if (background && background.mode === 'image' && background.imageUrl) {
      backgroundBlob = await fetchBlob(
        background.imageUrl,
        `The background image of “${clip.name}”`,
        signal
      );
      totalInputBytes += backgroundBlob.size;
    } else if (background && background.mode === 'image') {
      warnings.push(`“${clip.name}” uses an image background but no image was chosen - it was ignored.`);
    }

    const clipOverlays: PreparedClip['overlays'] = [];
    for (const overlay of overlays[clip.id] ?? []) {
      if (!overlay.visible) continue;

      if (overlay.type === 'image') {
        if (!overlay.imageUrl) {
          warnings.push(`The image overlay “${overlay.name}” on “${clip.name}” has no picture - it was ignored.`);
          continue;
        }
        const overlayBlob = await fetchBlob(
          overlay.imageUrl,
          `The overlay “${overlay.name}” on “${clip.name}”`,
          signal
        );
        const natural = await loadImageSize(overlayBlob);
        totalInputBytes += overlayBlob.size;
        clipOverlays.push({
          overlay,
          blob: overlayBlob,
          extension: getExtensionForBlob(overlayBlob, 'png'),
          naturalWidth: natural.width,
          naturalHeight: natural.height,
          rasterised: false
        });
        continue;
      }

      if (!overlay.text.trim()) continue;

      // drawtext cannot rotate, so rotated text is baked with the preview
      // renderer into a full frame PNG instead.
      if (Math.abs(overlay.rotation) > 0.5) {
        const raster = await rasteriseTextOverlay(overlay, size.width, size.height);
        if (raster) {
          totalInputBytes += raster.size;
          clipOverlays.push({
            overlay,
            blob: raster,
            extension: 'png',
            naturalWidth: size.width,
            naturalHeight: size.height,
            rasterised: true
          });
          continue;
        }
        warnings.push(`“${overlay.name}” could not be rotated in the export - it was drawn upright.`);
      }

      needsFont = true;
      clipOverlays.push({
        overlay,
        blob: null,
        extension: '',
        naturalWidth: 0,
        naturalHeight: 0,
        rasterised: false
      });
    }

    prepared.push({
      clip,
      duration: getClipDuration(clip),
      blob,
      extension: getExtensionForBlob(blob, clip.type === 'image' ? 'png' : 'mp4'),
      background,
      backgroundBlob,
      backgroundExtension: backgroundBlob ? getExtensionForBlob(backgroundBlob, 'png') : 'png',
      overlays: clipOverlays
    });
  }

  if (totalInputBytes > MAX_INPUT_BYTES) {
    throw new Error(
      `The B-Roll sequence is too large to render in the browser ` +
        `(${Math.round(totalInputBytes / 1024 / 1024)} MB, limit ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB). ` +
        'Remove or trim a few clips and try again.'
    );
  }

  /* -- 2. the font drawtext needs --------------------------------------- */
  let fontBlob: Blob | null = null;
  if (needsFont) {
    try {
      const response = await fetch(bundledFontUrl, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fontBlob = await response.blob();
    } catch (error) {
      if (signal?.aborted) throw new ExportCancelledError();
      // Without a font file drawtext cannot run - fall back to painting the
      // text with the preview renderer.
      warnings.push('The export font could not be loaded, so text overlays were rasterised from the preview.');
      for (const entry of prepared) {
        for (let index = 0; index < entry.overlays.length; index += 1) {
          const item = entry.overlays[index];
          if (item.blob) continue;
          const raster = await rasteriseTextOverlay(item.overlay, size.width, size.height);
          if (!raster) {
            warnings.push(`“${item.overlay.name}” could not be rendered.`);
            continue;
          }
          entry.overlays[index] = {
            ...item,
            blob: raster,
            extension: 'png',
            naturalWidth: size.width,
            naturalHeight: size.height,
            rasterised: true
          };
        }
      }
      console.warn('[broll-export] font unavailable, falling back to canvas text', toError(error).message);
    }
  }

  /* -- 3. progress weighting -------------------------------------------- */
  const segments: TimelineSegment[] = prepared.map((entry) => ({
    file: '',
    duration: entry.duration,
    transition: entry.clip.transition ?? null
  }));
  const timelineDuration = planTimeline(segments).totalDuration;
  const clipWork = prepared.reduce((sum, entry) => sum + entry.duration, 0);
  const needsTimelinePass = prepared.length > 1;
  const totalWork = clipWork + (needsTimelinePass ? timelineDuration : 0);

  let completedWork = 0;
  const reportStepProgress = (stepWeight: number) => (value: number) => {
    if (totalWork <= 0) return;
    const done = completedWork + (clamp(value, 0, 100, 0) / 100) * stepWeight;
    onProgress?.(Math.min(99, Math.round((done / totalWork) * 100)));
  };

  const FONT_FILE = 'broll_font.ttf';

  /* -- 4. render --------------------------------------------------------- */
  const blob = await runFFmpegSession(async (session) => {
    const created: string[] = [];
    const normalised: string[] = [];

    const cleanup = async () => {
      for (const file of created) await session.deleteFile(file);
      created.length = 0;
    };

    try {
      if (fontBlob) {
        await session.writeFile(FONT_FILE, fontBlob);
        created.push(FONT_FILE);
      }

      for (let index = 0; index < prepared.length; index += 1) {
        const entry = prepared[index];
        const label = entry.clip.name || `clip ${index + 1}`;
        onStage?.(`Rendering “${label}” (${index + 1}/${prepared.length})…`);

        const prefix = `broll_${index}_${safeFileName(String(entry.clip.id)).slice(0, 12)}`;
        const sourceFile = `${prefix}_src.${entry.extension}`;
        await session.writeFile(sourceFile, entry.blob);
        created.push(sourceFile);

        let backgroundFile: string | null = null;
        if (entry.backgroundBlob) {
          backgroundFile = `${prefix}_bg.${entry.backgroundExtension}`;
          await session.writeFile(backgroundFile, entry.backgroundBlob);
          created.push(backgroundFile);
        }

        const overlayRenders: OverlayRender[] = [];
        for (let overlayIndex = 0; overlayIndex < entry.overlays.length; overlayIndex += 1) {
          const item = entry.overlays[overlayIndex];

          if (item.blob) {
            const file = `${prefix}_ov${overlayIndex}.${item.extension}`;
            await session.writeFile(file, item.blob);
            created.push(file);
            overlayRenders.push({
              kind: 'image',
              // A rasterised text layer already carries its own placement, so
              // it is composited as a full frame image at the centre.
              overlay: item.rasterised
                ? { ...item.overlay, position: { x: 0.5, y: 0.5 }, scale: 1, rotation: 0 }
                : item.overlay,
              file,
              naturalWidth: item.rasterised ? size.width : item.naturalWidth,
              naturalHeight: item.rasterised ? size.height : item.naturalHeight
            });
            continue;
          }

          const textFile = `${prefix}_ov${overlayIndex}.txt`;
          await session.writeFile(textFile, item.overlay.text);
          created.push(textFile);
          overlayRenders.push({
            kind: 'text',
            overlay: item.overlay,
            textFile,
            fontFile: FONT_FILE
          });
        }

        // Only a real video stream can carry audio; ask ffmpeg instead of
        // guessing so silent recordings still line up with `acrossfade`.
        let hasAudio = false;
        if (entry.clip.type === 'video') {
          const exitCode = await session.exec(buildAudioProbeArgs(sourceFile), { tolerateFailure: true });
          hasAudio = exitCode === 0;
        }

        const output = `${prefix}_norm.mp4`;
        const args = buildClipPassArgs({
          width: size.width,
          height: size.height,
          fps,
          duration: entry.duration,
          source: {
            file: sourceFile,
            still: entry.clip.type === 'image',
            trimStart: entry.clip.startTime,
            hasAudio
          },
          background: entry.background,
          backgroundFile,
          overlays: overlayRenders,
          colorFilters: entry.clip.filters,
          volume: entry.clip.volume,
          // The first clip's stored transition describes how it comes in from
          // black, so it is baked as a fade in.
          fadeIn: index === 0 && entry.clip.transition ? entry.clip.transition.duration : 0,
          output
        });

        await session.exec(args, {
          expectedDuration: entry.duration,
          onProgress: reportStepProgress(entry.duration),
          errorMessage: `Rendering “${label}” failed`
        });

        completedWork += entry.duration;
        normalised.push(output);

        // The per-clip sources are no longer needed - free the wasm memory.
        const disposable = created.filter((file) => file.startsWith(prefix));
        for (const file of disposable) await session.deleteFile(file);
        for (const file of disposable) created.splice(created.indexOf(file), 1);
      }

      let finalFile = normalised[0];

      if (needsTimelinePass) {
        onStage?.('Applying transitions…');
        const pass = buildTimelinePassArgs(
          prepared.map((entry, index) => ({
            file: normalised[index],
            duration: entry.duration,
            transition: entry.clip.transition ?? null
          })),
          { output: 'broll_timeline.mp4' }
        );

        await session.exec(pass.args, {
          expectedDuration: pass.totalDuration,
          onProgress: reportStepProgress(timelineDuration),
          errorMessage: 'Joining the B-Roll clips failed'
        });
        completedWork += timelineDuration;
        finalFile = 'broll_timeline.mp4';
        normalised.push(finalFile);
      }

      const bytes = await session.readFile(finalFile);
      if (bytes.length === 0) throw new Error('The B-Roll render produced an empty file.');

      onProgress?.(100);
      return new Blob([bytes], { type: 'video/mp4' });
    } finally {
      await cleanup();
      for (const file of normalised) await session.deleteFile(file);
    }
  }, signal);

  return {
    blob,
    duration: needsTimelinePass ? timelineDuration : prepared[0].duration,
    width: size.width,
    height: size.height,
    skipped,
    warnings
  };
};
