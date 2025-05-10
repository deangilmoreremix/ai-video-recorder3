import React, { useState, useRef, useEffect } from 'react';
import { 
  Crop, Maximize, RefreshCw, Lock, Unlock, 
  RotateClockwise, Settings, Save, AspectRatio, Fullscreen
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SmartCroppingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    aspectRatio: string;
    followSubject: boolean;
    applyRuleOfThirds: boolean;
    smoothTransitions: boolean;
  };
  onCropChange?: (crop: CropRegion) => void;
  onProcessingComplete?: (result: Blob) => void;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SmartCropping: React.FC<SmartCroppingProps> = ({
  videoRef,
  enabled,
  settings = {
    aspectRatio: '16:9',
    followSubject: true,
    applyRuleOfThirds: true,
    smoothTransitions: true,
  },
  onCropChange,
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<CropRegion>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [followSubject, setFollowSubject] = useState(settings.followSubject);
  const [applyRuleOfThirds, setApplyRuleOfThirds] = useState(settings.applyRuleOfThirds);
  const [smoothTransitions, setSmoothTransitions] = useState(settings.smoothTransitions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const [autoTracking, setAutoTracking] = useState(true);

  // Initialize canvas and set up initial crop area
  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const updateCanvas = () => {
      if (!video || !canvas) return;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Initialize crop area if not already set
      if (crop.width === 100 && crop.height === 100) {
        let newCrop: CropRegion;
        
        // Parse aspect ratio
        let ratio = 16/9;
        if (aspectRatio.includes(':')) {
          const [width, height] = aspectRatio.split(':').map(Number);
          if (width && height) {
            ratio = width / height;
          }
        }
        
        // Calculate initial crop dimensions
        const videoRatio = canvas.width / canvas.height;
        
        if (ratio > videoRatio) {
          // Wider aspect ratio than video
          newCrop = {
            width: canvas.width,
            height: canvas.width / ratio,
            x: 0,
            y: (canvas.height - (canvas.width / ratio)) / 2
          };
        } else {
          // Taller aspect ratio than video
          newCrop = {
            width: canvas.height * ratio,
            height: canvas.height,
            x: (canvas.width - (canvas.height * ratio)) / 2,
            y: 0
          };
        }
        
        // Update crop state
        setCrop(newCrop);
        onCropChange?.(newCrop);
      }
      
      drawOverlay();
    };
    
    // Handle video being ready
    if (video.readyState >= 2) {
      updateCanvas();
    } else {
      video.addEventListener('loadeddata', updateCanvas);
    }
    
    return () => {
      video.removeEventListener('loadeddata', updateCanvas);
    };
  }, [enabled, videoRef, aspectRatio, crop.width, crop.height]);

  // Draw overlay
  const drawOverlay = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area to show video beneath
    ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
    
    // Draw crop border
    ctx.strokeStyle = '#E44E51';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    
    // Draw rule of thirds grid if enabled
    if (applyRuleOfThirds) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let i = 1; i <= 2; i++) {
        const x = crop.x + (crop.width * i / 3);
        ctx.beginPath();
        ctx.moveTo(x, crop.y);
        ctx.lineTo(x, crop.y + crop.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 1; i <= 2; i++) {
        const y = crop.y + (crop.height * i / 3);
        ctx.beginPath();
        ctx.moveTo(crop.x, y);
        ctx.lineTo(crop.x + crop.width, y);
        ctx.stroke();
      }
    }
    
    // Draw corners for resizing
    const cornerSize = 10;
    ctx.fillStyle = '#E44E51';
    
    // Top-left
    ctx.fillRect(crop.x - cornerSize/2, crop.y - cornerSize/2, cornerSize, cornerSize);
    // Top-right
    ctx.fillRect(crop.x + crop.width - cornerSize/2, crop.y - cornerSize/2, cornerSize, cornerSize);
    // Bottom-left
    ctx.fillRect(crop.x - cornerSize/2, crop.y + crop.height - cornerSize/2, cornerSize, cornerSize);
    // Bottom-right
    ctx.fillRect(crop.x + crop.width - cornerSize/2, crop.y + crop.height - cornerSize/2, cornerSize, cornerSize);
    
    // Draw detected faces
    if (followSubject && detectedFaces.length > 0) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      
      detectedFaces.forEach(face => {
        ctx.strokeRect(face.x, face.y, face.width, face.height);
      });
    }
  };

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check if clicking on a corner resize handle
    const cornerSize = 10;
    const corners = [
      { x: crop.x, y: crop.y, type: 'topLeft' },
      { x: crop.x + crop.width, y: crop.y, type: 'topRight' },
      { x: crop.x, y: crop.y + crop.height, type: 'bottomLeft' },
      { x: crop.x + crop.width, y: crop.y + crop.height, type: 'bottomRight' }
    ];
    
    for (const corner of corners) {
      if (
        x >= corner.x - cornerSize/2 &&
        x <= corner.x + cornerSize/2 &&
        y >= corner.y - cornerSize/2 &&
        y <= corner.y + cornerSize/2
      ) {
        setIsResizing(true);
        setDragStart({ x, y });
        return;
      }
    }
    
    // Check if clicking inside crop area (for dragging)
    if (
      x >= crop.x &&
      x <= crop.x + crop.width &&
      y >= crop.y &&
      y <= crop.y + crop.height
    ) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || (!isDragging && !isResizing)) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (isDragging) {
      // Move crop area
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      let newX = crop.x + deltaX;
      let newY = crop.y + deltaY;
      
      // Keep crop area within canvas bounds
      newX = Math.max(0, Math.min(canvas.width - crop.width, newX));
      newY = Math.max(0, Math.min(canvas.height - crop.height, newY));
      
      setCrop(prev => {
        const newCrop = {
          ...prev,
          x: newX,
          y: newY
        };
        onCropChange?.(newCrop);
        return newCrop;
      });
      setDragStart({ x, y });
    } else if (isResizing) {
      // Resize crop area
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      
      let newWidth = crop.width + deltaX;
      let newHeight = crop.height + deltaY;
      
      // Apply aspect ratio lock if enabled
      if (aspectRatioLocked) {
        const [width, height] = aspectRatio.split(':').map(Number);
        const ratio = width / height;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / ratio;
        } else {
          newWidth = newHeight * ratio;
        }
      }
      
      // Ensure minimum size
      newWidth = Math.max(30, newWidth);
      newHeight = Math.max(30, newHeight);
      
      // Keep within canvas bounds
      newWidth = Math.min(canvas.width - crop.x, newWidth);
      newHeight = Math.min(canvas.height - crop.y, newHeight);
      
      setCrop(prev => {
        const newCrop = {
          ...prev,
          width: newWidth,
          height: newHeight
        };
        onCropChange?.(newCrop);
        return newCrop;
      });
      setDragStart({ x, y });
    }
    
    drawOverlay();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Update crop when aspect ratio changes
  useEffect(() => {
    if (!canvasRef.current || !aspectRatioLocked) return;
    
    const canvas = canvasRef.current;
    
    // Parse aspect ratio
    let ratio = 16/9;
    if (aspectRatio.includes(':')) {
      const [width, height] = aspectRatio.split(':').map(Number);
      if (width && height) {
        ratio = width / height;
      }
    }
    
    // Calculate new height based on current width and aspect ratio
    let newHeight = crop.width / ratio;
    
    // Ensure crop stays within canvas bounds
    if (crop.y + newHeight > canvas.height) {
      newHeight = canvas.height - crop.y;
      const newWidth = newHeight * ratio;
      
      setCrop(prev => {
        const newCrop = {
          ...prev,
          width: newWidth,
          height: newHeight
        };
        onCropChange?.(newCrop);
        return newCrop;
      });
    } else {
      setCrop(prev => {
        const newCrop = {
          ...prev,
          height: newHeight
        };
        onCropChange?.(newCrop);
        return newCrop;
      });
    }
    
    drawOverlay();
  }, [aspectRatio, aspectRatioLocked]);

  // Simulated face detection for subject tracking
  useEffect(() => {
    if (!followSubject || !enabled || !videoRef.current || !canvasRef.current) return;
    
    let animationFrame: number;
    const detectFacesInterval = setInterval(() => {
      // This is a simplified simulation - in a real app, you would use a face detection model
      // Simulate detecting a face at a random position
      if (autoTracking) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const faceWidth = canvas.width * 0.2;
        const faceHeight = canvas.height * 0.3;
        
        // Simulate a moving face by using sin/cos functions
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const time = Date.now() / 1000;
        
        const faceX = centerX + Math.sin(time * 0.5) * (canvas.width * 0.2);
        const faceY = centerY + Math.cos(time * 0.3) * (canvas.height * 0.15);
        
        const newDetectedFaces = [{
          x: faceX - faceWidth/2,
          y: faceY - faceHeight/2,
          width: faceWidth,
          height: faceHeight
        }];
        
        setDetectedFaces(newDetectedFaces);
        
        // Adjust crop to follow the face if auto-tracking is enabled
        if (followSubject) {
          const faceCenter = {
            x: faceX,
            y: faceY
          };
          
          // Keep the face centered in the crop area
          let newX = faceCenter.x - crop.width / 2;
          let newY = faceCenter.y - crop.height / 2;
          
          // Apply smoothing if enabled
          if (smoothTransitions) {
            newX = crop.x + (newX - crop.x) * 0.1;
            newY = crop.y + (newY - crop.y) * 0.1;
          }
          
          // Keep crop within canvas bounds
          newX = Math.max(0, Math.min(canvas.width - crop.width, newX));
          newY = Math.max(0, Math.min(canvas.height - crop.height, newY));
          
          setCrop(prev => {
            const newCrop = {
              ...prev,
              x: newX,
              y: newY
            };
            onCropChange?.(newCrop);
            return newCrop;
          });
        }
      }
      
      // Redraw overlay
      animationFrame = requestAnimationFrame(drawOverlay);
    }, 100);
    
    return () => {
      clearInterval(detectFacesInterval);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [followSubject, autoTracking, enabled, crop.width, crop.height, smoothTransitions]);

  // Process and apply crop
  const processCrop = async () => {
    if (!videoRef.current || !outputCanvasRef.current) return;
    
    try {
      setIsProcessing(true);
      
      const video = videoRef.current;
      const canvas = outputCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Set output canvas dimensions to match crop dimensions
      canvas.width = crop.width;
      canvas.height = crop.height;
      
      // Draw cropped region to output canvas
      ctx.drawImage(
        video,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, canvas.width, canvas.height
      );
      
      // Convert to blob for output
      canvas.toBlob(blob => {
        if (blob && onProcessingComplete) {
          onProcessingComplete(blob);
        }
      });
    } catch (err) {
      console.error("Error processing crop:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save cropped image
  const saveCroppedImage = () => {
    if (!outputCanvasRef.current) return;
    
    const canvas = outputCanvasRef.current;
    
    canvas.toBlob(blob => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cropped-image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  if (!enabled) return null;
  
  return (
    <div className="relative">
      {/* Main editing canvas */}
      <div className="relative aspect-video">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-move z-10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Hidden output canvas */}
        <canvas
          ref={outputCanvasRef}
          className="hidden"
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="text-white text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Processing crop...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Control panel */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Smart Cropping Controls</h3>
          <button 
            onClick={() => setShowControls(!showControls)} 
            className="text-gray-500 p-1 hover:bg-gray-200 rounded-full"
          >
            {showControls ? <Settings className="w-4 h-4" /> : <Crop className="w-4 h-4" />}
          </button>
        </div>
        
        {showControls && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm text-gray-700 mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border-gray-300"
                  disabled={isProcessing}
                >
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="4:3">4:3 (Standard)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="21:9">21:9 (Cinematic)</option>
                </select>
              </div>
              <button
                onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                className="p-2 rounded-lg bg-gray-200 self-end"
                title={aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                disabled={isProcessing}
              >
                {aspectRatioLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Fullscreen className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Follow Subject</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followSubject}
                    onChange={(e) => setFollowSubject(e.target.checked)}
                    className="sr-only peer"
                    disabled={isProcessing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                    peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                    peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                    after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51] 
                    peer-disabled:opacity-50" />
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AspectRatio className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Rule of Thirds</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRuleOfThirds}
                    onChange={(e) => setApplyRuleOfThirds(e.target.checked)}
                    className="sr-only peer"
                    disabled={isProcessing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                    peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                    peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                    after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]
                    peer-disabled:opacity-50" />
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Smooth Transitions</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smoothTransitions}
                  onChange={(e) => setSmoothTransitions(e.target.checked)}
                  className="sr-only peer"
                  disabled={isProcessing}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]
                  peer-disabled:opacity-50" />
              </label>
            </div>
            
            {followSubject && (
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <RotateClockwise className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Auto Tracking</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTracking}
                    onChange={(e) => setAutoTracking(e.target.checked)}
                    className="sr-only peer"
                    disabled={isProcessing}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                    peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                    peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                    after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]
                    peer-disabled:opacity-50" />
                </label>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={processCrop}
            className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors"
            disabled={isProcessing}
          >
            <Crop className="w-4 h-4 mr-2" />
            <span>Apply Crop</span>
          </button>
          
          <button
            onClick={saveCroppedImage}
            className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            disabled={isProcessing}
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Save</span>
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 italic">
        Drag to move the crop region. Resize from the corners. Enable subject tracking to automatically follow faces.
      </div>
    </div>
  );
};