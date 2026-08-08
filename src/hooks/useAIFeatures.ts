import { useState, useCallback, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { SupportedModels } from '@tensorflow-models/body-segmentation';

export interface AIFeature {
  enabled: boolean;
  sensitivity: number;
  loaded?: boolean;
  loading?: boolean;
  error?: string;
}

export interface AIFeatures {
  [key: string]: AIFeature;
}

interface Models {
  faceDetection?: blazeface.BlazeFaceModel;
  bodySegmentation?: bodySegmentation.BodySegmenter;
  faceLandmarks?: faceLandmarksDetection.FaceLandmarksDetector;
  handPose?: handPoseDetection.HandDetector;
}

// Contour indices for the MediaPipe FaceMesh keypoints (lips, eyes, irises, ...)
const FACE_MESH_CONTOURS = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);

// blazeface returns plain numbers when `returnTensors` is false, but its types
// still allow tensors - normalize both shapes without leaking tensors.
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

// Bounding box of a set of face mesh keypoints (the v1 API exposes `box`)
const getFaceBox = (face: faceLandmarksDetection.Face) => {
  const box = face.box;
  if (box) {
    return { x: box.xMin, y: box.yMin, width: box.width, height: box.height };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of face.keypoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const useAIFeatures = () => {
  const [features, setFeatures] = useState<AIFeatures>({
    // Face & Pose Features
    faceDetection: { enabled: false, sensitivity: 0.5 },
    facialLandmarks: { enabled: false, sensitivity: 0.5 },
    poseEstimation: { enabled: false, sensitivity: 0.5 },
    handPoseEstimation: { enabled: false, sensitivity: 0.5 },
    
    // Background Modifications
    backgroundRemoval: { enabled: false, sensitivity: 0.5 },
    backgroundBlur: { enabled: false, sensitivity: 0.5 },
    
    // Analysis Features
    speechRecognition: { enabled: false, sensitivity: 0.5 },
    sentimentAnalysis: { enabled: false, sensitivity: 0.5 },
    gestureRecognition: { enabled: false, sensitivity: 0.5 },
    expressionDetection: { enabled: false, sensitivity: 0.5 },
    sceneDetection: { enabled: false, sensitivity: 0.5 },
    sceneSegmentation: { enabled: false, sensitivity: 0.5 },
    
    // Enhancement Features
    beautification: { enabled: false, sensitivity: 0.5 },
    superResolution: { enabled: false, sensitivity: 0.5 },
    styleTransfer: { enabled: false, sensitivity: 0.5 },
    autoFraming: { enabled: false, sensitivity: 0.5 },
    enhancedLighting: { enabled: false, sensitivity: 0.5 },
    colorEnhancement: { enabled: false, sensitivity: 0.5 },
    
    // Correction Features
    stabilization: { enabled: false, sensitivity: 0.5 },
    noiseReduction: { enabled: false, sensitivity: 0.5 },
    denoising: { enabled: false, sensitivity: 0.5 },
    autoExposure: { enabled: false, sensitivity: 0.5 }
  });

  const [models, setModels] = useState<Models>({});
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [processingQuality, setProcessingQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // Keep track of which models have been loaded
  const loadedModelTypes = useRef<Set<string>>(new Set());

  // Mirrors of the state used by async/long-lived callbacks so that
  // `loadModels` stays referentially stable and never reloads on every render.
  const modelsRef = useRef<Models>({});
  const featuresRef = useRef(features);
  const processingQualityRef = useRef(processingQuality);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  useEffect(() => {
    processingQualityRef.current = processingQuality;
  }, [processingQuality]);

  // Reusable offscreen canvases - allocating one per frame trashes memory
  // and the GC during continuous processing.
  const scratchCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const getScratchCanvas = useCallback((key: string, width: number, height: number) => {
    let canvas = scratchCanvases.current.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      scratchCanvases.current.set(key, canvas);
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return canvas;
  }, []);

  // Performance monitoring
  const fpsCounter = useRef({ frames: 0, lastTime: 0, fps: 0 });
  const updateFPS = useCallback(() => {
    const now = performance.now();

    // First sample: only prime the counter, an "elapsed since epoch" reading
    // would otherwise immediately force the quality down to 'low'.
    if (fpsCounter.current.lastTime === 0) {
      fpsCounter.current.lastTime = now;
      fpsCounter.current.frames = 1;
      return;
    }

    const elapsed = now - fpsCounter.current.lastTime;

    if (elapsed >= 1000) { // Update every second
      fpsCounter.current.fps = fpsCounter.current.frames * (1000 / elapsed);
      fpsCounter.current.frames = 0;
      fpsCounter.current.lastTime = now;

      // Auto-adjust quality based on FPS
      if (fpsCounter.current.fps < 15 && processingQualityRef.current !== 'low') {
        setProcessingQuality('low');
      } else if (fpsCounter.current.fps > 25 && processingQualityRef.current === 'low') {
        setProcessingQuality('medium');
      }
    }

    fpsCounter.current.frames++;
  }, []);

  // Load TensorFlow.js and prepare backend
  useEffect(() => {
    let cancelled = false;

    const initTensorFlow = async () => {
      try {
        await tf.ready();
        if (cancelled) return;

        const backend = tf.getBackend();
        console.log(`TensorFlow.js initialized with backend: ${backend}`);

        // Try to use WebGL if available for better performance
        if (backend !== 'webgl') {
          try {
            const switched = await tf.setBackend('webgl');
            if (switched) {
              await tf.ready();
              console.log('Switched to WebGL backend');
            }
          } catch (backendError) {
            console.warn('WebGL backend unavailable, staying on', backend, backendError);
          }
        }

        // Configure memory management
        if (tf.getBackend() === 'webgl') {
          tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
          console.log('Configured aggressive texture cleanup');
        }

      } catch (err) {
        console.error('Failed to initialize TensorFlow.js:', err);
      }
    };

    initTensorFlow();

    return () => {
      cancelled = true;
    };
  }, []);

  // Release model + canvas resources when the hook is unmounted. `tf.disposeVariables()`
  // is intentionally NOT used here: it is global and would break any other model
  // still alive in the app.
  useEffect(() => {
    const canvases = scratchCanvases.current;
    return () => {
      const loaded = modelsRef.current;
      (Object.keys(loaded) as (keyof Models)[]).forEach(key => {
        try {
          loaded[key]?.dispose();
        } catch (error) {
          console.warn(`Failed to dispose ${key} model:`, error);
        }
      });
      modelsRef.current = {};
      loadedModelTypes.current = new Set();
      canvases.clear();
    };
  }, []);

  const loadModels = useCallback(async () => {
    // Guard against concurrent loads: `isModelsLoading` state lags behind and
    // would let two effect runs download the same model twice.
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setIsModelsLoading(true);
      
      // Make sure TensorFlow is ready
      await tf.ready();
      
      console.log('TensorFlow.js ready, backend:', tf.getBackend());
      
      const features = featuresRef.current;
      const processingQuality = processingQualityRef.current;
      const loadedModels: Models = {};
      const newModelsLoaded = new Set(loadedModelTypes.current);
      
      // Determine which models need to be loaded based on enabled features
      const needFaceDetection = features.faceDetection.enabled ||
                               features.facialLandmarks.enabled ||
                               features.expressionDetection.enabled ||
                               features.beautification.enabled;
      
      const needFaceLandmarks = features.facialLandmarks.enabled ||
                               features.expressionDetection.enabled ||
                               features.beautification.enabled;
      
      const needBodySegmentation = features.backgroundRemoval.enabled ||
                                  features.backgroundBlur.enabled ||
                                  features.poseEstimation.enabled ||
                                  features.sceneSegmentation.enabled;
      
      const needHandPose = features.handPoseEstimation.enabled ||
                          features.gestureRecognition.enabled;
      
      // Update feature loading status
      const updateFeatureStatus = (featureId: string, status: 'loading' | 'loaded' | 'error', errorMsg?: string) => {
        setFeatures(prev => ({
          ...prev,
          [featureId]: {
            ...prev[featureId],
            loading: status === 'loading',
            loaded: status === 'loaded',
            error: status === 'error' ? errorMsg : undefined
          }
        }));
      };
      
      // Load face detection model if needed
      if (needFaceDetection && !loadedModelTypes.current.has('faceDetection')) {
        console.log('Loading face detection model...');
        updateFeatureStatus('faceDetection', 'loading');
        
        try {
          loadedModels.faceDetection = await blazeface.load({
            maxFaces: 10,
            inputWidth: processingQuality === 'low' ? 128 : 224,
            inputHeight: processingQuality === 'low' ? 128 : 224,
            iouThreshold: 0.3,
            scoreThreshold: features.faceDetection.sensitivity
          });
          newModelsLoaded.add('faceDetection');
          updateFeatureStatus('faceDetection', 'loaded');
          console.log('Face detection model loaded successfully');
        } catch (error) {
          console.error('Failed to load face detection model:', error);
          updateFeatureStatus('faceDetection', 'error', 'Failed to load face detection model');
        }
      }

      // Load facial landmarks detection if needed
      if (needFaceLandmarks && !loadedModelTypes.current.has('facialLandmarks')) {
        console.log('Loading facial landmarks model...');
        updateFeatureStatus('facialLandmarks', 'loading');
        
        try {
          loadedModels.faceLandmarks = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
              runtime: 'tfjs',
              refineLandmarks: processingQuality !== 'low',
              maxFaces: processingQuality === 'low' ? 1 : (processingQuality === 'medium' ? 2 : 5)
            }
          );
          newModelsLoaded.add('facialLandmarks');
          updateFeatureStatus('facialLandmarks', 'loaded');
          console.log('Facial landmarks model loaded successfully');
        } catch (error) {
          console.error('Failed to load facial landmarks model:', error);
          updateFeatureStatus('facialLandmarks', 'error', 'Failed to load facial landmarks model');
        }
      }

      // Load hand pose detection if needed
      if (needHandPose && !loadedModelTypes.current.has('handPose')) {
        console.log('Loading hand pose model...');
        updateFeatureStatus('handPoseEstimation', 'loading');
        updateFeatureStatus('gestureRecognition', 'loading');
        
        try {
          loadedModels.handPose = await handPoseDetection.createDetector(
            handPoseDetection.SupportedModels.MediaPipeHands,
            {
              runtime: 'tfjs',
              maxHands: processingQuality === 'low' ? 1 : 2,
              modelType: processingQuality === 'high' ? 'full' : 'lite'
            }
          );
          newModelsLoaded.add('handPose');
          updateFeatureStatus('handPoseEstimation', 'loaded');
          updateFeatureStatus('gestureRecognition', 'loaded');
          console.log('Hand pose model loaded successfully');
        } catch (error) {
          console.error('Failed to load hand pose model:', error);
          updateFeatureStatus('handPoseEstimation', 'error', 'Failed to load hand pose model');
          updateFeatureStatus('gestureRecognition', 'error', 'Failed to load hand pose model');
        }
      }

      // Load body segmentation if needed
      if (needBodySegmentation && !loadedModelTypes.current.has('bodySegmentation')) {
        console.log('Loading body segmentation model...');
        updateFeatureStatus('backgroundRemoval', 'loading');
        updateFeatureStatus('backgroundBlur', 'loading');
        updateFeatureStatus('poseEstimation', 'loading');
        
        try {
          loadedModels.bodySegmentation = await bodySegmentation.createSegmenter(
            SupportedModels.MediaPipeSelfieSegmentation,
            {
              runtime: 'tfjs',
              modelType: processingQuality === 'low' ? 'landscape' : 'general'
            }
          );
          newModelsLoaded.add('bodySegmentation');
          updateFeatureStatus('backgroundRemoval', 'loaded');
          updateFeatureStatus('backgroundBlur', 'loaded');
          updateFeatureStatus('poseEstimation', 'loaded');
          console.log('Body segmentation model loaded successfully');
        } catch (error) {
          console.error('Failed to load body segmentation model:', error);
          updateFeatureStatus('backgroundRemoval', 'error', 'Failed to load body segmentation model');
          updateFeatureStatus('backgroundBlur', 'error', 'Failed to load body segmentation model');
          updateFeatureStatus('poseEstimation', 'error', 'Failed to load body segmentation model');
        }
      }

      // Update loaded model types
      loadedModelTypes.current = newModelsLoaded;
      
      // Keep the previously loaded models around - a failed/skipped load must
      // never drop a model that is already in use.
      modelsRef.current = { ...modelsRef.current, ...loadedModels };

      setModels(modelsRef.current);
      setIsModelsLoaded(Object.keys(modelsRef.current).length > 0);
      console.log('AI models loaded successfully');
    } catch (error) {
      console.error('Failed to initialize TensorFlow:', error);
    } finally {
      isLoadingRef.current = false;
      setIsModelsLoading(false);
    }
  }, []);

  // Update active models when features change
  useEffect(() => {
    const active = Object.entries(features)
      .filter(entry => entry[1].enabled)
      .map(([key]) => key);
    
    setActiveModels(active);
    
    // Check if we need to load models based on enabled features
    const needModelLoading = active.some(feature => {
      switch(feature) {
        case 'faceDetection':
        case 'facialLandmarks':
        case 'expressionDetection':
        case 'beautification':
          return !loadedModelTypes.current.has('faceDetection') || 
                 !loadedModelTypes.current.has('facialLandmarks');
          
        case 'handPoseEstimation':
        case 'gestureRecognition':
          return !loadedModelTypes.current.has('handPose');
          
        case 'backgroundRemoval':
        case 'backgroundBlur':
        case 'poseEstimation':
        case 'sceneSegmentation':
          return !loadedModelTypes.current.has('bodySegmentation');
          
        default:
          return false;
      }
    });
    
    if (needModelLoading && !isLoadingRef.current) {
      loadModels();
    }
  }, [features, loadModels]);

  const toggleFeature = useCallback((featureId: string) => {
    setFeatures(prev => {
      // Special handling for dependencies
      const newFeatures = { ...prev };
      
      // Handle dependencies between features
      if (featureId === 'facialLandmarks' && !prev.faceDetection.enabled && !prev.facialLandmarks.enabled) {
        newFeatures.faceDetection = { ...prev.faceDetection, enabled: true };
      }
      
      if (featureId === 'expressionDetection' && !prev.facialLandmarks.enabled && !prev.expressionDetection.enabled) {
        newFeatures.facialLandmarks = { ...prev.facialLandmarks, enabled: true };
        if (!prev.faceDetection.enabled) {
          newFeatures.faceDetection = { ...prev.faceDetection, enabled: true };
        }
      }
      
      if (featureId === 'gestureRecognition' && !prev.handPoseEstimation.enabled && !prev.gestureRecognition.enabled) {
        newFeatures.handPoseEstimation = { ...prev.handPoseEstimation, enabled: true };
      }
      
      // Toggle the requested feature
      newFeatures[featureId] = {
        ...prev[featureId],
        enabled: !prev[featureId].enabled
      };
      
      return newFeatures;
    });
  }, []);

  const updateFeatureSettings = useCallback((featureId: string, settings: Partial<AIFeature>) => {
    setFeatures(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        ...settings
      }
    }));
  }, []);

  // Apply visual effects to canvas
  const applyVisualEffects = useCallback((
    ctx: CanvasRenderingContext2D, 
    videoElement: HTMLVideoElement,
    effects: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      blur?: number;
      sharpness?: number;
      exposure?: number;
      temperature?: number;
      vignette?: number;
      grain?: number;
    }
  ) => {
    // Apply filters based on enabled effects
    const filters = [];
    
    if (effects.brightness !== undefined && effects.brightness !== 1) {
      filters.push(`brightness(${effects.brightness})`);
    }
    
    if (effects.contrast !== undefined && effects.contrast !== 1) {
      filters.push(`contrast(${effects.contrast})`);
    }
    
    if (effects.saturation !== undefined && effects.saturation !== 1) {
      filters.push(`saturate(${effects.saturation})`);
    }
    
    if (effects.blur !== undefined && effects.blur > 0) {
      filters.push(`blur(${effects.blur}px)`);
    }
    
    if (filters.length > 0) {
      ctx.filter = filters.join(' ');
    }
    
    // Draw the video frame
    ctx.drawImage(videoElement, 0, 0);
    
    // Reset filters
    if (filters.length > 0) {
      ctx.filter = 'none';
    }
    
    // Apply effects that can't be done with CSS filters
    if (effects.vignette !== undefined && effects.vignette > 0) {
      const centerX = ctx.canvas.width / 2;
      const centerY = ctx.canvas.height / 2;
      const radius = Math.max(ctx.canvas.width, ctx.canvas.height) / 2;
      
      // Create radial gradient for vignette
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.5,
        centerX, centerY, radius
      );
      
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${effects.vignette})`);
      
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Apply film grain if enabled
    if (effects.grain !== undefined && effects.grain > 0) {
      // Use a smaller, reused canvas for performance
      const grainCanvas = getScratchCanvas(
        'grain',
        Math.max(1, Math.floor(ctx.canvas.width / 4)),
        Math.max(1, Math.floor(ctx.canvas.height / 4))
      );
      const grainCtx = grainCanvas.getContext('2d');
      
      if (grainCtx) {
        const grainData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
        const intensity = effects.grain * 255;
        
        for (let i = 0; i < grainData.data.length; i += 4) {
          const value = Math.random() * intensity - intensity / 2;
          grainData.data[i] = value;
          grainData.data[i+1] = value;
          grainData.data[i+2] = value;
          grainData.data[i+3] = 40; // Semi-transparent grain
        }
        
        grainCtx.putImageData(grainData, 0, 0);
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = effects.grain;
        ctx.drawImage(grainCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, [getScratchCanvas]);

  // Process a video frame with all enabled AI features
  const processFrame = useCallback(async (
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ) => {
    if (!isModelsLoaded) return;

    // The video may not have decoded a frame yet - `videoWidth === 0` makes
    // both drawImage and tf.browser.fromPixels throw.
    if (videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) {
      return;
    }

    updateFPS();

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Match canvas size to video
    if (canvasElement.width !== videoElement.videoWidth || 
        canvasElement.height !== videoElement.videoHeight) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    }

    // Draw original frame
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(videoElement, 0, 0);

    // Process with TensorFlow models if any feature is enabled
    const needsAIProcessing = Object.values(features).some(f => f.enabled);
    
    if (!needsAIProcessing) {
      return; // Skip AI processing if no features are enabled
    }

    // Created below - kept outside the try so the `finally` block can always
    // dispose it, including on early returns/exceptions.
    let inputTensor: tf.Tensor3D | null = null;

    try {
      // Create a tensor from the video frame (at reduced size for performance if needed)
      let processScale = 1;
      
      if (processingQuality === 'low') {
        processScale = 0.5; // Process at half resolution for performance
      } else if (processingQuality === 'medium') {
        processScale = 0.75;
      }
      
      if (processScale !== 1) {
        const inputCanvas = getScratchCanvas(
          'input',
          Math.max(1, Math.round(videoElement.videoWidth * processScale)),
          Math.max(1, Math.round(videoElement.videoHeight * processScale))
        );
        const inputCtx = inputCanvas.getContext('2d');
        if (inputCtx) {
          inputCtx.drawImage(videoElement, 0, 0, inputCanvas.width, inputCanvas.height);
          inputTensor = tf.browser.fromPixels(inputCanvas);
        } else {
          // Fall back to full resolution - the scale must be reset as well or
          // every detection would be drawn at the wrong coordinates.
          processScale = 1;
          inputTensor = tf.browser.fromPixels(videoElement);
        }
      } else {
        inputTensor = tf.browser.fromPixels(videoElement);
      }

      // Apply features that affect the whole image
      if (features.colorEnhancement.enabled) {
        applyVisualEffects(ctx, videoElement, {
          brightness: 1 + features.colorEnhancement.sensitivity * 0.2,
          contrast: 1 + features.colorEnhancement.sensitivity * 0.2,
          saturation: 1 + features.colorEnhancement.sensitivity * 0.3
        });
      }

      if (features.enhancedLighting.enabled) {
        applyVisualEffects(ctx, videoElement, {
          brightness: 1 + features.enhancedLighting.sensitivity * 0.3,
          contrast: 1 + features.enhancedLighting.sensitivity * 0.1
        });
      }

      // Apply face detection if enabled
      if ((features.faceDetection.enabled || features.facialLandmarks.enabled || 
           features.expressionDetection.enabled || features.beautification.enabled) && 
           models.faceDetection) {
        try {
          // Use the model to detect faces
          const predictions = await models.faceDetection.estimateFaces(inputTensor, false);
          
          // Draw face detection boxes if enabled
          if (features.faceDetection.enabled) {
            predictions.forEach(prediction => {
              const start = toPoint(prediction.topLeft);
              const end = toPoint(prediction.bottomRight);
              if (!start || !end) return;

              const size = [
                (end[0] - start[0]) / processScale, 
                (end[1] - start[1]) / processScale
              ];
              const adjustedStart = [start[0] / processScale, start[1] / processScale];
    
              ctx.strokeStyle = '#E44E51';
              ctx.lineWidth = 2;
              ctx.strokeRect(adjustedStart[0], adjustedStart[1], size[0], size[1]);
              
              // Draw confidence
              const probability = toNumber(prediction.probability);
              if (probability !== undefined) {
                ctx.fillStyle = '#E44E51';
                ctx.font = '12px Arial';
                ctx.fillText(
                  `${Math.round(probability * 100)}%`, 
                  adjustedStart[0], adjustedStart[1] - 5
                );
              }
            });
          }
          
          // Apply facial landmarks if enabled
          if (features.facialLandmarks.enabled && models.faceLandmarks && predictions.length > 0) {
            const facePredictions = await models.faceLandmarks.estimateFaces(videoElement, {
              flipHorizontal: false,
              staticImageMode: false
            });
            
            facePredictions.forEach(prediction => {
              const keypoints = prediction.keypoints;
              
              // Draw facial mesh points
              ctx.fillStyle = '#E44E51';
              for (let i = 0; i < keypoints.length; i += 5) { // Skip points for performance
                const point = keypoints[i];
                ctx.beginPath();
                ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
                ctx.fill();
              }
              
              // Draw facial contours (eyes, mouth, etc.)
              if (features.facialLandmarks.sensitivity > 0.7) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 1;
                
                ['leftEye', 'rightEye', 'lips'].forEach(part => {
                  const indices = FACE_MESH_CONTOURS[part];
                  if (!indices) return;
                  
                  ctx.beginPath();
                  indices.forEach((index, i) => {
                    const point = keypoints[index];
                    if (!point) return;
                    if (i === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                  });
                  ctx.closePath();
                  ctx.stroke();
                });
              }
            });
            
            // Apply expression detection if enabled
            if (features.expressionDetection.enabled && facePredictions.length > 0) {
              // This is a simplified version - actual expression detection would use a specific model
              // For now, we'll simulate expression detection based on facial landmarks
              facePredictions.forEach(prediction => {
                const keypoints = prediction.keypoints;
                const box = getFaceBox(prediction);
                if (!box) return;
                
                // Eye corners + inner lips of the MediaPipe face mesh
                const leftEye = keypoints[33];
                const rightEye = keypoints[263];
                const upperLip = keypoints[13];
                const lowerLip = keypoints[14];
                
                if (!leftEye || !rightEye || !upperLip || !lowerLip) return;
                
                // Calculate mouth openness (smile detection)
                const mouthOpenness = lowerLip.y - upperLip.y;
                const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
                
                // Normalize by face size (guard against a degenerate face mesh)
                if (eyeDistance <= 0) return;
                const normalizedMouthOpenness = mouthOpenness / eyeDistance;
                
                // Determine expression (very simplified)
                let expression = 'Neutral';
                if (normalizedMouthOpenness > 0.2) {
                  expression = 'Smiling';
                } else if (normalizedMouthOpenness < 0.05) {
                  expression = 'Serious';
                }
                
                // Display the expression
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(box.x, box.y - 30, 100, 25);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText(expression, box.x + 10, box.y - 10);
              });
            }
            
            // Apply beautification if enabled
            if (features.beautification.enabled) {
              // Real beautification would use more advanced techniques
              // This is a simple simulation using canvas filters
              const tempCanvas = getScratchCanvas('beautify', canvasElement.width, canvasElement.height);
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                // Draw the original image
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.filter = 'none';
                tempCtx.drawImage(canvasElement, 0, 0);
                
                // Apply beautification effects
                const intensity = features.beautification.sensitivity;
                tempCtx.filter = `saturate(${1 + intensity * 0.3}) brightness(${1 + intensity * 0.1}) contrast(${1 + intensity * 0.1})`;
                
                // Only apply beautification to face regions
                facePredictions.forEach(prediction => {
                  const box = getFaceBox(prediction);
                  if (!box) return;
                  
                  const margin = Math.min(box.width, box.height) * 0.2;
                  
                  // Expand the face region slightly
                  const x = Math.max(0, box.x - margin);
                  const y = Math.max(0, box.y - margin);
                  const width = Math.min(canvasElement.width - x, box.width + margin * 2);
                  const height = Math.min(canvasElement.height - y, box.height + margin * 2);
                  
                  if (width <= 0 || height <= 0) return;
                  
                  // Apply subtle skin smoothing (simulate by a slight blur + preserve edges)
                  tempCtx.filter = `blur(${intensity * 2}px)`;
                  tempCtx.drawImage(
                    canvasElement, 
                    x, y, width, height,  // Source rectangle
                    x, y, width, height   // Destination rectangle
                  );
                });
                
                // Copy back beautified face regions
                tempCtx.filter = 'none';
                ctx.drawImage(tempCanvas, 0, 0);
              }
            }
          }
        } catch (error) {
          console.error('Error in face detection/landmarks:', error);
        }
      }

      // Apply hand pose detection if enabled
      if ((features.handPoseEstimation.enabled || features.gestureRecognition.enabled) && 
           models.handPose) {
        try {
          const hands = await models.handPose.estimateHands(videoElement);
          
          if (features.handPoseEstimation.enabled) {
            // Draw hand landmarks
            hands.forEach(hand => {
              const landmarks = hand.keypoints;
              ctx.fillStyle = '#00FF00';
              
              // Draw hand keypoints
              for (const point of landmarks) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
              }
              
              // Connect keypoints to form hand skeleton
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 2;
              
              // Define connections between keypoints to create a skeleton
              const connections = [
                // Thumb
                [0, 1], [1, 2], [2, 3], [3, 4],
                // Index finger
                [0, 5], [5, 6], [6, 7], [7, 8],
                // Middle finger
                [0, 9], [9, 10], [10, 11], [11, 12],
                // Ring finger
                [0, 13], [13, 14], [14, 15], [15, 16],
                // Pinky finger
                [0, 17], [17, 18], [18, 19], [19, 20],
                // Palm
                [0, 5], [5, 9], [9, 13], [13, 17]
              ];
              
              for (const [i, j] of connections) {
                if (landmarks[i] && landmarks[j]) {
                  ctx.beginPath();
                  ctx.moveTo(landmarks[i].x, landmarks[i].y);
                  ctx.lineTo(landmarks[j].x, landmarks[j].y);
                  ctx.stroke();
                }
              }
            });
          }
          
          // Gesture recognition
          if (features.gestureRecognition.enabled && hands.length > 0) {
            hands.forEach(hand => {
              const keypoints = hand.keypoints;
              
              // Simple gesture detection
              const thumbTip = keypoints.find(k => k.name === 'thumb_tip');
              const indexTip = keypoints.find(k => k.name === 'index_finger_tip');
              const middleTip = keypoints.find(k => k.name === 'middle_finger_tip');
              const ringTip = keypoints.find(k => k.name === 'ring_finger_tip');
              const pinkyTip = keypoints.find(k => k.name === 'pinky_finger_tip');
              const wrist = keypoints.find(k => k.name === 'wrist');
              
              if (thumbTip && indexTip && middleTip && ringTip && pinkyTip && wrist) {
                // Calculate distances
                const thumbToIndex = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
                const thumbToWrist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
                
                // Determine gesture
                let gesture = '';
                
                // Fist detection - all finger tips close to wrist
                const allFingers = [indexTip, middleTip, ringTip, pinkyTip];
                const fingersExtended = allFingers.filter(finger => 
                  Math.hypot(finger.x - wrist.x, finger.y - wrist.y) > thumbToWrist * 0.6
                ).length;
                
                if (fingersExtended === 0) {
                  gesture = 'Fist';
                } else if (fingersExtended === 1 && 
                           Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) > thumbToWrist * 0.7) {
                  gesture = 'Pointing';
                } else if (fingersExtended === 2 && 
                           Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y) > thumbToWrist * 0.7 &&
                           Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y) > thumbToWrist * 0.7) {
                  gesture = 'Peace';
                } else if (thumbToIndex < 20) {
                  gesture = 'Pinch';
                } else if (fingersExtended >= 4) {
                  gesture = 'Open Hand';
                }
                
                if (gesture) {
                  // Display the detected gesture
                  const x = wrist.x;
                  const y = wrist.y - 20;
                  
                  ctx.fillStyle = 'rgba(0,0,0,0.6)';
                  ctx.fillRect(x - 10, y - 18, gesture.length * 10 + 20, 25);
                  
                  ctx.fillStyle = '#ffffff';
                  ctx.font = '16px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText(gesture, x + gesture.length * 5, y);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error in hand pose detection:', error);
        }
      }

      // Apply background effects if enabled
      if ((features.backgroundRemoval.enabled || features.backgroundBlur.enabled) && 
           models.bodySegmentation) {
        try {
          const segmentation = await models.bodySegmentation.segmentPeople(videoElement, {
            multiSegmentation: false,
            segmentBodyParts: false,
            segmentationThreshold: 0.5
          });
          
          if (segmentation.length > 0) {
            // Create foreground mask (ImageData - it has to be painted into a
            // canvas before it can be used as a compositing source).
            const foregroundMask = await bodySegmentation.toBinaryMask(
              segmentation,
              { r: 0, g: 0, b: 0, a: 0 },
              { r: 0, g: 0, b: 0, a: 255 }
            );

            const maskCanvas = getScratchCanvas('mask', foregroundMask.width, foregroundMask.height);
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) return;
            maskCtx.putImageData(foregroundMask, 0, 0);
            
            if (features.backgroundBlur.enabled) {
              // Apply blur effect to background
              ctx.save();
              
              // Draw blurred background
              const blurAmount = features.backgroundBlur.sensitivity * 15;
              ctx.filter = `blur(${blurAmount}px)`;
              ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
              ctx.filter = 'none';
              
              // Draw foreground over blurred background
              const fgCanvas = getScratchCanvas('foreground', canvasElement.width, canvasElement.height);
              const fgCtx = fgCanvas.getContext('2d');
              
              if (fgCtx) {
                fgCtx.globalCompositeOperation = 'source-over';
                fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.drawImage(videoElement, 0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.globalCompositeOperation = 'destination-in';
                fgCtx.drawImage(maskCanvas, 0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.globalCompositeOperation = 'source-over';
                
                ctx.drawImage(fgCanvas, 0, 0);
              }
              
              ctx.restore();
            }
            
            if (features.backgroundRemoval.enabled) {
              // Replace background with solid color
              ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
              
              // Fill with green or custom color for chroma keying
              ctx.fillStyle = '#00FF00'; // Green screen color
              ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
              
              // Draw foreground over background
              const fgCanvas = getScratchCanvas('foreground', canvasElement.width, canvasElement.height);
              const fgCtx = fgCanvas.getContext('2d');
              
              if (fgCtx) {
                fgCtx.globalCompositeOperation = 'source-over';
                fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.drawImage(videoElement, 0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.globalCompositeOperation = 'destination-in';
                fgCtx.drawImage(maskCanvas, 0, 0, fgCanvas.width, fgCanvas.height);
                fgCtx.globalCompositeOperation = 'source-over';
                
                ctx.drawImage(fgCanvas, 0, 0);
              }
            }
          }
        } catch (error) {
          console.error('Error in background processing:', error);
        }
      }
      
      // Apply style transfer if enabled
      if (features.styleTransfer.enabled) {
        // This is a simplified visual simulation of style transfer using canvas filters
        const tempCanvas = getScratchCanvas('style', canvasElement.width, canvasElement.height);
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw original image
          tempCtx.filter = 'none';
          tempCtx.globalAlpha = 1;
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvasElement, 0, 0);
          
          // Apply styling effects based on intensity
          const intensity = features.styleTransfer.sensitivity;
          
          // Apply a variety of filters to simulate style transfer
          tempCtx.filter = `saturate(${1.5 + intensity}) contrast(${1.2 + intensity}) brightness(${1 + intensity * 0.3})`;
          tempCtx.globalAlpha = 0.8;
          tempCtx.drawImage(canvasElement, 0, 0);
          
          // Add a hue rotation for artistic effect
          tempCtx.filter = `hue-rotate(${intensity * 30}deg)`;
          tempCtx.globalAlpha = intensity * 0.5;
          tempCtx.drawImage(canvasElement, 0, 0);
          
          // Reset settings
          tempCtx.filter = 'none';
          tempCtx.globalAlpha = 1;
          
          // Draw the styled result back to the main canvas
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
      
      // Apply auto framing if enabled
      if (features.autoFraming.enabled && models.faceDetection) {
        try {
          const predictions = await models.faceDetection.estimateFaces(inputTensor, false);
          
          if (predictions.length > 0) {
            // Find the bounding box that contains all faces
            let minX = canvasElement.width;
            let minY = canvasElement.height;
            let maxX = 0;
            let maxY = 0;
            
            predictions.forEach(prediction => {
              const start = toPoint(prediction.topLeft);
              const end = toPoint(prediction.bottomRight);
              if (!start || !end) return;
              
              // Scale coordinates based on processing scale
              const startScaled = [start[0] / processScale, start[1] / processScale];
              const endScaled = [end[0] / processScale, end[1] / processScale];
              
              minX = Math.min(minX, startScaled[0]);
              minY = Math.min(minY, startScaled[1]);
              maxX = Math.max(maxX, endScaled[0]);
              maxY = Math.max(maxY, endScaled[1]);
            });
            
            // Add padding around the bounding box
            const paddingX = (maxX - minX) * 0.3;
            const paddingY = (maxY - minY) * 0.3;
            
            minX = Math.max(0, minX - paddingX);
            minY = Math.max(0, minY - paddingY);
            maxX = Math.min(canvasElement.width, maxX + paddingX);
            maxY = Math.min(canvasElement.height, maxY + paddingY);
            
            // Calculate the framing rectangle
            const frameWidth = maxX - minX;
            const frameHeight = maxY - minY;
            
            // Draw a subtle frame indicator
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(minX, minY, frameWidth, frameHeight);
            
            // In a real implementation, we would adjust the camera view
            // Here we just show where the framing would occur
          }
        } catch (error) {
          console.error('Error in auto framing:', error);
        }
      }
      
      // Apply stabilization effect
      if (features.stabilization.enabled) {
        // Real stabilization would track motion and counter it
        // This is a visual indicator that stabilization is active
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        
        // Draw corner markers to indicate stabilization bounds
        const size = 20;
        const margin = 30;
        
        // Top-left
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin + size, margin);
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, margin + size);
        ctx.stroke();
        
        // Top-right
        ctx.beginPath();
        ctx.moveTo(canvasElement.width - margin, margin);
        ctx.lineTo(canvasElement.width - margin - size, margin);
        ctx.moveTo(canvasElement.width - margin, margin);
        ctx.lineTo(canvasElement.width - margin, margin + size);
        ctx.stroke();
        
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(margin, canvasElement.height - margin);
        ctx.lineTo(margin + size, canvasElement.height - margin);
        ctx.moveTo(margin, canvasElement.height - margin);
        ctx.lineTo(margin, canvasElement.height - margin - size);
        ctx.stroke();
        
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(canvasElement.width - margin, canvasElement.height - margin);
        ctx.lineTo(canvasElement.width - margin - size, canvasElement.height - margin);
        ctx.moveTo(canvasElement.width - margin, canvasElement.height - margin);
        ctx.lineTo(canvasElement.width - margin, canvasElement.height - margin - size);
        ctx.stroke();
      }
      
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      // Always dispose of the input tensor - an early return or a model error
      // would otherwise leak a WebGL texture on every single frame.
      inputTensor?.dispose();
      inputTensor = null;
    }
    
  }, [features, models, isModelsLoaded, processingQuality, updateFPS, applyVisualEffects, getScratchCanvas]);

  return {
    features,
    toggleFeature,
    updateFeatureSettings,
    loadModels,
    processFrame,
    isModelsLoaded,
    isModelsLoading,
    activeModels,
    processingQuality,
    setProcessingQuality
  };
};