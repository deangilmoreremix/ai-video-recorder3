import React from 'react';
import { 
  Volume2, Type, BookOpen, Film, Layout, 
  Scissors, Clock, Video, Wand2, Download,
  Play, Sparkles, Film
} from 'lucide-react';

interface FeatureCard {
  id: string;
  title: string;
  icon: any;
  description: string;
  isImplemented: boolean;
  onClick: () => void;
}

export const FeatureCards: React.FC = () => {
  const features: FeatureCard[] = [
    {
      id: 'silent-removal',
      title: 'Silent Removal',
      icon: Volume2,
      description: 'Automatically detect and remove silent segments',
      isImplemented: true,
      onClick: () => document.getElementById('silent-removal')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'captions',
      title: 'Captions',
      icon: Type,
      description: 'Auto-generate and edit video captions',
      isImplemented: true,
      onClick: () => document.getElementById('captions')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'chapters',
      title: 'Chapters',
      icon: BookOpen,
      description: 'Add chapter markers and timestamps',
      isImplemented: true,
      onClick: () => document.getElementById('chapters')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'b-roll',
      title: 'B-Roll',
      icon: Film,
      description: 'Manage and insert B-roll footage',
      isImplemented: true,
      onClick: () => document.getElementById('b-roll')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'intros',
      title: 'Intros',
      icon: Play,
      description: 'Create professional video intros',
      isImplemented: true,
      onClick: () => document.getElementById('intros')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'outros',
      title: 'Outros',
      icon: Film,
      description: 'Create engaging video outros',
      isImplemented: true,
      onClick: () => document.getElementById('outros')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'end-cards',
      title: 'End Cards',
      icon: Layout,
      description: 'Create interactive end screen elements',
      isImplemented: true,
      onClick: () => document.getElementById('end-cards')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'effects',
      title: 'Video Effects',
      icon: Wand2,
      description: 'Apply professional video effects',
      isImplemented: true,
      onClick: () => document.getElementById('effects')?.scrollIntoView({ behavior: 'smooth' })
    },
    {
      id: 'transitions',
      title: 'Transitions',
      icon: Sparkles,
      description: 'Professional video transitions',
      isImplemented: true,
      onClick: () => document.getElementById('transitions')?.scrollIntoView({ behavior: 'smooth' })
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <button
            key={feature.id}
            onClick={feature.onClick}
            className={`p-4 rounded-lg border text-left transition-all
              ${feature.isImplemented 
                ? 'bg-white border-gray-200 hover:shadow-md hover:border-[#E44E51]' 
                : 'bg-gray-50 border-gray-200 cursor-not-allowed'}`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                feature.isImplemented ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-gray-100 text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-medium ${
                  feature.isImplemented ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-sm ${
                  feature.isImplemented ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {feature.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};