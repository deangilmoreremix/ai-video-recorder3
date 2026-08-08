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
  stopRecording: () => Promise<Blob>;
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

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<number>();

  const startTimer = useCallback(() => {
    timerInterval.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
  }, []);

  const getMediaStream = async (mode: 'webcam' | 'screen' | 'pip'): Promise<MediaStream> => {
    try {
      switch (mode) {
        case 'screen':
          return await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
        case 'pip':
          const [screenStream, webcamStream] = await Promise.all([
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }),
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          ]);
          return new MediaStream([
            ...screenStream.getVideoTracks(),
            ...webcamStream.getVideoTracks(),
            ...screenStream.getAudioTracks()
          ]);
        default:
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
      }
    } catch (err) {
      throw new Error(`Failed to get media stream: ${err.message}`);
    }
  };

  const startRecording = useCallback(async (options?: RecordingOptions) => {
    try {
      const stream = await getMediaStream(options?.mode || 'webcam');
      setVideoStream(stream);

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [startTimer]);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        resolve(blob);
      };

      try {
        mediaRecorder.current.stop();
        stopTimer();
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);

        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          setVideoStream(null);
        }
      } catch (err) {
        reject(err);
      }
    });
  }, [videoStream, stopTimer]);

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
    recordedChunks.current = [];
    setRecordingTime(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      stopTimer();
    };
  }, [videoStream, stopTimer]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    videoStream,
    recordedChunks: recordedChunks.current,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error
  };
};