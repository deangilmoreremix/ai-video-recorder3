import React, { useState } from 'react';
import { 
  Camera, Brain, Sparkles, Layout, Focus, CloudFog,
  Zap, Wind, Palette, Gauge, Eye, Scan, Layers, 
  Scissors, RotateCcw, Crop, Wand2, Video, Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  component?: React.ReactNode;
}

interface AIFeatureSelectorProps {
  onFeatureSelect: (feature: string) => void;
  activeFeature: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const AIFeatureSelector: React.FC<AIFeatureSelectorProps> = ({
  onFeatureSelect,
  activeFeature,
  videoRef
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const features: AIFeature[] = [
    {
      id: 'faceDetection',
      name: 'Face Detection',
      description: 'Detect and track faces in real-time',
      icon: Camera
    },
    {
      id: 'facialLandmarks',
      name: 'Facial Landmarks',
      description: 'Track 468 facial points for precise facial analysis',
      icon: Eye
    },
    {
      id: 'handPose',
      name: 'Hand Tracking',
      description: 'Detect hand positions and gestures',
      icon: Layout
    },
    {
      id: 'bodySegmentation',
      name: 'Background Effects',
      description: 'Apply effects to video background',
      icon: Layers
    },
    {
      id: 'videoStabilization',
      name: 'Video Stabilization',
      description: 'Reduce camera shake and motion',
      icon: RotateCcw
    },
    {
      id: 'smartCropping',
      name: 'Smart Cropping',
      description: 'Automatically frame your video optimally',
      icon: Crop
    },
    {
      id: 'frameInterpolation',
      name: 'Frame Interpolation',
      description: 'Create smooth slow-motion by generating intermediate frames',
      icon: Video
    },
    {
      id: 'imageInpainting',
      name: 'Content Removal',
      description: 'Remove unwanted objects from your video',
      icon: Eraser
    }
  ];

  return (
    <div className="relative">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg p-4 w-48 z-20 overflow-hidden"
          >
            <div className="space-y-2">
              {features.map((feature) => (
                <Tooltip key={feature.id} content={feature.description}>
                  <button
                    onClick={() => {
                      onFeatureSelect(feature.id);
                      setIsExpanded(false);
                    }}
                    className={`w-full flex items-center p-2 rounded-lg text-left ${
                      activeFeature === feature.id
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <feature.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature.name}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3 rounded-full shadow-lg ${
          isExpanded || activeFeature
            ? 'bg-[#E44E51] text-white'
            : 'bg-white text-[#E44E51] hover:bg-[#E44E51]/10'
        } transition-colors`}
      >
        <Brain className="w-5 h-5" />
      </button>

      {/* Current active feature badge */}
      {activeFeature && !isExpanded && (
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          <span>1</span>
        </div>
      )}
    </div>
  );
};