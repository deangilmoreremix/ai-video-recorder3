import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Scan, HandMetal, Trash2, Layers, Sparkles, Send, Maximize, Sliders, Wand2, Brain, Smile } from 'lucide-react';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import { AIFeatureDemo } from '../../components/landing/AIFeatureDemo';

const AIFeaturesPage = () => {
  // Define animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // AI features
  const aiFeatures = [
    {
      id: 'face-detection',
      title: 'Face Detection',
      description: 'Automatically detect and track faces in real-time, enabling dynamic framing and face-focused effects.',
      icon: Camera,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-practicing-yoga-at-home-6447-large.mp4',
      color: 'bg-blue-500'
    },
    {
      id: 'facial-landmarks',
      title: 'Facial Landmarks',
      description: 'Track 468 facial points for precise facial analysis, enabling advanced effects and expressions.',
      icon: Scan,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-fashion-woman-with-silver-makeup-39358-large.mp4',
      color: 'bg-indigo-600'
    },
    {
      id: 'hand-tracking',
      title: 'Hand Tracking',
      description: 'Detect and track hand movements and gestures, adding interactivity to your recordings.',
      icon: HandMetal,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-pianist-playing-a-grand-piano-14185-large.mp4',
      color: 'bg-purple-600'
    },
    {
      id: 'background-removal',
      title: 'Background Removal',
      description: 'Instantly remove your background without a green screen, perfect for professional presentations.',
      icon: Trash2,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-runs-past-ground-level-shot-32809-large.mp4',
      color: 'bg-green-600'
    },
    {
      id: 'background-blur',
      title: 'Background Blur',
      description: 'Add a professional blur effect to your background while keeping you in focus.',
      icon: Layers,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-afro-woman-talking-on-the-phone-4990-large.mp4',
      color: 'bg-amber-500'
    },
    {
      id: 'beautification',
      title: 'AI Beautification',
      description: 'Enhance your appearance with subtle filters that adjust automatically to lighting conditions.',
      icon: Sparkles,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-posing-outdoors-on-a-sunny-day-43806-large.mp4',
      color: 'bg-pink-500'
    },
    {
      id: 'gesture-recognition',
      title: 'Gesture Control',
      description: 'Control your recording with hand gestures - start, stop, and control effects without touching your device.',
      icon: Send,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-a-hand-using-a-smartphone-device-close-up-40833-large.mp4',
      color: 'bg-yellow-500'
    },
    {
      id: 'auto-framing',
      title: 'Auto Framing',
      description: 'Keep yourself perfectly in frame as you move with AI-powered camera tracking.',
      icon: Maximize,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-a-young-woman-exercising-with-battle-ropes-4514-large.mp4',
      color: 'bg-red-500'
    },
    {
      id: 'smart-effects',
      title: 'Smart Effects',
      description: 'Apply context-aware effects that understand the content of your video and adapt accordingly.',
      icon: Wand2,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-shot-of-traffic-lights-18202-large.mp4',
      color: 'bg-cyan-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-black py-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/5 blur-3xl transform rotate-12"></div>
          <div className="absolute -bottom-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[#E44E51]/20 to-[#D43B3E]/5 blur-3xl transform -rotate-12"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              AI-Powered Video Enhancement
            </motion.h1>
            <motion.p 
              className="mt-6 max-w-3xl mx-auto text-xl text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Transform your videos with cutting-edge artificial intelligence. Our advanced AI features work in real-time to enhance quality, enable interactive controls, and create professional effects automatically.
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="mt-16 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                  <Brain className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Real-Time Processing</h3>
                <p className="mt-2 text-gray-300">All AI features process in real-time, directly in your browser with no server uploads.</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <Sliders className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Customizable Effects</h3>
                <p className="mt-2 text-gray-300">Fine-tune every AI feature with intuitive controls to achieve your desired look.</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-4">
                  <Smile className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Privacy-Focused</h3>
                <p className="mt-2 text-gray-300">All processing happens locally on your device, keeping your content private and secure.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Advanced AI Features</h2>
            <p className="mt-4 text-xl text-gray-600">Explore our comprehensive set of AI-powered video enhancement tools</p>
          </div>
          
          <motion.div 
            className="space-y-24"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {aiFeatures.map((feature, index) => (
              <motion.div key={feature.id} variants={itemVariants}>
                <AIFeatureDemo
                  title={feature.title}
                  description={feature.description}
                  videoUrl={feature.videoUrl}
                  icon={feature.icon}
                  color={feature.color}
                  reversed={index % 2 === 1}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Technical Details */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How Our AI Works</h2>
            <p className="mt-4 text-xl text-gray-600">Powered by state-of-the-art machine learning models</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">TensorFlow.js</h3>
              <p className="text-gray-600">Our AI features run entirely in your browser using TensorFlow.js, providing high performance without server uploads.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">MediaPipe Models</h3>
              <p className="text-gray-600">We use Google's MediaPipe models for accurate face, hand, and body tracking with low latency.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">WebGL Acceleration</h3>
              <p className="text-gray-600">GPU-accelerated processing ensures smooth performance even with multiple AI features active.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Adaptive Quality</h3>
              <p className="text-gray-600">Our system automatically adjusts processing quality based on your device's performance capabilities.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real-time Effects</h3>
              <p className="text-gray-600">See changes instantly as you adjust settings with our optimized rendering pipeline.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <HandMetal className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gesture Recognition</h3>
              <p className="text-gray-600">Our neural networks can recognize dozens of hand gestures for intuitive control.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#E44E51] to-[#D43B3E] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Experience the power of AI in your videos
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Transform your recording and editing workflow today.
          </p>
          <div className="mt-8 flex justify-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/app"
                className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-colors"
              >
                Try AI Features Now
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AIFeaturesPage;