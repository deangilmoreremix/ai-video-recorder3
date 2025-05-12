import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Brain, Film, Download, Scissors, ArrowRight, Type, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnimatedFeatureCards = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  const features = [
    {
      title: "AI-Powered Features",
      description: "Enhance your videos with face detection, background removal, and advanced beautification. Our AI features work in real-time during recording.",
      icon: Brain,
      color: "bg-gradient-to-r from-blue-500 to-indigo-600",
      link: "/features/ai",
      details: [
        "Face tracking and detection",
        "Background removal without green screen",
        "Real-time beautification filters",
        "Gesture recognition and control"
      ]
    },
    {
      title: "Professional Recording",
      description: "Capture high-quality video from your webcam, screen, or both with our versatile recording modes and advanced settings.",
      icon: Camera,
      color: "bg-gradient-to-r from-pink-500 to-rose-600",
      link: "/features/recorder",
      details: [
        "Multiple resolution options up to 4K",
        "Picture-in-picture recording mode",
        "Advanced audio capture and enhancement",
        "Scheduled and timed recordings"
      ]
    },
    {
      title: "Comprehensive Editing",
      description: "Edit your videos with precision using our powerful editing suite with innovative features that save you time.",
      icon: Scissors,
      color: "bg-gradient-to-r from-amber-500 to-orange-600",
      link: "/features/editor",
      details: [
        "Automatic silent segment removal",
        "AI-generated captions and chapters",
        "B-roll management and organization",
        "Advanced video effects and transitions"
      ]
    },
    {
      title: "Animation & GIFs",
      description: "Transform your videos into eye-catching GIFs and generate perfect thumbnails with our specialized tools.",
      icon: Sparkles,
      color: "bg-gradient-to-r from-green-500 to-teal-600",
      link: "/features/animation",
      details: [
        "High-quality GIF creation with optimization",
        "Smart thumbnail generation",
        "Animated stickers and overlays",
        "WebP animation support"
      ]
    },
    {
      title: "Flexible Exporting",
      description: "Export your videos optimized for any platform with customizable quality settings and formats.",
      icon: Download,
      color: "bg-gradient-to-r from-cyan-500 to-blue-600",
      link: "/features/export",
      details: [
        "Multiple format support (MP4, WebM, GIF)",
        "Social media optimization presets",
        "Video compression options",
        "Direct sharing capabilities"
      ]
    }
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isHovered = hoveredCard === index;
          
          return (
            <motion.div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer relative group"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="p-6">
                <div className={`w-14 h-14 rounded-full ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
              
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4">
                      <div className={`w-full h-px ${feature.color} my-2`}></div>
                      <ul className="space-y-1 mt-2 mb-3">
                        {feature.details.map((detail, idx) => (
                          <motion.li 
                            key={idx} 
                            className="flex items-start"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.1 }}
                          >
                            <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-600">{detail}</span>
                          </motion.li>
                        ))}
                      </ul>
                      
                      <Link
                        to={feature.link}
                        className="inline-flex items-center text-sm font-medium text-[#E44E51] hover:text-[#D43B3E] group"
                      >
                        <span>Learn more</span>
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div 
                className={`absolute bottom-0 left-0 right-0 h-1 ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}
              ></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AnimatedFeatureCards;