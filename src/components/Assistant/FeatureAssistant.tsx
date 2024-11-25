import React, { useState } from 'react';
import { HelpCircle, X, MessageCircle } from 'lucide-react';

interface FeatureHelp {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
}

export const FeatureAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const featureHelp: Record<string, FeatureHelp> = {
    recording: {
      title: 'Video Recording',
      description: 'Record video from your webcam, screen, or both with picture-in-picture mode.',
      steps: [
        'Select your recording mode (webcam/screen/PiP)',
        'Configure optional AI features',
        'Click "Start Recording" to begin',
        'Click "Stop Recording" when finished'
      ],
      tips: [
        'Use AI features for enhanced recording quality',
        'Test your audio before long recordings',
        'Ensure good lighting for webcam recordings'
      ]
    },
    silentRemoval: {
      title: 'Silent Removal',
      description: 'Automatically detect and remove silent segments from your video.',
      steps: [
        'Adjust silence threshold to detect quiet parts',
        'Set minimum duration to ignore brief silences',
        'Add padding to prevent abrupt cuts',
        'Enable music preservation if needed'
      ]
    },
    captions: {
      title: 'Advanced Captions',
      description: 'Generate, edit, and style captions for your video.',
      steps: [
        'Choose auto-generation or manual input',
        'Select caption style and position',
        'Enable speaker detection if needed',
        'Adjust timing and synchronization'
      ]
    },
    chapters: {
      title: 'Chapter Markers',
      description: 'Add navigation points throughout your video.',
      steps: [
        'Click + to add a new chapter',
        'Set chapter title and timestamp',
        'Arrange chapters in sequence',
        'Preview chapter navigation'
      ]
    },
    broll: {
      title: 'B-Roll Manager',
      description: 'Organize and insert supplementary video footage.',
      steps: [
        'Upload or record B-roll clips',
        'Organize clips by category',
        'Drag and drop to timeline',
        'Adjust timing and transitions'
      ]
    },
    endCards: {
      title: 'End Cards',
      description: 'Create interactive end screens for your videos.',
      steps: [
        'Choose end card type (video/playlist/link)',
        'Set position and duration',
        'Add custom thumbnails or text',
        'Preview end card appearance'
      ]
    },
    effects: {
      title: 'Video Effects',
      description: 'Apply professional video effects and adjustments.',
      steps: [
        'Select effect category',
        'Adjust effect parameters',
        'Preview changes in real-time',
        'Apply effects to specific segments'
      ]
    },
    transitions: {
      title: 'Transitions',
      description: 'Add smooth transitions between video segments.',
      steps: [
        'Choose transition type',
        'Set duration and timing',
        'Customize transition effects',
        'Preview transitions'
      ]
    }
  };

  const renderFeatureHelp = (feature: FeatureHelp) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{feature.title}</h3>
      <p className="text-gray-600">{feature.description}</p>
      
      {feature.steps && (
        <div>
          <h4 className="font-medium mb-2">Steps:</h4>
          <ol className="list-decimal list-inside space-y-1">
            {feature.steps.map((step, index) => (
              <li key={index} className="text-gray-600">{step}</li>
            ))}
          </ol>
        </div>
      )}
      
      {feature.tips && (
        <div>
          <h4 className="font-medium mb-2">Tips:</h4>
          <ul className="list-disc list-inside space-y-1">
            {feature.tips.map((tip, index) => (
              <li key={index} className="text-gray-600">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Feature Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {selectedFeature ? (
                <div>
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-blue-600 hover:text-blue-700 mb-4"
                  >
                    ← Back to features
                  </button>
                  {renderFeatureHelp(featureHelp[selectedFeature])}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(featureHelp).map(([key, help]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedFeature(key)}
                      className="text-left p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <h3 className="font-medium mb-1">{help.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {help.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};