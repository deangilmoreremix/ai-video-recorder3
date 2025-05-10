import React, { useState, useRef, useEffect } from 'react';
import { FaceDetection } from './FaceDetection';
import { FacialLandmarkDetection } from './FacialLandmarkDetection';
import { HandPoseDetection } from './HandPoseDetection';
import { BodySegmentation } from './BodySegmentation';
import { VideoStabilization } from './VideoStabilization';
import { SmartCropping } from './SmartCropping';
import { VideoFrameInterpolation } from './VideoFrameInterpolation';
import { ImageInpainting } from './ImageInpainting';
import { AIFeatureSelector } from './AIFeatureSelector';
import { AIProcessingOverlay } from './AIProcessingOverlay';
import { 
  Brain, X, Grid, Sliders, Eye, 
  Camera, Wand2, Layout, Mic, Smile, 
  Palette, Gauge, CloudFog, Monitor, 
  Film, Sparkles, ArrowUp, Maximize,
  Send, Trash, HandMetal, Video, Filter
} from 'lucide-react';
import { AIFeatureGrid } from './AIFeatureGrid';
import { useAIFeatures } from '../../hooks/useAIFeatures';

interface AIVideoFeaturesProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onProcessingComplete?: (processedBlob: Blob) => void;
}

export const AIVideoFeatures: React.FC<AIVideoFeaturesProps> = ({
  videoRef,
  onProcessingComplete
}) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get AI features from our hook
  const { 
    features, 
    toggleFeature, 
    updateFeatureSettings, 
    processFrame,
    isModelsLoaded,
    processingQuality,
    setProcessingQuality
  } = useAIFeatures();

  // Process frames in real-time
  useEffect(() => {
    let animationFrame: number;
    
    const processVideoFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !isModelsLoaded) {
        animationFrame = requestAnimationFrame(processVideoFrame);
        return;
      }
      
      if (videoRef.current.readyState >= 2) {
        await processFrame(videoRef.current, canvasRef.current);
      }
      
      animationFrame = requestAnimationFrame(processVideoFrame);
    };
    
    processVideoFrame();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [videoRef, processFrame, isModelsLoaded]);

  const handleFeatureSelect = (featureId: string) => {
    setActiveFeature(featureId === activeFeature ? null : featureId);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
    setProcessingProgress(0);
  };

  const handleProcessingProgress = (progress: number) => {
    setProcessingProgress(progress);
  };

  const handleProcessingComplete = (result: Blob) => {
    setIsProcessing(false);
    setProcessingProgress(100);
    onProcessingComplete?.(result);
  };

  const renderActiveFeatureComponent = () => {
    if (!activeFeature) return null;

    switch (activeFeature) {
      case 'faceDetection':
        return (
          <FaceDetection
            videoRef={videoRef}
            enabled={true}
            settings={{
              minConfidence: 0.5,
              maxFaces: processingQuality === 'high' ? 10 : (processingQuality === 'medium' ? 5 : 2),
              drawBoxes: true
            }}
          />
        );
      case 'facialLandmarks':
        return (
          <FacialLandmarkDetection
            videoRef={videoRef}
            enabled={true}
            settings={{
              minConfidence: 0.5,
              maxFaces: processingQuality === 'high' ? 5 : (processingQuality === 'medium' ? 2 : 1),
              drawMesh: true,
              drawContours: processingQuality !== 'low',
              drawIris: processingQuality === 'high'
            }}
          />
        );
      case 'handPoseEstimation':
        return (
          <HandPoseDetection
            videoRef={videoRef}
            enabled={true}
            settings={{
              minConfidence: 0.5,
              maxHands: processingQuality === 'high' ? 2 : 1,
              drawPoints: true,
              drawSkeleton: true,
              gestureDetection: true
            }}
          />
        );
      case 'backgroundRemoval':
      case 'backgroundBlur':
        return (
          <BodySegmentation
            videoRef={videoRef}
            enabled={true}
            settings={{
              mode: activeFeature === 'backgroundRemoval' ? 'replace' : 'blur',
              blurAmount: 10,
              backgroundColor: '#00FF00',
              foregroundColor: '#FFFFFF',
              outlineWidth: 3,
              maskOpacity: 0.7,
              segmentationThreshold: 0.5
            }}
            onSegmentationComplete={(canvas) => {
              canvas.toBlob((blob) => {
                if (blob) handleProcessingComplete(blob);
              });
            }}
          />
        );
      case 'videoStabilization':
      case 'stabilization':
        return (
          <VideoStabilization
            videoRef={videoRef}
            enabled={true}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      case 'autoFraming':
      case 'smartCropping':
        return (
          <SmartCropping
            videoRef={videoRef}
            enabled={true}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      case 'superResolution':
      case 'frameInterpolation':
        return (
          <VideoFrameInterpolation
            videoRef={videoRef}
            outputCanvasRef={outputCanvasRef}
            enabled={true}
            settings={{
              factor: 2,
              quality: processingQuality,
              realTime: false
            }}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={() => {
              outputCanvasRef.current?.toBlob((blob) => {
                if (blob) handleProcessingComplete(blob);
              });
            }}
            onProgress={handleProcessingProgress}
          />
        );
      case 'contentRemoval':
      case 'imageInpainting':
        return (
          <ImageInpainting
            videoRef={videoRef}
            enabled={true}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      default:
        return null;
    }
  };

  const featureIcons: Record<string, React.ElementType> = {
    faceDetection: Camera,
    facialLandmarks: Scan,
    handPoseEstimation: HandMetal,
    poseEstimation: ArrowUp,
    backgroundRemoval: Trash,
    backgroundBlur: Layers,
    gestureRecognition: Send,
    expressionDetection: Smile,
    autoFraming: Focus,
    enhancedLighting: CloudFog,
    sceneDetection: Monitor,
    beautification: Sparkles,
    styleTransfer: Wand2,
    autoExposure: Filter,
    colorEnhancement: Palette,
    stabilization: Gauge,
    noiseReduction: Wind,
    speechRecognition: Mic,
    sentimentAnalysis: Brain,
    superResolution: Maximize,
    sceneSegmentation: Grid,
    denoising: Film
  };

  return (
    <div className="relative">
      {/* Hidden output canvas */}
      <canvas ref={outputCanvasRef} className="hidden" />
      
      {/* Main canvas overlay for AI features */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full"
      />
      
      {/* Feature selector and controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-3 rounded-full shadow-lg ${
              showGrid ? 'bg-[#E44E51] text-white' : 'bg-white text-[#E44E51] hover:bg-[#E44E51]/10'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full shadow-lg ${
              showSettings ? 'bg-[#E44E51] text-white' : 'bg-white text-[#E44E51] hover:bg-[#E44E51]/10'
            }`}
          >
            <Sliders className="w-5 h-5" />
          </button>
          
          <AIFeatureSelector
            onFeatureSelect={handleFeatureSelect}
            activeFeature={activeFeature}
            videoRef={videoRef}
            featureIcons={featureIcons}
          />
        </div>
      </div>
      
      {/* Close button when feature is active */}
      {activeFeature && (
        <button
          onClick={() => setActiveFeature(null)}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white z-20"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      {/* Feature-specific component */}
      {renderActiveFeatureComponent()}
      
      {/* Processing overlay */}
      <AIProcessingOverlay
        isVisible={isProcessing}
        progress={processingProgress}
        message={`Processing ${activeFeature?.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
      />
      
      {/* Feature info badge when an AI feature is active */}
      {activeFeature && !isProcessing && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm z-10 flex items-center">
          {featureIcons[activeFeature] && React.createElement(featureIcons[activeFeature], { className: "w-4 h-4 mr-2" })}
          <span>
            {activeFeature.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}
          </span>
        </div>
      )}
      
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-20 w-64">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Sliders className="w-4 h-4 mr-2" />
            Processing Settings
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Processing Quality
              </label>
              <select
                value={processingQuality}
                onChange={(e) => setProcessingQuality(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full rounded-lg border-gray-300 shadow-sm text-sm"
              >
                <option value="low">Low (Better Performance)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Better Quality)</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* Feature grid */}
      {showGrid && (
        <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
          <AIFeatureGrid 
            onFeatureToggle={toggleFeature}
            enabledFeatures={features}
            isProcessing={isProcessing}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};