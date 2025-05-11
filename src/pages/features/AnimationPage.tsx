import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Image, Play, Pause, Download, Settings, Sparkles, Wand2, ChevronRight, Palette, Sliders } from 'lucide-react';
import lottie from 'lottie-web';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';

const AnimationPage = () => {
  const gifAnimRef = useRef<HTMLDivElement>(null);
  const thumbnailAnimRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(featuresRef, { once: true, margin: "-100px" });

  useEffect(() => {
    // Initialize GIF animation
    if (gifAnimRef.current) {
      lottie.loadAnimation({
        container: gifAnimRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets5.lottiefiles.com/packages/lf20_xyadoh9h.json' // Animation
      });
    }
    
    // Initialize thumbnail animation
    if (thumbnailAnimRef.current) {
      lottie.loadAnimation({
        container: thumbnailAnimRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets3.lottiefiles.com/packages/lf20_rnfwrn0k.json' // Thumbnail animation
      });
    }
  }, []);

  // Demo GIFs for the showcase
  const demoGifs = [
    { id: 1, url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', title: 'Coding Animation' },
    { id: 2, url: 'https://media.giphy.com/media/bi6RQ5x3tqoSI/giphy.gif', title: 'Data Visualization' },
    { id: 3, url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', title: 'UI Animation' }
  ];

  // Features for the GIF creator
  const gifFeatures = [
    {
      title: "Quality Optimization",
      description: "Create high-quality GIFs with advanced dithering and color palette optimization for the perfect balance of quality and file size.",
      icon: Palette
    },
    {
      title: "Frame Rate Control",
      description: "Adjust frame rate from 5-30fps with real-time preview to balance smoothness and file size.",
      icon: Sliders
    },
    {
      title: "Perfect Loop Detection",
      description: "AI-powered loop point detection for creating seamless, infinitely looping GIFs.",
      icon: Wand2
    },
    {
      title: "Visual Effects",
      description: "Apply visual enhancements including brightness, contrast, saturation, and special effects to your GIFs.",
      icon: Sparkles
    }
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
          <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/5 blur-3xl transform rotate-12"></div>
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
                Create Stunning GIFs & Thumbnails
              </motion.h1>
              <motion.p 
                className="mt-6 text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Transform your videos into eye-catching GIFs and thumbnails with our advanced animation tools. Perfect for social media, presentations, and marketing.
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
                  Create Your First GIF
                </Link>
              </motion.div>
            </div>
            
            <motion.div 
              className="mt-12 md:mt-0 md:w-1/2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black/30 backdrop-blur-sm border border-white/10">
                <div className="absolute inset-0">
                  <div ref={gifAnimRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* GIF Creator Features */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Powerful GIF Creation Tools</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to create stunning animated GIFs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16">
            {gifFeatures.map((feature, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-[#E44E51] text-white flex items-center justify-center">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-6">
                  <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-base text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* GIF Showcase */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Create Engaging Animations</h2>
            <p className="mt-4 text-xl text-gray-600">From your videos to eye-catching GIFs in seconds</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {demoGifs.map((gif) => (
              <motion.div 
                key={gif.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="aspect-video">
                  <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900">{gif.title}</h3>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Optimized • 500KB</span>
                    <button className="flex items-center space-x-1 text-[#E44E51] text-sm font-medium">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Thumbnail Generator Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:space-x-10">
            <div className="md:w-1/2">
              <motion.div 
                className="relative aspect-video rounded-2xl overflow-hidden shadow-xl"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <div className="absolute inset-0">
                  <div ref={thumbnailAnimRef} style={{ width: '100%', height: '100%' }}></div>
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
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  <Image className="w-4 h-4 mr-2" />
                  Intelligent Thumbnail Creation
                </div>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900">AI-Powered Thumbnail Generator</h2>
                <p className="mt-6 text-xl text-gray-600">
                  Create eye-catching thumbnails with our intelligent generator that finds the perfect frames and applies professional enhancements.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">AI scene detection finds optimal thumbnail moments</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Automatic color enhancement for maximum impact</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Customizable text overlays and design elements</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Multiple aspect ratios for different platforms</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">Animated thumbnail variants to increase engagement</p>
                  </div>
                </div>
                
                <div className="mt-8">
                  <Link
                    to="/app"
                    className="rounded-md bg-[#E44E51] px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-[#D43B3E] hover:shadow-[#E44E51]/25 transition-all duration-200 inline-flex items-center"
                  >
                    Try Thumbnail Generator
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      {/* WebP Animation Section */}
      <div className="py-24 bg-gray-50" ref={featuresRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Next-Generation Animations</h2>
            <p className="mt-4 text-xl text-gray-600">Create higher quality animations with WebP format</p>
          </div>
          
          <motion.div 
            className="md:flex md:items-center md:space-x-10 md:flex-row-reverse"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.div 
              className="md:w-1/2"
              variants={itemVariants}
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <div className="text-white text-center p-8">
                  <h3 className="text-2xl font-bold mb-4">WebP Animation Advantages</h3>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-center">
                      <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Up to 64% smaller file sizes than GIFs</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Support for 24-bit color (16M colors)</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Full alpha channel transparency support</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Higher quality with smoother gradients</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="mt-12 md:mt-0 md:w-1/2"
              variants={itemVariants}
            >
              <h3 className="text-2xl font-bold text-gray-900">WebP Animation Exporter</h3>
              <p className="mt-4 text-lg text-gray-600">
                Create modern WebP animations that offer superior quality, smaller file sizes, and transparency support compared to traditional GIFs.
              </p>
              
              <div className="mt-6 space-y-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-medium text-gray-900 mb-2">Advanced Quality Control</h4>
                  <p className="text-gray-600">Precisely balance quality and file size with our intuitive quality slider, offering more granular control than GIF.</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-medium text-gray-900 mb-2">Transparency Support</h4>
                  <p className="text-gray-600">Create animations with alpha channel transparency, perfect for overlays and picture-in-picture effects.</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-medium text-gray-900 mb-2">Modern Browser Compatibility</h4>
                  <p className="text-gray-600">WebP is supported by all modern browsers, making it perfect for web content and applications.</p>
                </div>
              </div>
              
              <div className="mt-8">
                <Link
                  to="/app"
                  className="rounded-md bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 inline-flex items-center"
                >
                  Try WebP Exporter
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Create stunning GIFs and thumbnails today
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Transform your videos into eye-catching animations and thumbnails.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Start Creating Now</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AnimationPage;