export interface VideoClip {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'audio';
  effects?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
  transition?: {
    type: 'fade' | 'slide' | 'wipe';
    duration: number;
  };
  metadata?: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    bitrate: number;
    codec: string;
    audioChannels?: number;
    audioSampleRate?: number;
  };
}

export interface Timeline {
  id: string;
  clips: VideoClip[];
  duration: number;
}

export interface Project {
  id: string;
  name: string;
  timeline: Timeline;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    resolution: {
      width: number;
      height: number;
    };
    fps: number;
    quality: 'high' | 'medium' | 'low';
  };
}

export interface RecordingState {
  isRecording: boolean;
  isPaused?: boolean;
  duration: number;
  stream: MediaStream | null;
  quality?: 'high' | 'medium' | 'low';
  audioEnabled?: boolean;
  mode?: 'continuous' | 'timeLimit';
  timeLimit?: number;
  countdown?: number;
}