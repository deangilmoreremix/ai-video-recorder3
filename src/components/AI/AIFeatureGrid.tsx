import React from 'react';
import { Camera, Sparkles, Focus, Wind, Palette, Gauge, Scan, Layers, Mic, AlertCircle, HandMetal, Smile, Monitor, Trash, Filter, Lightbulb, Send, Vibrate } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion } from 'framer-motion';
import { AIFeature, AI_FEATURE_REGISTRY } from '../../hooks/useAIFeatures';

const AI_FEATURE_ICONS: Record<string, React.ElementType> = {
  faceDetection: Camera,
  facialLandmarks: Scan,
  handPoseEstimation: HandMetal,
  poseEstimation: Vibrate,
  backgroundRemoval: Trash,
  backgroundBlur: Layers,
  gestureRecognition: Send,
  expressionDetection: Smile,
  autoFraming: Focus,
  enhancedLighting: Lightbulb,
  sceneDetection: Monitor,
  beautification: Sparkles,
  autoExposure: Filter,
  colorEnhancement: Palette,
  stabilization: Gauge,
  denoising: Wind,
  speechRecognition: Mic
};

interface AIFeatureGridProps {
  onFeatureToggle: (feature: string) => void;
  enabledFeatures: Record<string, AIFeature>;
  isProcessing?: boolean;
  compact?: boolean;
}

export const AIFeatureGrid: React.FC<AIFeatureGridProps> = ({ 
  onFeatureToggle, 
  enabledFeatures,
  isProcessing = false,
  compact = false
}) => {
  const features = AI_FEATURE_REGISTRY;

  // Filter the displayed features for compact mode
  const displayedFeatures = compact 
    ? features.slice(0, 9) // Just show the first 9 in compact mode
    : features;

  return (
    <div className="space-y-4">
      <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'} gap-3`}>
        {displayedFeatures.map(({ id, name, description }) => {
          const Icon = AI_FEATURE_ICONS[id] ?? Camera;
          const feature = enabledFeatures[id];
          const isEnabled = feature?.enabled;
          const isLoading = feature?.loading;
          const hasError = !!feature?.error;
          
          return (
            <Tooltip key={id} content={feature?.error || description}>
              <motion.button
                onClick={() => !isProcessing && onFeatureToggle(id)}
                disabled={isProcessing}
                whileHover={{ scale: isProcessing ? 1 : 1.03 }}
                whileTap={{ scale: isProcessing ? 1 : 0.97 }}
                className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                  isEnabled 
                    ? 'bg-[#E44E51]/10 border-[#E44E51] text-[#E44E51]' 
                    : hasError
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-white border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-6 h-6 mb-2" />
                <span className="text-xs text-center line-clamp-2">{name}</span>
                {(isProcessing || isLoading) && isEnabled && (
                  <div className="mt-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {hasError && !isLoading && (
                  <AlertCircle className="mt-2 w-4 h-4 text-red-500" />
                )}
              </motion.button>
            </Tooltip>
          );
        })}
      </div>

      {isProcessing && (
        <div className="text-center text-sm text-gray-500">
          Processing media with AI features...
        </div>
      )}
      
      {!compact && (
        <div className="text-center text-xs text-gray-500 italic">
          Enable AI features to enhance your video recording in real-time
        </div>
      )}
    </div>
  );
};