import React, { useState, useRef, useEffect } from 'react';
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
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative group">
          <div className="aspect-video bg-gray-900 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
            {!videoRef.current?.src && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No video selected
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
            opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={skipBackward}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayback}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={skipForward}
                  className="p-2 text-white hover:text-[#E44E51] transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
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
          <VideoEditor videoRef={videoRef} />
        </div>
      )}

      {/* Export Modal */}
      {showExport && videoRef.current && (
        <EnhancedExport
          videoBlob={new Blob([videoRef.current.src], { type: 'video/mp4' })}
          onClose={() => setShowExport(false)}
          isOpen={showExport}
        />
      )}
    </div>
  );
};