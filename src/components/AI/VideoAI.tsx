import React, { useState, useEffect } from 'react';
import { Camera, Wand2, Sliders, Brain, Sparkles, Scan, Layers } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  processing?: boolean;
  settings?: Record<string, any>;
}

export const VideoAI: React.FC = () => {
  const [features, setFeatures] = useState<AIFeature[]>([
    {
      id: 'faceDetection',
      name: 'Face Detection',
      description: 'Detect and track faces in video',
      icon: Camera,
      enabled: false,
      settings: {
        sensitivity: 0.8,
        minSize: 30,
        tracking: true
      }
    },
    {
      id: 'objectDetection',
      name: 'Object Detection',
      description: 'Identify and track objects',
      icon: Scan,
      enabled: false,
      settings: {
        confidence: 0.6,
        classes: ['person', 'car', 'animal']
      }
    },
    {
      id: 'backgroundRemoval',
      name: 'Background Removal',
      description: 'AI-powered background removal',
      icon: Layers,
      enabled: false,
      settings: {
        mode: 'precise',
        feathering: 2,
        threshold: 0.8
      }
    },
    {
      id: 'styleTransfer',
      name: 'Style Transfer',
      description: 'Apply AI art styles to video',
      icon: Wand2,
      enabled: false,
      settings: {
        style: 'cinematic',
        intensity: 0.7
      }
    },
    {
      id: 'autoEnhance',
      name: 'Auto Enhance',
      description: 'AI-powered video enhancement',
      icon: Sparkles,
      enabled: false,
      settings: {
        brightness: true,
        contrast: true,
        sharpness: true,
        denoise: true
      }
    },
    {
      id: 'sceneDetection',
      name: 'Scene Detection',
      description: 'Automatically detect scene changes',
      icon: Brain,
      enabled: false,
      settings: {
        sensitivity: 0.5,
        minSceneDuration: 2
      }
    }
  ]);

  const toggleFeature = (id: string) => {
    setFeatures(features.map(feature =>
      feature.id === id ? { ...feature, enabled: !feature.enabled } : feature
    ));
  };

  const updateFeatureSettings = (id: string, settings: Record<string, any>) => {
    setFeatures(features.map(feature =>
      feature.id === id ? { ...feature, settings: { ...feature.settings, ...settings } } : feature
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">AI Features</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Tooltip key={feature.id} content={feature.description}>
              <div className="relative">
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    feature.enabled 
                      ? 'bg-blue-50 text-blue-600 border-blue-200 border' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{feature.name}</div>
                    {feature.enabled && feature.settings && (
                      <div className="text-xs mt-1 text-gray-500">
                        {Object.entries(feature.settings).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {typeof value === 'boolean' ? (value ? 'On' : 'Off') : value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {feature.processing && (
                    <div className="absolute right-2 top-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    </div>
                  )}
                </button>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Active Features Panel */}
      {features.some(f => f.enabled) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Features</h4>
          <div className="space-y-3">
            {features.filter(f => f.enabled).map((feature) => (
              <div key={feature.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600">{feature.name}</span>
                </div>
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Disable
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {features.some(f => f.enabled) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Feature Settings</h4>
          {features.filter(f => f.enabled).map((feature) => (
            <div key={feature.id} className="mb-4 last:mb-0">
              <h5 className="text-sm font-medium mb-2">{feature.name}</h5>
              <div className="space-y-2">
                {Object.entries(feature.settings || {}).map(([key, value]) => (
                  <div key={key}>
                    {typeof value === 'boolean' ? (
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updateFeatureSettings(feature.id, {
                            [key]: e.target.checked
                          })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      </label>
                    ) : typeof value === 'number' ? (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={value}
                          onChange={(e) => updateFeatureSettings(feature.id, {
                            [key]: parseFloat(e.target.value)
                          })}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                        <select
                          value={value}
                          onChange={(e) => updateFeatureSettings(feature.id, {
                            [key]: e.target.value
                          })}
                          className="w-full rounded-lg border-gray-300 text-sm"
                        >
                          {Array.isArray(value) ? (
                            value.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};