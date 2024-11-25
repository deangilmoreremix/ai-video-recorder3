import React, { useState } from 'react';
import { 
  Play, Star, Download, Edit2, Clock, Filter, Search, Grid, List, 
  SortAsc, Tag, Plus, Palette, Music, Video, Image, Wand2, Layout,
  Sparkles, Layers, Box, Maximize2, Minimize2, Zap, Camera, Film,
  Upload, Trash2, Copy, Eye, Settings, Save, Share2, X, Youtube,
  Instagram, Twitter, Facebook, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutroStore } from '../../store/outroStore';
import { Tooltip } from '../ui/Tooltip';
import { IntroEditor } from '../Intros/IntroEditor';
import { IntroPreview } from '../Intros/IntroPreview';

export const OutrosManager: React.FC = () => {
  const {
    templates,
    selectedTemplate,
    searchQuery,
    categoryFilter,
    styleFilter,
    viewMode,
    setSelectedTemplate,
    setSearchQuery,
    setCategoryFilter,
    setStyleFilter,
    setViewMode,
    duplicateTemplate
  } = useOutroStore();

  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const categories = [
    { id: 'all', name: 'All Outros', icon: Layout },
    { id: 'endcards', name: 'End Cards', icon: Box },
    { id: 'subscribe', name: 'Subscribe', icon: Youtube },
    { id: 'social', name: 'Social Media', icon: Globe },
    { id: 'branding', name: 'Branding', icon: Palette },
    { id: 'custom', name: 'Custom', icon: Wand2 }
  ];

  const styles = [
    { id: 'all', name: 'All Styles' },
    { id: 'modern', name: 'Modern' },
    { id: 'classic', name: 'Classic' },
    { id: 'bold', name: 'Bold' },
    { id: 'elegant', name: 'Elegant' },
    { id: 'playful', name: 'Playful' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesStyle = styleFilter === 'all' || template.style === styleFilter;
    return matchesSearch && matchesCategory && matchesStyle;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Outro Templates</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {viewMode === 'grid' ? (
              <Grid className="w-5 h-5" />
            ) : (
              <List className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg 
              hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25"
          >
            <Plus className="w-4 h-4" />
            <span>Create Outro</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search outros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCategoryFilter(id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg whitespace-nowrap ${
                categoryFilter === id
                  ? 'bg-[#E44E51]/10 text-[#E44E51]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <div className="flex space-x-2 overflow-x-auto">
          {styles.map(({ id, name }) => (
            <button
              key={id}
              onClick={() => setStyleFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                styleFilter === id
                  ? 'bg-[#E44E51]/10 text-[#E44E51]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid/List */}
      <div className={`grid ${
        viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 gap-4' : 'grid-cols-1 gap-2'
      }`}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`relative group cursor-pointer rounded-lg overflow-hidden ${
              viewMode === 'grid' ? 'aspect-video' : 'flex items-center p-2 bg-gray-50'
            }`}
          >
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
              transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
            >
              <div className="flex space-x-2">
                <Tooltip content="Preview outro">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowPreview(true);
                    }}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Edit outro">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setIsEditing(true);
                      setShowEditor(true);
                    }}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Duplicate outro">
                  <button
                    onClick={() => duplicateTemplate(template.id)}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <h4 className="text-white font-medium">{template.name}</h4>
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <Clock className="w-3 h-3" />
                <span>{template.duration}s</span>
                {template.isPremium && (
                  <span className="bg-yellow-400 text-yellow-900 px-1.5 rounded-full text-[10px] uppercase font-bold">
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <IntroEditor
            templateId={selectedTemplate}
            isEditing={isEditing}
            onClose={() => {
              setShowEditor(false);
              setIsEditing(false);
              setSelectedTemplate(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <IntroPreview
            templateId={selectedTemplate}
            onClose={() => {
              setShowPreview(false);
              setSelectedTemplate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};