import React, { useState, useRef, useCallback } from 'react';
import { 
  Type, Image, Music, Settings, Palette, Clock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  X, Save, Upload, Play, Download, Share2, Film,
  Camera, Wand2, Sparkles, Layers, Focus, Brain,
  CloudFog, Plus, Trash2, Eye, Volume2, VolumeX,
  Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HexColorPicker } from 'react-colorful';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Tooltip } from '../../../ui/Tooltip';
import { useIntroStore } from '../../../../store/introStore';

interface IntroEditorProps {
  templateId: string;
  onSave: (data: any) => void;
}

export const IntroEditor: React.FC<IntroEditorProps> = ({ templateId, onSave }) => {
  const template = useIntroStore(state => 
    state.templates.find(t => t.id === templateId)
  );

  const [text, setText] = useState(template?.settings.text || {
    title: '',
    subtitle: '',
    tagline: '',
    callToAction: ''
  });

  const [style, setStyle] = useState(template?.settings.style || {
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
  });

  const [media, setMedia] = useState(template?.settings.media || {
    background: null,
    overlay: null,
    logo: null,
    music: null,
    volume: 1,
    particles: {
      enabled: true,
      type: 'geometric',
      density: 0.5
    }
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeColorTarget, setActiveColorTarget] = useState<string | null>(null);
  const [showParticleEditor, setShowParticleEditor] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const fonts = [
    'Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Open Sans',
    'Poppins', 'Raleway', 'Source Sans Pro', 'Oswald', 'Lato'
  ];

  const animations = [
    { id: 'fade', name: 'Fade' },
    { id: 'slide', name: 'Slide' },
    { id: 'zoom', name: 'Zoom' },
    { id: 'bounce', name: 'Bounce' },
    { id: 'rotate', name: 'Rotate' }
  ];

  const particleTypes = [
    { id: 'confetti', name: 'Confetti' },
    { id: 'sparkles', name: 'Sparkles' },
    { id: 'bubbles', name: 'Bubbles' },
    { id: 'geometric', name: 'Geometric' }
  ];

  const handleMediaUpload = useCallback(async (type: 'background' | 'overlay' | 'logo' | 'music', file: File) => {
    const url = URL.createObjectURL(file);
    setMedia(prev => ({
      ...prev,
      [type]: url
    }));
  }, []);

  const handleSave = async () => {
    const templateData = {
      text,
      style,
      media
    };
    onSave(templateData);
  };

  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
    if (!isPreviewMode) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customize Intro</h3>
        <div className="flex space-x-2">
          <Tooltip content="Toggle preview">
            <button
              onClick={togglePreviewMode}
              className={`p-2 rounded-lg ${
                isPreviewMode ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Eye className="w-5 h-5" />
            </button>
          </Tooltip>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
              shadow-lg hover:shadow-[#E44E51]/25"
          >
            <Save className="w-4 h-4 inline-block mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div 
        ref={previewRef}
        className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${
          isPreviewMode ? 'mb-6' : 'hidden'
        }`}
      >
        {/* Preview content */}
        <div 
          className={`absolute inset-0 flex flex-col items-${style.alignment} justify-center p-8`}
          style={{ fontFamily: style.fontFamily }}
        >
          <motion.h1 
            className="text-4xl font-bold text-white mb-4"
            style={{ 
              fontSize: `${style.titleSize}px`,
              textShadow: style.textEffects.shadow ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
              WebkitTextStroke: style.textEffects.outline ? '1px rgba(255,255,255,0.3)' : 'none'
            }}
            animate={isPlaying ? {
              opacity: [0, 1],
              y: [20, 0]
            } : {}}
            transition={{
              duration: style.transitions.duration,
              ease: style.transitions.easing
            }}
          >
            {text.title || 'Your Title Here'}
          </motion.h1>
          
          <motion.h2 
            className="text-2xl text-gray-200 mb-2"
            animate={isPlaying ? {
              opacity: [0, 1],
              y: [20, 0]
            } : {}}
            transition={{
              duration: style.transitions.duration,
              delay: 0.2,
              ease: style.transitions.easing
            }}
          >
            {text.subtitle || 'Your Subtitle'}
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-300"
            animate={isPlaying ? {
              opacity: [0, 1],
              y: [20, 0]
            } : {}}
            transition={{
              duration: style.transitions.duration,
              delay: 0.4,
              ease: style.transitions.easing
            }}
          >
            {text.tagline || 'Your Tagline'}
          </motion.p>

          {text.callToAction && (
            <motion.button
              className="mt-6 px-6 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]
                shadow-lg hover:shadow-[#E44E51]/25"
              animate={isPlaying ? {
                opacity: [0, 1],
                scale: [0.9, 1]
              } : {}}
              transition={{
                duration: style.transitions.duration,
                delay: 0.6,
                ease: style.transitions.easing
              }}
            >
              {text.callToAction}
            </motion.button>
          )}
        </div>

        {/* Particle Effects */}
        {media.particles.enabled && (
          <Canvas className="absolute inset-0 pointer-events-none">
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
            {/* Particle system will be implemented here */}
          </Canvas>
        )}
      </div>

      {/* Editor Panels */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Text & Style */}
        <div className="space-y-6">
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
                  value={text.title}
                  onChange={(e) => setText({ ...text, title: e.target.value })}
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
                  value={text.subtitle}
                  onChange={(e) => setText({ ...text, subtitle: e.target.value })}
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
                  value={text.tagline}
                  onChange={(e) => setText({ ...text, tagline: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                  placeholder="Enter tagline"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call to Action
                </label>
                <input
                  type="text"
                  value={text.callToAction}
                  onChange={(e) => setText({ ...text, callToAction: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                  placeholder="Enter call to action text"
                />
              </div>
            </div>
          </div>

          {/* Typography & Effects */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center">
              <Palette className="w-4 h-4 mr-2" />
              Typography & Effects
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Family
                </label>
                <select
                  value={style.fontFamily}
                  onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
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
                  value={style.animation}
                  onChange={(e) => setStyle({ ...style, animation: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                >
                  {animations.map(({ id, name }) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStyle({ ...style, alignment: 'left' })}
                className={`p-2 rounded ${
                  style.alignment === 'left' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStyle({ ...style, alignment: 'center' })}
                className={`p-2 rounded ${
                  style.alignment === 'center' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStyle({ ...style, alignment: 'right' })}
                className={`p-2 rounded ${
                  style.alignment === 'right' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Text Effects
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStyle({
                    ...style,
                    textEffects: {
                      ...style.textEffects,
                      glow: !style.textEffects.glow
                    }
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    style.textEffects.glow
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline-block mr-1" />
                  Glow
                </button>
                <button
                  onClick={() => setStyle({
                    ...style,
                    textEffects: {
                      ...style.textEffects,
                      shadow: !style.textEffects.shadow
                    }
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    style.textEffects.shadow
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <CloudFog className="w-4 h-4 inline-block mr-1" />
                  Shadow
                </button>
                <button
                  onClick={() => setStyle({
                    ...style,
                    textEffects: {
                      ...style.textEffects,
                      outline: !style.textEffects.outline
                    }
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    style.textEffects.outline
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Focus className="w-4 h-4 inline-block mr-1" />
                  Outline
                </button>
                <button
                  onClick={() => setStyle({
                    ...style,
                    textEffects: {
                      ...style.textEffects,
                      gradient: !style.textEffects.gradient
                    }
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    style.textEffects.gradient
                      ? 'bg-[#E44E51]/10 text-[#E44E51]'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Palette className="w-4 h-4 inline-block mr-1" />
                  Gradient
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Media & Advanced */}
        <div className="space-y-6">
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
                  onChange={(e) => e.target.files?.[0] && 
                    handleMediaUpload('background', e.target.files[0])
                  }
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
                  onChange={(e) => e.target.files?.[0] && 
                    handleMediaUpload('logo', e.target.files[0])
                  }
                  className="w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[#E44E51]/10 file:text-[#E44E51]
                    hover:file:bg-[#E44E51]/20"
                />
              </div>
            </div>

            {/* Particle Effects */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Particle Effects
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={media.particles.enabled}
                    onChange={(e) => setMedia({
                      ...media,
                      particles: {
                        ...media.particles,
                        enabled: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                    peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                    peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                    after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
                </label>
              </div>

              {media.particles.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={media.particles.type}
                      onChange={(e) => setMedia({
                        ...media,
                        particles: {
                          ...media.particles,
                          type: e.target.value as any
                        }
                      })}
                      className="w-full rounded-lg border-gray-300 shadow-sm"
                    >
                      {particleTypes.map(({ id, name }) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Density
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={media.particles.density}
                      onChange={(e) => setMedia({
                        ...media,
                        particles: {
                          ...media.particles,
                          density: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full accent-[#E44E51]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 
                hover:bg-gray-50 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </div>
              <motion.div
                animate={{ rotate: showAdvancedSettings ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showAdvancedSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Advanced settings content */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {/* Animation Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Animation Settings
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Duration (s)
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={style.transitions.duration}
                            onChange={(e) => setStyle({
                              ...style,
                              transitions: {
                                ...style.transitions,
                                duration: parseFloat(e.target.value)
                              }
                            })}
                            className="w-full rounded-lg border-gray-300 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Easing
                          </label>
                          <select
                            value={style.transitions.easing}
                            onChange={(e) => setStyle({
                              ...style,
                              transitions: {
                                ...style.transitions,
                                easing: e.target.value
                              }
                            })}
                            className="w-full rounded-lg border-gray-300 shadow-sm"
                          >
                            <option value="linear">Linear</option>
                            <option value="cubic-bezier(0.4, 0, 0.2, 1)">Ease</option>
                            <option value="cubic-bezier(0.34, 1.56, 0.64, 1)">Bounce</option>
                            <option value="cubic-bezier(0.68, -0.6, 0.32, 1.6)">Spring</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Responsive Settings */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsive Settings
                      </label>
                      <div className="space-y-3">
                        {['mobile', 'tablet', 'desktop'].map((device) => (
                          <div key={device} className="flex items-center space-x-4">
                            <span className="text-sm capitalize w-20">{device}</span>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.1"
                              value={style.responsiveSettings?.[device]?.scale || 1}
                              onChange={(e) => setStyle({
                                ...style,
                                responsiveSettings: {
                                  ...style.responsiveSettings,
                                  [device]: {
                                    ...style.responsiveSettings?.[device],
                                    scale: parseFloat(e.target.value)
                                  }
                                }
                              })}
                              className="flex-1 accent-[#E44E51]"
                            />
                            <span className="text-sm w-12">
                              {(style.responsiveSettings?.[device]?.scale || 1) * 100}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};