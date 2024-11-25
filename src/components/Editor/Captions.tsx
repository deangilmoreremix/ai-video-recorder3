import React, { useState } from 'react';
import { 
  Type, Languages, Users, Settings, Mic, Wand2, Clock, 
  Edit2, Download, Upload, Globe, Brain, Palette, Layout,
  Volume2, MessageSquare, Layers, Sliders, Plus, Trash2,
  AlignLeft, AlignCenter, AlignRight, Move, Save
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { nanoid } from 'nanoid';

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  language: string;
  style?: {
    position: 'top' | 'bottom';
    alignment: 'left' | 'center' | 'right';
    fontSize: number;
    color: string;
    background: string;
    opacity: number;
  };
}

export const Captions: React.FC = () => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({
    autoGenerate: true,
    autoTranslate: false,
    speakerDetection: true,
    style: {
      font: 'Arial',
      size: 16,
      color: '#ffffff',
      background: '#000000',
      opacity: 0.8,
      position: 'bottom',
      alignment: 'center'
    }
  });

  const [selectedLanguages, setSelectedLanguages] = useState(['en']);
  const [showStyleEditor, setShowStyleEditor] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  const generateCaptions = async () => {
    setProcessing(true);
    try {
      // Simulated caption generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newCaptions: Caption[] = [
        {
          id: nanoid(),
          text: 'Generated caption example',
          startTime: 0,
          endTime: 3,
          speaker: 'Speaker 1',
          language: 'en',
          style: {
            position: 'bottom',
            alignment: 'center',
            fontSize: 16,
            color: '#ffffff',
            background: '#000000',
            opacity: 0.8
          }
        }
      ];
      setCaptions(newCaptions);
    } catch (error) {
      console.error('Error generating captions:', error);
    } finally {
      setProcessing(false);
    }
  };

  const addCaption = () => {
    const newCaption: Caption = {
      id: nanoid(),
      text: '',
      startTime: 0,
      endTime: 3,
      language: 'en',
      style: {
        position: 'bottom',
        alignment: 'center',
        fontSize: settings.style.size,
        color: settings.style.color,
        background: settings.style.background,
        opacity: settings.style.opacity
      }
    };
    setCaptions([...captions, newCaption]);
    setSelectedCaption(newCaption.id);
  };

  const updateCaption = (id: string, updates: Partial<Caption>) => {
    setCaptions(captions.map(caption =>
      caption.id === id ? { ...caption, ...updates } : caption
    ));
  };

  const removeCaption = (id: string) => {
    setCaptions(captions.filter(caption => caption.id !== id));
    if (selectedCaption === id) setSelectedCaption(null);
  };

  const formatTime = (seconds: number): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(mins)}:${pad(secs)}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Captions</h3>
        <div className="flex space-x-2">
          <Tooltip content="Import captions file">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Upload className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Export captions">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Download className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Caption styles">
            <button
              onClick={() => setShowStyleEditor(!showStyleEditor)}
              className={`p-2 rounded-lg ${
                showStyleEditor ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'
              }`}
            >
              <Palette className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Settings">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-4">
        {/* Quick Settings */}
        <div className="grid grid-cols-2 gap-4">
          <Tooltip content="Generate captions automatically using AI speech recognition">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Auto-Generate</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoGenerate}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    autoGenerate: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </Tooltip>

          <Tooltip content="Detect and label different speakers">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Speaker Detection</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.speakerDetection}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    speakerDetection: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
                  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />
              </label>
            </div>
          </Tooltip>
        </div>

        {/* Style Editor */}
        {showStyleEditor && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium text-sm">Caption Style</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={settings.style.position}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, position: e.target.value as 'top' | 'bottom' }
                  }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Size
                </label>
                <input
                  type="number"
                  value={settings.style.size}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, size: parseInt(e.target.value) }
                  }))}
                  className="w-full rounded-lg border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  value={settings.style.color}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, color: e.target.value }
                  }))}
                  className="w-full h-9 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background
                </label>
                <input
                  type="color"
                  value={settings.style.background}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    style: { ...s.style, background: e.target.value }
                  }))}
                  className="w-full h-9 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Opacity
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.style.opacity}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  style: { ...s.style, opacity: parseFloat(e.target.value) }
                }))}
                className="w-full"
              />
            </div>

            <div className="flex justify-center space-x-2">
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'left' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'left' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'center' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'center' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  style: { ...s.style, alignment: 'right' }
                }))}
                className={`p-2 rounded ${
                  settings.style.alignment === 'right' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Captions List */}
        <div className="space-y-2">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className={`p-3 rounded-lg border ${
                selectedCaption === caption.id ? 'border-[#E44E51]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={caption.text}
                      onChange={(e) => updateCaption(caption.id, { text: e.target.value })}
                      className="flex-1 text-sm border-none focus:ring-0 p-0"
                      placeholder="Enter caption text..."
                    />
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(caption.startTime)} - {formatTime(caption.endTime)}</span>
                    </div>
                    {caption.speaker && (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{caption.speaker}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedCaption(caption.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCaption(caption.id)}
                    className="p-1 hover:bg-gray-100 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Caption Button */}
        <button
          onClick={addCaption}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg
            text-gray-500 hover:border-[#E44E51] hover:text-[#E44E51] transition-colors"
        >
          <Plus className="w-5 h-5 mx-auto" />
        </button>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              setCaptions([]);
              setSettings({
                autoGenerate: true,
                autoTranslate: false,
                speakerDetection: true,
                style: {
                  font: 'Arial',
                  size: 16,
                  color: '#ffffff',
                  background: '#000000',
                  opacity: 0.8,
                  position: 'bottom',
                  alignment: 'center'
                }
              });
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
          <div className="flex space-x-2">
            <button
              onClick={generateCaptions}
              disabled={processing}
              className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg 
                hover:bg-[#D43B3E] disabled:opacity-50 shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Captions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};