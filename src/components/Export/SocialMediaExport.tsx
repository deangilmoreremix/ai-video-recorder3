import React, { useState } from 'react';
import { 
  Youtube, Instagram, Twitter, Facebook, Linkedin,
  Globe, Share2, Settings, Check, AlertCircle, Link, Copy,
  ChevronDown, ChevronRight, Info, Music2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface Platform {
  id: string;
  name: string;
  icon: any;
  maxDuration: number;
  maxSize: number;
  recommendedSettings: {
    resolution: { width: number; height: number };
    aspectRatio: string;
    fps: number;
    bitrate: number;
  };
}

interface SocialMediaExportProps {
  duration: number;
  fileSize: number;
  onExport: (platform: string, settings: any) => Promise<void>;
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

export const SocialMediaExport: React.FC<SocialMediaExportProps> = ({
  duration,
  fileSize,
  onExport
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState(selectedPlatform?.recommendedSettings || {});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    if (!selectedPlatform) return;

    setIsProcessing(true);
    try {
      await onExport(selectedPlatform.id, settings);
    } finally {
      setIsProcessing(false);
    }
  };

  const isCompatible = (platform: Platform) => {
    return duration <= platform.maxDuration && fileSize <= platform.maxSize * 1024 * 1024;
  };

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
                }}
                disabled={!compatible}
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
                value={`${settings.resolution.width}x${settings.resolution.height}`}
                onChange={(e) => {
                  const [width, height] = e.target.value.split('x').map(Number);
                  setSettings({ ...settings, resolution: { width, height } });
                }}
                className="w-full rounded-lg border-gray-300"
              >
                <option value="1920x1080">1080p (1920x1080)</option>
                <option value="1280x720">720p (1280x720)</option>
                <option value="854x480">480p (854x480)</option>
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
                  fps: parseInt(e.target.value) 
                })}
                className="w-full rounded-lg border-gray-300"
              >
                <option value="60">60 fps</option>
                <option value="30">30 fps</option>
                <option value="24">24 fps</option>
              </select>
            </div>
          </div>

          {/* Platform Requirements */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              {selectedPlatform.name} Requirements
            </h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Maximum duration: {selectedPlatform.maxDuration / 60} minutes</li>
              <li>• Maximum file size: {selectedPlatform.maxSize} GB</li>
              <li>• Recommended resolution: {selectedPlatform.recommendedSettings.resolution.width}x{selectedPlatform.recommendedSettings.resolution.height}</li>
              <li>• Recommended aspect ratio: {selectedPlatform.recommendedSettings.aspectRatio}</li>
            </ul>
          </div>

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