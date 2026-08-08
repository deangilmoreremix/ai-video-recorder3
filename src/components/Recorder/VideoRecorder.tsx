import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Video, Upload, Volume2, Play, Pause, Square, Brain, Camera, Monitor, Layout, Settings, Mic, MicOff, Sliders, RefreshCw, X, AlertCircle } from 'lucide-react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import {
  createCanvasRecordingStream,
  createMediaRecorder,
  getMediaErrorMessage,
  getMediaSupportError,
  getMimeCandidates,
  mixAudioTracks,
  MixedAudio
} from '../../hooks/useVideoRecorder';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIVideoFeatures } from '../AI/AIVideoFeatures';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import { EnhancedDownloadDialog } from './EnhancedDownloadDialog';
import { Tooltip } from '../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { addRecording, uploadRecordingMedia } from '../../utils/supabaseClient';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

type Resolution = '1080p' | '720p' | '480p' | '360p';
type Quality = 'high' | 'medium' | 'low';
type RecordingModeSetting = 'continuous' | 'timed' | 'segmented';
type RecordingFormat = 'webm' | 'mp4';

/** Frame sizes requested from the capture device for each resolution preset. */
const RESOLUTION_PRESETS: Record<Resolution, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 }
};

/** Quality presets, mapped to the MediaRecorder bitrate (bits per second). */
const QUALITY_BITRATES: Record<Quality, number> = {
  high: 8_000_000,
  medium: 4_000_000,
  low: 2_000_000
};

// "Timed" stops automatically after a fixed take. "Segmented" uses the same
// auto-stop mechanism with a shorter chunk, so a long session is captured as
// several short recordings instead of one huge file.
const TIMED_DURATION_SECONDS = 60;
const SEGMENT_DURATION_SECONDS = 30;

/** Capture rate used for the AI canvas when no frame rate is selected. */
const AI_CANVAS_FPS = 30;

/**
 * Resolves once the <video> element has decoded a frame (or the timeout is
 * reached). The AI canvas can only be sized from a decoded frame and
 * `captureStream()` freezes the track dimensions at capture time, so the very
 * first processed frame has to be painted before the recording starts.
 */
const waitForVideoFrame = (video: HTMLVideoElement, timeoutMs = 3000): Promise<boolean> =>
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
      window.clearTimeout(timeout);
      resolve(ready);
    };

    const poll = window.setInterval(() => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        finish(true);
      }
    }, 50);
    const timeout = window.setTimeout(() => finish(false), timeoutMs);
  });

export const VideoRecorder: React.FC = () => {
  // Recording state
  const [recordingMode, setRecordingMode] = useState<'webcam' | 'screen' | 'pip'>('webcam');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micVolume, setMicVolume] = useState(1);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);

  // Video state
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  // AI state
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [showFullAI, setShowFullAI] = useState(false);
  // True while the <video> element is showing a live capture (camera/screen)
  // rather than a local/processed file – only then can AI frames be produced.
  const [hasLiveVideoSource, setHasLiveVideoSource] = useState(false);
  // True while the take in progress is being recorded from the AI canvas
  const [isBakingAI, setIsBakingAI] = useState(false);

  // Advanced settings (applied to the capture + the MediaRecorder)
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [frameRate, setFrameRate] = useState(30);
  const [quality, setQuality] = useState<Quality>('high');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [sampleRate, setSampleRate] = useState(48000);
  const [recordingModeSetting, setRecordingModeSetting] = useState<RecordingModeSetting>('continuous');
  const [format, setFormat] = useState<RecordingFormat>('webm');
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);

  // Countdown overlay value (null while no countdown is running)
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  // Recording details
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingTags, setRecordingTags] = useState<string[]>([]);
  const [recordingFolder, setRecordingFolder] = useState<string | null>(null);
  const [recordedThumbnail, setRecordedThumbnail] = useState<Blob | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  // Canvas the AI pipeline paints on – it is the video source of the
  // recording whenever at least one AI feature is enabled.
  const aiCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Stream fed to MediaRecorder when AI is baked in (canvas video + mixed audio)
  const aiRecordingStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioMixRef = useRef<MixedAudio | null>(null);
  // Source streams (screen, webcam, mic) – the recorded stream only holds a
  // subset of their tracks, so they need to be released separately.
  const sourceStreamsRef = useRef<MediaStream[]>([]);
  const localVideoUrlRef = useRef<string | null>(null);
  // Elapsed seconds mirrored in a ref so the timer can enforce `maxDuration`
  const recordingTimeRef = useRef(0);
  // Auto-stop length of the take in progress ('timed'/'segmented' modes)
  const maxDurationRef = useRef<number | undefined>(undefined);
  const countdownTimeoutRef = useRef<number | null>(null);
  // Metadata of the finished take – the <video> element reports 0/NaN once
  // the capture tracks have been released.
  const recordedSizeRef = useRef({ width: 0, height: 0 });
  const recordedDurationRef = useRef(0);

  // AI Features
  const { features, toggleFeature, loadModels, processFrame, isModelsLoaded } = useAIFeatures();

  /** At least one AI effect is switched on – the take has to be processed. */
  const aiEnabled = useMemo(
    () => Object.values(features).some(feature => feature.enabled),
    [features]
  );

  // The render loop and the recording setup live outside React's render cycle,
  // so the values they need are mirrored in refs. `processFrame` in particular
  // is recreated whenever a feature is toggled – reading it through a ref is
  // what makes the side-panel toggles drive the canvas (and therefore the
  // recording) while a take is running.
  const processFrameRef = useRef(processFrame);
  const isModelsLoadedRef = useRef(isModelsLoaded);
  const aiEnabledRef = useRef(aiEnabled);
  // True only while the AI render loop is actually painting the canvas
  const aiCanvasLiveRef = useRef(false);
  // Guards against two overlapping `processFrame` calls (the loop and the
  // frame painted while the recording is being set up)
  const aiFrameInFlightRef = useRef(false);
  // The canvas holds a frame that matches the current capture
  const aiCanvasPaintedRef = useRef(false);

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  useEffect(() => {
    isModelsLoadedRef.current = isModelsLoaded;
  }, [isModelsLoaded]);

  useEffect(() => {
    aiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);

  // Run the AI pipeline while the take is being recorded from the canvas, and
  // while the live preview is shown so the toggles are immediately visible.
  // The advanced overlay (`AIVideoFeatures`) paints its own canvas – don't
  // process the preview twice for it.
  const aiCanvasActive =
    aiEnabled && (isBakingAI || (!isRecording && hasLiveVideoSource && !showFullAI));

  /**
   * Paints one AI processed frame onto the canvas. Falls back to the raw
   * frame while the models are still loading (or when processing fails) so
   * the recorded canvas never goes blank.
   */
  const renderAIFrame = useCallback(
    async (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<boolean> => {
      // Another frame is still being processed – report whether the canvas
      // already holds a usable picture instead of queueing a second pass.
      if (aiFrameInFlightRef.current) return aiCanvasPaintedRef.current;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return aiCanvasPaintedRef.current;
      }

      aiFrameInFlightRef.current = true;
      try {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        if (isModelsLoadedRef.current) {
          try {
            await processFrameRef.current(video, canvas);
            aiCanvasPaintedRef.current = true;
            return true;
          } catch (err) {
            console.warn('AI frame processing failed, using the raw frame:', err);
          }
        }

        const context = canvas.getContext('2d');
        if (!context) return aiCanvasPaintedRef.current;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        aiCanvasPaintedRef.current = true;
        return true;
      } finally {
        aiFrameInFlightRef.current = false;
      }
    },
    []
  );

  // requestAnimationFrame loop feeding the AI canvas (and therefore the
  // recording). It only exists while an AI feature is enabled – with every
  // feature off nothing is scheduled and the raw stream is recorded as before.
  useEffect(() => {
    if (!aiCanvasActive) return;

    let cancelled = false;
    let frameId = 0;
    aiCanvasLiveRef.current = true;

    const scheduleNext = () => {
      if (cancelled) return;
      frameId = window.requestAnimationFrame(renderLoop);
    };

    const renderLoop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = aiCanvasRef.current;
      if (!video || !canvas) {
        scheduleNext();
        return;
      }
      renderAIFrame(video, canvas).then(scheduleNext, scheduleNext);
    };

    frameId = window.requestAnimationFrame(renderLoop);

    return () => {
      cancelled = true;
      aiCanvasLiveRef.current = false;
      aiCanvasPaintedRef.current = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [aiCanvasActive, renderAIFrame]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const stopTimer = () => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startTimer = (maxDuration?: number) => {
    stopTimer();
    timerIntervalRef.current = window.setInterval(() => {
      recordingTimeRef.current += 1;
      setRecordingTime(recordingTimeRef.current);

      // 'timed'/'segmented' takes stop themselves – `onstop` finalises the blob
      if (
        maxDuration &&
        recordingTimeRef.current >= maxDuration &&
        mediaRecorderRef.current?.state === 'recording'
      ) {
        mediaRecorderRef.current.stop();
      }
    }, 1000);
  };

  /** Auto-stop length for the selected recording mode ('continuous' = none). */
  const getMaxDuration = (): number | undefined => {
    switch (recordingModeSetting) {
      case 'timed':
        return TIMED_DURATION_SECONDS;
      case 'segmented':
        return SEGMENT_DURATION_SECONDS;
      default:
        return undefined;
    }
  };

  /** Shows a 3..2..1 overlay and resolves once it reaches zero. */
  const runCountdown = (seconds: number) =>
    new Promise<void>(resolve => {
      let remaining = Math.max(1, Math.round(seconds));
      setCountdownValue(remaining);

      const tick = () => {
        countdownTimeoutRef.current = window.setTimeout(() => {
          remaining -= 1;
          if (remaining <= 0) {
            countdownTimeoutRef.current = null;
            setCountdownValue(null);
            resolve();
            return;
          }
          setCountdownValue(remaining);
          tick();
        }, 1000);
      };

      tick();
    });

  /**
   * Grabs the frame currently shown as a PNG blob. When the AI pipeline is
   * driving the recording the poster is taken from the AI canvas so it
   * matches the saved video; otherwise the <video> element is used.
   * Must run before the capture tracks are stopped, otherwise the element is
   * already blank. Returns `null` when nothing can be drawn (e.g. tainted
   * canvas or no frame yet).
   */
  const captureThumbnail = (): Promise<Blob | null> =>
    new Promise(resolve => {
      const aiCanvas = aiCanvasRef.current;
      const source =
        aiCanvasLiveRef.current && aiCanvas && aiCanvas.width > 0 && aiCanvas.height > 0
          ? aiCanvas
          : videoRef.current;

      if (!source) {
        resolve(null);
        return;
      }

      const width = source instanceof HTMLCanvasElement ? source.width : source.videoWidth;
      const height = source instanceof HTMLCanvasElement ? source.height : source.videoHeight;
      if (!width || !height) {
        resolve(null);
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob), 'image/png');
      } catch (err) {
        // A thumbnail is a nice-to-have – never fail the recording over it
        console.warn('Could not capture a thumbnail frame:', err);
        resolve(null);
      }
    });

  /** Stops the canvas capture used to bake the AI effects into the take. */
  const releaseAIRecordingStream = () => {
    aiRecordingStreamRef.current?.getVideoTracks().forEach(track => track.stop());
    aiRecordingStreamRef.current = null;
    setIsBakingAI(false);
  };

  // Release every capture track (camera, mic, screen) plus the audio mixer
  const releaseStream = () => {
    releaseAIRecordingStream();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    sourceStreamsRef.current.forEach(source => {
      source.getTracks().forEach(track => track.stop());
    });
    sourceStreamsRef.current = [];
    audioMixRef.current?.close();
    audioMixRef.current = null;
    setHasLiveVideoSource(false);
  };

  // Replace the <video> source with a local object URL, revoking the previous one
  const setLocalVideoUrl = (url: string | null) => {
    if (localVideoUrlRef.current) {
      URL.revokeObjectURL(localVideoUrlRef.current);
    }
    localVideoUrlRef.current = url;
  };

  // Load AI models
  useEffect(() => {
    loadModels().catch(err => {
      console.error("Failed to load AI models:", err);
    });
  }, [loadModels]);

  // Get available devices
  useEffect(() => {
    const supportError = getMediaSupportError();
    if (supportError) {
      setError(supportError);
      return;
    }

    let cancelled = false;

    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
          }));
        setAudioDevices(audioInputs);
        
        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`
          }));
        setVideoDevices(videoInputs);
        
        // Set default devices if available
        setSelectedMicId(prev => prev || audioInputs[0]?.deviceId || '');
        setSelectedCameraId(prev => prev || videoInputs[0]?.deviceId || '');
      } catch (err) {
        console.error('Error getting media devices:', err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // Clean up streams, timers and object URLs when component unmounts
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        // Detach handlers first so a late `onstop` cannot update state
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // The recorder is being discarded anyway
          }
        }
      }
      mediaRecorderRef.current = null;

      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (countdownTimeoutRef.current !== null) {
        window.clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }

      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      aiRecordingStreamRef.current?.getVideoTracks().forEach(track => track.stop());
      aiRecordingStreamRef.current = null;
      sourceStreamsRef.current.forEach(source => {
        source.getTracks().forEach(track => track.stop());
      });
      sourceStreamsRef.current = [];
      audioMixRef.current?.close();
      audioMixRef.current = null;

      if (localVideoUrlRef.current) {
        URL.revokeObjectURL(localVideoUrlRef.current);
        localVideoUrlRef.current = null;
      }
    };
  }, []);

  // Setup webcam preview (re-runs when another camera is selected)
  useEffect(() => {
    if (isRecording || recordedBlob || localVideoUrlRef.current) return;
    if (getMediaSupportError()) return;

    let cancelled = false;

    const setupPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: false // No audio needed for preview
        });

        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // Release the previous preview before attaching the new one
        if (streamRef.current && streamRef.current !== stream) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
        setHasLiveVideoSource(true);
      } catch (err) {
        // A missing permission here is not fatal – recording asks again later
        console.error('Error setting up camera preview:', err);
      }
    };

    setupPreview();

    return () => {
      cancelled = true;
    };
  }, [selectedCameraId, isRecording, recordedBlob]);

  const startRecording = async () => {
    const supportError = getMediaSupportError();
    if (supportError) {
      setError(supportError);
      return;
    }

    setError(null);
    setIsProcessing(true);
    chunksRef.current = [];
    recordingTimeRef.current = 0;
    setRecordingTime(0);
    setRecordedThumbnail(null);

    let stream: MediaStream | null = null;
    const acquired: MediaStream[] = [];

    try {
      // Audio settings from the Advanced Settings panel. Unsupported hints
      // (e.g. `sampleRate` on some devices) are ignored rather than fatal
      // because they are expressed as "ideal" constraints.
      const audioConstraints: MediaTrackConstraints = {
        deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
        echoCancellation,
        noiseSuppression,
        autoGainControl: true,
        sampleRate: { ideal: sampleRate }
      };

      // Video settings: resolution preset + frame rate from the panel
      const { width, height } = RESOLUTION_PRESETS[resolution];
      const videoConstraints: MediaTrackConstraints = {
        ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}),
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate }
      };
      const displayConstraints: MediaTrackConstraints = {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate }
      };

      switch (recordingMode) {
        case 'screen': {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: displayConstraints,
            audio: true 
          });
          acquired.push(screenStream);

          let micStream: MediaStream | null = null;
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ 
              audio: audioConstraints 
            });
            acquired.push(micStream);
          } catch (err) {
            console.warn('Unable to access microphone, recording without it:', err);
          }

          const audioTracks = [
            ...screenStream.getAudioTracks(),
            ...(micStream ? micStream.getAudioTracks() : [])
          ];
          if (isMicMuted && micStream) {
            micStream.getAudioTracks().forEach(track => { track.enabled = false; });
          }

          // MediaRecorder only keeps the first audio track – mix system + mic audio
          audioMixRef.current = mixAudioTracks(audioTracks);

          stream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...(audioMixRef.current ? [audioMixRef.current.track] : audioTracks.slice(0, 1))
          ]);
          break;
        }

        case 'pip': {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: displayConstraints,
            audio: true 
          });
          acquired.push(displayStream);

          let webcamStream: MediaStream;
          try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ 
              video: videoConstraints,
              audio: audioConstraints 
            });
            acquired.push(webcamStream);
          } catch (err) {
            // Screen capture already succeeded – never leave it running
            displayStream.getTracks().forEach(track => track.stop());
            throw err;
          }

          if (isMicMuted) {
            webcamStream.getAudioTracks().forEach(track => { track.enabled = false; });
          }

          // We keep the webcam video plus a single mixed audio track
          const audioTracks = [
            ...displayStream.getAudioTracks(),
            ...webcamStream.getAudioTracks()
          ];
          audioMixRef.current = mixAudioTracks(audioTracks);

          stream = new MediaStream([
            ...webcamStream.getVideoTracks(),
            ...(audioMixRef.current ? [audioMixRef.current.track] : audioTracks.slice(0, 1))
          ]);
          break;
        }

        default: { // webcam
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints,
            audio: audioConstraints
          });
          acquired.push(stream);
          if (isMicMuted) {
            stream.getAudioTracks().forEach(track => { track.enabled = false; });
          }
          break;
        }
      }

      // Store the stream for cleanup, releasing the preview stream first
      if (streamRef.current && streamRef.current !== stream) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      streamRef.current = stream;
      sourceStreamsRef.current = acquired;

      // Set up video preview
      if (videoRef.current) {
        setLocalVideoUrl(null);
        videoRef.current.removeAttribute('src');
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.play().catch(() => undefined);
      }
      setHasLiveVideoSource(true);

      // Bake the AI effects into the take: with at least one feature enabled
      // the picture is taken from the AI canvas (fed by the rAF loop below)
      // instead of the raw camera/display track, keeping the audio track the
      // capture already carries (mixed system+mic, or the selected mic).
      let recordingStream = stream;
      if (aiEnabledRef.current && videoRef.current && aiCanvasRef.current) {
        const video = videoRef.current;
        const canvas = aiCanvasRef.current;

        // The canvas needs a correctly sized frame before `captureStream()`
        await waitForVideoFrame(video);
        const painted = await renderAIFrame(video, canvas);

        const aiStream = painted
          ? createCanvasRecordingStream(
              canvas,
              stream.getAudioTracks(),
              frameRate > 0 ? frameRate : AI_CANVAS_FPS
            )
          : null;

        if (aiStream) {
          aiRecordingStreamRef.current = aiStream;
          recordingStream = aiStream;
          setIsBakingAI(true);
        } else {
          console.warn('AI canvas capture unavailable – recording the raw stream instead.');
        }
      }

      // Codec support differs per browser – only pass a mimeType we probed.
      // The requested container (webm/mp4) is preferred, with the usual
      // vp9 → vp8 → webm fallback when it is unavailable.
      const mediaRecorder = createMediaRecorder(
        recordingStream,
        { bitsPerSecond: QUALITY_BITRATES[quality] },
        getMimeCandidates(format)
      );
      mediaRecorderRef.current = mediaRecorder;

      // Set up data handler
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording stopped unexpectedly. Please try again.');
        stopTimer();
        releaseStream();
        setIsRecording(false);
        setIsPaused(false);
      };

      // Handle recording completion
      mediaRecorder.onstop = () => {
        // Grab the last visible frame *before* the tracks are stopped, the
        // <video> element goes blank as soon as the stream is released.
        const thumbnailPromise = captureThumbnail();

        // Remember the geometry of what was actually recorded (the AI canvas
        // when AI is baked in) – it is gone once the tracks are stopped.
        const recordedCanvas = aiRecordingStreamRef.current ? aiCanvasRef.current : null;
        recordedSizeRef.current = {
          width: recordedCanvas ? recordedCanvas.width : (videoRef.current?.videoWidth ?? 0),
          height: recordedCanvas ? recordedCanvas.height : (videoRef.current?.videoHeight ?? 0)
        };
        recordedDurationRef.current = recordingTimeRef.current;
        const bakedAI = recordedCanvas !== null;

        // Clean up recording resources
        stopTimer();
        releaseStream();
        setIsRecording(false);
        setIsPaused(false);

        // Create final video blob using the codec the browser actually used
        const mimeType = mediaRecorder.mimeType || chunksRef.current[0]?.type || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size === 0) {
          setError('The recording produced no data. Please try again.');
          return;
        }

        setRecordedBlob(blob);
        thumbnailPromise.then(setRecordedThumbnail).catch(() => setRecordedThumbnail(null));

        // Set default title based on date and time
        const now = new Date();
        setRecordingTitle(`Recording ${now.toLocaleString()}`);

        // Set tags based on mode (AI takes are tagged so they are easy to find)
        setRecordingTags(bakedAI ? [recordingMode, 'ai-enhanced'] : [recordingMode]);
        setVideoProcessed(bakedAI);

        // Show download dialog
        setShowDownloadDialog(true);
      };

      // Screen sharing can be ended from the browser UI – finish cleanly
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        };
      });

      // Start recording. 'timed'/'segmented' takes stop themselves once the
      // configured duration has elapsed; 'continuous' runs until stopped.
      maxDurationRef.current = getMaxDuration();
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimer(maxDurationRef.current);
    } catch (err) {
      console.error('Error starting recording:', err);
      releaseAIRecordingStream();
      stream?.getTracks().forEach(track => track.stop());
      acquired.forEach(source => source.getTracks().forEach(track => track.stop()));
      audioMixRef.current?.close();
      audioMixRef.current = null;
      setHasLiveVideoSource(false);
      setError(getMediaErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      // Nothing to stop – make sure no device is left running
      stopTimer();
      releaseStream();
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    try {
      recorder.stop(); // `onstop` finalises the blob and releases the devices
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(getMediaErrorMessage(err));
      stopTimer();
      releaseStream();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer(maxDurationRef.current);
    }
  };

  /** Runs the optional countdown overlay, then starts the actual recording. */
  const handleStartRecording = async () => {
    if (isRecording || isProcessing || countdownValue !== null) return;

    if (countdownEnabled) {
      await runCountdown(countdownSeconds);
    }

    await startRecording();
  };

  const loadLocalFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Unsupported file type. Please choose a video file.');
      return;
    }

    setError(null);

    // Revokes the previously loaded object URL
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setVideoProcessed(false);

    // A local file replaces the live preview
    releaseStream();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play().catch(() => undefined);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadLocalFile(file);
  };

  const handleSelectFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) loadLocalFile(file);
    };
    input.click();
  };

  /**
   * `AIVideoFeatures` hands back the AI processed clip for the video that is
   * currently loaded (an upload, or the source shown in the advanced
   * overlay). That clip becomes THE recording: it is previewed, downloaded
   * and uploaded to Supabase from the save dialog.
   */
  const handleAIProcessingComplete = (processedBlob: Blob) => {
    if (!processedBlob || processedBlob.size === 0) return;

    // Never swap the source out from under a take that is still running
    if (isRecording) {
      console.warn('Ignoring AI output while a recording is in progress.');
      return;
    }

    // Some feature panels emit a still frame instead of a clip – keep it as
    // the poster image rather than replacing the video with an image.
    if (processedBlob.type && !processedBlob.type.startsWith('video/')) {
      setRecordedThumbnail(processedBlob);
      setVideoProcessed(true);
      return;
    }

    // Create URL for processed video (revoking the previous one)
    const url = URL.createObjectURL(processedBlob);
    setLocalVideoUrl(url);
    setVideoProcessed(true);
    setShowFullAI(false);
    // The processed clip is a file, not a live capture
    setHasLiveVideoSource(false);

    // Update video player with processed video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play().catch(() => undefined);
    }

    // Store for download *and* for the cloud save
    setRecordedBlob(processedBlob);
    // Re-derive the poster from the processed clip (saveRecordingToDatabase
    // falls back to the frame on screen when this is null)
    setRecordedThumbnail(null);
    setRecordingTitle(prev => (prev.trim() ? prev : `AI Recording ${new Date().toLocaleString()}`));
    setRecordingTags(prev => (prev.includes('ai-enhanced') ? prev : [...prev, 'ai-enhanced']));

    // Offer the same save/upload flow used after a live take
    setShowDownloadDialog(true);
  };
  
  const saveRecordingToDatabase = async (blob: Blob) => {
    try {
      // Get metadata from the video
      let duration = 0;
      let width = 0;
      let height = 0;
      
      if (videoRef.current) {
        // Live/streamed sources report Infinity or NaN until fully buffered
        duration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
        width = videoRef.current.videoWidth;
        height = videoRef.current.videoHeight;
      }

      // The element is blank once the capture tracks are stopped – fall back
      // to the size the take was recorded at (the AI canvas when it was used).
      if (!width || !height) {
        width = recordedSizeRef.current.width;
        height = recordedSizeRef.current.height;
      }

      if (!duration && recordedDurationRef.current > 0) {
        duration = recordedDurationRef.current;
      }
      
      // Get file format from blob type
      const fileFormat = blob.type.split('/')[1]?.split(';')[0] || 'webm';
      const baseName = crypto.randomUUID();
      const fileName = `${baseName}.${fileFormat}`;
      
      // Upload the media to the private Storage bucket; the helper namespaces
      // the path by the signed-in user id so RLS permits the write.
      const { path, error: uploadError } = await uploadRecordingMedia(blob, fileName);
      if (uploadError || !path) {
        setError(uploadError ?? 'Could not upload the recording.');
        return;
      }

      // Upload the poster frame captured when the recording stopped (falling
      // back to the frame currently on screen). A missing thumbnail is not
      // fatal – the recording is still saved.
      let thumbnailPath: string | null = null;
      const thumbnailBlob = recordedThumbnail ?? (await captureThumbnail());
      if (thumbnailBlob) {
        const { path: thumbPath, error: thumbError } = await uploadRecordingMedia(
          thumbnailBlob,
          `${baseName}.png`,
          'thumbs'
        );
        if (thumbError) {
          console.warn('Could not upload the thumbnail:', thumbError);
        } else {
          thumbnailPath = thumbPath;
        }
      }
      
      // Persist the Storage path (resolved to a signed URL when listed)
      const { error } = await addRecording({
        title: recordingTitle,
        url: path,
        thumbnail: thumbnailPath,
        duration,
        size: blob.size,
        resolution: `${width}x${height}`,
        format: fileFormat,
        favorite: false,
        folder: recordingFolder,
        tags: recordingTags
      });
      
      if (error) {
        setError(error);
        return;
      }
      
      // Close dialog and reset state
      setShowDownloadDialog(false);
      setRecordedBlob(null);
      setRecordedThumbnail(null);
      setRecordingTitle('');
      setRecordingTags([]);
      setRecordingFolder(null);
      
    } catch (err) {
      // Supabase may be unconfigured in this environment – never lose the take
      console.error('Error saving recording:', err);
      setError('Failed to save the recording. You can still download it from this dialog.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Advanced Video Recorder</h3>
        <div className="flex space-x-2">
          <Tooltip content="Recording Settings">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="AI Features">
            <button
              onClick={() => setShowAIFeatures(!showAIFeatures)}
              className={`p-2 rounded-lg ${showAIFeatures ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
            >
              <Brain className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start space-x-2 p-3 rounded-lg border border-[#E44E51]/30 
          bg-[#E44E51]/10 text-sm text-[#E44E51]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-grow">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-[#E44E51]/10"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/*
          AI canvas: the rAF loop paints the processed frames here and, while
          any AI feature is enabled, this canvas is what MediaRecorder records.
          It is hidden (and idle) whenever no AI feature is on, so the raw
          stream keeps being recorded exactly as before.
        */}
        <canvas
          ref={aiCanvasRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
            aiCanvasActive ? '' : 'hidden'
          }`}
        />
        
        {/* Upload Overlay - only show when not recording */}
        {!isRecording && (
          <div 
            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 
              transition-opacity flex items-center justify-center cursor-pointer z-10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleSelectFile}
          >
            <div className="text-white text-center">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Drop video or click to upload</p>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        <AIProcessingOverlay
          isVisible={isProcessing}
          message="Initializing recording..."
        />

        {/* AI features overlay */}
        {showFullAI && (
          <div className="absolute inset-0 z-20">
            <AIVideoFeatures
              videoRef={videoRef}
              onProcessingComplete={handleAIProcessingComplete}
            />
            <button
              onClick={() => setShowFullAI(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Countdown before recording starts */}
        {countdownValue !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
            <motion.span
              key={countdownValue}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-white text-7xl font-bold"
            >
              {countdownValue}
            </motion.span>
          </div>
        )}

        {/* Recording timer */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="bg-red-600 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>{formatTime(recordingTime)}</span>
            </div>
            {isBakingAI && (
              <div className="bg-[#E44E51] px-3 py-1 rounded-full text-white text-sm flex items-center space-x-1">
                <Brain className="w-4 h-4" />
                <span>AI baked in</span>
              </div>
            )}
            {aiEnabled && !isBakingAI && (
              <div className="bg-black/60 px-3 py-1 rounded-full text-white text-xs flex items-center space-x-1">
                <Brain className="w-3 h-3" />
                <span>AI applies to the next take</span>
              </div>
            )}
          </div>
        )}
        
        {/* Video processed badge */}
        {videoProcessed && !isRecording && !showFullAI && (
          <div className="absolute top-4 left-4 bg-green-600 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>AI Processing Applied</span>
          </div>
        )}
      </div>

      {/* Mode Selection & Recording Controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setRecordingMode('webcam')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'webcam' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Camera className="w-5 h-5" />
              <span>Webcam</span>
            </button>
            <button
              onClick={() => setRecordingMode('screen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'screen' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Monitor className="w-5 h-5" />
              <span>Screen</span>
            </button>
            <button
              onClick={() => setRecordingMode('pip')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'pip' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Layout className="w-5 h-5" />
              <span>PiP</span>
            </button>
          </div>

          {/* Device Selection */}
          <div className="flex space-x-2">
            {/* Camera dropdown */}
            <div className="relative">
              <Tooltip content="Select camera">
                <button
                  onClick={() => setShowVideoMenu(!showVideoMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  disabled={isRecording}
                >
                  <Camera className="w-5 h-5" />
                </button>
              </Tooltip>
              
              <AnimatePresence>
                {showVideoMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg z-20"
                  >
                    <div className="p-2">
                      <h4 className="text-sm font-medium px-2 py-1">Select Camera</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {videoDevices.map((device) => (
                          <button
                            key={device.deviceId}
                            onClick={() => {
                              setSelectedCameraId(device.deviceId);
                              setShowVideoMenu(false);
                            }}
                            className={`w-full px-2 py-1.5 text-sm text-left rounded ${
                              selectedCameraId === device.deviceId
                                ? 'bg-[#E44E51]/10 text-[#E44E51]'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {device.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Microphone dropdown */}
            <div className="relative">
              <Tooltip content="Microphone settings">
                <button
                  onClick={() => setShowMicMenu(!showMicMenu)}
                  className={`p-2 rounded-lg ${
                    isMicMuted ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'
                  }`}
                  disabled={isRecording}
                >
                  {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </Tooltip>
              
              <AnimatePresence>
                {showMicMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg z-20"
                  >
                    <div className="p-2">
                      <h4 className="text-sm font-medium px-2 py-1">Select Microphone</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {audioDevices.map((device) => (
                          <button
                            key={device.deviceId}
                            onClick={() => {
                              setSelectedMicId(device.deviceId);
                              setShowMicMenu(false);
                            }}
                            className={`w-full px-2 py-1.5 text-sm text-left rounded ${
                              selectedMicId === device.deviceId
                                ? 'bg-[#E44E51]/10 text-[#E44E51]'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {device.label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="border-t mt-2 pt-2">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-sm">Microphone Volume</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={micVolume}
                            onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                            className="w-24 accent-[#E44E51]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setIsMicMuted(!isMicMuted);
                            setShowMicMenu(false);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-gray-100"
                        >
                          {isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    Video Settings
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Resolution</label>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value as Resolution)}
                        disabled={isRecording}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="1080p">1080p (1920x1080)</option>
                        <option value="720p">720p (1280x720)</option>
                        <option value="480p">480p (854x480)</option>
                        <option value="360p">360p (640x360)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Frame Rate</label>
                      <select
                        value={frameRate}
                        onChange={(e) => setFrameRate(Number(e.target.value))}
                        disabled={isRecording}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="30">30 fps</option>
                        <option value="60">60 fps</option>
                        <option value="24">24 fps (Film)</option>
                        <option value="15">15 fps (Low Bandwidth)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Quality</label>
                      <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as Quality)}
                        disabled={isRecording}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="high">High (8 Mbps)</option>
                        <option value="medium">Medium (4 Mbps)</option>
                        <option value="low">Low (2 Mbps)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Audio Settings
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Noise Suppression</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={noiseSuppression}
                          onChange={(e) => setNoiseSuppression(e.target.checked)}
                          disabled={isRecording}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                          peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                          peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                          after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                          after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Echo Cancellation</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={echoCancellation}
                          onChange={(e) => setEchoCancellation(e.target.checked)}
                          disabled={isRecording}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                          peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                          peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                          after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                          after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Sample Rate</label>
                      <select
                        value={sampleRate}
                        onChange={(e) => setSampleRate(Number(e.target.value))}
                        disabled={isRecording}
                        className="w-full rounded-lg border-gray-300"
                      >
                        <option value="48000">48 kHz</option>
                        <option value="44100">44.1 kHz</option>
                        <option value="22050">22.05 kHz</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Sliders className="w-4 h-4 mr-2" />
                  Recording Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Recording Mode</label>
                    <select
                      value={recordingModeSetting}
                      onChange={(e) => setRecordingModeSetting(e.target.value as RecordingModeSetting)}
                      disabled={isRecording}
                      className="w-full rounded-lg border-gray-300"
                    >
                      <option value="continuous">Continuous</option>
                      <option value="timed">Timed ({TIMED_DURATION_SECONDS}s)</option>
                      <option value="segmented">Segmented ({SEGMENT_DURATION_SECONDS}s chunks)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as RecordingFormat)}
                      disabled={isRecording}
                      className="w-full rounded-lg border-gray-300"
                    >
                      <option value="webm">WebM</option>
                      <option value="mp4">MP4</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Countdown Before Recording</span>
                  <div className="flex items-center space-x-3">
                    {countdownEnabled && (
                      <select
                        value={countdownSeconds}
                        onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                        disabled={isRecording}
                        className="rounded-lg border-gray-300 text-sm py-1"
                        aria-label="Countdown length"
                      >
                        <option value="3">3s</option>
                        <option value="5">5s</option>
                        <option value="10">10s</option>
                      </select>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={countdownEnabled}
                        onChange={(e) => setCountdownEnabled(e.target.checked)}
                        disabled={isRecording}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                        peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                        peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                        after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                        after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Features Panel */}
        <AnimatePresence>
          {showAIFeatures && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">AI Features</h4>
                  <button 
                    onClick={() => setShowFullAI(true)}
                    className="text-sm text-[#E44E51] font-medium"
                  >
                    Advanced Mode
                  </button>
                </div>
                
                <AIFeatureGrid
                  enabledFeatures={features}
                  onFeatureToggle={toggleFeature}
                  isProcessing={isProcessing}
                />

                <p className="text-xs text-gray-500">
                  {aiEnabled
                    ? 'Enabled effects are rendered into the recording itself – what you see in the preview is what gets saved.'
                    : 'Enable a feature to render it straight into the recording.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record Button */}
        <div className="flex justify-center space-y-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={isProcessing || countdownValue !== null}
              className="flex items-center space-x-2 px-6 py-3 bg-[#E44E51] text-white rounded-lg 
                hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:opacity-50"
            >
              <Video className="w-5 h-5" />
              <span>
                {countdownValue !== null
                  ? `Starting in ${countdownValue}...`
                  : isProcessing
                    ? 'Initializing...'
                    : 'Start Recording'}
              </span>
            </button>
          ) : (
            <div className="flex space-x-3">
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg 
                    hover:bg-blue-600 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 text-white rounded-lg 
                    hover:bg-yellow-600 shadow-lg"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg 
                  hover:bg-red-600 shadow-lg"
              >
                <Square className="w-5 h-5" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download Dialog */}
      <EnhancedDownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        recordedBlob={recordedBlob}
        onSave={(blob) => saveRecordingToDatabase(blob)}
        recordingTitle={recordingTitle}
        recordingTags={recordingTags}
        recordingFolder={recordingFolder}
        onRecordingTitleChange={setRecordingTitle}
        onRecordingTagsChange={setRecordingTags}
        onRecordingFolderChange={setRecordingFolder}
      />
    </div>
  );
};