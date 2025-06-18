import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Upload, Volume2, VolumeX, Maximize2, Minimize2,
  Play, Pause, Square, Brain, Camera, Monitor, Layout,
  Settings, HelpCircle, Download, Save, Mic, MicOff,
  ChevronDown, Sliders, RefreshCw, Eye, X, Video as VideoIcon,
  List, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIVideoFeatures } from '../AI/AIVideoFeatures';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import EnhancedExportDialog from '../Export/EnhancedExportDialog';
import { Tooltip } from '../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioDevice {
  deviceId: string;
  label: string;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const VideoRecorder: React.FC = () => {
  // Recording state
  const [recordingMode, setRecordingMode] = useState<'webcam' | 'screen' | 'pip'>('webcam');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [disableAIProcessing, setDisableAIProcessing] = useState(false);

  // Error state for debugging
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  // Audio state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micVolume, setMicVolume] = useState(1);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);

  // Video state
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  // AI state
  const [showAIFeatures, setShowAIFeatures] = useState(true); // Set to true by default to always show AI features
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [showFullAI, setShowFullAI] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Features
  const { features, toggleFeature, loadModels, isModelsLoaded, processFrame } = useAIFeatures();

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Load AI models on component mount
  useEffect(() => {
    loadModels().catch(err => {
      console.error("Failed to load AI models:", err);
      setDebugInfo(prev => ({
        ...prev,
        aiModelsError: err.message || String(err)
      }));
    });
  }, [loadModels]);

  // Get available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
          }));
        
        setAudioDevices(audioInputs);
        
        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`
          }));
        setVideoDevices(videoInputs);
        
        // Set default devices if available
        if (!selectedMicId && audioInputs.length > 0) {
          setSelectedMicId(audioInputs[0].deviceId);
        }
        if (!selectedCameraId && videoInputs.length > 0) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }

        setDebugInfo(prev => ({
          ...prev,
          audioDevices: audioInputs.length,
          videoDevices: videoInputs.length
        }));
      } catch (error) {
        console.error('Error getting media devices:', error);
        setDebugInfo(prev => ({
          ...prev,
          deviceError: error instanceof Error ? error.message : String(error)
        }));
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // Clean up streams when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl);
      }
    };
  }, [processedVideoUrl]);

  // Setup initial webcam preview
  useEffect(() => {
    const setupInitialPreview = async () => {
      try {
        if (!videoRef.current || videoRef.current.srcObject) return;
        
        // Only set up preview if we have camera and mic permissions
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
            audio: false // No audio needed for preview
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            videoRef.current.play().catch(err => {
              console.warn("Autoplay prevented:", err);
              setDebugInfo(prev => ({
                ...prev,
                autoplayError: err.message || String(err)
              }));
            });
          }
        } catch (err) {
          console.error('Error setting up initial preview:', err);
          setDebugInfo(prev => ({
            ...prev,
            previewError: err instanceof Error ? err.message : String(err)
          }));
        }
      } catch (err) {
        console.error('Error setting up initial preview:', err);
        setDebugInfo(prev => ({
          ...prev,
          previewSetupError: err instanceof Error ? err.message : String(err)
        }));
      }
    };
    
    setupInitialPreview();
  }, [selectedCameraId]);

  // Process frames with AI when not recording
  useEffect(() => {
    let animationFrame: number;
    
    const processCameraPreview = async () => {
      if (isRecording || !videoRef.current || !isModelsLoaded || disableAIProcessing) {
        animationFrame = requestAnimationFrame(processCameraPreview);
        return;
      }
      
      if (videoRef.current.readyState >= 2) {
        try {
          // Create a temporary canvas for processing if needed
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = videoRef.current.videoWidth;
          tempCanvas.height = videoRef.current.videoHeight;
          
          // Process the frame
          await processFrame(videoRef.current, tempCanvas);
          
          // Draw the processed frame to the video element if any feature is enabled
          const hasEnabledFeatures = Object.values(features).some(f => f.enabled);
          
          if (hasEnabledFeatures) {
            // Create a temporary video stream from the canvas
            const stream = tempCanvas.captureStream();
            
            // Apply the stream directly to the video element
            if (videoRef.current.srcObject !== stream && !isRecording) {
              // Store the original stream for recording
              if (!streamRef.current) {
                streamRef.current = videoRef.current.srcObject as MediaStream;
              }
              
              // Apply processed stream for display only
              videoRef.current.srcObject = stream;
            }
          } else if (streamRef.current && videoRef.current.srcObject !== streamRef.current) {
            // Restore original stream if no features are enabled
            videoRef.current.srcObject = streamRef.current;
          }
        } catch (error) {
          console.error('Error processing preview:', error);
          setDebugInfo(prev => ({
            ...prev,
            previewProcessingError: error instanceof Error ? error.message : String(error)
          }));
        }
      }
      
      animationFrame = requestAnimationFrame(processCameraPreview);
    };
    
    if (!isRecording && !showFullAI && !disableAIProcessing) {
      processCameraPreview();
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isRecording, showFullAI, processFrame, isModelsLoaded, features, disableAIProcessing]);

  const checkMediaRecorderSupport = () => {
    // Check if MediaRecorder is supported
    if (typeof MediaRecorder === 'undefined') {
      setErrorMessage('MediaRecorder API is not supported in your browser');
      setDebugInfo(prev => ({
        ...prev,
        mediaRecorderSupported: false
      }));
      return false;
    }

    // Check MIME type support
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    const supportedTypes = mimeTypes.filter(type => MediaRecorder.isTypeSupported(type));
    
    setDebugInfo(prev => ({
      ...prev,
      supportedMimeTypes: supportedTypes,
      mediaRecorderSupported: true
    }));

    if (supportedTypes.length === 0) {
      setErrorMessage('No supported video MIME types found in your browser');
      return false;
    }

    return supportedTypes[0]; // Return the first supported type
  };

  const getMediaStreamWithErrorHandling = async (mode: 'webcam' | 'screen' | 'pip') => {
    try {
      let stream: MediaStream;
      const audioConstraints = {
        deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      const videoConstraints = selectedCameraId 
        ? { deviceId: { exact: selectedCameraId } }
        : true;

      switch (mode) {
        case 'screen':
          try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: { 
                frameRate: { ideal: 30 },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              },
              audio: true 
            });
            
            let micStream;
            try {
              micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: audioConstraints 
              });
            } catch (err) {
              console.warn('Unable to access microphone, recording without audio:', err);
              
              let errorMessage = 'Microphone access error';
              if (err instanceof DOMException) {
                switch(err.name) {
                  case 'NotAllowedError':
                    errorMessage = 'Microphone permission denied';
                    break;
                  case 'NotFoundError':
                    errorMessage = 'No microphone found';
                    break;
                  case 'NotReadableError':
                    errorMessage = 'Microphone is already in use';
                    break;
                  default:
                    errorMessage = `Microphone error: ${err.name}`;
                }
              }
              
              setDebugInfo(prev => ({
                ...prev,
                microphoneError: errorMessage
              }));
            }
            
            const screenTracks = screenStream.getTracks();
            const audioTracks = micStream ? micStream.getAudioTracks() : [];
            
            stream = new MediaStream([
              ...screenTracks,
              ...audioTracks
            ]);
            break;
          } catch (err) {
            let errorMessage = 'Screen sharing error';
            if (err instanceof DOMException) {
              switch(err.name) {
                case 'NotAllowedError':
                  errorMessage = 'Screen sharing permission denied';
                  break;
                case 'NotFoundError':
                  errorMessage = 'No screen found to share';
                  break;
                case 'NotReadableError':
                  errorMessage = 'Screen is already being captured';
                  break;
                case 'AbortError':
                  errorMessage = 'Screen share was canceled by the user';
                  break;
                default:
                  errorMessage = `Screen sharing error: ${err.name}`;
              }
            }
            
            setErrorMessage(errorMessage);
            setDebugInfo(prev => ({
              ...prev,
              screenSharingError: errorMessage
            }));
            throw err;
          }
          
        case 'pip':
          try {
            const [displayStream, webcamStream] = await Promise.all([
              navigator.mediaDevices.getDisplayMedia({ 
                video: {
                  frameRate: { ideal: 30 },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                },
                audio: true 
              }),
              navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints,
                audio: audioConstraints 
              })
            ]);
            
            // We'll keep webcam video and screen audio
            const screenAudioTracks = displayStream.getAudioTracks();
            const webcamVideoTracks = webcamStream.getVideoTracks();
            const webcamAudioTracks = webcamStream.getAudioTracks();
            
            stream = new MediaStream([
              ...webcamVideoTracks,
              ...screenAudioTracks,
              ...webcamAudioTracks
            ]);
          } catch (err) {
            let errorMessage = 'PiP mode error';
            if (err instanceof DOMException) {
              switch(err.name) {
                case 'NotAllowedError':
                  errorMessage = 'Permission denied for camera, microphone, or screen';
                  break;
                case 'NotFoundError':
                  errorMessage = 'Required device not found';
                  break;
                case 'AbortError':
                  errorMessage = 'Setup was canceled by the user';
                  break;
                default:
                  errorMessage = `PiP setup error: ${err.name}`;
              }
            }
            
            setErrorMessage(errorMessage);
            setDebugInfo(prev => ({
              ...prev,
              pipModeError: errorMessage
            }));
            throw new Error('Failed to set up Picture-in-Picture mode: ' + errorMessage);
          }
          break;
          
        default: // webcam
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: videoConstraints,
              audio: audioConstraints
            });
            
            setDebugInfo(prev => ({
              ...prev,
              webcamStreamActive: true,
              webcamTracks: stream.getTracks().map(track => ({
                kind: track.kind,
                label: track.label,
                enabled: track.enabled
              }))
            }));
            
            return stream;
          } catch (err) {
            let errorMessage = 'Webcam recording error';
            if (err instanceof DOMException) {
              switch(err.name) {
                case 'NotAllowedError':
                  errorMessage = 'Camera or microphone permission denied';
                  break;
                case 'NotFoundError':
                  errorMessage = 'No camera or microphone found';
                  break;
                case 'NotReadableError':
                  errorMessage = 'Camera or microphone is already in use';
                  break;
                default:
                  errorMessage = `Webcam error: ${err.name}`;
              }
            }
            
            setErrorMessage(errorMessage);
            setDebugInfo(prev => ({
              ...prev,
              webcamError: errorMessage
            }));
            throw err;
          }
      }

      return stream;
    } catch (err) {
      setDebugInfo(prev => ({
        ...prev,
        streamAcquisitionError: err instanceof Error ? err.message : String(err)
      }));
      throw err;
    }
  };

  const startRecording = async () => {
    // Reset error states
    setErrorMessage(null);
    setIsProcessing(true);
    chunksRef.current = [];
    setRecordingTime(0);
    
    try {
      // Check MediaRecorder support
      const supportedMimeType = checkMediaRecorderSupport();
      if (!supportedMimeType) {
        setIsProcessing(false);
        return;
      }

      // Get media stream with enhanced error handling
      const stream = await getMediaStreamWithErrorHandling(recordingMode);
      streamRef.current = stream;

      // Set up video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.play().catch(err => {
          console.warn("Video preview play failed:", err);
          setDebugInfo(prev => ({
            ...prev,
            videoPlayError: err.message
          }));
        });
      }

      // Set up media recorder with supported options
      try {
        const options = { 
          mimeType: supportedMimeType as string
        };
        
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        
        setDebugInfo(prev => ({
          ...prev,
          mediaRecorderCreated: true,
          mediaRecorderMimeType: mediaRecorderRef.current.mimeType
        }));
      } catch (e) {
        console.warn('MediaRecorder with specified options failed:', e);
        setDebugInfo(prev => ({
          ...prev,
          mediaRecorderInitError: e instanceof Error ? e.message : String(e)
        }));
        
        // Fallback to default settings
        try {
          mediaRecorderRef.current = new MediaRecorder(stream);
          setDebugInfo(prev => ({
            ...prev, 
            mediaRecorderFallback: true,
            mediaRecorderFallbackMimeType: mediaRecorderRef.current.mimeType
          }));
        } catch (fallbackError) {
          console.error('MediaRecorder creation failed with fallback settings:', fallbackError);
          setErrorMessage('Your browser cannot create a MediaRecorder with the available settings');
          setDebugInfo(prev => ({
            ...prev,
            mediaRecorderFallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }));
          throw fallbackError;
        }
      }

      // Add error event listener
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const error = event.error;
        setErrorMessage(`Recording error: ${error?.name || 'Unknown error'}`);
        setDebugInfo(prev => ({
          ...prev,
          mediaRecorderError: error?.message || 'Unknown error'
        }));
      };

      // Set up data handler
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setDebugInfo(prev => ({
            ...prev,
            chunksReceived: (prev.chunksReceived || 0) + 1,
            lastChunkSize: e.data.size
          }));
        }
      };

      // Handle recording completion
      mediaRecorderRef.current.onstop = () => {
        // Create final video blob
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        
        setDebugInfo(prev => ({
          ...prev,
          recordingCompleted: true,
          finalBlobSize: blob.size,
          finalBlobType: blob.type,
          chunksCount: chunksRef.current.length
        }));
        
        // Clean up recording resources
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // Stop tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Show download dialog
        setShowDownloadDialog(true);
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      
      let errorMsg = 'Failed to start recording';
      if (err instanceof Error) {
        errorMsg = `Failed to start recording: ${err.message}`;
      } else if (err instanceof DOMException) {
        errorMsg = `Failed to start recording: ${err.name} - ${err.message}`;
      }
      
      setErrorMessage(errorMsg);
      setDebugInfo(prev => ({
        ...prev,
        startRecordingError: err instanceof Error ? err.message : String(err)
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setDebugInfo(prev => ({
          ...prev,
          recordingStopped: true
        }));
      } catch (error) {
        console.error("Error stopping recording:", error);
        setDebugInfo(prev => ({
          ...prev,
          stopRecordingError: error instanceof Error ? error.message : String(error)
        }));
      }
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        mediaRecorderRef.current.pause();
        setDebugInfo(prev => ({
          ...prev,
          recordingPaused: true
        }));
      } catch (error) {
        console.error("Error pausing recording:", error);
        setDebugInfo(prev => ({
          ...prev,
          pauseRecordingError: error instanceof Error ? error.message : String(error)
        }));
      }
      setIsPaused(true);
      
      // Pause timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        mediaRecorderRef.current.resume();
        setDebugInfo(prev => ({
          ...prev,
          recordingResumed: true
        }));
      } catch (error) {
        console.error("Error resuming recording:", error);
        setDebugInfo(prev => ({
          ...prev,
          resumeRecordingError: error instanceof Error ? error.message : String(error)
        }));
      }
      setIsPaused(false);
      
      // Resume timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    }
  };

  const handleUpload = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files) {
      file = e.target.files[0];
    }

    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      
      // Clean up any previous URL
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl);
        setProcessedVideoUrl(null);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.load();
        videoRef.current.play();
      }
    }
  };

  const handleAIProcessingComplete = (processedBlob: Blob) => {
    // Clean up any previous URL
    if (processedVideoUrl) {
      URL.revokeObjectURL(processedVideoUrl);
    }
    
    // Create URL for processed video
    const url = URL.createObjectURL(processedBlob);
    setProcessedVideoUrl(url);
    setVideoProcessed(true);
    
    // Update video player with processed video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play();
    }
    
    // Store for potential download
    setRecordedBlob(processedBlob);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Video Recorder</h3>
        <div className="flex space-x-2 items-center">
          <Link to="/recordings" className="text-[#E44E51] flex items-center hover:underline mr-2">
            <VideoIcon className="w-4 h-4 mr-1" />
            <span className="text-sm">My Recordings</span>
          </Link>
          
          <Tooltip content="Recording Settings">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="AI Features">
            <button
              onClick={() => setShowAIFeatures(!showAIFeatures)}
              className={`p-2 rounded-lg ${showAIFeatures ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
            >
              <Brain className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{errorMessage}</p>
            <button 
              className="text-sm text-red-700 underline mt-1"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? 'Hide debugging info' : 'Show debugging info'}
            </button>
          </div>
        </div>
      )}

      {/* Debug Info Panel */}
      {showDebugInfo && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs font-mono overflow-x-auto">
          <h4 className="font-medium text-sm mb-2">Debug Information</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          
          <div className="mt-3 pt-3 border-t border-gray-300 flex space-x-3">
            <button
              onClick={() => setDisableAIProcessing(!disableAIProcessing)}
              className={`px-3 py-1.5 text-sm rounded ${
                disableAIProcessing ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}
            >
              {disableAIProcessing ? 'AI Processing Disabled' : 'Disable AI Processing'}
            </button>
            
            <button
              onClick={() => {
                // Clear error states and debug info
                setErrorMessage(null);
                setDebugInfo({});
                setShowDebugInfo(false);
                
                // Try to reload devices
                navigator.mediaDevices.enumerateDevices().then(devices => {
                  console.log('Devices refreshed:', devices.length);
                });
              }}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white"
            >
              Reset & Retry
            </button>
          </div>
        </div>
      )}

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Upload Overlay - only show when not recording */}
        {!isRecording && (
          <div 
            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 
              transition-opacity flex items-center justify-center cursor-pointer z-10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUpload(e);
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'video/*';
              input.onchange = (e) => handleUpload(e as React.ChangeEvent<HTMLInputElement>);
              input.click();
            }}
          >
            <div className="text-white text-center">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Drop video or click to upload</p>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        <AIProcessingOverlay
          isVisible={isProcessing}
          message="Initializing recording..."
        />

        {/* AI features overlay */}
        {showFullAI && (
          <div className="absolute inset-0 z-20">
            <AIVideoFeatures
              videoRef={videoRef}
              onProcessingComplete={handleAIProcessingComplete}
            />
            <button
              onClick={() => setShowFullAI(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Recording timer */}
        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
        
        {/* Video processed badge */}
        {videoProcessed && !isRecording && !showFullAI && (
          <div className="absolute top-4 left-4 bg-green-600 px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>AI Processing Applied</span>
          </div>
        )}
      </div>

      {/* Mode Selection & Recording Controls */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setRecordingMode('webcam')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'webcam' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Camera className="w-5 h-5" />
              <span>Webcam</span>
            </button>
            <button
              onClick={() => setRecordingMode('screen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'screen' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Monitor className="w-5 h-5" />
              <span>Screen</span>
            </button>
            <button
              onClick={() => setRecordingMode('pip')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'pip' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
              disabled={isRecording}
            >
              <Layout className="w-5 h-5" />
              <span>PiP</span>
            </button>
          </div>

          {/* Device Selection */}
          <div className="flex space-x-2">
            {/* Camera dropdown */}
            <div className="relative">
              <Tooltip content="Select camera">
                <button
                  onClick={() => setShowVideoMenu(!showVideoMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  disabled={isRecording}
                >
                  <Camera className="w-5 h-5" />
                </button>
              </Tooltip>
              
              <AnimatePresence>
                {showVideoMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg z-20"
                  >
                    <div className="p-2">
                      <h4 className="text-sm font-medium px-2 py-1">Select Camera</h4>
                      {videoDevices.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-red-500">
                          No cameras detected. Please check your device connections.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {videoDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              onClick={() => {
                                setSelectedCameraId(device.deviceId);
                                setShowVideoMenu(false);
                              }}
                              className={`w-full px-2 py-1.5 text-sm text-left rounded ${
                                selectedCameraId === device.deviceId
                                  ? 'bg-[#E44E51]/10 text-[#E44E51]'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {device.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Microphone dropdown */}
            <div className="relative">
              <Tooltip content="Microphone settings">
                <button
                  onClick={() => setShowMicMenu(!showMicMenu)}
                  className={`p-2 rounded-lg ${
                    isMicMuted ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'
                  }`}
                  disabled={isRecording}
                >
                  {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </Tooltip>
              
              <AnimatePresence>
                {showMicMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg z-20"
                  >
                    <div className="p-2">
                      <h4 className="text-sm font-medium px-2 py-1">Select Microphone</h4>
                      {audioDevices.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-red-500">
                          No microphones detected. Please check your device connections.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {audioDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              onClick={() => {
                                setSelectedMicId(device.deviceId);
                                setShowMicMenu(false);
                              }}
                              className={`w-full px-2 py-1.5 text-sm text-left rounded ${
                                selectedMicId === device.deviceId
                                  ? 'bg-[#E44E51]/10 text-[#E44E51]'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              {device.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="border-t mt-2 pt-2">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-sm">Microphone Volume</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={micVolume}
                            onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                            className="w-24 accent-[#E44E51]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setIsMicMuted(!isMicMuted);
                            setShowMicMenu(false);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-gray-100"
                        >
                          {isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Recordings link */}
            <Link 
              to="/recordings"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Tooltip content="View recordings">
                <List className="w-5 h-5" />
              </Tooltip>
            </Link>
          </div>
        </div>

        {/* Advanced Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    Video Settings
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Resolution</label>
                      <select className="w-full rounded-lg border-gray-300">
                        <option value="1080p">1080p (1920x1080)</option>
                        <option value="720p">720p (1280x720)</option>
                        <option value="480p">480p (854x480)</option>
                        <option value="360p">360p (640x360)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Frame Rate</label>
                      <select className="w-full rounded-lg border-gray-300">
                        <option value="30">30 fps</option>
                        <option value="60">60 fps</option>
                        <option value="24">24 fps (Film)</option>
                        <option value="15">15 fps (Low Bandwidth)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Quality</label>
                      <select className="w-full rounded-lg border-gray-300">
                        <option value="high">High (8 Mbps)</option>
                        <option value="medium">Medium (4 Mbps)</option>
                        <option value="low">Low (2 Mbps)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Audio Settings
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Noise Suppression</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                          peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                          peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                          after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                          after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Echo Cancellation</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                          peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                          peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                          after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                          after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Sample Rate</label>
                      <select className="w-full rounded-lg border-gray-300">
                        <option value="48000">48 kHz</option>
                        <option value="44100">44.1 kHz</option>
                        <option value="22050">22.05 kHz</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Sliders className="w-4 h-4 mr-2" />
                  Recording Settings
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Recording Mode</label>
                    <select className="w-full rounded-lg border-gray-300">
                      <option value="continuous">Continuous</option>
                      <option value="timed">Timed Recording</option>
                      <option value="segments">Segmented</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Format</label>
                    <select className="w-full rounded-lg border-gray-300">
                      <option value="webm">WebM</option>
                      <option value="mp4">MP4</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">Countdown Before Recording</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                      peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                      peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                      after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Features Panel - Always shown */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">AI Features</h4>
            <button 
              onClick={() => setShowFullAI(true)}
              className="text-sm text-[#E44E51] font-medium"
            >
              Advanced Mode
            </button>
          </div>
          
          <AIFeatureGrid
            enabledFeatures={features}
            onFeatureToggle={toggleFeature}
            isProcessing={isProcessing}
            compact={true}
          />
        </div>

        {/* Record Button */}
        <div className="flex justify-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-[#E44E51] text-white rounded-lg 
                hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 disabled:opacity-50"
            >
              <Video className="w-5 h-5" />
              <span>{isProcessing ? 'Initializing...' : 'Start Recording'}</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg 
                    hover:bg-blue-600 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 px-6 py-2 bg-yellow-500 text-white rounded-lg 
                    hover:bg-yellow-600 shadow-lg"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-2 bg-red-500 text-white rounded-lg 
                  hover:bg-red-600 shadow-lg"
              >
                <Square className="w-5 h-5" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Export Dialog */}
      {showDownloadDialog && (
        <EnhancedExportDialog 
          isOpen={showDownloadDialog}
          onClose={() => setShowDownloadDialog(false)}
          videoBlob={recordedBlob}
        />
      )}
    </div>
  );
};