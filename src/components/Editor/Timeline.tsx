import React, { useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Clock, Scissors, Plus, ChevronRight, ChevronLeft } from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    clips,
    currentTime,
    duration,
    chapters,
    captions,
    silentSegments,
    setCurrentTime,
    isPlaying,
    setIsPlaying
  } = useEditorStore();
  
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || duration <= 0) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickPosition / rect.width));
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
  }, [duration, setCurrentTime]);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const pad = (num: number) => Math.floor(num).toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return hours > 0 
      ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
      : `${pad(minutes)}:${pad(secs)}`;
  };

  // Safe percentage calculations with fallback
  const getClipPosition = useCallback((startTime: number): number => {
    if (duration <= 0) return 0;
    return (startTime / duration) * 100;
  }, [duration]);

  const getClipWidth = useCallback((startTime: number, endTime: number): number => {
    if (duration <= 0) return 0;
    return ((endTime - startTime) / duration) * 100;
  }, [duration]);

  const getChapterPosition = useCallback((time: number): number => {
    if (duration <= 0) return 0;
    return (time / duration) * 100;
  }, [duration]);

  const getPlayheadPosition = useCallback((): number => {
    if (duration <= 0 || currentTime <= 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Generate time markers
  const timeMarkers = useMemo(() => {
    if (duration <= 0) return [];
    
    const interval = duration > 3600 ? 60 : duration > 600 ? 30 : 10;
    const markers: number[] = [];
    
    for (let i = 0; i <= duration; i += interval) {
      markers.push(i);
    }
    
    // Always include the end
    if (markers[markers.length - 1] !== duration) {
      markers.push(duration);
    }
    
    return markers;
  }, [duration]);

  const handleSkipBackward = useCallback(() => {
    setCurrentTime(Math.max(0, currentTime - 10));
  }, [currentTime, setCurrentTime]);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(Math.min(duration, currentTime + 10));
  }, [currentTime, duration, setCurrentTime]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      {/* Timeline Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleSkipBackward}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Skip backward 10 seconds"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="p-2 bg-[#E44E51] hover:bg-[#D43B3E] rounded-lg transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          
          <button 
            onClick={handleSkipForward}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Skip forward 10 seconds"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <span className="font-mono text-lg">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Split clip">
            <Scissors className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Add clip">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline Track */}
      <div 
        ref={timelineRef}
        className="relative h-40 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 w-full h-6 flex border-b border-gray-700">
          {timeMarkers.map((time, index) => (
            <div 
              key={index}
              className="flex-shrink-0 border-r border-gray-600 text-xs text-gray-400 p-1"
              style={{ width: index === 0 ? '50px' : `${100 / timeMarkers.length}%` }}
            >
              {formatTime(time)}
            </div>
          ))}
        </div>

        {/* Clips Track */}
        <div className="absolute top-8 left-0 w-full h-12 px-1">
          {clips.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No clips added. Click to add media or import files.
            </div>
          ) : (
            clips.map((clip) => (
              <div
                key={clip.id}
                className="absolute h-full bg-blue-600 rounded cursor-move hover:bg-blue-500 transition-colors"
                style={{
                  left: `${getClipPosition(clip.startTime)}%`,
                  width: `${getClipWidth(clip.startTime, clip.endTime)}%`
                }}
                title={`${clip.type} clip: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
              />
            ))
          )}
        </div>

        {/* Silent Segments Track */}
        <div className="absolute top-22 left-0 w-full h-4 px-1">
          {silentSegments.map((segment) => (
            <div
              key={segment.id}
              className="absolute h-full bg-yellow-500/30"
              style={{
                left: `${getClipPosition(segment.startTime)}%`,
                width: `${getClipWidth(segment.startTime, segment.endTime)}%`
              }}
              title="Silent segment"
            />
          ))}
        </div>

        {/* Chapters Track */}
        <div className="absolute top-28 left-0 w-full h-8 px-1">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="absolute w-0.5 h-full bg-green-500"
              style={{
                left: `${getChapterPosition(chapter.time)}%`
              }}
            >
              <div className="absolute top-full mt-1 text-xs text-green-400 transform -translate-x-1/2 whitespace-nowrap">
                {chapter.title}
              </div>
            </div>
          ))}
        </div>

        {/* Captions Track */}
        <div className="absolute top-36 left-0 w-full h-4 px-1">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="absolute h-full bg-purple-500/50 rounded"
              style={{
                left: `${getClipPosition(caption.startTime)}%`,
                width: `${getClipWidth(caption.startTime, caption.endTime)}%`
              }}
              title={caption.text}
            />
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{
            left: `${getPlayheadPosition()}%`
          }}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Empty State Info */}
      {duration <= 0 && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          Load a video to see the timeline
        </div>
      )}
    </div>
  );
};

export default Timeline;
