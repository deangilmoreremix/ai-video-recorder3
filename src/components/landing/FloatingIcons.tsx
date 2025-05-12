import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Brain, Scissors, Type, Clock, Layout, Film, Download, Sparkles, 
  Wand2, Layers, Mic, Volume2, Palette, Gauge, Smile, HandMetal, 
  Maximize2, Send, Trash2, Focus, Monitor, Grid, Sliders, Zap
} from 'lucide-react';

interface FloatingIconsProps {
  className?: string;
}

const FloatingIcons: React.FC<FloatingIconsProps> = ({ className = '' }) => {
  const icons = [
    { Icon: Camera, color: 'bg-blue-500', delay: 0 },
    { Icon: Brain, color: 'bg-purple-500', delay: 0.5 },
    { Icon: Scissors, color: 'bg-amber-500', delay: 1 },
    { Icon: Type, color: 'bg-green-500', delay: 1.5 },
    { Icon: Clock, color: 'bg-pink-500', delay: 2 },
    { Icon: Wand2, color: 'bg-indigo-500', delay: 2.5 },
    { Icon: Layout, color: 'bg-cyan-500', delay: 3 },
    { Icon: Sparkles, color: 'bg-rose-500', delay: 3.5 },
    { Icon: Layers, color: 'bg-emerald-500', delay: 4 },
    { Icon: Volume2, color: 'bg-orange-500', delay: 4.5 },
    { Icon: HandMetal, color: 'bg-lime-500', delay: 5 },
    { Icon: Trash2, color: 'bg-red-500', delay: 5.5 },
    { Icon: Mic, color: 'bg-violet-500', delay: 6 },
    { Icon: Film, color: 'bg-amber-600', delay: 6.5 },
    { Icon: Download, color: 'bg-sky-500', delay: 7 },
    { Icon: Focus, color: 'bg-yellow-500', delay: 7.5 },
    { Icon: Maximize2, color: 'bg-blue-600', delay: 8 },
    { Icon: Smile, color: 'bg-teal-500', delay: 8.5 },
    { Icon: Monitor, color: 'bg-fuchsia-500', delay: 9 },
    { Icon: Send, color: 'bg-cyan-600', delay: 9.5 }
  ];

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {icons.map((icon, index) => {
        const { Icon, color, delay } = icon;
        
        // Calculate random positions
        const leftPosition = Math.random() * 100;
        const topPosition = Math.random() * 100;
        const size = Math.floor(Math.random() * 16) + 24; // 24-40px
        const duration = Math.random() * 20 + 20; // 20-40s
        const floatAmplitude = Math.random() * 30 + 15; // 15-45px

        return (
          <motion.div
            key={index}
            className="absolute"
            style={{ left: `${leftPosition}%`, top: `${topPosition}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.7, 0.5],
              scale: [0, 1, 0.8],
              y: [`${-floatAmplitude}px`, `${floatAmplitude}px`, `${-floatAmplitude}px`],
              x: [`${-floatAmplitude/2}px`, `${floatAmplitude/2}px`, `${-floatAmplitude/2}px`],
            }}
            transition={{
              delay: delay,
              opacity: { duration: 2 },
              scale: { duration: 2 },
              y: { 
                repeat: Infinity, 
                duration: duration,
                ease: "easeInOut",
                repeatType: "mirror"
              },
              x: { 
                repeat: Infinity, 
                duration: duration * 1.3,
                ease: "easeInOut",
                repeatType: "mirror"
              }
            }}
          >
            <div className={`${color} p-2 rounded-full shadow-lg bg-opacity-80`}>
              <Icon size={size} className="text-white" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FloatingIcons;