import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, Volume2, VolumeX, Maximize2, Minimize2, List, Sliders, Download, Loader, AlertCircle, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdvancedControls } from '../Controls/AdvancedControls';
import { VideoEditor } from '../Editor/VideoEditor';
import { EnhancedExport } from '../Export/EnhancedExport';
import { GifExport } from '../Export/GifExport';
import { useEditorStore } from '../../store';
import { buildCssFilter, buildOverlayStyle } from '../../utils/videoEffects';

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface VideoPlaybackProps {
  /**
   * A clip handed over from somewhere else in the app (e.g. "Edit" in the
   * recordings library). It is loaded into the player like an uploaded file.
   */
  source?: { url: string; title?: string } | null;
}

export const VideoPlayback: React.FC<VideoPlaybackProps> = ({ source = null }) => {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showEditor] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showGifExport, setShowGifExport] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { videoEffects, videoEffectsPreview } = useEditorStore();
  const effectFilter = useMemo(
    () => (videoEffectsPreview ? buildCssFilter(videoEffects) : ''),
    [videoEffects, videoEffectsPreview]
  );
  const effectOverlay = useMemo(
    () => buildOverlayStyle(videoEffectsPreview ? videoEffects : { ...videoEffects, vignette: 0, grain: 0, noise: 0, bloom: 0 }),
    [videoEffects, videoEffectsPreview]
  );

  // A clip handed in from the outside (recordings library) replaces the player
  // source; the blob is fetched so it can be exported/converted as well.
  useEffect(() => {
    if (!source?.url) return;

    let cancelled = false;
    setVideoUrl(source.url);
    setVideoBlob(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);

    fetch(source.url)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!cancelled && blob) setVideoBlob(blob);
      })
      .catch(() => {
        // Playback still works from the URL; only the export needs the bytes.
        if (!cancelled) setVideoBlob(null);
      });

    return () => {
      cancelled = true;
    };
  }, [source?.url]);

  // Release the object URL of the previously loaded file
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Keep the element volume/mute in sync with the controls
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Fullscreen can also be left with Esc – mirror the real state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (video.paused) {
      video.play().catch(() => {
        setError('Playback was blocked by the browser. Press play again.');
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      // Streamed/recorded files can report Infinity until fully buffered
      const videoDuration = videoRef.current.duration;
      setDuration(Number.isFinite(videoDuration) ? videoDuration : 0);
      setIsLoading(false);
      setError(null);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  const skipForward = () => {
    if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(() => {
        setError('Fullscreen is not available in this browser.');
      });
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Unsupported file type. Please choose a video file.');
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoUrl(url);
    setVideoBlob(file);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start space-x-2 p-3 rounded-lg border border-[#E44E51]/30 
          bg-[#E44E51]/10 text-sm text-[#E44E51]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative group">
          <div className="aspect-video bg-gray-900 relative">
            <video
              ref={videoRef}
              src={videoUrl ?? undefined}
              className="w-full h-full object-contain"
              style={{ filter: effectFilter || undefined }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setIsLoading(false);
                setIsPlaying(false);
                setError('This video could not be played. It may be corrupted or unsupported.');
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Vignette / grain / bloom cannot be expressed as CSS filters. */}
            {videoUrl && effectOverlay.vignette && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: effectOverlay.vignette }}
                aria-hidden="true"
              />
            )}
            {videoUrl && effectOverlay.grain && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage: effectOverlay.grain.image,
                  opacity: effectOverlay.grain.opacity
                }}
                aria-hidden="true"
              />
            )}
            {videoUrl && effectOverlay.bloomOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none mix-blend-screen"
                style={{
                  background:
                    'radial-gradient(circle at 50% 40%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
                  opacity: effectOverlay.bloomOpacity
                }}
                aria-hidden="true"
              />
            )}
            {!videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No video selected
              </div>
            )}

            {videoUrl && isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                <Loader className="w-8 h-8 animate-spin" />
              </div>
            )}

            {/* Hovering Upload Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
              transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-white text-center">
                <Upload className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Click to upload video</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent 
            opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {/* Scrub bar */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={Math.min(currentTime, duration || 0)}
              disabled={!videoUrl || duration <= 0}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                setCurrentTime(time);
                if (videoRef.current) videoRef.current.currentTime = time;
              }}
              aria-label="Seek"
              className="w-full mb-3 accent-[#E44E51] disabled:opacity-40"
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={skipBackward}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-40"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayback}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-40"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={skipForward}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-40"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <span className="text-xs text-white/90 tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-white hover:text-[#E44E51] transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 accent-[#E44E51]"
                  />
                </div>
                <button
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  className={`p-2 transition-colors ${
                    showAdvancedControls ? 'text-[#E44E51]' : 'text-white hover:text-[#E44E51]'
                  }`}
                  title="Advanced controls"
                >
                  <Sliders className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowExport(true)}
                  disabled={!videoBlob}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-40"
                  title="Export video"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowGifExport(true)}
                  disabled={!videoBlob}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-40"
                  title="Create an animated GIF"
                >
                  <Film className="w-5 h-5" />
                </button>
                <Link
                  to="/recordings"
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  <List className="w-5 h-5" />
                </Link>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls Panel */}
      {showAdvancedControls && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <AdvancedControls />
        </div>
      )}

      {/* Video Editor */}
      {showEditor && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <VideoEditor videoRef={videoRef} videoUrl={videoUrl} />
        </div>
      )}

      {/* Export Modal */}
      {showExport && videoBlob && (
        <EnhancedExport
          videoBlob={videoBlob}
          onClose={() => setShowExport(false)}
          isOpen={showExport}
        />
      )}

      {/* GIF Modal */}
      <GifExport
        videoBlob={videoBlob}
        isOpen={showGifExport && Boolean(videoBlob)}
        onClose={() => setShowGifExport(false)}
      />
    </div>
  );
};
