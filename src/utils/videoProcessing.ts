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
