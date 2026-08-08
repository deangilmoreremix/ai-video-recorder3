import React, { useState } from 'react';
import { Youtube, Instagram, Twitter, Facebook, Linkedin, Share2, Settings, ChevronRight, Info, Music2, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

export interface SocialExportSettings {
  resolution: { width: number; height: number };
  aspectRatio: string;
  fps: number;
  bitrate: number;
}

interface Platform {
  id: string;
  name: string;
  icon: LucideIcon;
  /** seconds */
  maxDuration: number;
  /** megabytes */
  maxSize: number;
  recommendedSettings: SocialExportSettings;
}

interface SocialMediaExportProps {
  duration: number;
  /** bytes */
  fileSize: number;
  onExport: (platform: string, settings: SocialExportSettings) => Promise<void>;
}

const platforms: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    maxDuration: 43200, // 12 hours
    maxSize: 128 * 1024, // 128GB
    recommendedSettings: {
      resolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      fps: 60,
      bitrate: 8000
    }
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    maxDuration: 900, // 15 minutes
    maxSize: 4 * 1024, // 4GB
    recommendedSettings: {
      resolution: { width: 1080, height: 1080 },
      aspectRatio: '1:1',
      fps: 30,
      bitrate: 3500
    }
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    maxDuration: 140, // 2 minutes 20 seconds
    maxSize: 512, // 512MB
    recommendedSettings: {
      resolution: { width: 1280, height: 720 },
      aspectRatio: '16:9',
      fps: 30,
      bitrate: 5000
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    maxDuration: 14400, // 4 hours
    maxSize: 10 * 1024, // 10GB
    recommendedSettings: {
      resolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      fps: 30,
      bitrate: 4000
    }
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    maxDuration: 600, // 10 minutes
    maxSize: 5 * 1024, // 5GB
    recommendedSettings: {
      resolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      fps: 30,
      bitrate: 5000
    }
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    maxDuration: 600, // 10 minutes
    maxSize: 2 * 1024, // 2GB
    recommendedSettings: {
      resolution: { width: 1080, height: 1920 },
      aspectRatio: '9:16',
      fps: 60,
      bitrate: 6000
    }
  }
];

const defaultSettings: SocialExportSettings = platforms[0].recommendedSettings;

/**
 * Only offer resolutions that match the platform aspect ratio - mixing a 16:9
 * frame into a 9:16 preset produces letterboxed (or rejected) uploads.
 */
const resolutionOptions = (aspectRatio: string): Array<{ width: number; height: number; label: string }> => {
  switch (aspectRatio) {
    case '9:16':
      return [
        { width: 1080, height: 1920, label: '1080p (1080x1920)' },
        { width: 720, height: 1280, label: '720p (720x1280)' },
        { width: 480, height: 854, label: '480p (480x854)' }
      ];
    case '1:1':
      return [
        { width: 1080, height: 1080, label: '1080p (1080x1080)' },
        { width: 720, height: 720, label: '720p (720x720)' },
        { width: 480, height: 480, label: '480p (480x480)' }
      ];
    case '4:3':
      return [
        { width: 1440, height: 1080, label: '1080p (1440x1080)' },
        { width: 960, height: 720, label: '720p (960x720)' },
        { width: 640, height: 480, label: '480p (640x480)' }
      ];
    case '16:9':
    default:
      return [
        { width: 1920, height: 1080, label: '1080p (1920x1080)' },
        { width: 1280, height: 720, label: '720p (1280x720)' },
        { width: 854, height: 480, label: '480p (854x480)' }
      ];
  }
};

const formatDuration = (seconds: number): string => {
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} minutes`;
  }
  return `${seconds} seconds`;
};

const formatSize = (megabytes: number): string =>
  megabytes >= 1024 ? `${Math.round(megabytes / 1024)} GB` : `${Math.round(megabytes)} MB`;

export const SocialMediaExport: React.FC<SocialMediaExportProps> = ({
  duration,
  fileSize,
  onExport
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState<SocialExportSettings>(defaultSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!selectedPlatform || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    try {
      await onExport(selectedPlatform.id, settings);
    } catch (err) {
      // Without this the rejection escapes as an unhandled promise rejection.
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCompatible = (platform: Platform) => {
    return duration <= platform.maxDuration && fileSize <= platform.maxSize * 1024 * 1024;
  };

  const availableResolutions = resolutionOptions(settings.aspectRatio);
  const currentResolution = `${settings.resolution.width}x${settings.resolution.height}`;
  const hasCurrentResolution = availableResolutions.some(
    (option) => `${option.width}x${option.height}` === currentResolution
  );

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {platforms.map((platform) => {
          const compatible = isCompatible(platform);
          const Icon = platform.icon;

          return (
            <Tooltip
              key={platform.id}
              content={!compatible ? `Video exceeds ${platform.name} limits` : ''}
            >
              <button
                onClick={() => {
                  setSelectedPlatform(platform);
                  setSettings(platform.recommendedSettings);
                  setError(null);
                }}
                disabled={!compatible || isProcessing}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedPlatform?.id === platform.id
                    ? 'border-[#E44E51] bg-[#E44E51]/5'
                    : compatible
                    ? 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                    : 'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-6 h-6" />
                  <div>
                    <h4 className="font-medium">{platform.name}</h4>
                    <p className="text-xs text-gray-500">
                      {platform.recommendedSettings.resolution.width}x
                      {platform.recommendedSettings.resolution.height}
                    </p>
                  </div>
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Platform Settings */}
      {selectedPlatform && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Export Settings</h4>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  showAdvanced ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution
              </label>
              <select
                value={hasCurrentResolution ? currentResolution : ''}
                onChange={(e) => {
                  const [width, height] = e.target.value.split('x').map(Number);
                  if (!Number.isFinite(width) || !Number.isFinite(height)) return;
                  setSettings({ ...settings, resolution: { width, height } });
                }}
                className="w-full rounded-lg border-gray-300"
              >
                {!hasCurrentResolution && (
                  <option value="">{currentResolution} (custom)</option>
                )}
                {availableResolutions.map((option) => (
                  <option key={option.label} value={`${option.width}x${option.height}`}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frame Rate
              </label>
              <select
                value={settings.fps}
                onChange={(e) => setSettings({
                  ...settings,
                  fps: parseInt(e.target.value, 10) || settings.fps
                })}
                className="w-full rounded-lg border-gray-300"
              >
                <option value="60">60 fps</option>
                <option value="30">30 fps</option>
                <option value="24">24 fps</option>
              </select>
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Bitrate (kbps)
                </label>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={settings.bitrate}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setSettings({
                      ...settings,
                      bitrate: Number.isFinite(value) ? Math.min(50000, Math.max(500, value)) : settings.bitrate
                    });
                  }}
                  className="w-full rounded-lg border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aspect Ratio
                </label>
                <input
                  type="text"
                  value={settings.aspectRatio}
                  readOnly
                  className="w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          )}

          {/* Platform Requirements */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              {selectedPlatform.name} Requirements
            </h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Maximum duration: {formatDuration(selectedPlatform.maxDuration)}</li>
              <li>• Maximum file size: {formatSize(selectedPlatform.maxSize)}</li>
              <li>• Recommended resolution: {selectedPlatform.recommendedSettings.resolution.width}x{selectedPlatform.recommendedSettings.resolution.height}</li>
              <li>• Recommended aspect ratio: {selectedPlatform.recommendedSettings.aspectRatio}</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-[#E44E51] text-white rounded-lg 
              hover:bg-[#D43B3E] disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg hover:shadow-[#E44E51]/25 flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Export to {selectedPlatform.name}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
