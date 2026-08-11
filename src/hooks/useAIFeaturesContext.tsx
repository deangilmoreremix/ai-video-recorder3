/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import { useAIFeatures } from './useAIFeatures';

type AIFeaturesValue = ReturnType<typeof useAIFeatures>;

export const AIFeaturesContext = createContext<AIFeaturesValue | null>(null);

export const AIFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useAIFeatures();
  return <AIFeaturesContext.Provider value={value}>{children}</AIFeaturesContext.Provider>;
};

let warnedAboutMissingProvider = false;

export const useAIFeaturesContext = (): AIFeaturesValue => {
  const ctx = useContext(AIFeaturesContext);
  if (ctx) return ctx;
  // Orphan/unwrapped component: fall back to a standalone instance so it still
  // works without a provider. A one-time warning surfaces the accidental usage.
  if (!warnedAboutMissingProvider) {
    warnedAboutMissingProvider = true;
    console.warn(
      'useAIFeaturesContext: no AIFeaturesProvider found – falling back to a standalone useAIFeatures() instance.'
    );
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAIFeatures();
};
