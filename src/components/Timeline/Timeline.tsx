import React from 'react';
import { useEditorStore } from '../../store';
import { Clock, Scissors, Plus } from 'lucide-react';

export const Timeline: React.FC = () => {
  const { currentProject } = useEditorStore();

  return (
    <div className="flex flex-col bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Timeline</h2>
        <div className="flex space-x-2">
          <button className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700">
            <Scissors className="w-5 h-5" />
          </button>
          <button className="p-2 bg-green-600 rounded-lg hover:bg-green-700">
            <Plus className="w-5 h-5" />
          </button>
          <button className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700">
            <Clock className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="relative h-32 bg-gray-800 rounded-lg overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-8 bg-gray-700 flex">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex-1 border-r border-gray-600 text-xs p-1">
              {i}s
            </div>
          ))}
        </div>
        
        <div className="mt-8 h-24 relative">
          {currentProject?.timeline.clips.map((clip) => (
            <div
              key={clip.id}
              className="absolute h-12 bg-blue-500 rounded cursor-move"
              style={{
                left: `${(clip.startTime / 10) * 100}%`,
                width: `${((clip.endTime - clip.startTime) / 10) * 100}%`,
                top: clip.type === 'video' ? '0' : '14px'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};