import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Loader, Settings, Camera } from 'lucide-react';

interface BodySegmentationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    mode: 'blur' | 'replace' | 'mask' | 'outline';
    blurAmount?: number;
    backgroundImage?: string;
    backgroundColor?: string;
    foregroundColor?: string;
    outlineWidth?: number;
    maskOpacity?: number;
    segmentationThreshold?: number;
  };
  onSegmentationComplete?: (maskCanvas: HTMLCanvasElement) => void;
}

export const BodySegmentation: React.FC<BodySegmentationProps> = ({
  videoRef,
  enabled,
  settings = {
    mode: 'blur',
    blurAmount: 10,
    backgroundImage: '',
    backgroundColor: '#00FF00',
    foregroundColor: '#FFFFFF',
    outlineWidth: 3,
    maskOpacity: 0.7,
    segmentationThreshold: 0.5
  },
  onSegmentationComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [model, setModel] = useState<bodySegmentation.BodySegmenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  // Load the model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js is ready
        await tf.ready();
        
        // Load the body segmentation model
        const segmenter = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          {
            runtime: 'tfjs',
            modelType: 'general'
          }
        );

        if (isMounted) {
          setModel(segmenter);
          setIsLoading(false);
        }
        
      } catch (err) {
        console.error('Failed to load body segmentation model:', err);
        if (isMounted) {
          setError('Failed to initialize body segmentation. Please try again.');
          setIsLoading(false);
        }
      }
    };

    // Load background image if provided
    if (settings.backgroundImage && settings.mode === 'replace') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
      };
      img.onerror = () => {
        console.error('Failed to load background image');
      };
      img.src = settings.backgroundImage;
    }

    loadModel();

    return () => {
      isMounted = false;
      
      // Cleanup
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      
      // Cleanup TensorFlow memory
      tf.disposeVariables();
    };
  }, [enabled, settings.backgroundImage, settings.mode]);

  // Process segmentation
  const processSegmentation = async (time?: number) => {
    if (!model || !videoRef.current || !canvasRef.current || !enabled || isLoading) {
      return;
    }

    // Skip if video is not ready
    if (videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(processSegmentation);
      return;
    }

    try {
      // Match canvas size to video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Perform segmentation
      const segmentation = await model.segmentPeople(video, {
        multiSegmentation: false,
        segmentBodyParts: false,
        segmentationThreshold: localSettings.segmentationThreshold
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (segmentation.length === 0) {
        // No people detected, just show the video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Process based on selected mode
        switch (localSettings.mode) {
          case 'blur':
            // Draw video first
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Create foreground mask
            const foregroundMask = await bodySegmentation.toBinaryMask(
              segmentation,
              { r: 0, g: 0, b: 0, a: 0 },
              { r: 0, g: 0, b: 0, a: 255 }
            );
            
            // Create background mask (inverted foreground mask)
            const backgroundMask = await bodySegmentation.toBinaryMask(
              segmentation,
              { r: 0, g: 0, b: 0, a: 255 },
              { r: 0, g: 0, b: 0, a: 0 }
            );
            
            // Draw blurred background
            ctx.save();
            ctx.filter = `blur(${localSettings.blurAmount}px)`;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
            
            // Draw original foreground
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.drawImage(video, 0, 0);
              tempCtx.globalCompositeOperation = 'destination-in';
              tempCtx.putImageData(foregroundMask, 0, 0);

              ctx.drawImage(tempCanvas, 0, 0);
            }
            
            ctx.restore();
            break;
            
          case 'replace':
            // Replace background with image or color
            if (backgroundImageRef.current) {
              // Draw background image
              ctx.drawImage(
                backgroundImageRef.current, 
                0, 0, 
                canvas.width, canvas.height
              );
            } else {
              // Fill with background color
              ctx.fillStyle = localSettings.backgroundColor || '#00FF00';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw foreground (person)
            const foregroundCanvas = document.createElement('canvas');
            foregroundCanvas.width = canvas.width;
            foregroundCanvas.height = canvas.height;
            const foregroundCtx = foregroundCanvas.getContext('2d');
            
            if (foregroundCtx) {
              foregroundCtx.drawImage(video, 0, 0);
              foregroundCtx.globalCompositeOperation = 'destination-in';

              // Create foreground mask
              const fgMask = await bodySegmentation.toBinaryMask(
                segmentation,
                { r: 0, g: 0, b: 0, a: 0 },
                { r: 0, g: 0, b: 0, a: 255 }
              );

              foregroundCtx.putImageData(fgMask, 0, 0);
              ctx.drawImage(foregroundCanvas, 0, 0);
            }
            break;
            
          case 'outline':
            // Draw video first
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Draw outline around person
            const coloredSegmentation = await bodySegmentation.toColoredMask(
              segmentation,
              'rainbow',
              { r: 255, g: 255, b: 255, a: 255 }
            );
            
            // Apply outline effect
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = localSettings.outlineWidth || 3;
            ctx.strokeStyle = localSettings.foregroundColor || '#FFFFFF';
            
            // Get the segmentation data and trace its outline
            // This is simplified - in a real app you'd need edge detection
            const compositeCtx = document.createElement('canvas').getContext('2d');
            if (compositeCtx) {
              const compositeCanvas = compositeCtx.canvas;
              compositeCanvas.width = canvas.width;
              compositeCanvas.height = canvas.height;

              compositeCtx.putImageData(coloredSegmentation, 0, 0);
              
              const imageData = compositeCtx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              ctx.beginPath();
              
              // Simplified edge detection
              for (let y = 1; y < canvas.height - 1; y += 2) {
                for (let x = 1; x < canvas.width - 1; x += 2) {
                  const idx = (y * canvas.width + x) * 4;
                  const idxRight = (y * canvas.width + (x + 1)) * 4;
                  const idxDown = ((y + 1) * canvas.width + x) * 4;
                  
                  // If current pixel is person and adjacent pixel is not, draw it
                  if (data[idx + 3] > 128) {
                    if (data[idxRight + 3] < 128 || data[idxDown + 3] < 128) {
                      ctx.fillRect(x - 1, y - 1, 3, 3);
                    }
                  }
                }
              }
              
              ctx.stroke();
            }
            break;
            
          case 'mask':
            // Draw video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Create colored mask
            const mask = await bodySegmentation.toColoredMask(
              segmentation,
              (maskValue: number) => {
                // Simple rainbow color mapping
                const hue = (maskValue * 360) % 360;
                return { r: Math.floor(Math.sin(hue * Math.PI / 180) * 127 + 128),
                         g: Math.floor(Math.sin((hue + 120) * Math.PI / 180) * 127 + 128),
                         b: Math.floor(Math.sin((hue + 240) * Math.PI / 180) * 127 + 128),
                         a: 255 };
              },
              { r: 255, g: 255, b: 255, a: 0 }
            );
            
            // Overlay mask with opacity
            ctx.globalAlpha = localSettings.maskOpacity || 0.7;
            ctx.putImageData(mask, 0, 0);
            ctx.globalAlpha = 1;
            break;
        }
      }

      // Notify completion if needed
      onSegmentationComplete?.(canvas);
      
    } catch (err) {
      console.error('Segmentation error:', err);
    }

    // Schedule next frame
    requestRef.current = requestAnimationFrame(processSegmentation);
  };

  // Start/stop processing when enabled changes
  useEffect(() => {
    if (enabled && !isLoading && model) {
      processSegmentation();
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [enabled, model, isLoading, localSettings]);

  // Update settings
  const updateSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      
      {/* Settings Button */}
      {!isLoading && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white z-10"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-white p-4 rounded-lg shadow-lg z-10 w-64">
          <h4 className="text-sm font-medium mb-3">Body Segmentation</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Mode</label>
              <select
                value={localSettings.mode}
                onChange={(e) => updateSetting('mode', e.target.value)}
                className="w-full text-sm rounded border-gray-300"
              >
                <option value="blur">Background Blur</option>
                <option value="replace">Background Replace</option>
                <option value="mask">Colored Mask</option>
                <option value="outline">Body Outline</option>
              </select>
            </div>
            
            {localSettings.mode === 'blur' && (
              <div>
                <label className="block text-xs mb-1">Blur Amount</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={localSettings.blurAmount}
                  onChange={(e) => updateSetting('blurAmount', parseInt(e.target.value))}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            )}
            
            {localSettings.mode === 'replace' && !localSettings.backgroundImage && (
              <div>
                <label className="block text-xs mb-1">Background Color</label>
                <input
                  type="color"
                  value={localSettings.backgroundColor}
                  onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                  className="w-full h-8"
                />
              </div>
            )}
            
            {localSettings.mode === 'outline' && (
              <>
                <div>
                  <label className="block text-xs mb-1">Outline Color</label>
                  <input
                    type="color"
                    value={localSettings.foregroundColor}
                    onChange={(e) => updateSetting('foregroundColor', e.target.value)}
                    className="w-full h-8"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Outline Width</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={localSettings.outlineWidth}
                    onChange={(e) => updateSetting('outlineWidth', parseInt(e.target.value))}
                    className="w-full accent-[#E44E51]"
                  />
                </div>
              </>
            )}
            
            {localSettings.mode === 'mask' && (
              <div>
                <label className="block text-xs mb-1">Mask Opacity</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={localSettings.maskOpacity}
                  onChange={(e) => updateSetting('maskOpacity', parseFloat(e.target.value))}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs mb-1">Segmentation Threshold</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={localSettings.segmentationThreshold}
                onChange={(e) => updateSetting('segmentationThreshold', parseFloat(e.target.value))}
                className="w-full accent-[#E44E51]"
              />
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center space-x-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading segmentation model...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-4 rounded-lg text-red-500 max-w-md">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};