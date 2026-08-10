import React, { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import { IntroTemplates } from './IntroTemplates';
import { IntroEditor } from './IntroEditor';
import { IntroPreview } from './IntroPreview';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntroStore, type IntroTemplate } from '../../../../store/introStore';

type IntroDraft = Pick<IntroTemplate['settings'], 'text' | 'style' | 'media' | 'advanced'>;

const DEFAULT_DRAFT: IntroDraft = {
  text: {
    title: 'Your Title Here',
    subtitle: 'Your Subtitle',
    tagline: 'Your Tagline'
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
    volume: 1
  },
  advanced: {}
};

export const Intros: React.FC = () => {
  const templates = useIntroStore((state) => state.templates);
  const updateTemplate = useIntroStore((state) => state.updateTemplate);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<IntroDraft>(DEFAULT_DRAFT);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      setSavedAt(null);
      // Load the template's own settings so the preview and the editor start
      // from what is actually stored against it.
      const template = templates.find((entry) => entry.id === templateId);
      if (template) {
        const { text, style, media, advanced } = template.settings;
        setTemplateData({ text, style, media, advanced });
      }
    },
    [templates]
  );

  const handleSave = useCallback(
    (data: IntroDraft) => {
      setTemplateData(data);
      if (!selectedTemplate) return;
      const template = templates.find((entry) => entry.id === selectedTemplate);
      if (!template) return;
      // Persist back to the store so the change survives switching templates.
      updateTemplate(selectedTemplate, {
        settings: { ...template.settings, ...data }
      });
      setSavedAt(Date.now());
    },
    [selectedTemplate, templates, updateTemplate]
  );

  const selected = selectedTemplate
    ? templates.find((entry) => entry.id === selectedTemplate) ?? null
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <IntroTemplates onSelect={handleTemplateSelect} selectedId={selectedTemplate} />
      </div>
      <AnimatePresence mode="wait">
        {selectedTemplate ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {savedAt && (
              <p className="flex items-center text-sm text-emerald-600">
                <Check className="w-4 h-4 mr-1" />
                Saved to “{selected?.name ?? 'template'}”
              </p>
            )}
            <IntroPreview templateData={templateData} name={selected?.name ?? 'Intro'} />
            {/* Re-mounted per template so the editor loads that template's settings. */}
            <IntroEditor
              key={selectedTemplate}
              templateId={selectedTemplate}
              onSave={handleSave}
              onChange={setTemplateData}
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full text-gray-500"
          >
            <p>Select a template to start customizing</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};