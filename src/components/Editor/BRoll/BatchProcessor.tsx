import React, { useState } from 'react';
import { 
  Film, Upload, Play, Settings, Download, 
  Folder, Plus, X, Check, AlertCircle, Wand2,
  Brain, Sparkles, Layers, Focus, Camera, Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Tooltip } from '../../ui/Tooltip';

interface BatchProcessorProps {
  onProcess: (files: File[]) => Promise<void>;
  isProcessing: boolean;
  progress?: number;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  onProcess,
  isProcessing,
  progress = 0
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoAnalyze: true,
    autoEnhance: false,
    autoTag: true,
    autoTrim: false,
    batchRename: false,
    renamePattern: '{index}-{name}',
    categorize: true,
    compressOnImport: false,
    generateThumbnails: true,
    extractMetadata: true
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': [],
      'image/*': [],
      'audio/*': []
    },
    onDrop: (acceptedFiles) => {
      setFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    await onProcess(files);
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive ? 'border-[#E44E51] bg-[#E44E51]/5' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <Film className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports video, image, and audio files
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Film className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}

          {/* Batch Settings */}
          <div className="pt-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" />
              <span>Batch Settings</span>
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoAnalyze}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          autoAnalyze: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Auto Analyze</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoEnhance}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          autoEnhance: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Auto Enhance</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoTag}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          autoTag: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Auto Tag</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoTrim}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          autoTrim: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Auto Trim</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between">
                      <span className="text-sm">Batch Rename</span>
                      <input
                        type="checkbox"
                        checked={settings.batchRename}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          batchRename: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                    </label>
                    {settings.batchRename && (
                      <input
                        type="text"
                        value={settings.renamePattern}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          renamePattern: e.target.value
                        }))}
                        placeholder="Rename pattern (e.g., {index}-{name})"
                        className="w-full text-sm rounded-lg border-gray-300"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.categorize}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          categorize: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Auto Categorize</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.compressOnImport}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          compressOnImport: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Compress on Import</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.generateThumbnails}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          generateThumbnails: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Generate Thumbnails</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.extractMetadata}
                        onChange={(e) => setSettings(s => ({
                          ...s,
                          extractMetadata: e.target.checked
                        }))}
                        className="rounded border-gray-300 text-[#E44E51]"
                      />
                      <span className="text-sm">Extract Metadata</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Process Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={() => setFiles([])}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
                hover:shadow-[#E44E51]/25 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing... {progress}%</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Process {files.length} Files</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};