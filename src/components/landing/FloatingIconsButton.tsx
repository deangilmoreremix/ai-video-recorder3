import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Brain, Film, Sparkles, Scissors, 
  Type, Plus, X, Maximize2, Minimize2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FloatingIconsButtonProps {
  className?: string;
}

const FloatingIconsButton: React.FC<FloatingIconsButtonProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const buttonItems = [
    { 
      icon: Brain, 
      label: 'AI Features', 
      color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      link: '/features/ai' 
    },
    { 
      icon: Camera, 
      label: 'Video Recorder', 
      color: 'bg-gradient-to-r from-pink-500 to-rose-600',
      link: '/features/recorder' 
    },
    { 
      icon: Scissors, 
      label: 'Video Editor', 
      color: 'bg-gradient-to-r from-amber-500 to-orange-600',
      link: '/features/editor' 
    },
    { 
      icon: Film, 
      label: 'Export Options', 
      color: 'bg-gradient-to-r from-cyan-500 to-blue-600',
      link: '/features/export' 
    },
    { 
      icon: Sparkles, 
      label: 'GIFs & Thumbnails', 
      color: 'bg-gradient-to-r from-green-500 to-teal-600',
      link: '/features/animation' 
    },
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Expanded View Toggle */}
      {isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-0 right-24 p-2 rounded-full bg-white shadow-lg text-gray-700 hover:text-gray-900"
          onClick={toggleExpanded}
        >
          {isExpanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </motion.button>
      )}
      
      {/* Feature Buttons */}
      <AnimatePresence>
        {isOpen && (
          <>
            {buttonItems.map((item, index) => {
              const Icon = item.icon;
              // Calculate position based on expanded state
              const angle = (Math.PI / (buttonItems.length - 1)) * index;
              const radius = isExpanded ? 150 : 80;
              const x = Math.cos(angle) * radius * -1; // Negative to go left
              const y = Math.sin(angle) * radius * -1; // Negative to go up
              
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: 1, 
                    x, 
                    y,
                    transition: {
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                      delay: 0.05 * index
                    }
                  }}
                  exit={{ scale: 0, x: 0, y: 0 }}
                  className="absolute z-0 bottom-4 right-4"
                >
                  <Link
                    to={item.link}
                    className={`${item.color} text-white p-3 rounded-full shadow-lg flex items-center space-x-2 
                      ${isExpanded ? 'pl-3 pr-4' : 'w-12 h-12 justify-center'}`}
                  >
                    <Icon className={`w-6 h-6 ${isExpanded ? '' : 'mr-0'}`} />
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>
      
      {/* Main Toggle Button */}
      <motion.button
        className="relative z-10 w-16 h-16 rounded-full bg-[#E44E51] text-white shadow-lg hover:bg-[#D43B3E] flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <Plus className="w-8 h-8" />
        )}
      </motion.button>
    </div>
  );
};

export default FloatingIconsButton;