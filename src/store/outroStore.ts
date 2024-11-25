import { create } from 'zustand';
import { nanoid } from 'nanoid';

interface OutroTemplate {
  id: string;
  name: string;
  thumbnail: string;
  duration: number;
  category: 'endcards' | 'subscribe' | 'social' | 'branding' | 'custom';
  style: 'modern' | 'classic' | 'bold' | 'elegant' | 'playful';
  tags: string[];
  isPremium: boolean;
  preview: string;
  settings: {
    text: {
      title: string;
      subtitle: string;
      callToAction: string;
      endMessage?: string;
    };
    style: {
      fontFamily: string;
      titleSize: number;
      alignment: string;
      animation: string;
      duration: number;
      textEffects: {
        glow: boolean;
        shadow: boolean;
        outline: boolean;
        gradient: boolean;
      };
      transitions: {
        type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'rotate';
        duration: number;
        easing: string;
      };
    };
    media: {
      background: string | null;
      overlay: string | null;
      logo: string | null;
      music: string | null;
      volume: number;
      videoMask?: string;
      particles?: {
        enabled: boolean;
        type: 'confetti' | 'sparkles' | 'bubbles' | 'geometric';
        density: number;
      };
    };
    endCards: {
      enabled: boolean;
      type: 'video' | 'playlist' | 'subscribe' | 'link';
      position: string;
      delay: number;
      duration: number;
      style: {
        scale: number;
        opacity: number;
        blur: boolean;
        shadow: boolean;
      };
    };
    socialLinks: {
      youtube?: string;
      instagram?: string;
      twitter?: string;
      facebook?: string;
      website?: string;
      custom?: Array<{
        icon: string;
        url: string;
        label: string;
      }>;
    };
    advanced: {
      customCSS?: string;
      scriptHooks?: {
        onStart?: string;
        onEnd?: string;
      };
      responsiveSettings?: {
        mobile: { scale: number; position: { x: number; y: number } };
        tablet: { scale: number; position: { x: number; y: number } };
        desktop: { scale: number; position: { x: number; y: number } };
      };
      analytics?: {
        enabled: boolean;
        trackClicks: boolean;
        trackViews: boolean;
        customEvents: boolean;
      };
    };
  };
}

interface OutroStore {
  templates: OutroTemplate[];
  selectedTemplate: string | null;
  searchQuery: string;
  categoryFilter: string;
  styleFilter: string;
  viewMode: 'grid' | 'list';
  setSelectedTemplate: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStyleFilter: (style: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  updateTemplate: (id: string, updates: Partial<OutroTemplate>) => void;
  addTemplate: (template: Omit<OutroTemplate, 'id'>) => void;
  removeTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  exportTemplate: (id: string) => Promise<Blob>;
  importTemplate: (file: File) => Promise<void>;
}

export const useOutroStore = create<OutroStore>((set, get) => ({
  templates: [
    {
      id: '1',
      name: 'Subscribe & Social',
      thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113',
      duration: 15,
      category: 'subscribe',
      style: 'modern',
      tags: ['subscribe', 'social', 'clean'],
      isPremium: false,
      preview: '/previews/subscribe-social.mp4',
      settings: {
        text: {
          title: 'Thanks for Watching!',
          subtitle: 'Don\'t forget to subscribe',
          callToAction: 'Click here to subscribe',
          endMessage: 'See you in the next video!'
        },
        style: {
          fontFamily: 'Inter',
          titleSize: 48,
          alignment: 'center',
          animation: 'fade',
          duration: 5,
          textEffects: {
            glow: false,
            shadow: true,
            outline: false,
            gradient: true
          },
          transitions: {
            type: 'fade',
            duration: 0.8,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }
        },
        media: {
          background: null,
          overlay: null,
          logo: null,
          music: null,
          volume: 1,
          particles: {
            enabled: true,
            type: 'confetti',
            density: 0.5
          }
        },
        endCards: {
          enabled: true,
          type: 'subscribe',
          position: 'bottom-right',
          delay: 2,
          duration: 8,
          style: {
            scale: 1,
            opacity: 0.9,
            blur: false,
            shadow: true
          }
        },
        socialLinks: {
          youtube: 'https://youtube.com',
          instagram: 'https://instagram.com'
        },
        advanced: {
          responsiveSettings: {
            mobile: { scale: 0.8, position: { x: 0, y: 0 } },
            tablet: { scale: 0.9, position: { x: 0, y: 0 } },
            desktop: { scale: 1, position: { x: 0, y: 0 } }
          },
          analytics: {
            enabled: true,
            trackClicks: true,
            trackViews: true,
            customEvents: false
          }
        }
      }
    },
    {
      id: '2',
      name: 'Next Video Teaser',
      thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279',
      duration: 20,
      category: 'endcards',
      style: 'bold',
      tags: ['next video', 'teaser', 'dynamic'],
      isPremium: true,
      preview: '/previews/next-video.mp4',
      settings: {
        text: {
          title: 'Watch Next',
          subtitle: 'Coming up next...',
          callToAction: 'Click to watch',
          endMessage: 'New videos every week!'
        },
        style: {
          fontFamily: 'Montserrat',
          titleSize: 56,
          alignment: 'left',
          animation: 'slide',
          duration: 6,
          textEffects: {
            glow: true,
            shadow: true,
            outline: false,
            gradient: true
          },
          transitions: {
            type: 'zoom',
            duration: 1,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
          }
        },
        media: {
          background: null,
          overlay: null,
          logo: null,
          music: null,
          volume: 1,
          particles: {
            enabled: true,
            type: 'sparkles',
            density: 0.7
          }
        },
        endCards: {
          enabled: true,
          type: 'video',
          position: 'right',
          delay: 0,
          duration: 15,
          style: {
            scale: 1,
            opacity: 1,
            blur: true,
            shadow: true
          }
        },
        socialLinks: {},
        advanced: {
          responsiveSettings: {
            mobile: { scale: 0.8, position: { x: 0, y: 0 } },
            tablet: { scale: 0.9, position: { x: 0, y: 0 } },
            desktop: { scale: 1, position: { x: 0, y: 0 } }
          },
          analytics: {
            enabled: true,
            trackClicks: true,
            trackViews: true,
            customEvents: true
          }
        }
      }
    }
  ],
  selectedTemplate: null,
  searchQuery: '',
  categoryFilter: 'all',
  styleFilter: 'all',
  viewMode: 'grid',

  setSelectedTemplate: (id) => set({ selectedTemplate: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStyleFilter: (style) => set({ styleFilter: style }),
  setViewMode: (mode) => set({ viewMode: mode }),

  updateTemplate: (id, updates) => set((state) => ({
    templates: state.templates.map((template) =>
      template.id === id ? { ...template, ...updates } : template
    )
  })),

  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, { ...template, id: nanoid() }]
  })),

  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter((template) => template.id !== id),
    selectedTemplate: state.selectedTemplate === id ? null : state.selectedTemplate
  })),

  duplicateTemplate: (id) => set((state) => {
    const template = state.templates.find((t) => t.id === id);
    if (!template) return state;

    const newTemplate = {
      ...template,
      id: nanoid(),
      name: `${template.name} (Copy)`,
      isPremium: false
    };

    return {
      templates: [...state.templates, newTemplate]
    };
  }),

  exportTemplate: async (id) => {
    const template = get().templates.find(t => t.id === id);
    if (!template) throw new Error('Template not found');
    
    return new Blob([JSON.stringify(template, null, 2)], {
      type: 'application/json'
    });
  },

  importTemplate: async (file) => {
    try {
      const content = await file.text();
      const template = JSON.parse(content);
      
      // Validate template structure
      if (!template.name || !template.settings) {
        throw new Error('Invalid template format');
      }

      get().addTemplate({
        ...template,
        id: nanoid()
      });
    } catch (error) {
      throw new Error('Failed to import template');
    }
  }
}));