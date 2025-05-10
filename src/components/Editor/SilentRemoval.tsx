import React, { useState, useCallback } from 'react';
import { 
  Volume2, VolumeX, Settings, Play, Pause, Save, 
  RotateCcw, Filter, Sliders, Activity, Music,
  Brain, Wand2, Sparkles, Gauge, Clock, Layers,
  AlertCircle, ChevronDown, ChevronUp, Eye, Check,
  Mic, MessageCircle, Scissors, Plus, X
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface SilentRemovalProps {
  onProcess?: () => void;
  onSettingsChange?: (settings: any) => void;
}

export const SilentRemoval: React.FC<SilentRemovalProps> = ({ 
  onProcess, 
  onSettingsChange 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
    threshold: 0.05,
    minSilenceDuration: 0.5,
    padding: 0.2,
    preserveMusic: true,
    preserveVoice: true,
    autoDetect: true,
    skipIntro: false,
    skipOutro: false,
    skipCredits: false,
    customRanges: [] as { start: number; end: number }[],
    advanced: {
      algorithm: 'rms',
      fftSize: 2048,
      smoothing: 0.8,
      normalization: true,
      frequencyWeighting: 'a-weighting',
      voiceFrequencyRange: [300, 3400],
      musicFrequencyRange: [60, 15000]
    }
  });

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      onSettingsChange?.(newSettings);
      return newSettings;
    });
  }, [onSettingsChange]);

  const handleAdvancedSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        advanced: {
          ...prev.advanced,
          [key]: value
        }
      };
      onSettingsChange?.(newSettings);
      return newSettings;
    });
  }, [onSettingsChange]);

  const handleAddCustomRange = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      customRanges: [...prev.customRanges, { start: 0, end: 0 }]
    }));
  }, []);

  const handleRemoveCustomRange = useCallback((index: number) => {
    setSettings(prev => ({
      ...prev,
      customRanges: prev.customRanges.filter((_, i) => i !== index)
    }));
  }, []);

  const handleUpdateCustomRange = useCallback((index: number, key: 'start' | 'end', value: number) => {
    setSettings(prev => ({
      ...prev,
      customRanges: prev.customRanges.map((range, i) => 
        i === index ? { ...range, [key]: value } : range
      )
    }));
  }, []);

  const handleProcess = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate processing with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }
      
      onProcess?.();
    } catch (error) {
      console.error('Error processing silent removal:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [onProcess]);

  const resetSettings = useCallback(() => {
    setSettings({
      threshold: 0.05,
      minSilenceDuration: 0.5,
      padding: 0.2,
      preserveMusic: true,
      preserveVoice: true,
      autoDetect: true,
      skipIntro: false,
      skipOutro: false,
      skipCredits: false,
      customRanges: [],
      advanced: {
        algorithm: 'rms',
        fftSize: 2048,
        smoothing: 0.8,
        normalization: true,
        frequencyWeighting: 'a-weighting',
        voiceFrequencyRange: [300, 3400],
        musicFrequencyRange: [60, 15000]
      }
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Silent Removal</h3>
        <div className="flex space-x-2">
          <Tooltip content="Reset to defaults">
            <button
              onClick={resetSettings}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Advanced settings">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-lg ${
                showAdvanced ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Settings */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Silence Threshold
              </label>
              <span className="text-sm text-gray-500">
                {Math.round(settings.threshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={settings.threshold}
              onChange={(e) => handleSettingChange('threshold', parseFloat(e.target.value))}
              className="w-full accent-[#E44E51]"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>More sensitive</span>
              <span>Less sensitive</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Minimum Silence Duration (seconds)
              </label>
              <span className="text-sm text-gray-500">
                {settings.minSilenceDuration}s
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={settings.minSilenceDuration}
              onChange={(e) => handleSettingChange('minSilenceDuration', parseFloat(e.target.value))}
              className="w-full accent-[#E44E51]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Padding (seconds)
              </label>
              <span className="text-sm text-gray-500">
                {settings.padding}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.padding}
              onChange={(e) => handleSettingChange('padding', parseFloat(e.target.value))}
              className="w-full accent-[#E44E51]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Preserve Music</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.preserveMusic}
                  onChange={(e) => handleSettingChange('preserveMusic', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Preserve Voice</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.preserveVoice}
                  onChange={(e) => handleSettingChange('preserveVoice', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Skip Intro</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.skipIntro}
                  onChange={(e) => handleSettingChange('skipIntro', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Skip Outro</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.skipOutro}
                  onChange={(e) => handleSettingChange('skipOutro', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Skip Credits</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.skipCredits}
                  onChange={(e) => handleSettingChange('skipCredits', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </div>
        </div>

        {/* Custom Ranges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Custom Ranges to Keep</h4>
            <button
              onClick={handleAddCustomRange}
              className="p-1 hover:bg-gray-100 rounded-lg text-[#E44E51]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {settings.customRanges.length > 0 ? (
            <div className="space-y-2">
              {settings.customRanges.map((range, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={range.start}
                    onChange={(e) => handleUpdateCustomRange(
                      index, 'start', parseFloat(e.target.value)
                    )}
                    className="w-24 rounded-lg border-gray-300 text-sm"
                    placeholder="Start"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={range.end}
                    onChange={(e) => handleUpdateCustomRange(
                      index, 'end', parseFloat(e.target.value)
                    )}
                    className="w-24 rounded-lg border-gray-300 text-sm"
                    placeholder="End"
                  />
                  <span className="text-gray-500">seconds</span>
                  <button
                    onClick={() => handleRemoveCustomRange(index)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No custom ranges defined
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="font-medium text-sm">Advanced Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Algorithm
                    </label>
                    <select
                      value={settings.advanced.algorithm}
                      onChange={(e) => handleAdvancedSettingChange('algorithm', e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm"
                    >
                      <option value="rms">RMS (Root Mean Square)</option>
                      <option value="peak">Peak Detection</option>
                      <option value="zcr">Zero Crossing Rate</option>
                      <option value="spectral">Spectral Analysis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FFT Size
                    </label>
                    <select
                      value={settings.advanced.fftSize}
                      onChange={(e) => handleAdvancedSettingChange('fftSize', parseInt(e.target.value))}
                      className="w-full rounded-lg border-gray-300 shadow-sm"
                    >
                      <option value="512">512</option>
                      <option value="1024">1024</option>
                      <option value="2048">2048</option>
                      <option value="4096">4096</option>
                      <option value="8192">8192</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Smoothing
                    </label>
                    <span className="text-sm text-gray-500">
                      {settings.advanced.smoothing}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.99"
                    step="0.01"
                    value={settings.advanced.smoothing}
                    onChange={(e) => handleAdvancedSettingChange('smoothing', parseFloat(e.target.value))}
                    className="w-full accent-[#E44E51]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Normalization</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.advanced.normalization}
                      onChange={(e) => handleAdvancedSettingChange('normalization', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                      peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                      peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                      after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency Weighting
                  </label>
                  <select
                    value={settings.advanced.frequencyWeighting}
                    onChange={(e) => handleAdvancedSettingChange('frequencyWeighting', e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                  >
                    <option value="a-weighting">A-weighting (Speech Focus)</option>
                    <option value="b-weighting">B-weighting</option>
                    <option value="c-weighting">C-weighting</option>
                    <option value="z-weighting">Z-weighting (Flat Response)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voice Frequency Range (Hz)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="20"
                        max="20000"
                        value={settings.advanced.voiceFrequencyRange[0]}
                        onChange={(e) => handleAdvancedSettingChange(
                          'voiceFrequencyRange',
                          [parseInt(e.target.value), settings.advanced.voiceFrequencyRange[1]]
                        )}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min="20"
                        max="20000"
                        value={settings.advanced.voiceFrequencyRange[1]}
                        onChange={(e) => handleAdvancedSettingChange(
                          'voiceFrequencyRange',
                          [settings.advanced.voiceFrequencyRange[0], parseInt(e.target.value)]
                        )}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Music Frequency Range (Hz)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="20"
                        max="20000"
                        value={settings.advanced.musicFrequencyRange[0]}
                        onChange={(e) => handleAdvancedSettingChange(
                          'musicFrequencyRange',
                          [parseInt(e.target.value), settings.advanced.musicFrequencyRange[1]]
                        )}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min="20"
                        max="20000"
                        value={settings.advanced.musicFrequencyRange[1]}
                        onChange={(e) => handleAdvancedSettingChange(
                          'musicFrequencyRange',
                          [settings.advanced.musicFrequencyRange[0], parseInt(e.target.value)]
                        )}
                        className="w-full rounded-lg border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Process Button */}
        <button
          onClick={handleProcess}
          disabled={isProcessing}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg 
            hover:bg-[#D43B3E] disabled:opacity-50 shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Processing... {progress}%</span>
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4" />
              <span>Remove Silent Segments</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};