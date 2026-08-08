import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Loader, Settings } from 'lucide-react';

interface BodySegmentationSettings {
  mode: 'blur' | 'replace' | 'mask' | 'outline';
  blurAmount: number;
  backgroundImage: string;
  backgroundColor: string;
  foregroundColor: string;
  outlineWidth: number;
  maskOpacity: number;
  segmentationThreshold: number;
}

const DEFAULT_SETTINGS: BodySegmentationSettings = {
  mode: 'blur',
  blurAmount: 10,
  backgroundImage: '',
  backgroundColor: '#00FF00',
  foregroundColor: '#FFFFFF',
  outlineWidth: 3,
  maskOpacity: 0.7,
  segmentationThreshold: 0.5
};

interface BodySegmentationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: Partial<BodySegmentationSettings>;
  onSegmentationComplete?: (maskCanvas: HTMLCanvasElement) => void;
}

export const BodySegmentation: React.FC<BodySegmentationProps> = ({
  videoRef,
  enabled,
  settings,
  onSegmentationComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [model, setModel] = useState<bodySegmentation.BodySegmenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<BodySegmentationSettings>({
    ...DEFAULT_SETTINGS,
    ...settings
  });
  const requestRef = useRef<number>();
  // Guards the render loop: every start gets a unique token so that a chain
  // whose effect has been cleaned up can never schedule another frame
  // (two overlapping rAF chains would double the GPU work).
  const loopTokenRef = useRef<object | null>(null);
  // Reused offscreen canvases (a new canvas per frame is a fast OOM)
  const scratchRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const mode = settings?.mode;
  const backgroundImage = settings?.backgroundImage;

  // Keep the local (user editable) settings in sync with the props driven ones
  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      ...(mode ? { mode } : {}),
      ...(backgroundImage !== undefined ? { backgroundImage } : {})
    }));
  }, [mode, backgroundImage]);

  const getScratchCanvas = useCallback((key: string, width: number, height: number) => {
    let canvas = scratchRef.current.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      scratchRef.current.set(key, canvas);
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return canvas;
  }, []);

  // Paints an ImageData mask into a reusable canvas so it can be used as a
  // compositing source (drawImage does not accept ImageData).
  const maskToCanvas = useCallback((key: string, mask: ImageData) => {
    const canvas = getScratchCanvas(key, mask.width, mask.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.putImageData(mask, 0, 0);
    return canvas;
  }, [getScratchCanvas]);

  // Load the model
  useEffect(() => {
    let isMounted = true;
    let localSegmenter: bodySegmentation.BodySegmenter | null = null;

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

        localSegmenter = segmenter;

        if (isMounted) {
          setModel(segmenter);
          setIsLoading(false);
        } else {
          segmenter.dispose();
        }
        
      } catch (err) {
        console.error('Failed to load body segmentation model:', err);
        if (isMounted) {
          setError('Failed to initialize body segmentation. Please try again.');
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      
      // Cleanup
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      loopTokenRef.current = null;
      
      // Release only this model's memory. `tf.disposeVariables()` is global and
      // would corrupt any other model still in use.
      try {
        localSegmenter?.dispose();
      } catch (disposeError) {
        console.warn('Failed to dispose segmentation model:', disposeError);
      }
      setModel(null);
    };
  }, [enabled]);

  // Load background image if provided
  useEffect(() => {
    if (!localSettings.backgroundImage || localSettings.mode !== 'replace') {
      backgroundImageRef.current = null;
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) backgroundImageRef.current = img;
    };
    img.onerror = () => {
      console.error('Failed to load background image');
    };
    img.src = localSettings.backgroundImage;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      backgroundImageRef.current = null;
    };
  }, [localSettings.backgroundImage, localSettings.mode]);

  // Process segmentation
  const processSegmentation = useCallback(async (token: object) => {
    if (loopTokenRef.current !== token) return;

    if (!model || !videoRef.current || !canvasRef.current || !enabled || isLoading) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Skip if video is not ready (videoWidth is 0 until the first frame decodes)
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      requestRef.current = requestAnimationFrame(() => { void processSegmentation(token); });
      return;
    }

    try {
      // Match canvas size to video
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

      const ctx = canvas.getContext('2d', { willReadFrequently: localSettings.mode === 'outline' });
      if (!ctx) return;

      // Clear canvas
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (segmentation.length === 0) {
        // No people detected, just show the video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Process based on selected mode
        switch (localSettings.mode) {
          case 'blur': {
            // Create foreground mask
            const foregroundMask = await bodySegmentation.toBinaryMask(
              segmentation,
              { r: 0, g: 0, b: 0, a: 0 },
              { r: 0, g: 0, b: 0, a: 255 }
            );

            const maskCanvas = maskToCanvas('mask', foregroundMask);

            // Draw blurred background
            ctx.save();
            ctx.filter = `blur(${localSettings.blurAmount}px)`;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Draw original foreground on top of the blurred background
            if (maskCanvas) {
              const tempCanvas = getScratchCanvas('foreground', canvas.width, canvas.height);
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.globalCompositeOperation = 'source-over';
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(maskCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.globalCompositeOperation = 'source-over';

                ctx.drawImage(tempCanvas, 0, 0);
              }
            }

            ctx.restore();
            break;
          }
            
          case 'replace': {
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
              ctx.fillStyle = localSettings.backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Create foreground mask
            const fgMask = await bodySegmentation.toBinaryMask(
              segmentation,
              { r: 0, g: 0, b: 0, a: 0 },
              { r: 0, g: 0, b: 0, a: 255 }
            );
            const fgMaskCanvas = maskToCanvas('mask', fgMask);

            // Draw foreground (person)
            const foregroundCanvas = getScratchCanvas('foreground', canvas.width, canvas.height);
            const foregroundCtx = foregroundCanvas.getContext('2d');
            
            if (foregroundCtx && fgMaskCanvas) {
              foregroundCtx.globalCompositeOperation = 'source-over';
              foregroundCtx.clearRect(0, 0, foregroundCanvas.width, foregroundCanvas.height);
              foregroundCtx.drawImage(video, 0, 0, foregroundCanvas.width, foregroundCanvas.height);
              foregroundCtx.globalCompositeOperation = 'destination-in';
              foregroundCtx.drawImage(fgMaskCanvas, 0, 0, foregroundCanvas.width, foregroundCanvas.height);
              foregroundCtx.globalCompositeOperation = 'source-over';

              ctx.drawImage(foregroundCanvas, 0, 0);
            }
            break;
          }
            
          case 'outline': {
            // Draw video first
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Draw outline around person
            const coloredSegmentation = await bodySegmentation.toColoredMask(
              segmentation,
              bodySegmentation.bodyPixMaskValueToRainbowColor,
              { r: 255, g: 255, b: 255, a: 255 }
            );
            
            // Apply outline effect
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = localSettings.outlineWidth;
            ctx.strokeStyle = localSettings.foregroundColor;
            ctx.fillStyle = localSettings.foregroundColor;
            
            // Get the segmentation data and trace its outline
            // This is simplified - in a real app you'd need edge detection
            const compositeCanvas = getScratchCanvas('composite', coloredSegmentation.width, coloredSegmentation.height);
            const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
            if (compositeCtx) {
              compositeCtx.putImageData(coloredSegmentation, 0, 0);
              
              const maskWidth = compositeCanvas.width;
              const maskHeight = compositeCanvas.height;
              const imageData = compositeCtx.getImageData(0, 0, maskWidth, maskHeight);
              const data = imageData.data;
              const scaleX = canvas.width / maskWidth;
              const scaleY = canvas.height / maskHeight;
              
              // Simplified edge detection
              for (let y = 1; y < maskHeight - 1; y += 2) {
                for (let x = 1; x < maskWidth - 1; x += 2) {
                  const idx = (y * maskWidth + x) * 4;
                  const idxRight = (y * maskWidth + (x + 1)) * 4;
                  const idxDown = ((y + 1) * maskWidth + x) * 4;
                  
                  // If current pixel is person and adjacent pixel is not, draw it
                  if (data[idx + 3] > 128) {
                    if (data[idxRight + 3] < 128 || data[idxDown + 3] < 128) {
                      ctx.fillRect((x - 1) * scaleX, (y - 1) * scaleY, 3, 3);
                    }
                  }
                }
              }
            }
            break;
          }
            
          case 'mask': {
            // Draw video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Create colored mask
            const mask = await bodySegmentation.toColoredMask(
              segmentation,
              bodySegmentation.bodyPixMaskValueToRainbowColor,
              { r: 255, g: 255, b: 255, a: 0 }
            );
            const coloredMaskCanvas = maskToCanvas('mask', mask);
            
            // Overlay mask with opacity
            if (coloredMaskCanvas) {
              ctx.globalAlpha = localSettings.maskOpacity;
              ctx.drawImage(coloredMaskCanvas, 0, 0, canvas.width, canvas.height);
              ctx.globalAlpha = 1;
            }
            break;
          }
        }
      }

      // Notify completion if needed
      onSegmentationComplete?.(canvas);
      
    } catch (err) {
      console.error('Segmentation error:', err);
    }

    // Schedule next frame (unless the loop was stopped in the meantime)
    if (loopTokenRef.current === token) {
      requestRef.current = requestAnimationFrame(() => { void processSegmentation(token); });
    }
  }, [model, enabled, isLoading, localSettings, videoRef, onSegmentationComplete, getScratchCanvas, maskToCanvas]);

  // Start/stop processing when enabled changes
  useEffect(() => {
    if (enabled && !isLoading && model) {
      const token = {};
      loopTokenRef.current = token;
      void processSegmentation(token);
    }

    return () => {
      loopTokenRef.current = null;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [enabled, model, isLoading, processSegmentation]);

  // Update settings
  const updateSetting = <K extends keyof BodySegmentationSettings>(
    key: K,
    value: BodySegmentationSettings[K]
  ) => {
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
                onChange={(e) => updateSetting('mode', e.target.value as BodySegmentationSettings['mode'])}
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