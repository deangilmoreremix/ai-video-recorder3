import React, { useRef, useEffect } from 'react';
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
    setCurrentTime
  } = useEditorStore();
  
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    const newTime = percentage * duration;
    
    setCurrentTime(Math.max(0, Math.min(duration, newTime)));
  };

  const formatTime = (seconds: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return hours > 0 
      ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
      : `${pad(minutes)}:${pad(secs)}`;
  };

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono">{formatTime(currentTime)}</span>
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Scissors className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 w-full h-6 flex">
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div 
              key={i}
              className="flex-1 border-r border-gray-700 text-xs p-1"
            >
              {formatTime(i)}
            </div>
          ))}
        </div>

        {/* Clips */}
        <div className="absolute top-6 left-0 w-full h-12">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="absolute h-full bg-blue-600 rounded cursor-move"
              style={{
                left: `${(clip.startTime / duration) * 100}%`,
                width: `${((clip.endTime - clip.startTime) / duration) * 100}%`
              }}
            />
          ))}
        </div>

        {/* Chapters */}
        <div className="absolute top-20 left-0 w-full h-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="absolute w-0.5 h-full bg-green-500"
              style={{
                left: `${(chapter.time / duration) * 100}%`
              }}
            >
              <div className="absolute top-full mt-1 text-xs transform -translate-x-1/2">
                {chapter.title}
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{
            left: `${(currentTime / duration) * 100}%`
          }}
        />
      </div>
    </div>
  );
};