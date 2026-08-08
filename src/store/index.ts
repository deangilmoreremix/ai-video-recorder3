import { create } from 'zustand';

interface EditorState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  videoEffects: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sharpness: number;
    temperature: number;
    vignette: number;
    grain: number;
  };
  aiSettings: {
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
  };
  audioSettings: {
    volume: number;
    gain: number;
    noiseReduction: boolean;
    equalizer: number[];
    compression: boolean;
    reverb: number;
    echo: number;
    spatialAudio: boolean;
  };
  advancedFeatures: {
    autoOrganize: boolean;
    smartTagging: boolean;
    duplicateDetection: boolean;
    qualityAnalysis: boolean;
    contentSuggestions: boolean;
    versionControl: boolean;
    collaborativeEditing: boolean;
    performanceOptimization: boolean;
  };
  updateVideoEffects: (effects: Partial<EditorState['videoEffects']>) => void;
  updateAISettings: (settings: Partial<EditorState['aiSettings']>) => void;
  updateAudioSettings: (settings: Partial<EditorState['audioSettings']>) => void;
  updateAdvancedFeatures: (features: Partial<EditorState['advancedFeatures']>) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 1,
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
  updateVideoEffects: (effects) => 
    set((state) => ({
      videoEffects: { ...state.videoEffects, ...effects }
    })),
  updateAISettings: (settings) =>
    set((state) => ({
      aiSettings: { ...state.aiSettings, ...settings }
    })),
  updateAudioSettings: (settings) =>
    set((state) => ({
      audioSettings: { ...state.audioSettings, ...settings }
    })),
  updateAdvancedFeatures: (features) =>
    set((state) => ({
      advancedFeatures: { ...state.advancedFeatures, ...features }
    })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume })
}));