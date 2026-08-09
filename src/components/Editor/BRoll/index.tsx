import React, { useState } from 'react';
import { BRollManager } from './BRollManager';
import { Intros } from './Intros';
import { Backgrounds } from './Backgrounds';
import { Overlays } from './Overlays';
import { Outros } from './Outros';
import { Transitions } from './Transitions';
import { ExportBRoll } from './ExportBRoll';
import { Film, Play, Wand2, Layout, Image, Box } from 'lucide-react';
import { cn } from '../../../utils/cn';

const tabs = [
  { id: 'manager', label: 'Media Manager', icon: Film },
  { id: 'intros', label: 'Intros', icon: Play },
  { id: 'backgrounds', label: 'Backgrounds', icon: Image },
  { id: 'overlays', label: 'Overlays', icon: Layout },
  { id: 'outros', label: 'Outros', icon: Box },
  { id: 'transitions', label: 'Transitions', icon: Wand2 }
] as const;

type TabId = typeof tabs[number]['id'];

export const BRoll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('manager');

  const renderContent = () => {
    switch (activeTab) {
      case 'manager':
        return <BRollManager />;
      case 'intros':
        return <Intros />;
      case 'backgrounds':
        return <Backgrounds />;
      case 'overlays':
        return <Overlays />;
      case 'outros':
        return <Outros />;
      case 'transitions':
        return <Transitions />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">B-Roll</h3>
          <p className="text-sm text-gray-500 max-w-xl">
            Sequence your clips, then bake the backgrounds, overlays and transitions into a single
            video with “Export B-Roll”.
          </p>
        </div>
        <ExportBRoll />
      </div>

      <div className="border-b border-gray-200 mb-4">
        <div className="flex space-x-4 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === id
                  ? "border-[#E44E51] text-[#E44E51]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {renderContent()}
      </div>
    </div>
  );
};
