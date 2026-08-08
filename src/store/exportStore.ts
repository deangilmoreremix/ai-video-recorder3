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

export type ExportStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ExportResult {
  blob: Blob;
  url: string;
  fileName: string;
}

interface ExportState {
  settings: ExportSettings;
  presets: Record<string, Partial<ExportSettings>>;
  status: ExportStatus;
  progress: number;
  error: string | null;
  result: ExportResult | null;
  updateSettings: (settings: Partial<ExportSettings>) => void;
  resetSettings: () => void;
  addPreset: (name: string, settings: Partial<ExportSettings>) => void;
  removePreset: (name: string) => void;
  applyPreset: (name: string) => void;
  startExport: () => void;
  setProgress: (progress: number) => void;
  completeExport: (blob: Blob, fileName: string) => ExportResult;
  failExport: (error: unknown) => void;
  cancelExport: () => void;
  resetExport: () => void;
}

const defaultSettings: ExportSettings = {
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
};

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const toMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Export failed. Please try again.';
};

/** Object URLs must be released whenever a result is replaced or cleared. */
const releaseResult = (result: ExportResult | null) => {
  if (result) URL.revokeObjectURL(result.url);
};

export const useExportStore = create<ExportState>((set, get) => ({
  settings: { ...defaultSettings },
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
  status: 'idle',
  progress: 0,
  error: null,
  result: null,

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  resetSettings: () => set({ settings: { ...defaultSettings } }),
  addPreset: (name, settings) => set((state) => ({
    presets: { ...state.presets, [name]: settings }
  })),
  removePreset: (name) => set((state) => {
    const rest = { ...state.presets };
    delete rest[name];
    return { presets: rest };
  }),
  applyPreset: (name) => set((state) => {
    const preset = state.presets[name];
    if (!preset) return {};
    return { settings: { ...state.settings, ...preset } };
  }),

  startExport: () => {
    releaseResult(get().result);
    set({ status: 'processing', progress: 0, error: null, result: null });
  },
  setProgress: (progress) => set((state) => (
    // Progress updates that arrive after a cancel/failure must not resurrect
    // the processing state.
    state.status === 'processing' ? { progress: clampProgress(progress) } : {}
  )),
  completeExport: (blob, fileName) => {
    releaseResult(get().result);
    const result: ExportResult = { blob, url: URL.createObjectURL(blob), fileName };
    set({ status: 'done', progress: 100, error: null, result });
    return result;
  },
  failExport: (error) => set({ status: 'error', error: toMessage(error), progress: 0 }),
  cancelExport: () => set((state) => (
    state.status === 'processing' ? { status: 'idle', progress: 0, error: null } : {}
  )),
  resetExport: () => {
    releaseResult(get().result);
    set({ status: 'idle', progress: 0, error: null, result: null });
  }
}));
