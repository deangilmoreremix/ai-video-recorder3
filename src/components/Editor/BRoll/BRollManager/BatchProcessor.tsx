import React, { useState, useCallback } from 'react';
import { 
  Layers, Play, Pause, Download, Trash2, Settings, 
  CheckCircle, AlertCircle, Clock, Zap, FileVideo 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  outputUrl?: string;
}

interface BatchProcessorProps {
  onProcessComplete?: (outputUrls: string[]) => void;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({ onProcessComplete }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState({
    autoDetectScenes: true,
    addTransitions: true,
    transitionDuration: 0.5,
    normalizeAudio: true,
    applyColorGrading: false,
    outputFormat: 'mp4',
    quality: 'high'
  });

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const newJobs: BatchJob[] = files.map(file => ({
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: file.name,
      status: 'pending',
      progress: 0
    }));
    
    setJobs(prev => [...prev, ...newJobs]);
  }, []);

  // Toggle job selection
  const toggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  // Select all jobs
  const selectAllJobs = useCallback(() => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    }
  }, [jobs, selectedJobs.size]);

  // Remove selected jobs
  const removeSelectedJobs = useCallback(() => {
    setJobs(prev => prev.filter(j => !selectedJobs.has(j.id)));
    setSelectedJobs(new Set());
  }, [selectedJobs]);

  // Remove single job
  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    selectedJobs.delete(jobId);
  }, [selectedJobs]);

  // Clear all completed jobs
  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status !== 'completed'));
  }, []);

  // Process jobs (simulated)
  const processJobs = useCallback(async () => {
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    if (pendingJobs.length === 0) return;

    setIsProcessing(true);

    for (const job of pendingJobs) {
      // Update status to processing
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing' as const } : j
      ));

      // Simulate processing
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, progress } : j
        ));
      }

      // Mark as completed
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          status: 'completed' as const,
          outputUrl: `processed-${job.filename}`
        } : j
      ));
    }

    setIsProcessing(false);

    // Notify completion
    const completedJobs = jobs.filter(j => j.status === 'completed' || pendingJobs.some(p => p.id === j.id));
    if (onProcessComplete) {
      onProcessComplete(completedJobs.map(j => j.outputUrl || '').filter(Boolean));
    }
  }, [jobs, onProcessComplete]);

  // Get status icon
  const getStatusIcon = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileVideo className="w-5 h-5 text-gray-400" />;
    }
  };

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#E44E51]" />
          <h3 className="text-lg font-semibold">Batch Processor</h3>
          {jobs.length > 0 && (
            <span className="text-sm text-gray-500">
              ({completedCount}/{jobs.length} completed)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 px-3 py-1.5 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] cursor-pointer transition-colors">
            <FileVideo className="w-4 h-4" />
            <span className="text-sm">Add Files</span>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg ${showSettings ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.autoDetectScenes}
                    onChange={(e) => setSettings(s => ({ ...s, autoDetectScenes: e.target.checked }))}
                    className="rounded text-[#E44E51]"
                  />
                  <span className="text-sm">Auto-detect scenes</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.addTransitions}
                    onChange={(e) => setSettings(s => ({ ...s, addTransitions: e.target.checked }))}
                    className="rounded text-[#E44E51]"
                  />
                  <span className="text-sm">Add transitions</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.normalizeAudio}
                    onChange={(e) => setSettings(s => ({ ...s, normalizeAudio: e.target.checked }))}
                    className="rounded text-[#E44E51]"
                  />
                  <span className="text-sm">Normalize audio</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.applyColorGrading}
                    onChange={(e) => setSettings(s => ({ ...s, applyColorGrading: e.target.checked }))}
                    className="rounded text-[#E44E51]"
                  />
                  <span className="text-sm">Apply color grading</span>
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Output format</label>
                  <select
                    value={settings.outputFormat}
                    onChange={(e) => setSettings(s => ({ ...s, outputFormat: e.target.value }))}
                    className="w-full rounded-lg border-gray-300"
                  >
                    <option value="mp4">MP4</option>
                    <option value="webm">WebM</option>
                    <option value="mov">MOV</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Quality</label>
                  <select
                    value={settings.quality}
                    onChange={(e) => setSettings(s => ({ ...s, quality: e.target.value }))}
                    className="w-full rounded-lg border-gray-300"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
