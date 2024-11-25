import { create } from 'zustand';

interface EditorState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  clips: VideoClip[];
  selectedClipId: string | null;
  chapters: Chapter[];
  captions: Caption[];
  silentSegments: TimeRange[];
  endCards: EndCard[];
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  addClip: (clip: VideoClip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  setSelectedClipId: (id: string | null) => void;
  addChapter: (chapter: Chapter) => void;
  removeChapter: (id: string) => void;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  addCaption: (caption: Caption) => void;
  removeCaption: (id: string) => void;
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  addSilentSegment: (segment: TimeRange) => void;
  removeSilentSegment: (id: string) => void;
  addEndCard: (endCard: EndCard) => void;
  removeEndCard: (id: string) => void;
  updateEndCard: (id: string, updates: Partial<EndCard>) => void;
}

interface VideoClip {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'audio';
}

interface Chapter {
  id: string;
  title: string;
  time: number;
}

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface TimeRange {
  id: string;
  startTime: number;
  endTime: number;
}

interface EndCard {
  id: string;
  type: 'video' | 'playlist' | 'link';
  title: string;
  url: string;
  position: { x: number; y: number };
  duration: number;
}

export const useEditorStore = create<EditorState>((set) => ({
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

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),

  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip] 
  })),
  removeClip: (id) => set((state) => ({ 
    clips: state.clips.filter((clip) => clip.id !== id) 
  })),
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((clip) => 
      clip.id === id ? { ...clip, ...updates } : clip
    )
  })),
  setSelectedClipId: (id) => set({ selectedClipId: id }),

  addChapter: (chapter) => set((state) => ({
    chapters: [...state.chapters, chapter]
  })),
  removeChapter: (id) => set((state) => ({
    chapters: state.chapters.filter((chapter) => chapter.id !== id)
  })),
  updateChapter: (id, updates) => set((state) => ({
    chapters: state.chapters.map((chapter) =>
      chapter.id === id ? { ...chapter, ...updates } : chapter
    )
  })),

  addCaption: (caption) => set((state) => ({
    captions: [...state.captions, caption]
  })),
  removeCaption: (id) => set((state) => ({
    captions: state.captions.filter((caption) => caption.id !== id)
  })),
  updateCaption: (id, updates) => set((state) => ({
    captions: state.captions.map((caption) =>
      caption.id === id ? { ...caption, ...updates } : caption
    )
  })),

  addSilentSegment: (segment) => set((state) => ({
    silentSegments: [...state.silentSegments, segment]
  })),
  removeSilentSegment: (id) => set((state) => ({
    silentSegments: state.silentSegments.filter((segment) => segment.id !== id)
  })),

  addEndCard: (endCard) => set((state) => ({
    endCards: [...state.endCards, endCard]
  })),
  removeEndCard: (id) => set((state) => ({
    endCards: state.endCards.filter((card) => card.id !== id)
  })),
  updateEndCard: (id, updates) => set((state) => ({
    endCards: state.endCards.map((card) =>
      card.id === id ? { ...card, ...updates } : card
    )
  }))
}));