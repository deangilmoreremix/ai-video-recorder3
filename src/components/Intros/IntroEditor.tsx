import React, { useState } from 'react';
import { 
  Type, Image, Music, Settings, Palette, Clock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  X, Save, Upload, Play, Download, Share2, Film,
  Camera, Wand2, Sparkles, Layers, Focus, Brain,
  CloudFog, Plus, Trash2, Eye, Volume2, VolumeX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface IntroEditorProps {
  templateId: string | null;
  isEditing: boolean;
  onClose: () => void;
}

export const IntroEditor: React.FC<IntroEditorProps> = ({
  templateId,
  isEditing,
  onClose
}) => {
  const [formData, setFormData] = useState({
    text: {
      title: '',
      subtitle: '',
      tagline: ''
    },
    style: {
      fontFamily: 'Inter',
      titleSize: 48,
      subtitleSize: 24,
      taglineSize: 18,
      titleColor: '#ffffff',
      subtitleColor: '#e2e8f0',
      taglineColor: '#cbd5e1',
      alignment: 'center',
      titleWeight: 'bold',
      animation: 'fade',
      duration: 5
    },
    media: {
      background: null as File | null,
      logo: null as File | null,
      music: null as File | null,
      volume: 1
    }
  });

  const [preview, setPreview] = useState({
    background: '',
    logo: '',
    music: ''
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const fonts = [
    'Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Open Sans'
  ];

  const animations = [
    'fade', 'slide', 'zoom', 'bounce', 'rotate'
  ];

  const handleFileChange = (type: 'background' | 'logo' | 'music') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        media: {
          ...prev.media,
          [type]: file
        }
      }));
      setPreview(prev => ({
        ...prev,
        [type]: URL.createObjectURL(file)
      }));
    }
  };

  const handleSave = async () => {
    try {
      // Save logic will be implemented here
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
              {preview.background && (
                <img
                  src={preview.background}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {preview.logo && (
                <img
                  src={preview.logo}
                  alt="Logo"
                  className="absolute top-4 left-4 h-12 object-contain"
                />
              )}
              <div className={`absolute inset-0 flex flex-col items-${formData.style.alignment} justify-center p-8`}>
                <h1 
                  className="text-4xl font-bold text-white mb-4"
                  style={{ 
                    fontFamily: formData.style.fontFamily,
                    fontSize: `${formData.style.titleSize}px`,
                    color: formData.style.titleColor
                  }}
                >
                  {formData.text.title || 'Your Title Here'}
                </h1>
                <h2 
                  className="text-2xl text-gray-200 mb-2"
                  style={{
                    fontFamily: formData.style.fontFamily,
                    fontSize: `${formData.style.subtitleSize}px`,
                    color: formData.style.subtitleColor
                  }}
                >
                  {formData.text.subtitle || 'Your Subtitle'}
                </h2>
                <p 
                  className="text-lg text-gray-300"
                  style={{
                    fontFamily: formData.style.fontFamily,
                    fontSize: `${formData.style.taglineSize}px`,
                    color: formData.style.taglineColor
                  }}
                >
                  {formData.text.tagline || 'Your Tagline'}
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isPlaying ? (
                  <motion.div
                    animate={{ scale: [1, 0.8, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Play className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Editor Panel */}
          <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
            {/* Text Content */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Text Content
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.text.title}
                    onChange={(e) => setFormData({
                      ...formData,
                      text: { ...formData.text, title: e.target.value }
                    })}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                    placeholder="Enter title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.text.subtitle}
                    onChange={(e) => setFormData({
                      ...formData,
                      text: { ...formData.text, subtitle: e.target.value }
                    })}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                    placeholder="Enter subtitle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.text.tagline}
                    onChange={(e) => setFormData({
                      ...formData,
                      text: { ...formData.text, tagline: e.target.value }
                    })}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                    placeholder="Enter tagline"
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Typography
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={formData.style.fontFamily}
                    onChange={(e) => setFormData({
                      ...formData,
                      style: { ...formData.style, fontFamily: e.target.value }
                    })}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Animation
                  </label>
                  <select
                    value={formData.style.animation}
                    onChange={(e) => setFormData({
                      ...formData,
                      style: { ...formData.style, animation: e.target.value }
                    })}
                    className="w-full rounded-lg border-gray-300 shadow-sm"
                  >
                    {animations.map((animation) => (
                      <option key={animation} value={animation}>
                        {animation.charAt(0).toUpperCase() + animation.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setFormData({
                    ...formData,
                    style: { ...formData.style, alignment: 'left' }
                  })}
                  className={`p-2 rounded ${
                    formData.style.alignment === 'left' 
                      ? 'bg-[#E44E51]/10 text-[#E44E51]' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFormData({
                    ...formData,
                    style: { ...formData.style, alignment: 'center' }
                  })}
                  className={`p-2 rounded ${
                    formData.style.alignment === 'center'
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFormData({
                    ...formData,
                    style: { ...formData.style, alignment: 'right' }
                  })}
                  className={`p-2 rounded ${
                    formData.style.alignment === 'right'
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Image className="w-4 h-4 mr-2" />
                Media
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange('background')}
                    className="w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#E44E51]/10 file:text-[#E44E51]
                      hover:file:bg-[#E44E51]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange('logo')}
                    className="w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#E44E51]/10 file:text-[#E44E51]
                      hover:file:bg-[#E44E51]/20"
                  />
                </div>
              </div>
            </div>

            {/* Audio */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Music className="w-4 h-4 mr-2" />
                Audio
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Music
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange('music')}
                  className="w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[#E44E51]/10 file:text-[#E44E51]
                    hover:file:bg-[#E44E51]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.media.volume}
                  onChange={(e) => setFormData({
                    ...formData,
                    media: {
                      ...formData.media,
                      volume: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full accent-[#E44E51]"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Duration
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.style.duration}
                  onChange={(e) => setFormData({
                    ...formData,
                    style: {
                      ...formData.style,
                      duration: parseInt(e.target.value)
                    }
                  })}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
              shadow-lg hover:shadow-[#E44E51]/25"
          >
            {isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};