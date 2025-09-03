import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, Sparkles, Layout, Focus, CloudFog, Zap, 
  Wind, Palette, Gauge, Eye, Scan, Settings, Play,
  Pause, Download, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import { Tooltip } from '../ui/Tooltip';

interface AIPreviewEditorProps {
  videoUrl: string;
  onProcessingComplete?: (blob: Blob) => void;
}

export const AIPreviewEditor: React.FC<AIPreviewEditorProps> = ({
  videoUrl,
  onProcessingComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    features,
    toggleFeature,
    updateFeatureSettings,
    processFrame,
    isModelsLoaded
  } = useAIFeatures();

  // Process frames with AI features
  useEffect(() => {
    let animationFrame: number;
    
    const processVideoFrame = async () => {
      if (videoRef.current && canvasRef.current && isPlaying && isModelsLoaded) {
        await processFrame(videoRef.current, canvasRef.current);
        animationFrame = requestAnimationFrame(processVideoFrame);
      }
    };

    if (isPlaying && isModelsLoaded) {
      processVideoFrame();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, isModelsLoaded, processFrame]);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const processVideo = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate processing progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create a new video with AI effects
      if (videoRef.current && canvasRef.current) {
        const stream = canvasRef.current.captureStream();
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          onProcessingComplete?.(blob);
        };

        mediaRecorder.start();
        videoRef.current.play();

        // Record for the duration of the video
        await new Promise(resolve => {
          videoRef.current!.onended = resolve;
        });

        mediaRecorder.stop();
      }
    } catch (error) {
      console.error('Error processing video:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Enhancement</h3>
        <button
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          className={`p-2 rounded-lg ${
            showAdvancedSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
        <AIProcessingOverlay
          isVisible={isProcessing}
          progress={progress}
          message="Applying AI enhancements..."
        />

        {/* Playback Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex justify-between items-center">
            <button
              onClick={togglePlayback}
              className="p-2 bg-white rounded-full hover:bg-gray-100"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (navigator.share && videoUrl) {
                    navigator.share({
                      title: 'AI Enhanced Video',
                      text: 'Check out this AI-enhanced video!',
                      url: videoUrl
                    });
                  } else {
                    // Fallback: copy URL to clipboard
                    navigator.clipboard.writeText(videoUrl);
                    alert('Video URL copied to clipboard!');
                  }
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (canvasRef.current) {
                    canvasRef.current.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'ai-enhanced-frame.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }, 'image/png');
                  }
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          AI Features
        </h4>
        <AIFeatureGrid
          enabledFeatures={features}
          onFeatureToggle={toggleFeature}
          isProcessing={isProcessing}
        />
      </div>

      {/* Process Button */}
      <div className="flex justify-end">
        <button
          onClick={processVideo}
          disabled={isProcessing}
          className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white rounded-lg 
            hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:opacity-50 
            disabled:cursor-not-allowed transition-all duration-200"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isProcessing ? 'Processing...' : 'Apply AI Enhancement'}</span>
        </button>
      </div>
    </div>
  );
};