import React from 'react';
import { Brain, Sparkles, Scan, Layers } from 'lucide-react';
import { Tooltip } from '../../../ui/Tooltip';

interface AIFeaturesProps {
  onFeatureToggle: (feature: string, enabled: boolean) => void;
  enabledFeatures: Record<string, boolean>;
}

export const AIFeatures: React.FC<AIFeaturesProps> = ({ onFeatureToggle, enabledFeatures }) => {
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
      icon: Sparkles,
      description: 'Apply AI-powered visual styles'
    },
    {
      id: 'backgroundRemoval',
      name: 'Background Removal',
      icon: Layers,
      description: 'Automatically remove backgrounds'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {features.map(({ id, name, icon: Icon, description }) => (
        <Tooltip key={id} content={description}>
          <button
            onClick={() => onFeatureToggle(id, !enabledFeatures[id])}
            className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
              enabledFeatures[id] 
                ? 'bg-blue-50 text-blue-600' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{name}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
};