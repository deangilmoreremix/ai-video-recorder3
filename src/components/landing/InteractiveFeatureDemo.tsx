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
  const [loadError, setLoadError] = useState(false);
  const [backupLoadError, setBackupLoadError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Features data with reliable video URLs
  const features = [
    {
      id: 'face-detection',
      name: 'Face Detection',
      icon: Camera,
      // Use Mixkit videos which are free for commercial and personal use
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-in-the-street-on-a-summers-day-41719-large.mp4',
      // Backup video - another reliable source 
      backupVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-business-woman-nodding-agreement-and-explaining-something-while-having-a-41722-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1590031905407-86afa9c32411?auto=format&fit=crop&w=800&q=80',
      description: 'Detect and track faces in real-time with precision'
    },
    {
      id: 'facial-landmarks',
      name: 'Facial Landmarks',
      icon: Scan,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-happy-woman-winking-outside-45292-large.mp4',
      backupVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-happily-on-her-phone-with-a-friend-12167-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1546458904-143d1674858d?auto=format&fit=crop&w=800&q=80',
      description: 'Track 468 facial points for advanced effects'
    },
    {
      id: 'background-removal',
      name: 'Background Removal',
      icon: Trash2,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-standing-up-as-a-helicopter-passes-40910-large.mp4',
      backupVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-under-umbrellas-decorations-34637-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?auto=format&fit=crop&w=800&q=80',
      description: 'Remove background without a green screen'
    },
    {
      id: 'background-blur',
      name: 'Background Blur',
      icon: Layers,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-walking-under-the-sakura-flowery-trees-4956-large.mp4',
      backupVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-walks-under-an-orange-umbrella-4821-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
      description: 'Apply professional blur effect to background'
    },
    {
      id: 'beautification',
      name: 'Beautification',
      icon: Sparkles,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-with-a-lighted-candle-looking-at-the-camera-39958-large.mp4',
      backupVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-walking-in-the-countryside-45666-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80',
      description: 'Enhance appearance with AI-powered filters'
    }
  ];
  
  // Get current feature data
  const currentFeature = features.find(f => f.id === activeFeature) || features[0];
  
  useEffect(() => {
    if (videoRef.current) {
      // Reset video state
      setVideoLoaded(false);
      setLoadError(false);
      setBackupLoadError(false);
      
      // Make sure the video is paused before changing the source
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
      
      // Reset src attribute and load the new video
      videoRef.current.src = '';
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = currentFeature.videoUrl;
          videoRef.current.load();
          
          // Set poster as fallback
          videoRef.current.poster = currentFeature.fallbackImage;
          
          // Make sure the video is visible
          videoRef.current.style.display = 'block';
          
          // Clean up any overlays
          cleanupOverlays();
        }
      }, 100);
    }
    
    // Set up canvas
    setupCanvas();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      cleanupOverlays();
    };
  }, [activeFeature]);
  
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoLoaded && !loadError && !backupLoadError) {
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
          // If autoplay is blocked, we'll just show the poster/fallback
          useImageFallback();
        });
        animateEffect();
      } else {
        if (videoRef.current.pause) {
          videoRef.current.pause();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }
    }
  }, [isPlaying, videoLoaded, loadError, backupLoadError]);
  
  const cleanupOverlays = () => {
    // Clean up any overlays
    if (videoRef.current) {
      const parent = videoRef.current.parentElement;
      if (parent) {
        const overlay = parent.querySelector('.fallback-overlay');
        if (overlay) {
          parent.removeChild(overlay);
        }
      }
    }
  };
  
  const setupCanvas = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set initial canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Ensure canvas matches video size on load
    video.onloadedmetadata = () => {
      if (canvas) {
        canvas.width = video.videoWidth || canvas.clientWidth;
        canvas.height = video.videoHeight || canvas.clientHeight;
      }
    };
    
    // Start animation
    if (isPlaying) {
      animateEffect();
    }
  };
  
  const animateEffect = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // First draw video frame or fallback
    if (videoRef.current && videoRef.current.readyState >= 2) {
      // Video is ready and can be drawn
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Apply effect based on current feature
      switch (activeFeature) {
        case 'face-detection':
          drawFaceDetectionEffect(ctx, intensity);
          break;
        case 'facial-landmarks':
          drawFacialLandmarksEffect(ctx, intensity);
          break;
        case 'background-removal':
          drawBackgroundRemovalEffect(ctx, intensity);
          break;
        case 'background-blur':
          drawBackgroundBlurEffect(ctx, intensity);
          break;
        case 'beautification':
          drawBeautificationEffect(ctx, intensity);
          break;
      }
    } else {
      // Video not ready yet, draw fallback with nice gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#1a202c");
      gradient.addColorStop(1, "#2d3748");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // If we have the feature info, show that
      if (currentFeature) {
        // Draw feature name
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(currentFeature.name, canvas.width / 2, canvas.height / 2 - 15);
        
        // Draw loading text or status
        ctx.font = "16px Arial";
        ctx.fillText(loadError ? "Using fallback preview" : "Preview loading...", canvas.width / 2, canvas.height / 2 + 15);
      }
      
      // Draw simplified feature effect even without video
      switch (activeFeature) {
        case 'face-detection':
          drawSimplifiedFaceDetection(ctx, intensity);
          break;
        case 'facial-landmarks':
          drawSimplifiedFacialLandmarks(ctx, intensity);
          break;
        case 'background-removal':
          drawSimplifiedBackgroundRemoval(ctx, intensity);
          break;
        case 'background-blur':
          // Default visualization is fine
          break;
        case 'beautification':
          // Default visualization is fine
          break;
      }
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(animateEffect);
  };
  
  // Simplified effect drawings when video isn't available
  const drawSimplifiedFaceDetection = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
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
  
  const drawSimplifiedFacialLandmarks = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
    // Draw face outline
    ctx.strokeStyle = `rgba(0, 255, 255, ${strength * 0.7})`;
    ctx.lineWidth = 1 * strength;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 80, 100, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw some facial landmark dots
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    
    // Draw eyes
    ctx.beginPath();
    ctx.ellipse(centerX - 25, centerY - 20, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(centerX + 25, centerY - 20, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw mouth
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 30, 20, 10, 0, 0, Math.PI);
    ctx.stroke();
    
    // Draw dots for landmarks
    const landmarks = 20;
    for (let i = 0; i < landmarks; i++) {
      const angle = (i / landmarks) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 80;
      const y = centerY + Math.sin(angle) * 100;
      
      ctx.beginPath();
      ctx.arc(x, y, 2 * strength, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  
  const drawSimplifiedBackgroundRemoval = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
    // Draw green background
    ctx.fillStyle = `rgba(0, 255, 0, ${0.3 * strength})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw person silhouette
    ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * strength})`;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 30, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 70, 60, 100, 0, 0, Math.PI);
    ctx.fill();
    
    // Add text
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Background Removed", centerX, centerY - 100);
  };
  
  // Effect drawing functions
  const drawFaceDetectionEffect = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    // Simulated face detection box
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.35;
    const boxWidth = ctx.canvas.width * 0.2;
    const boxHeight = ctx.canvas.height * 0.3;
    
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
      `${Math.round(intensity)}% confidence`, 
      centerX - boxWidth/2, 
      centerY - boxHeight/2 - 5
    );
  };
  
  const drawFacialLandmarksEffect = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    // Simulated facial landmarks (simplified)
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.35;
    const faceWidth = ctx.canvas.width * 0.15;
    const faceHeight = ctx.canvas.height * 0.25;
    
    // Create facial landmark points
    const landmarks: [number, number][] = [];
    
    // Create oval face shape
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * (faceWidth/2);
      const y = centerY + Math.sin(angle) * (faceHeight/2);
      landmarks.push([x, y]);
    }
    
    // Add eyes
    landmarks.push([centerX - faceWidth * 0.25, centerY - faceHeight * 0.1]); // Left eye
    landmarks.push([centerX + faceWidth * 0.25, centerY - faceHeight * 0.1]); // Right eye
    
    // Add nose
    landmarks.push([centerX, centerY + faceHeight * 0.1]); // Nose tip
    
    // Add mouth
    landmarks.push([centerX - faceWidth * 0.2, centerY + faceHeight * 0.2]); // Left mouth
    landmarks.push([centerX, centerY + faceHeight * 0.25]); // Mouth bottom
    landmarks.push([centerX + faceWidth * 0.2, centerY + faceHeight * 0.2]); // Right mouth
    
    // Draw landmarks
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    
    landmarks.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 2 * strength, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw connections
    ctx.strokeStyle = `rgba(0, 255, 255, ${strength * 0.7})`;
    ctx.lineWidth = 1 * strength;
    
    // Draw mouth
    ctx.beginPath();
    ctx.moveTo(centerX - faceWidth * 0.2, centerY + faceHeight * 0.2);
    ctx.quadraticCurveTo(
      centerX, centerY + faceHeight * 0.3,
      centerX + faceWidth * 0.2, centerY + faceHeight * 0.2
    );
    ctx.stroke();
    
    // Draw eyes
    ctx.beginPath();
    ctx.ellipse(
      centerX - faceWidth * 0.25, 
      centerY - faceHeight * 0.1,
      faceWidth * 0.1,
      faceHeight * 0.05,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(
      centerX + faceWidth * 0.25, 
      centerY - faceHeight * 0.1,
      faceWidth * 0.1,
      faceHeight * 0.05,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  };
  
  const drawBackgroundRemovalEffect = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    // Simulate background removal
    
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Draw original image
    tempCtx.drawImage(ctx.canvas, 0, 0);
    
    // Clear original canvas
    ctx.fillStyle = '#00FF00'; // Green background
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw simulated foreground
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    const personWidth = ctx.canvas.width * 0.4;
    const personHeight = ctx.canvas.height * 0.8;
    
    // Create a circle-like mask for the person
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw person silhouette
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      personWidth / 2, 
      personHeight / 2, 
      0, 
      0, 
      Math.PI * 2
    );
    
    // Create gradient edge for smooth mask
    const gradient = ctx.createRadialGradient(
      centerX, centerY, personWidth / 2 * 0.9,
      centerX, centerY, personWidth / 2
    );
    
    gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    
    // Draw original video inside the mask
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Edge highlight for effect visualization
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(255, 255, 255, ${strength * 0.7})`;
    ctx.lineWidth = 2 * strength;
    ctx.stroke();
    
    // Add "Background Removed" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Background Removed: ${Math.round(intensity)}%`, 20, 30);
  };
  
  const drawBackgroundBlurEffect = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    
    // Create a temporary canvas for the background blur effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return;
    
    // Draw original image to temp canvas
    tempCtx.drawImage(ctx.canvas, 0, 0);
    
    // Draw blurred version first (simulate blur by drawing 3 transparent overlays)
    ctx.globalAlpha = 0.3 * strength;
    for (let i = 0; i < 20 * strength; i++) {
      ctx.drawImage(
        tempCanvas, 
        0, 0, tempCanvas.width, tempCanvas.height,
        -10 + Math.random() * 20, -10 + Math.random() * 20, 
        tempCanvas.width, tempCanvas.height
      );
    }
    
    // Reset alpha
    ctx.globalAlpha = 1;
    
    // Draw foreground (person)
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.4;
    const personWidth = ctx.canvas.width * 0.35;
    const personHeight = ctx.canvas.height * 0.7;
    
    // Create person silhouette
    const gradient = ctx.createRadialGradient(
      centerX, centerY, personWidth / 2 * 0.8,
      centerX, centerY, personWidth / 2
    );
    
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    
    ctx.save();
    
    // Create clipping region for person
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      personWidth / 2, 
      personHeight / 2, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.clip();
    
    // Draw original unblurred content inside the clipping region
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Restore context
    ctx.restore();
    
    // Edge highlight for effect visualization
    ctx.strokeStyle = `rgba(255, 255, 255, ${strength * 0.5})`;
    ctx.lineWidth = 2 * strength;
    ctx.beginPath();
    ctx.ellipse(
      centerX, 
      centerY, 
      personWidth / 2, 
      personHeight / 2, 
      0, 
      0, 
      Math.PI * 2
    );
    ctx.stroke();
    
    // Add "Background Blur" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Background Blur: ${Math.round(intensity)}%`, 20, 30);
  };
  
  const drawBeautificationEffect = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const strength = intensity / 100;
    
    // Create color overlay for beautification effect
    ctx.fillStyle = `rgba(255, 220, 220, ${0.1 * strength})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Increase contrast and brightness slightly
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * strength})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Reset composition
    ctx.globalCompositeOperation = 'source-over';
    
    // Add "Beautification" indicator
    ctx.fillStyle = `rgba(228, 78, 81, ${strength})`;
    ctx.font = '14px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Beautification: ${Math.round(intensity)}%`, 20, 30);
    
    // Draw face highlight
    const centerX = ctx.canvas.width * 0.5;
    const centerY = ctx.canvas.height * 0.35;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, ctx.canvas.height * 0.15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 182, 193, ${0.3 * strength})`;
    ctx.lineWidth = 3 * strength;
    ctx.stroke();
  };
  
  // Handle video loading
  const handleVideoLoad = () => {
    console.log("Video loaded successfully:", currentFeature.name);
    setVideoLoaded(true);
    setLoadError(false);
    setBackupLoadError(false);
    
    // Remove any error overlays that might be present
    cleanupOverlays();
  };
  
  // Function to handle fallback to image
  const useImageFallback = () => {
    console.log(`Using image fallback for ${currentFeature.name}`);
    
    if (!videoRef.current) return;
    
    // Reset loading states
    setVideoLoaded(false);
    setBackupLoadError(true);
    
    // Ensure video element has the right poster image
    videoRef.current.poster = currentFeature.fallbackImage;
    
    // Create or update the fallback overlay
    const parent = videoRef.current.parentElement;
    if (parent) {
      // Check if we already added an overlay
      let overlay = parent.querySelector('.fallback-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'fallback-overlay absolute inset-0 flex items-center justify-center bg-gray-800/50';
        
        const Icon = currentFeature.icon;
        const iconName = Icon.name || 'Icon';
        
        overlay.innerHTML = `
          <div class="text-center text-white">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                ${iconName === 'Camera' ? '<rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><circle cx="12" y="12" r="4"></circle>' : 
                  iconName === 'Scan' ? '<path d="M21 12V7.5a2.5 2.5 0 0 0-2.5-2.5H16"></path><path d="M3 12v4.5a2.5 2.5 0 0 0 2.5 2.5H9"></path><path d="M3 12V7.5A2.5 2.5 0 0 1 5.5 5H9"></path><path d="M21 12v4.5a2.5 2.5 0 0 1-2.5 2.5H16"></path><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>' : 
                  iconName === 'Trash2' ? '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>' : 
                  iconName === 'Layers' ? '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>' : 
                  '<circle cx="12" cy="12" r="10"></circle><path d="m9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>'}
              </svg>
            </div>
            <p>${currentFeature.name}</p>
            <p class="text-sm opacity-80">Preview not available</p>
          </div>
        `;
        parent.appendChild(overlay);
      }
    }
  };
  
  // Handle video error with improved error handling
  const handleVideoError = () => {
    console.error(`Error loading video for ${currentFeature.name}`);
    
    // Mark the main video as having an error
    setLoadError(true);
    setVideoLoaded(false);
    
    // If we haven't tried the backup yet and it exists, try it
    if (!backupLoadError && currentFeature.backupVideoUrl && videoRef.current) {
      console.log(`Trying backup video URL for ${currentFeature.name}`);
      
      // Make sure the video is completely stopped before changing source
      videoRef.current.pause();
      videoRef.current.removeAttribute('src'); // Completely unload the previous video
      
      // Set a short timeout to ensure the previous video is unloaded
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = currentFeature.backupVideoUrl;
          videoRef.current.load();
          
          // Manually handle the backup video's events
          const handleBackupLoad = () => {
            setVideoLoaded(true);
            if (isPlaying) {
              videoRef.current?.play().catch(handleBackupError);
            }
            videoRef.current?.removeEventListener('loadeddata', handleBackupLoad);
          };
          
          const handleBackupError = () => {
            console.error("Failed to play backup video");
            setBackupLoadError(true);
            videoRef.current?.removeEventListener('loadeddata', handleBackupLoad);
            videoRef.current?.removeEventListener('error', handleBackupError);
            useImageFallback();
          };
          
          videoRef.current.addEventListener('loadeddata', handleBackupLoad);
          videoRef.current.addEventListener('error', handleBackupError);
        }
      }, 300);
    } else {
      // Both main and backup videos failed or backup doesn't exist
      setBackupLoadError(true);
      useImageFallback();
    }
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
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
            <video 
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay={false}  // We'll control playback manually
              loop
              muted
              poster={currentFeature.fallbackImage}
              onError={handleVideoError}
              onLoadedData={handleVideoLoad}
            ></video>
            
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            ></canvas>
            
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
              <currentFeature.icon className="w-4 h-4" />
              <span>{currentFeature.name}</span>
            </div>
            
            {(loadError && !backupLoadError) && (
              <div className="absolute right-4 bottom-4 bg-yellow-500/60 text-white text-xs py-1 px-2 rounded">
                Using backup video
              </div>
            )}
            
            {backupLoadError && (
              <div className="absolute right-4 bottom-4 bg-black/60 text-white text-xs py-1 px-2 rounded">
                Using fallback preview
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