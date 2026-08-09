import React, { useState } from 'react';
import { IntroTemplates } from './IntroTemplates';
import { IntroEditor } from './IntroEditor';
import { IntroPreview } from './IntroPreview';
import { motion, AnimatePresence } from 'framer-motion';
import type { IntroTemplate } from '../../../../store/introStore';

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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<IntroDraft>(DEFAULT_DRAFT);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

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
            <IntroPreview templateData={templateData} />
            <IntroEditor
              templateId={selectedTemplate}
              onSave={(data) => setTemplateData(data)}
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