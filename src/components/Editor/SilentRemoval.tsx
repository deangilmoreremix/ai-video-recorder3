import React, { useState, useCallback } from 'react';
import { 
  Volume2, VolumeX, Settings, Play, Pause, Save, 
  RotateCcw, Filter, Sliders, Activity, Music,
  Brain, Wand2, Sparkles, Gauge, Clock, Layers,
  AlertCircle, ChevronDown, ChevronUp, Eye, Check,
  Mic, MessageCircle, Scissors, Plus, X
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Switch } from '../ui/Switch';
import { motion, AnimatePresence } from 'framer-motion';

export const SilentRemoval = () => {
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const toggleEnabled = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);
  
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <VolumeX className="h-5 w-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Silent Section Removal</h3>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={enabled}
            onCheckedChange={toggleEnabled}
            aria-label="Toggle silent removal"
          />
          <button 
            onClick={toggleExpanded}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Expand settings"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Silence Threshold</label>
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-gray-500" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue="20"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                    />
                    <span className="text-xs text-gray-500">20%</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-700 block mb-1">Minimum Duration</label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <input 
                      type="range" 
                      min="0.5" 
                      max="5" 
                      step="0.5"
                      defaultValue="1"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                    />
                    <span className="text-xs text-gray-500">1.0s</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Tooltip content="Preview changes before applying">
                      <button className="p-1 hover:bg-gray-100 rounded text-sm flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-gray-600" />
                        <span>Preview</span>
                      </button>
                    </Tooltip>
                  </div>
                  
                  <button 
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 flex items-center gap-1"
                    disabled={!enabled}
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SilentRemoval;