import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Camera, Scan, Layers, Trash2, Sparkles, Plus, Minus, Play, Pause } from 'lucide-react';

interface InteractiveFeatureDemoProps {
  initialFeature?: string;
}

interface DemoFeature {
  id: string;
  name: string;
  icon: React.ElementType;
  videoUrl: string;
  fallbackImage: string;
  description: string;
}

// Features data with reliable video URLs and fallback images
const FEATURES: DemoFeature[] = [
  {
    id: 'face-detection',
    name: 'Face Detection',
    icon: Camera,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-on-the-phone-4990-large.mp4',
    fallbackImage: 'https://images.pexels.com/photos/1124589/pexels-photo-1124589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Detect and track faces in real-time with precision'
  },
  {
    id: 'facial-landmarks',
    name: 'Facial Landmarks',
    icon: Scan,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-by-a-dark-wall-1434-large.mp4',
    fallbackImage: 'https://images.pexels.com/photos/2726111/pexels-photo-2726111.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Track 468 facial points for advanced effects'
  },
  {
    id: 'background-removal',
    name: 'Background Removal',
    icon: Trash2,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-in-the-street-with-a-jacket-45665-large.mp4',
    fallbackImage: 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Remove background without a green screen'
  },
  {
    id: 'background-blur',
    name: 'Background Blur',
    icon: Layers,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-changing-lights-32976-large.mp4',
    fallbackImage: 'https://images.pexels.com/photos/2050994/pexels-photo-2050994.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Apply professional blur effect to background'
  },
  {
    id: 'beautification',
    name: 'Beautification',
    icon: Sparkles,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-young-model-posing-for-a-shoot-39883-large.mp4',
    fallbackImage: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Enhance appearance with AI-powered filters'
  }
];

const VIDEO_LOAD_TIMEOUT = 10000;

const InteractiveFeatureDemo: React.FC<InteractiveFeatureDemoProps> = ({ initialFeature = 'face-detection' }) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeFeature, setActiveFeature] = useState(
    () => (FEATURES.some(f => f.id === initialFeature) ? initialFeature : FEATURES[0].id)
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [intensity, setIntensity] = useState(50);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // The rAF loop keeps a single closure alive, so the values it reads have to
  // live in refs - otherwise the slider/fallback state would never update.
  const intensityRef = useRef(intensity);
  const videoErrorRef = useRef(videoError);
  const videoLoadedRef = useRef(videoLoaded);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    videoErrorRef.current = videoError;
  }, [videoError]);

  useEffect(() => {
    videoLoadedRef.current = videoLoaded;
  }, [videoLoaded]);

  // Do not auto-play the demo for users who asked for reduced motion
  useEffect(() => {
    if (prefersReducedMotion) setIsPlaying(false);
  }, [prefersReducedMotion]);

  // Get current feature data (always defined - falls back to the first entry)
  const currentFeature = FEATURES.find(f => f.id === activeFeature) || FEATURES[0];
  
  // Handle feature change
  useEffect(() => {
    // Reset state
    setVideoLoaded(false);
    setVideoError(false);
    videoLoadedRef.current = false;
    videoErrorRef.current = false;
    
    // Clear any existing animations and timeouts
    stopAnimation();
    clearLoadingTimeout();
    
    // Set up canvas to match container size
    setupCanvas();
    
    // Load video with error handling
    loadVideo();
    
    // Start animation if playing
    if (isPlaying) {
      startAnimation();
    }
    
    return () => {
      stopAnimation();
      clearLoadingTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature]);

  // Keep the canvas backing store in sync with its rendered size
  useEffect(() => {
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handle play state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      if (videoLoaded && !videoError) {
        video.play().catch(err => {
          console.warn("Autoplay prevented:", err);
        });
      } else {
        video.pause();
      }
      // The canvas overlay keeps animating even when only the static
      // fallback is available.
      startAnimation();
    } else {
      video.pause();
      stopAnimation();
    }
    
    return () => {
      stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, videoLoaded, videoError]);

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current !== undefined) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
  };

  // Cancelling the pending frame also terminates the self-scheduling loop,
  // which prevents duplicated rAF loops from piling up.
  const stopAnimation = () => {
    if (animationFrameRef.current !== undefined) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  };

  const startAnimation = () => {
    stopAnimation();
    animationFrameRef.current = requestAnimationFrame(animateEffect);
  };
  
  // Load video with robust error handling
  const loadVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Reset video state
    video.pause();
    video.removeAttribute('src');
    video.load();
    
    // Set poster image as fallback
    video.poster = currentFeature.fallbackImage;
    
    // Prepare error handler
    const handleVideoError = () => {
      clearLoadingTimeout();
      console.warn('Video failed to load, using fallback image');
      videoErrorRef.current = true;
      videoLoadedRef.current = false;
      setVideoError(true);
      setVideoLoaded(false);
    };
    
    // Set up load handler
    const handleVideoLoaded = () => {
      clearLoadingTimeout();
      videoLoadedRef.current = true;
      videoErrorRef.current = false;
      setVideoLoaded(true);
      setVideoError(false);
      
      if (isPlaying) {
        video.play().catch(err => {
          console.warn("Autoplay prevented:", err);
        });
      }
    };
    
    // Add event listeners
    video.addEventListener('loadeddata', handleVideoLoaded, { once: true });
    video.addEventListener('error', handleVideoError, { once: true });
    
    try {
      // Set source and begin loading
      video.src = currentFeature.videoUrl;
      video.load();
      
      // Set timeout in case video takes too long to load
      loadingTimeoutRef.current = setTimeout(() => {
        if (!videoLoadedRef.current && !videoErrorRef.current) {
          console.warn("Video load timeout");
          handleVideoError();
        }
      }, VIDEO_LOAD_TIMEOUT);
    } catch (err) {
      console.error("Error setting video source:", err);
      handleVideoError();
    }
  };
  
  // Set up canvas for drawing
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get the dimensions from the parent element to ensure proper scaling
    const parent = canvas.parentElement;
    if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
  };
  
  // Animation function for the AI effect visualizations
  const animateEffect = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameRef.current = undefined;
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      animationFrameRef.current = undefined;
      return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame if video is loaded and playing
    const video = videoRef.current;
    if (video && video.readyState >= 2 && videoLoadedRef.current && !videoErrorRef.current) {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch {
        // Cross-origin or not-yet-decodable frame - keep the overlay only
      }
    }
    
    // Apply active effect visualization
    applyEffectVisualization(ctx, activeFeature, intensityRef.current);
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(animateEffect);
  };
  
  // Apply different visualizations based on the active feature
  const applyEffectVisualization = (
    ctx: CanvasRenderingContext2D,
    featureId: string,
    intensity: number
  ) => {
    const strength = intensity / 100;
    
    switch (featureId) {
      case 'face-detection':
        drawFaceDetectionEffect(ctx, strength);
        break;
      case 'facial-landmarks':
        drawFacialLandmarksEffect(ctx, strength);
        break;
      case 'background-removal':
        drawBackgroundRemovalEffect(ctx, strength);
        break;
      case 'background-blur':
        drawBackgroundBlurEffect(ctx, strength);
        break;
      case 'beautification':
        drawBeautificationEffect(ctx, strength);
        break;
    }
  };
  
  // Draw face detection visual effect
  const drawFaceDetectionEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoErrorRef.current) return drawSimplifiedFaceDetection(ctx, strength);
    
    // Position for face detection rectangle
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    const boxWidth = ctx.canvas.width * 0.25;
    const boxHeight = ctx.canvas.height * 0.35;
    
    // Draw detection box
    ctx.strokeStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.lineWidth = 2 * strength;
    ctx.strokeRect(
      centerX - boxWidth/2, 
      centerY - boxHeight/2, 
      boxWidth, 
      boxHeight
    );
    
    // Draw confidence text
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = `${Math.round(12 * strength)}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(
      `Confidence: ${Math.round(strength * 100)}%`, 
      centerX - boxWidth/2, 
      centerY - boxHeight/2 - 8
    );
  };
  
  // Draw facial landmarks visualization
  const drawFacialLandmarksEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoErrorRef.current) return drawSimplifiedFacialLandmarks(ctx, strength);
    
    // Center point for facial features
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    const faceWidth = ctx.canvas.width * 0.2;
    const faceHeight = ctx.canvas.height * 0.3;
    
    // Create facial landmark points
    const landmarks: [number, number][] = [];
    
    // Create oval face shape
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * (faceWidth/2);
      const y = centerY + Math.sin(angle) * (faceHeight/2);
      landmarks.push([x, y]);
    }
    
    // Draw landmarks
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    
    landmarks.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.5 * strength, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw eyes
    ctx.strokeStyle = `rgba(0, 255, 255, ${strength * 0.7})`;
    ctx.lineWidth = 1 * strength;
    
    // Left eye
    ctx.beginPath();
    ctx.ellipse(
      centerX - faceWidth * 0.18, 
      centerY - faceHeight * 0.1,
      faceWidth * 0.1,
      faceHeight * 0.05,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    
    // Right eye
    ctx.beginPath();
    ctx.ellipse(
      centerX + faceWidth * 0.18, 
      centerY - faceHeight * 0.1,
      faceWidth * 0.1,
      faceHeight * 0.05,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    
    // Mouth
    ctx.beginPath();
    ctx.moveTo(centerX - faceWidth * 0.2, centerY + faceHeight * 0.15);
    ctx.quadraticCurveTo(
      centerX, centerY + faceHeight * 0.25,
      centerX + faceWidth * 0.2, centerY + faceHeight * 0.15
    );
    ctx.stroke();
    
    // Nose
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - faceHeight * 0.05);
    ctx.lineTo(centerX, centerY + faceHeight * 0.05);
    ctx.lineTo(centerX - faceWidth * 0.05, centerY + faceHeight * 0.1);
    ctx.moveTo(centerX, centerY + faceHeight * 0.05);
    ctx.lineTo(centerX + faceWidth * 0.05, centerY + faceHeight * 0.1);
    ctx.stroke();
  };
  
  // Draw background removal effect
  const drawBackgroundRemovalEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoErrorRef.current) return drawSimplifiedBackgroundRemoval(ctx, strength);
    
    // Save current state
    ctx.save();
    
    // Add a green overlay for the "removed" background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    if (tempCtx) {
      // Draw current canvas state to temp canvas
      tempCtx.drawImage(ctx.canvas, 0, 0);
      
      // Green background layer
      ctx.fillStyle = `rgba(0, 180, 0, ${0.3 * strength})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Draw silhouette
      const centerX = ctx.canvas.width * 0.5;
      const centerY = ctx.canvas.height * 0.4;
      const personWidth = ctx.canvas.width * 0.4;
      const personHeight = ctx.canvas.height * 0.8;
      
      // Create person mask
      ctx.beginPath();
      ctx.ellipse(
        centerX, 
        centerY, 
        personWidth / 2.5, 
        personHeight / 2.2, 
        0, 
        0, 
        Math.PI * 2
      );
      
      // Draw original content inside the mask
      ctx.save();
      ctx.clip();
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
      
      // Draw highlight around the silhouette
      ctx.strokeStyle = `rgba(255, 255, 255, ${strength * 0.8})`;
      ctx.lineWidth = 2 * strength;
      ctx.stroke();
    }
    
    // Restore state
    ctx.restore();
    
    // Add "Background Removed" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Background Removed`, 20, 30);
  };
  
  // Draw background blur effect
  const drawBackgroundBlurEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoErrorRef.current) return; // No simplified version needed, just skip
    
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    const personWidth = ctx.canvas.width * 0.35;
    const personHeight = ctx.canvas.height * 0.7;
    
    // Add some blur effect visualization (not actual blur since we can't access pixel data easily)
    ctx.save();
    
    // Draw blurred background representation
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * strength})`;
    for (let i = 0; i < 10 * strength; i++) {
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    
    // Draw subject area that's "in focus"
    ctx.globalCompositeOperation = 'destination-out';
    const gradient = ctx.createRadialGradient(
      centerX, centerY, personWidth / 3,
      centerX, centerY, personWidth
    );
    
    gradient.addColorStop(0, `rgba(0, 0, 0, 1)`);
    gradient.addColorStop(0.7, `rgba(0, 0, 0, 0.8)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      personWidth, 
      personHeight, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Add in-focus area highlight
    ctx.strokeStyle = `rgba(255, 255, 255, ${strength * 0.3})`;
    ctx.lineWidth = 1 * strength;
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      personWidth / 1.5, 
      personHeight / 1.8, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.stroke();
    
    // Add "Background Blur" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Background Blur`, 20, 30);
    
    ctx.restore();
  };
  
  // Draw beautification effect
  const drawBeautificationEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoErrorRef.current) return; // No simplified version, just skip
    
    // Add a soft color overlay for the "beautification" effect
    ctx.save();
    
    // Subtle warming filter
    ctx.fillStyle = `rgba(255, 240, 230, ${0.1 * strength})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Add highlight to skin tones
    ctx.fillStyle = `rgba(255, 220, 210, ${0.05 * strength})`;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    // Indicate active areas with subtle glow
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.35;
    const faceRadius = ctx.canvas.width * 0.12;
    
    // Soft glow around face
    const gradient = ctx.createRadialGradient(
      centerX, centerY, faceRadius * 0.8,
      centerX, centerY, faceRadius * 1.8
    );
    
    gradient.addColorStop(0, `rgba(255, 200, 200, ${0.1 * strength})`);
    gradient.addColorStop(1, 'rgba(255, 200, 200, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      faceRadius * 1.8, 
      faceRadius * 2.2, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    // Add "Beautification" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Beautification`, 20, 30);
    
    ctx.restore();
  };
  
  // Simplified static version of face detection for when video is not available
  const drawSimplifiedFaceDetection = (ctx: CanvasRenderingContext2D, strength: number) => {
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    
    // Draw oval for face
    ctx.strokeStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.lineWidth = 3 * strength;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = `${Math.round(14 * strength)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Face Detected", centerX, centerY - 120);
  };
  
  // Simplified facial landmarks for static fallback
  const drawSimplifiedFacialLandmarks = (ctx: CanvasRenderingContext2D, strength: number) => {
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    
    // Draw face outline
    ctx.strokeStyle = `rgba(0, 255, 255, ${strength * 0.7})`;
    ctx.lineWidth = 1 * strength;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw facial landmark dots
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    
    // Draw landmark dots around the face
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const radius = i % 2 === 0 ? 70 + Math.random() * 20 : 80 + Math.random() * 20;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * (radius * 1.2);
      
      ctx.beginPath();
      ctx.arc(x, y, 1.5 * strength, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw eyes
    ctx.beginPath();
    ctx.ellipse(centerX - 25, centerY - 15, 12, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(centerX + 25, centerY - 15, 12, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw mouth
    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY + 40);
    ctx.quadraticCurveTo(centerX, centerY + 60, centerX + 30, centerY + 40);
    ctx.stroke();
    
    // Draw nose
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + 20);
    ctx.lineTo(centerX - 10, centerY + 30);
    ctx.moveTo(centerX, centerY + 20);
    ctx.lineTo(centerX + 10, centerY + 30);
    ctx.stroke();
  };
  
  // Simplified background removal for static fallback
  const drawSimplifiedBackgroundRemoval = (ctx: CanvasRenderingContext2D, strength: number) => {
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    
    // Draw green background
    ctx.fillStyle = `rgba(0, 180, 0, ${0.3 * strength})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw person silhouette
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * strength})`;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 180, 60, 120, 0, 0, Math.PI);
    ctx.fill();
    
    // Add edge highlight
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * strength})`;
    ctx.lineWidth = 2 * strength;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 180, 60, 120, 0, 0, Math.PI);
    ctx.stroke();
  };

  return (
    <div className="rounded-xl bg-white shadow-xl p-6 border border-gray-100">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Preview AI Features</h3>
        <p className="mt-2 text-gray-600">Illustrated previews of each effect - the real models run in the recorder</p>
      </div>
      
      {/* Feature demo area */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Feature selector */}
        <div className="md:w-1/3">
          <div className="space-y-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              
              return (
                <motion.button
                  key={feature.id}
                  type="button"
                  onClick={() => setActiveFeature(feature.id)}
                  aria-pressed={isActive}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#E44E51]/10 text-[#E44E51] border-[#E44E51] border' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  whileHover={{ x: isActive ? 0 : 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5 mr-3" aria-hidden="true" />
                  <div className="text-left">
                    <div className="font-medium">{feature.name}</div>
                    {isActive && (
                      <p className="text-xs mt-1">{feature.description}</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Feature intensity control */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2" id="effect-intensity-label">Effect Intensity</h4>
            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={() => setIntensity(Math.max(0, intensity - 10))}
                className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
                disabled={intensity <= 0}
                aria-label="Decrease effect intensity"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="flex-grow accent-[#E44E51]"
                aria-labelledby="effect-intensity-label"
                aria-valuetext={`${intensity}%`}
              />
              
              <button 
                type="button"
                onClick={() => setIntensity(Math.min(100, intensity + 10))}
                className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
                disabled={intensity >= 100}
                aria-label="Increase effect intensity"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Playback controls */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E] shadow-lg"
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Play className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        
        {/* Video and effects preview */}
        <div className="md:w-2/3">
          <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video 
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${videoError ? 'hidden' : ''}`}
              loop
              muted
              playsInline
              preload="metadata"
              poster={currentFeature.fallbackImage}
            />

            {/* Static fallback rendered by React (no manual DOM injection) */}
            {videoError && (
              <div className="absolute inset-0">
                <img
                  src={currentFeature.fallbackImage}
                  alt={`${currentFeature.name} preview`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <currentFeature.icon className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <div className="text-xl font-bold mb-1">{currentFeature.name}</div>
                  <div className="text-sm text-white/80 text-center max-w-xs px-4">
                    Static preview - interactive effects will be shown on this canvas
                  </div>
                </div>
              </div>
            )}
            
            <canvas 
              ref={canvasRef}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm flex items-center space-x-2">
              <currentFeature.icon className="w-4 h-4" aria-hidden="true" />
              <span>{currentFeature.name}</span>
            </div>
            
            {videoError && (
              <div className="absolute right-4 bottom-4 bg-yellow-500/60 text-white text-xs py-1 px-2 rounded" role="status">
                Using static preview
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            Move the slider to adjust the strength of this illustrated preview
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveFeatureDemo;