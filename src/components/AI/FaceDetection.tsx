import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { Loader } from 'lucide-react';

interface FaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onFacesDetected?: (faces: any[]) => void;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

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

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
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
      // Cleanup TensorFlow memory
      if (model) {
        tf.dispose(model);
      }
    };
  }, [enabled, settings.maxFaces, settings.minConfidence]);

  useEffect(() => {
    let animationFrame: number;
    let isDetecting = false;

    const detectFaces = async () => {
      if (!model || !videoRef.current || !canvasRef.current || !enabled || isDetecting || isLoading) {
        return;
      }

      isDetecting = true;

      try {
        // Convert video frame to tensor
        const videoTensor = tf.browser.fromPixels(videoRef.current);
        
        // Run detection
        const predictions = await model.estimateFaces(videoTensor, false);
        
        if (onFacesDetected) {
          onFacesDetected(predictions);
        }

        if (settings.drawBoxes) {
          drawFaceBoxes(predictions);
        }

        // Clean up tensor
        videoTensor.dispose();
      } catch (err) {
        console.error('Face detection error:', err);
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
  }, [model, enabled, isLoading, onFacesDetected, settings.drawBoxes]);

  const drawFaceBoxes = (predictions: any[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    predictions.forEach((prediction) => {
      if (prediction.probability[0] >= (settings.minConfidence || 0.5)) {
        const start = prediction.topLeft;
        const end = prediction.bottomRight;
        const size = [end[0] - start[0], end[1] - start[1]];

        // Draw face box
        ctx.strokeStyle = '#E44E51';
        ctx.lineWidth = 2;
        ctx.strokeRect(start[0], start[1], size[0], size[1]);

        // Draw confidence score
        ctx.fillStyle = '#E44E51';
        ctx.font = '12px Arial';
        ctx.fillText(
          `${Math.round(prediction.probability[0] * 100)}%`,
          start[0],
          start[1] - 5
        );

        // Draw landmarks
        prediction.landmarks.forEach((landmark: number[]) => {
          ctx.fillStyle = '#E44E51';
          ctx.beginPath();
          ctx.arc(landmark[0], landmark[1], 2, 0, 2 * Math.PI);
          ctx.fill();
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