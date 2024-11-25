import { create } from 'zustand';
import { nanoid } from 'nanoid';

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

interface BRollStore {
  clips: BRollClip[];
  selectedClipId: string | null;
  addClip: (clip: Omit<BRollClip, 'id'>) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<BRollClip>) => void;
  setSelectedClipId: (id: string | null) => void;
  duplicateClip: (id: string) => void;
}

export const useBRollStore = create<BRollStore>((set) => ({
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

    return {
      clips: [...state.clips, duplicatedClip]
    };
  })
}));