import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useEditorStore } from '../../store';

export const VideoPreview: React.FC = () => {
  const { currentProject } = useEditorStore();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="aspect-video bg-black relative">
        {currentProject?.timeline.clips[0]?.url ? (
          <video
            ref={videoRef}
            src={currentProject.timeline.clips[0].url}
            className="w-full h-full object-contain"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No video selected
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
              }
            }}
            className="p-2 text-white hover:text-blue-400 transition-colors"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={togglePlayback}
            className="p-2 text-white hover:text-blue-400 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(
                  videoRef.current.duration,
                  videoRef.current.currentTime + 5
                );
              }
            }}
            className="p-2 text-white hover:text-blue-400 transition-colors"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};