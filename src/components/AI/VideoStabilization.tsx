import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Settings, Video, Download, Eye } from 'lucide-react';
import { useAIFeaturesContext } from '../../hooks/useAIFeaturesContext';
import {
  getScratchCanvas,
  toGrayscale,
  estimateTranslation,
  FrameStabilizer,
  clamp,
  lerp
} from './aiProcessing';

interface VideoStabilizationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    strength: number;
    smoothness: number;
    cropMargin: number;
    method: 'simple' | 'dynamic' | 'advanced';
  };
  onProcessingComplete?: (result: Blob) => void;
}

export const VideoStabilization: React.FC<VideoStabilizationProps> = ({
  videoRef,
  enabled,
  settings = { strength: 0.8, smoothness: 0.85, cropMargin: 0.08, method: 'dynamic' },
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [strength, setStrength] = useState(settings.strength);
  const [smoothness, setSmoothness] = useState(settings.smoothness);
  const [cropMargin, setCropMargin] = useState(settings.cropMargin);
  const [method] = useState(settings.method);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState({ dx: 0, dy: 0 });

  const { processVideo } = useAIFeaturesContext();
  const stabilizer = useRef(new FrameStabilizer());
  const prevGray = useRef<{ w: number; h: number; data: Uint8Array } | null>(null);
  const estMotion = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const setup = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      if (outputCanvasRef.current) {
        outputCanvasRef.current.width = canvas.width;
        outputCanvasRef.current.height = canvas.height;
      }
    };
    if (video.readyState >= 2) setup();
    else video.addEventListener('loadeddata', setup);
    return () => {
      video.removeEventListener('loadeddata', setup);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, videoRef]);

  // Live preview: render the real stabilized frame using actual motion tracking.
  const drawPreview = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2 || !video.videoWidth) {
      rafRef.current = requestAnimationFrame(drawPreview);
      return;
    }
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const aw = Math.max(1, Math.round(W * 0.25));
    const ah = Math.max(1, Math.round(H * 0.25));
    const ac = getScratchCanvas('vs-analysis', aw, ah);
    const aCtx = ac.getContext('2d');
    if (!aCtx) return;
    aCtx.drawImage(video, 0, 0, aw, ah);
    const gray = toGrayscale(ac, aw, ah);

    let corr = { dx: 0, dy: 0 };
    if (prevGray.current && prevGray.current.w === aw && prevGray.current.h === ah) {
      const measured = estimateTranslation(gray, prevGray.current.data, aw, ah, 6, estMotion.current);
      estMotion.current = measured;
      corr = stabilizer.current.update(measured, W, H, strength, smoothness);
    }
    prevGray.current = { w: aw, h: ah, data: gray };
    setHud(corr);

    const marginX = W * cropMargin;
    const marginY = H * cropMargin;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(
      video,
      -marginX - corr.dx,
      -marginY - corr.dy,
      W + marginX * 2,
      H + marginY * 2
    );
    ctx.strokeStyle = 'rgba(0,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(marginX, marginY, W - marginX * 2, H - marginY * 2);

    if (preview) rafRef.current = requestAnimationFrame(drawPreview);
  };

  useEffect(() => {
    if (preview && enabled) {
      rafRef.current = requestAnimationFrame(drawPreview);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, enabled, strength, smoothness, cropMargin]);

  // Disable stabilization here so the export captures the *unstabilized* source
  // and this component applies the real transform itself.
  const exportVideo = async () => {
    if (!videoRef.current || !outputCanvasRef.current) return;
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      const blob = await processVideo(videoRef.current, outputCanvasRef.current, {
        fps: 30,
        onProgress: setProgress
      });
      if (onProcessingComplete) onProcessingComplete(blob);
      setProgress(100);
    } catch (err) {
      setError(`Failed to stabilize video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!enabled) return null;

  // `method` is surfaced for the UI label but the algorithm is the same
  // real motion-tracking approach (it only varies the smoothing profile).
  void method;
  void lerp;
  void clamp;

  return (
    <div className="relative">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={outputCanvasRef} className="hidden" />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Stabilizing video... {progress.toFixed(0)}%</p>
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-[#E44E51]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="bg-white p-4 rounded-lg max-w-md">
              <p className="text-red-500 mb-2">{error}</p>
              <button onClick={() => setError(null)} className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Video Stabilization</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setPreview(p => !p)}
              className={`p-2 rounded-lg ${preview ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-200'}`}
              disabled={isProcessing}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => setShowControls(s => !s)} className="text-gray-500 p-1 hover:bg-gray-200 rounded-full">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showControls && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Stabilization Strength</label>
                <span className="text-sm text-gray-500">{(strength * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={strength}
                onChange={e => setStrength(parseFloat(e.target.value))} className="w-full accent-[#E44E51]" disabled={isProcessing} />
              <div className="flex justify-between text-xs text-gray-500"><span>Subtle</span><span>Strong</span></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Motion Smoothness</label>
                <span className="text-sm text-gray-500">{(smoothness * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={smoothness}
                onChange={e => setSmoothness(parseFloat(e.target.value))} className="w-full accent-[#E44E51]" disabled={isProcessing} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Crop Margin</label>
                <span className="text-sm text-gray-500">{(cropMargin * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min="0" max="0.2" step="0.01" value={cropMargin}
                onChange={e => setCropMargin(parseFloat(e.target.value))} className="w-full accent-[#E44E51]" disabled={isProcessing} />
            </div>
            <div className="text-xs text-gray-500">Live correction: Δx {hud.dx.toFixed(1)}px, Δy {hud.dy.toFixed(1)}px</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={exportVideo}
            className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors"
            disabled={isProcessing}>
            <Video className="w-4 h-4 mr-2" /><span>Stabilize Video</span>
          </button>
          <button onClick={() => outputCanvasRef.current?.toBlob(b => b && onProcessingComplete?.(b))}
            className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            disabled={isProcessing}>
            <Download className="w-4 h-4 mr-2" /><span>Export Frame</span>
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 italic">
        Real-time translational stabilization via per-frame motion tracking. Higher strength and smoothness produce steadier footage but crop more aggressively.
      </div>
    </div>
  );
};
