import React, { useState } from 'react';
import { 
  Play, Star, Download, Edit2, Clock, Filter, Search, Grid, List, 
  SortAsc, Tag, Plus, Palette, Music, Video, Image, Wand2, Layout,
  Sparkles, Layers, Box, Maximize2, Minimize2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntroStore } from '../../../../store/introStore';
import { Tooltip } from '../../../ui/Tooltip';

interface Category {
  id: string;
  name: string;
  icon: any;
  description: string;
}

export const IntroTemplates: React.FC = () => {
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
  } = useIntroStore();

  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const categories: Category[] = [
    { id: 'all', name: 'All Templates', icon: Layout, description: 'View all available templates' },
    { id: 'corporate', name: 'Corporate', icon: Box, description: 'Professional business intros' },
    { id: 'creative', name: 'Creative', icon: Palette, description: 'Artistic and dynamic intros' },
    { id: 'minimal', name: 'Minimal', icon: Minimize2, description: 'Clean and simple designs' },
    { id: 'dynamic', name: 'Dynamic', icon: Zap, description: 'High-energy motion graphics' },
    { id: 'custom', name: 'Custom', icon: Wand2, description: 'Your custom templates' }
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

  const handlePreview = (templateId: string) => {
    setPreviewTemplate(templateId);
    // Additional preview logic will be implemented here
  };

  return (
    <div className="space-y-6">
      {/* Search and Quick Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg ${
            showFilters ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 border-l pl-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              {/* Categories */}
              <div className="grid grid-cols-3 gap-2">
                {categories.map(({ id, name, icon: Icon, description }) => (
                  <Tooltip key={id} content={description}>
                    <button
                      onClick={() => setCategoryFilter(id)}
                      className={`flex items-center space-x-2 p-2 rounded-lg ${
                        categoryFilter === id
                          ? 'bg-[#E44E51]/10 text-[#E44E51] border-[#E44E51] border'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{name}</span>
                    </button>
                  </Tooltip>
                ))}
              </div>

              {/* Styles */}
              <div className="flex flex-wrap gap-2">
                {styles.map(({ id, name }) => (
                  <button
                    key={id}
                    onClick={() => setStyleFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      styleFilter === id
                        ? 'bg-[#E44E51]/10 text-[#E44E51]'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}
        >
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              layoutId={template.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden
                ${selectedTemplate === template.id ? 'ring-2 ring-[#E44E51]' : ''}
                ${viewMode === 'list' ? 'flex items-center space-x-4' : ''}`}
            >
              <div className={`relative ${viewMode === 'list' ? 'w-48' : 'aspect-video'}`}>
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 
                  transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <div className="flex space-x-2">
                    <Tooltip content="Preview template">
                      <button 
                        onClick={() => handlePreview(template.id)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Edit template">
                      <button 
                        onClick={() => setSelectedTemplate(template.id)}
                        className="p-2 bg-[#E44E51] text-white rounded-full hover:bg-[#D43B3E]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Duplicate template">
                      <button
                        onClick={() => duplicateTemplate(template.id)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className={`${viewMode === 'list' ? 'flex-1' : 'p-3'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{template.duration}s</span>
                    </div>
                  </div>
                  {template.isPremium && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Premium
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-8 h-8 mx-auto mb-2" />
          <p>No templates match your filters</p>
        </div>
      )}
    </div>
  );
};