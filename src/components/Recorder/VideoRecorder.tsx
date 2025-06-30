import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Upload, Volume2, VolumeX, Maximize2, Minimize2,
  Play, Pause, Square, Brain, Camera, Monitor, Layout,
  Settings, HelpCircle, Download, Save, Mic, MicOff,
  ChevronDown, Sliders, RefreshCw, Eye, X
} from 'lucide-react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIVideoFeatures } from '../AI/AIVideoFeatures';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import { EnhancedDownloadDialog } from './EnhancedDownloadDialog';
import { Tooltip } from '../ui/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { addRecording } from '../../utils/supabaseClient';

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
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [videoProcessed, setVideoProcessed] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [showFullAI, setShowFullAI] = useState(false);
  
  // Recording details
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingTags, setRecordingTags] = useState<string[]>([]);
  const [recordingFolder, setRecordingFolder] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI Features
  const { features, toggleFeature, loadModels, isModelsLoaded } = useAIFeatures();

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Load AI models
  useEffect(() => {
    loadModels().catch(err => {
      console.error("Failed to load AI models:", err);
    });
  }, [loadModels]);

  // Get available devices
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
      } catch (error) {
        console.error('Error getting media devices:', error);
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
          }
        } catch (err) {
          console.error('Error setting up initial preview:', err);
        }
      } catch (err) {
        console.error('Error setting up initial preview:', err);
      }
    };
    
    setupInitialPreview();
  }, [selectedCameraId]);

  const startRecording = async () => {
    setIsProcessing(true);
    chunksRef.current = [];
    setRecordingTime(0);
    
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

      switch (recordingMode) {
        case 'screen':
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
          }
          
          const screenTracks = screenStream.getTracks();
          const audioTracks = micStream ? micStream.getAudioTracks() : [];
          
          stream = new MediaStream([
            ...screenTracks,
            ...audioTracks
          ]);
          break;
          
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
            console.error('Error setting up PiP mode:', err);
            throw new Error('Failed to set up Picture-in-Picture mode. Please try again.');
          }
          break;
          
        default: // webcam
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints,
            audio: audioConstraints
          });
          break;
      }

      // Store the stream for cleanup
      streamRef.current = stream;

      // Set up video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.play();
      }

      // Set up media recorder with options for better quality
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000 // 128 kbps
      };
      
      try {
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
      } catch (e) {
        // Fallback if vp9 is not supported
        console.log('VP9 not supported, falling back to default codec');
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
      }

      // Set up data handler
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Handle recording completion
      mediaRecorderRef.current.onstop = () => {
        // Create final video blob
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        
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
        
        // Set default title based on date and time
        const now = new Date();
        setRecordingTitle(`Recording ${now.toLocaleString()}`);
        
        // Set tags based on mode
        setRecordingTags([recordingMode]);
        
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
      alert(`Failed to start recording: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
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
      mediaRecorderRef.current.resume();
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
  
  const saveRecordingToDatabase = async (blob: Blob, videoUrl: string, thumbnailUrl: string) => {
    try {
      // Get metadata from the video
      let duration = 0;
      let width = 0;
      let height = 0;
      
      if (videoRef.current) {
        duration = videoRef.current.duration;
        width = videoRef.current.videoWidth;
        height = videoRef.current.videoHeight;
      }
      
      // Get file format from blob type
      const format = blob.type.split('/')[1]?.split(';')[0] || 'webm';
      
      // Save to database
      await addRecording({
        title: recordingTitle,
        url: videoUrl,
        thumbnail: thumbnailUrl,
        duration,
        size: blob.size,
        resolution: `${width}x${height}`,
        format,
        favorite: false,
        folder: recordingFolder,
        tags: recordingTags
      });
      
      // Close dialog and reset state
      setShowDownloadDialog(false);
      setRecordedBlob(null);
      setRecordingTitle('');
      setRecordingTags([]);
      setRecordingFolder(null);
      
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Advanced Video Recorder</h3>
        <div className="flex space-x-2">
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

        {/* AI Features Panel */}
        <AnimatePresence>
          {showAIFeatures && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
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
                  features={features}
                  onToggleFeature={toggleFeature}
                  isProcessing={isProcessing}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Record Button */}
        <div className="flex justify-center space-y-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-6 py-3 bg-[#E44E51] text-white rounded-lg 
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
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg 
                    hover:bg-blue-600 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 text-white rounded-lg 
                    hover:bg-yellow-600 shadow-lg"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg 
                  hover:bg-red-600 shadow-lg"
              >
                <Square className="w-5 h-5" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download Dialog */}
      <EnhancedDownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        recordedBlob={recordedBlob}
        onSave={(blob, videoUrl, thumbnailUrl) => saveRecordingToDatabase(blob, videoUrl, thumbnailUrl)}
        recordingTitle={recordingTitle}
        recordingTags={recordingTags}
        recordingFolder={recordingFolder}
        onRecordingTitleChange={setRecordingTitle}
        onRecordingTagsChange={setRecordingTags}
        onRecordingFolderChange={setRecordingFolder}
      />
    </div>
  );
};