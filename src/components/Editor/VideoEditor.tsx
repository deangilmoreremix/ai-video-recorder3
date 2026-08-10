import React, { useEffect, useState } from 'react';
import { Scissors, Clock, Layout, Type, Wand2, Layers, Settings, Film, Download, Music, Loader } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Timeline } from './Timeline';
import { SilentRemoval } from './SilentRemoval';
import { Captions } from './Captions';
import { Chapters } from './Chapters';
import { BRoll } from './BRoll';
import { EndCards } from './EndCards';
import { VideoEffects } from '../Effects/VideoEffects';
import { TransitionEffects } from '../Transitions/TransitionEffects';
import { AdvancedAudioEditor } from '../Audio/AdvancedAudioEditor';
import { buildFileName, downloadBlob, getExtensionForBlob } from '../Export/VideoProcessing';

interface VideoEditorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl?: string | null;
}

const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2];

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoRef, videoUrl }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Editor preferences are applied straight to the player element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
    video.loop = loop;
  }, [videoRef, playbackRate, loop, videoUrl]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  /** Saves the clip currently loaded in the player to disk. */
  const downloadCurrentVideo = async () => {
    if (!videoUrl || isDownloading) return;

    setIsDownloading(true);
    setStatus(null);
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const blob = await response.blob();
      downloadBlob(blob, buildFileName('edited_video', getExtensionForBlob(blob)));
    } catch {
      setStatus('The video could not be downloaded from its current source.');
    } finally {
      setIsDownloading(false);
    }
  };

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'silence', label: 'Silent Removal', icon: Scissors },
    { id: 'captions', label: 'Captions', icon: Type },
    { id: 'chapters', label: 'Chapters', icon: Layout },
    { id: 'broll', label: 'B-Roll', icon: Film },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'effects', label: 'Effects', icon: Wand2 },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'endcards', label: 'End Cards', icon: Layout }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <Timeline videoRef={videoRef} videoUrl={videoUrl} />;
      case 'silence':
        return <SilentRemoval videoRef={videoRef} videoUrl={videoUrl} />;
      case 'captions':
        return <Captions videoRef={videoRef} videoUrl={videoUrl} />;
      case 'chapters':
        return <Chapters videoRef={videoRef} videoUrl={videoUrl} />;
      case 'broll':
        return <BRoll />;
      case 'audio':
        return <AdvancedAudioEditor />;
      case 'effects':
        return <VideoEffects />;
      case 'transitions':
        return <TransitionEffects />;
      case 'endcards':
        return <EndCards />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Video Editor</h3>
        <div className="flex space-x-2">
          <Tooltip content="Playback settings">
            <button
              onClick={() => setShowSettings((show) => !show)}
              aria-expanded={showSettings}
              className={`p-2 rounded-lg ${
                showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content={videoUrl ? 'Download the current video' : 'Load a video first'}>
            <button
              onClick={downloadCurrentVideo}
              disabled={!videoUrl || isDownloading}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {showSettings && (
        <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="editor-playback-rate">
              Playback speed
            </label>
            <select
              id="editor-playback-rate"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm"
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}×</option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Loop playback</span>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="rounded border-gray-300 text-[#E44E51] focus:ring-[#E44E51]"
            />
          </label>
        </div>
      )}

      {status && (
        <p className="text-sm text-[#E44E51] bg-[#E44E51]/10 border border-[#E44E51]/20 rounded-lg p-3">
          {status}
        </p>
      )}

      <div className="border-b border-gray-200">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id} content={label}>
              <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-[#E44E51] text-[#E44E51]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {renderContent()}
      </div>
    </div>
  );
};
