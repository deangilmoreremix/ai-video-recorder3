import { create } from 'zustand';

interface ExportSettings {
  format: string;
  codec: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  bitrate: {
    video: number;
    audio: number;
  };
  quality: number;
  audioCodec: string;
  audioChannels: number;
  startTime?: number;
  endTime?: number;
  stabilize: boolean;
  denoise: boolean;
  enhanceColors: boolean;
  useGpu: boolean;
  gifSettings: {
    fps: number;
    quality: number;
    width: number;
    dither: boolean;
    optimize: boolean;
    startTime: number;
    endTime: number;
    loop: boolean;
  };
}

interface ExportState {
  settings: ExportSettings;
  presets: Record<string, Partial<ExportSettings>>;
  updateSettings: (settings: Partial<ExportSettings>) => void;
  addPreset: (name: string, settings: Partial<ExportSettings>) => void;
  removePreset: (name: string) => void;
}

export const useExportStore = create<ExportState>((set) => ({
  settings: {
    format: 'mp4',
    codec: 'h264',
    resolution: {
      width: 1920,
      height: 1080
    },
    fps: 30,
    bitrate: {
      video: 5000,
      audio: 128
    },
    quality: 80,
    audioCodec: 'aac',
    audioChannels: 2,
    stabilize: false,
    denoise: false,
    enhanceColors: false,
    useGpu: true,
    gifSettings: {
      fps: 15,
      quality: 80,
      width: 640,
      dither: true,
      optimize: true,
      startTime: 0,
      endTime: 5,
      loop: true
    }
  },
  presets: {
    'YouTube': {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      bitrate: { video: 8000, audio: 384 }
    },
    'Instagram': {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1080, height: 1080 },
      fps: 30,
      bitrate: { video: 3500, audio: 128 }
    },
    'Twitter': {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 1280, height: 720 },
      fps: 30,
      bitrate: { video: 5000, audio: 128 }
    },
    'Web Optimized': {
      format: 'webm',
      codec: 'vp9',
      resolution: { width: 1280, height: 720 },
      fps: 30,
      bitrate: { video: 2500, audio: 128 }
    },
    'Mobile': {
      format: 'mp4',
      codec: 'h264',
      resolution: { width: 854, height: 480 },
      fps: 30,
      bitrate: { video: 1500, audio: 96 }
    }
  },
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  addPreset: (name, settings) => set((state) => ({
    presets: { ...state.presets, [name]: settings }
  })),
  removePreset: (name) => set((state) => {
    const { [name]: _, ...rest } = state.presets;
    return { presets: rest };
  })
}));