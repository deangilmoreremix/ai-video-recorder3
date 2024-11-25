import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  SkipBack, SkipForward, X, Download, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaPreviewProps {
  url: string;
  type: 'video' | 'image' | 'audio';
  title: string;
  onClose: () => void;
  metadata?: {
    duration?: number;
    size?: number;
    resolution?: string;
    format?: string;
  };
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  url,
  type,
  title,
  onClose,
  metadata
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
      setDuration(mediaRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview */}
        <div className="relative bg-black aspect-video">
          {type === 'video' && (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={url}
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          {type === 'image' && (
            <img
              src={url}
              alt={title}
              className="w-full h-full object-contain"
            />
          )}
          {type === 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#E44E51] flex items-center justify-center">
                <Volume2 className="w-12 h-12 text-white" />
              </div>
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {(type === 'video' || type === 'audio') && (
            <>
              {/* Progress Bar */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E44E51]"
                />
                <span className="text-sm text-gray-500">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      if (mediaRef.current) {
                        mediaRef.current.currentTime -= 5;
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-3 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E]
                      shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (mediaRef.current) {
                        mediaRef.current.currentTime += 5;
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-gray-100 rounded-lg"
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
                      className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E44E51]"
                    />
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          {metadata && (
            <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {metadata.duration && (
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="font-medium">{formatTime(metadata.duration)}</p>
                </div>
              )}
              {metadata.size && (
                <div>
                  <span className="text-gray-500">Size</span>
                  <p className="font-medium">{formatFileSize(metadata.size)}</p>
                </div>
              )}
              {metadata.resolution && (
                <div>
                  <span className="text-gray-500">Resolution</span>
                  <p className="font-medium">{metadata.resolution}</p>
                </div>
              )}
              {metadata.format && (
                <div>
                  <span className="text-gray-500">Format</span>
                  <p className="font-medium">{metadata.format}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button className="px-4 py-2 flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button className="px-4 py-2 flex items-center space-x-2 bg-[#E44E51] text-white rounded-lg 
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25">
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};