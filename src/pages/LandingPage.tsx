import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Camera, Brain, Wand2, Film, Download, Sparkles, Scissors, Type, Clock, Layout, ChevronRight, Layers } from 'lucide-react';
import { gsap } from 'gsap';
import lottie from 'lottie-web';

import Navbar from '../components/landing/Navbar';
import FeatureCard from '../components/landing/FeatureCard';
import AIFeatureShowcase from '../components/landing/AIFeatureShowcase';
import Footer from '../components/landing/Footer';
import FeatureHighlight from '../components/landing/FeatureHighlight';
import Testimonials from '../components/landing/Testimonials';
import FloatingIcons from '../components/landing/FloatingIcons';
import FeaturesList from '../components/landing/FeaturesList';

const LandingPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const recordingAnimation = useRef<HTMLDivElement>(null);
  const editorAnimation = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  
  // Controls for animations
  const controls = useAnimation();
  
  useEffect(() => {
    // Start animations when component loads
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, staggerChildren: 0.2 }
    });
    
    // Initialize animation for the recording animation
    if (recordingAnimation.current) {
      lottie.loadAnimation({
        container: recordingAnimation.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets10.lottiefiles.com/packages/lf20_zk6kbpdw.json' // Recording animation
      });
    }
    
    // Initialize animation for the editor animation
    if (editorAnimation.current) {
      lottie.loadAnimation({
        container: editorAnimation.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets5.lottiefiles.com/packages/lf20_ydo1amjm.json' // Video editing animation
      });
    }

    // Initialize hero section animation
    if (heroRef.current) {
      gsap.fromTo(
        '.hero-title span', 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 1, ease: 'power3.out', delay: 0.5 }
      );
      
      gsap.fromTo(
        '.hero-subtitle', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 1.2, ease: 'power3.out' }
      );
      
      gsap.fromTo(
        '.hero-cta-container', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 1.5, ease: 'power3.out' }
      );
      
      // Add parallax effect to background elements
      gsap.to('.parallax-bg-1', {
        y: -80,
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
      
      gsap.to('.parallax-bg-2', {
        y: -120,
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }
    
    // Autoplay demo video after a delay
    if (videoRef.current) {
      setTimeout(() => {
        videoRef.current?.play();
      }, 3000);
    }
  }, [controls]);

  // Define features
  const features = [
    {
      title: "AI-Powered Features",
      description: "Enhance your videos with face detection, background removal, and more",
      icon: Brain,
      link: "/features/ai",
      color: "from-blue-500 to-violet-600"
    },
    {
      title: "Screen & Webcam Recording",
      description: "High-quality recording with picture-in-picture capabilities",
      icon: Camera,
      link: "/features/recorder",
      color: "from-pink-500 to-rose-600"
    },
    {
      title: "Advanced Video Editor",
      description: "Edit, trim, add captions and chapters with precision",
      icon: Scissors,
      link: "/features/editor",
      color: "from-amber-500 to-orange-600"
    },
    {
      title: "GIFs & Animated Thumbnails",
      description: "Create high-quality GIFs and eye-catching thumbnails",
      icon: Sparkles,
      link: "/features/animation",
      color: "from-emerald-500 to-green-600"
    },
    {
      title: "Flexible Export Options",
      description: "Export to multiple formats optimized for different platforms",
      icon: Download,
      link: "/features/export", 
      color: "from-cyan-500 to-blue-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navbar />
      
      {/* Hero Section with Parallax */}
      <motion.div 
        ref={heroRef} 
        className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-black py-24 sm:py-32"
        style={{ scale: heroScale }}
      >
        {/* Floating Icons animation */}
        <FloatingIcons />
        
        {/* Animated background elements */}
        <motion.div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -top-[40%] left-[15%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[#E44E51]/20 to-[#D43B3E]/5 blur-3xl transform rotate-45 parallax-bg-1"
            style={{ y: parallaxY }}
          ></motion.div>
          <motion.div 
            className="absolute -bottom-[40%] left-[35%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 blur-3xl transform -rotate-45 parallax-bg-2"
            style={{ y: useTransform(scrollYProgress, [0, 1], ['0%', '50%']) }}
          ></motion.div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              <span className="inline-block">AI-Powered </span>
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E]">
                Video Recording
              </span>
              <span className="inline-block"> & </span>
              <span className="inline-block">Editing</span>
            </h1>
            <p className="hero-subtitle mt-6 max-w-3xl mx-auto text-xl text-gray-300">
              Transform your content creation with advanced AI features, real-time enhancements, and professional editing tools. Record, edit, and share high-quality videos in minutes.
            </p>
            <div className="hero-cta-container mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/app"
                  className="rounded-md bg-[#E44E51] px-6 py-3 text-lg font-semibold text-white shadow-lg hover:bg-[#D43B3E] hover:shadow-[#E44E51]/25 focus:outline-none focus:ring-2 focus:ring-[#E44E51] transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Try Now - It's Free
                  </span>
                </Link>
              </motion.div>
              <motion.a
                href="#features"
                className="rounded-md border border-gray-300 bg-white/5 backdrop-blur-sm px-6 py-3 text-lg font-semibold text-white hover:bg-white/10 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Explore Features
              </motion.a>
            </div>
          </div>
          
          {/* Demo video */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <motion.div 
              className="aspect-video rounded-2xl overflow-hidden border-8 border-gray-800 shadow-2xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.8 }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src="https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1738-large.mp4"
                muted
                loop
              ></video>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  className="w-20 h-20 bg-[#E44E51]/90 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#E44E51] transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => videoRef.current?.play()}
                >
                  <Play className="w-10 h-10 text-white" fill="white" />
                </motion.div>
              </div>
            </motion.div>
            
            {/* AI features overlay visualization */}
            <motion.div 
              className="absolute -top-5 -right-5 w-32 h-32"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 2.5 }}
            >
              <div ref={recordingAnimation}></div>
            </motion.div>
            
            {/* Editor features overlay visualization */}
            <motion.div 
              className="absolute -bottom-5 -left-5 w-32 h-32"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 2.8 }}
            >
              <div ref={editorAnimation}></div>
            </motion.div>
            
            {/* Interactive demo elements (simulated) */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <motion.div 
                className="flex space-x-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7] }}
                transition={{ duration: 2, delay: 3.2, repeat: Infinity, repeatDelay: 4 }}
              >
                <div className="w-2 h-2 rounded-full bg-[#E44E51]"></div>
                <div className="w-2 h-2 rounded-full bg-[#E44E51]"></div>
                <div className="w-2 h-2 rounded-full bg-[#E44E51]"></div>
              </motion.div>
              
              <motion.div 
                className="px-2 py-1 bg-black/50 rounded-md text-xs text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1] }}
                transition={{ duration: 1, delay: 5 }}
              >
                AI Face Detection Active
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Features Overview Section */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Powerful Features for Content Creators
            </motion.h2>
            <motion.p 
              className="mt-4 text-xl text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Everything you need to create professional-quality videos
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FeatureCard
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  link={feature.link}
                  color={feature.color}
                />
              </motion.div>
            ))}
          </div>
          
          {/* Interactive Features Demo */}
          <motion.div
            className="mt-24 bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Interactive Demo</h3>
              <p className="mt-2 text-gray-600">Try out some of our features directly in your browser</p>
            </div>
            
            <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
              <video 
                className="w-full h-full object-cover" 
                src="https://assets.mixkit.co/videos/preview/mixkit-person-in-a-video-call-meeting-online-513-large.mp4" 
                autoPlay 
                loop 
                muted
              ></video>
              
              <div className="absolute top-4 right-4">
                <div className="flex space-x-2">
                  <button className="p-2 bg-black/50 text-white rounded-full hover:bg-[#E44E51]/80 transition-colors">
                    <Layers className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-black/50 text-white rounded-full hover:bg-[#E44E51]/80 transition-colors">
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-4">
                <div className="px-3 py-1 bg-[#E44E51] text-white rounded-full text-sm">
                  AI beauty filter active
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Comprehensive Feature List */}
      <FeaturesList />
      
      {/* AI Features Showcase */}
      <AIFeatureShowcase />
      
      {/* Feature Highlights */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Streamline Your Video Creation</h2>
            <p className="mt-4 text-xl text-gray-600">Our all-in-one solution combines recording, editing, and exporting</p>
          </div>
          
          <div className="space-y-24">
            <FeatureHighlight 
              title="Intelligent Video Recording"
              description="Record your screen, webcam, or both with our intuitive interface. Apply real-time AI enhancements during recording for professional results."
              imgSrc="https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
              features={[
                { icon: Camera, text: "High-quality screen and webcam capture" },
                { icon: Brain, text: "Real-time AI enhancements" },
                { icon: Layers, text: "Picture-in-picture mode" },
                { icon: Clock, text: "Scheduled and timed recordings" }
              ]}
              linkText="Learn about recording"
              linkUrl="/features/recorder"
              reversed={false}
            />
            
            <FeatureHighlight 
              title="Powerful Editing Suite"
              description="Edit your videos with precision using our comprehensive toolkit. Remove silent segments, add captions, chapters, and apply professional effects."
              imgSrc="https://images.unsplash.com/photo-1610128114197-485d933885c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80"
              features={[
                { icon: Scissors, text: "Silent segment removal" },
                { icon: Type, text: "Auto-generated captions" },
                { icon: Layout, text: "Chapter markers and timestamps" },
                { icon: Film, text: "B-roll management and organization" }
              ]}
              linkText="Explore editing features"
              linkUrl="/features/editor"
              reversed={true}
            />
            
            <FeatureHighlight 
              title="Export for Any Platform"
              description="Export your videos in various formats optimized for different platforms. Create GIFs, animated thumbnails, and more with just a few clicks."
              imgSrc="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80"
              features={[
                { icon: Download, text: "Multi-format export options" },
                { icon: Sparkles, text: "GIF and animated thumbnail creation" },
                { icon: Wand2, text: "Platform-specific optimizations" },
                { icon: Camera, text: "Intelligent thumbnail extraction" }
              ]}
              linkText="See export options"
              linkUrl="/features/export"
              reversed={false}
            />
          </div>
        </div>
      </div>
      
      {/* Animated Stats Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our Impact</h2>
            <p className="mt-4 text-xl text-gray-600">Join thousands of content creators using our platform</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-5xl font-extrabold text-[#E44E51]"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                25K+
              </motion.div>
              <p className="mt-2 text-xl font-medium text-gray-900">Active Users</p>
            </motion.div>
            
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div
                className="text-5xl font-extrabold text-[#E44E51]"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                100K+
              </motion.div>
              <p className="mt-2 text-xl font-medium text-gray-900">Videos Created</p>
            </motion.div>
            
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                className="text-5xl font-extrabold text-[#E44E51]"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                50+
              </motion.div>
              <p className="mt-2 text-xl font-medium text-gray-900">AI Features</p>
            </motion.div>
            
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div
                className="text-5xl font-extrabold text-[#E44E51]"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                95%
              </motion.div>
              <p className="mt-2 text-xl font-medium text-gray-900">Satisfaction Rate</p>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Testimonials */}
      <Testimonials />
      
      {/* Product Demo Carousel */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">See It in Action</h2>
            <p className="mt-4 text-xl text-gray-600">Watch our product demos to see how it works</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Recording Demo",
                thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80",
                duration: "2:15"
              },
              {
                title: "Editing Demo",
                thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1171&q=80",
                duration: "3:42"
              },
              {
                title: "AI Features Demo",
                thumbnail: "https://images.unsplash.com/photo-1651318729231-7225a5cef03b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
                duration: "4:08"
              }
            ].map((demo, index) => (
              <motion.div
                key={index}
                className="relative aspect-video rounded-lg overflow-hidden shadow-lg group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <img 
                  src={demo.thumbnail} 
                  alt={demo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                  <motion.div 
                    className="h-16 w-16 bg-[#E44E51] rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Play className="h-8 w-8 text-white" />
                  </motion.div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center text-white">
                  <h3 className="font-bold text-lg">{demo.title}</h3>
                  <div className="px-2 py-1 bg-black/50 rounded text-sm">{demo.duration}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            className="text-3xl font-extrabold text-white sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Ready to transform your video creation?
          </motion.h2>
          <motion.p 
            className="mt-4 text-xl text-white/90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Join thousands of content creators using our platform to produce high-quality videos.
          </motion.p>
          <motion.div 
            className="mt-8 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LandingPage;