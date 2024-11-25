import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, X, ChevronRight, ChevronLeft, Video, 
  Film, Type, Music, Wand2, Layout, Play, Settings,
  Camera, Upload, Download, Share2
} from 'lucide-react';

interface WalkthroughTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalkthroughTutorial: React.FC<WalkthroughTutorialProps> = ({
  isOpen,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: 'Welcome to AI Screen Recorder',
      description: 'Get started with our powerful video recording and editing suite. Let\'s walk through the main features.',
      icon: <HelpCircle className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Video Recording',
      description: 'Choose between webcam, screen, or picture-in-picture recording modes. Enable AI features for enhanced recording quality.',
      icon: <Camera className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'AI Features',
      description: 'Use advanced AI features like face detection, beautification, background blur, and more to enhance your recordings.',
      icon: <Wand2 className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Silent Removal',
      description: 'Automatically detect and remove silent segments from your videos with customizable settings.',
      icon: <Music className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Captions & Chapters',
      description: 'Add auto-generated captions and chapter markers to make your videos more accessible and organized.',
      icon: <Type className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'B-Roll Management',
      description: 'Import, organize, and manage your B-roll footage with categories and AI-powered tagging.',
      icon: <Film className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Intros & Outros',
      description: 'Create professional intros and outros with customizable templates and animations.',
      icon: <Play className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Effects & Transitions',
      description: 'Apply professional video effects and smooth transitions between clips.',
      icon: <Layout className="w-6 h-6 text-[#E44E51]" />
    },
    {
      title: 'Export Options',
      description: 'Export your videos in various formats with customizable quality settings and social media optimization.',
      icon: <Download className="w-6 h-6 text-[#E44E51]" />
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset step when tutorial is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Semi-transparent overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Tutorial Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-lg shadow-xl p-6 max-w-md m-4"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 
                rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-t-lg overflow-hidden">
              <motion.div
                className="h-full bg-[#E44E51]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Tutorial Content */}
            <div className="mt-6">
              <div className="flex items-center space-x-3 mb-4">
                {tutorialSteps[currentStep].icon}
                <h3 className="text-lg font-semibold">
                  {tutorialSteps[currentStep].title}
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                {tutorialSteps[currentStep].description}
              </p>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50
                      flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                      flex items-center space-x-1"
                  >
                    <span>{currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};