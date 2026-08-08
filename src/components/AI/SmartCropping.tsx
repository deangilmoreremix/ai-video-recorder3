import React, { useState, useRef, useEffect } from 'react';
import { Crop, Save, RefreshCw, Frame as AspectIcon, Fullscreen } from 'lucide-react';
import { processVideoToBlob, getScratchCanvas, toGrayscale, clamp } from './aiProcessing';

interface SmartCroppingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    aspectRatio: string;
    followSubject: boolean;
    applyRuleOfThirds: boolean;
    smoothTransitions: boolean;
  };
  onProcessingComplete?: (result: Blob) => void;
}

export const SmartCropping: React.FC<SmartCroppingProps> = ({
  videoRef,
  enabled,
  settings = { aspectRatio: '16:9', followSubject: true, applyRuleOfThirds: true, smoothTransitions: true },
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [followSubject, setFollowSubject] = useState(settings.followSubject);
  const [applyRuleOfThirds, setApplyRuleOfThirds] = useState(settings.applyRuleOfThirds);
  const [smooth] = useState(settings.smoothTransitions);
  const [showControls, setShowControls] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const prevGray = useRef<{ w: number; h: number; data: Uint8Array } | null>(null);
  const rafRef = useRef<number>(0);
  const cropRef = useRef(crop);
  cropRef.current = crop;

  interface CropRect { x: number; y: number; width: number; height: number; }

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

  const parseRatio = (r: string): number => {
    if (r.includes(':')) {
      const [w, h] = r.split(':').map(Number);
      if (w && h) return w / h;
    }
    return 16 / 9;
  };

  // Initialize crop to the chosen aspect ratio centred in the frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (crop.width !== 100 && crop.height !== 100)) return;
    const ratio = parseRatio(aspectRatio);
    const videoRatio = canvas.width / canvas.height;
    const w = ratio > videoRatio ? canvas.width : canvas.height * ratio;
    const h = ratio > videoRatio ? canvas.width / ratio : canvas.height;
    setCrop({ x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, width: w, height: h });
  }, [aspectRatio, crop.width, crop.height]);

  const drawOverlay = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
    ctx.strokeStyle = '#E44E51';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    if (applyRuleOfThirds) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(crop.x + (crop.width * i) / 3, crop.y); ctx.lineTo(crop.x + (crop.width * i) / 3, crop.y + crop.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(crop.x, crop.y + (crop.height * i) / 3); ctx.lineTo(crop.x + crop.width, crop.y + (crop.height * i) / 3); ctx.stroke();
      }
    }
    const c = 10;
    ctx.fillStyle = '#E44E51';
    ctx.fillRect(crop.x - c / 2, crop.y - c / 2, c, c);
    ctx.fillRect(crop.x + crop.width - c / 2, crop.y - c / 2, c, c);
    ctx.fillRect(crop.x - c / 2, crop.y + crop.height - c / 2, c, c);
    ctx.fillRect(crop.x + crop.width - c / 2, crop.y + crop.height - c / 2, c, c);
  };

  // Real subject tracking: follow the motion-saliency centroid of the frame.
  useEffect(() => {
    if (!followSubject || !enabled || !videoRef.current || !canvasRef.current) return;
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth) {
        const aw = Math.max(1, Math.round(video.videoWidth * 0.25));
        const ah = Math.max(1, Math.round(video.videoHeight * 0.25));
        const ac = getScratchCanvas('sc-analysis', aw, ah);
        const aCtx = ac.getContext('2d');
        if (aCtx) {
          aCtx.drawImage(video, 0, 0, aw, ah);
          const gray = toGrayscale(ac, aw, ah);
          if (prevGray.current && prevGray.current.w === aw) {
            let bx = 0, by = 0, bn = 0;
            for (let y = 0; y < ah; y += 3) {
              for (let x = 0; x < aw; x += 3) {
                const idx = y * aw + x;
                if (Math.abs(gray[idx] - prevGray.current.data[idx]) > 22) {
                  bx += x; by += y; bn++;
                }
              }
            }
            if (bn > 3) {
              const cx = bx / bn; const cy = by / bn;
              const ratio = parseRatio(aspectRatio);
              let w = cropRef.current.width; let h = w / ratio;
              if (h < canvas.height * 0.3) { h = canvas.height * 0.3; w = h * ratio; }
              let nx = (cx / aw) * canvas.width - w / 2;
              let ny = (cy / ah) * canvas.height - h / 2;
              nx = clamp(nx, 0, canvas.width - w);
              ny = clamp(ny, 0, canvas.height - h);
              setCrop(prev => {
                if (smooth) {
                  return { x: prev.x + (nx - prev.x) * 0.12, y: prev.y + (ny - prev.y) * 0.12, width: w, height: h };
                }
                return { x: nx, y: ny, width: w, height: h };
              });
            }
          }
          prevGray.current = { w: aw, h: ah, data: gray };
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followSubject, enabled, aspectRatio, smooth]);

  // Redraw overlay whenever crop/settings change.
  useEffect(() => {
    const id = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop, applyRuleOfThirds, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const c = 14;
    const corners = [
      { x: crop.x, y: crop.y }, { x: crop.x + crop.width, y: crop.y },
      { x: crop.x, y: crop.y + crop.height }, { x: crop.x + crop.width, y: crop.y + crop.height }
    ];
    for (const corner of corners) {
      if (x >= corner.x - c && x <= corner.x + c && y >= corner.y - c && y <= corner.y + c) {
        setIsResizing(true); setDragStart({ x, y }); return;
      }
    }
    if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
      setIsDragging(true); setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas || (!isDragging && !isResizing)) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (isDragging) {
      const nx = clamp(crop.x + (x - dragStart.x), 0, canvas.width - crop.width);
      const ny = clamp(crop.y + (y - dragStart.y), 0, canvas.height - crop.height);
      setCrop(prev => ({ ...prev, x: nx, y: ny }));
      setDragStart({ x, y });
    } else if (isResizing) {
      const w = clamp(crop.width + (x - dragStart.x), 30, canvas.width);
      const h = aspectLocked ? w / parseRatio(aspectRatio) : clamp(crop.height + (y - dragStart.y), 30, canvas.height);
      setCrop(prev => ({ x: prev.x, y: prev.y, width: w, height: h }));
      setDragStart({ x, y });
    }
  };

  const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

  // Genuine export: re-encode the clip with the crop region applied every frame.
  const exportCropped = async () => {
    const video = videoRef.current;
    const out = outputCanvasRef.current;
    if (!video || !out) return;
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      const c = cropRef.current;
      const render = (v: HTMLVideoElement, cv: HTMLCanvasElement) => {
        cv.width = Math.round(c.width);
        cv.height = Math.round(c.height);
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(v, c.x, c.y, c.width, c.height, 0, 0, cv.width, cv.height);
      };
      const blob = await processVideoToBlob(video, render, out, { fps: 30, onProgress: setProgress });
      if (onProcessingComplete) onProcessingComplete(blob);
      setProgress(100);
    } catch (err) {
      setError(`Failed to crop video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFrame = () => {
    const video = videoRef.current;
    const out = outputCanvasRef.current;
    if (!video || !out) return;
    out.width = Math.round(crop.width);
    out.height = Math.round(crop.height);
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);
    out.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = 'cropped-frame.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      <div className="relative aspect-video">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-move z-10"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
        <canvas ref={outputCanvasRef} className="hidden" />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="text-white text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Cropping video... {progress.toFixed(0)}%</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="bg-white p-4 rounded-lg max-w-md"><p className="text-red-500">{error}</p></div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Smart Cropping</h3>
          <button onClick={() => setShowControls(s => !s)} className="text-gray-500 p-1 hover:bg-gray-200 rounded-full">
            {showControls ? <Crop className="w-4 h-4" /> : <AspectIcon className="w-4 h-4" />}
          </button>
        </div>
        {showControls && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm text-gray-700 mb-1">Aspect Ratio</label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full rounded-lg border-gray-300" disabled={isProcessing}>
                  <option value="16:9">16:9</option><option value="4:3">4:3</option>
                  <option value="1:1">1:1</option><option value="9:16">9:16</option><option value="21:9">21:9</option>
                </select>
              </div>
              <button onClick={() => setAspectLocked(l => !l)} className="p-2 rounded-lg bg-gray-200 self-end" title="Lock aspect ratio">
                {aspectLocked ? <Crop className="w-5 h-5" /> : <AspectIcon className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2"><Fullscreen className="w-4 h-4 text-gray-600" /><span className="text-sm font-medium">Follow Subject</span></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={followSubject} onChange={e => setFollowSubject(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-[#E44E51] rounded-full" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-2"><AspectIcon className="w-4 h-4 text-gray-600" /><span className="text-sm font-medium">Rule of Thirds</span></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={applyRuleOfThirds} onChange={e => setApplyRuleOfThirds(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-[#E44E51] rounded-full" />
              </label>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={exportCropped} className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] transition-colors" disabled={isProcessing}>
            <Crop className="w-4 h-4 mr-2" /><span>Apply Crop</span>
          </button>
          <button onClick={saveFrame} className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors" disabled={isProcessing}>
            <Save className="w-4 h-4 mr-2" /><span>Save Frame</span>
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 italic">Drag the box to crop; subject-following tracks real frame motion. Export re-encodes the full clip at the chosen crop.</div>
    </div>
  );
};
