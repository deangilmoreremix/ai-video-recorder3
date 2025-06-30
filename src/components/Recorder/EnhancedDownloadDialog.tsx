import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, Loader, Video, Settings, Youtube, Instagram,
  Twitter, Facebook, Linkedin, Globe, ChevronRight, 
  X, Play, Check, Camera, Wand2, Film, ArrowRight,
  Folder, Tag, Plus, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFolders } from '../../utils/supabaseClient';
import { generateThumbnail } from '../../utils/videoProcessing';

interface EnhancedDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordedBlob: Blob | null;
  onSave?: (blob: Blob, videoUrl: string, thumbnailUrl: string) => void;
  recordingTitle: string;
  recordingTags: string[];
  recordingFolder: string | null;
  onRecordingTitleChange: (title: string) => void;
  onRecordingTagsChange: (tags: string[]) => void;
  onRecordingFolderChange: (folder: string | null) => void;
}

export const EnhancedDownloadDialog: React.FC<EnhancedDownloadDialogProps> = ({
  isOpen,
  onClose,
  recordedBlob,
  onSave,
  recordingTitle,
  recordingTags,
  recordingFolder,
  onRecordingTitleChange,
  onRecordingTagsChange,
  onRecordingFolderChange
}) => {
  const [activeTab, setActiveTab] = useState('format');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Settings for exporting
  const [settings, setSettings] = useState({
    format: 'mp4',
    quality: 80,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    codec: 'h264',
    selectedPlatform: 'youtube'
  });

  // Load folders
  useEffect(() => {
    const loadFolders = async () => {
      setIsLoadingFolders(true);
      try {
        const folderList = await getFolders();
        setFolders(folderList);
      } catch (error) {
        console.error('Error loading folders:', error);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  // Generate thumbnail when blob is available
  useEffect(() => {
    const generateThumbnailFromVideo = async () => {
      if (!recordedBlob || !videoRef.current) return;
      
      try {
        // Create a File object from the Blob
        const file = new File([recordedBlob], 'recording.webm', { 
          type: recordedBlob.type 
        });
        
        // Generate a thumbnail
        const thumbnail = await generateThumbnail(file);
        setThumbnailUrl(thumbnail);
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    };
    
    if (recordedBlob && isOpen) {
      generateThumbnailFromVideo();
    }
  }, [recordedBlob, isOpen]);

  const handleExport = async () => {
    if (!recordedBlob) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulated export process with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress(i);
      }

      // Create a download URL
      const url = URL.createObjectURL(recordedBlob);
      
      if (onSave && thumbnailUrl) {
        // Save to database
        onSave(recordedBlob, url, thumbnailUrl);
      } else {
        // Direct download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recordingTitle || 'video'}.${settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !recordingTags.includes(newTag.trim())) {
      onRecordingTagsChange([...recordingTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onRecordingTagsChange(recordingTags.filter(tag => tag !== tagToRemove));
  };

  const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'twitter', name: 'Twitter', icon: Twitter },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
    { id: 'custom', name: 'Custom', icon: Globe }
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Save Recording</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Recording Details */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => onRecordingTitleChange(e.target.value)}
                className="w-full rounded-lg border-gray-300"
                placeholder="Enter recording title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-grow rounded-lg border-gray-300"
                  placeholder="Add tags"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {recordingTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recordingTags.map(tag => (
                    <div 
                      key={tag}
                      className="flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      <span className="text-sm">{tag}</span>
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder
              </label>
              <div className="relative">
                <select
                  value={recordingFolder || ''}
                  onChange={(e) => onRecordingFolderChange(e.target.value === '' ? null : e.target.value)}
                  className="w-full rounded-lg border-gray-300 pr-10"
                >
                  <option value="">None</option>
                  {folders.map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
                <Folder className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <div className="mt-1 flex justify-end">
                <button 
                  onClick={async () => {
                    const folderName = prompt('Enter new folder name:');
                    if (folderName && !folders.includes(folderName)) {
                      setFolders([...folders, folderName]);
                      onRecordingFolderChange(folderName);
                    }
                  }}
                  className="text-sm text-[#E44E51] hover:text-[#D43B3E] font-medium"
                >
                  Create New Folder
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b overflow-x-auto mb-6">
            <button
              onClick={() => setActiveTab('format')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'format'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Video className="w-4 h-4 mr-2" />
              Video Export
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 border-b-2 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'social'
                  ? 'border-[#E44E51] text-[#E44E51]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="w-4 h-4 mr-2" />
              Social Media
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {activeTab === 'format' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Video Preview */}
                <div className="md:col-span-1">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                    <video
                      ref={videoRef}
                      src={recordedBlob ? URL.createObjectURL(recordedBlob) : undefined}
                      className="w-full h-full"
                      controls
                    ></video>
                  </div>
                  
                  {thumbnailUrl && (
                    <div className="mt-4 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thumbnail Preview
                      </label>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={thumbnailUrl} 
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Export Settings */}
                <div className="md:col-span-2">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Export Format
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {['mp4', 'webm', 'mov', 'gif'].map((format) => (
                          <button
                            key={format}
                            onClick={() => setSettings({ ...settings, format })}
                            className={`p-3 rounded-lg border text-center ${
                              settings.format === format
                                ? 'border-[#E44E51] bg-[#E44E51]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium text-lg uppercase">{format}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Optimize for Platform
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {platforms.map((platform) => {
                          const Icon = platform.icon;
                          return (
                            <button
                              key={platform.id}
                              onClick={() => setSettings({ 
                                ...settings, 
                                selectedPlatform: platform.id 
                              })}
                              className={`p-3 rounded-lg border flex flex-col items-center ${
                                settings.selectedPlatform === platform.id
                                  ? 'border-[#E44E51] bg-[#E44E51]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon className="w-6 h-6 mb-1" />
                              <span className="text-xs">{platform.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution
                      </label>
                      <select
                        value={`${settings.resolution.width}x${settings.resolution.height}`}
                        onChange={(e) => {
                          const [width, height] = e.target.value.split('x').map(Number);
                          setSettings({ 
                            ...settings, 
                            resolution: { width, height }
                          });
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#E44E51] focus:ring-[#E44E51]"
                      >
                        <option value="3840x2160">4K (3840x2160)</option>
                        <option value="2560x1440">2K (2560x1440)</option>
                        <option value="1920x1080">Full HD (1920x1080)</option>
                        <option value="1280x720">HD (1280x720)</option>
                        <option value="854x480">SD (854x480)</option>
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Quality
                        </label>
                        <span className="text-sm text-gray-500">
                          {settings.quality}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.quality}
                        onChange={(e) => setSettings({
                          ...settings,
                          quality: parseInt(e.target.value)
                        })}
                        className="w-full accent-[#E44E51]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isProcessing || !recordedBlob || !recordingTitle.trim()}
                className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-lg 
                  hover:shadow-[#E44E51]/25 flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing... {progress}%</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Recording</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};