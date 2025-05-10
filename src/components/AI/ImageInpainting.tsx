import React, { useState, useRef, useEffect } from 'react';
import { 
  Eraser, Wand2, RefreshCw, Settings, Check, X,
  RotateCcw, Trash2, Download, Save
} from 'lucide-react';

interface ImageInpaintingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    brushSize: number;
    featherAmount: number;
    processingQuality: 'low' | 'medium' | 'high';
    autoRefine: boolean;
  };
  onProcessingComplete?: (result: Blob) => void;
}

export const ImageInpainting: React.FC<ImageInpaintingProps> = ({
  videoRef,
  enabled,
  settings = {
    brushSize: 20,
    featherAmount: 5,
    processingQuality: 'medium',
    autoRefine: true
  },
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(settings.brushSize);
  const [featherAmount, setFeatherAmount] = useState(settings.featherAmount);
  const [processingQuality, setProcessingQuality] = useState(settings.processingQuality);
  const [autoRefine, setAutoRefine] = useState(settings.autoRefine);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize canvas and capture video frame
  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current || !maskCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    // Setup canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    maskCanvas.width = video.videoWidth || 640;
    maskCanvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!ctx || !maskCtx) return;
    
    // Setup mask canvas
    maskCtx.fillStyle = 'rgba(0,0,0,0)';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Draw current video frame to canvas
    if (video.readyState >= 2) { // Have current data
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // Wait for video to be ready
      const handleCanPlay = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.removeEventListener('canplay', handleCanPlay);
      };
      video.addEventListener('canplay', handleCanPlay);
    }
    
    // Pause video when inpainting is active
    if (!video.paused && enabled) {
      video.pause();
      setIsPaused(true);
    }
    
    return () => {
      if (isPaused && video) {
        video.play();
        setIsPaused(false);
      }
    };
  }, [enabled, videoRef]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return;
    
    const canvas = maskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    lastPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    
    setIsDrawing(true);
    drawMask(e);
  };

  const drawMask = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    // Draw line from last position to current position
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Update last position
    lastPosRef.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear mask
  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Process inpainting
  const processInpainting = async () => {
    if (!canvasRef.current || !maskCanvasRef.current) return;
    
    try {
      setIsProcessing(true);
      
      // In a real implementation, you'd:
      // 1. Create a tensor from the source image
      // 2. Create a tensor from the mask
      // 3. Pass these to the inpainting model
      // 4. Get the resulting tensor and convert to image
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For this demo, we'll just simulate the result by blurring the masked region
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!ctx || !maskCtx) throw new Error("Could not get canvas context");
      
      // Get the main image data and mask data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      
      // Simulate inpainting by applying a blur effect to masked areas
      // This is just a visual placeholder - real inpainting would use the model
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const i = (y * imageData.width + x) * 4;
          
          // Check if this pixel is in the mask (has red component)
          if (maskData.data[i] > 0) {
            // Simple blur by averaging surrounding pixels
            let r = 0, g = 0, b = 0, count = 0;
            
            // Sample surrounding pixels
            for (let dy = -5; dy <= 5; dy++) {
              for (let dx = -5; dx <= 5; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < imageData.width && ny >= 0 && ny < imageData.height) {
                  const ni = (ny * imageData.width + nx) * 4;
                  
                  // Only use pixels not in the mask
                  if (maskData.data[ni] === 0) {
                    r += imageData.data[ni];
                    g += imageData.data[ni + 1];
                    b += imageData.data[ni + 2];
                    count++;
                  }
                }
              }
            }
            
            // If we found surrounding pixels, average them
            if (count > 0) {
              imageData.data[i] = r / count;
              imageData.data[i + 1] = g / count;
              imageData.data[i + 2] = b / count;
            }
          }
        }
      }
      
      // Apply the modified image data back to the canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Clear the mask
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      // Convert canvas to blob and notify completion
      canvas.toBlob(blob => {
        if (blob && onProcessingComplete) {
          onProcessingComplete(blob);
        }
      });
      
    } catch (err) {
      console.error("Inpainting error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save result
  const saveResult = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    canvas.toBlob(blob => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inpainted-image.jpg';
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
          className="absolute inset-0 w-full h-full"
        />
        <canvas
          ref={maskCanvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={drawMask}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Processing inpainting...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Control panel */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Inpainting Controls</h3>
          <button 
            onClick={() => setShowControls(!showControls)} 
            className="text-gray-500 p-1 hover:bg-gray-200 rounded-full"
          >
            {showControls ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>
        </div>
        
        {showControls && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Brush Size</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="flex-grow mr-2 accent-[#E44E51]"
                  disabled={isProcessing}
                />
                <span className="text-sm w-8 text-right">{brushSize}px</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Feather Amount</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={featherAmount}
                  onChange={(e) => setFeatherAmount(parseInt(e.target.value))}
                  className="flex-grow mr-2 accent-[#E44E51]"
                  disabled={isProcessing}
                />
                <span className="text-sm w-8 text-right">{featherAmount}px</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Processing Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(quality => (
                  <button
                    key={quality}
                    onClick={() => setProcessingQuality(quality)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      processingQuality === quality
                        ? 'bg-[#E44E51] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={isProcessing}
                  >
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Auto Refine Result</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefine}
                  onChange={(e) => setAutoRefine(e.target.checked)}
                  className="sr-only peer"
                  disabled={isProcessing}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]"
                />
              </label>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={clearMask}
            className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isProcessing}
          >
            <Eraser className="w-4 h-4 mr-2" />
            <span>Clear</span>
          </button>
          
          <button
            onClick={processInpainting}
            className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors"
            disabled={isProcessing}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            <span>Process</span>
          </button>
          
          <button
            onClick={saveResult}
            className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            disabled={isProcessing}
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Save</span>
          </button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500 italic">
        Paint over the areas you want to remove or replace. The AI will intelligently fill in these areas.
      </div>
    </div>
  );
};