import React, { useState } from 'react';
import { IntroTemplates } from './IntroTemplates';
import { IntroEditor } from './IntroEditor';
import { IntroPreview } from './IntroPreview';
import { motion, AnimatePresence } from 'framer-motion';

export const Intros: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState({
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
      duration: 5
    },
    media: {
      background: null,
      logo: null,
      music: null,
      volume: 1
    }
  });

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
            key="placeholder"
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