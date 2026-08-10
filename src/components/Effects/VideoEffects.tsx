import React, { useEffect, useMemo, useState } from 'react';
import { Droplets, Sun, Contrast, Palette, Sparkles, CloudFog, Wind, Sliders, Layers, Fingerprint, Aperture, Flame, Snowflake, Rainbow, Filter, Maximize, RotateCcw, Eye, EyeOff, Film, Camera, Brush, Undo, Redo, Bookmark, Star, Trash2, Check, type LucideIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useEditorStore, defaultVideoEffects, type VideoEffectSettings } from '../../store';
import {
  buildCssFilter,
  deleteEffectPreset,
  hasActiveEffects,
  loadEffectPresets,
  saveEffectPreset,
  type StoredEffectPreset
} from '../../utils/videoEffects';

interface EffectPreset {
  name: string;
  icon: LucideIcon;
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
  const {
    videoEffects,
    updateVideoEffects,
    videoEffectsPreview,
    setVideoEffectsPreview,
    appliedVideoEffects,
    applyVideoEffects,
    clearAppliedVideoEffects
  } = useEditorStore();
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoEffectSettings[]>([{ ...videoEffects }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [customPresets, setCustomPresets] = useState<StoredEffectPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Presets saved by the user live in localStorage so they survive a reload.
  useEffect(() => {
    setCustomPresets(loadEffectPresets());
  }, []);

  // Auto-hide the confirmation line.
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

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

  /** Pushes a snapshot on the undo stack (drops any redo entries). */
  const commitToHistory = (settings: VideoEffectSettings) => {
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const last = truncated[truncated.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(settings)) return prev;
      const next = [...truncated, { ...settings }].slice(-50);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const applyPreset = (settings: VideoEffectSettings, name: string) => {
    updateVideoEffects(settings);
    commitToHistory(settings);
    setActiveEffect(name);
    setVideoEffectsPreview(true);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const index = historyIndex - 1;
    setHistoryIndex(index);
    updateVideoEffects(history[index]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    updateVideoEffects(history[index]);
  };

  /** Stores the current slider values under a name (localStorage backed). */
  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setStatusMessage('Give the preset a name before saving it.');
      return;
    }
    setCustomPresets(saveEffectPreset(name, videoEffects));
    setPresetName('');
    setShowPresetForm(false);
    setStatusMessage(`Saved “${name}” to your presets.`);
  };

  const removePreset = (name: string) => {
    setCustomPresets(deleteEffectPreset(name));
    setFavorites((prev) => prev.filter((entry) => entry !== name));
    setStatusMessage(`Removed “${name}”.`);
  };

  /** Commits the current look so the exporter burns it into the file. */
  const handleApplyEffects = () => {
    if (!hasActiveEffects(videoEffects)) {
      clearAppliedVideoEffects();
      setStatusMessage('No effects to apply — the video is at its default look.');
      return;
    }
    applyVideoEffects();
    setStatusMessage('Effects applied to the preview and queued for the next export.');
  };

  const resetEffects = () => {
    updateVideoEffects({ ...defaultVideoEffects });
    commitToHistory(defaultVideoEffects);
    clearAppliedVideoEffects();
    setActiveEffect(null);
  };

  const toggleFavorite = (presetName: string) => {
    setFavorites(prev => 
      prev.includes(presetName)
        ? prev.filter(name => name !== presetName)
        : [...prev, presetName]
    );
  };

  const previewFilter = useMemo(() => buildCssFilter(videoEffects) || 'none', [videoEffects]);
  // Favourites are pinned to the front of the grid.
  const sortedPresets = useMemo(
    () =>
      [...presets].sort(
        (a, b) => Number(favorites.includes(b.name)) - Number(favorites.includes(a.name))
      ),
    // `presets` is a stable literal defined in this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favorites]
  );

  const isApplied =
    appliedVideoEffects !== null &&
    JSON.stringify(appliedVideoEffects) === JSON.stringify(videoEffects);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Video Effects</h3>
        <div className="flex space-x-2">
          <Tooltip content={videoEffectsPreview ? 'Hide the effects in the player' : 'Show the effects in the player'}>
            <button
              onClick={() => setVideoEffectsPreview(!videoEffectsPreview)}
              className={`p-2 rounded-lg ${
                videoEffectsPreview ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              {videoEffectsPreview ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
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
              onClick={resetEffects}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Live preview of the current look, so the panel is usable on its own */}
      <div className="mb-4 flex items-center space-x-3 text-xs text-gray-500">
        <div
          className="w-24 h-14 rounded-md border border-gray-200 bg-[linear-gradient(135deg,#f87171,#fbbf24,#34d399,#60a5fa)]"
          style={{ filter: previewFilter }}
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-gray-700">
            {videoEffectsPreview ? 'Preview is live on the player' : 'Preview is hidden'}
          </p>
          <p className="truncate max-w-xs" title={previewFilter}>
            {previewFilter === 'none' ? 'No filters active' : previewFilter}
          </p>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {sortedPresets.map((preset) => {
          const Icon = preset.icon;
          const isFavorite = favorites.includes(preset.name);
          return (
            <Tooltip key={preset.name} content={preset.description}>
              <div className="relative group">
                <button
                  onClick={() => applyPreset(preset.settings, preset.name)}
                  className={`w-full flex flex-col items-center p-4 rounded-lg border transition-colors ${
                    activeEffect === preset.name
                      ? 'border-[#E44E51] bg-[#E44E51]/5'
                      : 'border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">{preset.name}</span>
                </button>
                <button
                  onClick={() => toggleFavorite(preset.name)}
                  title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-lg
                    opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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

      {/* Presets saved by the user */}
      {customPresets.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">My Presets</h4>
          <div className="grid grid-cols-3 gap-3">
            {customPresets.map((preset) => (
              <div key={preset.name} className="relative group">
                <button
                  onClick={() => applyPreset(preset.settings, preset.name)}
                  className={`w-full flex flex-col items-center p-4 rounded-lg border transition-colors ${
                    activeEffect === preset.name
                      ? 'border-[#E44E51] bg-[#E44E51]/5'
                      : 'border-gray-200 hover:border-[#E44E51] hover:bg-[#E44E51]/5'
                  }`}
                >
                  <Bookmark className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium truncate max-w-full">{preset.name}</span>
                </button>
                <button
                  onClick={() => removePreset(preset.name)}
                  title={`Delete ${preset.name}`}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-lg text-red-500
                    opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                        {Math.round((videoEffects as unknown as Record<string, number>)[effect.param] * 100)}%
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={effect.min}
                        max={effect.max}
                        step={effect.step}
                        value={(videoEffects as unknown as Record<string, number>)[effect.param]}
                        onChange={(e) => {
                          updateVideoEffects({ [effect.param]: parseFloat(e.target.value) });
                          setActiveEffect(null);
                        }}
                        // One undo entry per gesture instead of one per pixel.
                        onPointerUp={() => commitToHistory(videoEffects)}
                        onKeyUp={() => commitToHistory(videoEffects)}
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

      {/* Save / apply */}
      {statusMessage && (
        <p className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{statusMessage}</p>
      )}

      {showPresetForm && (
        <div className="mt-4 flex space-x-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && savePreset()}
            placeholder="Preset name"
            autoFocus
            className="flex-1 rounded-lg border-gray-300 shadow-sm text-sm"
          />
          <button
            onClick={savePreset}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
          >
            Save
          </button>
          <button
            onClick={() => {
              setShowPresetForm(false);
              setPresetName('');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setShowPresetForm((show) => !show)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200
            transition-colors"
        >
          <Bookmark className="w-4 h-4 inline-block mr-2" />
          Save as Preset
        </button>
        <button
          onClick={handleApplyEffects}
          className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
            transition-colors shadow-lg hover:shadow-[#E44E51]/25 flex items-center space-x-2"
        >
          {isApplied ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{isApplied ? 'Effects Applied' : 'Apply Effects'}</span>
        </button>
      </div>
    </div>
  );
};