/**
 * ============================================================================
 * Seeed reTerminal E1001 - Generative Art Hub Canvas Renderer
 * Version: 2026.09.29.14.50.00
 * Description: Renders algorithmic generative artwork (Flow Fields, Harmonics,
 *              Stipple Contours) deterministically onto 800x480 e-ink buffer.
 * ============================================================================
 */

const { createCanvas } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const CANVAS_WIDTH = 800;                  // default: 800 (Native display width)
const CANVAS_HEIGHT = 480;                 // default: 480 (Native display height)
const DEFAULT_PALETTE_INDEX = 0;           // default: 0 (Range: 0-4)
const DEFAULT_STYLE_INDEX = 0;             // default: 0 (Range: 0-2)

// 5 Curated Adobe Kuler Grayscale Palettes
const COLOR_PALETTES = [
  ['#FFFFFF', '#111111', '#444444', '#888888', '#CCCCCC'], // 0: Monochrome Minimalist
  ['#101214', '#FFFFFF', '#CCCCCC', '#777777', '#333333'], // 1: Charcoal & Mist (Dark)
  ['#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000'], // 2: High Contrast 1-Bit
  ['#1E2022', '#F0F5F9', '#C9D6DF', '#52616B', '#2A2D32'], // 3: Carbon Slate
  ['#FAFAFA', '#1A1A1A', '#555555', '#999999', '#DDDDDD']  // 4: Stipple Ink Tones
];

/**
 * Deterministic PRNG
 */
function createPrng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Render Generative Art Screen to PNG Buffer
 */
async function renderArt1(options = {}) {
  const seed = options.seed || 1001;
  const styleIndex = (options.styleIndex !== undefined ? options.styleIndex : DEFAULT_STYLE_INDEX) % 3;
  const paletteIndex = options.paletteIndex !== undefined ? options.paletteIndex : DEFAULT_PALETTE_INDEX;
  const palette = COLOR_PALETTES[paletteIndex] || COLOR_PALETTES[0];

  const rng = createPrng(seed);
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  const cBg = palette[0];
  const cInk = palette[1];
  const cMid = palette[2];
  const cLight = palette[3];

  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (styleIndex === 0) {
    // Style 0: Flow Field Strands
    const numCurves = 120;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < numCurves; i++) {
      let x = rng() * CANVAS_WIDTH;
      let y = rng() * CANVAS_HEIGHT;
      ctx.strokeStyle = i % 2 === 0 ? cInk : cMid;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let step = 0; step < 80; step++) {
        const angle = (Math.sin(x * 0.008) + Math.cos(y * 0.008)) * Math.PI * 2;
        x += Math.cos(angle) * 4;
        y += Math.sin(angle) * 4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (styleIndex === 1) {
    // Style 1: Harmonic Waves & Rings
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const rings = 36;
    for (let r = 1; r <= rings; r++) {
      const radius = r * 8;
      ctx.strokeStyle = r % 3 === 0 ? cInk : (r % 3 === 1 ? cMid : cLight);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.04) {
        const deform = Math.sin(a * 6 + r * 0.3) * (6 + r * 0.4) + Math.cos(a * 4) * 4;
        const rad = radius + deform;
        const px = centerX + Math.cos(a) * rad;
        const py = centerY + Math.sin(a) * rad;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    // Style 2: Stipple Contour Topography
    const rows = 35;
    const cols = 55;
    const cellW = CANVAS_WIDTH / cols;
    const cellH = CANVAS_HEIGHT / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = c * cellW + cellW / 2;
        const py = r * cellH + cellH / 2;
        const v = Math.sin(px * 0.015) * Math.cos(py * 0.015);
        const dotSize = Math.abs(v) * 4.5 + 0.8;
        ctx.fillStyle = v > 0 ? cInk : cMid;
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Watermark Header
  ctx.textAlign = 'left';
  ctx.fillStyle = cInk;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`Art #1  •  Style ${styleIndex + 1}  •  Seed ${seed}`, 20, 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = cMid;
  ctx.font = '13px sans-serif';
  ctx.fillText("Seeed reTerminal E1001", CANVAS_WIDTH - 20, 28);

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderArt1
};
