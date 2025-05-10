import React, { useState, useRef } from 'react';
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
import { Brain, X } from 'lucide-react';

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
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFeatureSelect = (featureId: string) => {
    setActiveFeature(featureId);
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

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'faceDetection':
        return (
          <FaceDetection
            videoRef={videoRef}
            enabled={true}
            settings={{
              minConfidence: 0.5,
              maxFaces: 10,
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
              maxFaces: 5,
              drawMesh: true,
              drawContours: true,
              drawIris: true
            }}
          />
        );
      case 'handPose':
        return (
          <HandPoseDetection
            videoRef={videoRef}
            enabled={true}
            settings={{
              minConfidence: 0.5,
              maxHands: 2,
              drawPoints: true,
              drawSkeleton: true,
              gestureDetection: true
            }}
          />
        );
      case 'bodySegmentation':
        return (
          <BodySegmentation
            videoRef={videoRef}
            enabled={true}
            settings={{
              mode: 'blur',
              blurAmount: 10,
              backgroundColor: '#00FF00'
            }}
            onSegmentationComplete={(canvas) => {
              canvas.toBlob((blob) => {
                if (blob) handleProcessingComplete(blob);
              });
            }}
          />
        );
      case 'videoStabilization':
        return (
          <VideoStabilization
            videoRef={videoRef}
            enabled={true}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      case 'smartCropping':
        return (
          <SmartCropping
            videoRef={videoRef}
            enabled={true}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      case 'frameInterpolation':
        return (
          <VideoFrameInterpolation
            videoRef={videoRef}
            outputCanvasRef={outputCanvasRef}
            enabled={true}
            settings={{
              factor: 2,
              quality: 'medium',
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

  return (
    <div className="relative">
      {/* Hidden output canvas */}
      <canvas ref={outputCanvasRef} className="hidden" />
      
      {/* Feature selector button */}
      <div className="absolute bottom-4 right-4 z-20">
        <AIFeatureSelector
          onFeatureSelect={handleFeatureSelect}
          activeFeature={activeFeature}
          videoRef={videoRef}
        />
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
      
      {/* Render the active feature component */}
      {renderActiveFeature()}
      
      {/* Processing overlay */}
      <AIProcessingOverlay
        isVisible={isProcessing}
        progress={processingProgress}
        message={`Processing ${activeFeature?.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
      />
      
      {/* Feature info badge when an AI feature is active */}
      {activeFeature && !isProcessing && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm z-10 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          <span>
            {activeFeature.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}
          </span>
        </div>
      )}
    </div>
  );
};