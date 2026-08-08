import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { Loader } from 'lucide-react';

// blazeface types allow tensors even when `returnTensors` is false
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
  return undefined;
};

const toPoint = (value: unknown): [number, number] | undefined => {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return [value[0], value[1]];
  }
  return undefined;
};

interface FaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onFacesDetected?: (faces: blazeface.NormalizedFace[]) => void;
  settings?: {
    minConfidence?: number;
    maxFaces?: number;
    drawBoxes?: boolean;
  };
}

export const FaceDetection: React.FC<FaceDetectionProps> = ({
  videoRef,
  enabled,
  onFacesDetected,
  settings = {
    minConfidence: 0.5,
    maxFaces: 10,
    drawBoxes: true
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback in a ref: using it as an effect dependency would
  // tear down and restart the detection loop on every parent render.
  const onFacesDetectedRef = useRef(onFacesDetected);
  useEffect(() => {
    onFacesDetectedRef.current = onFacesDetected;
  }, [onFacesDetected]);

  useEffect(() => {
    let isMounted = true;
    let localModel: blazeface.BlazeFaceModel | null = null;

    const initializeModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js backend is initialized
        await tf.ready();
        
        // Load the face detection model
        const loadedModel = await blazeface.load({
          maxFaces: settings.maxFaces,
          inputWidth: 224,
          inputHeight: 224,
          iouThreshold: 0.3,
          scoreThreshold: settings.minConfidence
        });

        localModel = loadedModel;

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        } else {
          loadedModel.dispose();
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
        if (isMounted) {
          setError('Failed to initialize face detection. Please try again.');
          setIsLoading(false);
        }
      }
    };

    initializeModel();

    return () => {
      isMounted = false;
      // Release the GPU memory held by this model instance
      try {
        localModel?.dispose();
      } catch (disposeError) {
        console.warn('Failed to dispose face detection model:', disposeError);
      }
      setModel(null);
    };
  }, [enabled, settings.maxFaces, settings.minConfidence]);

  const drawFaceBoxes = useCallback((predictions: blazeface.NormalizedFace[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    if (canvasRef.current.width !== videoRef.current.videoWidth ||
        canvasRef.current.height !== videoRef.current.videoHeight) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    predictions.forEach((prediction) => {
      // With `returnTensors === false` blazeface returns plain numbers, but the
      // published types still allow tensors - normalize before using them.
      const probability = toNumber(prediction.probability);
      const start = toPoint(prediction.topLeft);
      const end = toPoint(prediction.bottomRight);

      if (!start || !end) return;

      if ((probability ?? 1) >= (settings.minConfidence || 0.5)) {
        const size = [end[0] - start[0], end[1] - start[1]];

        // Draw face box
        ctx.strokeStyle = '#E44E51';
        ctx.lineWidth = 2;
        ctx.strokeRect(start[0], start[1], size[0], size[1]);

        // Draw confidence score
        if (probability !== undefined) {
          ctx.fillStyle = '#E44E51';
          ctx.font = '12px Arial';
          ctx.fillText(
            `${Math.round(probability * 100)}%`,
            start[0],
            start[1] - 5
          );
        }

        // Draw landmarks
        if (Array.isArray(prediction.landmarks)) {
          (prediction.landmarks as number[][]).forEach((landmark) => {
            ctx.fillStyle = '#E44E51';
            ctx.beginPath();
            ctx.arc(landmark[0], landmark[1], 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    });
  }, [videoRef, settings.minConfidence]);

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

      // The video has no decoded frame yet - fromPixels would throw
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        animationFrame = requestAnimationFrame(detectFaces);
        return;
      }

      isDetecting = true;
      let videoTensor: tf.Tensor3D | null = null;

      try {
        // Convert video frame to tensor
        videoTensor = tf.browser.fromPixels(video);
        
        // Run detection
        const predictions = await model.estimateFaces(videoTensor, false);
        
        onFacesDetectedRef.current?.(predictions);

        if (settings.drawBoxes) {
          drawFaceBoxes(predictions);
        }
      } catch (err) {
        console.error('Face detection error:', err);
      } finally {
        // Always clean up the tensor, otherwise every failing frame leaks
        // a WebGL texture.
        videoTensor?.dispose();
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
  }, [model, enabled, isLoading, settings.drawBoxes, videoRef, drawFaceBoxes]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          <div className="flex items-center space-x-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Loading face detection model...</span>
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