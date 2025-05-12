import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, Scan, HandMetal, Layers, Trash2, Sparkles, Focus, 
  Sliders, Plus, Minus, Play, Pause
} from 'lucide-react';

interface InteractiveFeatureDemoProps {
  initialFeature?: string;
}

const InteractiveFeatureDemo: React.FC<InteractiveFeatureDemoProps> = ({ initialFeature = 'face-detection' }) => {
  const [activeFeature, setActiveFeature] = useState(initialFeature);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intensity, setIntensity] = useState(50);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Features data with reliable video URLs and fallback images
  const features = [
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
  
  // Get current feature data
  const currentFeature = features.find(f => f.id === activeFeature) || features[0];
  
  // Handle feature change
  useEffect(() => {
    // Reset state
    setVideoLoaded(false);
    setVideoError(false);
    
    // Clear any existing animations and timeouts
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
    
    // Remove any existing overlays
    cleanupOverlays();
    
    // Set up canvas to match container size
    setupCanvas();
    
    // Load video with error handling
    loadVideo();
    
    // Start animation if playing
    if (isPlaying) {
      animateEffect();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      cleanupOverlays();
    };
  }, [activeFeature]);
  
  // Handle play state changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying && videoLoaded && !videoError) {
      videoRef.current.play().catch(err => {
        console.warn("Autoplay prevented:", err);
      });
      animateEffect();
    } else {
      videoRef.current.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, videoLoaded, videoError]);
  
  // Clean up any overlay elements
  const cleanupOverlays = () => {
    if (!videoRef.current) return;
    
    const parent = videoRef.current.parentElement;
    if (parent) {
      // Find and remove any overlays
      const overlays = parent.querySelectorAll('.feature-overlay');
      overlays.forEach(overlay => {
        parent.removeChild(overlay);
      });
    }
  };
  
  // Load video with robust error handling
  const loadVideo = () => {
    if (!videoRef.current || !currentFeature) return;
    
    const video = videoRef.current;
    
    // Reset video state and show the element
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.style.display = 'block';
    
    // Set poster image as fallback
    video.poster = currentFeature.fallbackImage;
    
    // Prepare error handler
    const handleVideoError = () => {
      console.log('Video failed to load, using fallback image');
      setVideoError(true);
      setVideoLoaded(false);
      showFallbackImage();
    };
    
    // Set up load handler
    const handleVideoLoaded = () => {
      setVideoLoaded(true);
      setVideoError(false);
      
      if (isPlaying) {
        video.play().catch(err => {
          console.warn("Autoplay prevented:", err);
        });
      }
    };
    
    // Clear previous event listeners
    video.onloadeddata = null;
    video.onerror = null;
    
    // Add event listeners
    video.addEventListener('loadeddata', handleVideoLoaded, { once: true });
    video.addEventListener('error', handleVideoError, { once: true });
    
    try {
      // Set source and begin loading
      video.src = currentFeature.videoUrl;
      video.load();
      
      // Set timeout in case video takes too long to load
      loadingTimeoutRef.current = setTimeout(() => {
        if (!videoLoaded && !videoError) {
          console.warn("Video load timeout");
          handleVideoError();
        }
      }, 10000); // 10 second timeout
    } catch (err) {
      console.error("Error setting video source:", err);
      handleVideoError();
    }
  };
  
  // Show fallback image when video fails to load
  const showFallbackImage = () => {
    if (!videoRef.current || !currentFeature) return;
    
    const video = videoRef.current;
    video.style.display = 'none';
    
    // Find parent element
    const parent = video.parentElement;
    if (!parent) return;
    
    // Check if we already have a fallback element
    let fallback = parent.querySelector('.feature-overlay') as HTMLElement;
    if (fallback) {
      // Update existing fallback
      fallback.style.backgroundImage = `url(${currentFeature.fallbackImage})`;
      return;
    }
    
    // Create fallback element
    fallback = document.createElement('div');
    fallback.className = 'feature-overlay absolute inset-0 bg-cover bg-center';
    fallback.style.backgroundImage = `url(${currentFeature.fallbackImage})`;
    
    // Add a darkening overlay for text visibility
    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 bg-black bg-opacity-30 flex flex-col items-center justify-center text-white';
    
    // Icon element
    const IconComponent = currentFeature.icon;
    const iconEl = document.createElement('div');
    iconEl.className = 'w-16 h-16 mb-4 rounded-full bg-white/10 flex items-center justify-center';
    iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="${getIconPath(currentFeature.icon)}"></path></svg>`;
    
    // Text elements
    const titleEl = document.createElement('div');
    titleEl.className = 'text-xl font-bold mb-1';
    titleEl.textContent = currentFeature.name;
    
    const descEl = document.createElement('div');
    descEl.className = 'text-sm text-white/80 text-center max-w-xs px-4';
    descEl.textContent = "Static preview - interactive effects will be shown on this canvas";
    
    overlay.appendChild(iconEl);
    overlay.appendChild(titleEl);
    overlay.appendChild(descEl);
    fallback.appendChild(overlay);
    parent.appendChild(fallback);
  };
  
  // Helper to get SVG path for different icons
  const getIconPath = (Icon: React.ElementType): string => {
    if (Icon === Camera) {
      return "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
    } else if (Icon === Scan) {
      return "M21 12V7.5a2.5 2.5 0 0 0-2.5-2.5H16 M3 12v4.5A2.5 2.5 0 0 0 5.5 19H9 M3 12V7.5A2.5 2.5 0 0 1 5.5 5H9 M21 12v4.5a2.5 2.5 0 0 1-2.5 2.5H16";
    } else if (Icon === Trash2) {
      return "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2";
    } else if (Icon === Layers) {
      return "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5";
    } else if (Icon === Sparkles) {
      return "m12 3-1.9 5.7a2 2 0 0 1-1.3 1.3L3 12l5.7 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.7a2 2 0 0 1 1.3-1.3L21 12l-5.7-1.9a2 2 0 0 1-1.3-1.3L12 3Z";
    }
    return "";
  };
  
  // Set up canvas for drawing
  const setupCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    // Get the dimensions from the parent element to ensure proper scaling
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
  };
  
  // Animation function for the AI effect visualizations
  const animateEffect = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame if video is loaded and playing
    if (videoRef.current && videoRef.current.readyState >= 2 && videoLoaded && !videoError) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Apply active effect visualization
    applyEffectVisualization(ctx, activeFeature, intensity);
    
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
    if (videoError) return drawSimplifiedFaceDetection(ctx, strength);
    
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
      `Confidence: ${Math.round(intensity)}%`, 
      centerX - boxWidth/2, 
      centerY - boxHeight/2 - 8
    );
  };
  
  // Draw facial landmarks visualization
  const drawFacialLandmarksEffect = (ctx: CanvasRenderingContext2D, strength: number) => {
    if (videoError) return drawSimplifiedFacialLandmarks(ctx, strength);
    
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
    if (videoError) return drawSimplifiedBackgroundRemoval(ctx, strength);
    
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
    if (videoError) return; // No simplified version needed, just skip
    
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
    if (videoError) return; // No simplified version, just skip
    
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
        <h3 className="text-2xl font-bold text-gray-900">Try AI Features</h3>
        <p className="mt-2 text-gray-600">Interact with our AI features to see how they work</p>
      </div>
      
      {/* Feature demo area */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Feature selector */}
        <div className="md:w-1/3">
          <div className="space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              
              return (
                <motion.button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[#E44E51]/10 text-[#E44E51] border-[#E44E51] border' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  whileHover={{ x: isActive ? 0 : 5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5 mr-3" />
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Effect Intensity</h4>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIntensity(Math.max(0, intensity - 10))}
                className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                disabled={intensity <= 0}
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="flex-grow accent-[#E44E51]"
              />
              
              <button 
                onClick={() => setIntensity(Math.min(100, intensity + 10))}
                className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                disabled={intensity >= 100}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Playback controls */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E] shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* Video and effects preview */}
        <div className="md:w-2/3">
          <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video 
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted
              poster={currentFeature?.fallbackImage}
            />
            
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm flex items-center space-x-2">
              <currentFeature.icon className="w-4 h-4" />
              <span>{currentFeature.name}</span>
            </div>
            
            {videoError && (
              <div className="absolute right-4 bottom-4 bg-yellow-500/60 text-white text-xs py-1 px-2 rounded">
                Using static preview
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            Move the slider to adjust the AI effect intensity
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveFeatureDemo;