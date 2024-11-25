import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialTooltipProps {
  steps: TutorialStep[];
  onComplete: () => void;
  isOpen: boolean;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  steps,
  onComplete,
  isOpen
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bg-white rounded-lg shadow-xl p-4 max-w-md pointer-events-auto"
          style={{
            // Position logic based on target element and position prop
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">
              Step {currentStep + 1} of {steps.length}
            </h4>
            <button
              onClick={onComplete}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {steps[currentStep].title}
          </h3>
          <p className="text-gray-600 mb-4">
            {steps[currentStep].description}
          </p>

          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 inline-block mr-1" />
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-3 py-1.5 text-sm bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]"
            >
              {currentStep === steps.length - 1 ? 'Finish' : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 inline-block ml-1" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};