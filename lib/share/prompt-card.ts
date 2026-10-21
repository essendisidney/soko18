/**
 * "Share my prompt": draws a prompt and its answer as a 1080×1920 story image (WhatsApp Status,
 * Instagram/TikTok stories) on the member's own phone. No name, photo or area: only the
 * question, the answer and a link, so posting it never outs anyone as being on a dating app.
 */
import { BUBBLE, K_PARTS } from "@/lib/brand/kutana-mark";

export const CARD = { width: 1080, height: 1920 } as const;

const GOLD = "#d4b56a";
const CREAM = "#f6f1e8";
const MUTED = "#a39d90";

type Measure = (text: string) => number;

/** Greedy word wrap. Words longer than a line are kept whole rather than split mid-word. */
export function wrapLines(text: string, maxWidth: number, measure: Measure): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (stepping down) whose wrapped text fits in maxLines. */
export function fitFontSize(
  text: string,
  maxWidth: number,
  maxLines: number,
  measureAt: (size: number) => Measure,
  sizes: number[] = [88, 80, 72, 64, 58, 52, 46],
): { size: number; lines: string[] } {
  for (const size of sizes) {
    const lines = wrapLines(text, maxWidth, measureAt(size));
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const lines = wrapLines(text, maxWidth, measureAt(size));
  // Last resort: keep what fits and end on an ellipsis.
  return { size, lines: lines.length > maxLines ? [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1]}…`] : lines };
}

/** "https://kutana-app.vercel.app/campus/race/uon" → "kutana-app.vercel.app/campus/race/uon". */
export function displayLink(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export type PromptCardInput = {
  question: string;
  answer: string;
  /** Where the image points people: the campus race or the app. */
  link: string;
  /** Font family strings from the page, e.g. getComputedStyle(...).fontFamily. */
  displayFont: string;
  bodyFont: string;
  /** The slanted KUTANA wordmark font; falls back to the display font. */
  brandFont?: string;
};

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = GOLD;
  ctx.fill(new Path2D(BUBBLE));
  ctx.fillStyle = "#070708";
  for (const points of K_PARTS) {
    const pts = points.split(" ").map((p) => p.split(",").map(Number));
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPromptCard(canvas: HTMLCanvasElement, input: PromptCardInput) {
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: W, height: H } = CARD;
  const pad = 96;

  // Background: night black with a warm gold glow.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#070708");
  bg.addColorStop(1, "#17140d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.18, 0, W * 0.8, H * 0.18, 900);
  glow.addColorStop(0, "rgba(212,181,106,0.22)");
  glow.addColorStop(1, "rgba(212,181,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand.
  drawMark(ctx, pad, 150, 96);
  ctx.save();
  ctx.fillStyle = CREAM;
  ctx.font = `900 76px ${input.brandFont ?? input.displayFont}`;
  ctx.textBaseline = "middle";
  // Same slant as the in-app wordmark (skewX(-8deg)).
  ctx.setTransform(1, 0, Math.tan((-8 * Math.PI) / 180), 1, 0, 0);
  ctx.fillText("KUTANA", pad + 124 + Math.tan((8 * Math.PI) / 180) * 196, 196);
  ctx.restore();

  // The card.
  const cardX = pad;
  const cardW = W - pad * 2;
  const inner = cardW - 120;
  ctx.font = `600 40px ${input.bodyFont}`;
  const qLines = wrapLines(input.question.toUpperCase(), inner, (t) => ctx.measureText(t).width);
  const answer = `“${input.answer.trim()}”`;
  const fit = fitFontSize(answer, inner, 7, (size) => {
    ctx.font = `700 ${size}px ${input.displayFont}`;
    return (t) => ctx.measureText(t).width;
  });
  const qLineH = 56;
  const aLineH = Math.round(fit.size * 1.22);
  const cardH = 60 + qLines.length * qLineH + 48 + fit.lines.length * aLineH + 60;
  const cardY = Math.max(420, (H - cardH) / 2 - 60);

  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(212,181,106,0.55)";
  ctx.stroke();

  ctx.textBaseline = "top";
  let y = cardY + 60;
  ctx.fillStyle = GOLD;
  ctx.font = `600 40px ${input.bodyFont}`;
  for (const line of qLines) {
    ctx.fillText(line, cardX + 60, y);
    y += qLineH;
  }
  y += 48;
  ctx.fillStyle = CREAM;
  ctx.font = `700 ${fit.size}px ${input.displayFont}`;
  for (const line of fit.lines) {
    ctx.fillText(line, cardX + 60, y);
    y += aLineH;
  }

  // Call to action.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREAM;
  ctx.font = `700 60px ${input.displayFont}`;
  ctx.fillText("What’s yours?", pad, H - 300);
  ctx.fillStyle = MUTED;
  ctx.font = `500 38px ${input.bodyFont}`;
  ctx.fillText("Answer it on Kutana · 18+", pad, H - 236);
  ctx.fillStyle = GOLD;
  ctx.font = `600 38px ${input.bodyFont}`;
  const link = displayLink(input.link);
  const linkLines = wrapLines(link.replace(/\//g, "/ "), W - pad * 2, (t) => ctx.measureText(t.replace(/\/ /g, "/")).width).map(
    (l) => l.replace(/\/ /g, "/"),
  );
  linkLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, pad, H - 168 + i * 50));
}

/** The canvas as a PNG file, ready for navigator.share or a download. */
export function canvasToFile(canvas: HTMLCanvasElement, name = "kutana-prompt.png"): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? new File([blob], name, { type: "image/png" }) : null), "image/png");
  });
}
