import React from 'react';
import { Brain, Sparkles, Scan, Layers, Wand2, Camera } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';

interface AIFeaturesProps {
  onFeatureToggle: (feature: string, enabled: boolean) => void;
  enabledFeatures: Record<string, boolean>;
  isProcessing?: boolean;
}

export const AIFeatures: React.FC<AIFeaturesProps> = ({ 
  onFeatureToggle, 
  enabledFeatures,
  isProcessing = false 
}) => {
  const features = [
    {
      id: 'contentAnalysis',
      name: 'Content Analysis',
      icon: Brain,
      description: 'Automatically analyze and tag content'
    },
    {
      id: 'sceneDetection',
      name: 'Scene Detection',
      icon: Scan,
      description: 'Detect and segment different scenes'
    },
    {
      id: 'styleTransfer',
      name: 'Style Transfer',
      icon: Wand2,
      description: 'Apply AI-powered visual styles'
    },
    {
      id: 'backgroundRemoval',
      name: 'Background Removal',
      icon: Layers,
      description: 'Automatically remove backgrounds'
    },
    {
      id: 'objectTracking',
      name: 'Object Tracking',
      icon: Camera,
      description: 'Track objects across frames'
    },
    {
      id: 'enhanceQuality',
      name: 'Enhance Quality',
      icon: Sparkles,
      description: 'AI-powered quality enhancement'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {features.map(({ id, name, icon: Icon, description }) => (
          <Tooltip key={id} content={description}>
            <button
              onClick={() => onFeatureToggle(id, !enabledFeatures[id])}
              disabled={isProcessing}
              className={`flex flex-col items-center p-4 rounded-lg border transition-colors ${
                enabledFeatures[id] 
                  ? 'bg-[#E44E51]/10 border-[#E44E51] text-[#E44E51]' 
                  : 'bg-white border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-6 h-6 mb-2" />
              <span className="text-sm text-center">{name}</span>
              {isProcessing && enabledFeatures[id] && (
                <div className="mt-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          </Tooltip>
        ))}
      </div>

      {isProcessing && (
        <div className="text-center text-sm text-gray-500">
          Processing media with AI features...
        </div>
      )}
    </div>
  );
};