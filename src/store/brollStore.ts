import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type BRollMediaType = 'video' | 'image' | 'audio';

export interface BRollClip {
  id: string;
  name: string;
  type: BRollMediaType;
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

export interface BRollCollection {
  id: string;
  name: string;
  clipIds: string[];
  createdAt: Date;
}

/**
 * Everything except `id` is optional so callers only have to provide what they
 * actually know about the imported media - the store fills in safe defaults.
 */
export type NewBRollClip = Partial<Omit<BRollClip, 'id'>> &
  Pick<BRollClip, 'name' | 'url'>;

const createClip = (clip: NewBRollClip): BRollClip => {
  const duration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration as number) : 0;

  return {
    id: nanoid(),
    type: 'video',
    thumbnail: '',
    duration,
    startTime: 0,
    endTime: duration,
    volume: 1,
    opacity: 1,
    scale: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
    speed: 1,
    filters: { brightness: 1, contrast: 1, saturation: 1, blur: 0 },
    transition: { type: 'fade', duration: 0.5 },
    category: 'uncategorized',
    tags: [],
    favorite: false,
    lastUsed: new Date(),
    metadata: { fileSize: 0, resolution: '', codec: '', fps: 0 },
    ...clip
  };
};

interface BRollStore {
  clips: BRollClip[];
  collections: BRollCollection[];
  selectedClipId: string | null;
  addClip: (clip: NewBRollClip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<BRollClip>) => void;
  setSelectedClipId: (id: string | null) => void;
  duplicateClip: (id: string) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  toggleFavorite: (id: string) => void;
  addCollection: (name: string) => void;
  removeCollection: (id: string) => void;
  addToCollection: (collectionId: string, clipId: string) => void;
}

export const useBRollStore = create<BRollStore>((set) => ({
  clips: [],
  collections: [],
  selectedClipId: null,

  addClip: (clip) => set((state) => ({
    clips: [...state.clips, createClip(clip)]
  })),

  removeClip: (id) => set((state) => ({
    clips: state.clips.filter((clip) => clip.id !== id),
    collections: state.collections.map((collection) =>
      collection.clipIds.includes(id)
        ? { ...collection, clipIds: collection.clipIds.filter((clipId) => clipId !== id) }
        : collection
    ),
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

    const duplicatedClip: BRollClip = {
      ...clipToDuplicate,
      id: nanoid(),
      name: `${clipToDuplicate.name} (Copy)`,
      lastUsed: new Date()
    };

    return {
      clips: [...state.clips, duplicatedClip]
    };
  }),

  reorderClips: (fromIndex, toIndex) => set((state) => {
    const { clips } = state;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 || fromIndex >= clips.length ||
      toIndex < 0 || toIndex >= clips.length
    ) {
      return state;
    }

    const next = [...clips];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return state;
    next.splice(toIndex, 0, moved);
    return { clips: next };
  }),

  toggleFavorite: (id) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === id ? { ...clip, favorite: !clip.favorite } : clip
    )
  })),

  addCollection: (name) => set((state) => ({
    collections: [
      ...state.collections,
      { id: nanoid(), name: name.trim() || 'Untitled Collection', clipIds: [], createdAt: new Date() }
    ]
  })),

  removeCollection: (id) => set((state) => ({
    collections: state.collections.filter((collection) => collection.id !== id)
  })),

  addToCollection: (collectionId, clipId) => set((state) => ({
    collections: state.collections.map((collection) =>
      collection.id === collectionId && !collection.clipIds.includes(clipId)
        ? { ...collection, clipIds: [...collection.clipIds, clipId] }
        : collection
    )
  }))
}));
