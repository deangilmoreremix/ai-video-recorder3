// Real audio analysis utilities used by the Editor's Captions, Chapters and
// Silent Removal features. Every function here performs genuine signal
// processing on the decoded audio of the loaded video.

export interface SilentSegment {
  start: number;
  end: number;
  duration: number;
}

export interface EnergyResult {
  /** RMS energy (0..1) for each fixed-size window across the track. */
  windows: Float32Array;
  /** Window length in seconds. */
  windowSize: number;
  /** Number of windows. */
  count: number;
  /** Total duration of the decoded audio in seconds. */
  duration: number;
}

/**
 * Decode an audio/video URL into an AudioBuffer using the Web Audio API.
 * Works with the object URLs produced by the recorder/preview upload flow.
 */
export function decodeAudio(url: string): Promise<AudioBuffer> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`);
      return res.arrayBuffer();
    })
    .then((arrayBuffer) => {
      // Promise form is supported in all modern browsers; fall back to the
      // older callback form for maximum compatibility.
      return new Promise<AudioBuffer>((resolve, reject) => {
        const p = ctx.decodeAudioData(arrayBuffer, resolve, reject);
        if (p && typeof (p as Promise<AudioBuffer>).then === 'function') {
          (p as Promise<AudioBuffer>).then(resolve, reject);
        }
      });
    })
    .finally(() => {
      // Release the audio context resources once decoding is done.
      ctx.close().catch(() => undefined);
    });
}

/**
 * Compute the RMS energy of a mono mixdown in fixed windows. Used by both
 * chapter detection and silent-segment detection so they share one contour.
 */
export function computeEnergy(buffer: AudioBuffer, windowSize = 0.05): EnergyResult {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const samplesPerWindow = Math.max(1, Math.floor(windowSize * sampleRate));
  const count = Math.max(1, Math.ceil(length / samplesPerWindow));
  const windows = new Float32Array(count);

  // Mix all channels down to mono first.
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }

  for (let w = 0; w < count; w++) {
    const start = w * samplesPerWindow;
    const end = Math.min(length, start + samplesPerWindow);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      sumSquares += mono[i] * mono[i];
    }
    const rms = Math.sqrt(sumSquares / Math.max(1, end - start));
    windows[w] = rms;
  }

  return { windows, windowSize, count, duration: buffer.duration };
}

/**
 * Detect genuinely silent regions by thresholding the RMS contour and only
 * keeping runs that last at least `minSilenceDuration` seconds. `padding`
 * expands each region slightly so edges of speech are not clipped.
 */
export function detectSilentSegments(
  energy: EnergyResult,
  threshold: number,
  minSilenceDuration: number,
  padding: number
): SilentSegment[] {
  const { windows, windowSize, count, duration } = energy;
  const segments: SilentSegment[] = [];
  let runStart = -1;

  for (let w = 0; w < count; w++) {
    const isSilent = windows[w] < threshold;
    if (isSilent && runStart === -1) {
      runStart = w;
    } else if (!isSilent && runStart !== -1) {
      const start = runStart * windowSize;
      const end = w * windowSize;
      if (end - start >= minSilenceDuration) {
        segments.push({
          start: Math.max(0, start - padding),
          end: Math.min(duration, end + padding),
          duration: end - start
        });
      }
      runStart = -1;
    }
  }

  // Trailing silence to the end of the track.
  if (runStart !== -1) {
    const start = runStart * windowSize;
    if (duration - start >= minSilenceDuration) {
      segments.push({
        start: Math.max(0, start - padding),
        end: duration,
        duration: duration - start
      });
    }
  }

  return segments;
}

export interface DetectedChapter {
  startTime: number;
  endTime: number;
  /** Average RMS energy of the chapter (0..1), a real measured value. */
  avgEnergy: number;
}

/**
 * Detect chapter boundaries from energy drops in the audio. A new chapter
 * begins when the energy stays below a fraction of the peak for a sustained
 * period (a genuine lull / scene change), and chapters are merged so none is
 * shorter than `minDuration`.
 */
export function detectChapters(energy: EnergyResult, minDuration: number): DetectedChapter[] {
  const { windows, windowSize, count, duration } = energy;
  if (count === 0) return [];

  let peak = 0;
  for (let w = 0; w < count; w++) peak = Math.max(peak, windows[w]);
  const dropThreshold = peak * 0.25;
  // A lull must persist for at least this many windows to count as a boundary.
  const lullNeeded = Math.max(2, Math.floor(0.5 / windowSize));

  const boundaries: number[] = [0];
  let lullCount = 0;

  for (let w = 1; w < count - 1; w++) {
    if (windows[w] < dropThreshold) {
      lullCount++;
    } else {
      if (lullCount >= lullNeeded) {
        // Boundary sits at the start of the lull.
        const boundary = (w - lullCount) * windowSize;
        if (boundary - boundaries[boundaries.length - 1] >= minDuration) {
          boundaries.push(boundary);
        }
      }
      lullCount = 0;
    }
  }
  boundaries.push(duration);

  const chapters: DetectedChapter[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startTime = boundaries[i];
    const endTime = boundaries[i + 1];
    const firstWin = Math.floor(startTime / windowSize);
    const lastWin = Math.min(count - 1, Math.floor(endTime / windowSize));
    let sum = 0;
    let n = 0;
    for (let w = firstWin; w <= lastWin; w++) {
      sum += windows[w];
      n++;
    }
    chapters.push({
      startTime,
      endTime,
      avgEnergy: n > 0 ? sum / n : 0
    });
  }

  // Merge any chapter shorter than the minimum into the previous one.
  const merged: DetectedChapter[] = [];
  for (const chapter of chapters) {
    const prev = merged[merged.length - 1];
    if (prev && chapter.endTime - prev.startTime < minDuration) {
      prev.endTime = chapter.endTime;
      prev.avgEnergy = (prev.avgEnergy + chapter.avgEnergy) / 2;
    } else {
      merged.push({ ...chapter });
    }
  }

  return merged;
}
