import { TestResult } from '@/types';
import { modeLabel } from '@/utils/stats';

/** Open Graph size — what Twitter, Slack and the rest expect. */
const WIDTH = 1200;
const HEIGHT = 630;

const AMBER = '#f59e0b';
const INK = '#fafafa';
const MUTED = '#71717a';
const SURFACE = '#0f0f0f';
const CARD = '#18181b';

const mono = (size: number, weight = 400) =>
  `${weight} ${size}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The keycap mark, same as the favicon. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#52525b';
  roundedRect(ctx, 0, 4, 15, 14, 3.5);
  ctx.fill();

  ctx.fillStyle = AMBER;
  roundedRect(ctx, 0, 0.5, 15, 13, 3.5);
  ctx.fill();

  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(18.5, 7, 5, -Math.PI / 2.6, Math.PI / 2.6);
  ctx.stroke();

  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(21.8, 7, 9.5, -Math.PI / 2.6, Math.PI / 2.6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/** A small wpm line, so the card carries the shape of the run and not just a number. */
function drawSparkline(
  ctx: CanvasRenderingContext2D,
  result: TestResult,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const points = result.timeline;
  if (points.length < 2) return;

  const peak = points.reduce((max, p) => Math.max(max, p.wpm, p.raw), 1);
  const lastSecond = points.at(-1)!.second || 1;
  const px = (second: number) => x + (second / lastSecond) * w;
  const py = (value: number) => y + h - (value / (peak * 1.1)) * h;

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((point, i) => {
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](px(point.second), py(point.wpm));
  });
  ctx.stroke();

  // Errors, where they happened.
  ctx.strokeStyle = '#d03b3b';
  ctx.lineWidth = 2.5;
  points
    .filter((point) => point.errors > 0)
    .forEach((point) => {
      const cx = px(point.second);
      const cy = py(point.raw);
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.moveTo(cx - 5, cy + 5);
      ctx.lineTo(cx + 5, cy - 5);
      ctx.stroke();
    });
}

function stat(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number
) {
  ctx.fillStyle = MUTED;
  ctx.font = mono(20, 700);
  ctx.fillText(label.toUpperCase(), x, y);

  ctx.fillStyle = INK;
  ctx.font = mono(56, 700);
  ctx.fillText(value, x, y + 60);
}

export async function renderShareCard(result: TestResult, isPersonalBest: boolean): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = CARD;
  roundedRect(ctx, 40, 40, WIDTH - 80, HEIGHT - 80, 28);
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawLogo(ctx, 90, 92, 2.2);
  ctx.font = mono(34, 700);
  ctx.fillStyle = INK;
  ctx.fillText('thock', 168, 120);
  const thockWidth = ctx.measureText('thock').width;
  ctx.fillStyle = MUTED;
  ctx.fillText('pit', 168 + thockWidth, 120);

  if (isPersonalBest) {
    ctx.fillStyle = AMBER;
    roundedRect(ctx, WIDTH - 320, 88, 230, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.font = mono(20, 700);
    ctx.textAlign = 'center';
    ctx.fillText('PERSONAL BEST', WIDTH - 205, 117);
    ctx.textAlign = 'left';
  }

  // The number people actually came for.
  ctx.fillStyle = AMBER;
  ctx.font = mono(150, 700);
  ctx.fillText(String(result.wpm), 90, 300);

  const wpmWidth = ctx.measureText(String(result.wpm)).width;
  ctx.fillStyle = MUTED;
  ctx.font = mono(32, 400);
  ctx.fillText('wpm', 104 + wpmWidth, 300);

  ctx.fillStyle = MUTED;
  ctx.font = mono(22, 400);
  ctx.fillText(`${modeLabel(result.mode)} · ${new Date(result.timestamp).toLocaleDateString()}`, 92, 345);

  stat(ctx, 'accuracy', `${result.accuracy}%`, 90, 430);
  stat(ctx, 'raw', String(result.raw), 380, 430);
  stat(ctx, 'consistency', `${result.consistency}%`, 620, 430);

  drawSparkline(ctx, result, 880, 210, 230, 120);

  ctx.fillStyle = '#3f3f46';
  ctx.font = mono(22, 400);
  ctx.textAlign = 'right';
  ctx.fillText('thockpit.vercel.app', WIDTH - 90, HEIGHT - 80);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      blob ? resolve(blob) : reject(new Error('Could not render the card'));
    }, 'image/png');
  });
}

export type ShareOutcome = 'shared' | 'copied' | 'downloaded';

/**
 * Share sheet if the device has one (phones), clipboard if not (desktop), and a
 * plain download if the browser allows neither.
 *
 * Every step here fails for boring, browser-specific reasons — no share target,
 * no clipboard permission, no transient activation — so each one falls through
 * to the next instead of giving up.
 */
export async function shareResult(
  result: TestResult,
  isPersonalBest: boolean
): Promise<ShareOutcome> {
  const blob = await renderShareCard(result, isPersonalBest);
  const file = new File([blob], `thockpit-${result.wpm}wpm.png`, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: `${result.wpm} wpm, ${result.accuracy}% accuracy on Thockpit`,
      });
      return 'shared';
    } catch (error) {
      // Backing out of the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    }
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    // Clipboard images need permission and a focused document; a download needs
    // neither.
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
