import React, { useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  Download, Share2, X, Edit2, Clock, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useIntroStore } from '../../store/introStore';

interface IntroPreviewProps {
  templateId: string;
  onClose: () => void;
}

export const IntroPreview: React.FC<IntroPreviewProps> = ({
  templateId,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);

  const template = useIntroStore(state => 
    state.templates.find(t => t.id === templateId)
  );

  if (!template) return null;

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
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
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{template.name}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-gray-900">
          <img
            src={template.preview}
            alt={template.name}
            className="w-full h-full object-cover"
          />

          {/* Preview Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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

        {/* Template Info */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Duration</span>
              <p className="font-medium">{template.duration}s</p>
            </div>
            <div>
              <span className="text-gray-500">Category</span>
              <p className="font-medium capitalize">{template.category}</p>
            </div>
            <div>
              <span className="text-gray-500">Style</span>
              <p className="font-medium capitalize">{template.style}</p>
            </div>
            {template.isPremium && (
              <div>
                <span className="text-gray-500">License</span>
                <p className="font-medium text-yellow-600">Premium</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button className="px-4 py-2 flex items-center space-x-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button className="px-4 py-2 flex items-center space-x-2 bg-[#E44E51] text-white rounded-lg 
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25">
              <Download className="w-4 h-4" />
              <span>Use Template</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};