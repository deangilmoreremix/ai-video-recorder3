import type { ClipOverlay } from '../../../../store/brollStore';

/** Image overlays are `IMAGE_BASE_WIDTH` of the frame width at scale 1. */
export const IMAGE_BASE_WIDTH = 0.3;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Normalised in/out range of an overlay, tolerant of reversed inputs. */
export const getOverlayRange = (overlay: ClipOverlay): { start: number; end: number } => ({
  start: Math.min(overlay.startTime, overlay.endTime),
  end: Math.max(overlay.startTime, overlay.endTime)
});

/**
 * Effective alpha for an overlay at `time` (seconds into the clip), including
 * its fade in / fade out ramps. Returns 0 when the overlay is not on screen.
 */
export const getOverlayAlpha = (overlay: ClipOverlay, time: number): number => {
  if (!overlay.visible) return 0;
  const { start, end } = getOverlayRange(overlay);
  if (time < start || time > end) return 0;

  const span = end - start;
  const fade = Math.max(0, Math.min(overlay.fadeDuration, span / 2));
  let alpha = clamp01(overlay.opacity);

  if (fade > 0) {
    if (time - start < fade) alpha *= (time - start) / fade;
    else if (end - time < fade) alpha *= (end - time) / fade;
  }

  return clamp01(alpha);
};

export const isOverlayActive = (overlay: ClipOverlay, time: number): boolean =>
  getOverlayAlpha(overlay, time) > 0;

/** Draw a single overlay, already alpha-resolved, onto a 2D context. */
export const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  overlay: ClipOverlay,
  alpha: number,
  width: number,
  height: number,
  image: HTMLImageElement | null
): void => {
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(overlay.position.x * width, overlay.position.y * height);
  ctx.rotate((overlay.rotation * Math.PI) / 180);

  if (overlay.type === 'image') {
    if (image && image.complete && image.naturalWidth > 0) {
      const drawWidth = width * IMAGE_BASE_WIDTH * Math.max(0.05, overlay.scale);
      const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
      if (overlay.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = drawWidth * 0.04;
        ctx.shadowOffsetY = drawWidth * 0.015;
      }
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }
    ctx.restore();
    return;
  }

  const fontSize = Math.max(4, (overlay.fontSize / 100) * height * Math.max(0.05, overlay.scale));
  ctx.font = `${overlay.fontWeight} ${fontSize}px "${overlay.fontFamily}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = overlay.text.split('\n');
  const lineHeight = fontSize * 1.2;
  const blockHeight = lines.length * lineHeight;
  const blockWidth = lines.reduce((widest, line) => Math.max(widest, ctx.measureText(line).width), 0);

  if (overlay.backgroundColor) {
    const padX = fontSize * 0.45;
    const padY = fontSize * 0.28;
    ctx.fillStyle = overlay.backgroundColor;
    ctx.fillRect(
      -blockWidth / 2 - padX,
      -blockHeight / 2 - padY,
      blockWidth + padX * 2,
      blockHeight + padY * 2
    );
  }

  if (overlay.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = fontSize * 0.18;
    ctx.shadowOffsetY = fontSize * 0.06;
  }

  ctx.fillStyle = overlay.color;
  lines.forEach((line, index) => {
    ctx.fillText(line, 0, -blockHeight / 2 + lineHeight * (index + 0.5));
  });

  ctx.restore();
};

/**
 * Composite every overlay that is live at `time` over the current canvas
 * contents. Shared by the live preview and reusable for a baked export.
 */
export const drawOverlays = (
  ctx: CanvasRenderingContext2D,
  overlays: ClipOverlay[],
  time: number,
  width: number,
  height: number,
  images: Map<string, HTMLImageElement>
): void => {
  for (const overlay of overlays) {
    const alpha = getOverlayAlpha(overlay, time);
    if (alpha <= 0) continue;
    const image = overlay.imageUrl ? images.get(overlay.imageUrl) ?? null : null;
    drawOverlay(ctx, overlay, alpha, width, height, image);
  }
};
