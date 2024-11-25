import React, { useState } from 'react';
import { 
  Scissors, Clock, Layout, Type, Music, Wand2, 
  Layers, Settings, Film, Download 
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Timeline } from './Timeline';
import { SilentRemoval } from './SilentRemoval';
import { Captions } from './Captions';
import { Chapters } from './Chapters';
import { BRoll } from './BRoll';
import { EndCards } from './EndCards';
import { VideoEffects } from '../Effects/VideoEffects';
import { TransitionEffects } from '../Transitions/TransitionEffects';

interface VideoEditorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoRef }) => {
  const [activeTab, setActiveTab] = useState('timeline');

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'silence', label: 'Silent Removal', icon: Scissors },
    { id: 'captions', label: 'Captions', icon: Type },
    { id: 'chapters', label: 'Chapters', icon: Layout },
    { id: 'broll', label: 'B-Roll', icon: Film },
    { id: 'effects', label: 'Effects', icon: Wand2 },
    { id: 'transitions', label: 'Transitions', icon: Layers },
    { id: 'endcards', label: 'End Cards', icon: Layout }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <Timeline />;
      case 'silence':
        return <SilentRemoval />;
      case 'captions':
        return <Captions />;
      case 'chapters':
        return <Chapters />;
      case 'broll':
        return <BRoll />;
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
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

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