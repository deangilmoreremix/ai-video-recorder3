/**
 * Canvas renderer for intro / outro "title cards".
 *
 * The same maths powers the live preview (drawn every animation frame) and the
 * baked export (`recordTitleCard` captures the very canvas that is drawn here
 * with a `MediaRecorder`), so what the user previews is exactly what is added
 * to the B-Roll timeline.
 */

export interface TitleCardText {
  title: string;
  subtitle: string;
  /** Tagline (intro) or end message (outro). */
  body: string;
  callToAction?: string;
}

export interface TitleCardStyle {
  fontFamily: string;
  /** Title size in px, authored against a 720p frame and scaled from there. */
  titleSize: number;
  alignment: string;
  animation: string;
  /** Total length of the card, in seconds. */
  duration: number;
  textEffects: {
    glow: boolean;
    shadow: boolean;
    outline: boolean;
    gradient: boolean;
  };
  transitions: {
    duration: number;
  };
}

export interface TitleCardAssets {
  background: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

export interface TitleCardConfig {
  text: TitleCardText;
  style: TitleCardStyle;
  /** Optional badge drawn in a corner (outro end cards). */
  badge?: {
    label: string;
    position: string;
    delay: number;
    duration: number;
    opacity: number;
    scale: number;
    shadow: boolean;
  } | null;
}

export const EMPTY_ASSETS: TitleCardAssets = { background: null, logo: null };

/** Size the title/subtitle/body were authored against. */
const REFERENCE_HEIGHT = 720;
const ACCENT = '#E44E51';
const STAGGER = 0.2;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Overshoot easing used by the "bounce" animation. */
const easeBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const getTitleCardDuration = (style: TitleCardStyle): number => {
  const duration = Number.isFinite(style.duration) ? style.duration : 5;
  return Math.min(60, Math.max(1, duration));
};

/** Load an image for the renderer; resolves to `null` when it cannot be used. */
export const loadCardImage = (url: string | null): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

const drawCover = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) => {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;
  const scale = Math.max(width / iw, height / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
};

interface ElementAnimation {
  alpha: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
}

const HIDDEN: ElementAnimation = { alpha: 0, offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };

/**
 * Animation state of one element at `time`, honouring the card's animation
 * preset, the per element stagger and the fade out at the end of the card.
 */
const getElementAnimation = (
  style: TitleCardStyle,
  index: number,
  time: number,
  width: number,
  height: number
): ElementAnimation => {
  const total = getTitleCardDuration(style);
  const inDuration = Math.max(
    0.15,
    Math.min(style.transitions.duration || 0.8, total / 2)
  );
  const delay = Math.min(index * STAGGER, Math.max(0, total - inDuration));
  const local = time - delay;
  if (local < 0) return HIDDEN;

  const raw = clamp01(local / inDuration);
  const eased = style.animation === 'bounce' ? easeBack(raw) : easeOut(raw);

  // Everything fades out over the last 0.5s so the card can be cut/crossfaded.
  const outDuration = Math.min(0.5, total / 4);
  const fadeOut = time > total - outDuration ? clamp01((total - time) / outDuration) : 1;

  const animation: ElementAnimation = {
    alpha: clamp01(raw) * fadeOut,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotation: 0
  };

  switch (style.animation) {
    case 'slide':
      animation.offsetX = (1 - eased) * width * 0.12;
      break;
    case 'zoom':
      animation.scale = 0.8 + eased * 0.2;
      break;
    case 'bounce':
      animation.offsetY = (1 - eased) * height * 0.08;
      animation.scale = 0.92 + Math.min(1.08, eased) * 0.08;
      break;
    case 'rotate':
      animation.rotation = (1 - eased) * -0.18;
      animation.scale = 0.9 + eased * 0.1;
      break;
    default:
      animation.offsetY = (1 - eased) * height * 0.04;
      break;
  }

  return animation;
};

const getAnchorX = (alignment: string, width: number): number => {
  if (alignment === 'left') return width * 0.08;
  if (alignment === 'right') return width * 0.92;
  return width / 2;
};

const getTextAlign = (alignment: string): CanvasTextAlign => {
  if (alignment === 'left') return 'left';
  if (alignment === 'right') return 'right';
  return 'center';
};

interface LineSpec {
  text: string;
  size: number;
  weight: string;
  color: string;
  index: number;
}

const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: LineSpec,
  config: TitleCardConfig,
  time: number,
  width: number,
  height: number,
  y: number
) => {
  const { style } = config;
  const animation = getElementAnimation(style, line.index, time, width, height);
  if (animation.alpha <= 0) return;

  const x = getAnchorX(style.alignment, width);

  ctx.save();
  ctx.globalAlpha = animation.alpha;
  ctx.translate(x + animation.offsetX, y + animation.offsetY);
  ctx.rotate(animation.rotation);
  ctx.scale(animation.scale, animation.scale);
  ctx.textAlign = getTextAlign(style.alignment);
  ctx.textBaseline = 'middle';
  ctx.font = `${line.weight} ${line.size}px "${style.fontFamily}", sans-serif`;

  if (style.textEffects.glow) {
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = line.size * 0.5;
  } else if (style.textEffects.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = line.size * 0.2;
    ctx.shadowOffsetY = line.size * 0.06;
  }

  if (style.textEffects.gradient) {
    const half = Math.max(ctx.measureText(line.text).width, line.size) / 2;
    const gradient = ctx.createLinearGradient(-half, -line.size / 2, half, line.size / 2);
    gradient.addColorStop(0, line.color);
    gradient.addColorStop(1, ACCENT);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = line.color;
  }

  ctx.fillText(line.text, 0, 0);

  if (style.textEffects.outline) {
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, line.size * 0.02);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.strokeText(line.text, 0, 0);
  }

  ctx.restore();
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const getBadgeOrigin = (
  position: string,
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number
): { x: number; y: number } => {
  const pad = Math.round(width * 0.03);
  const top = position.includes('top');
  const left = position.includes('left');
  const centred = !position.includes('top') && !position.includes('bottom');
  return {
    x: left ? pad : width - boxWidth - pad,
    y: centred ? (height - boxHeight) / 2 : top ? pad : height - boxHeight - pad
  };
};

/**
 * Draw the whole card for `time` seconds into its own timeline.
 * `width` / `height` are the canvas pixel dimensions.
 */
export const drawTitleCard = (
  ctx: CanvasRenderingContext2D,
  config: TitleCardConfig,
  assets: TitleCardAssets,
  time: number,
  width: number,
  height: number
): void => {
  const { text, style } = config;
  const scale = height / REFERENCE_HEIGHT;
  const titleSize = Math.max(12, (style.titleSize || 48) * scale);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  // Background: user image (cover) or the default dark gradient.
  if (assets.background) {
    drawCover(ctx, assets.background, width, height);
    ctx.fillStyle = 'rgba(15,23,42,0.45)';
    ctx.fillRect(0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, '#1F2937');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Logo sits above the copy and shares the first element's animation.
  let cursor = height * 0.5 - titleSize * 0.9;
  if (assets.logo) {
    const logoAnimation = getElementAnimation(style, 0, time, width, height);
    const logoHeight = height * 0.14;
    const ratio =
      (assets.logo.naturalWidth || 1) / (assets.logo.naturalHeight || 1);
    const logoWidth = logoHeight * ratio;
    const anchorX = getAnchorX(style.alignment, width);
    const align = getTextAlign(style.alignment);
    const logoX =
      align === 'left' ? anchorX : align === 'right' ? anchorX - logoWidth : anchorX - logoWidth / 2;
    if (logoAnimation.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = logoAnimation.alpha;
      ctx.drawImage(
        assets.logo,
        logoX + logoAnimation.offsetX,
        cursor - logoHeight - height * 0.04 + logoAnimation.offsetY,
        logoWidth,
        logoHeight
      );
      ctx.restore();
    }
  }

  const lines: LineSpec[] = [];
  if (text.title) {
    lines.push({ text: text.title, size: titleSize, weight: '700', color: '#FFFFFF', index: 0 });
  }
  if (text.subtitle) {
    lines.push({
      text: text.subtitle,
      size: titleSize * 0.52,
      weight: '500',
      color: '#E5E7EB',
      index: 1
    });
  }
  if (text.body) {
    lines.push({
      text: text.body,
      size: titleSize * 0.38,
      weight: '400',
      color: '#CBD5F5',
      index: 2
    });
  }

  const gap = titleSize * 0.35;
  const block = lines.reduce((sum, line) => sum + line.size, 0) + gap * Math.max(0, lines.length - 1);
  cursor = height / 2 - block / 2;

  lines.forEach((line) => {
    drawLine(ctx, line, config, time, width, height, cursor + line.size / 2);
    cursor += line.size + gap;
  });

  // Call to action pill.
  if (text.callToAction) {
    const ctaIndex = lines.length;
    const animation = getElementAnimation(style, ctaIndex, time, width, height);
    if (animation.alpha > 0) {
      const fontSize = titleSize * 0.34;
      ctx.save();
      ctx.font = `600 ${fontSize}px "${style.fontFamily}", sans-serif`;
      const textWidth = ctx.measureText(text.callToAction).width;
      const boxWidth = textWidth + fontSize * 2;
      const boxHeight = fontSize * 2.2;
      const anchorX = getAnchorX(style.alignment, width);
      const align = getTextAlign(style.alignment);
      const boxX =
        align === 'left' ? anchorX : align === 'right' ? anchorX - boxWidth : anchorX - boxWidth / 2;
      const boxY = cursor + gap;

      ctx.globalAlpha = animation.alpha;
      ctx.translate(animation.offsetX, animation.offsetY);
      ctx.fillStyle = ACCENT;
      roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, boxHeight / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.callToAction, boxX + boxWidth / 2, boxY + boxHeight / 2);
      ctx.restore();
    }
  }

  // Outro end card badge.
  const badge = config.badge;
  if (badge && badge.label) {
    const visible = time >= badge.delay && time <= badge.delay + badge.duration;
    if (visible) {
      const appear = clamp01((time - badge.delay) / 0.4);
      const fontSize = titleSize * 0.3 * (badge.scale || 1);
      ctx.save();
      ctx.font = `600 ${fontSize}px "${style.fontFamily}", sans-serif`;
      const boxWidth = ctx.measureText(badge.label).width + fontSize * 1.6;
      const boxHeight = fontSize * 2.4;
      const origin = getBadgeOrigin(badge.position, width, height, boxWidth, boxHeight);
      ctx.globalAlpha = clamp01(badge.opacity) * appear;
      if (badge.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = fontSize * 0.6;
      }
      ctx.fillStyle = 'rgba(17,24,39,0.85)';
      roundedRect(ctx, origin.x, origin.y, boxWidth, boxHeight, fontSize * 0.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = Math.max(1, fontSize * 0.08);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge.label, origin.x + boxWidth / 2, origin.y + boxHeight / 2);
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1;
};

const RECORDER_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4'
];

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return RECORDER_MIME_TYPES.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
};

export interface RecordTitleCardOptions {
  width?: number;
  height?: number;
  fps?: number;
  onProgress?: (progress: number) => void;
}

export interface RecordedTitleCard {
  blob: Blob;
  duration: number;
  width: number;
  height: number;
  /** Poster frame taken at the middle of the card. */
  thumbnail: string;
}

/**
 * Render the card to an offscreen canvas in real time and capture it with a
 * `MediaRecorder`, producing a real video file (webm where supported).
 */
export const recordTitleCard = async (
  config: TitleCardConfig,
  assets: TitleCardAssets,
  options: RecordTitleCardOptions = {}
): Promise<RecordedTitleCard> => {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot record canvas video (MediaRecorder is unavailable).');
  }

  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const fps = options.fps ?? 30;
  const duration = getTitleCardDuration(config.style);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a rendering context for the card.');

  // Paint the first frame before the recorder starts so the file never begins
  // with a blank frame.
  drawTitleCard(ctx, config, assets, 0, width, height);

  const stream = canvas.captureStream(fps);
  const mimeType = pickMimeType();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (blob.size > 0) resolve(blob);
      else reject(new Error('The card render produced an empty file.'));
    };
    recorder.onerror = () => reject(new Error('Recording the card failed.'));
  });

  recorder.start(200);

  let thumbnail = '';
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const time = Math.min(duration, elapsed);
      drawTitleCard(ctx, config, assets, time, width, height);
      options.onProgress?.(Math.round((time / duration) * 100));
      if (!thumbnail && time >= duration / 2) {
        try {
          thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        } catch {
          thumbnail = '';
        }
      }
      if (elapsed >= duration) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  const blob = await stopped;
  options.onProgress?.(100);

  return { blob, duration, width, height, thumbnail };
};
