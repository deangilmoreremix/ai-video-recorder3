import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { HandDetector } from '@tensorflow-models/hand-pose-detection';
import { Loader, Settings } from 'lucide-react';

interface HandPoseDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onHandsDetected?: (hands: any[]) => void;
  settings?: {
    minConfidence?: number;
    maxHands?: number;
    drawPoints?: boolean;
    drawSkeleton?: boolean;
    pointColor?: string;
    skeletonColor?: string;
    gestureDetection?: boolean;
  };
}

export const HandPoseDetection: React.FC<HandPoseDetectionProps> = ({
  videoRef,
  enabled,
  onHandsDetected,
  settings = {
    minConfidence: 0.5,
    maxHands: 2,
    drawPoints: true,
    drawSkeleton: true,
    pointColor: '#00FF00',
    skeletonColor: '#00FF00',
    gestureDetection: true
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<HandDetector | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastDetectedGestures, setLastDetectedGestures] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const initializeModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js backend is initialized
        await tf.ready();
        
        // Load the hand pose detection model
        const detector = await handPoseDetection.createDetector(
          handPoseDetection.SupportedModels.MediaPipeHands,
          {
            runtime: 'tfjs',
            modelType: 'full',
            maxHands: settings.maxHands || 2
          }
        );

        if (isMounted) {
          setModel(detector);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load hand pose detection model:', err);
        if (isMounted) {
          setError('Failed to initialize hand pose detection. Please try again.');
          setIsLoading(false);
        }
      }
    };

    initializeModel();

    return () => {
      isMounted = false;
      // No explicit model disposal method for hand-pose-detection
    };
  }, [enabled, settings.maxHands]);

  useEffect(() => {
    let animationFrame: number;
    let isDetecting = false;

    const detectHands = async () => {
      if (!model || !videoRef.current || !canvasRef.current || !enabled || isDetecting || isLoading) {
        return;
      }

      isDetecting = true;

      try {
        const hands = await model.estimateHands(videoRef.current);
        
        if (onHandsDetected) {
          onHandsDetected(hands);
        }

        // Process gestures if enabled
        if (settings.gestureDetection) {
          const gestures = hands.map(hand => detectGesture(hand));
          setLastDetectedGestures(gestures.filter(g => g !== 'unknown'));
        }

        drawHandPose(hands);
      } catch (err) {
        console.error('Hand pose detection error:', err);
      } finally {
        isDetecting = false;
      }

      animationFrame = requestAnimationFrame(detectHands);
    };

    if (enabled && model && !isLoading) {
      detectHands();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [model, enabled, isLoading, onHandsDetected, settings]);

  const drawHandPose = (hands: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    hands.forEach((hand) => {
      const score = hand.score;
      if (score < (settings.minConfidence || 0.5)) return;
      
      const keypoints = hand.keypoints;
      const handedness = hand.handedness; // 'Left' or 'Right'
      
      // Color based on handedness
      const color = handedness === 'Left' ? settings.pointColor : '#FFCC00';
      
      // Draw points if enabled
      if (settings.drawPoints) {
        ctx.fillStyle = color;
        for (const point of keypoints) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      
      // Draw skeleton if enabled
      if (settings.drawSkeleton) {
        const fingers = [
          [0, 1, 2, 3, 4],           // thumb
          [0, 5, 6, 7, 8],           // index finger
          [0, 9, 10, 11, 12],        // middle finger
          [0, 13, 14, 15, 16],       // ring finger
          [0, 17, 18, 19, 20]        // pinky
        ];
        
        ctx.strokeStyle = settings.skeletonColor || '#00FF00';
        ctx.lineWidth = 2;
        
        for (const finger of fingers) {
          const points = finger.map(idx => keypoints[idx]);
          
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          
          ctx.stroke();
        }
      }
      
      // Draw gesture label if detected
      if (settings.gestureDetection && lastDetectedGestures.length > 0) {
        const gesture = detectGesture(hand);
        if (gesture !== 'unknown') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(hand.keypoints[0].x - 60, hand.keypoints[0].y - 40, 120, 30);
          ctx.font = '16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(gesture, hand.keypoints[0].x, hand.keypoints[0].y - 20);
        }
      }
    });
  };

  const detectGesture = (hand: any): string => {
    if (!hand || !hand.keypoints || hand.keypoints.length < 21) return 'unknown';
    
    const keypoints = hand.keypoints;
    const thumbTip = keypoints[4];
    const indexTip = keypoints[8];
    const middleTip = keypoints[12];
    const ringTip = keypoints[16];
    const pinkyTip = keypoints[20];
    const wrist = keypoints[0];
    
    // Helper function to calculate distance between points
    const distance = (p1: any, p2: any) => 
      Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    // Calculate distances for gesture detection
    const thumbToIndex = distance(thumbTip, indexTip);
    const indexToMiddle = distance(indexTip, middleTip);
    
    // Calculate finger heights from wrist
    const thumbHeight = distance(thumbTip, wrist);
    const indexHeight = distance(indexTip, wrist);
    const middleHeight = distance(middleTip, wrist);
    const ringHeight = distance(ringTip, wrist);
    const pinkyHeight = distance(pinkyTip, wrist);
    
    // Define thresholds for gesture recognition
    const closeThreshold = 40; // Threshold for considering fingers "close"
    const extendedThreshold = 0.6; // Threshold for considering a finger "extended"
    
    // Peace sign (V) - index and middle extended, others folded
    if (indexHeight > extendedThreshold * middleHeight && 
        middleHeight > extendedThreshold * ringHeight &&
        ringHeight < 0.7 * middleHeight &&
        pinkyHeight < 0.7 * middleHeight) {
      return 'Peace';
    }
    
    // Thumbs up - thumb extended, others folded
    if (thumbHeight > extendedThreshold * indexHeight &&
        indexHeight < 0.7 * thumbHeight &&
        middleHeight < 0.7 * thumbHeight &&
        ringHeight < 0.7 * thumbHeight &&
        pinkyHeight < 0.7 * thumbHeight) {
      return 'Thumbs Up';
    }
    
    // Pointing - index extended, others folded
    if (indexHeight > extendedThreshold * thumbHeight &&
        indexHeight > extendedThreshold * middleHeight &&
        middleHeight < 0.7 * indexHeight &&
        ringHeight < 0.7 * indexHeight &&
        pinkyHeight < 0.7 * indexHeight) {
      return 'Pointing';
    }
    
    // Open hand - all fingers extended
    if (thumbHeight > 0.5 * indexHeight &&
        indexHeight > 0.7 * middleHeight &&
        middleHeight > 0.7 * ringHeight &&
        ringHeight > 0.7 * pinkyHeight &&
        pinkyHeight > 0.5 * indexHeight) {
      return 'Open Hand';
    }
    
    // Pinch - thumb and index close together, others extended
    if (thumbToIndex < closeThreshold &&
        indexHeight > 0.7 * middleHeight) {
      return 'Pinch';
    }
    
    // Fist - all fingers folded
    if (thumbHeight < 0.5 * distance(wrist, keypoints[5]) &&
        indexHeight < 0.5 * distance(wrist, keypoints[5]) &&
        middleHeight < 0.5 * distance(wrist, keypoints[9]) &&
        ringHeight < 0.5 * distance(wrist, keypoints[13]) &&
        pinkyHeight < 0.5 * distance(wrist, keypoints[17])) {
      return 'Fist';
    }
    
    return 'unknown';
  };

  if (!enabled) return null;

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      
      {/* Settings Button */}
      {enabled && !isLoading && (
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
          <h4 className="text-sm font-medium mb-3">Hand Pose Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Max Hands</label>
              <select
                className="w-full text-sm rounded border-gray-300"
                value={settings.maxHands}
                onChange={(e) => settings.maxHands = Number(e.target.value)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="4">4</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Points</label>
              <input
                type="checkbox"
                checked={settings.drawPoints}
                onChange={(e) => settings.drawPoints = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Skeleton</label>
              <input
                type="checkbox"
                checked={settings.drawSkeleton}
                onChange={(e) => settings.drawSkeleton = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Gesture Detection</label>
              <input
                type="checkbox"
                checked={settings.gestureDetection}
                onChange={(e) => settings.gestureDetection = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Gesture Display */}
      {enabled && settings.gestureDetection && lastDetectedGestures.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded-lg text-sm">
          <div className="flex items-center space-x-2">
            <span>Gesture: {lastDetectedGestures.join(', ')}</span>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center space-x-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading hand pose model...</span>
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