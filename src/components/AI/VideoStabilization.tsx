import React, { useState, useRef, useEffect } from 'react';
import { 
  RefreshCw, Settings, Save, Video, 
  Sliders, Play, Pause, Download, Eye
} from 'lucide-react';

interface VideoStabilizationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    strength: number;
    smoothness: number;
    cropMargin: number;
    method: 'simple' | 'dynamic' | 'advanced';
  };
  onProcessingComplete?: (result: Blob) => void;
}

export const VideoStabilization: React.FC<VideoStabilizationProps> = ({
  videoRef,
  enabled,
  settings = {
    strength: 0.5,
    smoothness: 0.7,
    cropMargin: 0.1,
    method: 'dynamic'
  },
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [stabilizationStrength, setStabilizationStrength] = useState(settings.strength);
  const [smoothness, setSmoothness] = useState(settings.smoothness);
  const [cropMargin, setCropMargin] = useState(settings.cropMargin);
  const [method, setMethod] = useState(settings.method);
  const [previewStabilization, setPreviewStabilization] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Motion tracking data
  const motionDataRef = useRef<{ x: number; y: number; scale: number; rotation: number }[]>([]);
  const smoothedMotionRef = useRef<{ x: number; y: number; scale: number; rotation: number }[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Initialize canvas
  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const setupCanvas = () => {
      if (!video || !canvas) return;
      
      // Set canvas dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Set output canvas dimensions
      if (outputCanvasRef.current) {
        outputCanvasRef.current.width = canvas.width;
        outputCanvasRef.current.height = canvas.height;
      }
    };
    
    // Handle video being ready
    if (video.readyState >= 2) {
      setupCanvas();
    } else {
      video.addEventListener('loadeddata', setupCanvas);
    }
    
    // Generate simulated motion data for preview
    generateSimulatedMotionData();
    
    return () => {
      video.removeEventListener('loadeddata', setupCanvas);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [enabled]);

  // Generate simulated camera motion data
  const generateSimulatedMotionData = () => {
    const frames = 300; // Simulate 10 seconds at 30fps
    motionDataRef.current = [];
    
    // Add random motion jitter
    for (let i = 0; i < frames; i++) {
      // Simulate camera shake with perlin-noise-like motion
      const time = i / 30; // Time in seconds
      
      // Base motion with increasing frequency components
      const x = Math.sin(time * 5) * 10 + Math.sin(time * 15) * 5 + Math.sin(time * 30) * 3;
      const y = Math.cos(time * 4) * 8 + Math.cos(time * 12) * 4 + Math.cos(time * 25) * 2;
      
      // Small rotation and scale changes
      const rotation = Math.sin(time * 3) * 1; // degrees
      const scale = 1 + Math.sin(time * 2) * 0.03; // +/- 3%
      
      motionDataRef.current.push({ x, y, rotation, scale });
    }
    
    // Generate smoothed version
    smoothMotionData();
  };

  // Smooth the motion data based on current smoothness setting
  const smoothMotionData = () => {
    if (motionDataRef.current.length === 0) return;
    
    // Create a copy of the motion data
    const rawMotion = [...motionDataRef.current];
    const smoothedMotion: typeof rawMotion = [];
    
    // Simple moving average filter
    const windowSize = Math.ceil(smoothness * 30); // Window size based on smoothness (up to 1 second at smoothness=1)
    
    for (let i = 0; i < rawMotion.length; i++) {
      let sumX = 0, sumY = 0, sumRotation = 0, sumScale = 0;
      let count = 0;
      
      // Analyze window of frames centered on current frame
      for (let j = Math.max(0, i - windowSize); j <= Math.min(rawMotion.length - 1, i + windowSize); j++) {
        sumX += rawMotion[j].x;
        sumY += rawMotion[j].y;
        sumRotation += rawMotion[j].rotation;
        sumScale += rawMotion[j].scale;
        count++;
      }
      
      // Apply stabilization strength
      const origMotion = rawMotion[i];
      const avgMotion = {
        x: sumX / count,
        y: sumY / count,
        rotation: sumRotation / count,
        scale: sumScale / count
      };
      
      // Linear interpolation between original and smoothed motion based on strength
      smoothedMotion.push({
        x: origMotion.x * (1 - stabilizationStrength) + avgMotion.x * stabilizationStrength,
        y: origMotion.y * (1 - stabilizationStrength) + avgMotion.y * stabilizationStrength,
        rotation: origMotion.rotation * (1 - stabilizationStrength) + avgMotion.rotation * stabilizationStrength,
        scale: origMotion.scale * (1 - stabilizationStrength) + avgMotion.scale * stabilizationStrength
      });
    }
    
    smoothedMotionRef.current = smoothedMotion;
  };

  // Update preview when settings change
  useEffect(() => {
    if (enabled) {
      smoothMotionData();
      
      if (previewStabilization) {
        startPreview();
      }
    }
  }, [stabilizationStrength, smoothness, cropMargin, method, enabled]);

  // Draw current frame with/without stabilization
  const drawFrame = (frameIndex = 0) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (previewStabilization && motionDataRef.current.length > 0 && smoothedMotionRef.current.length > 0) {
      // Get motion data for this frame
      const frameIdx = frameIndex % motionDataRef.current.length;
      const rawMotion = motionDataRef.current[frameIdx];
      const smoothMotion = smoothedMotionRef.current[frameIdx];
      
      // Calculate the difference between raw and smoothed motion
      const deltaX = rawMotion.x - smoothMotion.x;
      const deltaY = rawMotion.y - smoothMotion.y;
      const deltaRotation = rawMotion.rotation - smoothMotion.rotation;
      const deltaScale = rawMotion.scale / smoothMotion.scale;
      
      // Calculate crop margin in pixels
      const marginX = canvas.width * cropMargin;
      const marginY = canvas.height * cropMargin;
      
      // Apply transformations to counter camera motion
      ctx.save();
      
      // Move to center, apply transformations, then translate back
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.rotate(deltaRotation * Math.PI / 180);
      ctx.scale(deltaScale, deltaScale);
      ctx.translate(-canvas.width/2 + deltaX, -canvas.height/2 + deltaY);
      
      // Draw video frame
      ctx.drawImage(
        video,
        -marginX, -marginY,
        canvas.width + marginX*2, canvas.height + marginY*2
      );
      
      ctx.restore();
      
      // Draw stabilization data visualization
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(10, 10, 200, 60);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#000';
      ctx.fillText(`Frame: ${frameIdx}`, 20, 30);
      ctx.fillText(`Translation: ${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px`, 20, 45);
      ctx.fillText(`Rotation: ${deltaRotation.toFixed(2)}°, Scale: ${deltaScale.toFixed(3)}`, 20, 60);
    } else {
      // Just draw the video frame normally
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  };

  // Start stabilization preview
  const startPreview = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    // Stop any existing preview
    cancelAnimationFrame(animationFrameRef.current);
    
    let frameCount = 0;
    const animate = () => {
      drawFrame(frameCount);
      frameCount++;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  // Stop stabilization preview
  const stopPreview = () => {
    cancelAnimationFrame(animationFrameRef.current);
    
    // Reset canvas to show current video frame
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Toggle preview
  const togglePreview = () => {
    if (previewStabilization) {
      stopPreview();
    } else {
      startPreview();
    }
    
    setPreviewStabilization(!previewStabilization);
  };

  // Process and apply stabilization to the entire video
  const processStabilization = async () => {
    if (!videoRef.current || !outputCanvasRef.current) return;
    
    try {
      setIsProcessing(true);
      setProgress(0);
      
      const video = videoRef.current;
      const canvas = outputCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Here's where you'd do the actual video stabilization processing
      // This is a simplified simulation - in a real app, you would:
      // 1. Extract frames from the video
      // 2. Track features across frames to determine camera motion
      // 3. Smooth the motion paths
      // 4. Apply transformations to stabilize each frame
      // 5. Render the stabilized video
      
      // Simulate processing time
      const totalFrames = 100; // Assume 100 frames for simplicity
      
      for (let i = 0; i < totalFrames; i++) {
        // Update progress
        setProgress((i / totalFrames) * 100);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Simulate creating a stabilized video
      // In a real implementation, you'd create a MediaRecorder
      // and record the stabilized frames
      
      // Create a simple blob as a placeholder
      const blob = new Blob([], { type: 'video/mp4' });
      
      if (onProcessingComplete) {
        onProcessingComplete(blob);
      }
      
      setProgress(100);
    } catch (err) {
      console.error("Error stabilizing video:", err);
      setError(`Failed to stabilize video: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!enabled) return null;
  
  return (
    <div className="relative">
      {/* Canvas for preview */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Hidden output canvas */}
        <canvas
          ref={outputCanvasRef}
          className="hidden"
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Stabilizing video... {progress.toFixed(0)}%</p>
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-[#E44E51]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="bg-white p-4 rounded-lg max-w-md">
              <p className="text-red-500 mb-2">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Control panel */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Video Stabilization</h3>
          <div className="flex space-x-2">
            <button
              onClick={togglePreview}
              className={`p-2 rounded-lg ${
                previewStabilization ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
              }`}
              disabled={isProcessing}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="text-gray-500 p-1 hover:bg-gray-200 rounded-full"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {showControls && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Stabilization Strength
                </label>
                <span className="text-sm text-gray-500">
                  {(stabilizationStrength * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={stabilizationStrength}
                onChange={(e) => setStabilizationStrength(parseFloat(e.target.value))}
                className="w-full accent-[#E44E51]"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Motion Smoothness
                </label>
                <span className="text-sm text-gray-500">
                  {(smoothness * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={smoothness}
                onChange={(e) => setSmoothness(parseFloat(e.target.value))}
                className="w-full accent-[#E44E51]"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Responsive</span>
                <span>Cinematic</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Crop Margin
                </label>
                <span className="text-sm text-gray-500">
                  {(cropMargin * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={cropMargin}
                onChange={(e) => setCropMargin(parseFloat(e.target.value))}
                className="w-full accent-[#E44E51]"
                disabled={isProcessing}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Minimal</span>
                <span>Maximum</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stabilization Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['simple', 'dynamic', 'advanced'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      method === m
                        ? 'bg-[#E44E51] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={isProcessing}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={processStabilization}
            className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors"
            disabled={isProcessing}
          >
            <Video className="w-4 h-4 mr-2" />
            <span>Stabilize Video</span>
          </button>
          
          <button
            onClick={() => {
              if (outputCanvasRef.current) {
                const canvas = outputCanvasRef.current;
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'stabilized-video.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }, 'image/png');
              }
            }}
            className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            disabled={isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 italic">
        Adjust stabilization settings and preview the effect. Higher stabilization strength and smoothness create more stable footage but may require more cropping.
      </div>
    </div>
  );
};