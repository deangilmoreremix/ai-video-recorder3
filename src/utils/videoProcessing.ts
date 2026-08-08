const SEEK_TIMEOUT_MS = 15000;

interface PreparedVideo {
  video: HTMLVideoElement;
  cleanup: () => void;
}

/** Creates a detached <video> for the file and guarantees the URL is revoked. */
const prepareVideo = (file: Blob): PreparedVideo => {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  let revoked = false;

  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.src = url;

  return {
    video,
    cleanup: () => {
      if (revoked) return;
      revoked = true;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    }
  };
};

const onceWithTimeout = (
  video: HTMLVideoElement,
  event: 'loadedmetadata' | 'seeked',
  timeoutMs = SEEK_TIMEOUT_MS
): Promise<void> =>
  new Promise((resolve, reject) => {
    const done = (error?: Error) => {
      window.clearTimeout(timer);
      video.removeEventListener(event, handleEvent);
      video.removeEventListener('error', handleError);
      if (error) reject(error);
      else resolve();
    };
    const handleEvent = () => done();
    const handleError = () => done(new Error(`Failed to load video (${event}).`));
    const timer = window.setTimeout(() => done(new Error(`Timed out waiting for "${event}".`)), timeoutMs);

    video.addEventListener(event, handleEvent, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });

/**
 * MediaRecorder files often report `Infinity` duration until they are fully
 * scanned; seeking far ahead forces the browser to resolve the real duration.
 */
const resolveDuration = async (video: HTMLVideoElement): Promise<number> => {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;

  try {
    video.currentTime = Number.MAX_SAFE_INTEGER;
    await onceWithTimeout(video, 'seeked', 3000);
  } catch {
    /* ignore - handled by the finite check below */
  }

  const duration = Number.isFinite(video.duration) ? video.duration : video.currentTime;
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const seekTo = async (video: HTMLVideoElement, time: number): Promise<void> => {
  const target = Math.max(0, Number.isFinite(time) ? time : 0);
  if (Math.abs(video.currentTime - target) < 0.001) return;
  video.currentTime = target;
  await onceWithTimeout(video, 'seeked');
};

export const generateThumbnail = async (file: Blob, atTime?: number): Promise<string> => {
  const { video, cleanup } = prepareVideo(file);

  try {
    await onceWithTimeout(video, 'loadedmetadata');

    const duration = await resolveDuration(video);
    // Seek to the requested time, or 1s / one third of the clip.
    const target = atTime !== undefined ? Math.min(atTime, Math.max(0, duration - 0.1)) : Math.min(1, duration / 3);
    await seekTo(video, target);

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) throw new Error('Video has no visual track');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Release the backing store as soon as possible (Safari keeps it alive).
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  } finally {
    cleanup();
  }
};

export const getVideoMetadata = async (
  file: Blob
): Promise<{
  duration: number;
  width: number;
  height: number;
}> => {
  const { video, cleanup } = prepareVideo(file);

  try {
    await onceWithTimeout(video, 'loadedmetadata');
    return {
      duration: await resolveDuration(video),
      width: video.videoWidth,
      height: video.videoHeight
    };
  } finally {
    cleanup();
  }
};

export const uploadToStorage = async (file: File, path: string): Promise<string> => {
  // In a real implementation, this would upload to a storage service; `path`
  // is kept so callers do not have to change once a backend is wired up.
  void path;
  // Callers own the returned URL and must revoke it when done.
  return URL.createObjectURL(file);
};

export const compressVideo = async (
  blob: Blob,
  options: {
    maxSize?: number;
    quality?: number;
    format?: string;
  } = {}
): Promise<Blob> => {
  // Placeholder: real compression is handled by the ffmpeg.wasm pipeline in
  // src/components/Export/VideoProcessing.ts.
  console.log('Video compression would happen here with options:', options);
  return blob;
};

// Simulate processing with a realistic progress callback
export const processWithProgress = async (
  callback: (progress: number) => void,
  durationMs = 2000,
  signal?: AbortSignal
): Promise<void> => {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', stop);
      resolve();
    };

    const updateProgress = () => {
      if (signal?.aborted) {
        stop();
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      callback(Math.round(progress));

      if (elapsed < durationMs) {
        frame = requestAnimationFrame(updateProgress);
      } else {
        stop();
      }
    };

    signal?.addEventListener('abort', stop, { once: true });
    updateProgress();
  });
};
