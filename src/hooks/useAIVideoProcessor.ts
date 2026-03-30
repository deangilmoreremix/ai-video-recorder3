import { useRef, useCallback, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

interface UseAIVideoProcessorOptions {
  enabled: boolean;
  backgroundBlur?: boolean;
  backgroundRemoval?: boolean;
  faceDetection?: boolean;
  beautification?: boolean;
}

interface UseAIVideoProcessorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  processedStream: MediaStream | null;
  isProcessing: boolean;
  startProcessing: (sourceVideo: HTMLVideoElement) => void;
  stopProcessing: () => void;
}

export const useAIVideoProcessor = (
  options: UseAIVideoProcessorOptions = { enabled: false }
): UseAIVideoProcessorReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const modelsRef = useRef<{
    faceDetection?: blazeface.BlazeFaceModel;
    bodySegmentation?: bodySegmentation.BodySegmenter;
  }>({});
  
  const featuresRef = useRef<UseAIVideoProcessorOptions>(options);

  useEffect(() => {
    featuresRef.current = options;
  }, [options]);

  const loadModels = useCallback(async () => {
    try {
      await tf.ready();
      const features = featuresRef.current;
      const loaded = modelsRef.current;
      
      if ((features.faceDetection || features.beautification) && !loaded.faceDetection) {
        loaded.faceDetection = await blazeface.load({ maxFaces: 5 });
      }
      
      if ((features.backgroundBlur || features.backgroundRemoval) && !loaded.bodySegmentation) {
        loaded.bodySegmentation = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation
        );
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  }, []);

  const processFrame = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const features = featuresRef.current;
    const models = modelsRef.current;
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply background blur
    if (features.backgroundBlur && models.bodySegmentation) {
      try {
        const segmentation = await models.bodySegmentation.segmentPeople(video);
        if (segmentation.length > 0 && segmentation[0].mask) {
          ctx.save();
          ctx.filter = 'blur(20px)';
          ctx.drawImage(canvas, 0, 0);
          ctx.restore();
          ctx.drawImage(video, 0, 0);
        }
      } catch (error) {
        console.error('Background blur error:', error);
      }
    }
    
    // Draw face detection boxes
    if (features.faceDetection && models.faceDetection) {
      try {
        const predictions = await models.faceDetection.estimateFaces(video);
        predictions.forEach(prediction => {
          const start = prediction.topLeft as [number, number];
          const end = prediction.bottomRight as [number, number];
          const size = [end[0] - start[0], end[1] - start[1]];
          
          ctx.strokeStyle = '#E44E51';
          ctx.lineWidth = 3;
          ctx.strokeRect(start[0], start[1], size[0], size[1]);
          
          const confidence = (prediction.probability[0] * 100).toFixed(1);
          ctx.fillStyle = '#E44E51';
          ctx.font = '16px sans-serif';
          ctx.fillText(`${confidence}%`, start[0], start[1] - 5);
        });
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }
    
    // Apply beautification
    if (features.beautification) {
      ctx.save();
      ctx.filter = 'brightness(1.05) saturate(1.1)';
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    }
  }, []);

  const processVideo = useCallback(async (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const process = async () => {
      if (!isProcessing) return;
      try {
        await processFrame(video, canvas);
      } catch (error) {
        console.error('Frame processing error:', error);
      }
      if (isProcessing) {
        animationFrameRef.current = requestAnimationFrame(() => process());
      }
    };
    process();
  }, [isProcessing, processFrame]);

  const startProcessing = useCallback((sourceVideo: HTMLVideoElement) => {
    if (!canvasRef.current) return;
    loadModels();
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const stream = canvas.captureStream(30);
    setProcessedStream(stream);
    processVideo(sourceVideo);
  }, [loadModels, processVideo]);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (processedStream) {
      processedStream.getTracks().forEach(track => track.stop());
      setProcessedStream(null);
    }
  }, [processedStream]);

  useEffect(() => {
    return () => {
      stopProcessing();
    };
  }, [stopProcessing]);

  return { canvasRef, processedStream, isProcessing, startProcessing, stopProcessing };
};
