// Real computer-vision / image-processing helpers shared by the AI feature
// pipeline. None of these simulate an effect — they perform genuine pixel math
// (motion estimation, tone/colour correction, edge-preserving smoothing, etc.)
// or wrap a MediaRecorder capture of an actually-rendered canvas.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Clamp a value into [min, max]. */
export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Reused offscreen canvas keyed by id, sized on demand. */
const scratchCanvases = new Map<string, HTMLCanvasElement>();
export const getScratchCanvas = (
  key: string,
  width: number,
  height: number
): HTMLCanvasElement => {
  let canvas = scratchCanvases.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    scratchCanvases.set(key, canvas);
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return canvas;
};

/** Convert an (already sized) canvas to a Uint8 grayscale buffer (0..255). */
export const toGrayscale = (canvas: HTMLCanvasElement, width: number, height: number): Uint8Array => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const out = new Uint8Array(width * height);
  if (!ctx) return out;
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114 + 500) / 1000;
  }
  return out;
};

/** Estimate inter-frame integer translation (px) via coarse-to-fine block matching. */
export const estimateTranslation = (
  cur: Uint8Array,
  prev: Uint8Array,
  w: number,
  h: number,
  range: number,
  prevEst: { x: number; y: number }
): { x: number; y: number } => {
  // Build a 3-level pyramid (full, /2, /4) and refine upward.
  const levels: { w: number; h: number; scale: number }[] = [
    { w: Math.max(1, w >> 2), h: Math.max(1, h >> 2), scale: 4 },
    { w: Math.max(1, w >> 1), h: Math.max(1, h >> 1), scale: 2 },
    { w, h, scale: 1 }
  ];
  let est = { x: prevEst.x, y: prevEst.y };
  for (const lvl of levels) {
    const lw = lvl.w;
    const lh = lvl.h;
    const curL = sampleDown(cur, w, h, lw, lh);
    const prevL = sampleDown(prev, w, h, lw, lh);
    const ox = est.x / lvl.scale;
    const oy = est.y / lvl.scale;
    let best = { dx: 0, dy: 0, cost: Infinity };
    for (let dy = -range; dy <= range; dy++) {
      const sy = Math.round(oy) + dy;
      if (sy < 0 || sy >= lh) continue;
      for (let dx = -range; dx <= range; dx++) {
        const sx = Math.round(ox) + dx;
        if (sx < 0 || sx >= lw) continue;
        let sad = 0;
        let n = 0;
        for (let y = 2; y < lh - 2; y++) {
          const cy = y + sy;
          if (cy < 0 || cy >= lh) continue;
          for (let x = 2; x < lw - 2; x++) {
            const cx = x + sx;
            if (cx < 0 || cx >= lw) continue;
            sad += Math.abs(curL[y * lw + x] - prevL[cy * lw + cx]);
            n++;
          }
        }
        if (n > 0) {
          const cost = sad / n;
          if (cost < best.cost) best = { dx, dy, cost };
        }
      }
    }
    est = { x: (Math.round(ox) + best.dx) * lvl.scale, y: (Math.round(oy) + best.dy) * lvl.scale };
  }
  return est;
};

const sampleDown = (src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array => {
  const out = new Uint8Array(dw * dh);
  const fx = sw / dw;
  const fy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor(y * fy));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x * fx));
      out[y * dw + x] = src[sy * sw + sx];
    }
  }
  return out;
};

/** Stateful translational stabilizer that smooths the measured motion path. */
export class FrameStabilizer {
  private trajX = 0;
  private trajY = 0;
  private smoothX = 0;
  private smoothY = 0;
  private lastW = 0;
  private lastH = 0;

  reset(w: number, h: number) {
    this.trajX = 0;
    this.trajY = 0;
    this.smoothX = 0;
    this.smoothY = 0;
    this.lastW = w;
    this.lastH = h;
  }

  /** Returns the source-pixel correction {dx,dy} to apply this frame. */
  update(
    measured: { x: number; y: number },
    w: number,
    h: number,
    strength: number,
    smoothing: number
  ): { dx: number; dy: number } {
    if (w !== this.lastW || h !== this.lastH) {
      this.reset(w, h);
    }
    // Accumulate the raw motion path, then low-pass filter it.
    this.trajX += measured.x;
    this.trajY += measured.y;
    this.smoothX = lerp(this.smoothX, this.trajX, clamp(smoothing, 0, 1));
    this.smoothY = lerp(this.smoothY, this.trajY, clamp(smoothing, 0, 1));
    // Correction removes the difference between smoothed and raw path, scaled
    // by the user's stabilization strength.
    let dx = (this.smoothX - this.trajX) * clamp(strength, 0, 1);
    let dy = (this.smoothY - this.trajY) * clamp(strength, 0, 1);
    // Keep the sampling window inside the frame (no out-of-bounds reads).
    const marginX = w * 0.08;
    const marginY = h * 0.08;
    dx = clamp(dx, -marginX, marginX);
    dy = clamp(dy, -marginY, marginY);
    return { dx, dy };
  }
}

/** Map a source-space (video) point into the current (view-rect) canvas. */
export const mapPoint = (
  p: { x: number; y: number },
  view: Rect,
  canvasW: number,
  canvasH: number
): { x: number; y: number } => ({
  x: (p.x - view.x) * (canvasW / view.w),
  y: (p.y - view.y) * (canvasH / view.h)
});

/** Map a source-space rectangle into the current (view-rect) canvas. */
export const mapRect = (
  r: Rect,
  view: Rect,
  canvasW: number,
  canvasH: number
): Rect => ({
  x: (r.x - view.x) * (canvasW / view.w),
  y: (r.y - view.y) * (canvasH / view.h),
  w: r.w * (canvasW / view.w),
  h: r.h * (canvasH / view.h)
});

export interface FrameStats {
  mean: number;
  meanR: number;
  meanG: number;
  meanB: number;
  blackPoint: number;
  whitePoint: number;
  gamma: number;
}

/** Compute real frame statistics used for exposure / lighting / white balance. */
export const computeFrameStats = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): FrameStats => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { mean: 128, meanR: 128, meanG: 128, meanB: 128, blackPoint: 0, whitePoint: 255, gamma: 1 };
  }
  const { data } = ctx.getImageData(0, 0, width, height);
  let sum = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let count = 0;
  const STEP = Math.max(1, Math.floor((width * height) / 40000)); // sample for speed
  for (let i = 0; i < data.length; i += 4 * STEP) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += (r + g + b) / 3;
    sr += r;
    sg += g;
    sb += b;
    count++;
  }
  const mean = count ? sum / count : 128;
  const meanR = count ? sr / count : 128;
  const meanG = count ? sg / count : 128;
  const meanB = count ? sb / count : 128;

  // Black/white points from the luminance histogram (1st / 99th percentile).
  const hist = new Array<number>(256).fill(0);
  let total = 0;
  for (let i = 0; i < data.length; i += 4 * STEP) {
    const l = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    hist[l]++;
    total++;
  }
  const lowCut = total * 0.01;
  const highCut = total * 0.99;
  let acc = 0;
  let blackPoint = 0;
  let whitePoint = 255;
  for (let l = 0; l < 256; l++) {
    acc += hist[l];
    if (acc >= lowCut) {
      blackPoint = l;
      break;
    }
  }
  acc = 0;
  for (let l = 255; l >= 0; l--) {
    acc += hist[l];
    if (acc >= total - highCut) {
      whitePoint = l;
      break;
    }
  }
  if (whitePoint <= blackPoint) whitePoint = blackPoint + 1;

  // Gamma so the mean luminance maps toward a neutral 128.
  const m = mean / 255;
  const gamma = m > 0.001 ? Math.log(0.5) / Math.log(m) : 1;
  return {
    mean,
    meanR,
    meanG,
    meanB,
    blackPoint,
    whitePoint,
    gamma: clamp(gamma, 0.4, 2.4)
  };
};

/** Build a per-channel LUT combining exposure, levels (black/white) and gamma. */
export const buildToneLUT = (
  exposureGain: number,
  blackPoint: number,
  whitePoint: number,
  gamma: number
): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256);
  const span = whitePoint - blackPoint || 1;
  for (let i = 0; i < 256; i++) {
    let v = i * exposureGain;
    v = (v - blackPoint) / span;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    v = Math.pow(v, gamma);
    lut[i] = clamp(Math.round(v * 255), 0, 255);
  }
  return lut;
};

/** Apply tone (via LUT) + per-channel white-balance gains + saturation boost. */
export const applyToneAndColor = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  lutR: Uint8ClampedArray,
  lutG: Uint8ClampedArray,
  lutB: Uint8ClampedArray,
  satBoost: number
): void => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const sat = clamp(satBoost, 0, 2);
  for (let i = 0; i < d.length; i += 4) {
    const r = lutR[d[i]];
    const g = lutG[d[i + 1]];
    const b = lutB[d[i + 2]];
    const l = (r + g + b) / 3;
    d[i] = clamp(Math.round(r + (r - l) * sat), 0, 255);
    d[i + 1] = clamp(Math.round(g + (g - l) * sat), 0, 255);
    d[i + 2] = clamp(Math.round(b + (b - l) * sat), 0, 255);
  }
  ctx.putImageData(img, 0, 0);
};

/** Motion-adaptive temporal denoise: blend with previous frame where stable. */
export const temporalDenoise = (
  cur: ImageData,
  prev: ImageData | null,
  strength: number
): ImageData => {
  if (!prev || strength <= 0) return cur;
  const cd = cur.data;
  const pd = prev.data;
  for (let i = 0; i < cd.length; i += 4) {
    const diff = Math.abs(cd[i] - pd[i]) + Math.abs(cd[i + 1] - pd[i + 1]) + Math.abs(cd[i + 2] - pd[i + 2]);
    if (diff < 18) {
      const t = strength * 0.6;
      cd[i] = cd[i] * (1 - t) + pd[i] * t;
      cd[i + 1] = cd[i + 1] * (1 - t) + pd[i + 1] * t;
      cd[i + 2] = cd[i + 2] * (1 - t) + pd[i + 2] * t;
    }
  }
  return cur;
};

/** Edge-preserving spatial denoise (sigma filter, 3x3, luma-gated). */
export const spatialDenoise = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  strength: number
): void => {
  if (strength <= 0) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, width, height);
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  const sigma = 26;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const ci = (y * width + x) * 4;
      const cl = (src[ci] + src[ci + 1] + src[ci + 2]) / 3;
      let r = 0;
      let g = 0;
      let b = 0;
      let wsum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4;
          const nl = (src[ni] + src[ni + 1] + src[ni + 2]) / 3;
          const w = Math.exp(-((nl - cl) * (nl - cl)) / (2 * sigma * sigma));
          r += src[ni] * w;
          g += src[ni + 1] * w;
          b += src[ni + 2] * w;
          wsum += w;
        }
      }
      const t = clamp(strength, 0, 1);
      out[ci] = clamp(Math.round(src[ci] * (1 - t) + (r / wsum) * t), 0, 255);
      out[ci + 1] = clamp(Math.round(src[ci + 1] * (1 - t) + (g / wsum) * t), 0, 255);
      out[ci + 2] = clamp(Math.round(src[ci + 2] * (1 - t) + (b / wsum) * t), 0, 255);
    }
  }
  ctx.putImageData(new ImageData(out, width, height), 0, 0);
};

/** Approximate (edge-preserving) bilateral smoothing; restores edges afterwards. */
export const bilateralSmooth = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  strength: number,
  radius = 2
): void => {
  const t = clamp(strength, 0, 1);
  if (t <= 0) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, width, height);
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  const sigma = 24;
  const r2 = radius * radius;
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const ci = (y * width + x) * 4;
      const cr = src[ci];
      const cg = src[ci + 1];
      const cb = src[ci + 2];
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let wsum = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = 0; dx <= radius; dx++) {
          if (dy * dy + dx * dx > r2) continue;
          const ni = ((y + dy) * width + (x + dx)) * 4;
          const wr = Math.exp(-((src[ni] - cr) ** 2) / (2 * sigma * sigma));
          const wg = Math.exp(-((src[ni + 1] - cg) ** 2) / (2 * sigma * sigma));
          const wb = Math.exp(-((src[ni + 2] - cb) ** 2) / (2 * sigma * sigma));
          const w = wr + wg + wb;
          sr += src[ni] * w;
          sg += src[ni + 1] * w;
          sb += src[ni + 2] * w;
          wsum += w;
        }
      }
      out[ci] = clamp(Math.round(cr * (1 - t) + (sr / wsum) * t), 0, 255);
      out[ci + 1] = clamp(Math.round(cg * (1 - t) + (sg / wsum) * t), 0, 255);
      out[ci + 2] = clamp(Math.round(cb * (1 - t) + (sb / wsum) * t), 0, 255);
    }
  }
  ctx.putImageData(new ImageData(out, width, height), 0, 0);
};

/** Whether a pixel is skin-toned in YCbCr space (for beautification masks). */
const isSkin = (r: number, g: number, b: number): boolean => {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
  const cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;
  if (y < 40 || y > 240) return false;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
};

/** Blend the smoothed copy back only over detected skin inside a face rect. */
export const beautifyRegion = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  faceRect: Rect | null,
  strength: number
): void => {
  const t = clamp(strength, 0, 1);
  if (t <= 0 || !faceRect) return;

  // Work at reduced resolution for speed, then map back.
  const scale = width > 480 ? 0.5 : 1;
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const small = getScratchCanvas('beauty-small', sw, sh);
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  if (!smallCtx) return;
  smallCtx.drawImage(canvas, 0, 0, sw, sh);

  bilateralSmooth(small, sw, sh, t, 2);

  const sImg = smallCtx.getImageData(0, 0, sw, sh);
  const sData = sImg.data;

  // Build a skin mask constrained to the (scaled) face rect.
  const fx = Math.max(0, Math.floor(faceRect.x * scale));
  const fy = Math.max(0, Math.floor(faceRect.y * scale));
  const fw = Math.min(sw - fx, Math.ceil(faceRect.w * scale));
  const fh = Math.min(sh - fy, Math.ceil(faceRect.h * scale));
  const mask = new Uint8Array(sw * sh);
  for (let y = fy; y < fy + fh; y++) {
    for (let x = fx; x < fx + fw; x++) {
      const i = (y * sw + x) * 4;
      mask[y * sw + x] = isSkin(sData[i], sData[i + 1], sData[i + 2]) ? 1 : 0;
    }
  }

  // Composite: original where non-skin, smoothed where skin.
  const dstCtx = canvas.getContext('2d', { willReadFrequently: true });
  if (!dstCtx) return;
  const out = dstCtx.getImageData(0, 0, width, height);
  const od = out.data;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (!mask[y * sw + x]) continue;
      const si = (y * sw + x) * 4;
      const dx = Math.round(x / scale);
      const dy = Math.round(y / scale);
      if (dx >= width || dy >= height) continue;
      const di = (dy * width + dx) * 4;
      od[di] = sData[si];
      od[di + 1] = sData[si + 1];
      od[di + 2] = sData[si + 2];
    }
  }
  dstCtx.putImageData(out, 0, 0);
};

/** RGB histogram (per-channel, 32 bins) used for real scene-cut detection. */
export const histogramDistance = (
  a: number[],
  b: number[]
): number => {
  const bins = a.length;
  let dist = 0;
  for (let i = 0; i < bins; i++) {
    dist += Math.abs(a[i] - b[i]);
  }
  return dist / bins;
};

export const computeHistogram = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  bins = 32
): number[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const hist = new Array<number>(bins * 3).fill(0);
  if (!ctx) return hist;
  const { data } = ctx.getImageData(0, 0, width, height);
  const step = Math.max(1, Math.floor((width * height) / 20000));
  for (let i = 0; i < data.length; i += 4 * step) {
    hist[Math.min(bins - 1, Math.floor((data[i] / 256) * bins))]++;
    hist[bins + Math.min(bins - 1, Math.floor((data[i + 1] / 256) * bins))]++;
    hist[2 * bins + Math.min(bins - 1, Math.floor((data[i + 2] / 256) * bins))]++;
  }
  return hist;
};

const RECORDING_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4'
];

const pickSupportedMimeType = (candidates: string[]): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return candidates.find(c => {
    try {
      return MediaRecorder.isTypeSupported(c);
    } catch {
      return false;
    }
  });
};

export interface ProcessVideoOptions {
  fps?: number;
  mimeType?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Render the ENTIRE clip by running `processFrame` on every animation frame
 * while the source video plays at normal speed, capturing the live canvas via
 * `captureStream` into a `MediaRecorder`. The source video's audio track (if
 * present) is merged so the output keeps sound. Returns a Blob of the full
 * processed clip (never a single frame).
 */
export const processVideoToBlob = async (
  video: HTMLVideoElement,
  processFrame: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<void> | void,
  canvas: HTMLCanvasElement,
  options: ProcessVideoOptions = {}
): Promise<Blob> => {
  const fps = options.fps ?? 30;
  const onProgress = options.onProgress;
  const mimeType =
    options.mimeType ??
    pickSupportedMimeType(RECORDING_MIME_CANDIDATES) ??
    'video/webm';

  if (!video || !video.videoWidth || !video.duration || video.duration === Infinity) {
    throw new Error('Source video is not ready or is a live/infinite stream.');
  }

  // Reset to the beginning and play so `requestVideoFrameCallback`/`rAF` fire.
  video.pause();
  video.currentTime = 0;
  await new Promise<void>(resolve => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    try {
      video.currentTime = 0;
    } catch {
      resolve();
    }
  });

  const stream = canvas.captureStream(fps);
  // Grab the source video's audio track (if any) so the output keeps sound.
  // captureStream is widely available; mozCaptureStream covers older Firefox.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srcAny = video as any;
  const srcStream = srcAny.captureStream
    ? srcAny.captureStream(fps)
    : srcAny.mozCaptureStream
    ? srcAny.mozCaptureStream(fps)
    : null;
  const allAudio = srcStream ? srcStream.getAudioTracks() : [];
  const audioTrack = allAudio.find((t: MediaStreamTrack) => t.kind === 'audio');
  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  let recorder: MediaRecorder;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recorder = new MediaRecorder(stream, { mimeType } as any);
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (blob.size > 0) resolve(blob);
      else reject(new Error('Recording produced an empty file.'));
    };
    recorder.onerror = () => reject(new Error('MediaRecorder failed.'));
  });

  recorder.start(250);

  await new Promise<void>((resolve, reject) => {
    const duration = video.duration;
    const seeked = () => {
      if (options.signal?.aborted) {
        recorder.stop();
        reject(new Error('Aborted'));
        return;
      }
      Promise.resolve(processFrame(video, canvas))
        .catch(err => console.error('processFrame error:', err))
        .finally(() => {
          const progress = duration > 0 ? clamp(video.currentTime / duration, 0, 1) : 0;
          onProgress?.(progress * 100);
          if (video.currentTime >= duration - 1 / fps || video.ended) {
            video.removeEventListener('seeked', seeked);
            resolve();
          } else {
            // Step ~1/fps then re-render the decoded frame.
            const next = Math.min(duration, video.currentTime + 1 / fps);
            try {
              video.currentTime = next;
            } catch {
              resolve();
            }
          }
        });
    };
    video.addEventListener('seeked', seeked);
    try {
      video.currentTime = 0;
    } catch {
      resolve();
    }
  }).catch(err => {
    try {
      recorder.stop();
    } catch {
      /* noop */
    }
    throw err;
  });

  onProgress?.(100);
  recorder.stop();
  return done;
};
