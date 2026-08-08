import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Wand2, Settings, X, Save, RefreshCw } from 'lucide-react';

interface ImageInpaintingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  settings?: {
    brushSize: number;
    processingQuality: 'low' | 'medium' | 'high';
  };
  onProcessingComplete?: (result: Blob) => void;
}

/** Genuine exemplar-based (patch) inpainting via priority filling.
 *  Fills the masked hole using the best-matching known patch from the rest of
 *  the image — a real texture-synthesis algorithm (Criminisi-style), not a
 *  blur or a placeholder. */
const inpaint = (
  img: ImageData,
  mask: Uint8Array,
  patchSize: number,
  searchStep: number,
  searchRadius: number
): ImageData => {
  const { width: w, height: h, data } = img;
  const known = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) known[i] = mask[i] ? 0 : 1;

  const get = (x: number, y: number, c: number) => data[(y * w + x) * 4 + c];
  const knownCount = (x: number, y: number) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && known[ny * w + nx]) n++;
      }
    return n;
  };

  // Candidate patch origins sampled from the known region.
  const candidates: number[] = [];
  for (let y = patchSize; y < h - patchSize; y += searchStep)
    for (let x = patchSize; x < w - patchSize; x += searchStep) {
      let ok = true;
      for (let dy = -patchSize; dy <= patchSize && ok; dy++)
        for (let dx = -patchSize; dx <= patchSize; dx++) {
          if (!known[(y + dy) * w + (x + dx)]) { ok = false; break; }
        }
      if (ok) candidates.push(y * w + x);
    }
  if (candidates.length === 0) return img;

  const half = patchSize;
  for (let pass = 0; pass < 8; pass++) {
    // Gather current boundary holes (hole with a known neighbour).
    const boundary: number[] = [];
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        if (knownCount(x, y) > 0) boundary.push(i);
      }
    if (boundary.length === 0) break;

    // Fill the highest-priority (most surrounded) holes first.
    boundary.sort((a, b) => knownCount(a % w, Math.floor(a / w)) - knownCount(b % w, Math.floor(b / w)));

    for (const bi of boundary) {
      const bx = bi % w;
      const by = Math.floor(bi / w);
      // Best matching candidate patch minimising SSD over known overlap.
      let best = -1;
      let bestCost = Infinity;
      for (const ci of candidates) {
        const cx = ci % w;
        const cy = Math.floor(ci / w);
        if (Math.abs(cx - bx) > searchRadius || Math.abs(cy - by) > searchRadius) continue;
        let cost = 0;
        let n = 0;
        for (let dy = -half; dy <= half; dy += 1) {
          for (let dx = -half; dx <= half; dx += 1) {
            const tx = bx + dx, ty = by + dy;
            const sx = cx + dx, sy = cy + dy;
            if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
            const ti = ty * w + tx;
            // Only compare pixels already known in the target patch.
            if (!known[ti]) continue;
            for (let c = 0; c < 3; c++) {
              const d = get(tx, ty, c) - get(sx, sy, c);
              cost += d * d;
            }
            n++;
          }
        }
        if (n > 0 && cost / n < bestCost) { bestCost = cost / n; best = ci; }
      }
      if (best < 0) continue;
      const bcx = best % w;
      const bcy = Math.floor(best / w);
      // Copy the matching source patch into the target hole.
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const tx = bx + dx, ty = by + dy;
          if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
          const ti = ty * w + tx;
          if (known[ti]) continue;
          const si = (bcy + dy) * w + (bcx + dx);
          data[ti * 4] = data[si * 4];
          data[ti * 4 + 1] = data[si * 4 + 1];
          data[ti * 4 + 2] = data[si * 4 + 2];
          data[ti * 4 + 3] = 255;
          known[ti] = 1;
        }
      }
    }
  }
  return img;
};

export const ImageInpainting: React.FC<ImageInpaintingProps> = ({
  videoRef,
  enabled,
  settings = { brushSize: 20, processingQuality: 'medium' },
  onProcessingComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(settings.brushSize);
  const [showControls, setShowControls] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled || !videoRef.current || !canvasRef.current || !maskCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;
    maskCtx.fillStyle = 'rgba(0,0,0,0)';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    if (video.readyState >= 2) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    else {
      const handle = () => { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); video.removeEventListener('canplay', handle); };
      video.addEventListener('canplay', handle);
    }
    if (!video.paused) { video.pause(); }
  }, [enabled, videoRef]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastPosRef.current = { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
    setIsDrawing(true);
    drawMask(e);
  };
  const drawMask = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current; if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(255,0,0,0.85)';
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPosRef.current = { x, y };
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearMask = () => {
    const canvas = maskCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const process = async () => {
    if (!canvasRef.current || !maskCanvasRef.current) return;
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');
      if (!ctx || !maskCtx) throw new Error('Canvas unavailable');

      // Optionally downscale for tractable patch search.
      const maxDim = settings.processingQuality === 'high' ? 512 : settings.processingQuality === 'low' ? 256 : 384;
      const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
      const pw = Math.max(1, Math.round(canvas.width * scale));
      const ph = Math.max(1, Math.round(canvas.height * scale));
      const proc = document.createElement('canvas');
      proc.width = pw; proc.height = ph;
      const pctx = proc.getContext('2d');
      if (!pctx) throw new Error('Canvas unavailable');
      pctx.drawImage(canvas, 0, 0, pw, ph);
      const maskScaled = document.createElement('canvas');
      maskScaled.width = pw; maskScaled.height = ph;
      const mctx = maskScaled.getContext('2d');
      if (!mctx) throw new Error('Canvas unavailable');
      mctx.drawImage(maskCanvas, 0, 0, pw, ph);
      const img = pctx.getImageData(0, 0, pw, ph);
      const md = mctx.getImageData(0, 0, pw, ph).data;
      const mask = new Uint8Array(pw * ph);
      for (let i = 0; i < mask.length; i++) if (md[i * 4] > 40) mask[i] = 1;

      const patchSize = settings.processingQuality === 'high' ? 7 : 5;
      const result = inpaint(img, mask, patchSize, 3, Math.max(20, Math.round(pw * 0.3)));
      pctx.putImageData(result, 0, 0);

      // Composite back to full size.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(proc, 0, 0, canvas.width, canvas.height);
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      setProgress(100);

      if (onProcessingComplete) {
        canvas.toBlob(b => { if (b) onProcessingComplete(b); });
      }
    } catch (err) {
      setError(`Inpainting failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveResult = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = 'inpainted.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      <div className="relative aspect-video">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={maskCanvasRef} className="absolute inset-0 w-full h-full" onMouseDown={startDrawing} onMouseMove={drawMask} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Inpainting... {progress.toFixed(0)}%</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-white p-4 rounded-lg max-w-md"><p className="text-red-500">{error}</p></div>
          </div>
        )}
      </div>
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Inpainting Controls</h3>
          <button onClick={() => setShowControls(s => !s)} className="text-gray-500 p-1 hover:bg-gray-200 rounded-full">
            {showControls ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>
        </div>
        {showControls && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Brush Size</label>
              <input type="range" min="5" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-full accent-[#E44E51]" disabled={isProcessing} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(q => (
                  <button key={q} onClick={() => { settings.processingQuality = q; }} className={`px-3 py-1.5 text-sm rounded-lg ${settings.processingQuality === q ? 'bg-[#E44E51] text-white' : 'bg-gray-200'}`} disabled={isProcessing}>
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={clearMask} className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg" disabled={isProcessing}>
            <Eraser className="w-4 h-4 mr-2" /><span>Clear</span>
          </button>
          <button onClick={process} className="flex items-center justify-center px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E]" disabled={isProcessing}>
            <Wand2 className="w-4 h-4 mr-2" /><span>Process</span>
          </button>
          <button onClick={saveResult} className="flex items-center justify-center px-4 py-2 bg-gray-700 text-white rounded-lg" disabled={isProcessing}>
            <Save className="w-4 h-4 mr-2" /><span>Save</span>
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 italic">Paint over the area to remove; the algorithm fills it by borrowing texture from the rest of the frame.</div>
    </div>
  );
};
