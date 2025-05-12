import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Layers, Wand2, Camera } from 'lucide-react';

const AIFeatureShowcase: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState('face-detection');
  
  const features = [
    {
      id: 'face-detection',
      title: 'Face Detection & Tracking',
      description: 'Our AI can detect and track faces in real-time, enabling dynamic effects and precise focusing.',
      icon: Camera,
      video: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-to-camera-for-a-vlog-40885-large.mp4'
    },
    {
      id: 'background-removal',
      title: 'Background Removal',
      description: 'Remove your background instantly without a green screen, creating a professional look anywhere.',
      icon: Layers,
      video: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-vlogging-about-her-new-year-resolutions-47022-large.mp4'
    },
    {
      id: 'facial-landmarks',
      title: 'Facial Landmarks',
      description: 'Track 468 facial points to enable advanced effects, expressions, and animations.',
      icon: Scan,
      video: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-looking-at-camera-43786-large.mp4'
    },
    {
      id: 'beauty-filters',
      title: 'Beauty Filters',
      description: 'Enhance your appearance subtly with AI-powered beauty filters that adapt to lighting conditions.',
      icon: Wand2,
      video: 'https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-young-model-posing-during-a-shoot-43929-large.mp4'
    }
  ];
  
  const activeFeatureData = features.find(f => f.id === activeFeature);

  return (
    <div className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Experience AI-Powered Video Enhancement</h2>
          <p className="mt-4 text-xl text-gray-300">See how our AI features transform your recordings in real-time</p>
        </div>
        
        <div className="md:flex md:items-start md:space-x-8">
          {/* Feature Selection */}
          <div className="md:w-1/3 flex flex-col space-y-4">
            {features.map((feature) => {
              const isActive = feature.id === activeFeature;
              const Icon = feature.icon;
              
              return (
                <motion.button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`p-4 rounded-lg text-left transition-all duration-300 ${
                    isActive 
                      ? 'bg-[#E44E51]/10 border-l-4 border-[#E44E51]' 
                      : 'bg-white/5 hover:bg-white/10 border-l-4 border-transparent'
                  }`}
                  whileHover={{ x: isActive ? 0 : 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start">
                    <div className={`${
                      isActive ? 'text-[#E44E51]' : 'text-gray-400'
                    } mr-3 mt-1`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${
                        isActive ? 'text-[#E44E51]' : 'text-white'
                      }`}>{feature.title}</h3>
                      <p className={`mt-1 text-sm ${
                        isActive ? 'text-[#E44E51]/80' : 'text-gray-400'
                      }`}>{feature.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Feature Demo */}
          <div className="mt-8 md:mt-0 md:w-2/3">
            <div className="rounded-lg overflow-hidden bg-gray-800 aspect-video shadow-2xl relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <video 
                    className="w-full h-full object-cover"
                    src={activeFeatureData?.video}
                    autoPlay
                    loop
                    muted
                  ></video>
                  
                  {/* Overlay to show the effect being applied */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#E44E51]">
                        {activeFeatureData && React.createElement(activeFeatureData.icon, { className: "w-4 h-4 mr-1" })}
                        {activeFeatureData?.title}
                      </span>
                      <div className="mt-2 text-xs text-white/80">AI processing applied in real-time</div>
                    </div>
                  </div>
                  
                  {/* Simulated AI detection overlay */}
                  {activeFeature === 'face-detection' && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-2 border-[#E44E51] animate-pulse"></div>
                  )}
                  
                  {activeFeature === 'facial-landmarks' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="200" height="200" viewBox="0 0 100 100">
                        <g className="text-[#E44E51]" fill="currentColor">
                          {/* Simplified facial landmark points */}
                          {Array.from({ length: 30 }).map((_, i) => {
                            const angle = (i / 30) * Math.PI * 2;
                            const x = 50 + 25 * Math.cos(angle);
                            const y = 50 + 25 * Math.sin(angle);
                            return (
                              <circle key={i} cx={x} cy={y} r="0.5" />
                            );
                          })}
                          
                          {/* Eyes */}
                          <circle cx="40" cy="40" r="1" />
                          <circle cx="60" cy="40" r="1" />
                          
                          {/* Mouth */}
                          <path d="M40,60 Q50,70 60,60" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </g>
                      </svg>
                    </div>
                  )}
                  
                  {activeFeature === 'background-removal' && (
                    <div className="absolute inset-0 bg-[#00FF00] mix-blend-screen opacity-20"></div>
                  )}
                  
                  {activeFeature === 'beauty-filters' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10"></div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="mt-8 grid grid-cols-4 gap-4">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`aspect-video rounded-lg overflow-hidden relative ${
                    activeFeature === feature.id ? 'ring-4 ring-[#E44E51]' : 'ring-1 ring-white/10'
                  }`}
                >
                  <video 
                    src={feature.video} 
                    className="w-full h-full object-cover"
                    muted
                  ></video>
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <feature.icon className={`w-8 h-8 ${
                      activeFeature === feature.id ? 'text-[#E44E51]' : 'text-white/70'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeatureShowcase;