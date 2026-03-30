import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Download, Upload, Volume2, VolumeX, Maximize2, Minimize2,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEditorStore } from '../../store';
import { AdvancedControls } from '../Controls/AdvancedControls';
import { VideoEditor } from '../Editor/VideoEditor';
import { Tooltip } from '../ui/Tooltip';
import { EnhancedExport } from '../Export/EnhancedExport';

export const VideoPlayback: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Sync muted state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration || 0,
        videoRef.current.currentTime + 5
      );
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      
      // Clean up previous URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoBlob(file);
      
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
      
      setIsLoading(false);
    }
  }, [videoUrl]);

  const handleExport = useCallback(() => {
    if (videoBlob) {
      setShowExport(true);
    }
  }, [videoBlob]);

  const handleCloseExport = useCallback(() => {
    setShowExport(false);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = useCallback(() => {
    if (!videoUrl) {
      fileInputRef.current?.click();
    } else {
      togglePlayback();
    }
  }, [videoUrl, togglePlayback]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative group">
          <div className="aspect-video bg-gray-900 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onClick={handleVideoClick}
              preload="metadata"
            />
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* Empty State */}
            {!videoUrl && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-12 h-12 mb-2" />
                <p className="text-sm">Click to upload video</p>
                <p className="text-xs mt-1">or drag and drop</p>
              </div>
            )}

            {/* Play Button Overlay when paused */}
            {videoUrl && !isPlaying && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 rounded-full p-4 pointer-events-auto cursor-pointer"
                  onClick={togglePlayback}>
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
            )}

            {/* Hover Upload Overlay */}
            {videoUrl && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-white text-center">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Click to replace video</p>
                </div>
              </div>
            )}
            
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
            opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Progress Bar */}
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = parseFloat(e.target.value);
                  }
                }}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#E44E51]"
                disabled={!videoUrl}
              />
              <div className="flex justify-between text-xs text-white mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={skipBackward}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-50"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayback}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-50"
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
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    disabled={!videoUrl}
                    className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-50"
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
                    disabled={!videoUrl}
                  />
                </div>
                {videoBlob && (
                  <button
                    onClick={handleExport}
                    className="p-2 text-white hover:text-[#E44E51] transition-colors"
                    title="Export video"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
                <Link
                  to="/recordings"
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  <List className="w-5 h-5" />
                </Link>
                <button
                  onClick={toggleFullscreen}
                  disabled={!videoUrl}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors disabled:opacity-50"
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
      {showEditor && videoUrl && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <VideoEditor videoRef={videoRef} />
        </div>
      )}

      {/* Export Modal */}
      {showExport && videoBlob && (
        <EnhancedExport
          videoBlob={videoBlob}
          onClose={handleCloseExport}
          isOpen={showExport}
        />
      )}
    </div>
  );
};
