import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { MediaPipeFaceMesh } from '@tensorflow-models/face-landmarks-detection';
import { Loader, Settings } from 'lucide-react';

interface FacialLandmarkDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onFacesDetected?: (faces: any[]) => void;
  settings?: {
    minConfidence?: number;
    maxFaces?: number;
    drawMesh?: boolean;
    drawContours?: boolean;
    drawIris?: boolean;
    meshColor?: string;
    contourColor?: string;
    irisColor?: string;
  };
}

export const FacialLandmarkDetection: React.FC<FacialLandmarkDetectionProps> = ({
  videoRef,
  enabled,
  onFacesDetected,
  settings = {
    minConfidence: 0.5,
    maxFaces: 5,
    drawMesh: true,
    drawContours: true,
    drawIris: true,
    meshColor: '#E44E51',
    contourColor: '#00FFFF',
    irisColor: '#FFFFFF'
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<MediaPipeFaceMesh | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const CONTOURS = {
    jawOutline: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    leftEyebrowTop: [70, 63, 105, 66, 107],
    leftEyebrowBottom: [46, 53, 52, 65],
    rightEyebrowTop: [336, 296, 334, 293, 300],
    rightEyebrowBottom: [285, 295, 282, 283],
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    lips: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
  };

  useEffect(() => {
    let isMounted = true;

    const initializeModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js backend is initialized
        await tf.ready();
        
        // Load the face landmark detection model
        const loadedModel = await faceLandmarksDetection.load(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            refineLandmarks: true,
            maxFaces: settings.maxFaces
          }
        );

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load face landmarks detection model:', err);
        if (isMounted) {
          setError('Failed to initialize facial landmarks detection. Please try again.');
          setIsLoading(false);
        }
      }
    };

    initializeModel();

    return () => {
      isMounted = false;
      // Cleanup TensorFlow memory
      if (model) {
        // No explicit model.dispose() method for face-landmarks-detection,
        // but we can try to clean up general TensorFlow memory
        tf.disposeVariables();
      }
    };
  }, [enabled, settings.maxFaces]);

  useEffect(() => {
    let animationFrame: number;
    let isDetecting = false;

    const detectFaces = async () => {
      if (!model || !videoRef.current || !canvasRef.current || !enabled || isDetecting || isLoading) {
        return;
      }

      isDetecting = true;

      try {
        // Process the current video frame
        const predictions = await model.estimateFaces({
          input: videoRef.current,
          returnTensors: false,
          flipHorizontal: false,
          predictIrises: settings.drawIris
        });
        
        if (onFacesDetected) {
          onFacesDetected(predictions);
        }

        drawFaceMesh(predictions);
      } catch (err) {
        console.error('Face landmark detection error:', err);
      } finally {
        isDetecting = false;
      }

      animationFrame = requestAnimationFrame(detectFaces);
    };

    if (enabled && model && !isLoading) {
      detectFaces();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [model, enabled, isLoading, onFacesDetected, settings]);

  const drawFaceMesh = (predictions: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    predictions.forEach((prediction) => {
      const keypoints = prediction.scaledMesh;
      const boundingBox = prediction.boundingBox;
      
      // Draw bounding box
      const { topLeft, bottomRight } = boundingBox;
      const boxWidth = bottomRight[0] - topLeft[0];
      const boxHeight = bottomRight[1] - topLeft[1];
      
      ctx.strokeStyle = settings.meshColor || '#E44E51';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        topLeft[0], topLeft[1], boxWidth, boxHeight
      );

      // Draw confidence score
      ctx.fillStyle = settings.meshColor || '#E44E51';
      ctx.font = '12px Arial';
      ctx.fillText(
        `Confidence: ${Math.round(prediction.faceInViewConfidence * 100)}%`,
        topLeft[0], topLeft[1] - 5
      );

      // Draw facial mesh points if enabled
      if (settings.drawMesh) {
        ctx.fillStyle = settings.meshColor || '#E44E51';
        for (let i = 0; i < keypoints.length; i++) {
          const [x, y] = keypoints[i];
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw contours if enabled
      if (settings.drawContours) {
        ctx.strokeStyle = settings.contourColor || '#00FFFF';
        ctx.lineWidth = 2;
        
        Object.values(CONTOURS).forEach(contour => {
          ctx.beginPath();
          for (let i = 0; i < contour.length; i++) {
            const point = keypoints[contour[i]];
            if (i === 0) {
              ctx.moveTo(point[0], point[1]);
            } else {
              ctx.lineTo(point[0], point[1]);
            }
          }
          // Close the loop for the lips and eyes
          if (contour === CONTOURS.leftEye || contour === CONTOURS.rightEye || contour === CONTOURS.lips) {
            ctx.closePath();
          }
          ctx.stroke();
        });
      }

      // Draw irises if enabled and available
      if (settings.drawIris && prediction.annotations && prediction.annotations.leftEyeIris && prediction.annotations.rightEyeIris) {
        ctx.fillStyle = settings.irisColor || '#FFFFFF';
        ctx.strokeStyle = settings.irisColor || '#FFFFFF';
        
        [prediction.annotations.leftEyeIris, prediction.annotations.rightEyeIris].forEach(iris => {
          const [centerX, centerY] = iris[0];
          ctx.beginPath();
          ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
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
          <h4 className="text-sm font-medium mb-3">Facial Landmark Settings</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Max Faces</label>
              <select
                className="w-full text-sm rounded border-gray-300"
                value={settings.maxFaces}
                onChange={(e) => settings.maxFaces = Number(e.target.value)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Mesh</label>
              <input
                type="checkbox"
                checked={settings.drawMesh}
                onChange={(e) => settings.drawMesh = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Contours</label>
              <input
                type="checkbox"
                checked={settings.drawContours}
                onChange={(e) => settings.drawContours = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Irises</label>
              <input
                type="checkbox"
                checked={settings.drawIris}
                onChange={(e) => settings.drawIris = e.target.checked}
                className="rounded text-[#E44E51]"
              />
            </div>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center space-x-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading facial landmark model...</span>
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