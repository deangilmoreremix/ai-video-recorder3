import React from 'react';
import { 
  Camera, Brain, Sparkles, Layout, Focus, CloudFog,
  Zap, Wind, Palette, Gauge, Eye, Scan
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
  beautification: Sparkles,
  backgroundBlur: Layout,
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
      description: 'Detect and track faces in real-time',
      icon: Camera
    },
    {
      id: 'beautification',
      name: 'Beautification',
      description: 'Enhance facial features automatically',
      icon: Sparkles
    },
    {
      id: 'backgroundBlur',
      name: 'Background Blur',
      description: 'Blur background while keeping subject in focus',
      icon: Layout
    },
    {
      id: 'autoFraming',
      name: 'Auto Framing',
      description: 'Automatically frame and follow subjects',
      icon: Focus
    },
    {
      id: 'expressionDetection',
      name: 'Expression Detection',
      description: 'Detect facial expressions and emotions',
      icon: Eye
    },
    {
      id: 'enhancedLighting',
      name: 'Enhanced Lighting',
      description: 'Automatically adjust lighting conditions',
      icon: CloudFog
    },
    {
      id: 'sceneDetection',
      name: 'Scene Detection',
      description: 'Detect and optimize for different scenes',
      icon: Brain
    },
    {
      id: 'noiseReduction',
      name: 'Noise Reduction',
      description: 'Reduce video and audio noise',
      icon: Wind
    },
    {
      id: 'colorEnhancement',
      name: 'Color Enhancement',
      description: 'Optimize colors and white balance',
      icon: Palette
    },
    {
      id: 'stabilization',
      name: 'Stabilization',
      description: 'Reduce camera shake and motion',
      icon: Gauge
    },
    {
      id: 'autoExposure',
      name: 'Auto Exposure',
      description: 'Dynamic exposure adjustment',
      icon: Zap
    },
    {
      id: 'denoising',
      name: 'Denoising',
      description: 'Advanced noise reduction',
      icon: Scan
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {aiFeatures.map((feature) => {
        const Icon = feature.icon;
        const isEnabled = features[feature.id]?.enabled;

        return (
          <Tooltip key={feature.id} content={feature.description}>
            <motion.button
              onClick={() => onToggleFeature(feature.id)}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                isEnabled 
                  ? 'bg-[#E44E51]/10 border-[#E44E51] text-[#E44E51]' 
                  : 'bg-white border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                />
              )}
            </motion.button>
          </Tooltip>
        );
      })}
    </div>
  );
};