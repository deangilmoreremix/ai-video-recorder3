import { create } from 'zustand';
import { nanoid } from 'nanoid';

interface IntroTemplate {
  id: string;
  name: string;
  thumbnail: string;
  duration: number;
  category: 'corporate' | 'creative' | 'minimal' | 'dynamic' | 'custom';
  style: 'modern' | 'classic' | 'bold' | 'elegant' | 'playful';
  tags: string[];
  isPremium: boolean;
  preview: string;
  settings: {
    text: {
      title: string;
      subtitle: string;
      tagline: string;
      callToAction?: string;
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
    };
  };
}

interface IntroStore {
  templates: IntroTemplate[];
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
  updateTemplate: (id: string, updates: Partial<IntroTemplate>) => void;
  addTemplate: (template: Omit<IntroTemplate, 'id'>) => void;
  removeTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  exportTemplate: (id: string) => Promise<Blob>;
  importTemplate: (file: File) => Promise<void>;
}

export const useIntroStore = create<IntroStore>((set, get) => ({
  templates: [
    {
      id: '1',
      name: 'Corporate Clean',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      duration: 15,
      category: 'corporate',
      style: 'modern',
      tags: ['professional', 'business', 'clean'],
      isPremium: false,
      preview: '/previews/corporate-clean.mp4',
      settings: {
        text: {
          title: 'Welcome to Our Company',
          subtitle: 'Professional Solutions',
          tagline: 'Excellence in Every Detail',
          callToAction: 'Learn More'
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
            type: 'geometric',
            density: 0.5
          }
        },
        advanced: {
          responsiveSettings: {
            mobile: { scale: 0.8, position: { x: 0, y: 0 } },
            tablet: { scale: 0.9, position: { x: 0, y: 0 } },
            desktop: { scale: 1, position: { x: 0, y: 0 } }
          }
        }
      }
    },
    {
      id: '2',
      name: 'Creative Flow',
      thumbnail: 'https://images.unsplash.com/photo-1516541196182-6bdb0516ed27',
      duration: 20,
      category: 'creative',
      style: 'bold',
      tags: ['artistic', 'colorful', 'dynamic'],
      isPremium: true,
      preview: '/previews/creative-flow.mp4',
      settings: {
        text: {
          title: 'Unleash Your Creativity',
          subtitle: 'Bold Ideas, Bold Design',
          tagline: 'Where Innovation Meets Art',
          callToAction: 'Get Started'
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
        advanced: {
          responsiveSettings: {
            mobile: { scale: 0.8, position: { x: 0, y: 0 } },
            tablet: { scale: 0.9, position: { x: 0, y: 0 } },
            desktop: { scale: 1, position: { x: 0, y: 0 } }
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