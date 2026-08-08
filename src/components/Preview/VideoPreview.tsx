import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

export const VideoPreview: React.FC = () => {
  // The timeline clips live in the editor store
  const clips = useEditorStore((state) => state.clips);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const clipUrl = clips[0]?.url;

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

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="aspect-video bg-black relative">
        {clipUrl ? (
          <video
            ref={videoRef}
            src={clipUrl}
            className="w-full h-full object-contain"
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
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
              if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
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
