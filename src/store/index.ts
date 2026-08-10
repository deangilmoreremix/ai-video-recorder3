import { create } from 'zustand';
import type { Project } from '../types';

export interface VideoEffectSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  sharpness: number;
  temperature: number;
  vignette: number;
  grain: number;
  hue: number;
  sepia: number;
  noise: number;
  bloom: number;
  clarity: number;
  vibrance: number;
  exposure: number;
  gamma: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
}

export type VideoEffectParam = keyof VideoEffectSettings;

export const defaultVideoEffects: VideoEffectSettings = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  blur: 0,
  sharpness: 1,
  temperature: 1,
  vignette: 0,
  grain: 0,
  hue: 0,
  sepia: 0,
  noise: 0,
  bloom: 0,
  clarity: 1,
  vibrance: 1,
  exposure: 0,
  gamma: 1,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0
};

interface EditorState {
  currentProject: Project | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  videoEffects: VideoEffectSettings;
  /** Live preview of `videoEffects` on the player (the "eye" toggle). */
  videoEffectsPreview: boolean;
  /**
   * The effect settings the user committed with "Apply Effects". These are the
   * ones that get burned into an export; `videoEffects` is the working copy.
   */
  appliedVideoEffects: VideoEffectSettings | null;
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
  setVideoEffectsPreview: (enabled: boolean) => void;
  /** Commits the current working effects so exports pick them up. */
  applyVideoEffects: () => void;
  clearAppliedVideoEffects: () => void;
  updateAISettings: (settings: Partial<EditorState['aiSettings']>) => void;
  updateAudioSettings: (settings: Partial<EditorState['audioSettings']>) => void;
  updateAdvancedFeatures: (features: Partial<EditorState['advancedFeatures']>) => void;
  resetVideoEffects: () => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentProject: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 1,
  videoEffects: { ...defaultVideoEffects },
  videoEffectsPreview: true,
  appliedVideoEffects: null,
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
  setVideoEffectsPreview: (enabled) => set({ videoEffectsPreview: enabled }),
  applyVideoEffects: () =>
    set((state) => ({
      appliedVideoEffects: { ...state.videoEffects },
      videoEffectsPreview: true
    })),
  clearAppliedVideoEffects: () => set({ appliedVideoEffects: null }),
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
  resetVideoEffects: () => set({ videoEffects: { ...defaultVideoEffects }, appliedVideoEffects: null }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume })
}));