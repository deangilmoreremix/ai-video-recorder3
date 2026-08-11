import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordingOptions {
  mode: 'webcam' | 'screen' | 'pip';
  countdown?: number;
  maxDuration?: number;
  aiFeatures?: Record<string, boolean>;
  /** Linear microphone gain applied while recording (1 = unchanged, 0 = silent). */
  micVolume?: number;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  videoStream: MediaStream | null;
  recordedChunks: Blob[];
  startRecording: (options?: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  /** Moves/resizes the webcam inset of a PiP take (live, while recording). */
  setPipInset: (inset: PipInset) => void;
  error: Error | null;
}

/**
 * Ordered list of container/codec combinations we try to record with.
 * `video/webm;codecs=vp9` is NOT available everywhere (Safari, some mobile
 * browsers), so we always probe before handing a mimeType to MediaRecorder.
 */
export const RECORDING_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=h264,aac',
  'video/mp4'
];

/**
 * mp4 recording is only available on some browsers (Safari, recent Chrome),
 * so these are tried first when the user asks for mp4 and we still fall back
 * to the webm list (vp9 → vp8 → webm) when none of them are supported.
 */
export const MP4_MIME_CANDIDATES = [
  'video/mp4;codecs=h264,aac',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4'
];

/** Candidate list for a user selected container format. */
export const getMimeCandidates = (format: 'webm' | 'mp4' = 'webm'): string[] =>
  format === 'mp4' ? [...MP4_MIME_CANDIDATES, ...RECORDING_MIME_CANDIDATES] : RECORDING_MIME_CANDIDATES;

/**
 * Returns the first mimeType supported by this browser, or `undefined` when
 * none of the candidates are supported (the browser default is then used).
 */
export const pickSupportedMimeType = (
  candidates: string[] = RECORDING_MIME_CANDIDATES
): string | undefined => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  return candidates.find(type => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
};

/**
 * Creates a MediaRecorder using a supported mimeType, falling back to the
 * browser default when the negotiated options are rejected. `candidates` lets
 * the caller express a container preference (e.g. mp4 over webm).
 */
export const createMediaRecorder = (
  stream: MediaStream,
  options: Omit<MediaRecorderOptions, 'mimeType'> = {},
  candidates: string[] = RECORDING_MIME_CANDIDATES
): MediaRecorder => {
  const mimeType = pickSupportedMimeType(candidates);

  try {
    return new MediaRecorder(stream, mimeType ? { ...options, mimeType } : options);
  } catch {
    // Bitrate hints or the chosen codec can still be rejected – never fail hard.
    return new MediaRecorder(stream);
  }
};

/**
 * Recording needs a secure context (https or localhost) plus MediaRecorder /
 * mediaDevices support. Returns a user facing message, or `null` when ready.
 */
export const getMediaSupportError = (): string | null => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Recording is only available in a browser.';
  }
  if (!window.isSecureContext) {
    return 'Recording requires a secure connection (https) or localhost.';
  }
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return 'This browser does not support camera or microphone capture.';
  }
  if (typeof MediaRecorder === 'undefined') {
    return 'This browser does not support video recording (MediaRecorder).';
  }
  return null;
};

/** Maps getUserMedia / getDisplayMedia failures to user friendly messages. */
export const getMediaErrorMessage = (err: unknown): string => {
  const name =
    typeof err === 'object' && err !== null && 'name' in err
      ? String((err as { name: unknown }).name)
      : '';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permission denied. Allow camera, microphone and screen access in your browser, then try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone was found. Connect a device and try again.';
    case 'OverconstrainedError':
      return 'The selected camera or microphone does not support the requested settings.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera or microphone is already in use by another application.';
    case 'AbortError':
      return 'Recording was cancelled before it started.';
    default:
      return err instanceof Error && err.message
        ? err.message
        : 'Something went wrong while accessing your media devices.';
  }
};

export interface MixedAudio {
  track: MediaStreamTrack;
  /**
   * Rescales the microphone while the take is running (linear, 1 = unchanged).
   * No-op when the graph carries no microphone source.
   */
  setMicVolume: (volume: number) => void;
  close: () => void;
}

export interface AudioMixOptions {
  /**
   * The microphone tracks inside `tracks`. Only these are routed through a
   * GainNode, so system/screen audio keeps its original level.
   */
  micTracks?: MediaStreamTrack[];
  /** Linear microphone gain (1 = unchanged, 0 = silent). */
  micVolume?: number;
}

/** Keeps the slider value inside a sane range for a linear gain. */
const clampMicVolume = (volume: number): number =>
  Number.isFinite(volume) ? Math.min(4, Math.max(0, volume)) : 1;

/**
 * MediaRecorder only records the first audio track of a stream, so screen +
 * microphone audio must be mixed down to a single track. The microphone is
 * routed through a GainNode so the mic volume slider actually changes the
 * recorded level – which is also why a *single* microphone still goes through
 * the graph whenever its gain is not 1.
 *
 * Returns `null` when no processing is required at all (fewer than two tracks
 * and an unchanged microphone level) or when Web Audio is unavailable, so
 * callers can record the raw track untouched.
 */
export const mixAudioTracks = (
  tracks: MediaStreamTrack[],
  options: AudioMixOptions = {}
): MixedAudio | null => {
  const liveTracks = tracks.filter(track => track.kind === 'audio' && track.readyState === 'live');
  if (liveTracks.length === 0) return null;

  const micVolume = clampMicVolume(options.micVolume ?? 1);
  const micTracks = new Set(
    (options.micTracks ?? []).filter(track => track.kind === 'audio' && track.readyState === 'live')
  );
  // A lone microphone only needs the graph when its level has to change.
  const needsGain = micVolume !== 1 && liveTracks.some(track => micTracks.has(track));
  if (liveTracks.length < 2 && !needsGain) return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  let context: AudioContext | null = null;
  try {
    context = new AudioContextCtor();
    const destination = context.createMediaStreamDestination();
    const micGains: GainNode[] = [];

    liveTracks.forEach(track => {
      const source = context!.createMediaStreamSource(new MediaStream([track]));
      if (micTracks.has(track)) {
        const gain = context!.createGain();
        gain.gain.value = micVolume;
        source.connect(gain);
        gain.connect(destination);
        micGains.push(gain);
      } else {
        source.connect(destination);
      }
    });

    const [mixedTrack] = destination.stream.getAudioTracks();
    if (!mixedTrack) {
      context.close().catch(() => undefined);
      return null;
    }

    const audioContext = context;
    // Autoplay policies can hand back a suspended context, which would record
    // pure silence – resume it before the take starts.
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => undefined);
    }

    return {
      track: mixedTrack,
      setMicVolume: (volume: number) => {
        const next = clampMicVolume(volume);
        micGains.forEach(gain => {
          try {
            // Ramp slightly to avoid a click when the slider is dragged.
            gain.gain.setTargetAtTime(next, audioContext.currentTime, 0.01);
          } catch {
            gain.gain.value = next;
          }
        });
      },
      close: () => {
        mixedTrack.stop();
        audioContext.close().catch(() => undefined);
      }
    };
  } catch {
    context?.close().catch(() => undefined);
    return null;
  }
};

/**
 * Builds the stream handed to MediaRecorder when an effect pipeline (AI
 * features, overlays, …) is baked into the take: the picture comes from the
 * canvas the effects are drawn on, the sound from the tracks the caller
 * already captured (the mixed system+mic track for screen/PiP recordings, the
 * selected microphone otherwise).
 *
 * The canvas must already hold a correctly sized frame – `captureStream()`
 * freezes the track dimensions at capture time. Returns `null` when the
 * browser cannot capture a canvas, so callers can fall back to the raw stream.
 */
export const createCanvasRecordingStream = (
  canvas: HTMLCanvasElement,
  audioTracks: MediaStreamTrack[] = [],
  frameRate = 30
): MediaStream | null => {
  if (typeof canvas.captureStream !== 'function') return null;

  try {
    const canvasStream = canvas.captureStream(frameRate > 0 ? frameRate : 30);
    const videoTracks = canvasStream.getVideoTracks();

    if (videoTracks.length === 0) {
      canvasStream.getTracks().forEach(track => track.stop());
      return null;
    }

    // MediaRecorder only keeps the first audio track – anything that needed
    // mixing has already been reduced to a single track by `mixAudioTracks`.
    return new MediaStream([
      ...videoTracks,
      ...audioTracks.filter(track => track.readyState === 'live')
    ]);
  } catch (err) {
    console.warn('Canvas capture is unavailable, recording the raw stream instead:', err);
    return null;
  }
};

/** Geometry of the webcam inset, as fractions of the composited frame. */
export interface PipInset {
  /** Left edge, 0–1 of the composite width. */
  x: number;
  /** Top edge, 0–1 of the composite height. */
  y: number;
  /** Width, 0–1 of the composite width (height follows the webcam aspect). */
  width: number;
}

/** Sensible starting geometry: bottom-right corner, roughly a quarter wide. */
export const DEFAULT_PIP_INSET: PipInset = { x: 0.71, y: 0.66, width: 0.26 };

export const PIP_MIN_INSET_WIDTH = 0.1;
export const PIP_MAX_INSET_WIDTH = 0.6;

/**
 * Keeps the inset inside the frame and within the allowed size range.
 * `insetHeightRatio` converts a width fraction into a height fraction (see
 * `PipCompositor.insetHeightRatio`), so the same clamping can be applied by the
 * UI that drags the inset and by the compositor that paints it.
 */
export const clampPipInset = (inset: PipInset, insetHeightRatio: number): PipInset => {
  const width = Math.min(PIP_MAX_INSET_WIDTH, Math.max(PIP_MIN_INSET_WIDTH, inset.width));
  const height = Math.min(1, width * insetHeightRatio);
  return {
    width,
    x: Math.min(Math.max(inset.x, 0), Math.max(0, 1 - width)),
    y: Math.min(Math.max(inset.y, 0), Math.max(0, 1 - height))
  };
};

export interface PipCompositor {
  /** Video-only canvas capture stream to hand to MediaRecorder. */
  stream: MediaStream;
  /** The composite canvas – its size is the recorded resolution. */
  canvas: HTMLCanvasElement;
  /**
   * Height fraction of an inset that is 1.0 wide, i.e.
   * `heightFraction = inset.width * insetHeightRatio`. Lets the UI draw a
   * handle with exactly the proportions of the recorded inset.
   */
  insetHeightRatio: number;
  /** Stops the render loop and releases the canvas capture + helper elements. */
  stop: () => void;
}

export interface PipCompositorOptions {
  /** Screen capture – painted as the full frame. */
  screenStream: MediaStream;
  /** Webcam capture – painted as the inset overlay. */
  webcamStream: MediaStream;
  /** Read every frame, so dragging/resizing the inset is picked up live. */
  getInset: () => PipInset;
  frameRate?: number;
  /** Used when the screen capture never reports its dimensions. */
  fallbackSize?: { width: number; height: number };
}

/**
 * Draws `source` into the target rectangle the way CSS `object-cover` would:
 * the aspect ratio is preserved and the overflow is centre-cropped, so neither
 * the screen capture nor the webcam inset is ever stretched.
 */
const drawVideoCover = (
  context: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  const sourceWidth = source.videoWidth;
  const sourceHeight = source.videoHeight;
  if (!sourceWidth || !sourceHeight || width <= 0 || height <= 0) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = Math.min(sourceWidth, width / scale);
  const cropHeight = Math.min(sourceHeight, height / scale);
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;

  context.drawImage(source, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
};

/**
 * A MediaStream can only be painted onto a canvas through a video element.
 * The element stays in the document (but invisible) because browsers may stop
 * decoding detached media elements.
 */
const createOffscreenVideo = (stream: MediaStream): HTMLVideoElement => {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.cssText =
    'position:fixed;top:-10000px;left:-10000px;width:2px;height:2px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);
  return video;
};

const releaseOffscreenVideo = (video: HTMLVideoElement): void => {
  try {
    video.pause();
  } catch {
    // The element is being discarded anyway.
  }
  video.srcObject = null;
  video.remove();
};

/** Resolves once the element has decoded a frame (or the timeout is reached). */
const waitForDecodedFrame = (video: HTMLVideoElement, timeoutMs = 3000): Promise<boolean> =>
  new Promise(resolve => {
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      window.clearTimeout(timer);
      resolve(ready);
    };

    const poll = window.setInterval(() => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        finish(true);
      }
    }, 50);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
  });

/**
 * Composites a picture-in-picture take onto a single canvas: the screen
 * capture fills the frame and the webcam is drawn as an inset on top, every
 * frame, via `requestAnimationFrame`.
 *
 * This exists because MediaRecorder only records the FIRST video track of a
 * stream – handing it a stream that holds both captures silently drops the
 * webcam, so there is no picture-in-picture in the file at all. The canvas
 * capture returned here is what has to be recorded (combine it with the mixed
 * screen+mic audio track from `mixAudioTracks`).
 *
 * Returns `null` when the browser cannot capture a canvas, so callers can fall
 * back to recording the screen alone instead of a broken composite.
 */
export const createPipCompositor = async (
  options: PipCompositorOptions
): Promise<PipCompositor | null> => {
  const { screenStream, webcamStream, getInset, frameRate = 30, fallbackSize } = options;

  const screenVideoTracks = screenStream.getVideoTracks();
  if (screenVideoTracks.length === 0) return null;
  const webcamVideoTracks = webcamStream.getVideoTracks();

  const screenVideo = createOffscreenVideo(new MediaStream(screenVideoTracks));
  const webcamVideo =
    webcamVideoTracks.length > 0 ? createOffscreenVideo(new MediaStream(webcamVideoTracks)) : null;

  let frameId = 0;
  let stopped = false;
  const teardown = () => {
    if (stopped) return;
    stopped = true;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    releaseOffscreenVideo(screenVideo);
    if (webcamVideo) releaseOffscreenVideo(webcamVideo);
  };

  try {
    await Promise.all([
      screenVideo.play().catch(() => undefined),
      webcamVideo ? webcamVideo.play().catch(() => undefined) : Promise.resolve(undefined)
    ]);

    // The canvas can only be sized from a decoded frame, and `captureStream()`
    // freezes the track dimensions at capture time.
    await waitForDecodedFrame(screenVideo);
    if (webcamVideo) await waitForDecodedFrame(webcamVideo);

    const settings = screenVideoTracks[0].getSettings();
    const width = screenVideo.videoWidth || settings.width || fallbackSize?.width || 1280;
    const height = screenVideo.videoHeight || settings.height || fallbackSize?.height || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      teardown();
      return null;
    }

    const webcamAspect =
      webcamVideo && webcamVideo.videoWidth > 0 && webcamVideo.videoHeight > 0
        ? webcamVideo.videoWidth / webcamVideo.videoHeight
        : 16 / 9;
    // widthFraction * canvasWidth / webcamAspect === heightFraction * canvasHeight
    const insetHeightRatio = width / height / webcamAspect;

    const drawFrame = () => {
      // Screen capture: the full composite frame.
      drawVideoCover(context, screenVideo, 0, 0, canvas.width, canvas.height);

      // Webcam: the inset overlay, positioned/sized from the live geometry.
      if (webcamVideo && webcamVideo.readyState >= 2 && webcamVideo.videoWidth > 0) {
        const inset = clampPipInset(getInset(), insetHeightRatio);
        const insetWidth = inset.width * canvas.width;
        const insetHeight = insetWidth / webcamAspect;
        const left = inset.x * canvas.width;
        const top = inset.y * canvas.height;

        drawVideoCover(context, webcamVideo, left, top, insetWidth, insetHeight);

        // Thin outline so the inset reads against busy screen content.
        context.save();
        context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        context.lineWidth = Math.max(2, canvas.width * 0.0015);
        context.strokeRect(left, top, insetWidth, insetHeight);
        context.restore();
      }
    };

    // Paint before capturing so the track starts with real content.
    drawFrame();

    const stream = createCanvasRecordingStream(canvas, [], frameRate);
    if (!stream) {
      teardown();
      return null;
    }

    const renderLoop = () => {
      if (stopped) return;
      drawFrame();
      frameId = window.requestAnimationFrame(renderLoop);
    };
    frameId = window.requestAnimationFrame(renderLoop);

    return {
      stream,
      canvas,
      insetHeightRatio,
      stop: () => {
        teardown();
        stream.getTracks().forEach(track => track.stop());
      }
    };
  } catch (err) {
    console.warn('PiP compositing could not be started:', err);
    teardown();
    return null;
  }
};

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<number | null>(null);
  // Refs mirror the stream/mixer so unmount cleanup never depends on state.
  const streamRef = useRef<MediaStream | null>(null);
  // Source streams (screen, webcam, mic) – the recorded stream may only hold a
  // subset of their tracks, so they need to be released separately.
  const sourceStreamsRef = useRef<MediaStream[]>([]);
  const audioMixRef = useRef<MixedAudio | null>(null);
  // Canvas compositor that combines screen + webcam for PiP takes.
  const pipCompositorRef = useRef<PipCompositor | null>(null);
  // Webcam inset geometry, read by the compositor on every frame.
  const pipInsetRef = useRef<PipInset>({ ...DEFAULT_PIP_INSET });

  const setPipInset = useCallback((inset: PipInset) => {
    pipInsetRef.current = clampPipInset(
      inset,
      pipCompositorRef.current?.insetHeightRatio ?? 1
    );
  }, []);

  const stopTimer = useCallback(() => {
    if (timerInterval.current !== null) {
      window.clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const startTimer = useCallback((maxDuration?: number) => {
    stopTimer();
    timerInterval.current = window.setInterval(() => {
      setRecordingTime(prev => {
        const next = prev + 1;
        if (maxDuration && next >= maxDuration && mediaRecorder.current?.state === 'recording') {
          mediaRecorder.current.stop();
        }
        return next;
      });
    }, 1000);
  }, [stopTimer]);

  const releaseStream = useCallback(() => {
    pipCompositorRef.current?.stop();
    pipCompositorRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    sourceStreamsRef.current.forEach(source => {
      source.getTracks().forEach(track => track.stop());
    });
    sourceStreamsRef.current = [];
    audioMixRef.current?.close();
    audioMixRef.current = null;
    setVideoStream(null);
  }, []);

  const getMediaStream = useCallback(
    async (mode: 'webcam' | 'screen' | 'pip', micVolume = 1): Promise<MediaStream> => {
      switch (mode) {
        case 'screen': {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          sourceStreamsRef.current = [screenStream];
          return screenStream;
        }
        case 'pip': {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          let webcamStream: MediaStream | null = null;
          try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (err) {
            // The screen capture already succeeded – release it before bubbling up.
            screenStream.getTracks().forEach(track => track.stop());
            throw err;
          }

          sourceStreamsRef.current = [screenStream, webcamStream];

          // MediaRecorder only keeps the first audio track – mix system + mic
          // down to one, scaling the microphone by `micVolume`.
          const micTracks = webcamStream.getAudioTracks();
          const audioTracks = [...screenStream.getAudioTracks(), ...micTracks];
          const mixed = mixAudioTracks(audioTracks, { micTracks, micVolume });
          audioMixRef.current = mixed;
          const audioForRecording = mixed ? [mixed.track] : audioTracks.slice(0, 1);

          // MediaRecorder also only records the FIRST video track, so returning
          // both captures would silently drop the webcam. Composite them onto a
          // single canvas and record that instead.
          const compositor = await createPipCompositor({
            screenStream,
            webcamStream,
            getInset: () => pipInsetRef.current
          });

          if (!compositor) {
            // No canvas capture here – record the screen alone rather than
            // pretending a second video track will be picture-in-picture.
            return new MediaStream([...screenStream.getVideoTracks(), ...audioForRecording]);
          }

          pipCompositorRef.current = compositor;
          pipInsetRef.current = clampPipInset(pipInsetRef.current, compositor.insetHeightRatio);
          return new MediaStream([
            ...compositor.stream.getVideoTracks(),
            ...audioForRecording
          ]);
        }
        default: {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          sourceStreamsRef.current = [webcamStream];

          // A single microphone needs no mixing, but `micVolume` still has to
          // scale it – `mixAudioTracks` returns null when the raw track will do.
          const micTracks = webcamStream.getAudioTracks();
          const mixed = mixAudioTracks(micTracks, { micTracks, micVolume });
          audioMixRef.current = mixed;
          if (!mixed) return webcamStream;

          return new MediaStream([...webcamStream.getVideoTracks(), mixed.track]);
        }
      }
    },
    []
  );

  const startRecording = useCallback(
    async (options?: RecordingOptions) => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        return;
      }

      const supportError = getMediaSupportError();
      if (supportError) {
        const err = new Error(supportError);
        setError(err);
        throw err;
      }

      try {
        setError(null);
        recordedChunks.current = [];
        setRecordingTime(0);

        const stream = await getMediaStream(options?.mode || 'webcam', options?.micVolume ?? 1);
        streamRef.current = stream;
        setVideoStream(stream);

        const recorder = createMediaRecorder(stream);
        mediaRecorder.current = recorder;

        recorder.ondataavailable = event => {
          if (event.data && event.data.size > 0) {
            recordedChunks.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          setError(new Error('Recording stopped unexpectedly.'));
          stopTimer();
          setIsRecording(false);
          setIsPaused(false);
          releaseStream();
        };

        // Screen sharing can be ended from the browser UI – finish cleanly. In
        // PiP mode the recorded track is the composite canvas, which never ends
        // on its own, so the source captures are watched as well.
        const watchedTracks = new Set<MediaStreamTrack>([
          ...stream.getVideoTracks(),
          ...sourceStreamsRef.current.flatMap(source => source.getVideoTracks())
        ]);
        watchedTracks.forEach(track => {
          track.onended = () => {
            if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
              mediaRecorder.current.stop();
            }
          };
        });

        // Timeslice keeps memory bounded and guarantees data for long takes.
        recorder.start(1000);
        setIsRecording(true);
        setIsPaused(false);
        startTimer(options?.maxDuration);
      } catch (err) {
        releaseStream();
        mediaRecorder.current = null;
        stopTimer();
        setIsRecording(false);
        const normalized = new Error(getMediaErrorMessage(err));
        setError(normalized);
        throw normalized;
      }
    },
    [getMediaStream, releaseStream, startTimer, stopTimer]
  );

  const stopRecording = useCallback((): Promise<Blob> => {
    const recorder = mediaRecorder.current;

    const finalize = (): Blob => {
      stopTimer();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      releaseStream();
      const type = recorder?.mimeType || recordedChunks.current[0]?.type || 'video/webm';
      return new Blob(recordedChunks.current, { type });
    };

    return new Promise<Blob>((resolve, reject) => {
      if (!recorder || recorder.state === 'inactive') {
        // Already stopped (e.g. maxDuration hit) – return what we captured.
        if (recordedChunks.current.length > 0) {
          resolve(finalize());
        } else {
          finalize();
          reject(new Error('No recording in progress'));
        }
        return;
      }

      recorder.onstop = () => {
        const blob = finalize();
        if (blob.size === 0) {
          reject(new Error('Recording produced no data. Please try again.'));
          return;
        }
        resolve(blob);
      };

      try {
        recorder.stop();
      } catch (err) {
        finalize();
        reject(err instanceof Error ? err : new Error('Failed to stop the recording.'));
      }
    });
  }, [releaseStream, stopTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause();
      stopTimer();
      setIsPaused(true);
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'paused') {
      mediaRecorder.current.resume();
      startTimer();
      setIsPaused(false);
    }
  }, [startTimer]);

  const clearRecording = useCallback(() => {
    recordedChunks.current = [];
    setRecordingTime(0);
    setError(null);
  }, []);

  // Mount-only cleanup: depending on `videoStream` here would tear the
  // recorder down as soon as the stream state was set.
  useEffect(() => {
    return () => {
      const recorder = mediaRecorder.current;
      if (recorder) {
        // Detach handlers first so a late `onstop` cannot update state
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // Ignore – the recorder is being discarded anyway.
          }
        }
      }
      mediaRecorder.current = null;
      if (timerInterval.current !== null) {
        window.clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      pipCompositorRef.current?.stop();
      pipCompositorRef.current = null;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      sourceStreamsRef.current.forEach(source => {
        source.getTracks().forEach(track => track.stop());
      });
      sourceStreamsRef.current = [];
      audioMixRef.current?.close();
      audioMixRef.current = null;
    };
  }, []);

  return {
    isRecording,
    isPaused,
    recordingTime,
    videoStream,
    recordedChunks: recordedChunks.current,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    setPipInset,
    error
  };
};
