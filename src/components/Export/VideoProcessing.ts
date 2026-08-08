import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// The core is bundled with the app (no CDN round-trip, version locked to the
// installed @ffmpeg/core). Both URLs can be overridden at build time when the
// core is served from a CDN instead.
import bundledCoreURL from '@ffmpeg/core?url';
import bundledWasmURL from '@ffmpeg/core/wasm?url';

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkOptions {
  file: Blob;
  position: WatermarkPosition;
  /** 0-1 */
  opacity: number;
  /** Relative to the watermark's own size. */
  scale: number;
  offset: { x: number; y: number };
}

export interface ProcessingOptions {
  format: string;
  codec?: string;
  /** Omit to keep the source resolution. */
  resolution?: {
    width: number;
    height: number;
  };
  /** Omit to keep the source frame rate. */
  fps?: number;
  bitrate?: {
    video: number;
    audio: number;
  };
  /** 1-100, mapped to a codec specific CRF. */
  quality?: number;
  audioCodec?: string;
  audioChannels?: number;
  startTime?: number;
  endTime?: number;
  stabilize?: boolean;
  denoise?: boolean;
  enhanceColors?: boolean;
  /** x264/x265 speed preset. */
  preset?: string;
  /** x264 profile. */
  profile?: string;
  pixelFormat?: string;
  /** Moves the moov atom to the front for progressive playback (mp4/mov). */
  fastStart?: boolean;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string;
  };
  /** Raw extra ffmpeg arguments (already split); use with care. */
  extraArgs?: string[];
  /** Burns an image into the video. */
  watermark?: WatermarkOptions;
  /** Not supported by ffmpeg.wasm - kept for API compatibility. */
  useGpu?: boolean;
}

export interface GifOptions {
  fps: number;
  quality: number;
  width: number;
  dither: boolean;
  optimize: boolean;
  startTime: number;
  endTime: number;
  loop: boolean;
  /** Palette size, 2-256. Defaults to a value derived from `quality`. */
  colors?: number;
}

export type ProgressCallback = (progress: number) => void;

/** Thrown when the user cancels an in-flight export. */
export class ExportCancelledError extends Error {
  constructor(message = 'Export cancelled') {
    super(message);
    this.name = 'ExportCancelledError';
  }
}

/**
 * ffmpeg.wasm keeps the whole file in WASM memory (capped at ~2GB), so we
 * refuse oversized inputs up-front instead of crashing the tab.
 */
export const MAX_INPUT_BYTES = 1024 * 1024 * 1024; // 1 GiB

const env = import.meta.env as Record<string, string | undefined>;
const CORE_URL = env.VITE_FFMPEG_CORE_URL || bundledCoreURL;
const WASM_URL = env.VITE_FFMPEG_WASM_URL || bundledWasmURL;

/* -------------------------------------------------------------------------- */
/*  Error helpers                                                             */
/* -------------------------------------------------------------------------- */

/** ffmpeg.wasm rejects with plain strings, normalise everything to an Error. */
export const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown error');
};

export const isCancellation = (error: unknown): boolean => {
  if (error instanceof ExportCancelledError) return true;
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ExportCancelledError();
};

/* -------------------------------------------------------------------------- */
/*  Environment detection                                                     */
/* -------------------------------------------------------------------------- */

/** The bundled core is single threaded, so SharedArrayBuffer is optional. */
export const hasSharedArrayBuffer = (): boolean => typeof SharedArrayBuffer !== 'undefined';

export const isCrossOriginIsolated = (): boolean =>
  typeof globalThis !== 'undefined' && (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;

export const isFFmpegSupported = (): boolean =>
  typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof URL.createObjectURL === 'function';

/* -------------------------------------------------------------------------- */
/*  FFmpeg singleton                                                          */
/* -------------------------------------------------------------------------- */

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
/** ffmpeg.wasm has a single MEMFS, so jobs must not overlap. */
let jobQueue: Promise<unknown> = Promise.resolve();

/**
 * Loads (once) the ffmpeg core inside its web worker. Concurrent callers share
 * the same in-flight promise; a failed load is not cached so the user can retry.
 */
export const loadFFmpeg = async (signal?: AbortSignal): Promise<FFmpeg> => {
  throwIfAborted(signal);

  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  if (!isFFmpegSupported()) {
    throw new Error(
      'Video conversion is not available in this browser. It requires WebAssembly and Web Workers.'
    );
  }

  const instance = new FFmpeg();

  // The bundled core is single threaded: it runs with or without COOP/COEP.
  // Multi-threaded cores would additionally need cross-origin isolation, which
  // the dev/preview server enables through its COOP/COEP headers.
  if (!hasSharedArrayBuffer() || !isCrossOriginIsolated()) {
    console.info('[export] Using the single-threaded ffmpeg core (no cross-origin isolation detected).');
  }

  loadPromise = instance
    .load({ coreURL: CORE_URL, wasmURL: WASM_URL })
    .then(() => {
      ffmpegInstance = instance;
      return instance;
    })
    .catch((error: unknown) => {
      // Never cache a failed load, and make sure the worker is not leaked.
      loadPromise = null;
      ffmpegInstance = null;
      try {
        instance.terminate();
      } catch {
        /* worker may never have started */
      }
      throw new Error(
        `Could not start the video engine (${toError(error).message}). ` +
          'Please check your connection and reload the page.'
      );
    });

  return loadPromise;
};

/** Terminates the worker and frees its memory. Safe to call at any time. */
export const terminateFFmpeg = (): void => {
  const instance = ffmpegInstance;
  ffmpegInstance = null;
  loadPromise = null;
  if (!instance) return;
  try {
    instance.terminate();
  } catch {
    /* already gone */
  }
};

/** Serialises jobs: the core cannot run two commands at the same time. */
const runExclusive = <T,>(job: () => Promise<T>): Promise<T> => {
  const result = jobQueue.then(job, job);
  // Keep the chain alive even when a job fails.
  jobQueue = result.catch(() => undefined);
  return result;
};

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const removeFile = async (ffmpeg: FFmpeg, name: string) => {
  try {
    if (ffmpeg.loaded) await ffmpeg.deleteFile(name);
  } catch {
    /* file may not exist (e.g. failed run) */
  }
};

interface JobInput {
  name: string;
  blob: Blob;
}

interface JobConfig {
  inputs: JobInput[];
  outputName: string;
  args: string[];
  mimeType: string;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

const runJob = ({ inputs, outputName, args, mimeType, onProgress, signal }: JobConfig): Promise<Blob> =>
  runExclusive(async () => {
    throwIfAborted(signal);

    const totalBytes = inputs.reduce((sum, input) => sum + input.blob.size, 0);
    if (totalBytes === 0) throw new Error('The selected recording is empty.');
    if (totalBytes > MAX_INPUT_BYTES) {
      throw new Error(
        `This file is too large to convert in the browser (${Math.round(totalBytes / 1024 / 1024)} MB, ` +
          `limit ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} MB). Trim the recording and try again.`
      );
    }

    const ffmpeg = await loadFFmpeg(signal);
    throwIfAborted(signal);

    const handleProgress = ({ progress }: { progress: number }) => onProgress?.(clampProgress(progress * 100));
    // Aborting a running wasm command is only possible by killing the worker.
    const handleAbort = () => terminateFFmpeg();

    if (onProgress) ffmpeg.on('progress', handleProgress);
    signal?.addEventListener('abort', handleAbort, { once: true });

    try {
      for (const input of inputs) {
        await ffmpeg.writeFile(input.name, await fetchFile(input.blob));
        throwIfAborted(signal);
      }

      const exitCode = await ffmpeg.exec(args, -1, { signal });
      if (exitCode !== 0) {
        throw new Error(`Conversion failed (ffmpeg exit code ${exitCode}). Try different export settings.`);
      }

      const data = await ffmpeg.readFile(outputName);
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      if (bytes.length === 0) throw new Error('Conversion produced an empty file.');

      onProgress?.(100);
      return new Blob([bytes], { type: mimeType });
    } catch (error) {
      if (signal?.aborted) throw new ExportCancelledError();
      throw toError(error);
    } finally {
      signal?.removeEventListener('abort', handleAbort);
      if (onProgress) ffmpeg.off('progress', handleProgress);
      for (const input of inputs) {
        await removeFile(ffmpeg, input.name);
      }
      await removeFile(ffmpeg, outputName);
    }
  });

/* -------------------------------------------------------------------------- */
/*  Format / codec helpers                                                    */
/* -------------------------------------------------------------------------- */

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

export const getMimeType = (format: string): string =>
  MIME_TYPES[format.toLowerCase()] ?? 'application/octet-stream';

/** Best effort extension for a blob produced by MediaRecorder or ffmpeg. */
export const getExtensionForBlob = (blob: Blob, fallback = 'webm'): string => {
  const type = (blob.type || '').split(';')[0].toLowerCase();
  const match = Object.entries(MIME_TYPES).find(([, mime]) => mime === type);
  return match ? match[0] : fallback;
};

const VIDEO_ENCODERS: Record<string, string> = {
  h264: 'libx264',
  avc: 'libx264',
  libx264: 'libx264',
  h265: 'libx265',
  hevc: 'libx265',
  libx265: 'libx265',
  vp8: 'libvpx',
  libvpx: 'libvpx',
  vp9: 'libvpx-vp9',
  'libvpx-vp9': 'libvpx-vp9'
};

const AUDIO_ENCODERS: Record<string, string> = {
  aac: 'aac',
  mp3: 'libmp3lame',
  libmp3lame: 'libmp3lame',
  opus: 'libopus',
  libopus: 'libopus',
  vorbis: 'libvorbis',
  libvorbis: 'libvorbis'
};

/** Muxers only accept a subset of codecs - picking a wrong pair kills ffmpeg. */
const CONTAINERS: Record<string, { video: string[]; audio: string[] }> = {
  mp4: { video: ['libx264', 'libx265'], audio: ['aac', 'libmp3lame'] },
  mov: { video: ['libx264', 'libx265'], audio: ['aac'] },
  mkv: { video: ['libx264', 'libx265', 'libvpx', 'libvpx-vp9'], audio: ['aac', 'libmp3lame', 'libopus', 'libvorbis'] },
  webm: { video: ['libvpx-vp9', 'libvpx'], audio: ['libopus', 'libvorbis'] }
};

export const SUPPORTED_VIDEO_FORMATS = Object.keys(CONTAINERS);

export const isSupportedVideoFormat = (format: string): boolean =>
  SUPPORTED_VIDEO_FORMATS.includes(format.toLowerCase());

const resolveCodecs = (format: string, codec?: string, audioCodec?: string) => {
  const container = CONTAINERS[format] ?? CONTAINERS.mp4;
  const requestedVideo = VIDEO_ENCODERS[(codec ?? '').toLowerCase()] ?? '';
  const requestedAudio = AUDIO_ENCODERS[(audioCodec ?? '').toLowerCase()] ?? '';

  const video = container.video.includes(requestedVideo) ? requestedVideo : container.video[0];
  const audio = container.audio.includes(requestedAudio) ? requestedAudio : container.audio[0];

  if (requestedVideo && requestedVideo !== video) {
    console.warn(`[export] ${codec} cannot be stored in .${format}, using ${video} instead.`);
  }
  if (requestedAudio && requestedAudio !== audio) {
    console.warn(`[export] ${audioCodec} cannot be stored in .${format}, using ${audio} instead.`);
  }

  return { video, audio };
};

/** Encoders reject odd dimensions (yuv420p), so always round to even pixels. */
const toEvenDimension = (value: number | undefined, fallback: number): number => {
  const rounded = Math.round(Number.isFinite(value) && (value as number) > 0 ? (value as number) : fallback);
  const clamped = Math.min(7680, Math.max(16, rounded));
  return clamped % 2 === 0 ? clamped : clamped - 1;
};

const clampNumber = (value: number | undefined, min: number, max: number, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const X264_PRESETS = [
  'ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'
];
const PIXEL_FORMATS = ['yuv420p', 'yuv422p', 'yuv444p'];
const X264_PROFILES = ['baseline', 'main', 'high'];

/** Parses the "custom ffmpeg arguments" field without letting it break the run. */
export const parseExtraArgs = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 40);
};

// Flags that would redirect input/output and break the job.
const BLOCKED_EXTRA_ARGS = new Set(['-i', '-y', '-n', '-f']);const parseExtraArgsSafely = (extra?: string[]): string[] => {
  if (!extra || extra.length === 0) return [];

  const safe: string[] = [];
  for (let index = 0; index < extra.length; index += 1) {
    const token = extra[index];
    // Bare values (including output file names) are dropped on purpose.
    if (!token.startsWith('-')) continue;

    const value = extra[index + 1];
    const hasValue = value !== undefined && !value.startsWith('-');

    if (BLOCKED_EXTRA_ARGS.has(token)) {
      if (hasValue) index += 1;
      continue;
    }

    safe.push(token);
    if (hasValue) {
      safe.push(value);
      index += 1;
    }
  }

  return safe.slice(0, 40);
};

const overlayPosition = (position: WatermarkPosition, offsetX: number, offsetY: number): string => {
  switch (position) {
    case 'top-left':
      return `${offsetX}:${offsetY}`;
    case 'top-right':
      return `W-w-${offsetX}:${offsetY}`;
    case 'bottom-left':
      return `${offsetX}:H-h-${offsetY}`;
    case 'center':
      return '(W-w)/2:(H-h)/2';
    case 'bottom-right':
    default:
      return `W-w-${offsetX}:H-h-${offsetY}`;
  }
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const processVideo = async (
  blob: Blob,
  options: ProcessingOptions,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<Blob> => {
  const format = isSupportedVideoFormat(options.format) ? options.format.toLowerCase() : 'mp4';
  const { video: videoCodec, audio: audioCodec } = resolveCodecs(format, options.codec, options.audioCodec);

  const inputFileName = 'input.bin';
  const outputFileName = `output.${format}`;

  const quality = clampNumber(options.quality, 1, 100, 80);

  const args: string[] = ['-nostdin'];

  // Input seeking (before -i) is dramatically faster than output seeking.
  const startTime = options.startTime !== undefined ? Math.max(0, options.startTime) : undefined;
  if (startTime !== undefined && startTime > 0) args.push('-ss', startTime.toFixed(3));
  if (options.endTime !== undefined) {
    const duration = options.endTime - (startTime ?? 0);
    if (duration > 0) args.push('-t', duration.toFixed(3));
  }

  args.push('-i', inputFileName);

  const watermark = options.watermark?.file ? options.watermark : undefined;
  const watermarkFileName = watermark ? `watermark.${getExtensionForBlob(watermark.file, 'png')}` : '';
  if (watermark) args.push('-i', watermarkFileName);

  const filters: string[] = [];
  if (options.resolution) {
    const width = toEvenDimension(options.resolution.width, 1280);
    const height = toEvenDimension(options.resolution.height, 720);
    // Fit inside the target frame then pad, so presets never distort the video.
    filters.push(
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      'setsar=1'
    );
  }
  if (options.stabilize) filters.push('deshake=rx=32:ry=32');
  if (options.denoise) filters.push('hqdn3d=3:3:6:6');
  if (options.enhanceColors) filters.push('eq=contrast=1.1:brightness=0.05:saturation=1.2');

  if (watermark) {
    // Overlaying needs a filter graph, which cannot be combined with -vf.
    const base = filters.length > 0 ? filters.join(',') : 'null';
    const scale = clampNumber(watermark.scale, 0.05, 4, 1);
    const opacity = clampNumber(watermark.opacity, 0, 1, 1);
    const offsetX = Math.round(clampNumber(watermark.offset?.x, 0, 4096, 20));
    const offsetY = Math.round(clampNumber(watermark.offset?.y, 0, 4096, 20));

    args.push(
      '-filter_complex',
      `[0:v]${base}[base];` +
        `[1:v]scale=iw*${scale.toFixed(3)}:-1,format=rgba,colorchannelmixer=aa=${opacity.toFixed(3)}[wm];` +
        `[base][wm]overlay=${overlayPosition(watermark.position, offsetX, offsetY)}:format=auto[v]`,
      '-map',
      '[v]',
      // "?" keeps the command working for silent recordings.
      '-map',
      '0:a?'
    );
  } else if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  if (options.fps !== undefined) {
    args.push('-r', String(Math.round(clampNumber(options.fps, 1, 120, 30))));
  }
  args.push('-c:v', videoCodec);

  // Constant quality mode: CRF ranges differ per encoder.
  if (videoCodec === 'libvpx-vp9' || videoCodec === 'libvpx') {
    const crf = Math.round(63 - (quality / 100) * 53); // 63 (worst) .. 10 (best)
    args.push('-crf', String(crf), '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '5', '-row-mt', '1');
  } else {
    const crf = Math.round(51 - (quality / 100) * 33); // 51 (worst) .. 18 (best)
    const preset = options.preset && X264_PRESETS.includes(options.preset) ? options.preset : 'veryfast';
    const pixelFormat =
      options.pixelFormat && PIXEL_FORMATS.includes(options.pixelFormat) ? options.pixelFormat : 'yuv420p';
    args.push('-crf', String(crf), '-preset', preset, '-pix_fmt', pixelFormat);
    // -profile:v only exists for x264 and rejects 4:2:2/4:4:4 pixel formats.
    if (videoCodec === 'libx264' && options.profile && X264_PROFILES.includes(options.profile) && pixelFormat === 'yuv420p') {
      args.push('-profile:v', options.profile);
    }
  }

  const audioBitrate = Math.round(clampNumber(options.bitrate?.audio, 32, 512, 128));
  const channels = Math.round(clampNumber(options.audioChannels, 1, 2, 2));
  args.push('-c:a', audioCodec, '-b:a', `${audioBitrate}k`, '-ac', String(channels));

  if (options.metadata) {
    const { title, description, tags } = options.metadata;
    if (title) args.push('-metadata', `title=${title}`);
    if (description) args.push('-metadata', `description=${description}`);
    if (tags) args.push('-metadata', `keywords=${tags}`);
  }

  if ((format === 'mp4' || format === 'mov') && options.fastStart !== false) {
    args.push('-movflags', '+faststart');
  }

  args.push(...parseExtraArgsSafely(options.extraArgs));

  args.push(outputFileName);

  const inputs: JobInput[] = [{ name: inputFileName, blob }];
  if (watermark) inputs.push({ name: watermarkFileName, blob: watermark.file });

  return runJob({
    inputs,
    outputName: outputFileName,
    args,
    mimeType: getMimeType(format),
    onProgress,
    signal
  });
};

export const generateGif = async (
  blob: Blob,
  options: GifOptions,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<Blob> => {
  const inputFileName = 'input.bin';
  const outputFileName = 'output.gif';

  const fps = Math.round(clampNumber(options.fps, 1, 50, 12));
  const width = toEvenDimension(options.width, 480);
  const quality = clampNumber(options.quality, 1, 100, 80);
  // Palette size drives both quality and file size.
  const colors = Math.round(clampNumber(options.colors ?? 2 + (quality / 100) * 254, 2, 256, 256));

  const startTime = Math.max(0, Number.isFinite(options.startTime) ? options.startTime : 0);
  const rawDuration = options.endTime - startTime;
  const duration = clampNumber(rawDuration, 0.1, 60, 3);

  const args: string[] = ['-nostdin'];
  if (startTime > 0) args.push('-ss', startTime.toFixed(3));
  args.push('-t', duration.toFixed(3), '-i', inputFileName);

  // Single pass palettegen/paletteuse - `paletteuse` alone crashes ffmpeg.
  const dither = options.dither ? 'dither=floyd_steinberg' : 'dither=none';
  const statsMode = options.optimize ? 'stats_mode=diff' : 'stats_mode=full';
  args.push(
    '-vf',
    `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];` +
      `[s0]palettegen=max_colors=${colors}:${statsMode}[p];[s1][p]paletteuse=${dither}`,
    '-loop',
    options.loop ? '0' : '-1',
    '-an'
  );
  if (options.optimize) args.push('-gifflags', '+transdiff');
  args.push(outputFileName);

  return runJob({
    inputs: [{ name: inputFileName, blob }],
    outputName: outputFileName,
    args,
    mimeType: 'image/gif',
    onProgress,
    signal
  });
};

/* -------------------------------------------------------------------------- */
/*  Download helpers                                                          */
/* -------------------------------------------------------------------------- */

export const sanitizeFileName = (name: string, fallback = 'export'): string => {
  const cleaned = name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
};

export const buildFileName = (base: string, format: string): string =>
  `${sanitizeFileName(base)}.${format.toLowerCase().replace(/^\./, '')}`;

/**
 * Triggers a download and releases the object URL afterwards. Revoking
 * synchronously can abort the download in some browsers, hence the delay.
 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
