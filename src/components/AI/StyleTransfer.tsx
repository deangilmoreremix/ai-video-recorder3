import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Settings, Image as ImageIcon, Download } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';

interface StyleTransferProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onStyleApplied?: (styledCanvas: HTMLCanvasElement) => void;
  settings?: {
    style?: 'oil' | 'watercolor' | 'sketch' | 'cartoon' | 'vintage' | 'neon';
    intensity?: number;
    realTime?: boolean;
    preserveColors?: boolean;
  };
}

export const StyleTransfer: React.FC<StyleTransferProps> = ({
  enabled,
  videoRef,
  onStyleApplied,
  settings = {
    style: 'oil',
    intensity: 0.7,
    realTime: false,
    preserveColors: false
  }
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [styledImage, setStyledImage] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState(settings.style);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const styledCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize TensorFlow.js
  useEffect(() => {
    if (enabled) {
      tf.ready().then(() => {
        console.log('TensorFlow.js ready for style transfer');
      });
    }
  }, [enabled]);

  // Oil painting effect
  const applyOilPainting = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    const radius = Math.max(1, Math.floor(intensity * 5));
    const levels = Math.max(10, Math.floor(intensity * 50));

    for (let y = 0; y < sourceCanvas.height; y++) {
      for (let x = 0; x < sourceCanvas.width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        let intensityValues = new Array(levels).fill(0);
        let maxIntensity = 0;
        let maxIndex = 0;

        // Sample neighboring pixels
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < sourceCanvas.width && ny >= 0 && ny < sourceCanvas.height) {
              const index = (ny * sourceCanvas.width + nx) * 4;
              const pixelR = data[index];
              const pixelG = data[index + 1];
              const pixelB = data[index + 2];

              // Calculate intensity
              const intensity = (pixelR + pixelG + pixelB) / 3;
              const level = Math.floor(intensity * levels / 256);

              intensityValues[level] += 1;

              if (intensityValues[level] > maxIntensity) {
                maxIntensity = intensityValues[level];
                maxIndex = level;
                r = pixelR;
                g = pixelG;
                b = pixelB;
              }
            }
          }
        }

        const targetIndex = (y * sourceCanvas.width + x) * 4;
        data[targetIndex] = r;
        data[targetIndex + 1] = g;
        data[targetIndex + 2] = b;
        data[targetIndex + 3] = 255;
      }
    }

    targetCtx.putImageData(imageData, 0, 0);
  }, []);

  // Watercolor effect
  const applyWatercolor = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    // Draw original image
    targetCtx.drawImage(sourceCanvas, 0, 0);

    // Apply watercolor-like effects using multiple blur passes
    const blurAmount = intensity * 3;

    // Create multiple blurred versions
    for (let i = 0; i < 3; i++) {
      targetCtx.filter = `blur(${blurAmount}px)`;
      targetCtx.globalCompositeOperation = 'overlay';
      targetCtx.globalAlpha = intensity * 0.3;
      targetCtx.drawImage(sourceCanvas, 0, 0);
    }

    // Add some noise for texture
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    }

    targetCtx.putImageData(imageData, 0, 0);
    targetCtx.filter = 'none';
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.globalAlpha = 1;
  }, []);

  // Sketch effect
  const applySketch = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data);

    // Convert to grayscale and apply edge detection
    for (let y = 1; y < sourceCanvas.height - 1; y++) {
      for (let x = 1; x < sourceCanvas.width - 1; x++) {
        const idx = (y * sourceCanvas.width + x) * 4;

        // Get grayscale values
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Simple edge detection using Sobel operator
        const top = ((data[((y - 1) * sourceCanvas.width + x) * 4] +
                     data[((y - 1) * sourceCanvas.width + x) * 4 + 1] +
                     data[((y - 1) * sourceCanvas.width + x) * 4 + 2]) / 3);
        const bottom = ((data[((y + 1) * sourceCanvas.width + x) * 4] +
                        data[((y + 1) * sourceCanvas.width + x) * 4 + 1] +
                        data[((y + 1) * sourceCanvas.width + x) * 4 + 2]) / 3);
        const left = ((data[(y * sourceCanvas.width + (x - 1)) * 4] +
                      data[(y * sourceCanvas.width + (x - 1)) * 4 + 1] +
                      data[(y * sourceCanvas.width + (x - 1)) * 4 + 2]) / 3);
        const right = ((data[(y * sourceCanvas.width + (x + 1)) * 4] +
                       data[(y * sourceCanvas.width + (x + 1)) * 4 + 1] +
                       data[(y * sourceCanvas.width + (x + 1)) * 4 + 2]) / 3);

        const edgeStrength = Math.abs(top - bottom) + Math.abs(left - right);
        const edgeValue = Math.min(255, edgeStrength * intensity * 2);

        // Invert for sketch effect
        const sketchValue = 255 - Math.min(255, gray + edgeValue);

        outputData[idx] = sketchValue;     // R
        outputData[idx + 1] = sketchValue; // G
        outputData[idx + 2] = sketchValue; // B
        outputData[idx + 3] = 255;         // A
      }
    }

    const outputImageData = new ImageData(outputData, sourceCanvas.width, sourceCanvas.height);
    targetCtx.putImageData(outputImageData, 0, 0);
  }, []);

  // Cartoon effect
  const applyCartoon = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    // Draw original image
    targetCtx.drawImage(sourceCanvas, 0, 0);

    // Apply posterization effect
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const data = imageData.data;

    const levels = Math.max(4, Math.floor(intensity * 8));

    for (let i = 0; i < data.length; i += 4) {
      // Posterize each channel
      data[i] = Math.round(data[i] / 255 * levels) / levels * 255;     // R
      data[i + 1] = Math.round(data[i + 1] / 255 * levels) / levels * 255; // G
      data[i + 2] = Math.round(data[i + 2] / 255 * levels) / levels * 255; // B
    }

    targetCtx.putImageData(imageData, 0, 0);

    // Add edge enhancement
    targetCtx.filter = `contrast(${1 + intensity}) brightness(${1 + intensity * 0.2})`;
    targetCtx.drawImage(targetCanvas, 0, 0);
    targetCtx.filter = 'none';
  }, []);

  // Vintage effect
  const applyVintage = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    // Draw original image
    targetCtx.drawImage(sourceCanvas, 0, 0);

    // Apply sepia tone
    targetCtx.filter = `sepia(${intensity}) contrast(${1 + intensity * 0.3}) brightness(${1 + intensity * 0.1})`;
    targetCtx.drawImage(sourceCanvas, 0, 0);

    // Add vignette effect
    const gradient = targetCtx.createRadialGradient(
      targetCanvas.width / 2, targetCanvas.height / 2, 0,
      targetCanvas.width / 2, targetCanvas.height / 2,
      Math.max(targetCanvas.width, targetCanvas.height) / 2
    );

    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.3})`);

    targetCtx.globalCompositeOperation = 'multiply';
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetCtx.globalCompositeOperation = 'source-over';

    targetCtx.filter = 'none';
  }, []);

  // Neon effect
  const applyNeon = useCallback((
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    intensity: number
  ) => {
    const sourceCtx = sourceCanvas.getContext('2d');
    const targetCtx = targetCanvas.getContext('2d');

    if (!sourceCtx || !targetCtx) return;

    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;

    // Convert to grayscale first
    targetCtx.filter = 'grayscale(1)';
    targetCtx.drawImage(sourceCanvas, 0, 0);
    targetCtx.filter = 'none';

    // Apply edge detection
    const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data);

    for (let y = 1; y < targetCanvas.height - 1; y++) {
      for (let x = 1; x < targetCanvas.width - 1; x++) {
        const idx = (y * targetCanvas.width + x) * 4;
        const center = data[idx];

        // Simple edge detection
        const top = data[((y - 1) * targetCanvas.width + x) * 4];
        const bottom = data[((y + 1) * targetCanvas.width + x) * 4];
        const left = data[(y * targetCanvas.width + (x - 1)) * 4];
        const right = data[(y * targetCanvas.width + (x + 1)) * 4];

        const edge = Math.abs(center - top) + Math.abs(center - bottom) +
                    Math.abs(center - left) + Math.abs(center - right);

        const edgeValue = Math.min(255, edge * intensity * 3);

        outputData[idx] = edgeValue;     // R
        outputData[idx + 1] = 0;         // G
        outputData[idx + 2] = edgeValue; // B
        outputData[idx + 3] = 255;       // A
      }
    }

    const outputImageData = new ImageData(outputData, targetCanvas.width, targetCanvas.height);
    targetCtx.putImageData(outputImageData, 0, 0);

    // Add glow effect
    targetCtx.shadowColor = '#00ffff';
    targetCtx.shadowBlur = intensity * 10;
    targetCtx.drawImage(targetCanvas, 0, 0);
  }, []);

  // Apply selected style
  const applyStyle = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !styledCanvasRef.current) {
      return;
    }

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const sourceCanvas = canvasRef.current;
      const styledCanvas = styledCanvasRef.current;

      // Set source canvas size to match video
      sourceCanvas.width = video.videoWidth;
      sourceCanvas.height = video.videoHeight;

      // Draw current video frame
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) return;

      sourceCtx.drawImage(video, 0, 0);

      // Apply selected style
      switch (currentStyle) {
        case 'oil':
          applyOilPainting(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        case 'watercolor':
          applyWatercolor(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        case 'sketch':
          applySketch(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        case 'cartoon':
          applyCartoon(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        case 'vintage':
          applyVintage(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        case 'neon':
          applyNeon(sourceCanvas, styledCanvas, localSettings.intensity || 0.7);
          break;
        default:
          // Copy original if no style selected
          styledCanvas.width = sourceCanvas.width;
          styledCanvas.height = sourceCanvas.height;
          const styledCtx = styledCanvas.getContext('2d');
          if (styledCtx) {
            styledCtx.drawImage(sourceCanvas, 0, 0);
          }
      }

      // Create data URL for preview
      const dataUrl = styledCanvas.toDataURL('image/jpeg', 0.9);
      setStyledImage(dataUrl);

      // Notify parent component
      onStyleApplied?.(styledCanvas);

    } catch (error) {
      console.error('Style transfer failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [videoRef, currentStyle, localSettings.intensity, applyOilPainting, applyWatercolor, applySketch, applyCartoon, applyVintage, applyNeon, onStyleApplied]);

  // Real-time processing
  useEffect(() => {
    if (!enabled || !localSettings.realTime) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const processFrame = () => {
      applyStyle();
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, localSettings.realTime, applyStyle]);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const downloadStyled = useCallback(() => {
    if (!styledCanvasRef.current) return;

    const link = document.createElement('a');
    link.download = `styled-image-${currentStyle}-${Date.now()}.jpg`;
    link.href = styledCanvasRef.current.toDataURL('image/jpeg', 0.95);
    link.click();
  }, [currentStyle]);

  if (!enabled) return null;

  return (
    <div className="absolute bottom-4 right-4 space-y-2">
      {/* Hidden canvases for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={styledCanvasRef} className="hidden" />

      {/* Main Style Transfer Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-900">Style Transfer</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={applyStyle}
              disabled={isProcessing}
              className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Apply style to current frame"
            >
              <ImageIcon className="w-4 h-4 text-gray-500" />
            </button>
            {styledImage && (
              <button
                onClick={downloadStyled}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Download styled image"
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

        {/* Style Selection */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-2">Art Style</label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'oil', name: 'Oil', emoji: '🎨' },
              { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
              { id: 'sketch', name: 'Sketch', emoji: '✏️' },
              { id: 'cartoon', name: 'Cartoon', emoji: '🖍️' },
              { id: 'vintage', name: 'Vintage', emoji: '📻' },
              { id: 'neon', name: 'Neon', emoji: '⚡' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setCurrentStyle(style.id as any)}
                className={`p-2 text-xs rounded border transition-colors ${
                  currentStyle === style.id
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="text-center">
                  <div className="text-sm mb-1">{style.emoji}</div>
                  <div>{style.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center justify-center py-2 mb-3">
            <div className="animate-spin rounded-full h-4 w-4 border border-purple-500 border-t-transparent mr-2"></div>
            <span className="text-xs text-gray-600">Applying style...</span>
          </div>
        )}

        {/* Styled Image Preview */}
        {styledImage && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Styled Preview:</div>
            <img
              src={styledImage}
              alt={`Styled with ${currentStyle}`}
              className="w-full h-24 object-cover rounded border"
            />
          </div>
        )}

        {/* No Results State */}
        {!styledImage && !isProcessing && (
          <div className="text-center py-4">
            <Palette className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Select a style and apply</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Style Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Intensity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.intensity}
                onChange={(e) => updateSetting('intensity', parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <span className="text-xs text-gray-500">{localSettings.intensity}</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-purple-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Preserve Colors</label>
              <input
                type="checkbox"
                checked={localSettings.preserveColors}
                onChange={(e) => updateSetting('preserveColors', e.target.checked)}
                className="rounded accent-purple-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};