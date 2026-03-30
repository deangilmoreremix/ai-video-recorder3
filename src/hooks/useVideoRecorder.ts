import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordingOptions {
  mode: 'webcam' | 'screen' | 'pip';
  countdown?: number;
  maxDuration?: number;
  aiFeatures?: Record<string, boolean>;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  videoStream: MediaStream | null;
  recordedChunks: Blob[];
  startRecording: (options?: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  error: Error | null;
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerInterval = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startTimer = useCallback(() => {
    timerInterval.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const getMediaStream = async (mode: 'webcam' | 'screen' | 'pip'): Promise<MediaStream> => {
    try {
      switch (mode) {
        case 'screen':
          return await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: true
          });
        case 'pip': {
          const [screenStream, webcamStream] = await Promise.all([
            navigator.mediaDevices.getDisplayMedia({ 
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
              }, 
              audio: true 
            }),
            navigator.mediaDevices.getUserMedia({ 
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }, 
              audio: true 
            })
          ]);
          
          // Combine screen video + webcam video + audio
          return new MediaStream([
            ...screenStream.getVideoTracks(),
            ...webcamStream.getVideoTracks(),
            ...screenStream.getAudioTracks(),
            ...webcamStream.getAudioTracks()
          ]);
        }
        default:
          return await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to get media stream: ${err}`);
      throw error;
    }
  };

  const startRecording = useCallback(async (options?: RecordingOptions) => {
    try {
      // Clear any previous recording
      setRecordedChunks([]);
      setError(null);
      
      const mode = options?.mode || 'webcam';
      const stream = await getMediaStream(mode);
      streamRef.current = stream;
      setVideoStream(stream);

      // Determine the best mime type
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });

      // Handle data availability
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      // Handle recording errors
      mediaRecorder.current.onerror = (event) => {
        const error = new Error('Recording error occurred');
        setError(error);
        console.error('MediaRecorder error:', event);
      };

      // Start recording - collect data every second
      mediaRecorder.current.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      startTimer();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to start recording: ${err}`);
      setError(error);
      throw error;
    }
  }, [startTimer]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
        resolve(null);
        return;
      }

      // Create blob from all recorded chunks
      const createBlob = () => {
        if (recordedChunks.length === 0) {
          resolve(null);
          return;
        }

        const mimeType = mediaRecorder.current?.mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: mimeType });
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setVideoStream(null);
        
        // Reset state
        stopTimer();
        setIsRecording(false);
        setIsPaused(false);
        
        resolve(blob);
      };

      mediaRecorder.current.onstop = createBlob;
      
      try {
        mediaRecorder.current.stop();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to stop recording');
        setError(error);
        reject(error);
      }
    });
  }, [recordedChunks, stopTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
      stopTimer();
      setIsPaused(true);
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
      startTimer();
      setIsPaused(false);
    }
  }, [startTimer]);

  const clearRecording = useCallback(() => {
    setRecordedChunks([]);
    setRecordingTime(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopTimer();
    };
  }, [stopTimer]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    videoStream,
    recordedChunks,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error
  };
};
