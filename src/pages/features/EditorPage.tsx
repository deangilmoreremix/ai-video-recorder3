import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Scissors, Type, Clock, Layout, Film, Volume2, ChevronRight, Wand2, Layers } from 'lucide-react';
import lottie from 'lottie-web';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';

const EditorPage = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<HTMLDivElement>(null);
  const silentRemRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(featuresRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // Initialize timeline animation
    if (timelineRef.current) {
      lottie.loadAnimation({
        container: timelineRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets3.lottiefiles.com/packages/lf20_lgzvoqmi.json' // Video editing timeline animation
      });
    }
    
    // Initialize captions animation
    if (captionsRef.current) {
      lottie.loadAnimation({
        container: captionsRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets9.lottiefiles.com/packages/lf20_5tl1xxnz.json' // Captions animation
      });
    }
    
    // Initialize silent removal animation
    if (silentRemRef.current) {
      lottie.loadAnimation({
        container: silentRemRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets10.lottiefiles.com/packages/lf20_l4kbwgv3.json' // Audio waveform animation
      });
    }
  }, []);

  // Define features
  const editorFeatures = [
    {
      id: 'silent-removal',
      title: 'Silent Segment Removal',
      description: 'Automatically detect and remove silent parts of your videos, saving time and making content more engaging.',
      icon: Volume2,
      color: 'bg-purple-600',
      image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
    },
    {
      id: 'captions',
      title: 'AI-Generated Captions',
      description: 'Create accurate, editable captions automatically to make your content more accessible and SEO-friendly.',
      icon: Type,
      color: 'bg-blue-600',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
    },
    {
      id: 'chapters',
      title: 'Chapter Markers',
      description: 'Add navigational points throughout your video with custom timestamps and titles.',
      icon: Clock,
      color: 'bg-amber-500',
      image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
    },
    {
      id: 'b-roll',
      title: 'B-Roll Manager',
      description: 'Organize and insert supplementary footage easily with our intuitive B-roll management system.',
      icon: Film,
      color: 'bg-green-600',
      image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80'
    },
    {
      id: 'effects',
      title: 'Video Effects',
      description: 'Apply professional video effects including color grading, transitions, and visual enhancements.',
      icon: Wand2,
      color: 'bg-pink-500',
      image: 'https://images.unsplash.com/photo-1492619861340-4caf053981f0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1173&q=80'
    },
    {
      id: 'end-cards',
      title: 'Interactive End Cards',
      description: 'Create engaging end screens with links to other videos, playlists, or websites.',
      icon: Layout,
      color: 'bg-indigo-600',
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80'
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-black py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/5 blur-3xl transform rotate-12"></div>
          <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#E44E51]/20 to-[#D43B3E]/5 blur-3xl transform -rotate-12"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="md:flex md:items-center md:justify-between md:space-x-10">
            <div className="md:w-1/2">
              <motion.h1 
                className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Powerful Video Editing Tools
              </motion.h1>
              <motion.p 
                className="mt-6 text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Edit your videos with precision using our comprehensive suite of professional tools. From silent segment removal to captions, chapters, and effects.
              </motion.p>
              <motion.div 
                className="mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Link
                  to="/app"
                  className="rounded-md bg-[#E44E51] px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-[#D43B3E] hover:shadow-[#E44E51]/25 transition-all duration-200"
                >
                  Try Editor Now
                </Link>
              </motion.div>
            </div>
            
            <motion.div 
              className="mt-12 md:mt-0 md:w-1/2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div ref={timelineRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Silent Removal Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:space-x-10">
            <div className="md:w-1/2">
              <motion.div 
                className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border-8 border-gray-800"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="absolute inset-0 bg-gray-900">
                  <div ref={silentRemRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
              </motion.div>
            </div>
            
            <div className="mt-12 md:mt-0 md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Smart Audio Processing
                </div>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">Silent Segment Removal</h2>
                <p className="mt-6 text-xl text-gray-600">
                  Automatically detect and remove awkward pauses and silent segments from your videos, making your content more engaging and professional.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Customizable silence threshold and duration settings</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Visual waveform display for precise control</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Intelligent audio preservation for music and background sounds</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Captions Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:space-x-10 md:flex-row-reverse">
            <div className="md:w-1/2">
              <motion.div 
                className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border-8 border-gray-800"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="absolute inset-0 bg-gray-900">
                  <div ref={captionsRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
              </motion.div>
            </div>
            
            <div className="mt-12 md:mt-0 md:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <Type className="w-4 h-4 mr-2" />
                  Accessibility & Engagement
                </div>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">AI-Generated Captions</h2>
                <p className="mt-6 text-xl text-gray-600">
                  Create accurate, editable captions automatically to make your content more accessible and engaging for all viewers.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Automatic speech recognition with high accuracy</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Speaker detection for multi-person videos</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Customizable styles, positions, and formatting</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Export captions as SRT, VTT, or burn into video</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="py-24 bg-white" ref={featuresRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Comprehensive Editing Suite</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to create professional-quality videos</p>
          </div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {editorFeatures.map((feature) => (
              <motion.div 
                key={feature.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                variants={itemVariants}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Professional Editing Features */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Professional Video Effects</h2>
            <p className="mt-4 text-xl text-gray-600">Enhance your videos with stunning effects and transitions</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Wand2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="ml-4 text-xl font-bold text-gray-900">Visual Effects</h3>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-gray-600">Transform your videos with professional color grading, filters, and visual enhancements.</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Color correction and grading</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Sharpening and noise reduction</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Vignettes, grain, and film effects</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="ml-4 text-xl font-bold text-gray-900">Transitions & Motion</h3>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-gray-600">Add smooth transitions between clips and dynamic motion effects to create professional-looking videos.</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Smooth fade, slide, and zoom transitions</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Custom duration and easing controls</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Ken Burns and motion effects</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                    <Volume2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="ml-4 text-xl font-bold text-gray-900">Audio Enhancement</h3>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-gray-600">Perfect your audio with professional enhancement tools and effects.</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Noise reduction and audio cleanup</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Volume normalization and equalization</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Background music and audio mixing</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center">
                    <Film className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="ml-4 text-xl font-bold text-gray-900">B-Roll & Media Management</h3>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-gray-600">Organize and manage your media assets efficiently with our comprehensive B-roll system.</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Drag-and-drop media organization</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">AI-powered tagging and categorization</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Custom collections and playlists</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to edit your videos like a pro?
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Try our powerful video editor and see the difference.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Start Editing Now</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default EditorPage;