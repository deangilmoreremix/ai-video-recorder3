import React, { useState } from 'react';
import { Settings, Video, Mic, Volume2, Sliders, Camera, Monitor, Layout } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface AdvancedControlsProps {
  onSettingsChange?: (settings: any) => void;
}

export const AdvancedControls: React.FC<AdvancedControlsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    video: {
      enabled: true,
      device: 'default',
      resolution: '1080p',
      frameRate: 30,
      quality: 'high'
    },
    audio: {
      enabled: true,
      device: 'default',
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    },
    recording: {
      mode: 'continuous',
      format: 'mp4',
      quality: 'high',
      maxDuration: 0
    }
  });

  const handleSettingChange = (category: string, setting: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: value
      }
    };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Quick Settings Bar */}
      <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Resolution</label>
            <select
              value={settings.video.resolution}
              onChange={(e) => handleSettingChange('video', 'resolution', e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">1440p</option>
              <option value="2160p">4K</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Frame Rate</label>
            <select
              value={settings.video.frameRate}
              onChange={(e) => handleSettingChange('video', 'frameRate', parseInt(e.target.value))}
              className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="24">24 fps</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Mode</label>
            <select
              value={settings.recording.mode}
              onChange={(e) => handleSettingChange('recording', 'mode', e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="continuous">Continuous</option>
              <option value="timeLimit">Time Limit</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <select
              value={settings.recording.format}
              onChange={(e) => handleSettingChange('recording', 'format', e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="mov">MOV</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Quality</label>
            <select
              value={settings.recording.quality}
              onChange={(e) => handleSettingChange('recording', 'quality', e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 bg-white"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setSettings({
            video: {
              enabled: true,
              device: 'default',
              resolution: '1080p',
              frameRate: 30,
              quality: 'high'
            },
            audio: {
              enabled: true,
              device: 'default',
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true
            },
            recording: {
              mode: 'continuous',
              format: 'mp4',
              quality: 'high',
              maxDuration: 0
            }
          })}
          className="px-3 py-1.5 text-sm text-[#E44E51] hover:bg-[#E44E51]/10 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Video Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Video className="w-4 h-4 mr-2" />
            Video Settings
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Video</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.video.enabled}
                  onChange={(e) => handleSettingChange('video', 'enabled', e.target.checked)}
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

        {/* Audio Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Mic className="w-4 h-4 mr-2" />
            Audio Settings
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable Audio</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.audio.enabled}
                  onChange={(e) => handleSettingChange('audio', 'enabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Noise Suppression</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.audio.noiseSuppression}
                  onChange={(e) => handleSettingChange('audio', 'noiseSuppression', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Echo Cancellation</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.audio.echoCancellation}
                  onChange={(e) => handleSettingChange('audio', 'echoCancellation', e.target.checked)}
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
      </div>
    </div>
  );
};