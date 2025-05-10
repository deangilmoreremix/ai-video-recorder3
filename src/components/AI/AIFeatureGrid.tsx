import React from 'react';
import { 
  Camera, Brain, Sparkles, Layout, Focus, CloudFog,
  Zap, Wind, Palette, Gauge, Eye, Scan, Layers
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion } from 'framer-motion';

interface AIFeature {
  id: keyof typeof featureIcons;
  name: string;
  description: string;
  icon: any;
}

const featureIcons = {
  faceDetection: Camera,
  facialLandmarks: Eye,
  handPoseEstimation: Layout,
  bodyPoseEstimation: Zap,
  objectDetection: Scan,
  beautification: Sparkles,
  backgroundBlur: Layers,
  autoFraming: Focus,
  expressionDetection: Eye,
  enhancedLighting: CloudFog,
  sceneDetection: Brain,
  noiseReduction: Wind,
  colorEnhancement: Palette,
  stabilization: Gauge,
  autoExposure: Zap,
  denoising: Scan
};

const featureDescriptions = {
  faceDetection: 'Detect and track faces in real-time',
  facialLandmarks: 'Identify 468 facial landmark points for precise tracking',
  handPoseEstimation: 'Track hand positions and gestures',
  bodyPoseEstimation: 'Track full body positions and movements',
  objectDetection: 'Identify and track objects in the scene',
  beautification: 'Enhance facial features automatically',
  backgroundBlur: 'Blur background while keeping subject in focus',
  autoFraming: 'Automatically frame and follow subjects',
  expressionDetection: 'Detect facial expressions and emotions',
  enhancedLighting: 'Automatically adjust lighting conditions',
  sceneDetection: 'Detect and optimize for different scenes',
  noiseReduction: 'Reduce video and audio noise',
  colorEnhancement: 'Optimize colors and white balance',
  stabilization: 'Reduce camera shake and motion',
  autoExposure: 'Dynamic exposure adjustment',
  denoising: 'Advanced noise reduction'
};

interface AIFeatureGridProps {
  features: Record<string, { enabled: boolean; sensitivity: number }>;
  onToggleFeature: (featureId: string) => void;
  onUpdateSettings?: (featureId: string, settings: any) => void;
  isProcessing?: boolean;
}

export const AIFeatureGrid: React.FC<AIFeatureGridProps> = ({
  features,
  onToggleFeature,
  onUpdateSettings,
  isProcessing = false
}) => {
  const aiFeatures: AIFeature[] = [
    {
      id: 'faceDetection',
      name: 'Face Detection',
      description: featureDescriptions.faceDetection,
      icon: featureIcons.faceDetection
    },
    {
      id: 'facialLandmarks',
      name: 'Facial Landmarks',
      description: featureDescriptions.facialLandmarks,
      icon: featureIcons.facialLandmarks
    },
    {
      id: 'handPoseEstimation',
      name: 'Hand Tracking',
      description: featureDescriptions.handPoseEstimation,
      icon: featureIcons.handPoseEstimation
    },
    {
      id: 'backgroundBlur',
      name: 'Background Blur',
      description: featureDescriptions.backgroundBlur,
      icon: featureIcons.backgroundBlur
    },
    {
      id: 'expressionDetection',
      name: 'Expression Detection',
      description: featureDescriptions.expressionDetection,
      icon: featureIcons.expressionDetection
    },
    {
      id: 'enhancedLighting',
      name: 'Enhanced Lighting',
      description: featureDescriptions.enhancedLighting,
      icon: featureIcons.enhancedLighting
    },
    {
      id: 'objectDetection',
      name: 'Object Detection',
      description: featureDescriptions.objectDetection,
      icon: featureIcons.objectDetection
    },
    {
      id: 'noiseReduction',
      name: 'Noise Reduction',
      description: featureDescriptions.noiseReduction,
      icon: featureIcons.noiseReduction
    },
    {
      id: 'colorEnhancement',
      name: 'Color Enhancement',
      description: featureDescriptions.colorEnhancement,
      icon: featureIcons.colorEnhancement
    },
    {
      id: 'stabilization',
      name: 'Stabilization',
      description: featureDescriptions.stabilization,
      icon: featureIcons.stabilization
    },
    {
      id: 'autoExposure',
      name: 'Auto Exposure',
      description: featureDescriptions.autoExposure,
      icon: featureIcons.autoExposure
    },
    {
      id: 'denoising',
      name: 'Denoising',
      description: featureDescriptions.denoising,
      icon: featureIcons.denoising
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {aiFeatures.map((feature) => {
        const Icon = feature.icon;
        const isEnabled = features[feature.id]?.enabled;
        const isDisabled = isProcessing || 
                          (feature.id === 'facialLandmarks' && !features['faceDetection']?.enabled);

        return (
          <Tooltip key={feature.id} content={feature.description}>
            <motion.button
              onClick={() => !isDisabled && onToggleFeature(feature.id)}
              disabled={isDisabled}
              whileHover={{ scale: isDisabled ? 1 : 1.02 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
              className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                isEnabled 
                  ? 'bg-[#E44E51]/10 border-[#E44E51] text-[#E44E51]' 
                  : 'bg-white border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-6 h-6 mb-2" />
              <span className="text-sm text-center font-medium">{feature.name}</span>
              {onUpdateSettings && isEnabled && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={features[feature.id]?.sensitivity || 0.5}
                  onChange={(e) => onUpdateSettings(feature.id, {
                    sensitivity: parseFloat(e.target.value)
                  })}
                  className="w-full mt-2 accent-[#E44E51]"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {isProcessing && isEnabled && (
                <div className="mt-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </motion.button>
          </Tooltip>
        );
      })}
    </div>
  );
};