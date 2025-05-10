import React, { useState } from 'react';
import { 
  Brain, Sparkles, Layout, Focus, CloudFog, Zap, 
  Wind, Palette, Gauge, Eye, Scan, Settings, X, 
  Camera, Layers, Send, Smile, ArrowUp, Filter, 
  Mic, Monitor, Trash, HandMetal, Maximize, Film,
  Lightbulb, Video, AlertCircle, Vibrate, Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

const DEFAULT_FEATURE_ICONS = {
  faceDetection: Camera,
  facialLandmarks: Scan,
  handPoseEstimation: HandMetal,
  poseEstimation: ArrowUp,
  backgroundRemoval: Trash,
  backgroundBlur: Layers,
  gestureRecognition: Send,
  expressionDetection: Smile,
  autoFraming: Focus,
  enhancedLighting: Lightbulb,
  sceneDetection: Monitor,
  beautification: Sparkles,
  styleTransfer: Wand2,
  autoExposure: Filter,
  colorEnhancement: Palette,
  stabilization: Gauge,
  noiseReduction: Wind,
  speechRecognition: Mic,
  sentimentAnalysis: AlertCircle,
  superResolution: Maximize,
  sceneSegmentation: Layout,
  denoising: Film
};

interface AIFeatureSelectorProps {
  onFeatureSelect: (feature: string) => void;
  activeFeature: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  featureIcons?: Record<string, React.ElementType>;
}

export const AIFeatureSelector: React.FC<AIFeatureSelectorProps> = ({
  onFeatureSelect,
  activeFeature,
  videoRef,
  featureIcons = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const mergedIcons = { ...DEFAULT_FEATURE_ICONS, ...featureIcons };

  const features = [
    {
      id: 'faceDetection',
      name: 'Face Detection',
      description: 'Detect and track faces in real-time',
      icon: mergedIcons.faceDetection
    },
    {
      id: 'facialLandmarks',
      name: 'Facial Landmarks',
      description: 'Track 468 facial points for precise facial analysis',
      icon: mergedIcons.facialLandmarks
    },
    {
      id: 'handPoseEstimation',
      name: 'Hand Tracking',
      description: 'Detect hand positions and gestures',
      icon: mergedIcons.handPoseEstimation
    },
    {
      id: 'backgroundBlur',
      name: 'Background Blur',
      description: 'Apply blur effect to video background',
      icon: mergedIcons.backgroundBlur
    },
    {
      id: 'backgroundRemoval',
      name: 'Background Removal',
      description: 'Remove background completely',
      icon: mergedIcons.backgroundRemoval
    },
    {
      id: 'expressionDetection',
      name: 'Expression Detection',
      description: 'Detect facial expressions and emotions',
      icon: mergedIcons.expressionDetection
    },
    {
      id: 'gestureRecognition',
      name: 'Gesture Recognition',
      description: 'Control recording with hand gestures',
      icon: mergedIcons.gestureRecognition
    },
    {
      id: 'autoFraming',
      name: 'Auto Framing',
      description: 'Automatically frame and follow subjects',
      icon: mergedIcons.autoFraming
    },
    {
      id: 'beautification',
      name: 'Beautification',
      description: 'Enhance facial features automatically',
      icon: mergedIcons.beautification
    },
    {
      id: 'enhancedLighting',
      name: 'Enhanced Lighting',
      description: 'Automatically adjust lighting conditions',
      icon: mergedIcons.enhancedLighting
    },
    {
      id: 'styleTransfer',
      name: 'Style Transfer',
      description: 'Apply artistic styles to your video',
      icon: mergedIcons.styleTransfer
    },
    {
      id: 'stabilization',
      name: 'Stabilization',
      description: 'Reduce camera shake and motion',
      icon: mergedIcons.stabilization
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
            className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg p-4 w-64 z-20 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium">AI Features</h4>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
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