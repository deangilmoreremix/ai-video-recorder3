import React, { useState } from 'react';
import { BRollManager } from './BRollManager';
import { Intros } from './Intros';
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
        return (
          <div className="p-8 text-center text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Backgrounds Coming Soon</h3>
            <p>This feature will allow you to add and manage background videos and images.</p>
          </div>
        );
      case 'overlays':
        return (
          <div className="p-8 text-center text-gray-500">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Overlays Coming Soon</h3>
            <p>This feature will allow you to add and manage video overlays and effects.</p>
          </div>
        );
      case 'outros':
        return (
          <div className="p-8 text-center text-gray-500">
            <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Outros Coming Soon</h3>
            <p>This feature will allow you to create and manage video outros.</p>
          </div>
        );
      case 'transitions':
        return (
          <div className="p-8 text-center text-gray-500">
            <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Transitions Coming Soon</h3>
            <p>This feature will allow you to add professional transitions between clips.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
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