import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Focus, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

interface AutoFramingProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFramingAdjusted?: (framing: FramingData) => void;
  settings?: {
    sensitivity?: number;
    smoothing?: number;
    zoomLimit?: number;
    panLimit?: number;
    realTime?: boolean;
    showGuides?: boolean;
  };
}

interface FramingData {
  zoom: number;
  panX: number;
  panY: number;
  confidence: number;
  faceCount: number;
  targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const AutoFraming: React.FC<AutoFramingProps> = ({
  enabled,
  videoRef,
  onFramingAdjusted,
  settings = {
    sensitivity: 0.7,
    smoothing: 0.3,
    zoomLimit: 2,
    panLimit: 0.5,
    realTime: true,
    showGuides: true
  }
}) => {
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFraming, setCurrentFraming] = useState<FramingData>({
    zoom: 1,
    panX: 0,
    panY: 0,
    confidence: 0,
    faceCount: 0,
    targetRect: { x: 0, y: 0, width: 0, height: 0 }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isActive, setIsActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFramingRef = useRef<FramingData>(currentFraming);

  // Load BlazeFace model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js is ready
        await tf.ready();

        // Load BlazeFace model
        const loadedModel = await blazeface.load({
          maxFaces: 5,
          inputWidth: 224,
          inputHeight: 224,
          iouThreshold: 0.3,
          scoreThreshold: 0.5
        });

        console.log('BlazeFace model loaded for auto framing');

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load auto framing model:', err);
        if (isMounted) {
          setError('Failed to load auto framing model');
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up TensorFlow memory
      tf.disposeVariables();
    };
  }, [enabled]);

  // Calculate optimal framing based on face positions
  const calculateOptimalFraming = useCallback((
    faces: blazeface.NormalizedFace[],
    videoWidth: number,
    videoHeight: number
  ): FramingData => {
    if (faces.length === 0) {
      return {
        zoom: 1,
        panX: 0,
        panY: 0,
        confidence: 0,
        faceCount: 0,
        targetRect: { x: 0, y: 0, width: videoWidth, height: videoHeight }
      };
    }

    // Calculate bounding box that contains all faces
    let minX = videoWidth;
    let minY = videoHeight;
    let maxX = 0;
    let maxY = 0;

    faces.forEach(face => {
      const start = face.topLeft as [number, number];
      const end = face.bottomRight as [number, number];

      minX = Math.min(minX, start[0]);
      minY = Math.min(minY, start[1]);
      maxX = Math.max(maxX, end[0]);
      maxY = Math.max(maxY, end[1]);
    });

    // Add padding around faces
    const padding = 0.2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;

    minX = Math.max(0, minX - faceWidth * padding);
    minY = Math.max(0, minY - faceHeight * padding);
    maxX = Math.min(videoWidth, maxX + faceWidth * padding);
    maxY = Math.min(videoHeight, maxY + faceHeight * padding);

    const targetWidth = maxX - minX;
    const targetHeight = maxY - minY;

    // Calculate zoom factor to fit faces in frame
    const zoomX = videoWidth / targetWidth;
    const zoomY = videoHeight / targetHeight;
    const zoom = Math.min(zoomX, zoomY, localSettings.zoomLimit || 2);

    // Calculate pan to center faces
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const panX = ((videoWidth / 2) - centerX) / videoWidth * zoom * (localSettings.panLimit || 0.5);
    const panY = ((videoHeight / 2) - centerY) / videoHeight * zoom * (localSettings.panLimit || 0.5);

    // Calculate average confidence
    const avgConfidence = faces.reduce((sum, face) => {
      const prob = Array.isArray(face.probability) ? face.probability[0] : face.probability;
      return sum + (typeof prob === 'number' ? prob : 0);
    }, 0) / faces.length;

    return {
      zoom,
      panX,
      panY,
      confidence: avgConfidence,
      faceCount: faces.length,
      targetRect: {
        x: minX,
        y: minY,
        width: targetWidth,
        height: targetHeight
      }
    };
  }, [localSettings.zoomLimit, localSettings.panLimit]);

  // Apply smooth transitions to framing
  const applySmoothFraming = useCallback((targetFraming: FramingData): FramingData => {
    const current = lastFramingRef.current;
    const smoothing = localSettings.smoothing || 0.3;

    const smoothedFraming: FramingData = {
      zoom: current.zoom + (targetFraming.zoom - current.zoom) * smoothing,
      panX: current.panX + (targetFraming.panX - current.panX) * smoothing,
      panY: current.panY + (targetFraming.panY - current.panY) * smoothing,
      confidence: targetFraming.confidence,
      faceCount: targetFraming.faceCount,
      targetRect: targetFraming.targetRect
    };

    lastFramingRef.current = smoothedFraming;
    return smoothedFraming;
  }, [localSettings.smoothing]);

  // Analyze faces and calculate framing
  const analyzeFraming = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Detect faces
      const predictions = await model.estimateFaces(canvas, false);

      // Filter faces by confidence
      const confidentFaces = predictions.filter(face => {
        const prob = Array.isArray(face.probability) ? face.probability[0] : face.probability;
        return (typeof prob === 'number' ? prob : 0) >= (localSettings.sensitivity || 0.5);
      });

      // Calculate optimal framing
      const targetFraming = calculateOptimalFraming(
        confidentFaces,
        video.videoWidth,
        video.videoHeight
      );

      // Apply smoothing
      const smoothedFraming = applySmoothFraming(targetFraming);

      setCurrentFraming(smoothedFraming);
      onFramingAdjusted?.(smoothedFraming);

      // Draw framing guides if enabled
      if (localSettings.showGuides && ctx) {
        drawFramingGuides(ctx, smoothedFraming, video.videoWidth, video.videoHeight);
      }

    } catch (err) {
      console.error('Auto framing analysis failed:', err);
    }
  }, [model, videoRef, localSettings, calculateOptimalFraming, applySmoothFraming, onFramingAdjusted]);

  // Draw framing guides on canvas
  const drawFramingGuides = useCallback((
    ctx: CanvasRenderingContext2D,
    framing: FramingData,
    videoWidth: number,
    videoHeight: number
  ) => {
    // Save context
    ctx.save();

    // Draw rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(videoWidth / 3, 0);
    ctx.lineTo(videoWidth / 3, videoHeight);
    ctx.moveTo(2 * videoWidth / 3, 0);
    ctx.lineTo(2 * videoWidth / 3, videoHeight);
    ctx.stroke();

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, videoHeight / 3);
    ctx.lineTo(videoWidth, videoHeight / 3);
    ctx.moveTo(0, 2 * videoHeight / 3);
    ctx.lineTo(videoWidth, 2 * videoHeight / 3);
    ctx.stroke();

    // Draw target rectangle
    if (framing.targetRect.width > 0 && framing.targetRect.height > 0) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        framing.targetRect.x,
        framing.targetRect.y,
        framing.targetRect.width,
        framing.targetRect.height
      );

      // Draw center cross
      const centerX = framing.targetRect.x + framing.targetRect.width / 2;
      const centerY = framing.targetRect.y + framing.targetRect.height / 2;

      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();
    }

    // Restore context
    ctx.restore();
  }, []);

  // Real-time framing analysis
  useEffect(() => {
    if (!enabled || !model || !localSettings.realTime) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsActive(false);
      return;
    }

    setIsActive(true);

    const analyzeFrame = () => {
      analyzeFraming();
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsActive(false);
    };
  }, [enabled, model, localSettings.realTime, analyzeFraming]);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetFraming = useCallback(() => {
    const resetFraming: FramingData = {
      zoom: 1,
      panX: 0,
      panY: 0,
      confidence: 0,
      faceCount: 0,
      targetRect: { x: 0, y: 0, width: 0, height: 0 }
    };
    setCurrentFraming(resetFraming);
    lastFramingRef.current = resetFraming;
    onFramingAdjusted?.(resetFraming);
  }, [onFramingAdjusted]);

  if (!enabled) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 space-y-2">
      {/* Hidden canvas for analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Auto Framing Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Focus className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-900">Auto Framing</h3>
            {isActive && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={resetFraming}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Reset framing"
            >
              <Minimize2 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading model...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Framing Status */}
        {currentFraming && !isLoading && (
          <div className="space-y-2">
            {/* Current Settings */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="text-xs text-blue-700 mb-1">Current Framing:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Zoom:</span>
                  <span className="ml-1 font-medium">{currentFraming.zoom.toFixed(2)}x</span>
                </div>
                <div>
                  <span className="text-gray-600">Pan:</span>
                  <span className="ml-1 font-medium">
                    {currentFraming.panX.toFixed(2)}, {currentFraming.panY.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Faces:</span>
                  <span className="ml-1 font-medium">{currentFraming.faceCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>
                  <span className="ml-1 font-medium">
                    {(currentFraming.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Indicator */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Status: {isActive ? 'Active' : 'Inactive'}</span>
              {localSettings.showGuides && (
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Guides On
                </span>
              )}
            </div>
          </div>
        )}

        {/* No Results State */}
        {!currentFraming && !isLoading && !error && (
          <div className="text-center py-4">
            <Focus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Enable auto framing to start</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Framing Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sensitivity</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={localSettings.sensitivity}
                onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-500">{localSettings.sensitivity}</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Smoothing</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={localSettings.smoothing}
                onChange={(e) => updateSetting('smoothing', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-500">{localSettings.smoothing}</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={localSettings.zoomLimit}
                onChange={(e) => updateSetting('zoomLimit', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-500">{localSettings.zoomLimit}x</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Pan Limit</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.panLimit}
                onChange={(e) => updateSetting('panLimit', parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-500">{localSettings.panLimit}</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Guides</label>
              <input
                type="checkbox"
                checked={localSettings.showGuides}
                onChange={(e) => updateSetting('showGuides', e.target.checked)}
                className="rounded accent-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};