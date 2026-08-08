import React, { useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

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

const TOOLTIP_WIDTH = 384; // max-w-md
const TOOLTIP_OFFSET = 12;

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  steps,
  onComplete,
  isOpen
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const step = steps[currentStep];

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

  // Reset to the first step whenever the tutorial is (re)opened
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onComplete]);

  // Scroll the highlighted element into view and place the tooltip next to it
  useLayoutEffect(() => {
    if (!isOpen || !step) return;

    const targetElement = step.target ? document.querySelector(step.target) : null;
    if (!targetElement) {
      setCoords(null);
      return;
    }

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const place = () => {
      const rect = targetElement.getBoundingClientRect();
      const positions = {
        top: { top: rect.top - TOOLTIP_OFFSET - 160, left: rect.left },
        bottom: { top: rect.bottom + TOOLTIP_OFFSET, left: rect.left },
        left: { top: rect.top, left: rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET },
        right: { top: rect.top, left: rect.right + TOOLTIP_OFFSET }
      };
      const next = positions[step.position] ?? positions.bottom;

      setCoords({
        top: Math.max(TOOLTIP_OFFSET, Math.min(next.top, window.innerHeight - 200)),
        left: Math.max(TOOLTIP_OFFSET, Math.min(next.left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_OFFSET))
      });
    };

    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [currentStep, isOpen, step]);

  if (!isOpen || !step) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onComplete} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-tooltip-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bg-white rounded-lg shadow-xl p-4 max-w-md w-[min(24rem,calc(100vw-2rem))] pointer-events-auto"
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
          }
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">
              Step {currentStep + 1} of {steps.length}
            </h4>
            <button
              type="button"
              onClick={onComplete}
              aria-label="Close tutorial"
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <h3 id="tutorial-tooltip-title" className="text-lg font-semibold mb-2">
            {step.title}
          </h3>
          <p className="text-gray-600 mb-4">
            {step.description}
          </p>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 inline-block mr-1" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1.5 text-sm bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]"
            >
              {currentStep === steps.length - 1 ? 'Finish' : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
