import React from 'react';
import { 
  Camera, Brain, Sparkles, Layout, Focus, CloudFog,
  Zap, Wind, Palette, Gauge, Eye, Scan, Layers,
  Mic, AlertCircle, HandMetal, Smile, Monitor, Trash,
  Video, Megaphone, Maximize, Filter, Image, Lightbulb,
  Wand2, Send, ArrowUp, Vibrate, Film
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion } from 'framer-motion';
import { AIFeature } from '../../hooks/useAIFeatures';

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
  const features = [
    {
      id: 'faceDetection',
      name: 'Face Detection',
      icon: Camera,
      description: 'Detect and track faces in real-time'
    },
    {
      id: 'facialLandmarks',
      name: 'Facial Landmarks',
      icon: Scan,
      description: 'Identify facial points for precise tracking'
    },
    {
      id: 'handPoseEstimation',
      name: 'Hand Tracking',
      icon: HandMetal,
      description: 'Track hand positions and gestures'
    },
    {
      id: 'poseEstimation',
      name: 'Pose Estimation',
      icon: Vibrate,
      description: 'Track full body positions and movements'
    },
    {
      id: 'backgroundRemoval',
      name: 'Background Removal',
      icon: Trash,
      description: 'Remove background completely'
    },
    {
      id: 'backgroundBlur',
      name: 'Background Blur',
      icon: Layers,
      description: 'Blur background while keeping subject in focus'
    },
    {
      id: 'gestureRecognition',
      name: 'Gesture Control',
      icon: Send,
      description: 'Control recording with hand gestures'
    },
    {
      id: 'expressionDetection',
      name: 'Expression Detection',
      icon: Smile,
      description: 'Detect facial expressions and emotions'
    },
    {
      id: 'autoFraming',
      name: 'Auto Framing',
      icon: Focus,
      description: 'Automatically frame and follow subjects'
    },
    {
      id: 'enhancedLighting',
      name: 'Enhanced Lighting',
      icon: Lightbulb,
      description: 'Automatically adjust lighting conditions'
    },
    {
      id: 'sceneDetection',
      name: 'Scene Detection',
      icon: Monitor,
      description: 'Detect and optimize for different scenes'
    },
    {
      id: 'beautification',
      name: 'Beautification',
      icon: Sparkles,
      description: 'Enhance facial features automatically'
    },
    {
      id: 'styleTransfer',
      name: 'Style Transfer',
      icon: Wand2,
      description: 'Apply artistic styles to your video'
    },
    {
      id: 'autoExposure',
      name: 'Auto Exposure',
      icon: Filter,
      description: 'Dynamic exposure adjustment'
    },
    {
      id: 'colorEnhancement',
      name: 'Color Enhancement',
      icon: Palette,
      description: 'Optimize colors and white balance'
    },
    {
      id: 'stabilization',
      name: 'Stabilization',
      icon: Gauge,
      description: 'Reduce camera shake and motion'
    },
    {
      id: 'noiseReduction',
      name: 'Noise Reduction',
      icon: Wind,
      description: 'Reduce video noise'
    },
    {
      id: 'speechRecognition',
      name: 'Speech Recognition',
      icon: Mic,
      description: 'Generate real-time captions'
    },
    {
      id: 'sentimentAnalysis',
      name: 'Sentiment Analysis',
      icon: AlertCircle,
      description: 'Analyze emotional tone in speech'
    },
    {
      id: 'superResolution',
      name: 'Super Resolution',
      icon: Maximize,
      description: 'Improve video quality automatically'
    }
  ];

  // Filter the displayed features for compact mode
  const displayedFeatures = compact 
    ? features.slice(0, 9) // Just show the first 9 in compact mode
    : features;

  return (
    <div className="space-y-4">
      <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'} gap-3`}>
        {displayedFeatures.map(({ id, name, icon: Icon, description }) => {
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