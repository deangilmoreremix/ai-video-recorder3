import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Sparkles, Settings, Play, Pause, Download, Share2 } from 'lucide-react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { createCanvasRecordingStream, createMediaRecorder } from '../../hooks/useVideoRecorder';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import { copyToClipboard } from '../../utils/links';

interface AIPreviewEditorProps {
  videoUrl: string;
  onProcessingComplete?: (blob: Blob) => void;
}

/** Capture rate for the processed canvas. */
const EXPORT_FPS = 30;

/** `captureStream` is not in lib.dom for media elements, and Firefox prefixes it. */
type CapturableMedia = HTMLMediaElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

/** Resolves once the element has decoded a frame (or the timeout elapses). */
const waitForVideoFrame = (video: HTMLVideoElement, timeoutMs = 5000): Promise<boolean> =>
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

export const AIPreviewEditor: React.FC<AIPreviewEditorProps> = ({
  videoUrl,
  onProcessingComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Audio captured from the <video> element – reused across exports because
  // a media element hands out the same underlying tracks every time.
  const elementStreamRef = useRef<MediaStream | null>(null);
  const frameInFlightRef = useRef(false);
  const canvasPaintedRef = useRef(false);

  const {
    features,
    toggleFeature,
    processFrame,
    isModelsLoaded
  } = useAIFeatures();

  // Mirrors so the render loop always uses the latest processor without
  // being torn down every time a feature is toggled.
  const processFrameRef = useRef(processFrame);
  const isModelsLoadedRef = useRef(isModelsLoaded);

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  useEffect(() => {
    isModelsLoadedRef.current = isModelsLoaded;
  }, [isModelsLoaded]);

  /**
   * Paints one AI processed frame. While the models are still loading (or
   * when processing fails) the raw frame is drawn instead, so the canvas –
   * and therefore the exported clip – is never blank.
   */
  const renderFrame = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return false;
    if (frameInFlightRef.current) return canvasPaintedRef.current;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return canvasPaintedRef.current;
    }

    frameInFlightRef.current = true;
    try {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (isModelsLoadedRef.current) {
        try {
          await processFrameRef.current(video, canvas);
          canvasPaintedRef.current = true;
          return true;
        } catch (err) {
          console.warn('AI frame processing failed, using the raw frame:', err);
        }
      }

      const context = canvas.getContext('2d');
      if (!context) return canvasPaintedRef.current;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvasPaintedRef.current = true;
      return true;
    } finally {
      frameInFlightRef.current = false;
    }
  }, []);

  // Live preview loop. The export runs its own loop, so this one steps aside
  // while a clip is being rendered.
  useEffect(() => {
    if (!isPlaying || isProcessing) return;

    let cancelled = false;
    let frameId = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      frameId = window.requestAnimationFrame(renderLoop);
    };

    const renderLoop = () => {
      if (cancelled) return;
      renderFrame().then(scheduleNext, scheduleNext);
    };

    frameId = window.requestAnimationFrame(renderLoop);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying, isProcessing, renderFrame]);

  // A new source invalidates the captured audio and the painted frame
  useEffect(() => {
    canvasPaintedRef.current = false;
    elementStreamRef.current = null;
    setProcessedBlob(null);
  }, [videoUrl]);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
      setIsPlaying(!isPlaying);
    }
  };

  /** Audio of the source clip, when the browser lets us capture it. */
  const getSourceAudioTracks = (video: HTMLVideoElement): MediaStreamTrack[] => {
    if (elementStreamRef.current) {
      return elementStreamRef.current.getAudioTracks();
    }

    const media = video as CapturableMedia;
    const capture = media.captureStream ?? media.mozCaptureStream;
    if (typeof capture !== 'function') return [];

    try {
      const stream = capture.call(media);
      elementStreamRef.current = stream;
      return stream.getAudioTracks();
    } catch (err) {
      // Cross-origin sources cannot be captured – export the video only
      console.warn('Could not capture the source audio:', err);
      return [];
    }
  };

  /**
   * Renders the clip through the AI pipeline and records the canvas, so the
   * enabled effects end up baked into the returned blob (with the original
   * audio when it can be captured).
   */
  const processVideo = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setIsPlaying(false);

    let recorder: MediaRecorder | null = null;
    let recordingStream: MediaStream | null = null;
    let cancelled = false;
    let frameId = 0;

    try {
      video.pause();
      video.currentTime = 0;
      await waitForVideoFrame(video);

      // The canvas must hold a correctly sized frame before `captureStream()`
      const painted = await renderFrame();
      if (!painted) {
        throw new Error('The video could not be decoded for processing.');
      }

      recordingStream = createCanvasRecordingStream(
        canvas,
        getSourceAudioTracks(video),
        EXPORT_FPS
      );
      if (!recordingStream) {
        throw new Error('This browser cannot capture the preview canvas.');
      }

      const chunks: BlobPart[] = [];
      // Codec availability differs per browser – probe before recording
      recorder = createMediaRecorder(recordingStream);
      const activeRecorder = recorder;
      const activeStream = recordingStream;

      const finished = new Promise<Blob>(resolve => {
        activeRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        activeRecorder.onstop = () => {
          // Only the canvas track belongs to us – the element audio tracks
          // stay alive so the clip can be exported again.
          activeStream.getVideoTracks().forEach(track => track.stop());
          resolve(new Blob(chunks, { type: activeRecorder.mimeType || 'video/webm' }));
        };
      });

      // Keep processing frames for the whole take
      const scheduleNext = () => {
        if (cancelled) return;
        frameId = window.requestAnimationFrame(renderLoop);
      };

      const renderLoop = () => {
        if (cancelled) return;
        renderFrame().then(() => {
          const duration = video.duration;
          if (Number.isFinite(duration) && duration > 0) {
            setProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
          }
          scheduleNext();
        }, scheduleNext);
      };

      activeRecorder.start(1000);
      frameId = window.requestAnimationFrame(renderLoop);
      await video.play().catch(() => undefined);

      // Record until the clip ends (or playback fails)
      await new Promise<void>(resolve => {
        const finish = () => {
          video.removeEventListener('ended', finish);
          video.removeEventListener('error', finish);
          resolve();
        };
        video.addEventListener('ended', finish);
        video.addEventListener('error', finish);
      });

      if (activeRecorder.state !== 'inactive') {
        activeRecorder.stop();
      }

      const blob = await finished;
      setProgress(100);

      if (blob.size > 0) {
        setProcessedBlob(blob);
        onProcessingComplete?.(blob);
      }
    } catch (error) {
      console.error('Error processing video:', error);
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      recordingStream?.getVideoTracks().forEach(track => track.stop());
    } finally {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadProcessedVideo = () => {
    const blob = processedBlob;
    if (!blob) return;

    const extension = blob.type.split('/')[1]?.split(';')[0] || 'webm';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-enhanced.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  /** Shares the enhanced clip via the Web Share API, or copies a link. */
  const shareProcessed = async () => {
    const blob = processedBlob;
    if (!blob) {
      setShareStatus('Process the clip before sharing.');
      return;
    }

    const extension = blob.type.split('/')[1]?.split(';')[0] || 'webm';
    const fileName = `ai-enhanced.${extension}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Enhanced Video',
          files: [new File([blob], fileName, { type: blob.type })]
        });
        return;
      } catch {
        // User dismissed the share sheet; fall back to copying a link.
      }
    }

    const url = URL.createObjectURL(blob);
    const copied = await copyToClipboard(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    setShareStatus(
      copied
        ? 'Link to the enhanced clip copied to your clipboard.'
        : 'Could not copy the share link in this browser.'
    );
    window.setTimeout(() => setShareStatus(null), 4000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Enhancement</h3>
        <button
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className={`p-2 rounded-lg ${
            showAdvancedSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
        />
        {/* Processed output – this canvas is what gets recorded on export */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <AIProcessingOverlay
          isVisible={isProcessing}
          progress={progress}
          message="Applying AI enhancements..."
        />

        {/* Playback Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex justify-between items-center">
            <button
              onClick={togglePlayback}
              disabled={isProcessing}
              className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <div className="flex space-x-2">
              <button
                onClick={shareProcessed}
                disabled={!processedBlob}
                title={processedBlob ? 'Share the enhanced clip' : 'Process the clip first'}
                className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={downloadProcessedVideo}
                disabled={!processedBlob}
                title={processedBlob ? 'Download the enhanced clip' : 'Apply AI enhancement first'}
                className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50 
                  disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {shareStatus && (
          <p className="text-xs text-white/90 mt-2 px-1">{shareStatus}</p>
        )}
      </div>

      {/* AI Features Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          AI Features
        </h4>
        <AIFeatureGrid
          enabledFeatures={features}
          onFeatureToggle={toggleFeature}
          isProcessing={isProcessing}
        />
      </div>

      {/* Process Button */}
      <div className="flex justify-end">
        <button
          onClick={processVideo}
          disabled={isProcessing}
          className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white rounded-lg 
            hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:opacity-50 
            disabled:cursor-not-allowed transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isProcessing ? 'Processing...' : 'Apply AI Enhancement'}</span>
        </button>
      </div>
    </div>
  );
};
