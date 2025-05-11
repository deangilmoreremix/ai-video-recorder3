import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, Film, Share2, Youtube, Twitter, Facebook, Instagram, Linkedin, Copy, ChevronRight } from 'lucide-react';
import lottie from 'lottie-web';

import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';

const ExportPage = () => {
  const exportAnimRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(featuresRef, { once: true, margin: "-100px" });

  const [selectedTab, setSelectedTab] = useState('formats');

  useEffect(() => {
    // Initialize export animation
    if (exportAnimRef.current) {
      lottie.loadAnimation({
        container: exportAnimRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets8.lottiefiles.com/packages/lf20_bkoSPf.json' // Export animation
      });
    }
    
    // Initialize download animation
    if (downloadRef.current) {
      lottie.loadAnimation({
        container: downloadRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets1.lottiefiles.com/packages/lf20_cmaqoazd.json' // Download animation
      });
    }
  }, []);

  // Define export formats
  const exportFormats = [
    {
      id: 'mp4',
      name: 'MP4',
      description: 'Universal video format with excellent quality and compatibility.',
      details: [
        'H.264 and H.265 (HEVC) encoding',
        'Adjustable quality and compression',
        'Compatible with all devices and platforms',
        'Best for uploading to YouTube and social media'
      ],
      icon: '/icons/mp4.svg'
    },
    {
      id: 'webm',
      name: 'WebM',
      description: 'Optimized for web with smaller file sizes and good quality.',
      details: [
        'VP8/VP9 video codec for better compression',
        'Perfect for web embedding and HTML5 videos',
        'Smaller file sizes than MP4 at similar quality',
        'Progressive loading support'
      ],
      icon: '/icons/webm.svg'
    },
    {
      id: 'gif',
      name: 'GIF',
      description: 'Create looping animations with advanced optimization options.',
      details: [
        'Customizable frame rate and duration',
        'Color optimization with dithering options',
        'Perfect loop detection for seamless animations',
        'Optimized palette generation for quality and size'
      ],
      icon: '/icons/gif.svg'
    },
    {
      id: 'mov',
      name: 'MOV',
      description: 'High-quality Apple QuickTime format with alpha channel support.',
      details: [
        'ProRes codec for professional editing workflows',
        'Alpha channel support for transparency',
        'Best for Final Cut Pro and macOS workflows',
        'Preserve maximum quality for further editing'
      ],
      icon: '/icons/mov.svg'
    }
  ];
  
  // Define social media platforms
  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      color: 'bg-red-500',
      details: [
        'Optimized for YouTube\'s compression algorithm',
        '1080p and 4K resolution support',
        'Chapters and metadata integration',
        'Custom thumbnail generation'
      ]
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-pink-600',
      details: [
        'Square, portrait, and landscape formats',
        'IGTV and Reels optimization',
        'Compression optimized for Instagram',
        'Caption generation for accessibility'
      ]
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-400',
      details: [
        'Optimized for Twitter\'s 2-minute limit',
        'Smaller file sizes for fast uploading',
        'Auto-generated captions',
        'High engagement thumbnail extraction'
      ]
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600',
      details: [
        'Facebook Watch and News Feed optimization',
        'Automatic aspect ratio adjustment',
        'Optimized compression for Facebook',
        'Support for 360° videos'
      ]
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700',
      details: [
        'Professional quality for business content',
        'Optimized for in-feed playback',
        'Shorter duration recommendations',
        'Caption burning for silent autoplay'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-black py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#E44E51]/20 to-[#D43B3E]/5 blur-3xl transform rotate-12"></div>
          <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-3xl transform -rotate-12"></div>
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
                Export Videos for Any Platform
              </motion.h1>
              <motion.p 
                className="mt-6 text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Create optimized videos, GIFs, and thumbnails for any platform with our powerful export tools. One-click optimization for social media, web, and professional workflows.
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
                  Try Export Tools Now
                </Link>
              </motion.div>
            </div>
            
            <motion.div 
              className="mt-12 md:mt-0 md:w-1/2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
                <div className="absolute inset-0">
                  <div ref={exportAnimRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Export Features Tabs */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Flexible Export Options</h2>
            <p className="mt-4 text-xl text-gray-600">Choose the perfect format for your content</p>
          </div>
          
          <div className="flex justify-center space-x-4 mb-12">
            <button
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedTab === 'formats'
                  ? 'bg-[#E44E51] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTab('formats')}
            >
              Video Formats
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedTab === 'platforms'
                  ? 'bg-[#E44E51] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTab('platforms')}
            >
              Social Media
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium ${
                selectedTab === 'thumbnails'
                  ? 'bg-[#E44E51] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTab('thumbnails')}
            >
              Thumbnails & GIFs
            </button>
          </div>
          
          {selectedTab === 'formats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {exportFormats.map((format) => (
                <div key={format.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                      <Film className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{format.name}</h3>
                      <p className="text-gray-600">{format.description}</p>
                    </div>
                  </div>
                  
                  <ul className="mt-4 space-y-2">
                    {format.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          
          {selectedTab === 'platforms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {platforms.map((platform) => (
                <div key={platform.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-full ${platform.color} flex items-center justify-center mr-4`}>
                      <platform.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{platform.name}</h3>
                  </div>
                  
                  <ul className="mt-4 space-y-2">
                    {platform.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          
          {selectedTab === 'thumbnails' && (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="md:flex md:items-center md:space-x-10">
                <div className="md:w-1/2 order-2">
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg">
                    <div ref={downloadRef} style={{ width: '100%', height: '100%' }}></div>
                  </div>
                </div>
                
                <div className="md:w-1/2 order-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Intelligent Thumbnail & GIF Creation</h3>
                  <p className="text-gray-600 mb-6">Create eye-catching thumbnails and animated GIFs with our advanced tools. Perfect for social media, video platforms, and marketing materials.</p>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Smart Thumbnail Generation</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">AI-powered scene detection for optimal frames</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Text overlay and customization options</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Multiple format export (JPG, PNG, WebP)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Animated GIF Creator</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">High-quality GIF rendering with optimization</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Custom frame rate, duration, and loop settings</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Color optimization and dithering options</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Process Section */}
      <div className="py-24 bg-gray-50" ref={featuresRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Streamlined Export Process</h2>
            <p className="mt-4 text-xl text-gray-600">From editing to sharing in just a few clicks</p>
          </div>
          
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-200 transform -translate-x-1/2"></div>
            
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center mb-12">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51] flex items-center justify-center shadow-lg z-10">
                  <span className="text-xl font-bold text-white">1</span>
                </div>
                <div className="ml-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100 md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Choose Export Format</h3>
                  <p className="mt-2 text-gray-600">Select from multiple formats including MP4, WebM, GIF, or optimize for specific platforms like YouTube, Instagram, or Twitter.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center mb-12">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51] flex items-center justify-center shadow-lg z-10">
                  <span className="text-xl font-bold text-white">2</span>
                </div>
                <div className="ml-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100 md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Customize Settings</h3>
                  <p className="mt-2 text-gray-600">Fine-tune your export with options for resolution, bitrate, frame rate, and quality. Apply platform-specific optimizations automatically.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="flex items-center mb-12">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51] flex items-center justify-center shadow-lg z-10">
                  <span className="text-xl font-bold text-white">3</span>
                </div>
                <div className="ml-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100 md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Apply Enhancements</h3>
                  <p className="mt-2 text-gray-600">Optionally apply last-minute enhancements like stabilization, noise reduction, color correction, or watermarks to your video.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#E44E51] flex items-center justify-center shadow-lg z-10">
                  <span className="text-xl font-bold text-white">4</span>
                </div>
                <div className="ml-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100 md:w-2/3">
                  <h3 className="text-xl font-bold text-gray-900">Export & Share</h3>
                  <p className="mt-2 text-gray-600">Process your video with our optimized export engine and download or share directly to your preferred platforms.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to export professional-quality videos?
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Try our powerful export tools and create content for any platform.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Try Export Tools Now</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ExportPage;