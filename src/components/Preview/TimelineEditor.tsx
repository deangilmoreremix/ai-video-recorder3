import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, Plus, ChevronRight, ChevronLeft, Clock, 
  Layers, Play, Pause, SkipBack, SkipForward, Maximize2 
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface TimelineEditorProps {
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  currentTime,
  duration,
  onTimeUpdate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [markers, setMarkers] = useState<number[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);

  const addMarker = () => {
    setMarkers([...markers, currentTime].sort((a, b) => a - b));
  };

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 5);
    onTimeUpdate(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 5);
    onTimeUpdate(newTime);
  };

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        if (currentTime >= duration) {
          setIsPlaying(false);
          return;
        }
        onTimeUpdate(currentTime + 0.1);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTime, duration, onTimeUpdate]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Tooltip content="Add marker at current position">
            <button
              onClick={addMarker}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Scissors className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Add new clip">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip content="Toggle waveform visualization">
            <button
              onClick={() => setShowWaveform(!showWaveform)}
              className={`p-2 rounded-lg ${
                showWaveform ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <Layers className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Toggle snap to grid">
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded-lg ${
                snapToGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Tooltip content="Skip backward 5 seconds">
            <button
              onClick={skipBackward}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <SkipBack className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content={isPlaying ? 'Pause' : 'Play'}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
          </Tooltip>
          <Tooltip content="Skip forward 5 seconds">
            <button
              onClick={skipForward}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative h-32 bg-gray-900 rounded-lg overflow-hidden"
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 w-full h-6 flex">
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div 
              key={i}
              className="flex-1 border-r border-gray-700 text-xs p-1 text-gray-400"
            >
              {i}s
            </div>
          ))}
        </div>

        {/* Markers */}
        {markers.map((time, index) => (
          <div
            key={index}
            className="absolute top-6 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${(time / duration) * 100}%` }}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-6 bottom-0 w-0.5 bg-blue-500"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Waveform visualization */}
        {showWaveform && (
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gray-800 opacity-50" />
        )}
      </div>

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <div>Current: {currentTime.toFixed(1)}s</div>
        <div>Duration: {duration.toFixed(1)}s</div>
      </div>
    </div>
  );
};