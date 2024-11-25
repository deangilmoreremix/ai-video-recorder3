import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader } from 'lucide-react';

interface AIProcessingOverlayProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
}

export const AIProcessingOverlay: React.FC<AIProcessingOverlayProps> = ({
  isVisible,
  progress = 0,
  message = 'Processing with AI...'
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="text-center text-white">
        <div className="flex items-center justify-center mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-8 h-8" />
          </motion.div>
          <Loader className="w-8 h-8 ml-2 animate-spin" />
        </div>
        <p className="text-lg font-medium mb-2">{message}</p>
        {progress > 0 && (
          <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#E44E51]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};