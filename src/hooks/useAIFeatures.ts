import { useState, useCallback, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { SupportedModels } from '@tensorflow-models/body-segmentation';

interface AIFeatures {
  [key: string]: {
    enabled: boolean;
    sensitivity: number;
  };
}

interface Models {
  faceDetection?: blazeface.BlazeFaceModel;
  bodySegmentation?: bodySegmentation.BodySegmenter;
  faceLandmarks?: faceLandmarksDetection.FaceLandmarksDetector;
  handPose?: handPoseDetection.HandDetector;
}

export const useAIFeatures = () => {
  const [features, setFeatures] = useState<AIFeatures>({
    faceDetection: { enabled: false, sensitivity: 0.5 },
    facialLandmarks: { enabled: false, sensitivity: 0.5 },
    handPoseEstimation: { enabled: false, sensitivity: 0.5 },
    bodyPoseEstimation: { enabled: false, sensitivity: 0.5 },
    beautification: { enabled: false, sensitivity: 0.5 },
    backgroundBlur: { enabled: false, sensitivity: 0.5 },
    autoFraming: { enabled: false, sensitivity: 0.5 },
    expressionDetection: { enabled: false, sensitivity: 0.5 },
    enhancedLighting: { enabled: false, sensitivity: 0.5 },
    sceneDetection: { enabled: false, sensitivity: 0.5 },
    noiseReduction: { enabled: false, sensitivity: 0.5 },
    colorEnhancement: { enabled: false, sensitivity: 0.5 },
    stabilization: { enabled: false, sensitivity: 0.5 },
    autoExposure: { enabled: false, sensitivity: 0.5 },
    denoising: { enabled: false, sensitivity: 0.5 },
    objectDetection: { enabled: false, sensitivity: 0.5 }
  });

  const [models, setModels] = useState<Models>({});
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [activeModels, setActiveModels] = useState<string[]>([]);

  // Keep track of which models have been loaded
  const loadedModelTypes = useRef<Set<string>>(new Set());

  const loadModels = useCallback(async () => {
    try {
      setIsModelsLoading(true);
      
      // Make sure TensorFlow is ready
      await tf.ready();
      tf.enableProdMode(); // Optimize for performance
      
      console.log('TensorFlow.js ready, backend:', tf.getBackend());
      
      const loadedModels: Models = {};
      const newModelsLoaded = new Set(loadedModelTypes.current);
      
      // Load face detection model if not already loaded and needed
      if (features.faceDetection.enabled && !loadedModelTypes.current.has('faceDetection')) {
        console.log('Loading face detection model...');
        try {
          loadedModels.faceDetection = await blazeface.load({
            maxFaces: 10,
            inputWidth: 224,
            inputHeight: 224,
            iouThreshold: 0.3,
            scoreThreshold: features.faceDetection.sensitivity
          });
          newModelsLoaded.add('faceDetection');
          console.log('Face detection model loaded successfully');
        } catch (error) {
          console.error('Failed to load face detection model:', error);
        }
      }

      // Load facial landmarks detection if not already loaded and needed
      if (features.facialLandmarks.enabled && !loadedModelTypes.current.has('facialLandmarks')) {
        console.log('Loading facial landmarks model...');
        try {
          loadedModels.faceLandmarks = await faceLandmarksDetection.load(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
              refineLandmarks: true,
              maxFaces: 5
            }
          );
          newModelsLoaded.add('facialLandmarks');
          console.log('Facial landmarks model loaded successfully');
        } catch (error) {
          console.error('Failed to load facial landmarks model:', error);
        }
      }

      // Load hand pose detection if not already loaded and needed
      if (features.handPoseEstimation.enabled && !loadedModelTypes.current.has('handPose')) {
        console.log('Loading hand pose model...');
        try {
          loadedModels.handPose = await handPoseDetection.load(
            handPoseDetection.SupportedModels.MediaPipeHands,
            {
              runtime: 'tfjs',
              maxHands: 2,
              modelType: 'full'
            }
          );
          newModelsLoaded.add('handPose');
          console.log('Hand pose model loaded successfully');
        } catch (error) {
          console.error('Failed to load hand pose model:', error);
        }
      }

      // Load body segmentation if not already loaded and needed
      if ((features.backgroundBlur.enabled || features.bodyPoseEstimation.enabled) && 
         !loadedModelTypes.current.has('bodySegmentation')) {
        console.log('Loading body segmentation model...');
        try {
          loadedModels.bodySegmentation = await bodySegmentation.createSegmenter(
            bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
            {
              runtime: 'tfjs',
              modelType: 'general'
            }
          );
          newModelsLoaded.add('bodySegmentation');
          console.log('Body segmentation model loaded successfully');
        } catch (error) {
          console.error('Failed to load body segmentation model:', error);
        }
      }

      // Update loaded model types
      loadedModelTypes.current = newModelsLoaded;
      
      // Add existing models to the loaded models object
      for (const [key, model] of Object.entries(models)) {
        if (!loadedModels[key]) {
          loadedModels[key] = model;
        }
      }
      
      setModels(loadedModels);
      setIsModelsLoaded(Object.keys(loadedModels).length > 0);
      console.log('AI models loaded successfully');
    } catch (error) {
      console.error('Failed to initialize TensorFlow:', error);
    } finally {
      setIsModelsLoading(false);
    }
  }, [features, models]);

  // Update active models when features change
  useEffect(() => {
    const active = Object.entries(features)
      .filter(([_, value]) => value.enabled)
      .map(([key]) => key);
    
    setActiveModels(active);
    
    // If we have new active models that require loading, load them
    const needsModelLoading = active.some(model => {
      if (model === 'faceDetection' && !loadedModelTypes.current.has('faceDetection')) return true;
      if (model === 'facialLandmarks' && !loadedModelTypes.current.has('facialLandmarks')) return true;
      if (model === 'handPoseEstimation' && !loadedModelTypes.current.has('handPose')) return true;
      if ((model === 'backgroundBlur' || model === 'bodyPoseEstimation') && 
          !loadedModelTypes.current.has('bodySegmentation')) return true;
      return false;
    });
    
    if (needsModelLoading && !isModelsLoading) {
      loadModels();
    }
  }, [features, isModelsLoading, loadModels]);

  const toggleFeature = useCallback((featureId: string) => {
    setFeatures(prev => {
      const newFeatures = {
        ...prev,
        [featureId]: {
          ...prev[featureId],
          enabled: !prev[featureId].enabled
        }
      };
      return newFeatures;
    });
  }, []);

  const updateFeatureSettings = useCallback((featureId: string, settings: any) => {
    setFeatures(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        ...settings
      }
    }));
  }, []);

  const processFrame = useCallback(async (
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ) => {
    if (!isModelsLoaded) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Draw original frame
    ctx.drawImage(videoElement, 0, 0);

    // Apply enabled AI features
    if (features.faceDetection.enabled && models.faceDetection) {
      try {
        const predictions = await models.faceDetection.estimateFaces(videoElement, false);
        predictions.forEach(prediction => {
          const start = prediction.topLeft as [number, number];
          const end = prediction.bottomRight as [number, number];
          const size = [end[0] - start[0], end[1] - start[1]];

          ctx.strokeStyle = '#E44E51';
          ctx.lineWidth = 2;
          ctx.strokeRect(start[0], start[1], size[0], size[1]);
          
          // Draw confidence
          ctx.fillStyle = '#E44E51';
          ctx.font = '12px Arial';
          ctx.fillText(
            `${Math.round(prediction.probability[0] * 100)}%`, 
            start[0], start[1] - 5
          );
        });
      } catch (error) {
        console.error('Error in face detection:', error);
      }
    }

    if (features.facialLandmarks.enabled && models.faceLandmarks) {
      try {
        const predictions = await models.faceLandmarks.estimateFaces({
          input: videoElement,
          returnTensors: false,
          flipHorizontal: false,
          predictIrises: true
        });
        
        predictions.forEach(prediction => {
          const keypoints = prediction.scaledMesh;
          
          // Draw facial mesh points
          ctx.fillStyle = '#E44E51';
          for (let i = 0; i < keypoints.length; i++) {
            const [x, y] = keypoints[i];
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      } catch (error) {
        console.error('Error in facial landmark detection:', error);
      }
    }

    if (features.backgroundBlur.enabled && models.bodySegmentation) {
      try {
        const segmentation = await models.bodySegmentation.segmentPeople(videoElement);
        
        if (segmentation.length > 0) {
          // Get foreground mask
          const foregroundMask = await bodySegmentation.toBinaryMask(
            segmentation,
            { r: 0, g: 0, b: 0, a: 0 },
            { r: 0, g: 0, b: 0, a: 255 }
          );
          
          // Apply blur effect
          ctx.save();
          
          // Draw blurred background
          ctx.filter = `blur(${10 * features.backgroundBlur.sensitivity}px)`;
          ctx.drawImage(videoElement, 0, 0);
          ctx.filter = 'none';
          
          // Create composite with the original foreground
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasElement.width;
          tempCanvas.height = canvasElement.height;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            tempCtx.drawImage(videoElement, 0, 0);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(foregroundMask, 0, 0);
            
            // Draw the foreground onto the main canvas
            ctx.drawImage(tempCanvas, 0, 0);
          }
          
          ctx.restore();
        }
      } catch (error) {
        console.error('Error in background blur:', error);
      }
    }

    if (features.handPoseEstimation.enabled && models.handPose) {
      try {
        const predictions = await models.handPose.estimateHands(videoElement);
        
        predictions.forEach(hand => {
          // Draw landmarks
          const landmarks = hand.keypoints;
          ctx.fillStyle = '#00FF00';
          
          for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }
          
          // Connect fingers with lines
          const fingers = [
            [0, 1, 2, 3, 4],            // thumb
            [0, 5, 6, 7, 8],            // index finger
            [0, 9, 10, 11, 12],         // middle finger
            [0, 13, 14, 15, 16],        // ring finger
            [0, 17, 18, 19, 20]         // pinky
          ];
          
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          
          for (const finger of fingers) {
            for (let i = 0; i < finger.length - 1; i++) {
              const start = landmarks[finger[i]];
              const end = landmarks[finger[i + 1]];
              
              if (start && end) {
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
              }
            }
          }
        });
      } catch (error) {
        console.error('Error in hand pose estimation:', error);
      }
    }

    // Add other feature processing here

  }, [features, models, isModelsLoaded]);

  return {
    features,
    toggleFeature,
    updateFeatureSettings,
    loadModels,
    processFrame,
    isModelsLoaded,
    isModelsLoading,
    activeModels
  };
};