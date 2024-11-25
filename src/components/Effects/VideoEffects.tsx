import React, { useState } from 'react';
import {
  Wand2, Droplets, Sun, Contrast, Palette, Sparkles, CloudFog, Wind,
  Sliders, Layers, Gauge, Fingerprint, Lightbulb, Aperture, Zap, Flame,
  Snowflake, Rainbow, Filter, Maximize, Save, RotateCcw, Play, Eye,
  Film, Camera, Brush, Eraser, Pipette, Crop, Shuffle, Undo, Redo,
  Loader, Download, Upload, Share2, History, Bookmark, Star
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useEditorStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';

interface EffectPreset {
  name: string;
  icon: any;
  description: string;
  settings: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpness: number;
    temperature: number;
    vignette: number;
    grain: number;
    hue: number;
    sepia: number;
    noise: number;
    bloom: number;
    clarity: number;
    vibrance: number;
    exposure: number;
    gamma: number;
    highlights: number;
    shadows: number;
    whites: number;
    blacks: number;
  };
}

export const VideoEffects: React.FC = () => {
  const { videoEffects, updateVideoEffects } = useEditorStore();
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const presets: EffectPreset[] = [
    {
      name: 'Cinematic',
      icon: Film,
      description: 'Professional movie-like color grading',
      settings: {
        brightness: 0.9,
        contrast: 1.2,
        saturation: 0.8,
        blur: 0,
        sharpness: 1.2,
        temperature: 0.95,
        vignette: 0.3,
        grain: 0.1,
        hue: 0,
        sepia: 0.1,
        noise: 0.05,
        bloom: 0.2,
        clarity: 1.1,
        vibrance: 1.1,
        exposure: 0,
        gamma: 1,
        highlights: -0.1,
        shadows: 0.1,
        whites: -0.1,
        blacks: 0.1
      }
    },
    {
      name: 'Vintage',
      icon: Camera,
      description: 'Classic retro film look',
      settings: {
        brightness: 0.85,
        contrast: 1.1,
        saturation: 0.7,
        blur: 1,
        sharpness: 0.9,
        temperature: 0.8,
        vignette: 0.4,
        grain: 0.3,
        hue: 15,
        sepia: 0.3,
        noise: 0.2,
        bloom: 0.1,
        clarity: 0.9,
        vibrance: 0.8,
        exposure: -0.1,
        gamma: 1.1,
        highlights: -0.2,
        shadows: 0.2,
        whites: -0.2,
        blacks: 0.2
      }
    },
    {
      name: 'Vibrant',
      icon: Sparkles,
      description: 'Enhanced colors and contrast',
      settings: {
        brightness: 1.1,
        contrast: 1.3,
        saturation: 1.4,
        blur: 0,
        sharpness: 1.3,
        temperature: 1.1,
        vignette: 0,
        grain: 0,
        hue: 0,
        sepia: 0,
        noise: 0,
        bloom: 0.3,
        clarity: 1.2,
        vibrance: 1.4,
        exposure: 0.1,
        gamma: 0.9,
        highlights: 0.2,
        shadows: -0.1,
        whites: 0.2,
        blacks: -0.1
      }
    }
  ];

  const effectCategories = [
    {
      name: 'Basic',
      effects: [
        { name: 'Brightness', icon: Sun, param: 'brightness', min: 0, max: 2, step: 0.1 },
        { name: 'Contrast', icon: Contrast, param: 'contrast', min: 0, max: 2, step: 0.1 },
        { name: 'Saturation', icon: Droplets, param: 'saturation', min: 0, max: 2, step: 0.1 },
        { name: 'Exposure', icon: Sun, param: 'exposure', min: -1, max: 1, step: 0.1 }
      ]
    },
    {
      name: 'Color',
      effects: [
        { name: 'Temperature', icon: Flame, param: 'temperature', min: 0.5, max: 1.5, step: 0.1 },
        { name: 'Hue', icon: Palette, param: 'hue', min: -180, max: 180, step: 1 },
        { name: 'Vibrance', icon: Rainbow, param: 'vibrance', min: 0, max: 2, step: 0.1 },
        { name: 'Sepia', icon: Brush, param: 'sepia', min: 0, max: 1, step: 0.1 }
      ]
    },
    {
      name: 'Detail',
      effects: [
        { name: 'Sharpness', icon: Aperture, param: 'sharpness', min: 0, max: 2, step: 0.1 },
        { name: 'Clarity', icon: Fingerprint, param: 'clarity', min: 0, max: 2, step: 0.1 },
        { name: 'Noise', icon: Snowflake, param: 'noise', min: 0, max: 1, step: 0.1 },
        { name: 'Bloom', icon: Sparkles, param: 'bloom', min: 0, max: 1, step: 0.1 }
      ]
    },
    {
      name: 'Effects',
      effects: [
        { name: 'Vignette', icon: Layers, param: 'vignette', min: 0, max: 1, step: 0.1 },
        { name: 'Film Grain', icon: Wind, param: 'grain', min: 0, max: 1, step: 0.1 },
        { name: 'Blur', icon: CloudFog, param: 'blur', min: 0, max: 10, step: 0.5 },
        { name: 'Gamma', icon: Sliders, param: 'gamma', min: 0.5, max: 2, step: 0.1 }
      ]
    },
    {
      name: 'Tone',
      effects: [
        { name: 'Highlights', icon: Sun, param: 'highlights', min: -1, max: 1, step: 0.1 },
        { name: 'Shadows', icon: CloudFog, param: 'shadows', min: -1, max: 1, step: 0.1 },
        { name: 'Whites', icon: Maximize, param: 'whites', min: -1, max: 1, step: 0.1 },
        { name: 'Blacks', icon: Filter, param: 'blacks', min: -1, max: 1, step: 0.1 }
      ]
    }
  ];

  const applyPreset = (preset: EffectPreset) => {
    const prevSettings = { ...videoEffects };
    updateVideoEffects(preset.settings);
    addToHistory(prevSettings);
  };

  const addToHistory = (settings: any) => {
    const newHistory = [...history.slice(0, historyIndex + 1), settings];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      updateVideoEffects(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      updateVideoEffects(history[historyIndex + 1]);
    }
  };

  const savePreset = async () => {
    setIsSaving(true);
    try {
      // Save preset logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Success notification would go here
    } catch (error) {
      // Error handling would go here
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = (presetName: string) => {
    setFavorites(prev => 
      prev.includes(presetName)
        ? prev.filter(name => name !== presetName)
        : [...prev, presetName]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Video Effects</h3>
        <div className="flex space-x-2">
          <Tooltip content="Toggle effect preview">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded-lg ${
                showPreview ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Eye className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Undo">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <Undo className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Redo">
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <Redo className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Reset all effects">
            <button
              onClick={() => {
                const prevSettings = { ...videoEffects };
                updateVideoEffects({
                  brightness: 1,
                  contrast: 1,
                  saturation: 1,
                  blur: 0,
                  sharpness: 1,
                  temperature: 1,
                  vignette: 0,
                  grain: 0,
                  hue: 0,
                  sepia: 0,
                  noise: 0,
                  bloom: 0,
                  clarity: 1,
                  vibrance: 1,
                  exposure: 0,
                  gamma: 1,
                  highlights: 0,
                  shadows: 0,
                  whites: 0,
                  blacks: 0
                });
                addToHistory(prevSettings);
                setActiveEffect(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isFavorite = favorites.includes(preset.name);
          return (
            <Tooltip key={preset.name} content={preset.description}>
              <div className="relative group">
                <button
                  onClick={() => applyPreset(preset)}
                  className="w-full flex flex-col items-center p-4 rounded-lg border border-gray-200 
                    hover:border-[#E44E51] hover:bg-[#E44E51]/5 transition-colors"
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">{preset.name}</span>
                </button>
                <button
                  onClick={() => toggleFavorite(preset.name)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-lg
                    opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star className={`w-4 h-4 ${
                    isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                  }`} />
                </button>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Effect Categories */}
      <div className="space-y-6">
        {effectCategories.map((category) => (
          <div key={category.name}>
            <h4 className="text-sm font-medium text-gray-700 mb-3">{category.name}</h4>
            <div className="space-y-4">
              {category.effects.map((effect) => {
                const Icon = effect.icon;
                return (
                  <div key={effect.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">{effect.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {Math.round(videoEffects[effect.param] * 100)}%
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={effect.min}
                        max={effect.max}
                        step={effect.step}
                        value={videoEffects[effect.param]}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value);
                          const prevSettings = { ...videoEffects };
                          updateVideoEffects({
                            [effect.param]: newValue
                          });
                          addToHistory(prevSettings);
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                          accent-[#E44E51]"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{effect.min}</span>
                        <span>{effect.max}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save Preset Button */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={savePreset}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
            transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin inline-block mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4 inline-block mr-2" />
              Save as Preset
            </>
          )}
        </button>
        <button
          className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
            transition-colors shadow-lg hover:shadow-[#E44E51]/25"
        >
          Apply Effects
        </button>
      </div>
    </div>
  );
};