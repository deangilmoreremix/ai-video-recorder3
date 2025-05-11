import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Monitor, Layout, Mic, Settings, Brain, Sliders, Sparkles, Play, ChevronRight } from 'lucide-react';
import lottie from 'lottie-web';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import RecordingModeCard from '../../components/landing/RecordingModeCard';

const VideoRecorderPage = () => {
  const recordAnimRef = useRef<HTMLDivElement>(null);
  const pipAnimRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(featuresRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // Load recording animation
    if (recordAnimRef.current) {
      lottie.loadAnimation({
        container: recordAnimRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets10.lottiefiles.com/packages/lf20_QBWCWNRT6s.json' // Recording animation
      });
    }
    
    // Load PiP animation
    if (pipAnimRef.current) {
      lottie.loadAnimation({
        container: pipAnimRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets10.lottiefiles.com/packages/lf20_ymyahtcy.json' // PiP animation
      });
    }
  }, []);

  const recordingModes = [
    {
      id: 'webcam',
      title: 'Webcam Recording',
      description: 'Record high-quality video from your webcam with AI enhancements.',
      icon: Camera,
      image: 'https://images.unsplash.com/photo-1587614313085-5da51cebd8ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      features: [
        'Multiple resolution options up to 4K',
        'AI background removal and blur',
        'Face tracking and auto-framing',
        'Beauty filters and adjustments'
      ]
    },
    {
      id: 'screen',
      title: 'Screen Recording',
      description: 'Capture your screen with crystal-clear quality and audio narration.',
      icon: Monitor,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      features: [
        'Full desktop or single application capture',
        'System audio recording',
        'Mouse click visualization',
        'Highlight active windows and regions'
      ]
    },
    {
      id: 'pip',
      title: 'Picture-in-Picture',
      description: 'Combine screen and webcam recording for engaging presentations.',
      icon: Layout,
      image: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80',
      features: [
        'Customizable webcam positioning and size',
        'Drag and resize webcam overlay during recording',
        'Auto-focus between screen and presenter',
        'Synchronized audio mixing'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-black py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#E44E51]/20 to-[#D43B3E]/5 blur-3xl transform rotate-12"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 blur-3xl transform -rotate-12"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="md:flex md:items-center md:justify-between md:space-x-10">
            <div className="md:w-1/2">
              <motion.h1 
                className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                Professional Video Recording Made Simple
              </motion.h1>
              <motion.p 
                className="mt-6 text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Capture high-quality video from your webcam, screen, or both with our intuitive recorder. Apply real-time AI enhancements for professional results every time.
              </motion.p>
              <motion.div 
                className="mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Link
                  to="/app"
                  className="rounded-md bg-[#E44E51] px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-[#D43B3E] hover:shadow-[#E44E51]/25 transition-all duration-200 inline-flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Recording Now</span>
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
                <div className="absolute inset-0">
                  <div className="w-full h-full" ref={recordAnimRef}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Recording Modes Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Versatile Recording Modes</h2>
            <p className="mt-4 text-xl text-gray-600">Choose the perfect recording mode for your content</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recordingModes.map((mode) => (
              <RecordingModeCard
                key={mode.id}
                title={mode.title}
                description={mode.description}
                icon={mode.icon}
                image={mode.image}
                features={mode.features}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Picture-in-Picture Demo */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:space-x-10">
            <div className="md:w-1/2">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Picture-in-Picture Recording</h2>
              <p className="mt-6 text-xl text-gray-600">
                Combine screen and webcam recording for engaging presentations. Customize the position, size, and appearance of your webcam overlay.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <Layout className="h-6 w-6 text-[#E44E51]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Customizable Layout</h4>
                    <p className="mt-1 text-gray-600">Drag, resize, and position your webcam feed anywhere on screen during recording.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <Mic className="h-6 w-6 text-[#E44E51]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Advanced Audio Mixing</h4>
                    <p className="mt-1 text-gray-600">Capture both system audio and microphone simultaneously with perfect synchronization.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-[#E44E51]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">AI Enhancements</h4>
                    <p className="mt-1 text-gray-600">Apply background removal, blur, and other effects to your webcam feed while recording.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-12 md:mt-0 md:w-1/2">
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border-8 border-gray-900">
                <div className="absolute inset-0">
                  <div className="w-full h-full" ref={pipAnimRef}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced Settings & Features */}
      <div className="py-24 bg-white" ref={featuresRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Professional Recording Features</h2>
            <p className="mt-4 text-xl text-gray-600">Comprehensive tools for perfect recordings every time</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">High-Quality Capture</h3>
              <p className="text-gray-600">Support for multiple resolutions up to 4K and frame rates up to 60fps, ensuring professional-quality recordings.</p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Controls</h3>
              <p className="text-gray-600">Fine-tune all aspects of your recording with customizable settings for video, audio, and AI features.</p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time AI</h3>
              <p className="text-gray-600">Apply AI enhancements during recording, including face tracking, background removal, and beautification.</p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Studio-Quality Audio</h3>
              <p className="text-gray-600">Noise suppression, echo cancellation, and automatic gain control ensure crystal-clear audio recording.</p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Custom Recording Modes</h3>
              <p className="text-gray-600">Choose from continuous, timed, or segmented recording with countdown and auto-stop features.</p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Visual Effects</h3>
              <p className="text-gray-600">Add filters, overlays, and visual effects to your recordings in real-time for engaging content.</p>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to elevate your videos?
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Start creating professional recordings today with our powerful AI video recorder.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Try the Recorder Now</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default VideoRecorderPage;