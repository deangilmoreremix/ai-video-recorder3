import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, Upload, Volume2, VolumeX, Maximize2, Minimize2,
  Play, Pause, Square, Brain, Camera, Monitor, Layout,
  Settings, HelpCircle, Download, Save, Mic, MicOff,
  ChevronDown, AlertCircle
} from 'lucide-react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { AIFeatureGrid } from '../AI/AIFeatureGrid';
import { AIProcessingOverlay } from '../AI/AIProcessingOverlay';
import { EnhancedDownloadDialog } from './EnhancedDownloadDialog';
import { Tooltip } from '../ui/Tooltip';

interface AudioDevice {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [micVolume, setMicVolume] = useState(1);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // AI Features
  const { features, toggleFeature } = useAIFeatures();

  // Get available audio devices
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
          }));
        setAudioDevices(audioInputs);
        
        if (!selectedMicId && audioInputs.length > 0) {
          setSelectedMicId(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };

    getAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, []);

  // Clean up streams when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    chunksRef.current = [];
    
    try {
      let stream: MediaStream;
      const audioConstraints = {
        deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      switch (recordingMode) {
        case 'screen': {
          try {
            // First get the display media (screen)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: true
            });
            
            // Then get audio from the microphone
            const micStream = await navigator.mediaDevices.getUserMedia({ 
              audio: audioConstraints 
            });
            
            // Create a new stream with video from screen and audio from mic
            const tracks = [
              ...displayStream.getVideoTracks(),
              ...micStream.getAudioTracks()
            ];
            
            stream = new MediaStream(tracks);
            
            // Save reference to both streams for cleanup
            displayStream.getTracks().forEach(track => {
              track.onended = () => {
                if (isRecording) {
                  stopRecording();
                }
              };
            });
          } catch (error) {
            console.error("Error obtaining screen media:", error);
            setErrorMessage("Failed to access your screen. Please ensure you grant permission when prompted.");
            setIsProcessing(false);
            return;
          }
          break;
        }
        case 'pip': {
          try {
            // Get screen stream
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: true
            });
            
            // Get webcam stream
            const webcamStream = await navigator.mediaDevices.getUserMedia({ 
              video: true,
              audio: audioConstraints 
            });
            
            // For PiP we need video from screen, optional video from webcam for PiP, and audio from mic
            stream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...webcamStream.getAudioTracks()
            ]);
            
            // Handle screen share being stopped by user
            displayStream.getVideoTracks()[0].onended = () => {
              if (isRecording) {
                stopRecording();
              }
            };
            
            // Save reference to webcam video for PiP display
            // In a real implementation, you would need additional UI for the PiP
            // This is just showing how to get both streams
          } catch (error) {
            console.error("Error setting up PiP:", error);
            setErrorMessage("Failed to access your screen and camera. Please ensure you grant all required permissions.");
            setIsProcessing(false);
            return;
          }
          break;
        }
        default: // webcam
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: true,
              audio: audioConstraints
            });
          } catch (error) {
            console.error("Error accessing webcam:", error);
            setErrorMessage("Failed to access your camera. Please ensure you grant permission and that your camera is not in use by another application.");
            setIsProcessing(false);
            return;
          }
          break;
      }

      // Store stream for cleanup
      streamRef.current = stream;

      // Display the stream in the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(error => {
            console.error("Error playing video:", error);
          });
        };
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create the final recording blob
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setRecordedBlob(blob);
        setShowDownloadDialog(true);
        
        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Reset the video element
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setErrorMessage('An unexpected error occurred while starting the recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Video Recorder</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg ${showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Upload Overlay - shown when no recording/preview is active */}
        {!isRecording && !videoRef.current?.srcObject && (
          <div 
            className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUpload(e);
            }}
            onClick={() => document.createElement('input')}
          >
            <div className="text-white text-center">
              <Upload className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Drop video or click to upload</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="absolute top-2 left-2 right-2 bg-red-500 text-white p-2 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-auto p-1 hover:bg-red-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setRecordingMode('webcam')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'webcam' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>Webcam</span>
            </button>
            <button
              onClick={() => setRecordingMode('screen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'screen' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span>Screen</span>
            </button>
            <button
              onClick={() => setRecordingMode('pip')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                recordingMode === 'pip' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Layout className="w-5 h-5" />
              <span>PiP</span>
            </button>
          </div>

          {/* Microphone Selection */}
          <div className="relative">
            <button
              onClick={() => setShowMicMenu(!showMicMenu)}
              className={`p-2 rounded-lg flex items-center space-x-2 ${
                isMicMuted ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'
              }`}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showMicMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-2 z-10">
                <div className="space-y-2">
                  {audioDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        setSelectedMicId(device.deviceId);
                        setShowMicMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left rounded-lg ${
                        selectedMicId === device.deviceId
                          ? 'bg-[#E44E51]/10 text-[#E44E51]'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {device.label}
                    </button>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between px-3 py-2">
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
                      className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-100"
                    >
                      {isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span>Start Recording</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 px-6 py-2 bg-red-500 text-white rounded-lg 
                hover:bg-red-600 shadow-lg"
            >
              <Square className="w-5 h-5" />
              <span>Stop Recording</span>
            </button>
          )}
        </div>

        {/* AI Features */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            AI Features
          </h4>
          <AIFeatureGrid
            features={features}
            onToggleFeature={toggleFeature}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Download Dialog */}
      <EnhancedDownloadDialog
        isOpen={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        recordedBlob={recordedBlob}
      />
    </div>
  );
};