import React, { useState } from 'react';
import { useEditorStore } from '../../store';
import {
  Sliders, Palette, Gauge, Wand2, Layers, 
  SunMedium, Contrast, Droplets, Focus
} from 'lucide-react';

interface EffectPreset {
  name: string;
  settings: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpness: number;
    temperature: number;
    vignette: number;
    grain: number;
  };
}

export const AdvancedVideoEffects: React.FC = () => {
  const { videoEffects, updateVideoEffects } = useEditorStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const presets: EffectPreset[] = [
    {
      name: 'Cinematic',
      settings: {
        brightness: 0.9,
        contrast: 1.2,
        saturation: 0.8,
        blur: 0,
        sharpness: 1.2,
        temperature: 0.95,
        vignette: 0.3,
        grain: 0.1
      }
    },
    {
      name: 'Vintage',
      settings: {
        brightness: 0.85,
        contrast: 1.1,
        saturation: 0.7,
        blur: 1,
        sharpness: 0.9,
        temperature: 0.8,
        vignette: 0.4,
        grain: 0.3
      }
    },
    {
      name: 'Vibrant',
      settings: {
        brightness: 1.1,
        contrast: 1.3,
        saturation: 1.4,
        blur: 0,
        sharpness: 1.3,
        temperature: 1.1,
        vignette: 0,
        grain: 0
      }
    }
  ];

  const effects = [
    { name: 'Brightness', icon: SunMedium, param: 'brightness', min: 0, max: 2, step: 0.1 },
    { name: 'Contrast', icon: Contrast, param: 'contrast', min: 0, max: 2, step: 0.1 },
    { name: 'Saturation', icon: Droplets, param: 'saturation', min: 0, max: 2, step: 0.1 },
    { name: 'Sharpness', icon: Focus, param: 'sharpness', min: 0, max: 2, step: 0.1 },
    { name: 'Temperature', icon: Gauge, param: 'temperature', min: 0.5, max: 1.5, step: 0.1 },
    { name: 'Vignette', icon: Layers, param: 'vignette', min: 0, max: 1, step: 0.1 },
    { name: 'Film Grain', icon: Wand2, param: 'grain', min: 0, max: 1, step: 0.1 }
  ];

  const applyPreset = (preset: EffectPreset) => {
    updateVideoEffects(preset.settings);
    setActivePreset(preset.name);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Advanced Video Effects</h3>

      {/* Presets */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Presets</h4>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activePreset === preset.name 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Effect Controls */}
      <div className="space-y-4">
        {effects.map((effect) => {
          const Icon = effect.icon;
          return (
            <div key={effect.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{effect.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {Math.round(videoEffects[effect.param] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={effect.min}
                max={effect.max}
                step={effect.step}
                value={videoEffects[effect.param]}
                onChange={(e) => updateVideoEffects({
                  [effect.param]: parseFloat(e.target.value)
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                  accent-blue-600"
              />
            </div>
          );
        })}
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          updateVideoEffects({
            brightness: 1,
            contrast: 1,
            saturation: 1,
            blur: 0,
            sharpness: 1,
            temperature: 1,
            vignette: 0,
            grain: 0
          });
          setActivePreset(null);
        }}
        className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg
          hover:bg-gray-200 transition-colors"
      >
        Reset All Effects
      </button>
    </div>
  );
};