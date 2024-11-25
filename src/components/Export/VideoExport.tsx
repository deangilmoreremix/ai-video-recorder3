{/* Previous imports remain the same */}
import { 
  Download, Loader, Cpu, Sparkles, Volume2, Type, Image,
  Zap, X, Film, Camera, Wand2, Settings, Youtube, Instagram,
  Twitter, Facebook, Music4, Linkedin, Globe, Sliders, 
  MessageCircle, Share2, Clock, Palette, Layout, Music,
  Gauge, Layers, Eye, Save, Upload, Brain, Scan, Focus,
  CloudFog, Wind, Filter, Maximize2, Minimize2, ImagePlus,
  Move, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoExportProps {
  videoBlob: Blob;
  onClose: () => void;
}

interface WatermarkSettings {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  scale: number;
  file?: File;
  preview?: string;
  offset: {
    x: number;
    y: number;
  };
}

export const VideoExport: React.FC<VideoExportProps> = ({ videoBlob, onClose }) => {
  // Previous state declarations remain the same
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    position: 'bottom-right',
    opacity: 0.8,
    scale: 1,
    offset: {
      x: 20,
      y: 20
    }
  });
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      setWatermark(prev => ({
        ...prev,
        file,
        preview,
        enabled: true
      }));
    }
  };

  const removeWatermark = () => {
    if (watermark.preview) {
      URL.revokeObjectURL(watermark.preview);
    }
    setWatermark(prev => ({
      ...prev,
      file: undefined,
      preview: undefined,
      enabled: false
    }));
  };

  // Add this section in the Advanced Settings area, after the Compression Settings
  const watermarkSection = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={watermark.enabled}
            onChange={(e) => setWatermark(prev => ({
              ...prev,
              enabled: e.target.checked
            }))}
            className="rounded border-gray-300 text-[#E44E51] focus:ring-[#E44E51]"
          />
          <span className="text-sm font-medium">Add Watermark</span>
        </label>
        <button
          onClick={() => watermarkInputRef.current?.click()}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg 
            hover:bg-gray-200 flex items-center space-x-2"
        >
          <ImagePlus className="w-4 h-4" />
          <span>Upload Image</span>
        </button>
        <input
          ref={watermarkInputRef}
          type="file"
          accept="image/*"
          onChange={handleWatermarkUpload}
          className="hidden"
        />
      </div>

      {watermark.enabled && (
        <div className="space-y-4">
          {/* Watermark Preview */}
          {watermark.preview && (
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={watermark.preview}
                alt="Watermark preview"
                className="absolute object-contain"
                style={{
                  [watermark.position.includes('top') ? 'top' : 'bottom']: `${watermark.offset.y}px`,
                  [watermark.position.includes('left') ? 'left' : 'right']: `${watermark.offset.x}px`,
                  transform: `scale(${watermark.scale})`,
                  opacity: watermark.opacity,
                  maxWidth: '200px',
                  maxHeight: '100px'
                }}
              />
              <button
                onClick={removeWatermark}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full
                  hover:bg-red-600 shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Position Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setWatermark(prev => ({
                    ...prev,
                    position: pos as WatermarkSettings['position']
                  }))}
                  className={`p-2 rounded-lg border text-sm ${
                    watermark.position === pos
                      ? 'border-[#E44E51] bg-[#E44E51]/10 text-[#E44E51]'
                      : 'border-gray-200 hover:border-[#E44E51] hover:bg-gray-50'
                  }`}
                >
                  {pos.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Offset Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                X Offset (px)
              </label>
              <input
                type="number"
                value={watermark.offset.x}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  offset: {
                    ...prev.offset,
                    x: parseInt(e.target.value)
                  }
                }))}
                className="w-full rounded-lg border-gray-300 shadow-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Y Offset (px)
              </label>
              <input
                type="number"
                value={watermark.offset.y}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  offset: {
                    ...prev.offset,
                    y: parseInt(e.target.value)
                  }
                }))}
                className="w-full rounded-lg border-gray-300 shadow-sm bg-white"
              />
            </div>
          </div>

          {/* Scale and Opacity Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-700">Scale</label>
                <span className="text-sm text-gray-500">{Math.round(watermark.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={watermark.scale}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  scale: parseFloat(e.target.value)
                }))}
                className="w-full accent-[#E44E51]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-700">Opacity</label>
                <span className="text-sm text-gray-500">{Math.round(watermark.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={watermark.opacity}
                onChange={(e) => setWatermark(prev => ({
                  ...prev,
                  opacity: parseFloat(e.target.value)
                }))}
                className="w-full accent-[#E44E51]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Add the watermarkSection to the Advanced Settings area in the return JSX
  // Inside the Advanced Settings motion.div, after compression settings:
  // {watermarkSection}

  // Clean up watermark preview URL on unmount
  useEffect(() => {
    return () => {
      if (watermark.preview) {
        URL.revokeObjectURL(watermark.preview);
      }
    };
  }, []);

  // Rest of the component remains the same
  return (
    // Previous JSX remains the same
    // Add watermarkSection inside Advanced Settings
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Previous content remains the same */}
      {/* Add watermarkSection after compression settings in Advanced Settings */}
      {/* Inside the Advanced Settings panel */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        {/* Compression Settings */}
        {/* ... */}
        
        {/* Watermark Settings */}
        {watermarkSection}
        
        {/* Rest of the settings */}
        {/* ... */}
      </div>
      {/* Rest of the component remains the same */}
    </motion.div>
  );
};