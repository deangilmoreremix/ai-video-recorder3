import React from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Brain, Scissors, Type, Clock, Layout, Film, Download, Sparkles,
  Wand2, Layers, Mic, Volume2, Palette, Gauge, Smile, HandMetal,
  Maximize2, Send, Trash2, Focus, Monitor, Grid, Sliders, Zap,
  Video, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'ai' | 'recording' | 'editing' | 'export' | 'animation';
}

const FeaturesList: React.FC = () => {
  // Define all features
  const allFeatures: Feature[] = [
    // AI Features
    {
      title: 'Face Detection',
      description: 'Automatically detect and track faces in real-time',
      icon: Camera,
      category: 'ai'
    },
    {
      title: 'Facial Landmarks',
      description: 'Track 468 facial points for precise facial analysis',
      icon: Scan,
      category: 'ai'
    },
    {
      title: 'Hand Tracking',
      description: 'Detect and track hand positions and gestures',
      icon: HandMetal,
      category: 'ai'
    },
    {
      title: 'Background Removal',
      description: 'Remove your background without a green screen',
      icon: Trash2,
      category: 'ai'
    },
    {
      title: 'Background Blur',
      description: 'Apply blur effect to video background',
      icon: Layers,
      category: 'ai'
    },
    {
      title: 'Expression Detection',
      description: 'Detect facial expressions and emotions',
      icon: Smile,
      category: 'ai'
    },
    {
      title: 'Gesture Recognition',
      description: 'Control recording with hand gestures',
      icon: Send,
      category: 'ai'
    },
    {
      title: 'Auto Framing',
      description: 'Automatically frame and follow subjects',
      icon: Focus,
      category: 'ai'
    },
    {
      title: 'Beautification',
      description: 'Enhance facial features automatically',
      icon: Sparkles,
      category: 'ai'
    },
    {
      title: 'Enhanced Lighting',
      description: 'Adjust lighting conditions automatically',
      icon: Zap,
      category: 'ai'
    },
    
    // Recording Features
    {
      title: 'Webcam Recording',
      description: 'High-quality webcam capture with effects',
      icon: Camera,
      category: 'recording'
    },
    {
      title: 'Screen Recording',
      description: 'Capture your screen with system audio',
      icon: Monitor,
      category: 'recording'
    },
    {
      title: 'Picture-in-Picture',
      description: 'Combine screen and webcam recording',
      icon: Layout,
      category: 'recording'
    },
    {
      title: 'Multi-device Capture',
      description: 'Record from multiple cameras simultaneously',
      icon: Grid,
      category: 'recording'
    },
    {
      title: 'Audio Enhancement',
      description: 'Noise suppression and audio improvement',
      icon: Mic,
      category: 'recording'
    },
    
    // Editing Features
    {
      title: 'Silent Segment Removal',
      description: 'Automatically remove silent parts of videos',
      icon: Volume2,
      category: 'editing'
    },
    {
      title: 'Auto Captions',
      description: 'Generate and edit accurate video captions',
      icon: Type,
      category: 'editing'
    },
    {
      title: 'Chapter Markers',
      description: 'Add navigation points throughout your video',
      icon: Clock,
      category: 'editing'
    },
    {
      title: 'B-Roll Management',
      description: 'Organize and insert supplementary video footage',
      icon: Film,
      category: 'editing'
    },
    {
      title: 'Video Effects',
      description: 'Apply professional video effects and adjustments',
      icon: Wand2,
      category: 'editing'
    },
    {
      title: 'Transition Effects',
      description: 'Add smooth transitions between video segments',
      icon: Sliders,
      category: 'editing'
    },
    {
      title: 'End Cards',
      description: 'Create interactive end screens for your videos',
      icon: Layout,
      category: 'editing'
    },
    
    // Export Features
    {
      title: 'Multi-format Export',
      description: 'Export videos in various formats (MP4, WebM, etc.)',
      icon: Download,
      category: 'export'
    },
    {
      title: 'Social Media Optimization',
      description: 'Optimize videos for different social platforms',
      icon: Share,
      category: 'export'
    },
    {
      title: 'Quality Control',
      description: 'Adjust resolution, bitrate, and quality settings',
      icon: Gauge,
      category: 'export'
    },
    {
      title: 'Batch Processing',
      description: 'Export multiple videos with the same settings',
      icon: Layers,
      category: 'export'
    },
    
    // Animation Features
    {
      title: 'GIF Creator',
      description: 'Create high-quality animated GIFs from videos',
      icon: Film,
      category: 'animation'
    },
    {
      title: 'Thumbnail Generator',
      description: 'Extract and enhance thumbnails from videos',
      icon: Image,
      category: 'animation'
    },
    {
      title: 'Animation Effects',
      description: 'Apply animation effects to videos and images',
      icon: Palette,
      category: 'animation'
    },
    {
      title: 'WebP Animation',
      description: 'Create modern WebP animations with transparency',
      icon: Sparkles,
      category: 'animation'
    }
  ];

  // Group features by category
  const categories = [
    { id: 'ai', title: 'AI Features', path: '/features/ai', icon: Brain },
    { id: 'recording', title: 'Recording Features', path: '/features/recorder', icon: Video },
    { id: 'editing', title: 'Editing Features', path: '/features/editor', icon: Scissors },
    { id: 'export', title: 'Export Features', path: '/features/export', icon: Download },
    { id: 'animation', title: 'Animation Features', path: '/features/animation', icon: Wand2 }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Comprehensive Feature Set
          </motion.h2>
          <motion.p 
            className="mt-4 text-xl text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Everything you need for professional video creation in one tool
          </motion.p>
        </div>
        
        <div className="space-y-20">
          {categories.map((category) => {
            const categoryFeatures = allFeatures.filter(feature => feature.category === category.id);
            const CategoryIcon = category.icon;
            
            return (
              <div key={category.id} className="space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <CategoryIcon className="h-6 w-6 text-[#E44E51]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
                    <Link 
                      to={category.path}
                      className="text-[#E44E51] flex items-center hover:underline mt-1"
                    >
                      <span>Explore all {category.title.toLowerCase()}</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
                
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                >
                  {categoryFeatures.map((feature, index) => {
                    const FeatureIcon = feature.icon;
                    
                    return (
                      <motion.div 
                        key={`${category.id}-${index}`}
                        className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                        variants={itemVariants}
                      >
                        <div className={`w-10 h-10 rounded-full bg-[#E44E51]/10 flex items-center justify-center mb-4`}>
                          <FeatureIcon className="w-5 h-5 text-[#E44E51]" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturesList;