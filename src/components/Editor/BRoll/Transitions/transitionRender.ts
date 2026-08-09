import type { TransitionType } from '../../../../store/brollStore';

export interface TransitionSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Ease in/out so previews look like a real editor transition, not a linear ramp. */
export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Draw a source into a rect using a cover fit (no distortion, centre crop). */
const drawCovered = (
  ctx: CanvasRenderingContext2D,
  source: TransitionSource | null,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  if (!source || !source.width || !source.height) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);
    return;
  }
  const scale = Math.max(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  ctx.drawImage(
    source.image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
};

/**
 * Render one frame of a transition between two sources.
 *
 * `progress` is 0 (fully showing `from`) to 1 (fully showing `to`). The same
 * maths can be reused to bake the transition during an export pass.
 */
export const drawTransitionFrame = (
  ctx: CanvasRenderingContext2D,
  from: TransitionSource | null,
  to: TransitionSource | null,
  type: TransitionType,
  progress: number,
  width: number,
  height: number
): void => {
  const p = clamp01(progress);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  switch (type) {
    case 'fade': {
      // Fade through black.
      if (p < 0.5) {
        ctx.globalAlpha = 1 - p * 2;
        drawCovered(ctx, from, 0, 0, width, height);
      } else {
        ctx.globalAlpha = (p - 0.5) * 2;
        drawCovered(ctx, to, 0, 0, width, height);
      }
      break;
    }

    case 'dissolve': {
      drawCovered(ctx, from, 0, 0, width, height);
      ctx.globalAlpha = p;
      drawCovered(ctx, to, 0, 0, width, height);
      break;
    }

    case 'slide-left': {
      drawCovered(ctx, from, -p * width, 0, width, height);
      drawCovered(ctx, to, (1 - p) * width, 0, width, height);
      break;
    }

    case 'slide-right': {
      drawCovered(ctx, from, p * width, 0, width, height);
      drawCovered(ctx, to, (p - 1) * width, 0, width, height);
      break;
    }

    case 'slide-up': {
      drawCovered(ctx, from, 0, -p * height, width, height);
      drawCovered(ctx, to, 0, (1 - p) * height, width, height);
      break;
    }

    case 'slide-down': {
      drawCovered(ctx, from, 0, p * height, width, height);
      drawCovered(ctx, to, 0, (p - 1) * height, width, height);
      break;
    }

    case 'wipe': {
      drawCovered(ctx, from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * p, height);
      ctx.clip();
      drawCovered(ctx, to, 0, 0, width, height);
      ctx.restore();
      // Soft leading edge so the wipe reads as an effect, not a hard cut.
      const edge = Math.max(2, width * 0.006);
      const gradient = ctx.createLinearGradient(width * p - edge, 0, width * p + edge, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(width * p - edge, 0, edge * 2, height);
      break;
    }

    case 'cross-zoom': {
      const outScale = 1 + p * 0.6;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(outScale, outScale);
      ctx.globalAlpha = 1 - p;
      drawCovered(ctx, from, -width / 2, -height / 2, width, height);
      ctx.restore();

      const inScale = 1.6 - p * 0.6;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(inScale, inScale);
      ctx.globalAlpha = p;
      drawCovered(ctx, to, -width / 2, -height / 2, width, height);
      ctx.restore();
      break;
    }

    case 'rotate': {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-p * Math.PI * 0.5);
      ctx.scale(1 - p * 0.4, 1 - p * 0.4);
      ctx.globalAlpha = 1 - p;
      drawCovered(ctx, from, -width / 2, -height / 2, width, height);
      ctx.restore();

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((1 - p) * Math.PI * 0.5);
      ctx.scale(0.6 + p * 0.4, 0.6 + p * 0.4);
      ctx.globalAlpha = p;
      drawCovered(ctx, to, -width / 2, -height / 2, width, height);
      ctx.restore();
      break;
    }

    default: {
      drawCovered(ctx, p < 0.5 ? from : to, 0, 0, width, height);
      break;
    }
  }

  ctx.globalAlpha = 1;
};
