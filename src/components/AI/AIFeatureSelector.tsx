import React, { useState } from 'react';
import { X, Brain, Camera, Scan, HandMetal, Trash, Layers, Send, Smile, Focus, Lightbulb, Gauge, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import { AI_FEATURE_REGISTRY } from '../../hooks/useAIFeatures';

const AI_FEATURE_ICONS: Record<string, React.ElementType> = {
  faceDetection: Camera,
  facialLandmarks: Scan,
  handPoseEstimation: HandMetal,
  poseEstimation: Gauge,
  backgroundRemoval: Trash,
  backgroundBlur: Layers,
  gestureRecognition: Send,
  expressionDetection: Smile,
  autoFraming: Focus,
  enhancedLighting: Lightbulb,
  sceneDetection: Gauge,
  beautification: Sparkles,
  autoExposure: Gauge,
  colorEnhancement: Gauge,
  stabilization: Gauge,
  denoising: Gauge,
  speechRecognition: Gauge
};

interface AIFeatureSelectorProps {
  onFeatureSelect: (feature: string) => void;
  activeFeature: string | null;
  featureIcons?: Record<string, React.ElementType>;
}

export const AIFeatureSelector: React.FC<AIFeatureSelectorProps> = ({
  onFeatureSelect,
  activeFeature,
  featureIcons = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const mergedIcons = { ...AI_FEATURE_ICONS, ...featureIcons };

  const features = AI_FEATURE_REGISTRY.filter(f =>
    ['faceDetection', 'facialLandmarks', 'handPoseEstimation', 'backgroundBlur',
     'backgroundRemoval', 'expressionDetection', 'gestureRecognition', 'autoFraming',
     'beautification', 'enhancedLighting', 'stabilization'].includes(f.id)
  );

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
              {features.map((feature) => {
                const Icon = mergedIcons[feature.id] ?? Brain;
                return (
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
                      <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature.name}</span>
                    </button>
                  </Tooltip>
                );
              })}
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

      {activeFeature && !isExpanded && (
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          <span>1</span>
        </div>
      )}
    </div>
  );
};
