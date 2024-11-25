import React, { useState } from 'react';
import { 
  ArrowLeftRight, ArrowUpDown, Combine, Divide, Layers, 
  RotateCcw, Shuffle, Move, Wand2, Palette, Box, Sparkles,
  Maximize2, Minimize2, Wind, Waves, Zap, Play, Plus
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface TransitionEffect {
  name: string;
  type: string;
  icon: any;
  description: string;
}

export const TransitionEffects: React.FC = () => {
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);

  const transitions: TransitionEffect[] = [
    { name: 'Dissolve', type: 'dissolve', icon: Layers, description: 'Smooth fade between clips' },
    { name: 'Slide Left', type: 'slide-left', icon: ArrowLeftRight, description: 'Slide clip from right to left' },
    { name: 'Slide Right', type: 'slide-right', icon: ArrowLeftRight, description: 'Slide clip from left to right' },
    { name: 'Slide Up', type: 'slide-up', icon: ArrowUpDown, description: 'Slide clip from bottom to top' },
    { name: 'Slide Down', type: 'slide-down', icon: ArrowUpDown, description: 'Slide clip from top to bottom' },
    { name: 'Fade', type: 'fade', icon: Move, description: 'Simple fade transition' },
    { name: 'Wipe', type: 'wipe', icon: Divide, description: 'Wipe from one clip to another' },
    { name: 'Cross Zoom', type: 'cross-zoom', icon: Combine, description: 'Zoom transition between clips' },
    { name: 'Rotate', type: 'rotate', icon: RotateCcw, description: 'Rotating transition effect' },
    { name: 'Random', type: 'random', icon: Shuffle, description: 'Random transition effect' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Transition Effects</h3>
      
      <div className="grid grid-cols-5 gap-3 mb-4">
        {transitions.map((transition) => {
          const Icon = transition.icon;
          return (
            <Tooltip 
              key={transition.type}
              content={transition.description}
            >
              <button
                onClick={() => setSelectedTransition(
                  selectedTransition === transition.type ? null : transition.type
                )}
                className={`flex flex-col items-center p-3 rounded-lg transition-colors
                  ${selectedTransition === transition.type 
                    ? 'bg-[#E44E51]/10 border-[#E44E51] border-2 text-[#E44E51]' 
                    : 'border border-gray-200 hover:bg-gray-50'}`}
              >
                <Icon className={`w-6 h-6 mb-2 ${
                  selectedTransition === transition.type 
                    ? 'text-[#E44E51]' 
                    : 'text-gray-600'
                }`} />
                <span className="text-xs text-center">{transition.name}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      {selectedTransition && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <Tooltip content="Adjust how long the transition effect takes to complete">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Duration</span>
                <span className="text-sm text-gray-500">{duration}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                  accent-[#E44E51]"
              />
            </div>
          </Tooltip>
          
          <div className="flex justify-end space-x-2">
            <Tooltip content="Reset transition settings to default">
              <button
                onClick={() => {
                  setSelectedTransition(null);
                  setDuration(1);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
            </Tooltip>
            <Tooltip content="Apply the selected transition effect">
              <button
                onClick={() => {
                  // Apply transition logic here
                  setSelectedTransition(null);
                }}
                className="px-3 py-1.5 bg-[#E44E51] text-white text-sm rounded-lg 
                  hover:bg-[#D43B3E] transition-colors shadow-lg hover:shadow-[#E44E51]/25"
              >
                Apply Transition
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
};