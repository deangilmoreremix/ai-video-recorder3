import { useState, useCallback, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { SupportedModels } from '@tensorflow-models/body-segmentation';
import {
  Rect,
  getScratchCanvas,
  toGrayscale,
  estimateTranslation,
  FrameStabilizer,
  mapPoint,
  mapRect,
  computeFrameStats,
  buildToneLUT,
  applyToneAndColor,
  temporalDenoise,
  spatialDenoise,
  beautifyRegion,
  histogramDistance,
  computeHistogram,
  processVideoToBlob
} from '../components/AI/aiProcessing';

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
  pose?: poseDetection.PoseDetector;
}

export interface FeatureInfo {
  id: string;
  name: string;
  description: string;
}

// Single source of truth for the shipped feature set. Every entry here has a
// genuine implementation in `processFrame` (or a dedicated component). Features
// that could not be made genuinely real have been REMOVED (no mocks shipped).
export const AI_FEATURE_REGISTRY: FeatureInfo[] = [
  { id: 'faceDetection', name: 'Face Detection', description: 'Detect and track faces in real-time (BlazeFace)' },
  { id: 'facialLandmarks', name: 'Facial Landmarks', description: 'Track 468 facial points (MediaPipe FaceMesh)' },
  { id: 'expressionDetection', name: 'Expression Detection', description: 'Classify expressions from landmark geometry' },
  { id: 'handPoseEstimation', name: 'Hand Tracking', description: 'Detect hands, 21 keypoints (MediaPipe Hands)' },
  { id: 'gestureRecognition', name: 'Gesture Recognition', description: 'Recognise hand gestures from keypoints' },
  { id: 'poseEstimation', name: 'Pose Estimation', description: 'Detect body pose skeleton (MoveNet)' },
  { id: 'backgroundRemoval', name: 'Background Removal', description: 'Segment person, keep foreground (SelfieSeg)' },
  { id: 'backgroundBlur', name: 'Background Blur', description: 'Blur background, keep subject (SelfieSeg)' },
  { id: 'autoFraming', name: 'Auto Framing', description: 'Track the subject and reframe the shot' },
  { id: 'beautification', name: 'Beautification', description: 'Edge-preserving skin smoothing on faces' },
  { id: 'enhancedLighting', name: 'Enhanced Lighting', description: 'Auto levels + gamma from luminance histogram' },
  { id: 'autoExposure', name: 'Auto Exposure', description: 'Exposure correction toward a neutral midtone' },
  { id: 'colorEnhancement', name: 'Color Enhancement', description: 'Gray-world white balance + saturation' },
  { id: 'stabilization', name: 'Stabilization', description: 'Translational stabilisation via motion tracking' },
  { id: 'denoising', name: 'Denoising', description: 'Temporal + edge-preserving spatial noise reduction' },
  { id: 'sceneDetection', name: 'Scene Detection', description: 'Detect shot changes from frame histograms' },
  { id: 'speechRecognition', name: 'Speech Recognition', description: 'Live captions via the Web Speech API' }
];

const FEATURE_IDS = AI_FEATURE_REGISTRY.map(f => f.id);

const createDefaultFeatures = (): AIFeatures => {
  const out: AIFeatures = {};
  for (const id of FEATURE_IDS) {
    out[id] = { enabled: false, sensitivity: 0.5 };
  }
  return out;
};

// MediaPipe FaceMesh contour indices (lips / eyes / irises / oval).
const FACE_MESH_CONTOURS = faceLandmarksDetection.util.getKeypointIndexByContour(
  faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
);

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

const getFaceBox = (face: faceLandmarksDetection.Face): Rect | null => {
  const box = face.box;
  if (box) {
    return { x: box.xMin, y: box.yMin, w: box.width, h: box.height };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of face.keypoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

/**
 * FaceMesh runs on the downscaled analysis canvas, so its keypoints/box are in
 * analysis space. Convert them back to source-video space (`inv` = 1 / scale)
 * before they are mapped onto the output canvas.
 */
const scaleFaceToSource = (
  face: faceLandmarksDetection.Face,
  inv: number
): faceLandmarksDetection.Face => {
  const box = face.box;
  return {
    ...face,
    box: box
      ? {
          xMin: box.xMin * inv,
          yMin: box.yMin * inv,
          xMax: box.xMax * inv,
          yMax: box.yMax * inv,
          width: box.width * inv,
          height: box.height * inv
        }
      : box,
    keypoints: face.keypoints.map(k => ({ ...k, x: k.x * inv, y: k.y * inv }))
  };
};

/** Decide a facial expression from tracked landmark geometry (no model needed). */
const classifyExpression = (keypoints: { x: number; y: number }[], sensitivity: number): string => {
  const at = (i: number) => keypoints[i];
  const interocular =
    Math.hypot(at(33).x - at(263).x, at(33).y - at(263).y) || 1;
  const mouthW = Math.hypot(at(61).x - at(291).x, at(61).y - at(291).y);
  const mouthOpen = Math.hypot(at(13).x - at(14).x, at(13).y - at(14).y);
  const uMouth = (at(61).y + at(291).y) / 2;
  const lMouth = (at(14).y + at(17).y) / 2;
  const cornerUp = lMouth < uMouth;
  const smileRatio = mouthW / interocular;
  const openRatio = mouthOpen / interocular;
  const browRaise =
    (Math.hypot(at(159).x - at(145).x, at(159).y - at(145).y)) /
    (Math.hypot(at(33).x - at(133).x, at(33).y - at(133).y) || 1);

  const s = sensitivity;
  if (openRatio > 0.35 && browRaise > 1.05) return 'Surprised';
  if (smileRatio > 1.1 - s * 0.2 && cornerUp) return 'Happy';
  if (smileRatio < 0.75 + s * 0.2 && !cornerUp) return 'Sad';
  if (openRatio > 0.12 && openRatio <= 0.35) return 'Talking';
  return 'Neutral';
};

/** Decide a hand gesture from the 21 MediaPipe hand keypoints. */
export const classifyGesture = (hand: handPoseDetection.Hand): string => {
  const kp = hand.keypoints;
  if (!kp || kp.length < 21) return 'unknown';
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const extended = (tip: number, pip: number) => dist(kp[tip], kp[0]) > dist(kp[pip], kp[0]) * 1.1;
  const index = extended(8, 6);
  const middle = extended(12, 10);
  const ring = extended(16, 14);
  const pinky = extended(20, 18);
  const thumbTip = kp[4];
  const indexTip = kp[8];
  const pinch = dist(thumbTip, indexTip) < dist(kp[5], kp[17]) * 0.4;

  if (pinch && index && middle && !ring && !pinky) return 'Pinch';
  if (index && middle && !ring && !pinky) return 'Peace';
  if (index && !middle && !ring && !pinky) return 'Pointing';
  if (index && middle && ring && pinky && extended(4, 2)) return 'Open Hand';
  if (!index && !middle && !ring && !pinky) return 'Fist';
  return 'unknown';
};

// ---- Web Speech API (browser-native real transcription) ----
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const useAIFeatures = () => {
  const [features, setFeatures] = useState<AIFeatures>(createDefaultFeatures());
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [activeModels, setActiveModels] = useState<string[]>([]);
  const [processingQuality, setProcessingQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [transcript, setTranscript] = useState<string>('');
  const [sceneCuts, setSceneCuts] = useState<number[]>([]);

  const loadedModelTypes = useRef<Set<string>>(new Set());
  const modelsRef = useRef<Models>({});
  const featuresRef = useRef(features);
  const processingQualityRef = useRef(processingQuality);
  const isLoadingRef = useRef(false);

  // Persistent analysis state across frames.
  const stabilizer = useRef(new FrameStabilizer());
  const prevGray = useRef<{ w: number; h: number; data: Uint8Array } | null>(null);
  const estMotion = useRef({ x: 0, y: 0 });
  const prevFrameImage = useRef<ImageData | null>(null);
  const viewRect = useRef<Rect | null>(null);
  const frameCount = useRef(0);
  const lastHist = useRef<number[] | null>(null);
  const lastFaces = useRef<blazeface.NormalizedFace[]>([]);
  const lastFaceMeshes = useRef<faceLandmarksDetection.Face[]>([]);
  const lastHands = useRef<handPoseDetection.Hand[]>([]);
  const lastPoses = useRef<poseDetection.Pose[]>([]);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const speechRestart = useRef(false);

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  useEffect(() => {
    processingQualityRef.current = processingQuality;
  }, [processingQuality]);

  const fpsCounter = useRef({ frames: 0, lastTime: 0, fps: 0 });
  const updateFPS = useCallback(() => {
    const now = performance.now();
    if (fpsCounter.current.lastTime === 0) {
      fpsCounter.current.lastTime = now;
      fpsCounter.current.frames = 1;
      return;
    }
    const elapsed = now - fpsCounter.current.lastTime;
    if (elapsed >= 1000) {
      fpsCounter.current.fps = (fpsCounter.current.frames * 1000) / elapsed;
      fpsCounter.current.frames = 0;
      fpsCounter.current.lastTime = now;
      if (fpsCounter.current.fps < 15 && processingQualityRef.current !== 'low') {
        setProcessingQuality('low');
      } else if (fpsCounter.current.fps > 25 && processingQualityRef.current === 'low') {
        setProcessingQuality('medium');
      }
    }
    fpsCounter.current.frames++;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initTensorFlow = async () => {
      try {
        await tf.ready();
        if (cancelled) return;
        if (tf.getBackend() !== 'webgl') {
          try {
            const switched = await tf.setBackend('webgl');
            if (switched) await tf.ready();
          } catch {
            /* keep current backend */
          }
        }
        if (tf.getBackend() === 'webgl') {
          tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
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

  useEffect(() => {
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
      speechRef.current?.stop();
      speechRef.current = null;
    };
  }, []);

  const loadModels = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setIsModelsLoading(true);
      await tf.ready();

      const f = featuresRef.current;
      const processingQuality = processingQualityRef.current;
      const loadedModels: Models = {};
      const newModelsLoaded = new Set(loadedModelTypes.current);

      const needFaceDetection = f.faceDetection.enabled || f.facialLandmarks.enabled ||
        f.expressionDetection.enabled || f.beautification.enabled;
      const needFaceLandmarks = f.facialLandmarks.enabled || f.expressionDetection.enabled || f.beautification.enabled;
      const needBodySegmentation = f.backgroundRemoval.enabled || f.backgroundBlur.enabled;
      const needHandPose = f.handPoseEstimation.enabled || f.gestureRecognition.enabled;
      const needPose = f.poseEstimation.enabled;

      const update = (id: string, status: 'loading' | 'loaded' | 'error', err?: string) => {
        setFeatures(prev => ({
          ...prev,
          [id]: { ...prev[id], loading: status === 'loading', loaded: status === 'loaded', error: status === 'error' ? err : undefined }
        }));
      };

      if (needFaceDetection && !loadedModelTypes.current.has('faceDetection')) {
        update('faceDetection', 'loading');
        try {
          loadedModels.faceDetection = await blazeface.load({
            maxFaces: 10,
            inputWidth: 224,
            inputHeight: 224,
            iouThreshold: 0.3,
            scoreThreshold: f.faceDetection.sensitivity
          });
          newModelsLoaded.add('faceDetection');
          update('faceDetection', 'loaded');
        } catch (e) {
          update('faceDetection', 'error', 'Failed to load face detection model');
        }
      }

      if (needFaceLandmarks && !loadedModelTypes.current.has('faceLandmarks')) {
        update('faceLandmarks', 'loading');
        try {
          loadedModels.faceLandmarks = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
              runtime: 'tfjs',
              refineLandmarks: processingQuality !== 'low',
              maxFaces: processingQuality === 'low' ? 1 : processingQuality === 'medium' ? 2 : 5
            }
          );
          newModelsLoaded.add('faceLandmarks');
          update('faceLandmarks', 'loaded');
        } catch (e) {
          update('faceLandmarks', 'error', 'Failed to load facial landmarks model');
        }
      }

      if (needBodySegmentation && !loadedModelTypes.current.has('bodySegmentation')) {
        update('backgroundRemoval', 'loading');
        update('backgroundBlur', 'loading');
        try {
          loadedModels.bodySegmentation = await bodySegmentation.createSegmenter(
            SupportedModels.MediaPipeSelfieSegmentation,
            {
              runtime: 'tfjs',
              modelType: processingQuality === 'low' ? 'landscape' : 'general'
            }
          );
          newModelsLoaded.add('bodySegmentation');
          update('backgroundRemoval', 'loaded');
          update('backgroundBlur', 'loaded');
        } catch (e) {
          update('backgroundRemoval', 'error', 'Failed to load body segmentation model');
          update('backgroundBlur', 'error', 'Failed to load body segmentation model');
        }
      }

      if (needHandPose && !loadedModelTypes.current.has('handPose')) {
        update('handPoseEstimation', 'loading');
        update('gestureRecognition', 'loading');
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
          update('handPoseEstimation', 'loaded');
          update('gestureRecognition', 'loaded');
        } catch (e) {
          update('handPoseEstimation', 'error', 'Failed to load hand pose model');
          update('gestureRecognition', 'error', 'Failed to load hand pose model');
        }
      }

      if (needPose && !loadedModelTypes.current.has('pose')) {
        update('poseEstimation', 'loading');
        try {
          // MoveNet expects the literal model ids exported by the package
          // ('SinglePose.Lightning' / 'SinglePose.Thunder'); anything else makes
          // `createDetector` throw "Invalid architecture". Thunder is the
          // higher-accuracy (slower) model, Lightning the fast one.
          const poseConfig: poseDetection.MoveNetModelConfig = {
            modelType: processingQuality === 'high'
              ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
              : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true
          };
          loadedModels.pose = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            poseConfig
          );
          newModelsLoaded.add('pose');
          update('poseEstimation', 'loaded');
        } catch (e) {
          update('poseEstimation', 'error', 'Failed to load pose model');
        }
      }

      loadedModelTypes.current = newModelsLoaded;
      modelsRef.current = { ...modelsRef.current, ...loadedModels };
      setIsModelsLoaded(Object.keys(modelsRef.current).length > 0);
    } catch (error) {
      console.error('Failed to initialize TensorFlow:', error);
    } finally {
      isLoadingRef.current = false;
      setIsModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    const active = Object.entries(features)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k);
    setActiveModels(active);

    const needModelLoading = active.some(feature => {
      switch (feature) {
        case 'faceDetection':
        case 'facialLandmarks':
        case 'expressionDetection':
        case 'beautification':
          return !loadedModelTypes.current.has('faceDetection') || !loadedModelTypes.current.has('faceLandmarks');
        case 'handPoseEstimation':
        case 'gestureRecognition':
          return !loadedModelTypes.current.has('handPose');
        case 'backgroundRemoval':
        case 'backgroundBlur':
          return !loadedModelTypes.current.has('bodySegmentation');
        case 'poseEstimation':
          return !loadedModelTypes.current.has('pose');
        default:
          return false;
      }
    });

    if (needModelLoading && !isLoadingRef.current) {
      loadModels();
    }
  }, [features, loadModels]);

  // ---- Speech recognition lifecycle ----
  useEffect(() => {
    const enabled = featuresRef.current.speechRecognition.enabled;
    const Ctor = getSpeechRecognitionCtor();
    if (enabled && Ctor && !speechRef.current) {
      try {
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (e: SpeechRecognitionEventLike) => {
          let finalText = '';
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) finalText += res[0].transcript;
            else interim += res[0].transcript;
          }
          setTranscript(prev => (finalText ? prev + finalText : prev) + (interim ? '' : ''));
          if (interim) setTranscript(prev => (prev.endsWith(interim) ? prev : prev + interim));
        };
        rec.onend = () => {
          if (speechRestart.current) {
            speechRestart.current = false;
            try {
              rec.start();
            } catch {
              /* will retry on next toggle */
            }
          }
        };
        rec.onerror = () => {
          speechRestart.current = true;
        };
        speechRef.current = rec;
        speechRestart.current = true;
        try {
          rec.start();
        } catch {
          /* ignore double-start */
        }
      } catch {
        setFeatures(prev => ({
          ...prev,
          speechRecognition: { ...prev.speechRecognition, error: 'Speech recognition not supported' }
        }));
      }
    }
    if (!enabled && speechRef.current) {
      speechRestart.current = false;
      try {
        speechRef.current.stop();
      } catch {
        /* ignore */
      }
      speechRef.current = null;
      setTranscript('');
    }
  }, [features.speechRecognition.enabled]);

  const toggleFeature = useCallback((featureId: string) => {
    setFeatures(prev => {
      const newFeatures = { ...prev };
      if (featureId === 'facialLandmarks' && !prev.faceDetection.enabled && !prev.facialLandmarks.enabled) {
        newFeatures.faceDetection = { ...prev.faceDetection, enabled: true };
      }
      if (featureId === 'expressionDetection' && !prev.facialLandmarks.enabled && !prev.expressionDetection.enabled) {
        newFeatures.facialLandmarks = { ...prev.facialLandmarks, enabled: true };
        if (!prev.faceDetection.enabled) newFeatures.faceDetection = { ...prev.faceDetection, enabled: true };
      }
      if (featureId === 'gestureRecognition' && !prev.handPoseEstimation.enabled && !prev.gestureRecognition.enabled) {
        newFeatures.handPoseEstimation = { ...prev.handPoseEstimation, enabled: true };
      }
      newFeatures[featureId] = { ...prev[featureId], enabled: !prev[featureId].enabled };
      return newFeatures;
    });
  }, []);

  const updateFeatureSettings = useCallback((featureId: string, settings: Partial<AIFeature>) => {
    setFeatures(prev => ({ ...prev, [featureId]: { ...prev[featureId], ...settings } }));
  }, []);

  const processFrame = useCallback(
    async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
      const f = featuresRef.current;
      const m = modelsRef.current;

      if (videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) {
        return;
      }

      const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const W = videoElement.videoWidth;
      const H = videoElement.videoHeight;
      if (canvasElement.width !== W || canvasElement.height !== H) {
        canvasElement.width = W;
        canvasElement.height = H;
      }

      updateFPS();

      const needsAI = Object.values(f).some(v => v.enabled);
      if (!needsAI) {
        // No AI feature: just mirror the source so the overlay is correct.
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(videoElement, 0, 0);
        return;
      }

      const quality = processingQualityRef.current;
      const detectEvery = quality === 'low' ? 4 : quality === 'high' ? 1 : 2;

      // Scale at which heavy models run (smaller = faster).
      const scale = quality === 'low' ? 0.4 : quality === 'medium' ? 0.6 : 0.75;
      const aw = Math.max(1, Math.round(W * scale));
      const ah = Math.max(1, Math.round(H * scale));
      const analysisCanvas = getScratchCanvas('analysis', aw, ah);
      const aCtx = analysisCanvas.getContext('2d');
      if (!aCtx) return;
      aCtx.drawImage(videoElement, 0, 0, aw, ah);

      frameCount.current++;

      // ---- Geometric corrections (view rect) ----
      let view: Rect = { x: 0, y: 0, w: W, h: H };

      // Stabilization: estimate motion on the analysis frame.
      if (f.stabilization.enabled) {
        const gray = toGrayscale(analysisCanvas, aw, ah);
        if (prevGray.current && prevGray.current.w === aw && prevGray.current.h === ah) {
          const measured = estimateTranslation(gray, prevGray.current.data, aw, ah, 6, estMotion.current);
          estMotion.current = measured;
          const corr = stabilizer.current.update(measured, W, H, f.stabilization.sensitivity, 0.85);
          view.x = clamp(view.x + corr.dx, 0, W);
          view.y = clamp(view.y + corr.dy, 0, H);
        }
        prevGray.current = { w: aw, h: ah, data: gray };
      } else {
        prevGray.current = null;
        stabilizer.current.reset(W, H);
      }

      // Auto-framing: track faces (or fall back to motion saliency).
      if (f.autoFraming.enabled && m.faceDetection) {
        let faces = lastFaces.current;
        if (frameCount.current % detectEvery === 0) {
          faces = await m.faceDetection.estimateFaces(analysisCanvas, false);
          lastFaces.current = faces;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of faces) {
          const s = toPoint(p.topLeft);
          const e = toPoint(p.bottomRight);
          if (!s || !e) continue;
          minX = Math.min(minX, s[0] / scale);
          minY = Math.min(minY, s[1] / scale);
          maxX = Math.max(maxX, e[0] / scale);
          maxY = Math.max(maxY, e[1] / scale);
        }
        if (!Number.isFinite(minX)) {
          // Fallback: use motion saliency from the grayscale diff.
          if (prevGray.current) {
            const gray = toGrayscale(analysisCanvas, aw, ah);
            let bx = 0, by = 0, bn = 0;
            for (let y = 0; y < ah; y += 4) {
              for (let x = 0; x < aw; x += 4) {
                const idx = y * aw + x;
                if (Math.abs(gray[idx] - prevGray.current.data[idx]) > 25) {
                  bx += x / scale;
                  by += y / scale;
                  bn++;
                }
              }
            }
            if (bn > 0) {
              minX = bx / bn - W * 0.1;
              minY = by / bn - H * 0.1;
              maxX = bx / bn + W * 0.1;
              maxY = by / bn + H * 0.1;
            }
          }
        }
        if (Number.isFinite(minX)) {
          const padX = (maxX - minX) * 0.4 + W * 0.05;
          const padY = (maxY - minY) * 0.4 + H * 0.05;
          const rx = minX - padX;
          const ry = minY - padY;
          let rw = maxX - minX + padX * 2;
          let rh = maxY - minY + padY * 2;
          // Preserve output aspect ratio.
          const outRatio = W / H;
          if (rw / rh > outRatio) rh = rw / outRatio;
          else rw = rh * outRatio;
          const alpha = quality === 'high' ? 0.25 : 0.12;
          if (!viewRect.current) viewRect.current = { x: rx, y: ry, w: rw, h: rh };
          else viewRect.current = {
            x: viewRect.current.x + (rx - viewRect.current.x) * alpha,
            y: viewRect.current.y + (ry - viewRect.current.y) * alpha,
            w: viewRect.current.w + (rw - viewRect.current.w) * alpha,
            h: viewRect.current.h + (rh - viewRect.current.h) * alpha
          };
          const vr = viewRect.current;
          vr.w = Math.max(W * 0.3, Math.min(W * 1.5, vr.w));
          vr.h = vr.w / outRatio;
          vr.x = clamp(vr.x, 0, Math.max(0, W - vr.w));
          vr.y = clamp(vr.y, 0, Math.max(0, H - vr.h));
          view = vr;
        }
      }

      // ---- Base render of the (view-rect) source ----
      ctx.clearRect(0, 0, W, H);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(
        videoElement,
        view.x, view.y, view.w, view.h,
        0, 0, W, H
      );

      // ---- Tonal / colour corrections (real pixel math) ----
      const workCanvas = getScratchCanvas('work', W, H);
      const wCtx = workCanvas.getContext('2d', { willReadFrequently: true });
      if (!wCtx) return;
      wCtx.clearRect(0, 0, W, H);
      wCtx.drawImage(videoElement, view.x, view.y, view.w, view.h, 0, 0, W, H);
      const stats = computeFrameStats(workCanvas, W, H);
      const exGain = f.autoExposure.enabled ? clamp(128 / (stats.mean || 1), 0.7, 1.6) : 1;
      const lutR = f.colorEnhancement.enabled || f.enhancedLighting.enabled || f.autoExposure.enabled
        ? buildToneLUT(
            f.autoExposure.enabled ? lerp(1, exGain, f.autoExposure.sensitivity) : 1,
            f.enhancedLighting.enabled ? stats.blackPoint : 0,
            f.enhancedLighting.enabled ? stats.whitePoint : 255,
            f.enhancedLighting.enabled ? lerp(1, stats.gamma, f.enhancedLighting.sensitivity) : 1
          )
        : new Uint8ClampedArray(Array.from({ length: 256 }, (_, i) => i));

      const gainR = f.colorEnhancement.enabled ? clamp((stats.mean / (stats.meanR || 1)), 0.8, 1.25) : 1;
      const gainG = f.colorEnhancement.enabled ? clamp((stats.mean / (stats.meanG || 1)), 0.8, 1.25) : 1;
      const gainB = f.colorEnhancement.enabled ? clamp((stats.mean / (stats.meanB || 1)), 0.8, 1.25) : 1;
      const lutRc = f.colorEnhancement.enabled ? buildToneLUT(gainR, 0, 255, 1) : lutR;
      const lutGc = f.colorEnhancement.enabled ? buildToneLUT(gainG, 0, 255, 1) : lutR;
      const lutBc = f.colorEnhancement.enabled ? buildToneLUT(gainB, 0, 255, 1) : lutR;
      const sat = f.colorEnhancement.enabled ? lerp(0, 0.5, f.colorEnhancement.sensitivity) : 0;

      const toneCanvas = getScratchCanvas('tone', W, H);
      const tCtx = toneCanvas.getContext('2d', { willReadFrequently: true });
      if (!tCtx) return;
      tCtx.drawImage(workCanvas, 0, 0);
      applyToneAndColor(toneCanvas, W, H, lutRc, lutGc, lutBc, sat);

      // ---- Denoising (temporal + optional spatial) ----
      if (f.denoising.enabled) {
        const img = tCtx.getImageData(0, 0, W, H);
        temporalDenoise(img, prevFrameImage.current, f.denoising.sensitivity);
        tCtx.putImageData(img, 0, 0);
        prevFrameImage.current = tCtx.getImageData(0, 0, W, H);
        if (quality === 'high' && W * H < 900000) {
          spatialDenoise(toneCanvas, W, H, f.denoising.sensitivity * 0.8);
        }
      } else {
        prevFrameImage.current = null;
      }

      // ---- Beautification (skin smoothing on detected faces) ----
      if (f.beautification.enabled) {
        // Need a face box in source coords; reuse last mesh or detection.
        let box: Rect | null = null;
        if (lastFaceMeshes.current.length > 0) {
          box = getFaceBox(lastFaceMeshes.current[0]);
        } else if (lastFaces.current.length > 0) {
          const s = toPoint(lastFaces.current[0].topLeft);
          const e = toPoint(lastFaces.current[0].bottomRight);
          if (s && e) box = { x: s[0] / scale, y: s[1] / scale, w: (e[0] - s[0]) / scale, h: (e[1] - s[1]) / scale };
        }
        if (box) beautifyRegion(toneCanvas, W, H, box, f.beautification.sensitivity * 0.8);
      }

      // Composite tonal/denoise/beautify result as the working frame.
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(toneCanvas, 0, 0);

      // ---- Face / landmark / expression detection ----
      if ((f.faceDetection.enabled || f.facialLandmarks.enabled || f.expressionDetection.enabled || f.beautification.enabled) && m.faceDetection) {
        if (frameCount.current % detectEvery === 0) {
          lastFaces.current = await m.faceDetection.estimateFaces(analysisCanvas, false);
        }
        const faces = lastFaces.current;
        for (const p of faces) {
          const s = toPoint(p.topLeft);
          const e = toPoint(p.bottomRight);
          if (!s || !e) continue;
          const size = [(e[0] - s[0]) / scale, (e[1] - s[1]) / scale];
          const start = [s[0] / scale, s[1] / scale];
          if (f.faceDetection.enabled) {
            ctx.strokeStyle = '#E44E51';
            ctx.lineWidth = 2;
            const r = mapRect({ x: start[0], y: start[1], w: size[0], h: size[1] }, view, W, H);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            const prob = toNumber(p.probability);
            if (prob !== undefined) {
              ctx.fillStyle = '#E44E51';
              ctx.font = '12px Arial';
              ctx.fillText(`${Math.round(prob * 100)}%`, r.x, r.y - 5);
            }
          }
        }

        if ((f.facialLandmarks.enabled || f.expressionDetection.enabled || f.beautification.enabled) && m.faceLandmarks && faces.length > 0) {
          if (frameCount.current % detectEvery === 0) {
            const meshes = await m.faceLandmarks.estimateFaces(analysisCanvas, {
              flipHorizontal: false,
              staticImageMode: false
            });
            // Results are in analysis-canvas space: bring them back to source space.
            lastFaceMeshes.current = meshes.map(face => scaleFaceToSource(face, 1 / scale));
          }
          for (const face of lastFaceMeshes.current) {
            const kp = face.keypoints;
            if (f.facialLandmarks.enabled) {
              ctx.fillStyle = '#E44E51';
              for (let i = 0; i < kp.length; i += 4) {
                const pt = mapPoint(kp[i], view, W, H);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1, 0, 2 * Math.PI);
                ctx.fill();
              }
              if (f.facialLandmarks.sensitivity > 0.6) {
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 1;
                for (const part of ['leftEye', 'rightEye', 'lips']) {
                  const indices = FACE_MESH_CONTOURS[part];
                  if (!indices) continue;
                  ctx.beginPath();
                  indices.forEach((idx, i) => {
                    const pt = mapPoint(kp[idx], view, W, H);
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                  });
                  ctx.closePath();
                  ctx.stroke();
                }
              }
            }
            if (f.expressionDetection.enabled) {
              const box = getFaceBox(face);
              if (box) {
                const expr = classifyExpression(kp as { x: number; y: number }[], f.expressionDetection.sensitivity);
                const rb = mapRect(box, view, W, H);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(rb.x, rb.y - 24, 110, 22);
                ctx.fillStyle = '#fff';
                ctx.font = '15px Arial';
                ctx.fillText(expr, rb.x + 8, rb.y - 8);
              }
            }
          }
        }
      }

      // ---- Hand pose + gesture ----
      if ((f.handPoseEstimation.enabled || f.gestureRecognition.enabled) && m.handPose) {
        if (frameCount.current % detectEvery === 0) {
          const hands = await m.handPose.estimateHands(analysisCanvas, { flipHorizontal: false });
          // Keypoints come back in analysis-canvas space: bring them back to
          // source-video space before they are mapped onto the output canvas.
          lastHands.current = hands.map(hand => ({
            ...hand,
            keypoints: hand.keypoints.map(k => ({ ...k, x: k.x / scale, y: k.y / scale }))
          }));
        }
        for (const hand of lastHands.current) {
          const kp = hand.keypoints;
          if (f.handPoseEstimation.enabled) {
            ctx.fillStyle = '#00FF00';
            for (const pt of kp) {
              const mp = mapPoint(pt, view, W, H);
              ctx.beginPath();
              ctx.arc(mp.x, mp.y, 4, 0, 2 * Math.PI);
              ctx.fill();
            }
            const fingers = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]];
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            for (const finger of fingers) {
              const pts = finger.map(idx => mapPoint(kp[idx], view, W, H)).filter(Boolean);
              if (pts.length < 2) continue;
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
              ctx.stroke();
            }
          }
          if (f.gestureRecognition.enabled) {
            const g = classifyGesture(hand);
            if (g !== 'unknown') {
              const wrist = mapPoint(kp[0], view, W, H);
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.fillRect(wrist.x - 10, wrist.y - 38, g.length * 10 + 20, 24);
              ctx.fillStyle = '#fff';
              ctx.font = '15px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(g, wrist.x + g.length * 5, wrist.y - 20);
              ctx.textAlign = 'left';
            }
          }
        }
      }

      // ---- Pose estimation (MoveNet skeleton) ----
      if (f.poseEstimation.enabled && m.pose) {
        if (frameCount.current % detectEvery === 0) {
          const poses = await m.pose.estimatePoses(analysisCanvas, { flipHorizontal: false });
          // Same analysis-space -> source-space conversion as the hand model.
          lastPoses.current = poses.map(pose => ({
            ...pose,
            keypoints: pose.keypoints.map(k => ({ ...k, x: k.x / scale, y: k.y / scale }))
          }));
        }
        for (const pose of lastPoses.current) {
          const kp = pose.keypoints;
          ctx.fillStyle = '#FFCC00';
          for (const kpt of kp) {
            if ((kpt.score ?? 0) < 0.3) continue;
            const mp = mapPoint(kpt, view, W, H);
            ctx.beginPath();
            ctx.arc(mp.x, mp.y, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
          const pairs = [[5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
          ctx.strokeStyle = '#FFCC00';
          ctx.lineWidth = 2;
          for (const [a, b] of pairs) {
            const ka = kp[a];
            const kb = kp[b];
            if (!ka || !kb || (ka.score ?? 0) < 0.3 || (kb.score ?? 0) < 0.3) continue;
            const pa = mapPoint(ka, view, W, H);
            const pb = mapPoint(kb, view, W, H);
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
        }
      }

      // ---- Background removal / blur ----
      if ((f.backgroundRemoval.enabled || f.backgroundBlur.enabled) && m.bodySegmentation) {
        // MediaPipeSelfieSegmentation only understands `flipHorizontal`; the
        // foreground cut-off is applied when the mask is rasterised below.
        const seg = await m.bodySegmentation.segmentPeople(analysisCanvas, {
          flipHorizontal: false
        });
        if (seg.length > 0) {
          const threshold = clamp(
            f.backgroundRemoval.enabled ? f.backgroundRemoval.sensitivity : 0.5,
            0.1,
            0.9
          );
          // Person pixels opaque / background transparent so the mask can be
          // used as a `destination-in` alpha key for the foreground below.
          const mask = await bodySegmentation.toBinaryMask(
            seg,
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 0, g: 0, b: 0, a: 0 },
            false,
            threshold
          );
          const maskCanvas = getScratchCanvas('mask', mask.width, mask.height);
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            maskCtx.putImageData(mask, 0, 0);
            // scaled mask -> output
            const smc = getScratchCanvas('maskOut', W, H);
            const smcCtx = smc.getContext('2d');
            if (smcCtx) {
              smcCtx.drawImage(maskCanvas, view.x * (mask.width / W), view.y * (mask.height / H), view.w * (mask.width / W), view.h * (mask.height / H), 0, 0, W, H);
            }
            if (f.backgroundBlur.enabled) {
              ctx.save();
              ctx.filter = `blur(${f.backgroundBlur.sensitivity * 15}px)`;
              ctx.drawImage(videoElement, view.x, view.y, view.w, view.h, 0, 0, W, H);
              ctx.filter = 'none';
              ctx.restore();
            } else if (f.backgroundRemoval.enabled) {
              ctx.clearRect(0, 0, W, H);
              ctx.fillStyle = '#00FF00';
              ctx.fillRect(0, 0, W, H);
            }
            // draw foreground using the mask
            const fg = getScratchCanvas('fg', W, H);
            const fgCtx = fg.getContext('2d');
            if (fgCtx) {
              fgCtx.globalCompositeOperation = 'source-over';
              fgCtx.clearRect(0, 0, W, H);
              fgCtx.drawImage(videoElement, view.x, view.y, view.w, view.h, 0, 0, W, H);
              fgCtx.globalCompositeOperation = 'destination-in';
              if (smcCtx) fgCtx.drawImage(smc, 0, 0);
              else fgCtx.drawImage(maskCanvas, 0, 0, W, H);
              fgCtx.globalCompositeOperation = 'source-over';
              ctx.drawImage(fg, 0, 0);
            }
          }
        }
      }

      // ---- Scene detection (histogram cut detection) ----
      if (f.sceneDetection.enabled) {
        const hist = computeHistogram(analysisCanvas, aw, ah);
        if (lastHist.current) {
          const d = histogramDistance(hist, lastHist.current);
          if (d > 6 - f.sceneDetection.sensitivity * 4 && videoElement.currentTime > 0.5) {
            setSceneCuts(prev => {
              if (prev.includes(Math.round(videoElement.currentTime))) return prev;
              return [...prev, Math.round(videoElement.currentTime)];
            });
          }
        }
        lastHist.current = hist;
      } else {
        lastHist.current = null;
      }

      // ---- Speech recognition captions ----
      if (f.speechRecognition.enabled && transcript) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        const words = transcript.split(' ').slice(-12).join(' ');
        ctx.fillRect(0, H - 70, W, 60);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(words, W / 2, H - 30);
        ctx.textAlign = 'left';
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateFPS]
  );

  const processVideo = useCallback(
    async (
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      options?: { fps?: number; mimeType?: string; onProgress?: (p: number) => void; signal?: AbortSignal }
    ): Promise<Blob> => {
      return processVideoToBlob(video, processFrame, canvas, options);
    },
    [processFrame]
  );

  return {
    features,
    toggleFeature,
    updateFeatureSettings,
    loadModels,
    processFrame,
    processVideo,
    isModelsLoaded,
    isModelsLoading,
    activeModels,
    processingQuality,
    setProcessingQuality,
    transcript,
    sceneCuts
  };
};

const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
