import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, Settings, Image as ImageIcon, Download } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';

interface SuperResolutionProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onResolutionEnhanced?: (enhancedCanvas: HTMLCanvasElement) => void;
  settings?: {
    scaleFactor?: number;
    quality?: 'low' | 'medium' | 'high';
    realTime?: boolean;
    algorithm?: 'bicubic' | 'lanczos' | 'nearest';
  };
}

export const SuperResolution: React.FC<SuperResolutionProps> = ({
  enabled,
  videoRef,
  onResolutionEnhanced,
  settings = {
    scaleFactor: 2,
    quality: 'medium',
    realTime: false,
    algorithm: 'bicubic'
  }
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [originalResolution, setOriginalResolution] = useState<{width: number, height: number} | null>(null);
  const [enhancedResolution, setEnhancedResolution] = useState<{width: number, height: number} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize TensorFlow.js
  useEffect(() => {
    if (enabled) {
      tf.ready().then(() => {
        console.log('TensorFlow.js ready for super resolution');
      });
    }
  }, [enabled]);

  // Bicubic interpolation algorithm
  const bicubicInterpolation = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    scaleFactor: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const sourceData = sourceImageData.data;

    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor);
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor);
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const targetImageData = targetCtx.createImageData(targetWidth, targetHeight);
    const targetData = targetImageData.data;

    // Bicubic interpolation implementation
    const getPixel = (x: number, y: number, channel: number) => {
      const clampedX = Math.max(0, Math.min(sourceCanvas.width - 1, x));
      const clampedY = Math.max(0, Math.min(sourceCanvas.height - 1, y));

      const index = (Math.floor(clampedY) * sourceCanvas.width + Math.floor(clampedX)) * 4 + channel;
      return sourceData[index] || 0;
    };

    const cubicInterpolation = (p0: number, p1: number, p2: number, p3: number, t: number) => {
      return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
    };

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = x / scaleFactor;
        const sourceY = y / scaleFactor;

        const xInt = Math.floor(sourceX);
        const yInt = Math.floor(sourceY);

        const xFrac = sourceX - xInt;
        const yFrac = sourceY - yInt;

        const targetIndex = (y * targetWidth + x) * 4;

        for (let channel = 0; channel < 3; channel++) {
          // Get 4x4 neighborhood for bicubic interpolation
          const p00 = getPixel(xInt - 1, yInt - 1, channel);
          const p01 = getPixel(xInt, yInt - 1, channel);
          const p02 = getPixel(xInt + 1, yInt - 1, channel);
          const p03 = getPixel(xInt + 2, yInt - 1, channel);

          const p10 = getPixel(xInt - 1, yInt, channel);
          const p11 = getPixel(xInt, yInt, channel);
          const p12 = getPixel(xInt + 1, yInt, channel);
          const p13 = getPixel(xInt + 2, yInt, channel);

          const p20 = getPixel(xInt - 1, yInt + 1, channel);
          const p21 = getPixel(xInt, yInt + 1, channel);
          const p22 = getPixel(xInt + 1, yInt + 1, channel);
          const p23 = getPixel(xInt + 2, yInt + 1, channel);

          const p30 = getPixel(xInt - 1, yInt + 2, channel);
          const p31 = getPixel(xInt, yInt + 2, channel);
          const p32 = getPixel(xInt + 1, yInt + 2, channel);
          const p33 = getPixel(xInt + 2, yInt + 2, channel);

          // Interpolate along x for each row
          const row0 = cubicInterpolation(p00, p01, p02, p03, xFrac);
          const row1 = cubicInterpolation(p10, p11, p12, p13, xFrac);
          const row2 = cubicInterpolation(p20, p21, p22, p23, xFrac);
          const row3 = cubicInterpolation(p30, p31, p32, p33, xFrac);

          // Interpolate along y
          const value = cubicInterpolation(row0, row1, row2, row3, yFrac);

          targetData[targetIndex + channel] = Math.max(0, Math.min(255, Math.round(value)));
        }

        // Set alpha channel
        targetData[targetIndex + 3] = 255;
      }
    }

    targetCtx.putImageData(targetImageData, 0, 0);
  }, []);

  // Lanczos resampling algorithm
  const lanczosResample = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    scaleFactor: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const sourceData = sourceImageData.data;

    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor);
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor);
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const targetImageData = targetCtx.createImageData(targetWidth, targetHeight);
    const targetData = targetImageData.data;

    // Lanczos kernel function
    const lanczosKernel = (x: number, a: number = 3) => {
      if (x === 0) return 1;
      if (Math.abs(x) >= a) return 0;
      return a * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / a) / (Math.PI * Math.PI * x * x);
    };

    const a = 3; // Lanczos parameter

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const sourceX = x / scaleFactor;
        const sourceY = y / scaleFactor;

        const targetIndex = (y * targetWidth + x) * 4;
        const channels = [0, 0, 0]; // RGB channels

        // Sample neighborhood for Lanczos interpolation
        for (let channel = 0; channel < 3; channel++) {
          let weightSum = 0;
          let valueSum = 0;

          for (let dy = -a + 1; dy < a; dy++) {
            for (let dx = -a + 1; dx < a; dx++) {
              const sampleX = Math.floor(sourceX + dx);
              const sampleY = Math.floor(sourceY + dy);

              if (sampleX >= 0 && sampleX < sourceCanvas.width &&
                  sampleY >= 0 && sampleY < sourceCanvas.height) {

                const weightX = lanczosKernel(sourceX - sampleX, a);
                const weightY = lanczosKernel(sourceY - sampleY, a);
                const weight = weightX * weightY;

                const sourceIndex = (sampleY * sourceCanvas.width + sampleX) * 4 + channel;
                const value = sourceData[sourceIndex] || 0;

                weightSum += weight;
                valueSum += value * weight;
              }
            }
          }

          channels[channel] = weightSum > 0 ? valueSum / weightSum : 0;
        }

        // Set RGB values
        for (let channel = 0; channel < 3; channel++) {
          targetData[targetIndex + channel] = Math.max(0, Math.min(255, Math.round(channels[channel])));
        }

        // Set alpha channel
        targetData[targetIndex + 3] = 255;
      }
    }

    targetCtx.putImageData(targetImageData, 0, 0);
  }, []);

  // Nearest neighbor algorithm (fastest)
  const nearestNeighbor = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    scaleFactor: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    const targetWidth = Math.floor(sourceCanvas.width * scaleFactor);
    const targetHeight = Math.floor(sourceCanvas.height * scaleFactor);

    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    // Simple nearest neighbor scaling
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  }, []);

  // Enhance resolution of current video frame
  const enhanceResolution = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !enhancedCanvasRef.current) {
      return;
    }

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const sourceCanvas = canvasRef.current;
      const enhancedCanvas = enhancedCanvasRef.current;

      // Set source canvas size to match video
      sourceCanvas.width = video.videoWidth;
      sourceCanvas.height = video.videoHeight;

      // Draw current video frame
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) return;

      sourceCtx.drawImage(video, 0, 0);

      // Store original resolution
      setOriginalResolution({
        width: sourceCanvas.width,
        height: sourceCanvas.height
      });

      // Apply selected algorithm
      switch (localSettings.algorithm) {
        case 'bicubic':
          bicubicInterpolation(sourceCanvas, enhancedCanvas, localSettings.scaleFactor || 2);
          break;
        case 'lanczos':
          lanczosResample(sourceCanvas, enhancedCanvas, localSettings.scaleFactor || 2);
          break;
        case 'nearest':
        default:
          nearestNeighbor(sourceCanvas, enhancedCanvas, localSettings.scaleFactor || 2);
          break;
      }

      // Store enhanced resolution
      setEnhancedResolution({
        width: enhancedCanvas.width,
        height: enhancedCanvas.height
      });

      // Create data URL for preview
      const dataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.9);
      setEnhancedImage(dataUrl);

      // Notify parent component
      onResolutionEnhanced?.(enhancedCanvas);

    } catch (error) {
      console.error('Super resolution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [videoRef, localSettings, bicubicInterpolation, lanczosResample, nearestNeighbor, onResolutionEnhanced]);

  // Real-time processing
  useEffect(() => {
    if (!enabled || !localSettings.realTime) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const processFrame = () => {
      enhanceResolution();
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, localSettings.realTime, enhanceResolution]);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const downloadEnhanced = useCallback(() => {
    if (!enhancedCanvasRef.current) return;

    const link = document.createElement('a');
    link.download = `enhanced-resolution-${Date.now()}.jpg`;
    link.href = enhancedCanvasRef.current.toDataURL('image/jpeg', 0.95);
    link.click();
  }, []);

  if (!enabled) return null;

  return (
    <div className="absolute top-4 right-4 space-y-2">
      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={enhancedCanvasRef} className="hidden" />

      {/* Main Enhancement Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ZoomIn className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium text-gray-900">Super Resolution</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={enhanceResolution}
              disabled={isProcessing}
              className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Enhance current frame"
            >
              <ImageIcon className="w-4 h-4 text-gray-500" />
            </button>
            {enhancedImage && (
              <button
                onClick={downloadEnhanced}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Download enhanced image"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center justify-center py-2 mb-3">
            <div className="animate-spin rounded-full h-4 w-4 border border-emerald-500 border-t-transparent mr-2"></div>
            <span className="text-xs text-gray-600">Processing...</span>
          </div>
        )}

        {/* Resolution Info */}
        {originalResolution && enhancedResolution && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2 mb-3">
            <div className="text-xs text-emerald-700 mb-1">Resolution Enhancement:</div>
            <div className="text-xs text-gray-600">
              {originalResolution.width}×{originalResolution.height} →
              {enhancedResolution.width}×{enhancedResolution.height}
            </div>
            <div className="text-xs text-emerald-600 font-medium">
              {((enhancedResolution.width * enhancedResolution.height) /
                (originalResolution.width * originalResolution.height)).toFixed(1)}x pixels
            </div>
          </div>
        )}

        {/* Enhanced Image Preview */}
        {enhancedImage && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Enhanced Preview:</div>
            <img
              src={enhancedImage}
              alt="Enhanced resolution"
              className="w-full h-24 object-cover rounded border"
            />
          </div>
        )}

        {/* No Results State */}
        {!enhancedImage && !isProcessing && (
          <div className="text-center py-4">
            <ZoomIn className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click to enhance resolution</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Enhancement Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Scale Factor</label>
              <select
                value={localSettings.scaleFactor}
                onChange={(e) => updateSetting('scaleFactor', parseFloat(e.target.value))}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
              >
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Algorithm</label>
              <select
                value={localSettings.algorithm}
                onChange={(e) => updateSetting('algorithm', e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
              >
                <option value="bicubic">Bicubic (Best Quality)</option>
                <option value="lanczos">Lanczos (Balanced)</option>
                <option value="nearest">Nearest Neighbor (Fast)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Quality</label>
              <select
                value={localSettings.quality}
                onChange={(e) => updateSetting('quality', e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
              >
                <option value="low">Low (Fast)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Best)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};