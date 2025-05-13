import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  // Core icons
  Brain, Camera, Scissors, Type, Clock, Layout, Film, Download, Sparkles,
  
  // Advanced icons
  Wand2, Layers, Mic, Volume2, Palette, Gauge, Smile, HandMetal,
  Maximize2, Send, Trash2, Focus, Monitor, Grid, Sliders, Zap, Play,
  Share2, Image, Scan, Eye, ArrowRight, Video, ChevronRight, ChevronDown
} from 'lucide-react';

interface FeatureTile {
  id: string;
  title: string;
  description: string;
  category: 'ai' | 'recording' | 'editing' | 'export' | 'animation';
  icon: React.ElementType;
  color: string;
  details: string[];
  link: string;
}

const AnimatedFeatureTiles: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(true);
  const [filteredFeatures, setFilteredFeatures] = useState<FeatureTile[]>([]);
  const controls = useAnimation();
  const navigate = useNavigate();

  // Define feature categories
  const categories = [
    { id: 'all', name: 'All Features', icon: Grid },
    { id: 'ai', name: 'AI Features', icon: Brain },
    { id: 'recording', name: 'Recording', icon: Video },
    { id: 'editing', name: 'Editing', icon: Scissors },
    { id: 'export', name: 'Export', icon: Download },
    { id: 'animation', name: 'Animation', icon: Sparkles },
  ];

  // Complete list of all features
  const allFeatures: FeatureTile[] = [
    // AI Features
    {
      id: 'face-detection',
      title: 'Face Detection',
      description: 'Automatically detect and track faces in real-time',
      category: 'ai',
      icon: Camera,
      color: 'from-blue-500 to-indigo-600',
      details: [
        'Identifies multiple faces in frame',
        'Works in varying lighting conditions',
        'Real-time tracking with high accuracy',
        'Powers many other AI-based features'
      ],
      link: '/features/ai'
    },
    {
      id: 'facial-landmarks',
      title: 'Facial Landmarks',
      description: 'Track 468 facial points for precise facial analysis',
      category: 'ai',
      icon: Scan,
      color: 'from-indigo-500 to-purple-600',
      details: [
        'Maps 468 points on the face',
        'Powers expression detection',
        'Enables precise beauty filters',
        'Accurate in real-time'
      ],
      link: '/features/ai'
    },
    {
      id: 'hand-tracking',
      title: 'Hand Tracking',
      description: 'Detect and track hand positions and gestures',
      category: 'ai',
      icon: HandMetal,
      color: 'from-purple-500 to-pink-600',
      details: [
        'Tracks full hand skeleton',
        'Supports multiple hands',
        'Powers gesture recognition',
        'Real-time feedback'
      ],
      link: '/features/ai'
    },
    {
      id: 'background-removal',
      title: 'Background Removal',
      description: 'Remove your background without a green screen',
      category: 'ai',
      icon: Trash2,
      color: 'from-green-500 to-emerald-600',
      details: [
        'No green screen needed',
        'Adjustable edge detection',
        'Custom background replacement',
        'Professional-looking results'
      ],
      link: '/features/ai'
    },
    {
      id: 'background-blur',
      title: 'Background Blur',
      description: 'Apply blur effect to video background',
      category: 'ai',
      icon: Layers,
      color: 'from-cyan-500 to-teal-600',
      details: [
        'Adjustable blur intensity',
        'Real-time processing',
        'Professional appearance',
        'Privacy-enhancing feature'
      ],
      link: '/features/ai'
    },
    
    // Recording Features
    {
      id: 'webcam-recording',
      title: 'Webcam Recording',
      description: 'High-quality webcam capture with effects',
      category: 'recording',
      icon: Camera,
      color: 'from-pink-500 to-rose-600',
      details: [
        'Multiple resolution options up to 4K',
        'Frame rate selection up to 60fps',
        'Device selection support',
        'Auto-adjustment for lighting'
      ],
      link: '/features/recorder'
    },
    {
      id: 'screen-recording',
      title: 'Screen Recording',
      description: 'Capture your screen with system audio',
      category: 'recording',
      icon: Monitor,
      color: 'from-amber-500 to-orange-600',
      details: [
        'Capture entire screen or specific window',
        'System audio recording',
        'Mouse click visualization',
        'Multiple monitor support'
      ],
      link: '/features/recorder'
    },
    {
      id: 'pip-recording',
      title: 'Picture-in-Picture',
      description: 'Combine screen and webcam recording',
      category: 'recording',
      icon: Layout,
      color: 'from-violet-500 to-purple-600',
      details: [
        'Adjustable webcam overlay',
        'Drag-and-resize during recording',
        'Preset positions and layouts',
        'Perfect for tutorials and presentations'
      ],
      link: '/features/recorder'
    },
    {
      id: 'audio-enhancement',
      title: 'Audio Enhancement',
      description: 'Advanced audio processing for clear sound',
      category: 'recording',
      icon: Mic,
      color: 'from-blue-400 to-indigo-500',
      details: [
        'Noise suppression',
        'Echo cancellation',
        'Auto gain control',
        'Audio equalization'
      ],
      link: '/features/recorder'
    },
    
    // Editing Features
    {
      id: 'silent-removal',
      title: 'Silent Removal',
      description: 'Automatically remove silent parts of videos',
      category: 'editing',
      icon: Volume2,
      color: 'from-purple-500 to-indigo-600',
      details: [
        'Adjustable silence threshold',
        'Minimum duration settings',
        'Visual waveform editing',
        'Smart padding options'
      ],
      link: '/features/editor'
    },
    {
      id: 'auto-captions',
      title: 'Auto Captions',
      description: 'Generate and edit accurate video captions',
      category: 'editing',
      icon: Type,
      color: 'from-blue-500 to-cyan-600',
      details: [
        'AI-powered speech recognition',
        'Multiple language support',
        'Editable caption text',
        'Style and position customization'
      ],
      link: '/features/editor'
    },
    {
      id: 'chapter-markers',
      title: 'Chapter Markers',
      description: 'Add navigation points throughout your video',
      category: 'editing',
      icon: Clock,
      color: 'from-amber-500 to-yellow-600',
      details: [
        'Custom chapter titles',
        'Thumbnail generation per chapter',
        'Auto chapter detection',
        'Export to video platforms'
      ],
      link: '/features/editor'
    },
    {
      id: 'b-roll-management',
      title: 'B-Roll Management',
      description: 'Organize and insert supplementary footage',
      category: 'editing',
      icon: Film,
      color: 'from-green-500 to-teal-600',
      details: [
        'Drag-and-drop interface',
        'Categories and tags',
        'Search and filter options',
        'Preview and trim capabilities'
      ],
      link: '/features/editor'
    },
    {
      id: 'video-effects',
      title: 'Video Effects',
      description: 'Apply professional video effects and adjustments',
      category: 'editing',
      icon: Wand2,
      color: 'from-rose-500 to-red-600',
      details: [
        'Color correction and grading',
        'Visual filters and effects',
        'Blur, sharpen, and denoise',
        'Vignette and light effects'
      ],
      link: '/features/editor'
    },
    {
      id: 'transitions',
      title: 'Transitions',
      description: 'Add smooth transitions between video segments',
      category: 'editing',
      icon: Sliders,
      color: 'from-pink-500 to-rose-600',
      details: [
        'Multiple transition styles',
        'Customizable duration',
        'Preview in real-time',
        'Smart transition suggestions'
      ],
      link: '/features/editor'
    },
    
    // Export Features
    {
      id: 'multi-format',
      title: 'Multi-format Export',
      description: 'Export videos in various formats',
      category: 'export',
      icon: Download,
      color: 'from-sky-500 to-blue-600',
      details: [
        'MP4, WebM, MOV formats',
        'Adjustable quality and compression',
        'Custom resolution options',
        'Frame rate selection'
      ],
      link: '/features/export'
    },
    {
      id: 'social-optimization',
      title: 'Social Optimization',
      description: 'Optimize videos for different social platforms',
      category: 'export',
      icon: Share2,
      color: 'from-blue-400 to-indigo-500',
      details: [
        'Platform-specific presets',
        'Aspect ratio adjustment',
        'Optimized compression',
        'Platform guidelines compliance'
      ],
      link: '/features/export'
    },
    {
      id: 'quality-control',
      title: 'Quality Control',
      description: 'Advanced quality settings and previews',
      category: 'export',
      icon: Gauge,
      color: 'from-violet-500 to-purple-600',
      details: [
        'Bitrate adjustment',
        'Resolution options',
        'File size estimation',
        'Quality preview'
      ],
      link: '/features/export'
    },
    
    // Animation Features
    {
      id: 'gif-creator',
      title: 'GIF Creator',
      description: 'Create high-quality animated GIFs from videos',
      category: 'animation',
      icon: Film,
      color: 'from-emerald-500 to-green-600',
      details: [
        'Adjustable frame rate',
        'Color optimization',
        'Custom looping options',
        'Smart sizing and compression'
      ],
      link: '/features/animation'
    },
    {
      id: 'thumbnail-generator',
      title: 'Thumbnail Generator',
      description: 'Extract and enhance thumbnails from videos',
      category: 'animation',
      icon: Image,
      color: 'from-amber-500 to-yellow-600',
      details: [
        'AI-powered frame selection',
        'Multiple thumbnail generation',
        'Text overlay options',
        'Color enhancement'
      ],
      link: '/features/animation'
    },
    {
      id: 'animation-effects',
      title: 'Animation Effects',
      description: 'Apply animation effects to videos and images',
      category: 'animation',
      icon: Sparkles,
      color: 'from-red-500 to-orange-600',
      details: [
        'Keyframe animation',
        'Motion graphics',
        'Text animation',
        'Animated overlays'
      ],
      link: '/features/animation'
    },
  ];

  // Filter features based on active category
  useEffect(() => {
    let filtered = [...allFeatures];
    if (activeCategory && activeCategory !== 'all') {
      filtered = allFeatures.filter(feature => feature.category === activeCategory);
    }
    
    setFilteredFeatures(filtered);
    
    // Stagger animation for the tiles
    controls.start(i => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.5 }
    }));
  }, [activeCategory, controls]);

  // Set default on initial load
  useEffect(() => {
    setActiveCategory('all');
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Reset viewed item
    setHoveredTile(null);
  };

  const handleFeatureClick = (link: string) => {
    navigate(link);
  };

  // Calculate number of columns based on category
  const getGridColumns = () => {
    if (!isGridView) return 'grid-cols-1';
    
    const count = filteredFeatures.length;
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2 
            className="text-3xl sm:text-4xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            Feature-Rich Platform
          </motion.h2>
          <motion.p 
            className="mt-4 text-xl text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Explore our comprehensive set of features
          </motion.p>
        </div>
        
        {/* Category Filters + View Toggle */}
        <div className="mb-10 flex flex-wrap justify-between items-center">
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-0">
            {categories.map((category, idx) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    isActive 
                      ? 'bg-[#E44E51] text-white shadow-md' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </motion.button>
              );
            })}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setIsGridView(true)}
              className={`p-2 rounded-lg ${
                isGridView ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-white text-gray-700'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsGridView(false)}
              className={`p-2 rounded-lg ${
                !isGridView ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-white text-gray-700'
              }`}
            >
              <Layout className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Feature Tiles */}
        <motion.div 
          className={`grid ${getGridColumns()} gap-6`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {filteredFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            const isHovered = hoveredTile === feature.id;
            
            return (
              <motion.div
                key={feature.id}
                custom={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={controls}
                whileHover={{ 
                  y: -10, 
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  transition: { duration: 0.3 }
                }}
                className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 ${
                  isGridView ? '' : 'md:flex'
                }`}
                onMouseEnter={() => setHoveredTile(feature.id)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => handleFeatureClick(feature.link)}
              >
                {/* Icon Section */}
                <div className={`${isGridView ? 'p-6' : 'p-6 md:w-64 flex-shrink-0'}`}>
                  <div className={`w-16 h-16 mb-4 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-lg`}>
                    <motion.div
                      animate={{ rotate: isHovered ? 360 : 0 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  {(!isHovered || !isGridView) && (
                    <p className="text-gray-600">{feature.description}</p>
                  )}
                </div>
                
                {/* Expandable Content */}
                <div className={isGridView ? '' : 'md:flex-1'}>
                  <AnimatePresence>
                    {(isHovered && isGridView) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-6 pb-6"
                      >
                        <div className={`w-full h-px bg-gradient-to-r ${feature.color} my-3`}></div>
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.1
                              }
                            }
                          }}
                          className="mb-4"
                        >
                          {feature.details.map((detail, index) => (
                            <motion.div 
                              key={index}
                              variants={{
                                hidden: { opacity: 0, x: -20 },
                                visible: { opacity: 1, x: 0 }
                              }}
                              className="flex items-start mt-2"
                            >
                              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600 text-sm">{detail}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                        
                        <Link
                          to={feature.link}
                          className="inline-flex items-center text-sm font-medium text-[#E44E51] hover:text-[#D43B3E] group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Learn more</span>
                          <motion.div
                            animate={{ x: isHovered ? 5 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </motion.div>
                        </Link>
                      </motion.div>
                    )}
                    
                    {/* List view always shows details */}
                    {!isGridView && (
                      <div className="p-6 border-t border-gray-100 md:border-t-0 md:border-l">
                        <div className="space-y-2 mb-4">
                          {feature.details.map((detail, index) => (
                            <div key={index} className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-600">{detail}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Link
                          to={feature.link}
                          className="inline-flex items-center text-sm font-medium text-[#E44E51] hover:text-[#D43B3E] group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Learn more</span>
                          <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        
        {/* Show All Features Link */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/app"
            className="inline-flex items-center px-6 py-3 text-lg font-semibold rounded-lg bg-[#E44E51] text-white shadow-lg hover:bg-[#D43B3E] transition-colors"
          >
            <span>Try All Features</span>
            <ChevronRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-4 text-gray-500">
            All features are available in our free plan with no credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AnimatedFeatureTiles;