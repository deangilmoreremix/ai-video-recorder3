import React, { useState, useRef, useEffect } from 'react';
import { Video, Upload, Volume2, Play, Pause, Square, Brain, Camera, Monitor, Layout, Settings, Mic, MicOff, Sliders, RefreshCw, X, AlertCircle } from 'lucide-react';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import {
  createMediaRecorder,
  getMediaErrorMessage,
  getMediaSupportError,
  mixAudioTracks,
  MixedAudio
} from '../../hooks/useVideoRecorder';
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
  const [error, setError] = useState<string | null>(null);

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
  const timerIntervalRef = useRef<number | null>(null);
  const audioMixRef = useRef<MixedAudio | null>(null);
  // Source streams (screen, webcam, mic) – the recorded stream only holds a
  // subset of their tracks, so they need to be released separately.
  const sourceStreamsRef = useRef<MediaStream[]>([]);
  const localVideoUrlRef = useRef<string | null>(null);

  // AI Features
  const { features, toggleFeature, loadModels } = useAIFeatures();

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const stopTimer = () => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
  };

  // Release every capture track (camera, mic, screen) plus the audio mixer
  const releaseStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    sourceStreamsRef.current.forEach(source => {
      source.getTracks().forEach(track => track.stop());
    });
    sourceStreamsRef.current = [];
    audioMixRef.current?.close();
    audioMixRef.current = null;
  };

  // Replace the <video> source with a local object URL, revoking the previous one
  const setLocalVideoUrl = (url: string | null) => {
    if (localVideoUrlRef.current) {
      URL.revokeObjectURL(localVideoUrlRef.current);
    }
    localVideoUrlRef.current = url;
  };

  // Load AI models
  useEffect(() => {
    loadModels().catch(err => {
      console.error("Failed to load AI models:", err);
    });
  }, [loadModels]);

  // Get available devices
  useEffect(() => {
    const supportError = getMediaSupportError();
    if (supportError) {
      setError(supportError);
      return;
    }

    let cancelled = false;

    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

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
        setSelectedMicId(prev => prev || audioInputs[0]?.deviceId || '');
        setSelectedCameraId(prev => prev || videoInputs[0]?.deviceId || '');
      } catch (err) {
        console.error('Error getting media devices:', err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // Clean up streams, timers and object URLs when component unmounts
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        // Detach handlers first so a late `onstop` cannot update state
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // The recorder is being discarded anyway
          }
        }
      }
      mediaRecorderRef.current = null;

      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      sourceStreamsRef.current.forEach(source => {
        source.getTracks().forEach(track => track.stop());
      });
      sourceStreamsRef.current = [];
      audioMixRef.current?.close();
      audioMixRef.current = null;

      if (localVideoUrlRef.current) {
        URL.revokeObjectURL(localVideoUrlRef.current);
        localVideoUrlRef.current = null;
      }
    };
  }, []);

  // Setup webcam preview (re-runs when another camera is selected)
  useEffect(() => {
    if (isRecording || recordedBlob || localVideoUrlRef.current) return;
    if (getMediaSupportError()) return;

    let cancelled = false;

    const setupPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
          audio: false // No audio needed for preview
        });

        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // Release the previous preview before attaching the new one
        if (streamRef.current && streamRef.current !== stream) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      } catch (err) {
        // A missing permission here is not fatal – recording asks again later
        console.error('Error setting up camera preview:', err);
      }
    };

    setupPreview();

    return () => {
      cancelled = true;
    };
  }, [selectedCameraId, isRecording, recordedBlob]);

  const startRecording = async () => {
    const supportError = getMediaSupportError();
    if (supportError) {
      setError(supportError);
      return;
    }

    setError(null);
    setIsProcessing(true);
    chunksRef.current = [];
    setRecordingTime(0);

    let stream: MediaStream | null = null;
    const acquired: MediaStream[] = [];

    try {
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
        case 'screen': {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { 
              frameRate: { ideal: 30 },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: true 
          });
          acquired.push(screenStream);

          let micStream: MediaStream | null = null;
          try {
            micStream = await navigator.mediaDevices.getUserMedia({ 
              audio: audioConstraints 
            });
            acquired.push(micStream);
          } catch (err) {
            console.warn('Unable to access microphone, recording without it:', err);
          }

          const audioTracks = [
            ...screenStream.getAudioTracks(),
            ...(micStream ? micStream.getAudioTracks() : [])
          ];
          if (isMicMuted && micStream) {
            micStream.getAudioTracks().forEach(track => { track.enabled = false; });
          }

          // MediaRecorder only keeps the first audio track – mix system + mic audio
          audioMixRef.current = mixAudioTracks(audioTracks);

          stream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...(audioMixRef.current ? [audioMixRef.current.track] : audioTracks.slice(0, 1))
          ]);
          break;
        }

        case 'pip': {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: {
              frameRate: { ideal: 30 },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: true 
          });
          acquired.push(displayStream);

          let webcamStream: MediaStream;
          try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ 
              video: videoConstraints,
              audio: audioConstraints 
            });
            acquired.push(webcamStream);
          } catch (err) {
            // Screen capture already succeeded – never leave it running
            displayStream.getTracks().forEach(track => track.stop());
            throw err;
          }

          if (isMicMuted) {
            webcamStream.getAudioTracks().forEach(track => { track.enabled = false; });
          }

          // We keep the webcam video plus a single mixed audio track
          const audioTracks = [
            ...displayStream.getAudioTracks(),
            ...webcamStream.getAudioTracks()
          ];
          audioMixRef.current = mixAudioTracks(audioTracks);

          stream = new MediaStream([
            ...webcamStream.getVideoTracks(),
            ...(audioMixRef.current ? [audioMixRef.current.track] : audioTracks.slice(0, 1))
          ]);
          break;
        }

        default: { // webcam
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraints,
            audio: audioConstraints
          });
          acquired.push(stream);
          if (isMicMuted) {
            stream.getAudioTracks().forEach(track => { track.enabled = false; });
          }
          break;
        }
      }

      // Store the stream for cleanup, releasing the preview stream first
      if (streamRef.current && streamRef.current !== stream) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      streamRef.current = stream;
      sourceStreamsRef.current = acquired;

      // Set up video preview
      if (videoRef.current) {
        setLocalVideoUrl(null);
        videoRef.current.removeAttribute('src');
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.play().catch(() => undefined);
      }

      // Codec support differs per browser – only pass a mimeType we probed
      const mediaRecorder = createMediaRecorder(stream, {
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000 // 128 kbps
      });
      mediaRecorderRef.current = mediaRecorder;

      // Set up data handler
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording stopped unexpectedly. Please try again.');
        stopTimer();
        releaseStream();
        setIsRecording(false);
        setIsPaused(false);
      };

      // Handle recording completion
      mediaRecorder.onstop = () => {
        // Clean up recording resources
        stopTimer();
        releaseStream();
        setIsRecording(false);
        setIsPaused(false);

        // Create final video blob using the codec the browser actually used
        const mimeType = mediaRecorder.mimeType || chunksRef.current[0]?.type || 'video/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size === 0) {
          setError('The recording produced no data. Please try again.');
          return;
        }

        setRecordedBlob(blob);

        // Set default title based on date and time
        const now = new Date();
        setRecordingTitle(`Recording ${now.toLocaleString()}`);

        // Set tags based on mode
        setRecordingTags([recordingMode]);

        // Show download dialog
        setShowDownloadDialog(true);
      };

      // Screen sharing can be ended from the browser UI – finish cleanly
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        };
      });

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error('Error starting recording:', err);
      stream?.getTracks().forEach(track => track.stop());
      acquired.forEach(source => source.getTracks().forEach(track => track.stop()));
      audioMixRef.current?.close();
      audioMixRef.current = null;
      setError(getMediaErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      // Nothing to stop – make sure no device is left running
      stopTimer();
      releaseStream();
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    try {
      recorder.stop(); // `onstop` finalises the blob and releases the devices
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(getMediaErrorMessage(err));
      stopTimer();
      releaseStream();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const loadLocalFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Unsupported file type. Please choose a video file.');
      return;
    }

    setError(null);

    // Revokes the previously loaded object URL
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setVideoProcessed(false);

    // A local file replaces the live preview
    releaseStream();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play().catch(() => undefined);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadLocalFile(file);
  };

  const handleSelectFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) loadLocalFile(file);
    };
    input.click();
  };

  const handleAIProcessingComplete = (processedBlob: Blob) => {
    // Create URL for processed video (revoking the previous one)
    const url = URL.createObjectURL(processedBlob);
    setLocalVideoUrl(url);
    setVideoProcessed(true);
    
    // Update video player with processed video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.load();
      videoRef.current.play().catch(() => undefined);
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
        // Live/streamed sources report Infinity or NaN until fully buffered
        duration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
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
      
    } catch (err) {
      // Supabase may be unconfigured in this environment – never lose the take
      console.error('Error saving recording:', err);
      setError('Failed to save the recording. You can still download it from this dialog.');
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

      {error && (
        <div className="mb-4 flex items-start space-x-2 p-3 rounded-lg border border-[#E44E51]/30 
          bg-[#E44E51]/10 text-sm text-[#E44E51]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-grow">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-[#E44E51]/10"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
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
            onDrop={handleDrop}
            onClick={handleSelectFile}
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
                  enabledFeatures={features}
                  onFeatureToggle={toggleFeature}
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