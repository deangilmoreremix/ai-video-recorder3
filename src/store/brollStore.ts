import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type BRollMediaType = 'video' | 'image' | 'audio';

/** Every transition the editor can actually render (see `transitionRender.ts`). */
export type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'wipe'
  | 'cross-zoom'
  | 'rotate';

export interface ClipTransition {
  type: TransitionType;
  /** Seconds the transition takes to complete. */
  duration: number;
}

/** How the area around a segmented person is rendered. */
export type BackgroundMode = 'none' | 'color' | 'blur' | 'image';

export interface ClipBackground {
  mode: BackgroundMode;
  /** Used when `mode === 'color'`. */
  color: string;
  /** Object URL / remote URL used when `mode === 'image'`. */
  imageUrl: string | null;
  imageFit: 'cover' | 'contain' | 'stretch';
  /** Gaussian blur radius in pixels, used when `mode === 'blur'`. */
  blurAmount: number;
  /** Feather applied to the segmentation mask, in pixels. */
  edgeSoftness: number;
  /** Segmentation confidence threshold (0..1). */
  threshold: number;
}

export const DEFAULT_CLIP_BACKGROUND: ClipBackground = {
  mode: 'none',
  color: '#0F172A',
  imageUrl: null,
  imageFit: 'cover',
  blurAmount: 12,
  edgeSoftness: 4,
  threshold: 0.6
};

export type OverlayType = 'text' | 'image';

export interface ClipOverlay {
  id: string;
  type: OverlayType;
  name: string;
  /** Text content (text overlays). */
  text: string;
  /** Image source (image overlays). */
  imageUrl: string | null;
  fontFamily: string;
  /** Font size as a percentage of the canvas height, so it scales with output. */
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  /** Optional plate drawn behind the text. */
  backgroundColor: string | null;
  shadow: boolean;
  /** Centre of the overlay, normalised to 0..1 of the frame. */
  position: { x: number; y: number };
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  opacity: number;
  /** Seconds, relative to the start of the clip. */
  startTime: number;
  endTime: number;
  /** Seconds of fade in/out at each end of the overlay's life. */
  fadeDuration: number;
  visible: boolean;
}

export type NewClipOverlay = Partial<Omit<ClipOverlay, 'id'>> & Pick<ClipOverlay, 'type'>;

export const createOverlay = (overlay: NewClipOverlay): ClipOverlay => ({
  id: nanoid(),
  name: overlay.type === 'text' ? 'Text overlay' : 'Image overlay',
  text: overlay.type === 'text' ? 'Your text here' : '',
  imageUrl: null,
  fontFamily: 'Inter',
  fontSize: 8,
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: null,
  shadow: true,
  position: { x: 0.5, y: 0.5 },
  scale: 1,
  rotation: 0,
  opacity: 1,
  startTime: 0,
  endTime: 5,
  fadeDuration: 0.3,
  visible: true,
  ...overlay
});

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
  transition: ClipTransition;
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
  /** Virtual-background settings keyed by clip id. */
  backgrounds: Record<string, ClipBackground>;
  /** Overlay stacks keyed by clip id (index 0 renders first / bottom). */
  overlays: Record<string, ClipOverlay[]>;
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
  setClipTransition: (clipId: string, transition: Partial<ClipTransition>) => void;
  setClipBackground: (clipId: string, updates: Partial<ClipBackground>) => void;
  resetClipBackground: (clipId: string) => void;
  addOverlay: (clipId: string, overlay: NewClipOverlay) => string;
  updateOverlay: (clipId: string, overlayId: string, updates: Partial<ClipOverlay>) => void;
  removeOverlay: (clipId: string, overlayId: string) => void;
  reorderOverlay: (clipId: string, overlayId: string, direction: -1 | 1) => void;
}

const omitKey = <T,>(record: Record<string, T>, key: string): Record<string, T> => {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
};

export const useBRollStore = create<BRollStore>((set) => ({
  clips: [],
  collections: [],
  selectedClipId: null,
  backgrounds: {},
  overlays: {},

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
    backgrounds: omitKey(state.backgrounds, id),
    overlays: omitKey(state.overlays, id),
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

    // Effects follow the clip they were authored against.
    const background = state.backgrounds[id];
    const overlays = state.overlays[id];

    return {
      clips: [...state.clips, duplicatedClip],
      backgrounds: background
        ? { ...state.backgrounds, [duplicatedClip.id]: { ...background } }
        : state.backgrounds,
      overlays: overlays
        ? {
            ...state.overlays,
            [duplicatedClip.id]: overlays.map((overlay) => ({ ...overlay, id: nanoid() }))
          }
        : state.overlays
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
  })),

  setClipTransition: (clipId, transition) => set((state) => ({
    clips: state.clips.map((clip) =>
      clip.id === clipId
        ? {
            ...clip,
            transition: {
              ...clip.transition,
              ...transition,
              duration: Math.max(
                0.1,
                Math.min(10, transition.duration ?? clip.transition.duration)
              )
            }
          }
        : clip
    )
  })),

  setClipBackground: (clipId, updates) => set((state) => ({
    backgrounds: {
      ...state.backgrounds,
      [clipId]: {
        ...DEFAULT_CLIP_BACKGROUND,
        ...state.backgrounds[clipId],
        ...updates
      }
    }
  })),

  resetClipBackground: (clipId) => set((state) => ({
    backgrounds: omitKey(state.backgrounds, clipId)
  })),

  addOverlay: (clipId, overlay) => {
    const created = createOverlay(overlay);
    set((state) => ({
      overlays: {
        ...state.overlays,
        [clipId]: [...(state.overlays[clipId] ?? []), created]
      }
    }));
    return created.id;
  },

  updateOverlay: (clipId, overlayId, updates) => set((state) => {
    const current = state.overlays[clipId];
    if (!current) return state;
    return {
      overlays: {
        ...state.overlays,
        [clipId]: current.map((overlay) =>
          overlay.id === overlayId ? { ...overlay, ...updates } : overlay
        )
      }
    };
  }),

  removeOverlay: (clipId, overlayId) => set((state) => {
    const current = state.overlays[clipId];
    if (!current) return state;
    const next = current.filter((overlay) => overlay.id !== overlayId);
    return {
      overlays: next.length
        ? { ...state.overlays, [clipId]: next }
        : omitKey(state.overlays, clipId)
    };
  }),

  reorderOverlay: (clipId, overlayId, direction) => set((state) => {
    const current = state.overlays[clipId];
    if (!current) return state;
    const index = current.findIndex((overlay) => overlay.id === overlayId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= current.length) return state;

    const next = [...current];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    return { overlays: { ...state.overlays, [clipId]: next } };
  })
}));
