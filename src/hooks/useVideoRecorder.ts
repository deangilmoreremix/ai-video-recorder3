import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordingOptions {
  mode: 'webcam' | 'screen' | 'pip';
  countdown?: number;
  maxDuration?: number;
  aiFeatures?: Record<string, boolean>;
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
  close: () => void;
}

/**
 * MediaRecorder only records the first audio track of a stream, so screen +
 * microphone audio must be mixed down to a single track. Returns `null` when
 * mixing is unnecessary (< 2 tracks) or unsupported.
 */
export const mixAudioTracks = (tracks: MediaStreamTrack[]): MixedAudio | null => {
  const liveTracks = tracks.filter(track => track.kind === 'audio' && track.readyState === 'live');
  if (liveTracks.length < 2) return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  let context: AudioContext | null = null;
  try {
    context = new AudioContextCtor();
    const destination = context.createMediaStreamDestination();
    liveTracks.forEach(track => {
      context!.createMediaStreamSource(new MediaStream([track])).connect(destination);
    });

    const [mixedTrack] = destination.stream.getAudioTracks();
    if (!mixedTrack) {
      context.close().catch(() => undefined);
      return null;
    }

    const audioContext = context;
    return {
      track: mixedTrack,
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
    async (mode: 'webcam' | 'screen' | 'pip'): Promise<MediaStream> => {
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

          const audioTracks = [...screenStream.getAudioTracks(), ...webcamStream.getAudioTracks()];
          const mixed = mixAudioTracks(audioTracks);
          audioMixRef.current = mixed;

          return new MediaStream([
            ...screenStream.getVideoTracks(),
            ...webcamStream.getVideoTracks(),
            ...(mixed ? [mixed.track] : audioTracks.slice(0, 1))
          ]);
        }
        default: {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          sourceStreamsRef.current = [webcamStream];
          return webcamStream;
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

        const stream = await getMediaStream(options?.mode || 'webcam');
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

        // Screen sharing can be ended from the browser UI – finish cleanly.
        stream.getVideoTracks().forEach(track => {
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
    error
  };
};
