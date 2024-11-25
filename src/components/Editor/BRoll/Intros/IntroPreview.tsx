import React, { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';

interface IntroPreviewProps {
  templateData: {
    text: {
      title: string;
      subtitle: string;
      tagline: string;
    };
    style: {
      fontFamily: string;
      titleSize: number;
      alignment: string;
      animation: string;
      duration: number;
    };
    media: {
      background: File | null;
      logo: File | null;
      music: File | null;
      volume: number;
    };
  };
}

export const IntroPreview: React.FC<IntroPreviewProps> = ({ templateData }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

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

  const resetPreview = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
        >
          <source src="/preview.mp4" type="video/mp4" />
        </video>

        {/* Text Overlay */}
        <div 
          className={`absolute inset-0 flex flex-col items-${templateData.style.alignment} justify-center p-8`}
          style={{ fontFamily: templateData.style.fontFamily }}
        >
          <h1 
            className="text-4xl font-bold text-white mb-4"
            style={{ fontSize: `${templateData.style.titleSize}px` }}
          >
            {templateData.text.title}
          </h1>
          <h2 className="text-2xl text-gray-200 mb-2">
            {templateData.text.subtitle}
          </h2>
          <p className="text-lg text-gray-300">
            {templateData.text.tagline}
          </p>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={togglePlayback}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={resetPreview}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Duration: {templateData.style.duration}s
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
            Reset
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};