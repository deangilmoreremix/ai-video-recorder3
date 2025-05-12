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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Features data with updated video URLs to more reliable sources
  const features = [
    {
      id: 'face-detection',
      name: 'Face Detection',
      icon: Camera,
      // Updated to a new reliable source
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-laptop-in-office-space-42905-large.mp4',
      fallbackImage: 'https://images.unsplash.com/photo-1590031905407-86afa9c32411?auto=format&fit=crop&w=800&q=80',
      description: 'Detect and track faces in real-time with precision'
    },
    {
      id: 'facial-landmarks',
      name: 'Facial Landmarks',
      icon: Scan,
      // Updated to a more reliable source
      videoUrl: 'https://player.vimeo.com/external/469885756.sd.mp4?s=d7cac9bd8c7b67a17d59eb4af33c740873ca78b3&profile_id=165&oauth2_token_id=57447761',
      fallbackImage: 'https://images.unsplash.com/photo-1546458904-143d1674858d?auto=format&fit=crop&w=800&q=80',
      description: 'Track 468 facial points for advanced effects'
    },
    {
      id: 'background-removal',
      name: 'Background Removal',
      icon: Trash2,
      // Updated to a more reliable source
      videoUrl: 'https://player.vimeo.com/external/498927069.sd.mp4?s=72e78348da74a29704be555406aa579c2263bce1&profile_id=165&oauth2_token_id=57447761',
      fallbackImage: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?auto=format&fit=crop&w=800&q=80',
      description: 'Remove background without a green screen'
    },
    {
      id: 'background-blur',
      name: 'Background Blur',
      icon: Layers,
      // Updated to a more reliable source
      videoUrl: 'https://player.vimeo.com/external/534342299.sd.mp4?s=4b5dbc3e4d834e0b6e17a37a3e07979467e09fda&profile_id=165&oauth2_token_id=57447761',
      fallbackImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
      description: 'Apply professional blur effect to background'
    },
    {
      id: 'beautification',
      name: 'Beautification',
      icon: Sparkles,
      // Updated to a more reliable source
      videoUrl: 'https://player.vimeo.com/external/403970080.sd.mp4?s=72dae3fe3fa91bcf9a1d6fe51fee5ad630091d46&profile_id=165&oauth2_token_id=57447761',
      fallbackImage: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80',
      description: 'Enhance appearance with AI-powered filters'
    }
  ];
  
  // Get current feature data
  const currentFeature = features.find(f => f.id === activeFeature) || features[0];
  
  useEffect(() => {
    if (videoRef.current) {
      // Reset video loaded state
      setVideoLoaded(false);
      
      // Load new video when feature changes
      videoRef.current.src = currentFeature.videoUrl;
      videoRef.current.load();
      
      // Set poster as fallback
      videoRef.current.poster = currentFeature.fallbackImage;
      
      // Add error handler
      const handleError = () => {
        console.error(`Error loading video for ${currentFeature.name}`);
        
        // Update UI with fallback
        if (videoRef.current) {
          // Ensure poster is set
          videoRef.current.poster = currentFeature.fallbackImage;
          
          // Set up the error state
          setVideoLoaded(false);
          
          // Make sure the video element itself is visible
          if (videoRef.current.style.display === 'none') {
            videoRef.current.style.display = 'block';
          }
        }
      };
      
      // Add load success handler
      const handleLoadedData = () => {
        setVideoLoaded(true);
      };
      
      // Set up event listeners
      videoRef.current.onerror = handleError;
      videoRef.current.onloadeddata = handleLoadedData;
      
      if (isPlaying) {
        videoRef.current.play().catch(handleError);
      }
    }
    
    // Set up canvas
    setupCanvas();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeFeature, currentFeature.videoUrl]);
  
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoLoaded) {
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
          // If autoplay is blocked, we'll just show the poster/fallback
          setVideoLoaded(false);
        });
        animateEffect();
      } else {
        if (videoRef.current.pause) {
          videoRef.current.pause();
        }
        cancelAnimationFrame(animationFrameRef.current!);
      }
    }
  }, [isPlaying, videoLoaded]);
  
  const setupCanvas = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set initial canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Ensure canvas matches video size on load
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || canvas.clientWidth;
      canvas.height = video.videoHeight || canvas.clientHeight;
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
        ctx.fillText("Preview loading...", canvas.width / 2, canvas.height / 2 + 15);
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
    setVideoLoaded(true);
  };
  
  // Handle video error with more robust error handling
  const handleVideoError = () => {
    console.error(`Error loading video for ${currentFeature.name}`);
    
    // Set video loaded to false to show fallback
    setVideoLoaded(false);
    
    // Make sure poster is set
    if (videoRef.current) {
      videoRef.current.poster = currentFeature.fallbackImage;
      
      // Make sure the video element is visible despite errors
      videoRef.current.style.display = 'block';
    }
    
    // Continue with animation effect even without video
    if (isPlaying) {
      animateEffect();
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
              autoPlay={isPlaying}
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
            
            {!videoLoaded && (
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