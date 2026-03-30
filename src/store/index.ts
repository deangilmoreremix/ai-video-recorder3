import { create } from 'zustand';
import { nanoid } from 'nanoid';

// ============================================================================
// Types
// ============================================================================

export interface VideoClip {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'audio';
  name?: string;
  duration?: number;
}

export interface Chapter {
  id: string;
  title: string;
  time: number;
  endTime?: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export interface TimeRange {
  id: string;
  startTime: number;
  endTime: number;
}

export interface EndCard {
  id: string;
  type: 'video' | 'playlist' | 'link';
  title: string;
  url: string;
  position: { x: number; y: number };
  duration: number;
}

export interface VideoEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpness: number;
  temperature: number;
  vignette: number;
  grain: number;
}

export interface AudioSettings {
  volume: number;
  gain: number;
  noiseReduction: boolean;
  equalizer: number[];
  compression: boolean;
  reverb: number;
  echo: number;
  spatialAudio: boolean;
}

export interface AISettings {
  faceDetection: boolean;
  beautification: boolean;
  backgroundBlur: boolean;
  expressionDetection: boolean;
  sceneDetection: boolean;
  objectTracking: boolean;
  contentAnalysis: boolean;
  autoEnhance: boolean;
  styleTransfer: boolean;
  smartCropping: boolean;
  audioEnhancement: boolean;
  motionTracking: boolean;
}

export interface AdvancedFeatures {
  autoOrganize: boolean;
  smartTagging: boolean;
  duplicateDetection: boolean;
  qualityAnalysis: boolean;
  contentSuggestions: boolean;
  versionControl: boolean;
  collaborativeEditing: boolean;
  performanceOptimization: boolean;
}

export interface ExportSettings {
  format: string;
  codec: string;
  resolution: { width: number; height: number };
  fps: number;
  bitrate: { video: number; audio: number };
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

// ============================================================================
// Main Editor Store
// ============================================================================

interface EditorStoreState {
  // Playback state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  
  // Timeline content
  clips: VideoClip[];
  selectedClipId: string | null;
  chapters: Chapter[];
  captions: Caption[];
  silentSegments: TimeRange[];
  endCards: EndCard[];
  
  // Effects & Settings
  videoEffects: VideoEffects;
  aiSettings: AISettings;
  audioSettings: AudioSettings;
  advancedFeatures: AdvancedFeatures;
  
  // Video source
  videoUrl: string | null;
  videoBlob: Blob | null;
  
  // Playback controls
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  togglePlayback: () => void;
  
  // Video source
  setVideoSource: (url: string, blob?: Blob) => void;
  clearVideoSource: () => void;
  
  // Clip operations
  addClip: (clip: VideoClip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  setSelectedClipId: (id: string | null) => void;
  clearClips: () => void;
  
  // Chapter operations
  addChapter: (chapter: Chapter) => void;
  removeChapter: (id: string) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  
  // Caption operations
  addCaption: (caption: Caption) => void;
  removeCaption: (id: string) => void;
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  
  // Silent segment operations
  addSilentSegment: (segment: TimeRange) => void;
  removeSilentSegment: (id: string) => void;
  
  // End card operations
  addEndCard: (endCard: EndCard) => void;
  removeEndCard: (id: string) => void;
  updateEndCard: (id: string, updates: Partial<EndCard>) => void;
  
  // Effects & Settings
  updateVideoEffects: (effects: Partial<VideoEffects>) => void;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateAdvancedFeatures: (features: Partial<AdvancedFeatures>) => void;
  resetEffects: () => void;
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  // Initial state
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 1,
  clips: [],
  selectedClipId: null,
  chapters: [],
  captions: [],
  silentSegments: [],
  endCards: [],
  videoEffects: {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    blur: 0,
    sharpness: 1,
    temperature: 1,
    vignette: 0,
    grain: 0
  },
  aiSettings: {
    faceDetection: false,
    beautification: false,
    backgroundBlur: false,
    expressionDetection: false,
    sceneDetection: false,
    objectTracking: false,
    contentAnalysis: false,
    autoEnhance: false,
    styleTransfer: false,
    smartCropping: false,
    audioEnhancement: false,
    motionTracking: false
  },
  audioSettings: {
    volume: 1,
    gain: 0,
    noiseReduction: false,
    equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    compression: false,
    reverb: 0,
    echo: 0,
    spatialAudio: false
  },
  advancedFeatures: {
    autoOrganize: false,
    smartTagging: false,
    duplicateDetection: false,
    qualityAnalysis: false,
    contentSuggestions: false,
    versionControl: false,
    collaborativeEditing: false,
    performanceOptimization: false
  },
  videoUrl: null,
  videoBlob: null,
  
  // Playback controls
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  // Video source
  setVideoSource: (url, blob) => set({ videoUrl: url, videoBlob: blob || null }),
  clearVideoSource: () => set({ videoUrl: null, videoBlob: null, currentTime: 0, duration: 0, clips: [] }),
  
  // Clip operations
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  removeClip: (id) => set((state) => ({ 
    clips: state.clips.filter((clip) => clip.id !== id),
    selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
  })),
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((clip) => clip.id === id ? { ...clip, ...updates } : clip)
  })),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  clearClips: () => set({ clips: [], selectedClipId: null }),
  
  // Chapter operations
  addChapter: (chapter) => set((state) => ({ chapters: [...state.chapters, chapter] })),
  removeChapter: (id) => set((state) => ({ chapters: state.chapters.filter((c) => c.id !== id) })),
  updateChapter: (id, updates) => set((state) => ({
    chapters: state.chapters.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  
  // Caption operations
  addCaption: (caption) => set((state) => ({ captions: [...state.captions, caption] })),
  removeCaption: (id) => set((state) => ({ captions: state.captions.filter((c) => c.id !== id) })),
  updateCaption: (id, updates) => set((state) => ({
    captions: state.captions.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  
  // Silent segment operations
  addSilentSegment: (segment) => set((state) => ({ silentSegments: [...state.silentSegments, segment] })),
  removeSilentSegment: (id) => set((state) => ({ 
    silentSegments: state.silentSegments.filter((s) => s.id !== id) 
  })),
  
  // End card operations
  addEndCard: (endCard) => set((state) => ({ endCards: [...state.endCards, endCard] })),
  removeEndCard: (id) => set((state) => ({ endCards: state.endCards.filter((c) => c.id !== id) })),
  updateEndCard: (id, updates) => set((state) => ({
    endCards: state.endCards.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  
  // Effects & Settings
  updateVideoEffects: (effects) => set((state) => ({ 
    videoEffects: { ...state.videoEffects, ...effects } 
  })),
  updateAISettings: (settings) => set((state) => ({ 
    aiSettings: { ...state.aiSettings, ...settings } 
  })),
  updateAudioSettings: (settings) => set((state) => ({ 
    audioSettings: { ...state.audioSettings, ...settings } 
  })),
  updateAdvancedFeatures: (features) => set((state) => ({ 
    advancedFeatures: { ...state.advancedFeatures, ...features } 
  })),
  resetEffects: () => set({
    videoEffects: {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      blur: 0,
      sharpness: 1,
      temperature: 1,
      vignette: 0,
      grain: 0
    }
  })
}));

// ============================================================================
// Export Store
// ============================================================================

interface ExportStoreState {
  settings: ExportSettings;
  presets: Record<string, Partial<ExportSettings>>;
  isExporting: boolean;
  exportProgress: number;
  updateSettings: (settings: Partial<ExportSettings>) => void;
  addPreset: (name: string, settings: Partial<ExportSettings>) => void;
  removePreset: (name: string) => void;
  setExporting: (isExporting: boolean) => void;
  setProgress: (progress: number) => void;
  applyPreset: (name: string) => void;
}

export const useExportStore = create<ExportStoreState>((set, get) => ({
  settings: {
    format: 'mp4',
    codec: 'h264',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    bitrate: { video: 5000, audio: 128 },
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
  isExporting: false,
  exportProgress: 0,
  
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  
  addPreset: (name, settings) => set((state) => ({
    presets: { ...state.presets, [name]: settings }
  })),
  
  removePreset: (name) => set((state) => {
    const { [name]: _, ...rest } = state.presets;
    return { presets: rest };
  }),
  
  setExporting: (isExporting) => set({ isExporting }),
  setProgress: (progress) => set({ exportProgress: progress }),
  
  applyPreset: (name) => {
    const preset = get().presets[name];
    if (preset) {
      set((state) => ({ settings: { ...state.settings, ...preset } }));
    }
  }
}));

// ============================================================================
// Recording Store
// ============================================================================

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  // Recording settings
  recordingMode: 'webcam' | 'screen' | 'pip';
  videoQuality: 'low' | 'medium' | 'high';
  audioEnabled: boolean;
  countdown: number;
  maxDuration: number | null;
  
  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  setRecordingBlob: (blob: Blob | null) => void;
  setRecordingMode: (mode: 'webcam' | 'screen' | 'pip') => void;
  setVideoQuality: (quality: 'low' | 'medium' | 'high') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setCountdown: (count: number) => void;
  setMaxDuration: (duration: number | null) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  isPaused: false,
  recordingTime: 0,
  recordedBlob: null,
  recordedUrl: null,
  recordingMode: 'webcam',
  videoQuality: 'high',
  audioEnabled: true,
  countdown: 3,
  maxDuration: null,
  
  startRecording: () => set({ isRecording: true, isPaused: false, recordingTime: 0 }),
  stopRecording: () => set({ isRecording: false, isPaused: false }),
  pauseRecording: () => set({ isPaused: true }),
  resumeRecording: () => set({ isPaused: false }),
  resetRecording: () => set({ 
    isRecording: false, 
    isPaused: false, 
    recordingTime: 0, 
    recordedBlob: null, 
    recordedUrl: null 
  }),
  setRecordingBlob: (blob) => set({ 
    recordedBlob: blob, 
    recordedUrl: blob ? URL.createObjectURL(blob) : null 
  }),
  setRecordingMode: (mode) => set({ recordingMode: mode }),
  setVideoQuality: (quality) => set({ videoQuality: quality }),
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
  setCountdown: (count) => set({ countdown: count }),
  setMaxDuration: (duration) => set({ maxDuration: duration })
}));

// ============================================================================
// BRoll Store
// ============================================================================

export interface BRollClip {
  id: string;
  name: string;
  duration: number;
  thumbnail: string;
  url: string;
  startTime: number;
  endTime: number;
  volume: number;
  opacity: number;
  scale: number;
  position: { x: number; y: number };
  rotation: number;
  speed: number;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  transition: {
    type: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'wipe';
    duration: number;
  };
  category: string;
  tags: string[];
  favorite: boolean;
  lastUsed: Date;
  metadata: {
    fileSize: number;
    resolution: string;
    codec: string;
    fps: number;
  };
}

interface BRollStoreState {
  clips: BRollClip[];
  selectedClipId: string | null;
  addClip: (clip: Omit<BRollClip, 'id'>) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<BRollClip>) => void;
  setSelectedClipId: (id: string | null) => void;
  duplicateClip: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

export const useBRollStore = create<BRollStoreState>((set) => ({
  clips: [],
  selectedClipId: null,

  addClip: (clip) => set((state) => ({
    clips: [...state.clips, { ...clip, id: nanoid() }]
  })),

  removeClip: (id) => set((state) => ({
    clips: state.clips.filter((clip) => clip.id !== id),
    selectedClipId: state.selectedClipId === id ? null : state.selectedClipId
  })),

  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === id ? { ...clip, ...updates } : clip
    )
  })),

  setSelectedClipId: (id) => set({ selectedClipId: id }),

  duplicateClip: (id) => set((state) => {
    const clipToDuplicate = state.clips.find((clip) => clip.id === id);
    if (!clipToDuplicate) return state;

    const duplicatedClip = {
      ...clipToDuplicate,
      id: nanoid(),
      name: `${clipToDuplicate.name} (Copy)`,
      lastUsed: new Date()
    };

    return { clips: [...state.clips, duplicatedClip] };
  }),

  toggleFavorite: (id) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === id ? { ...clip, favorite: !clip.favorite } : clip
    )
  }))
}));

// Export stores for backward compatibility
export { useEditorStore as useEditorStoreCompat, useExportStore as useExportStoreCompat };
