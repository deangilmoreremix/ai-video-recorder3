import React, { useCallback, useMemo, useState } from 'react';
import { Box, Check, Copy, Plus, Search } from 'lucide-react';
import { useOutroStore, type OutroTemplate } from '../../../../store/outroStore';
import { cn } from '../../../../utils/cn';
import { Tooltip } from '../../../ui/Tooltip';
import { OutroEditor } from './OutroEditor';

type OutroSettings = OutroTemplate['settings'];
type OutroDraft = Pick<
  OutroSettings,
  'text' | 'style' | 'media' | 'endCards' | 'socialLinks' | 'advanced'
>;

const createBlankOutro = (): Omit<OutroTemplate, 'id'> => ({
  name: 'Untitled Outro',
  thumbnail: '',
  duration: 10,
  category: 'custom',
  style: 'modern',
  tags: ['custom'],
  isPremium: false,
  preview: '',
  settings: {
    text: {
      title: 'Thanks for Watching!',
      subtitle: 'Subscribe for more',
      callToAction: 'Subscribe',
      endMessage: 'See you next time'
    },
    style: {
      fontFamily: 'Inter',
      titleSize: 48,
      alignment: 'center',
      animation: 'fade',
      duration: 5,
      textEffects: { glow: false, shadow: true, outline: false, gradient: true },
      transitions: { type: 'fade', duration: 0.8, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
    },
    media: {
      background: null,
      overlay: null,
      logo: null,
      music: null,
      volume: 1,
      particles: { enabled: false, type: 'confetti', density: 0.5 }
    },
    endCards: {
      enabled: true,
      type: 'subscribe',
      position: 'bottom-right',
      delay: 1,
      duration: 6,
      style: { scale: 1, opacity: 0.9, blur: false, shadow: true }
    },
    socialLinks: {},
    advanced: {}
  }
});

export const Outros: React.FC = () => {
  const templates = useOutroStore((state) => state.templates);
  const selectedTemplate = useOutroStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useOutroStore((state) => state.setSelectedTemplate);
  const updateTemplate = useOutroStore((state) => state.updateTemplate);
  const addTemplate = useOutroStore((state) => state.addTemplate);
  const duplicateTemplate = useOutroStore((state) => state.duplicateTemplate);

  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [search, templates]);

  const template = templates.find((entry) => entry.id === selectedTemplate) ?? null;

  const handleSave = useCallback(
    (data: OutroDraft) => {
      if (!template) return;
      updateTemplate(template.id, {
        settings: { ...template.settings, ...data }
      });
      setSavedAt(Date.now());
    },
    [template, updateTemplate]
  );

  const handleCreate = useCallback(() => {
    const blank = createBlankOutro();
    addTemplate(blank);
    // The newest template is appended by the store.
    const { templates: next } = useOutroStore.getState();
    const created = next[next.length - 1];
    if (created) setSelectedTemplate(created.id);
    setSavedAt(null);
  }, [addTemplate, setSelectedTemplate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Outro Templates</h3>
          <Tooltip content="Create a new outro template">
            <button
              onClick={handleCreate}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-[#E44E51] text-white
                rounded-lg hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </Tooltip>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search outros..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>

        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 border border-dashed rounded-lg text-center">
              No outro templates match “{search}”.
            </p>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() => {
                  setSelectedTemplate(entry.id);
                  setSavedAt(null);
                }}
                className={cn(
                  'flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-colors',
                  selectedTemplate === entry.id
                    ? 'border-[#E44E51] bg-[#E44E51]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="w-20 h-12 rounded bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {entry.thumbnail ? (
                    <img src={entry.thumbnail} alt={entry.name} className="w-full h-full object-cover" />
                  ) : (
                    <Box className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-gray-500">
                    {entry.duration}s · {entry.style}
                  </p>
                </div>
                <Tooltip content="Duplicate template">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTemplate(entry.id);
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        {!template ? (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center text-gray-500 border border-dashed rounded-lg">
            <Box className="w-10 h-10 mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">Pick an outro template to customise</p>
            <p className="text-sm">
              Everything you change is written back to the outro store when you save.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-sm text-gray-500">
                  {template.category} · {template.style} · {template.duration}s
                </p>
              </div>
              {savedAt && (
                <span className="flex items-center text-sm text-emerald-600">
                  <Check className="w-4 h-4 mr-1" />
                  Saved to template
                </span>
              )}
            </div>

            {/* The real outro editor, re-mounted per template so it loads that
                template's saved settings. */}
            <OutroEditor key={template.id} templateId={template.id} onSave={handleSave} />
          </>
        )}
      </div>
    </div>
  );
};
