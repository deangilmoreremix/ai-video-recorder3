import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Eye, Settings, Image as ImageIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

interface SceneDetectionProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onSceneDetected?: (scene: SceneResult) => void;
  settings?: {
    confidenceThreshold?: number;
    maxResults?: number;
    realTime?: boolean;
    showOverlay?: boolean;
  };
}

interface SceneResult {
  scenes: Array<{
    className: string;
    probability: number;
  }>;
  dominantScene: string;
  confidence: number;
  timestamp: number;
}

export const SceneDetection: React.FC<SceneDetectionProps> = ({
  enabled,
  videoRef,
  onSceneDetected,
  settings = {
    confidenceThreshold: 0.1,
    maxResults: 5,
    realTime: true,
    showOverlay: true
  }
}) => {
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastAnalysisTime = useRef<number>(0);

  // Load MobileNet model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js is ready
        await tf.ready();

        // Load MobileNet model
        const loadedModel = await mobilenet.load({
          version: 2,
          alpha: 1.0
        });

        console.log('MobileNet model loaded successfully');

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load scene detection model:', err);
        if (isMounted) {
          setError('Failed to load scene detection model');
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

  // Analyze scene from video frame
  const analyzeScene = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current || isAnalyzing) {
      return;
    }

    const now = Date.now();
    // Throttle analysis to every 2 seconds for performance
    if (now - lastAnalysisTime.current < 2000) {
      return;
    }

    setIsAnalyzing(true);
    lastAnalysisTime.current = now;

    try {
      // Get video frame
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Classify the scene
      const predictions = await model.classify(canvas, localSettings.maxResults);

      // Filter predictions by confidence threshold
      const threshold = localSettings.confidenceThreshold || 0.1;
      const filteredPredictions = predictions.filter(
        pred => pred.probability >= threshold
      );

      if (filteredPredictions.length > 0) {
        const result: SceneResult = {
          scenes: filteredPredictions.map(pred => ({
            className: pred.className,
            probability: pred.probability
          })),
          dominantScene: filteredPredictions[0].className,
          confidence: filteredPredictions[0].probability,
          timestamp: now
        };

        setCurrentScene(result);
        onSceneDetected?.(result);
      }

    } catch (err) {
      console.error('Scene analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [model, videoRef, localSettings, onSceneDetected, isAnalyzing]);

  // Start/stop scene analysis based on settings
  useEffect(() => {
    if (!enabled || !model || !localSettings.realTime) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const analyzeLoop = () => {
      analyzeScene();
      animationFrameRef.current = requestAnimationFrame(analyzeLoop);
    };

    analyzeLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, model, localSettings.realTime, analyzeScene]);

  // Manual analysis trigger
  const analyzeCurrentScene = useCallback(() => {
    analyzeScene();
  }, [analyzeScene]);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Scene type categorization
  const getSceneCategory = (sceneName: string): string => {
    const categories = {
      indoor: ['room', 'kitchen', 'bathroom', 'bedroom', 'living room', 'dining room', 'office'],
      outdoor: ['forest', 'mountain', 'beach', 'park', 'garden', 'street', 'city', 'building'],
      object: ['car', 'bicycle', 'person', 'dog', 'cat', 'chair', 'table', 'computer'],
      food: ['pizza', 'hamburger', 'cake', 'apple', 'banana', 'orange', 'bread'],
      animal: ['dog', 'cat', 'bird', 'horse', 'cow', 'elephant', 'lion', 'tiger']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => sceneName.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'other';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      indoor: 'bg-blue-100 text-blue-800 border-blue-200',
      outdoor: 'bg-green-100 text-green-800 border-green-200',
      object: 'bg-purple-100 text-purple-800 border-purple-200',
      food: 'bg-orange-100 text-orange-800 border-orange-200',
      animal: 'bg-pink-100 text-pink-800 border-pink-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  if (!enabled) return null;

  return (
    <div className="absolute bottom-4 left-4 space-y-2">
      {/* Hidden canvas for analysis */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width={640}
        height={480}
      />

      {/* Main Detection Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-medium text-gray-900">Scene Detection</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={analyzeCurrentScene}
              disabled={isLoading || isAnalyzing}
              className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Analyze current scene"
            >
              <Camera className="w-4 h-4 text-gray-500" />
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading model...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Scene Results */}
        {currentScene && !isLoading && (
          <div className="space-y-2">
            {/* Dominant Scene */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-700">Dominant Scene</span>
                <span className="text-xs text-indigo-600">
                  {(currentScene.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(getSceneCategory(currentScene.dominantScene))}`}>
                {currentScene.dominantScene}
              </div>
            </div>

            {/* All Detected Scenes */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-700">Detected Objects/Scenes:</h4>
              {currentScene.scenes.slice(0, 3).map((scene, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate max-w-32">{scene.className}</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${scene.probability * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-500 w-8 text-right">
                      {(scene.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Analysis Status */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last analyzed: {new Date(currentScene.timestamp).toLocaleTimeString()}</span>
              {isAnalyzing && (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border border-indigo-500 border-t-transparent mr-1"></div>
                  Analyzing...
                </span>
              )}
            </div>
          </div>
        )}

        {/* No Results State */}
        {!currentScene && !isLoading && !error && (
          <div className="text-center py-4">
            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Click camera to analyze scene</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Detection Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Confidence Threshold</label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={localSettings.confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <span className="text-xs text-gray-500">{localSettings.confidenceThreshold}</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Results</label>
              <select
                value={localSettings.maxResults}
                onChange={(e) => updateSetting('maxResults', parseInt(e.target.value))}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded px-2 py-1"
              >
                <option value="3">3 results</option>
                <option value="5">5 results</option>
                <option value="10">10 results</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time Analysis</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Overlay</label>
              <input
                type="checkbox"
                checked={localSettings.showOverlay}
                onChange={(e) => updateSetting('showOverlay', e.target.checked)}
                className="rounded accent-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};