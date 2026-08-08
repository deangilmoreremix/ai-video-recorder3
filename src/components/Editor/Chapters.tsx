import React, { useState } from 'react';
import { 
  BookOpen, Plus, Clock, Edit2, Trash2, ChevronUp, ChevronDown, 
  Settings, Image, Palette, Move, Save, AlertCircle, Camera,
  Layout, Type, Link, Eye, EyeOff
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { nanoid } from 'nanoid';

interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
  description?: string;
  color?: string;
  icon?: string;
  customThumbnail?: string;
  url?: string;
  isVisible: boolean;
  style?: {
    titleColor: string;
    backgroundColor: string;
    opacity: number;
    borderRadius: number;
    padding: number;
  };
}

export const Chapters: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoGenerate: false,
    detectScenes: true,
    minDuration: 5,
    thumbnails: true,
    customColors: true,
    autoTimestamps: true,
    linkGeneration: true,
    previewOnHover: true,
    smartTitles: true,
    exportFormat: 'vtt'
  });

  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const [dragOverChapter, setDragOverChapter] = useState<string | null>(null);

  const addChapter = () => {
    const lastChapter = chapters[chapters.length - 1];
    const startTime = lastChapter ? lastChapter.endTime : 0;
    
    const newChapter: Chapter = {
      id: nanoid(),
      title: `Chapter ${chapters.length + 1}`,
      startTime,
      endTime: startTime + 300, // Default 5 minutes
      description: '',
      isVisible: true,
      style: {
        titleColor: '#ffffff',
        backgroundColor: '#000000',
        opacity: 0.8,
        borderRadius: 8,
        padding: 16
      }
    };
    
    setChapters([...chapters, newChapter]);
    setEditingChapter(newChapter.id);
  };

  const updateChapter = (id: string, updates: Partial<Chapter>) => {
    setChapters(chapters.map(chapter =>
      chapter.id === id ? { ...chapter, ...updates } : chapter
    ));
  };

  const removeChapter = (id: string) => {
    setChapters(chapters.filter(chapter => chapter.id !== id));
    if (editingChapter === id) setEditingChapter(null);
  };

  const moveChapter = (id: string, direction: 'up' | 'down') => {
    const index = chapters.findIndex(chapter => chapter.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === chapters.length - 1)
    ) return;

    const newChapters = [...chapters];
    const temp = newChapters[index];
    newChapters[index] = newChapters[index + (direction === 'up' ? -1 : 1)];
    newChapters[index + (direction === 'up' ? -1 : 1)] = temp;
    setChapters(newChapters);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedChapter(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedChapter) {
      setDragOverChapter(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedChapter || draggedChapter === targetId) return;

    const sourceIndex = chapters.findIndex(c => c.id === draggedChapter);
    const targetIndex = chapters.findIndex(c => c.id === targetId);

    const newChapters = [...chapters];
    const [removed] = newChapters.splice(sourceIndex, 1);
    newChapters.splice(targetIndex, 0, removed);

    setChapters(newChapters);
    setDraggedChapter(null);
    setDragOverChapter(null);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const autoGenerateChapters = async () => {
    // Simulated chapter generation
    const generatedChapters: Chapter[] = [
      {
        id: nanoid(),
        title: 'Introduction',
        startTime: 0,
        endTime: 180,
        description: 'Opening sequence',
        isVisible: true,
        style: {
          titleColor: '#ffffff',
          backgroundColor: '#000000',
          opacity: 0.8,
          borderRadius: 8,
          padding: 16
        }
      },
      {
        id: nanoid(),
        title: 'Main Content',
        startTime: 180,
        endTime: 480,
        description: 'Core discussion',
        isVisible: true,
        style: {
          titleColor: '#ffffff',
          backgroundColor: '#000000',
          opacity: 0.8,
          borderRadius: 8,
          padding: 16
        }
      },
      {
        id: nanoid(),
        title: 'Conclusion',
        startTime: 480,
        endTime: 600,
        description: 'Closing remarks',
        isVisible: true,
        style: {
          titleColor: '#ffffff',
          backgroundColor: '#000000',
          opacity: 0.8,
          borderRadius: 8,
          padding: 16
        }
      }
    ];
    setChapters(generatedChapters);
  };

  const exportChapters = () => {
    let content = '';
    switch (settings.exportFormat) {
      case 'vtt':
        content = 'WEBVTT\n\n' + chapters
          .map(chapter => 
            `${formatTime(chapter.startTime).replace(':', '.')} --> ${formatTime(chapter.endTime).replace(':', '.')}\n${chapter.title}\n`
          ).join('\n');
        break;
      case 'json':
        content = JSON.stringify(chapters, null, 2);
        break;
      case 'txt':
        content = chapters
          .map(chapter => `${formatTime(chapter.startTime)} - ${chapter.title}`)
          .join('\n');
        break;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapters.${settings.exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Chapters</h3>
        <div className="flex space-x-2">
          <Tooltip content="Auto-generate chapters">
            <button
              onClick={autoGenerateChapters}
              className={`p-2 rounded-lg ${
                settings.autoGenerate ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Clock className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Export chapters">
            <button
              onClick={exportChapters}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Save className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Chapter settings">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Add new chapter">
            <button
              onClick={addChapter}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto-generate chapters</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoGenerate}
                onChange={(e) => setSettings({
                  ...settings,
                  autoGenerate: e.target.checked
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

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Scene detection</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.detectScenes}
                onChange={(e) => setSettings({
                  ...settings,
                  detectScenes: e.target.checked
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

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Smart titles</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smartTitles}
                onChange={(e) => setSettings({
                  ...settings,
                  smartTitles: e.target.checked
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Export Format
            </label>
            <select
              value={settings.exportFormat}
              onChange={(e) => setSettings({
                ...settings,
                exportFormat: e.target.value
              })}
              className="w-full rounded-lg border-gray-300 shadow-sm"
            >
              <option value="vtt">WebVTT</option>
              <option value="json">JSON</option>
              <option value="txt">Plain Text</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum chapter duration (seconds)
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={settings.minDuration}
              onChange={(e) => setSettings({
                ...settings,
                minDuration: parseInt(e.target.value)
              })}
              className="w-full accent-[#E44E51]"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1s</span>
              <span>{settings.minDuration}s</span>
              <span>60s</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            draggable
            onDragStart={(e) => handleDragStart(e, chapter.id)}
            onDragOver={(e) => handleDragOver(e, chapter.id)}
            onDrop={(e) => handleDrop(e, chapter.id)}
            className={`p-3 rounded-lg transition-colors ${
              editingChapter === chapter.id ? 'bg-[#E44E51]/10' : 'bg-gray-50'
            } ${dragOverChapter === chapter.id ? 'border-2 border-[#E44E51]' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Move className="w-4 h-4 text-gray-400 cursor-move" />
                <BookOpen className="w-4 h-4 text-gray-600" />
                {editingChapter === chapter.id ? (
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    onBlur={() => setEditingChapter(null)}
                    className="px-2 py-1 text-sm border rounded bg-white"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm font-medium">{chapter.title}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {formatTime(chapter.startTime)}
                </span>
                <div className="flex space-x-1">
                  <Tooltip content="Toggle visibility">
                    <button
                      onClick={() => updateChapter(chapter.id, { 
                        isVisible: !chapter.isVisible 
                      })}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {chapter.isVisible ? (
                        <Eye className="w-4 h-4 text-gray-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </Tooltip>
                  {index > 0 && (
                    <Tooltip content="Move up">
                      <button
                        onClick={() => moveChapter(chapter.id, 'up')}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      </button>
                    </Tooltip>
                  )}
                  {index < chapters.length - 1 && (
                    <Tooltip content="Move down">
                      <button
                        onClick={() => moveChapter(chapter.id, 'down')}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Edit chapter">
                    <button
                      onClick={() => setEditingChapter(chapter.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Remove chapter">
                    <button
                      onClick={() => removeChapter(chapter.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-[#E44E51]" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
            {editingChapter === chapter.id && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={chapter.description || ''}
                    onChange={(e) => updateChapter(chapter.id, { 
                      description: e.target.value 
                    })}
                    className="w-full rounded-lg border-gray-300 text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={formatTime(chapter.startTime)}
                      onChange={(e) => {
                        // Add time parsing logic here
                      }}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={formatTime(chapter.endTime)}
                      onChange={(e) => {
                        // Add time parsing logic here
                      }}
                      className="w-full rounded-lg border-gray-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Thumbnail
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Add thumbnail capture logic
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      <Camera className="w-4 h-4 inline-block mr-1" />
                      Capture
                    </button>
                    <button
                      onClick={() => {
                        // Add thumbnail upload logic
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      <Image className="w-4 h-4 inline-block mr-1" />
                      Upload
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Style
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Title Color
                      </label>
                      <input
                        type="color"
                        value={chapter.style?.titleColor || '#ffffff'}
                        onChange={(e) => updateChapter(chapter.id, {
                          style: { ...chapter.style!, titleColor: e.target.value }
                        })}
                        className="w-full h-8 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Background
                      </label>
                      <input
                        type="color"
                        value={chapter.style?.backgroundColor || '#000000'}
                        onChange={(e) => updateChapter(chapter.id, {
                          style: { ...chapter.style!, backgroundColor: e.target.value }
                        })}
                        className="w-full h-8 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={chapter.url || ''}
                      onChange={(e) => updateChapter(chapter.id, { 
                        url: e.target.value 
                      })}
                      className="flex-1 rounded-lg border-gray-300 text-sm"
                      placeholder="https://"
                    />
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Link className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {chapters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No chapters yet. Click the plus button to add one.</p>
        </div>
      )}
    </div>
  );
};