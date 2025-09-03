import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smile, Frown, Meh, Heart, Angry, Zap, Settings } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface EnhancedExpressionDetectionProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onExpressionDetected?: (expression: ExpressionResult) => void;
  settings?: {
    sensitivity?: number;
    realTime?: boolean;
    showLandmarks?: boolean;
    emotionThreshold?: number;
  };
}

interface ExpressionResult {
  primaryEmotion: string;
  confidence: number;
  allEmotions: Record<string, number>;
  faceDetected: boolean;
  timestamp: number;
}

export const EnhancedExpressionDetection: React.FC<EnhancedExpressionDetectionProps> = ({
  enabled,
  videoRef,
  onExpressionDetected,
  settings = {
    sensitivity: 0.7,
    realTime: true,
    showLandmarks: false,
    emotionThreshold: 0.3
  }
}) => {
  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentExpression, setCurrentExpression] = useState<ExpressionResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Load Face Landmarks Detection model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js is ready
        await tf.ready();

        // Load face landmarks detection model
        const loadedModel = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
          }
        );

        console.log('Enhanced face landmarks model loaded successfully');

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load enhanced expression detection model:', err);
        if (isMounted) {
          setError('Failed to load expression detection model');
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

  // Advanced emotion detection using facial landmarks
  const detectEmotion = useCallback((landmarks: number[][], annotations: any): ExpressionResult => {
    const emotions: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 0,
      fearful: 0,
      disgusted: 0
    };

    try {
      // Extract key facial features
      const leftEyebrow = annotations?.leftEyebrow || [];
      const rightEyebrow = annotations?.rightEyebrow || [];
      const leftEye = annotations?.leftEye || [];
      const rightEye = annotations?.rightEye || [];
      const lipsUpper = annotations?.lipsUpperInner || [];
      const lipsLower = annotations?.lipsLowerInner || [];
      const nose = annotations?.noseTip || [];

      // Calculate distances and ratios for emotion detection

      // 1. Mouth analysis (smiling, frowning)
      if (lipsUpper.length > 0 && lipsLower.length > 0) {
        const mouthWidth = Math.abs(lipsUpper[lipsUpper.length - 1][0] - lipsUpper[0][0]);
        const mouthHeight = Math.abs(lipsLower[0][1] - lipsUpper[0][1]);

        if (mouthHeight > mouthWidth * 0.3) {
          emotions.surprised += 0.4; // Wide open mouth
        } else if (mouthHeight > mouthWidth * 0.15) {
          emotions.happy += 0.3; // Smiling
        } else if (mouthHeight < mouthWidth * 0.05) {
          emotions.sad += 0.2; // Frowning
        }
      }

      // 2. Eyebrow analysis
      if (leftEyebrow.length > 0 && rightEyebrow.length > 0) {
        const leftEyebrowHeight = leftEyebrow[0][1] - leftEyebrow[leftEyebrow.length - 1][1];
        const rightEyebrowHeight = rightEyebrow[0][1] - rightEyebrow[rightEyebrow.length - 1][1];
        const avgEyebrowSlope = (leftEyebrowHeight + rightEyebrowHeight) / 2;

        if (avgEyebrowSlope > 5) {
          emotions.surprised += 0.3; // Raised eyebrows
        } else if (avgEyebrowSlope < -5) {
          emotions.angry += 0.3; // Furrowed eyebrows
        }
      }

      // 3. Eye analysis
      if (leftEye.length > 0 && rightEye.length > 0) {
        const leftEyeWidth = Math.abs(leftEye[3][0] - leftEye[0][0]);
        const leftEyeHeight = Math.abs(leftEye[1][1] - leftEye[5][1]);
        const rightEyeWidth = Math.abs(rightEye[3][0] - rightEye[0][0]);
        const rightEyeHeight = Math.abs(rightEye[1][1] - rightEye[5][1]);

        const avgEyeOpenness = (leftEyeHeight / leftEyeWidth + rightEyeHeight / rightEyeWidth) / 2;

        if (avgEyeOpenness > 0.4) {
          emotions.surprised += 0.2; // Wide eyes
        } else if (avgEyeOpenness < 0.2) {
          emotions.sad += 0.2; // Narrow eyes
        }
      }

      // 4. Nose and cheek analysis (subtle emotion indicators)
      if (nose.length > 0) {
        // Calculate nose wrinkle patterns (could indicate disgust/fear)
        const noseWidth = Math.abs(nose[nose.length - 1][0] - nose[0][0]);
        if (noseWidth > 30) {
          emotions.disgusted += 0.1;
        }
      }

      // Normalize emotion scores
      const totalScore = Object.values(emotions).reduce((sum, score) => sum + score, 0);

      if (totalScore > 0) {
        Object.keys(emotions).forEach(emotion => {
          emotions[emotion] = emotions[emotion] / totalScore;
        });
      } else {
        // Default to neutral if no clear emotion detected
        emotions.neutral = 1.0;
      }

      // Find primary emotion
      let primaryEmotion = 'neutral';
      let maxConfidence = 0;

      Object.entries(emotions).forEach(([emotion, confidence]) => {
        if (confidence > maxConfidence && confidence >= (localSettings.emotionThreshold || 0.3)) {
          primaryEmotion = emotion;
          maxConfidence = confidence;
        }
      });

      return {
        primaryEmotion,
        confidence: maxConfidence,
        allEmotions: emotions,
        faceDetected: true,
        timestamp: Date.now()
      };

    } catch (err) {
      console.error('Emotion detection failed:', err);
      return {
        primaryEmotion: 'neutral',
        confidence: 0,
        allEmotions: { neutral: 1.0 },
        faceDetected: false,
        timestamp: Date.now()
      };
    }
  }, [localSettings.emotionThreshold]);

  // Analyze facial expressions
  const analyzeExpression = useCallback(async () => {
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

      // Detect faces and landmarks
      const faces = await model.estimateFaces(video);

      if (faces.length > 0) {
        const face = faces[0];
        // Use keypoints instead of scaledMesh for compatibility
        const landmarks = (face as any).keypoints || [];
        const annotations = (face as any).annotations || {};

        // Detect emotion
        const expressionResult = detectEmotion(landmarks, annotations);
        setCurrentExpression(expressionResult);
        onExpressionDetected?.(expressionResult);

        // Draw landmarks if enabled
        if (localSettings.showLandmarks && ctx) {
          drawFacialLandmarks(ctx, landmarks, annotations);
        }
      } else {
        // No face detected
        const noFaceResult: ExpressionResult = {
          primaryEmotion: 'no-face',
          confidence: 0,
          allEmotions: {},
          faceDetected: false,
          timestamp: Date.now()
        };
        setCurrentExpression(noFaceResult);
        onExpressionDetected?.(noFaceResult);
      }

    } catch (err) {
      console.error('Expression analysis failed:', err);
    }
  }, [model, videoRef, detectEmotion, localSettings.showLandmarks, onExpressionDetected]);

  // Draw facial landmarks for debugging
  const drawFacialLandmarks = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: number[][],
    annotations: any
  ) => {
    ctx.save();

    // Draw facial mesh points
    ctx.fillStyle = '#00FF00';
    landmarks.forEach((point, index) => {
      if (index % 5 === 0) { // Draw every 5th point for performance
        ctx.beginPath();
        ctx.arc(point[0], point[1], 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw key facial features
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;

    // Draw eyes
    if (annotations.leftEye) {
      ctx.beginPath();
      annotations.leftEye.forEach((point: number[], index: number) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.stroke();
    }

    if (annotations.rightEye) {
      ctx.beginPath();
      annotations.rightEye.forEach((point: number[], index: number) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Draw mouth
    if (annotations.lipsUpperInner && annotations.lipsLowerInner) {
      ctx.beginPath();
      annotations.lipsUpperInner.forEach((point: number[], index: number) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      annotations.lipsLowerInner.slice().reverse().forEach((point: number[]) => {
        ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  // Real-time expression analysis
  useEffect(() => {
    if (!enabled || !model || !localSettings.realTime) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const analyzeFrame = () => {
      analyzeExpression();
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, model, localSettings.realTime, analyzeExpression]);

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'sad':
        return <Frown className="w-5 h-5 text-blue-500" />;
      case 'angry':
        return <Angry className="w-5 h-5 text-red-500" />;
      case 'surprised':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'fearful':
        return <Meh className="w-5 h-5 text-purple-500" />;
      case 'disgusted':
        return <Meh className="w-5 h-5 text-orange-500" />;
      default:
        return <Meh className="w-5 h-5 text-gray-500" />;
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sad':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'angry':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'surprised':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fearful':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'disgusted':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!enabled) return null;

  return (
    <div className="absolute top-4 left-1/4 transform -translate-x-1/2 space-y-2">
      {/* Hidden canvas for analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Expression Detection Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h3 className="text-sm font-medium text-gray-900">Expression Detection</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading model...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Expression Result */}
        {currentExpression && !isLoading && (
          <div className="space-y-2">
            {/* Primary Emotion */}
            <div className={`border rounded-lg p-3 ${getEmotionColor(currentExpression.primaryEmotion)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getEmotionIcon(currentExpression.primaryEmotion)}
                  <span className="text-sm font-medium capitalize">
                    {currentExpression.primaryEmotion.replace('-', ' ')}
                  </span>
                </div>
                <span className="text-xs">
                  {(currentExpression.confidence * 100).toFixed(1)}%
                </span>
              </div>

              {/* Confidence Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full bg-current transition-all duration-300"
                  style={{ width: `${currentExpression.confidence * 100}%` }}
                />
              </div>

              <div className="text-xs opacity-75">
                Face detected: {currentExpression.faceDetected ? 'Yes' : 'No'}
              </div>
            </div>

            {/* All Emotions */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-700">Emotion Scores:</h4>
              {Object.entries(currentExpression.allEmotions)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([emotion, score]) => (
                  <div key={emotion} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 capitalize">{emotion}</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-12 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-gray-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-8 text-right">
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No Results State */}
        {!currentExpression && !isLoading && !error && (
          <div className="text-center py-4">
            <Heart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Analyzing expressions...</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Detection Settings</h4>

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
                className="w-full accent-pink-500"
              />
              <span className="text-xs text-gray-500">{localSettings.sensitivity}</span>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Emotion Threshold</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.1"
                value={localSettings.emotionThreshold}
                onChange={(e) => updateSetting('emotionThreshold', parseFloat(e.target.value))}
                className="w-full accent-pink-500"
              />
              <span className="text-xs text-gray-500">{localSettings.emotionThreshold}</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-pink-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Landmarks</label>
              <input
                type="checkbox"
                checked={localSettings.showLandmarks}
                onChange={(e) => updateSetting('showLandmarks', e.target.checked)}
                className="rounded accent-pink-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};