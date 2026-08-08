import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { Face, FaceLandmarksDetector } from '@tensorflow-models/face-landmarks-detection';
import { Loader, Settings } from 'lucide-react';

// Contour indices (lips / eyes / irises / face oval) of the MediaPipe face mesh
const FACE_MESH_CONTOURS = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);

interface FacialLandmarkSettings {
  minConfidence: number;
  maxFaces: number;
  drawMesh: boolean;
  drawContours: boolean;
  drawIris: boolean;
  meshColor: string;
  contourColor: string;
  irisColor: string;
}

const DEFAULT_SETTINGS: FacialLandmarkSettings = {
  minConfidence: 0.5,
  maxFaces: 5,
  drawMesh: true,
  drawContours: true,
  drawIris: true,
  meshColor: '#E44E51',
  contourColor: '#00FFFF',
  irisColor: '#FFFFFF'
};

interface FacialLandmarkDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onFacesDetected?: (faces: Face[]) => void;
  settings?: Partial<FacialLandmarkSettings>;
}

export const FacialLandmarkDetection: React.FC<FacialLandmarkDetectionProps> = ({
  videoRef,
  enabled,
  onFacesDetected,
  settings
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<FaceLandmarksDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Keep the latest callback in a ref so the detection loop is not restarted
  // on every parent render.
  const onFacesDetectedRef = useRef(onFacesDetected);
  useEffect(() => {
    onFacesDetectedRef.current = onFacesDetected;
  }, [onFacesDetected]);

  // Panel edits are kept locally instead of mutating the (read-only) props.
  const [settingsOverrides, setSettingsOverrides] = useState<Partial<FacialLandmarkSettings>>({});
  const {
    maxFaces, drawMesh, drawContours, drawIris, meshColor, contourColor, irisColor
  }: FacialLandmarkSettings = { ...DEFAULT_SETTINGS, ...settings, ...settingsOverrides };

  const updateSetting = <K extends keyof FacialLandmarkSettings>(
    key: K,
    value: FacialLandmarkSettings[K]
  ) => {
    setSettingsOverrides(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let isMounted = true;
    let localModel: FaceLandmarksDetector | null = null;

    const initializeModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js backend is initialized
        await tf.ready();
        
        // Load the face landmark detection model
        const loadedModel = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces
          }
        );

        localModel = loadedModel;

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        } else {
          loadedModel.dispose();
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
      // Only dispose this detector - `tf.disposeVariables()` is global and
      // would break every other model still loaded in the app.
      try {
        localModel?.dispose();
      } catch (disposeError) {
        console.warn('Failed to dispose facial landmark model:', disposeError);
      }
      setModel(null);
    };
  }, [enabled, maxFaces]);

  const drawFaceMesh = useCallback((predictions: Face[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    if (canvas.width !== videoRef.current.videoWidth ||
        canvas.height !== videoRef.current.videoHeight) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      const keypoints = prediction.keypoints;
      const box = prediction.box;

      // Draw bounding box
      if (box) {
        ctx.strokeStyle = meshColor || '#E44E51';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
      }

      // Draw facial mesh points if enabled
      if (drawMesh) {
        ctx.fillStyle = meshColor || '#E44E51';
        for (let i = 0; i < keypoints.length; i++) {
          const point = keypoints[i];
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw contours if enabled
      if (drawContours) {
        ctx.strokeStyle = contourColor || '#00FFFF';
        ctx.lineWidth = 2;

        ['faceOval', 'leftEye', 'rightEye', 'leftEyebrow', 'rightEyebrow', 'lips'].forEach(label => {
          const indices = FACE_MESH_CONTOURS[label];
          if (!indices || indices.length === 0) return;

          ctx.beginPath();
          indices.forEach((index, i) => {
            const point = keypoints[index];
            if (!point) return;
            if (i === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          // Close the loop for the face oval, lips and eyes
          if (label !== 'leftEyebrow' && label !== 'rightEyebrow') {
            ctx.closePath();
          }
          ctx.stroke();
        });
      }

      // Draw irises if enabled and available (only present with refineLandmarks)
      if (drawIris) {
        ctx.fillStyle = irisColor || '#FFFFFF';
        ctx.strokeStyle = irisColor || '#FFFFFF';

        ['leftIris', 'rightIris'].forEach(label => {
          const indices = FACE_MESH_CONTOURS[label];
          const center = indices && indices.length > 0 ? keypoints[indices[0]] : undefined;
          if (!center) return;

          ctx.beginPath();
          ctx.arc(center.x, center.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }, [videoRef, drawMesh, drawContours, drawIris, meshColor, contourColor, irisColor]);

  useEffect(() => {
    let animationFrame: number | undefined;
    let isDetecting = false;
    let cancelled = false;

    const detectFaces = async () => {
      if (cancelled) return;

      const video = videoRef.current;

      if (!model || !video || !canvasRef.current || !enabled || isDetecting || isLoading) {
        return;
      }

      // Wait until the video actually has a frame to analyse
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        animationFrame = requestAnimationFrame(detectFaces);
        return;
      }

      isDetecting = true;

      try {
        // Process the current video frame
        const predictions = await model.estimateFaces(video, {
          flipHorizontal: false,
          staticImageMode: false
        });
        
        onFacesDetectedRef.current?.(predictions);

        drawFaceMesh(predictions);
      } catch (err) {
        console.error('Face landmark detection error:', err);
      } finally {
        isDetecting = false;
      }

      if (!cancelled) {
        animationFrame = requestAnimationFrame(detectFaces);
      }
    };

    if (enabled && model && !isLoading) {
      detectFaces();
    }

    return () => {
      cancelled = true;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [model, enabled, isLoading, videoRef, drawFaceMesh]);

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
                value={maxFaces}
                onChange={(e) => updateSetting('maxFaces', Number(e.target.value))}
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
                checked={drawMesh}
                onChange={(e) => updateSetting('drawMesh', e.target.checked)}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Contours</label>
              <input
                type="checkbox"
                checked={drawContours}
                onChange={(e) => updateSetting('drawContours', e.target.checked)}
                className="rounded text-[#E44E51]"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <label className="text-xs">Show Irises</label>
              <input
                type="checkbox"
                checked={drawIris}
                onChange={(e) => updateSetting('drawIris', e.target.checked)}
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