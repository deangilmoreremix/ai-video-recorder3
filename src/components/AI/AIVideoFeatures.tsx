import React, { useState, useRef, useEffect } from 'react';
import { FaceDetection } from './FaceDetection';
import { FacialLandmarkDetection } from './FacialLandmarkDetection';
import { HandPoseDetection } from './HandPoseDetection';
import { BodySegmentation } from './BodySegmentation';
import { VideoStabilization } from './VideoStabilization';
import { SmartCropping } from './SmartCropping';
import { ImageInpainting } from './ImageInpainting';
import { AIFeatureSelector } from './AIFeatureSelector';
import { AIProcessingOverlay } from './AIProcessingOverlay';
import { X, Grid, Sliders, Camera, Wand2, Scan, HandMetal, ArrowUp, Trash, Layers, Send, Smile, Focus, CloudFog, Monitor, Sparkles, Filter, Palette, Gauge, Wind, Mic } from 'lucide-react';
import { AIFeatureGrid } from './AIFeatureGrid';
import { AIFeatures } from '../../hooks/useAIFeatures';

interface AIVideoFeaturesProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  features: AIFeatures;
  toggleFeature: (featureId: string) => void;
  processFrame: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<void>;
  processVideo: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options?: { fps?: number; mimeType?: string; onProgress?: (p: number) => void; signal?: AbortSignal }
  ) => Promise<Blob>;
  processingQuality: 'low' | 'medium' | 'high';
  setProcessingQuality: (quality: 'low' | 'medium' | 'high') => void;
  onProcessingComplete?: (processedBlob: Blob) => void;
}

export const AIVideoFeatures: React.FC<AIVideoFeaturesProps> = ({
  videoRef,
  features,
  toggleFeature,
  processFrame,
  processVideo,
  processingQuality,
  setProcessingQuality,
  onProcessingComplete
}) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Process frames in real-time on the overlay canvas.
  useEffect(() => {
    let animationFrame: number;

    const processVideoFrame = async () => {
      if (!videoRef.current || !canvasRef.current) {
        animationFrame = requestAnimationFrame(processVideoFrame);
        return;
      }
      if (videoRef.current.readyState >= 2) {
        await processFrame(videoRef.current, canvasRef.current);
      }
      animationFrame = requestAnimationFrame(processVideoFrame);
    };

    processVideoFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, [videoRef, processFrame]);

  const handleFeatureSelect = (featureId: string) => {
    setActiveFeature(featureId === activeFeature ? null : featureId);
  };

  // Apply the full set of enabled AI features to the entire uploaded clip and
  // emit the COMPLETE processed video (never a single frame).
  const applyToVideo = async () => {
    if (!videoRef.current || !outputCanvasRef.current) return;
    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      const blob = await processVideo(videoRef.current, outputCanvasRef.current, {
        fps: 30,
        onProgress: setProcessingProgress
      });
      onProcessingComplete?.(blob);
      setProcessingProgress(100);
    } catch (err) {
      console.error('Failed to process video:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderActiveFeatureComponent = () => {
    if (!activeFeature) return null;

    switch (activeFeature) {
      case 'faceDetection':
        return (
          <FaceDetection videoRef={videoRef} enabled settings={{ minConfidence: 0.5, maxFaces: processingQuality === 'high' ? 10 : processingQuality === 'medium' ? 5 : 2, drawBoxes: true }} />
        );
      case 'facialLandmarks':
        return (
          <FacialLandmarkDetection videoRef={videoRef} enabled settings={{ minConfidence: 0.5, maxFaces: processingQuality === 'high' ? 5 : processingQuality === 'medium' ? 2 : 1, drawMesh: true, drawContours: processingQuality !== 'low', drawIris: processingQuality === 'high' }} />
        );
      case 'handPoseEstimation':
        return (
          <HandPoseDetection videoRef={videoRef} enabled settings={{ minConfidence: 0.5, maxHands: processingQuality === 'high' ? 2 : 1, drawPoints: true, drawSkeleton: true, gestureDetection: true }} />
        );
      case 'backgroundRemoval':
      case 'backgroundBlur':
        return (
          <BodySegmentation
            videoRef={videoRef}
            enabled
            settings={{ mode: activeFeature === 'backgroundRemoval' ? 'replace' : 'blur', blurAmount: 10, backgroundColor: '#00FF00', foregroundColor: '#FFFFFF', outlineWidth: 3, maskOpacity: 0.7, segmentationThreshold: 0.5 }}
            onSegmentationComplete={(canvas) => canvas.toBlob((blob) => { if (blob) onProcessingComplete?.(blob); })}
          />
        );
      case 'videoStabilization':
      case 'stabilization':
        return (
          <VideoStabilization videoRef={videoRef} enabled onProcessingComplete={(blob) => onProcessingComplete?.(blob)} />
        );
      case 'autoFraming':
      case 'smartCropping':
        return (
          <SmartCropping videoRef={videoRef} enabled onProcessingComplete={(blob) => onProcessingComplete?.(blob)} />
        );
      case 'contentRemoval':
      case 'imageInpainting':
        return (
          <ImageInpainting videoRef={videoRef} enabled />
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
    autoExposure: Filter,
    colorEnhancement: Palette,
    stabilization: Gauge,
    denoising: Wind,
    speechRecognition: Mic
  };

  return (
    <div className="relative">
      <canvas ref={outputCanvasRef} className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />

      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-3 rounded-full shadow-lg ${showGrid ? 'bg-[#E44E51] text-white' : 'bg-white text-[#E44E51] hover:bg-[#E44E51]/10'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full shadow-lg ${showSettings ? 'bg-[#E44E51] text-white' : 'bg-white text-[#E44E51] hover:bg-[#E44E51]/10'}`}
          >
            <Sliders className="w-5 h-5" />
          </button>
          <button
            onClick={applyToVideo}
            disabled={isProcessing}
            className="p-3 rounded-full shadow-lg bg-[#E44E51] text-white hover:bg-[#D43B3E] disabled:opacity-50"
            title="Apply enabled AI features to the full video"
          >
            <Wand2 className="w-5 h-5" />
          </button>
          <AIFeatureSelector onFeatureSelect={handleFeatureSelect} activeFeature={activeFeature} featureIcons={featureIcons} />
        </div>
      </div>

      {activeFeature && (
        <button onClick={() => setActiveFeature(null)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white z-20">
          <X className="w-5 h-5" />
        </button>
      )}

      {renderActiveFeatureComponent()}

      <AIProcessingOverlay isVisible={isProcessing} progress={processingProgress} message={`Processing ${activeFeature?.replace(/([A-Z])/g, ' $1').toLowerCase()}...`} />

      {activeFeature && !isProcessing && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm z-10 flex items-center">
          {featureIcons[activeFeature] && React.createElement(featureIcons[activeFeature], { className: 'w-4 h-4 mr-2' })}
          <span>{activeFeature.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}</span>
        </div>
      )}

      {showSettings && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-20 w-64">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Sliders className="w-4 h-4 mr-2" /> Processing Settings
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Processing Quality</label>
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

      {showGrid && (
        <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10">
          <AIFeatureGrid onFeatureToggle={toggleFeature} enabledFeatures={features} isProcessing={isProcessing} compact />
        </div>
      )}
    </div>
  );
};
